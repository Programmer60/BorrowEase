import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, MessageCircle, Users, Wifi, WifiOff } from "lucide-react";
import { io } from "socket.io-client";
import API from "../api/api";
import { auth } from "../firebase";

export default function RealTimeChatRoom() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loan, setLoan] = useState(null);
  const [otherParty, setOtherParty] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingDebounceRef = useRef(null);

  // Initialize chat and socket connection
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);
        
        // Wait for Firebase auth
        const user = await new Promise((resolve, reject) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            if (user) {
              resolve(user);
            } else {
              reject(new Error("User not authenticated"));
            }
          });
          
          setTimeout(() => {
            unsubscribe();
            reject(new Error("Authentication timeout"));
          }, 10000);
        });

        console.log("🔐 Firebase user authenticated:", user.email);

        // Get Firebase token for Socket.IO authentication
        const token = await user.getIdToken();
        
        // Get current user data from API
        const userRes = await API.get("/users/me");
        setCurrentUser(userRes.data);

        // Fetch initial chat data
        await fetchChatData(userRes.data);

        // Initialize Socket.IO connection
        await initializeSocket(token, userRes.data);

        setLoading(false);

      } catch (error) {
        console.error("❌ Error initializing chat:", error);
        handleAuthError(error);
      }
    };

    if (loanId) {
      initializeChat();
    }

    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        console.log("🔌 Disconnecting socket...");
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
    };
  }, [loanId]);

  // Initialize Socket.IO connection
  const initializeSocket = async (token, user) => {
    try {
      console.log("🔌 Initializing Socket.IO connection...");
      
      socketRef.current = io("http://localhost:5000", {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      socketRef.current.on("connect", () => {
        console.log("✅ Socket connected:", socketRef.current.id);
        setConnected(true);
        
        // Join the loan chat room
        socketRef.current.emit("joinLoanChat", { loanId });
      });

      socketRef.current.on("disconnect", () => {
        console.log("❌ Socket disconnected");
        setConnected(false);
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
        setConnected(false);
      });

      // Chat event handlers
      socketRef.current.on("joinedLoanChat", ({ loanId: joinedLoanId }) => {
        console.log("🏠 Joined loan chat room:", joinedLoanId);
      });

      socketRef.current.on("receiveMessage", (message) => {
        console.log("📨 Received message:", message);
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(msg => msg._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
      });

      // Typing indicators
      socketRef.current.on("userTyping", ({ userId, userName, loanId: typingLoanId }) => {
        if (typingLoanId === loanId && userId !== user._id) {
          console.log("⌨️ User typing:", userName);
          setOtherUserTyping(true);
          
          // Clear existing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // Set timeout to hide typing indicator
          typingTimeoutRef.current = setTimeout(() => {
            setOtherUserTyping(false);
          }, 3000);
        }
      });

      socketRef.current.on("userStopTyping", ({ userId, loanId: typingLoanId }) => {
        if (typingLoanId === loanId && userId !== user._id) {
          console.log("⌨️ User stopped typing");
          setOtherUserTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }
      });

      // Error handling
      socketRef.current.on("error", (error) => {
        console.error("❌ Socket error:", error);
        alert(`Chat error: ${error.message}`);
      });

    } catch (error) {
      console.error("❌ Error initializing socket:", error);
    }
  };

  // Fetch initial chat data
  const fetchChatData = async (user) => {
    try {
      console.log("📋 Fetching chat data for user:", user.name);
      
      // Fetch loan details
      const loanRes = await API.get(`/loans/${loanId}`);
      setLoan(loanRes.data);

      // Determine other party
      const other = loanRes.data.borrowerId._id === user._id 
        ? loanRes.data.lenderId 
        : loanRes.data.borrowerId;
      setOtherParty(other);

      // Fetch existing messages
      const messagesRes = await API.get(`/chat/loan/${loanId}`);
      setMessages(messagesRes.data);

    } catch (error) {
      console.error("❌ Error fetching chat data:", error);
      if (error.response?.status === 403) {
        alert("You don't have access to this chat. This chat is only available for funded loans between the borrower and lender.");
        navigate(-1);
      } else {
        throw error;
      }
    }
  };

  // Handle authentication errors
  const handleAuthError = (error) => {
    if (error.message === "User not authenticated" || error.message === "Authentication timeout") {
      alert("Please log in to access chat");
      navigate("/login");
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      alert("Authentication expired. Please log in again.");
      navigate("/login");
    } else {
      alert(`Error loading chat: ${error.message}`);
      setLoading(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherParty || sending || !connected) return;

    try {
      setSending(true);

      // Send message via Socket.IO for real-time delivery
      if (socketRef.current && connected) {
        socketRef.current.emit("sendMessage", {
          loanId,
          message: newMessage.trim(),
          receiverId: otherParty._id
        });
      }

      // Also send via API as backup
      const response = await API.post("/chat/send", {
        loanId,
        message: newMessage.trim(),
        receiverId: otherParty._id
      });

      setNewMessage("");
      
      // Stop typing indicator
      handleStopTyping();

    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicators
  const handleTyping = () => {
    if (!connected || !socketRef.current) return;

    if (!typing) {
      setTyping(true);
      socketRef.current.emit("typing", { loanId });
    }

    // Debounce to stop typing after user stops typing
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    typingDebounceRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (typing && socketRef.current && connected) {
      setTyping(false);
      socketRef.current.emit("stopTyping", { loanId });
    }
  };

  // Input change handler with typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  // Utility functions
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  // Loan not available state
  if (!loan || !loan.funded) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <MessageCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Chat Not Available
        </h2>
        <p className="text-gray-600 mb-6">
          Chat is only available for funded loans.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-900 mr-2">
              {otherParty?.name}
            </h1>
            <div className="flex items-center">
              {connected ? (
                <div className="flex items-center text-green-600">
                  <Wifi className="w-4 h-4 mr-1" />
                  <span className="text-xs">Online</span>
                </div>
              ) : (
                <div className="flex items-center text-red-500">
                  <WifiOff className="w-4 h-4 mr-1" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Loan: ₹{loan.amount} for {loan.purpose}
          </p>
        </div>

        <div className="flex items-center text-gray-500">
          <Users className="w-5 h-5 mr-1" />
          <span className="text-sm">2 participants</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = message.senderId._id === currentUser._id;
            const showDate = index === 0 || 
              formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);

            return (
              <div key={message._id}>
                {showDate && (
                  <div className="text-center text-xs text-gray-500 mb-4">
                    {formatDate(message.timestamp)}
                  </div>
                )}
                <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isCurrentUser
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      isCurrentUser ? 'text-indigo-200' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg max-w-xs">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">{otherParty?.name} is typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onBlur={handleStopTyping}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={sending || !connected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !connected}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-gray-500">
            {connected ? 'Real-time messaging enabled' : 'Connecting...'}
          </p>
          {typing && (
            <p className="text-xs text-indigo-600">
              You are typing...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
