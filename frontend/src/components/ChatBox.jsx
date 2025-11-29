import React, { useState, useEffect, useRef } from "react";
import { getSession, sendMessage as apiSendMessage } from "../api/chatApi";
import ChatBoxUI from "./ChatBoxUI";

function ChatBox() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const chatRef = useRef(null);

  const sendMessage = async () => {
    if (!message.trim()) return;

    // Add user message to chat
    setChat(prev => [...prev, { sender: "user", text: message }]);
    setLoading(true);
    setLastError(null);
    // Ensure we have (or reuse) a sessionId stored in localStorage
    const existing = localStorage.getItem("chat_session_id");

    try {
      console.log("Sending message to API:", message, "sessionId:", existing);
      const data = await apiSendMessage(message, existing);
      console.log("API response:", data);

      // Persist the sessionId returned by server
      if (data.sessionId) localStorage.setItem("chat_session_id", data.sessionId);

      // Add AI response to chat, preserving structured `data` payload when present
      setChat(prev => [...prev, { sender: "bot", text: data.response || data.reply || '', data: data.data || (data.payload || data) }]);
      setMessage("");
    } catch (err) {
      console.error("sendMessage error:", err);
      setLastError(err?.message || String(err));
      setChat(prev => [...prev, { sender: "bot", text: "Sorry — I couldn't reach the server. Please check your connection or try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // Scroll chat to bottom when messages change
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat]);

  // Ensure we have a sessionId on mount
  useEffect(() => {
    const ensureSession = async () => {
      const existing = localStorage.getItem("chat_session_id");
      if (existing) return;

      try {
        const data = await getSession();
        if (data.sessionId) localStorage.setItem("chat_session_id", data.sessionId);
      } catch (err) {
        console.warn("Could not create session:", err);
      }
    };

    ensureSession();
  }, []);

  const resetSession = async () => {
    localStorage.removeItem("chat_session_id");
    try {
      const data = await getSession();
      if (data.sessionId) localStorage.setItem("chat_session_id", data.sessionId);
      setChat([]);
    } catch (err) {
      console.warn("Could not reset session:", err);
    }
  };

  // Quick action: set message and send immediately
  const handleQuickAction = async (query) => {
    if (!query.trim()) return;
    setChat((prev) => [...prev, { sender: "user", text: query }]);
    setLoading(true);
    const existing = localStorage.getItem("chat_session_id");
    setLastError(null);
    try {
      console.log("Quick action request:", query, "sessionId:", existing);
      const data = await apiSendMessage(query, existing);
      console.log("Quick action response:", data);
      if (data.sessionId) localStorage.setItem("chat_session_id", data.sessionId);
      setChat((prev) => [...prev, { sender: "bot", text: data.response || data.reply || '', data: data.data || (data.payload || data) }]);
    } catch (err) {
      console.error("handleQuickAction error:", err);
      setLastError(err?.message || String(err));
      setChat((prev) => [...prev, { sender: "bot", text: "Sorry — failed to fetch suggestions. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatBoxUI
      chat={chat}
      lastError={lastError}
      message={message}
      setMessage={setMessage}
      sendMessage={sendMessage}
      resetSession={resetSession}
      loading={loading}
      chatRef={chatRef}
      onQuickAction={handleQuickAction}
    />
  );
}

export default ChatBox;
