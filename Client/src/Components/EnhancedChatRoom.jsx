import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Send, 
  ArrowLeft, 
  MessageCircle, 
  Users, 
  Wifi, 
  WifiOff, 
  Check, 
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Smile
} from "lucide-react";
import { io } from "socket.io-client";
import API from "../api/api";
import { auth } from "../firebase";

export default function EnhancedChatRoom() {
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
  const [typingUserName, setTypingUserName] = useState(""); // Store the actual typing user's name
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingDebounceRef = useRef(null);
  const messageInputRef = useRef(null);

  // Emoji list
  const emojis = ['😀', '😂', '😊', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💯', '😢', '😡', '🤝', '💰', '✅'];

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
        console.log("👤 Fetching current user data...");
        const userRes = await API.get("/users/me");
        console.log("👤 Current user data:", userRes.data);
        setCurrentUser(userRes.data);

        // Fetch initial chat data
        console.log("💬 Starting fetchChatData...");
        try {
          await fetchChatData(userRes.data);
          console.log("💬 fetchChatData completed successfully");
        } catch (fetchError) {
          console.error("💬 fetchChatData failed:", fetchError);
          throw fetchError;
        }

        // Initialize Socket.IO connection
        console.log("🔌 Starting socket initialization...");
        await initializeSocket(token, userRes.data);
        console.log("🔌 Socket initialization completed");

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
      cleanup();
    };
  }, [loanId]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("🔧 Component unmounting, cleaning up...");
      
      // Stop typing if currently typing
      if (typing && socketRef.current) {
        socketRef.current.emit("stopTyping", { loanId });
      }
      
      // Cleanup socket and timers
      cleanup();
    };
  }, []);

  // Cleanup function
  const cleanup = () => {
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
    // Clear typing indicators
    setOtherUserTyping(false);
    setTypingUserName("");
    setTyping(false);
  };

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
        setOtherUserOnline(false);
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
          // Enhanced duplicate check
          const exists = prev.some(msg => 
            msg._id === message._id || 
            (msg.message === message.message && 
             msg.senderId._id === message.senderId._id && 
             Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 2000) // 2 seconds tolerance
          );
          
          if (exists) {
            console.log("🔄 Duplicate message detected, skipping:", message._id);
            return prev;
          }
          
          // Don't increment unread count when user is actively in the chat
          // The unread count should only show for other chats, not the current active chat
          
          return [...prev, message].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
      });

      // Typing indicators
      socketRef.current.on("userTyping", ({ userId, userName, loanId: typingLoanId }) => {
        // Use the user data passed to this function, which has the correct MongoDB _id
        const currentUserId = user._id || user.id;
        console.log("⌨️ Typing event received:", { 
          userId, 
          userName, 
          currentUserId, 
          typingLoanId, 
          loanId,
          userObject: user,
          userFields: Object.keys(user),
          userIdField: user._id,
          userIdField2: user.id,
          allUserData: JSON.stringify(user, null, 2),
          comparison: `${userId} !== ${currentUserId}`,
          result: userId !== currentUserId
        });
        if (typingLoanId === loanId && userId !== currentUserId) {
          console.log("⌨️ Setting other user typing to true for:", userName);
          setOtherUserTyping(true);
          setTypingUserName(userName); // Store the actual typing user's name
          
          // Clear existing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // Set timeout to hide typing indicator
          typingTimeoutRef.current = setTimeout(() => {
            console.log("⌨️ Typing timeout - hiding indicator");
            setOtherUserTyping(false);
            setTypingUserName("");
          }, 3000);
        } else {
          console.log("⌨️ Ignoring typing event - same user or different loan");
        }
      });

      socketRef.current.on("userStopTyping", ({ userId, loanId: typingLoanId }) => {
        // Use the user data passed to this function, which has the correct MongoDB _id
        const currentUserId = user._id || user.id;
        console.log("⌨️ Stop typing event received:", { 
          userId, 
          currentUserId, 
          typingLoanId, 
          loanId,
          userFields: Object.keys(user),
          comparison: `${userId} !== ${currentUserId}`,
          result: userId !== currentUserId
        });
        if (typingLoanId === loanId && userId !== currentUserId) {
          console.log("⌨️ Setting other user typing to false");
          setOtherUserTyping(false);
          setTypingUserName("");
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        } else {
          console.log("⌨️ Ignoring stop typing event - same user or different loan");
        }
      });

      // User online status
      socketRef.current.on("userOnline", ({ userId, loanId: onlineLoanId }) => {
        const currentUserId = user._id || user.id;
        if (onlineLoanId === loanId && userId !== currentUserId) {
          setOtherUserOnline(true);
        }
      });

      socketRef.current.on("userOffline", ({ userId, loanId: offlineLoanId }) => {
        const currentUserId = user._id || user.id;
        if (offlineLoanId === loanId && userId !== currentUserId) {
          setOtherUserOnline(false);
        }
      });

      // Message read status
      socketRef.current.on("messagesRead", ({ loanId: readLoanId, userId: readUserId }) => {
        const currentUserId = user._id || user.id;
        if (readLoanId === loanId && readUserId !== currentUserId) {
          setMessages(prev => prev.map(msg => 
            msg.senderId._id === currentUserId ? { ...msg, isRead: true } : msg
          ));
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
      console.log("📋 Loan data received for:", loanRes.data.purpose);
      setLoan(loanRes.data);

      // Determine other party using email fallback for user identification
      const userId = currentUser?._id || user._id || user.id || user.uid || user.firebaseUid;
      
      const other = (loanRes.data.borrowerId._id === userId || loanRes.data.borrowerId.email === user.email)
        ? loanRes.data.lenderId 
        : loanRes.data.borrowerId;
      
      console.log("🤝 Other party determined:", other?.name);
      setOtherParty(other);

      // Fetch existing messages
      const messagesRes = await API.get(`/chat/loan/${loanId}`);
      const sortedMessages = messagesRes.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      console.log("📨 Messages loaded:", sortedMessages.length, "messages");
      setMessages(sortedMessages);

      // Count unread messages
      const unread = sortedMessages.filter(msg => 
        msg.receiverId._id === userId && !msg.isRead
      ).length;
      setUnreadCount(unread);

      // Mark messages as read
      if (socketRef.current) {
        socketRef.current.emit("markAsRead", { loanId });
      }

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
    
    // Mark messages as read when user is actively viewing the chat
    if (socketRef.current) {
      socketRef.current.emit("markAsRead", { loanId });
    }
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherParty || sending || !connected) return;

    try {
      setSending(true);
      const messageText = newMessage.trim();
      setNewMessage("");

      // Send message via Socket.IO only to prevent duplicates
      if (socketRef.current && connected) {
        socketRef.current.emit("sendMessage", {
          loanId,
          message: messageText,
          receiverId: otherParty._id
        });
        console.log("📤 Message sent via socket:", { loanId, message: messageText, receiverId: otherParty._id });
      } else {
        // Fallback to API only if socket is disconnected
        await API.post("/chat/send", {
          loanId,
          message: messageText,
          receiverId: otherParty._id
        });
        console.log("📤 Message sent via API (fallback)");
      }
      
      // Stop typing indicator
      handleStopTyping();

    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert("Failed to send message. Please try again.");
      setNewMessage(messageText); // Restore message
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicators
  const handleTyping = () => {
    if (!connected || !socketRef.current) return;

    if (!typing) {
      console.log("🎯 Emitting typing event for loan:", loanId);
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
      console.log("🎯 Emitting stop typing event for loan:", loanId);
      setTyping(false);
      socketRef.current.emit("stopTyping", { loanId });
    }
  };

  // Input change handler with typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  // Utility functions
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get online status indicator
  const getOnlineStatus = () => {
    if (otherUserOnline) {
      return <span className="text-green-500 text-xs">● Online</span>;
    } else {
      return <span className="text-gray-400 text-xs">● Last seen recently</span>;
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = {};
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  }, [messages]);

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
    <div className="max-w-4xl mx-auto h-screen flex flex-col bg-white shadow-lg">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center">
            <div className="relative mr-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                {otherParty?.name?.charAt(0).toUpperCase()}
              </div>
              {otherUserOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {otherParty?.name}
              </h1>
              <div className="flex items-center space-x-2">
                {getOnlineStatus()}
                <div className="flex items-center">
                  {connected ? (
                    <div className="flex items-center text-green-600">
                      <Wifi className="w-3 h-3 mr-1" />
                      <span className="text-xs">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-500">
                      <WifiOff className="w-3 h-3 mr-1" />
                      <span className="text-xs">Connecting...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Phone className="w-5 h-5 text-gray-500" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Video className="w-5 h-5 text-gray-500" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Loan Info Bar */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-indigo-700">
            <span className="font-medium">Loan:</span> ₹{loan.amount} for {loan.purpose}
          </p>
          <div className="flex items-center text-indigo-600">
            <Users className="w-4 h-4 mr-1" />
            <span className="text-sm">Secure Chat</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
        {Object.keys(groupedMessages).length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="text-center my-4">
                <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 border">
                  {date}
                </span>
              </div>
              
              {/* Messages for this date */}
              {dayMessages.map((message, index) => {
                const currentUserId = currentUser._id || currentUser.id || currentUser.uid || currentUser.firebaseUid;
                const isCurrentUser = message.senderId._id === currentUserId;
                const nextMessage = dayMessages[index + 1];
                const isLastFromSender = !nextMessage || nextMessage.senderId._id !== message.senderId._id;

                return (
                  <div key={message._id} className={`mb-1 ${isLastFromSender ? 'mb-3' : ''}`}>
                    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          isCurrentUser
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        <div className={`flex items-center justify-between mt-1 ${
                          isCurrentUser ? 'text-indigo-200' : 'text-gray-500'
                        }`}>
                          <p className="text-xs">
                            {formatTime(message.timestamp)}
                          </p>
                          {isCurrentUser && (
                            <div className="ml-2">
                              {message.isRead ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {otherUserTyping && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border border-gray-200 text-gray-900 px-4 py-2 rounded-2xl rounded-bl-md max-w-xs">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">{typingUserName} is typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-xl hover:bg-gray-200 rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors mb-1"
          >
            <Smile className="w-5 h-5 text-gray-500" />
          </button>
          
          <div className="flex-1">
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={handleInputChange}
              onBlur={handleStopTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              disabled={sending || !connected}
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !connected}
            className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center space-x-4">
            <p className="text-xs text-gray-500">
              {connected ? '🟢 Real-time messaging' : '🔴 Connecting...'}
            </p>
            {typing && (
              <p className="text-xs text-indigo-600">
                You are typing...
              </p>
            )}
            {otherUserTyping && (
              <p className="text-xs text-gray-500">
                {typingUserName} is typing...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
