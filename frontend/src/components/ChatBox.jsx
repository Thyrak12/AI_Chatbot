import React, { useState, useEffect, useRef } from "react";
import { createSession, sendMessage as apiSendMessage } from "../api/chatApi";
import "./ChatBox.css";

function ChatBox() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const data = await createSession();
        if (data.sessionId) {
          setSessionId(data.sessionId);
          setConnected(true);
          console.log("Session created:", data.sessionId);
        }
      } catch (err) {
        console.error("Failed to create session:", err);
        setConnected(false);
      }
    };
    initSession();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    if (!message.trim() || !sessionId || loading) return;

    const userMessage = message;
    setMessage("");

    // Add user message to UI immediately
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await apiSendMessage(userMessage, sessionId);
      setMessages((prev) => [...prev, { role: "assistant", content: response.response }]);
    } catch (err) {
      console.error("Send message error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your message. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQueries = [
    "Show menu items under $20",
    "Find romantic restaurants",
    "I have $10, recommend something",
    "What restaurants are available?"
  ];

  const handleQuickQuery = (query) => {
    setMessage(query);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <h1>🍽️ Restaurant Chatbot</h1>
          <p>Find restaurants, menus & promotions</p>
        </div>
        <div className={`status-indicator ${connected ? "connected" : "disconnected"}`}>
          {connected ? "●" : "○"} {connected ? "Connected" : "Connecting..."}
        </div>
      </div>

      <div className="chat-messages" ref={messagesEndRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <h2>Welcome to Restaurant Chatbot</h2>
            <p>Ask me anything about restaurants, menus, or promotions!</p>
            <div className="quick-queries">
              {quickQueries.map((query, idx) => (
                <button
                  key={idx}
                  className="quick-query-btn"
                  onClick={() => handleQuickQuery(query)}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const renderContent = () => {
              // Attempt to format JSON-like responses for better display
              if (msg.role === "assistant" && typeof msg.content === "string") {
                try {
                  const data = JSON.parse(msg.content);
                  // Handle restaurant list formatting
                  if (Array.isArray(data?.results) && data.target === "restaurant") {
                    return (
                      <div className="result-cards">
                        {data.results.map((r, i) => (
                          <div key={i} className="card">
                            <div className="card-title">{r.name || "Unknown"}</div>
                            <div className="card-meta">
                              {(r.cuisine || r.category) && <span>{r.cuisine || r.category}</span>}
                              {r.priceTier && <span>• {r.priceTier}</span>}
                            </div>
                            {(r.ambience && r.ambience.length > 0) && (
                              <div className="card-tags">
                                {r.ambience.slice(0, 5).map((tag, ti) => (
                                  <span key={ti} className="tag">{tag}</span>
                                ))}
                              </div>
                            )}
                            {r.address && <div className="card-desc">{r.address}</div>}
                          </div>
                        ))}
                      </div>
                    );
                  }
                } catch (_) {
                  // not JSON, show as plain text
                }
              }
              return msg.content;
            };
            return (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-avatar">{msg.role === "user" ? "👤" : "🤖"}</div>
                <div className="message-content">{renderContent()}</div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form className="chat-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          className="chat-input"
          placeholder="Ask about restaurants, menus, or promotions..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!connected || loading}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!connected || loading || !message.trim()}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}

export default ChatBox;
