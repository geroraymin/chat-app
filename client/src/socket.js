import { io } from "socket.io-client";

const SOCKET_URL = "https://chat-app-n2l1.onrender.com";

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 60000
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
});

socket.on("connect", () => {
  console.log("Socket connected successfully");
});

export default socket; 