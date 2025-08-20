import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { auth } from '../firebase';

const SocketContext = createContext();

// Global variables to prevent duplicate socket connections
let globalSocket = null;
let globalSocketPromise = null;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [chatUnreadCounts, setChatUnreadCounts] = useState({});
  
  const socketRef = useRef(null);
  const isInitializing = useRef(false);
  
  // Set to track processed messages and prevent duplicates
  const processedMessages = useRef(new Set());

  // Stable function to update chat unread counts
  const updateChatUnreadCounts = useCallback((updateFn) => {
    setChatUnreadCounts(updateFn);
  }, []);

  // Stable function to reset unread count for a specific loan
  const resetUnreadCount = useCallback((loanId) => {
    setChatUnreadCounts(prev => ({
      ...prev,
      [loanId]: 0
    }));
  }, []);

  useEffect(() => {
    const initializeSocket = async () => {
      // Prevent multiple socket initialization using global check
      if (globalSocket || globalSocketPromise) {
        console.log(" Global socket already exists, reusing...");
        if (globalSocket) {
          setSocket(globalSocket);
          setConnected(globalSocket.connected);
        }
        return;
      }

      try {
        console.log(" Starting new global socket initialization...");
        
        // Create a promise to prevent concurrent initialization
        globalSocketPromise = (async () => {
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
          });

          // Get Firebase token for Socket.IO authentication
          const token = await user.getIdToken();
          
          // Initialize Socket.IO connection (single instance)
          const newSocket = io("http://localhost:5000", {
            auth: {
              token: token
            },
            transports: ['websocket', 'polling']
          });

          globalSocket = newSocket;
          return newSocket;
        })();

        const newSocket = await globalSocketPromise;
        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on("connect", () => {
          console.log(" Global socket connected:", newSocket.id);
          setConnected(true);
        });

        // Enhanced newMessage listener with duplicate protection
        newSocket.on("newMessage", ({ loanId, message, from }) => {
          console.log(" Global new message notification:", { loanId, from, socketId: newSocket.id });
          
          // Create unique message identifier to prevent duplicates
          const messageKey = loanId + "_" + (message.timestamp || Date.now()) + "_" + from;
          
          // Check if this message was already processed
          if (processedMessages.current.has(messageKey)) {
            console.log(" Duplicate message detected, skipping:", messageKey);
            return;
          }
          
          // Mark message as processed
          processedMessages.current.add(messageKey);
          
          // Increment unread count for this loan (single source of truth)
          setChatUnreadCounts(prev => {
            const newCount = (prev[loanId] || 0) + 1;
            console.log(" Chat notification: " + loanId + " -> " + newCount + " unread messages");
            return {
              ...prev,
              [loanId]: newCount
            };
          });
        });

        // Listen for messages being marked as read
        newSocket.on("messagesRead", ({ loanId, userId }) => {
          console.log(" Global messages marked as read:", { loanId, userId });
          
          // Reset unread count for this loan to 0
          setChatUnreadCounts(prev => ({
            ...prev,
            [loanId]: 0
          }));
        });

        newSocket.on("disconnect", () => {
          console.log(" Global socket disconnected");
          setConnected(false);
        });

        newSocket.on("connect_error", (error) => {
          console.error(" Global socket connection error:", error);
          setConnected(false);
        });

      } catch (error) {
        console.error(" Error initializing global socket:", error);
        setError(error.message);
      } finally {
        isInitializing.current = false;
        globalSocketPromise = null; // Reset promise after completion
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log(" Cleaning up global socket connection");
        socketRef.current.disconnect();
        socketRef.current = null;
        globalSocket = null;
        setSocket(null);
        setConnected(false);
      }
    };
  }, []);

  const value = {
    socket,
    connected,
    error,
    chatUnreadCounts,
    updateChatUnreadCounts,
    resetUnreadCount
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
