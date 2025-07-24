import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, MessageCircle } from "lucide-react";
import { io } from "socket.io-client";
import API from "../api/api";
import { auth } from "../firebase";

export default function ChatRoom() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loan, setLoan] = useState(null);
  const [otherParty, setOtherParty] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Wait for Firebase auth to be ready
        await new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
          });
        });

        // Check if user is authenticated
        const user = auth.currentUser;
        if (!user) {
          console.log("No authenticated user, redirecting to login");
          navigate("/login");
          return;
        }

        console.log("User authenticated:", user.email);

        // Get current user data from API
        const userRes = await API.get("/users/me");
        setCurrentUser(userRes.data);

        // Get Firebase auth token for socket authentication
        const token = await user.getIdToken();
        console.log("Got Firebase token");

        // Initialize socket connection with proper authentication
        socketRef.current = io("http://localhost:5000", {
          auth: {
            token: token
          },
          forceNew: true, // Force new connection to avoid tab mixing
          transports: ['websocket', 'polling']
        });

        socketRef.current.on("connect", () => {
          console.log("Socket connected:", socketRef.current.id);
          setSocketConnected(true);
          
          // Join the loan chat room
          socketRef.current.emit("joinLoanChat", { loanId });
        });

        socketRef.current.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          setSocketConnected(false);
        });

        // Fetch chat data
        await fetchChatData(userRes.data);

      } catch (error) {
        console.error("Error initializing chat:", error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log("Authentication error, redirecting to login");
          navigate("/login");
        } else {
          setLoading(false);
        }
      }
    };

    if (loanId) {
      initializeChat();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [loanId, navigate]);

  const fetchChatData = async (user) => {
    try {
      setLoading(true);
      
      // Fetch loan details
      const loanRes = await API.get(`/loans/${loanId}`);
      setLoan(loanRes.data);

      // Determine other party
      const other = loanRes.data.borrowerId._id === user._id 
        ? loanRes.data.lenderId 
        : loanRes.data.borrowerId;
      setOtherParty(other);

      // Fetch messages
      const messagesRes = await API.get(`/chat/loan/${loanId}`);
      setMessages(messagesRes.data);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching chat data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socketRef.current) return;

    // Listen for successful room join
    socketRef.current.on("joinedLoanChat", ({ loanId: joinedLoanId }) => {
      console.log("Successfully joined loan chat:", joinedLoanId);
    });

    // Listen for new messages
    socketRef.current.on("receiveMessage", (message) => {
      console.log("Received message:", message);
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    socketRef.current.on("userTyping", ({ userId, userName, loanId: typingLoanId }) => {
      // Only show typing for current loan and not from current user
      if (typingLoanId === loanId && userId !== currentUser?._id) {
        setIsTyping(true);
        setTypingUser(userName);
      }
    });

    socketRef.current.on("userStopTyping", ({ userId, loanId: typingLoanId }) => {
      // Only hide typing for current loan and not from current user
      if (typingLoanId === loanId && userId !== currentUser?._id) {
        setIsTyping(false);
        setTypingUser("");
      }
    });

    // Listen for errors
    socketRef.current.on("error", ({ message }) => {
      console.error("Socket error:", message);
      alert(message);
    });

    return () => {
      socketRef.current.off("joinedLoanChat");
      socketRef.current.off("receiveMessage");
      socketRef.current.off("userTyping");
      socketRef.current.off("userStopTyping");
      socketRef.current.off("error");
    };
  }, [loanId, currentUser]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherParty || !socketConnected) return;

    try {
      // Send via socket for real-time delivery
      socketRef.current.emit("sendMessage", {
        loanId,
        message: newMessage.trim(),
        receiverId: otherParty._id
      });

      setNewMessage("");
      
      // Stop typing indicator
      socketRef.current.emit("stopTyping", { loanId });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleTyping = () => {
    if (!socketRef.current || !socketConnected) return;

    // Emit typing indicator
    socketRef.current.emit("typing", { loanId });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stopTyping", { loanId });
    }, 1000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold text-gray-900">
            {otherParty?.name}
          </h1>
          <p className="text-sm text-gray-500">
            Loan: ₹{loan.amount} for {loan.purpose}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            {socketConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
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
        })}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <p className="text-sm text-gray-500">
                {typingUser} is typing...
              </p>
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
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!socketConnected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !socketConnected}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        {!socketConnected && (
          <p className="text-xs text-red-500 mt-1">
            Reconnecting to chat server...
          </p>
        )}
      </div>
    </div>
  );
}
