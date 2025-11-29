import React, { useState } from "react";

function ChatBox() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    // Add user message to chat
    setChat(prev => [...prev, { sender: "user", text: message }]);

    // Send to Flask API
    const res = await fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();

    // Add AI response to chat
    setChat(prev => [...prev, { sender: "bot", text: data.response }]);

    setMessage("");
  };

  return (
    <div style={{ width: "400px", margin: "auto", marginTop: "50px" }}>
      <h2>Restaurant Chatbot</h2>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          height: "300px",
          overflowY: "scroll",
          borderRadius: "8px",
        }}
      >
        {chat.map((msg, index) => (
          <p
            key={index}
            style={{
              textAlign: msg.sender === "user" ? "right" : "left",
              background: msg.sender === "user" ? "#d1f0ff" : "#eee",
              padding: "6px 10px",
              borderRadius: "6px",
            }}
          >
            {msg.text}
          </p>
        ))}
      </div>

      <div style={{ marginTop: "10px" }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ width: "80%", padding: "8px" }}
        />
        <button
          onClick={sendMessage}
          style={{
            width: "18%",
            padding: "8px",
            marginLeft: "2%",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatBox;
