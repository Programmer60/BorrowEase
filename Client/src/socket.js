// src/socket.js
import { io } from "socket.io-client";

// Use environment variable for socket URL, fallback to localhost for development
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL);

export default socket;
