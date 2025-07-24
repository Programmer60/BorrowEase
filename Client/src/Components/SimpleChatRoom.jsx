import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, MessageCircle, RefreshCw } from "lucide-react";
import API from "../api/api";
import { auth } from "../firebase";

export default function SimpleChatRoom() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loan, setLoan] = useState(null);
  const [otherParty, setOtherParty] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);
        
        // Wait for Firebase auth to be ready with a more reliable approach
        const user = await new Promise((resolve, reject) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            if (user) {
              resolve(user);
            } else {
              reject(new Error("User not authenticated"));
            }
          });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            unsubscribe();
            reject(new Error("Authentication timeout"));
          }, 10000);
        });

        console.log("Firebase user authenticated:", user.email);

        // Wait a bit more to ensure the token is ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get current user data from API
        console.log("Fetching user data from API...");
        const userRes = await API.get("/users/me");
        console.log("User data received:", userRes.data);
        setCurrentUser(userRes.data);

        // Fetch chat data
        await fetchChatData(userRes.data);

        // Start polling for new messages every 3 seconds
        pollIntervalRef.current = setInterval(() => {
          fetchMessages();
        }, 3000);

      } catch (error) {
        console.error("Error initializing chat:", error);
        
        if (error.message === "User not authenticated" || error.message === "Authentication timeout") {
          console.log("Authentication failed, redirecting to login");
          alert("Please log in to access chat");
          navigate("/login");
        } else if (error.response?.status === 401 || error.response?.status === 403) {
          console.log("API authentication error, redirecting to login");
          alert("Authentication expired. Please log in again.");
          navigate("/login");
        } else {
          console.log("Other error:", error.message);
          alert(`Error loading chat: ${error.message}`);
          setLoading(false);
        }
      }
    };

    if (loanId) {
      initializeChat();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [loanId, navigate]);

  const fetchChatData = async (user) => {
    try {
      setLoading(true);
      console.log("Fetching chat data for user:", user);
      
      // Fetch loan details
      console.log("Fetching loan details for loanId:", loanId);
      const loanRes = await API.get(`/loans/${loanId}`);
      console.log("Loan data received:", loanRes.data);
      setLoan(loanRes.data);

      // Determine other party
      const other = loanRes.data.borrowerId._id === user._id 
        ? loanRes.data.lenderId 
        : loanRes.data.borrowerId;
      console.log("Other party determined:", other);
      setOtherParty(other);

      // Fetch messages
      await fetchMessages();

      setLoading(false);
    } catch (error) {
      console.error("Error fetching chat data:", error);
      if (error.response?.status === 403) {
        alert("You don't have access to this chat. This chat is only available for funded loans between the borrower and lender.");
        navigate(-1);
      } else {
        alert(`Error loading chat: ${error.message}`);
        setLoading(false);
      }
    }
  };

  const fetchMessages = async () => {
    try {
      const messagesRes = await API.get(`/chat/loan/${loanId}`);
      setMessages(messagesRes.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherParty || sending) return;

    try {
      setSending(true);

      // Send message via API
      const response = await API.post("/chat/send", {
        loanId,
        message: newMessage.trim(),
        receiverId: otherParty._id
      });

      // Add the new message to the list
      setMessages(prev => [...prev, response.data]);
      setNewMessage("");

    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
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

  const refreshMessages = () => {
    fetchMessages();
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
        <button
          onClick={refreshMessages}
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Refresh messages"
        >
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
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
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-1">
          Messages refresh automatically every 3 seconds
        </p>
      </div>
    </div>
  );
}
