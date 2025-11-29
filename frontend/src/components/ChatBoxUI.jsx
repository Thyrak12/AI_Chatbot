import React from "react";
import "./ChatBoxUI.css";

/**
 * Simple Markdown-like formatter for bot messages.
 * Converts **bold**, *italic*, - lists, numbered lists, and newlines.
 */
function formatMessage(text) {
  if (!text) return null;

  // Split by double newlines for paragraphs, single newlines for lines
  const lines = text.split(/\n/);
  const elements = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(<ol key={`ol-${elements.length}`} className="msg-list">{listItems}</ol>);
      } else {
        elements.push(<ul key={`ul-${elements.length}`} className="msg-list">{listItems}</ul>);
      }
      listItems = [];
      listType = null;
    }
  };

  const formatInline = (line, idx) => {
    // Convert **bold** and *italic*
    const parts = [];
    let remaining = line;
    let partKey = 0;

    while (remaining) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Italic: *text* (but not **)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

      let firstMatch = null;
      let matchType = null;

      if (boldMatch && (!italicMatch || boldMatch.index <= italicMatch.index)) {
        firstMatch = boldMatch;
        matchType = 'bold';
      } else if (italicMatch) {
        firstMatch = italicMatch;
        matchType = 'italic';
      }

      if (firstMatch) {
        // Text before match
        if (firstMatch.index > 0) {
          parts.push(<span key={partKey++}>{remaining.slice(0, firstMatch.index)}</span>);
        }
        // The matched styled text
        if (matchType === 'bold') {
          parts.push(<strong key={partKey++}>{firstMatch[1]}</strong>);
        } else {
          parts.push(<em key={partKey++}>{firstMatch[1]}</em>);
        }
        remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
      } else {
        parts.push(<span key={partKey++}>{remaining}</span>);
        remaining = '';
      }
    }

    return parts.length > 0 ? parts : line;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Unordered list: - item or * item
    if (/^[-*]\s+/.test(trimmed)) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      const content = trimmed.replace(/^[-*]\s+/, '');
      listItems.push(<li key={`li-${idx}`}>{formatInline(content, idx)}</li>);
      return;
    }

    // Ordered list: 1. item, 2. item, etc.
    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      const content = trimmed.replace(/^\d+\.\s+/, '');
      listItems.push(<li key={`li-${idx}`}>{formatInline(content, idx)}</li>);
      return;
    }

    // Not a list item - flush any pending list
    flushList();

    // Empty line = paragraph break
    if (!trimmed) {
      elements.push(<br key={`br-${idx}`} />);
      return;
    }

    // Regular line
    elements.push(<p key={`p-${idx}`} className="msg-para">{formatInline(trimmed, idx)}</p>);
  });

  flushList();
  return elements;
}

const QUICK_ACTIONS = [
  { label: "How to Book", query: "How do I book a table?" },
  { label: "Popular Food", query: "Show me popular dishes" },
  { label: "Nearest Restaurant", query: "Find nearest restaurants" },
  { label: "Budget Restaurant", query: "Show budget-friendly restaurants" },
];

export default function ChatBoxUI({
  chat,
  lastError,
  message,
  setMessage,
  sendMessage,
  resetSession,
  loading,
  chatRef,
  onQuickAction,
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickClick = (query) => {
    if (onQuickAction) {
      onQuickAction(query);
    } else {
      setMessage(query);
      setTimeout(() => sendMessage(), 0);
    }
  };

  // Hide greeting & chips once conversation has started
  const hasStartedChat = chat.length > 0;

  return (
    <div className="chatbox-container">
      {lastError && (
        <div className="chat-error-banner" role="alert">
          {`Network error: ${lastError}. Check backend or your connection.`}
        </div>
      )}
      {/* Header */}
      <div className="chatbox-header">
        <button onClick={resetSession} className="back-btn">
          ← Back
        </button>
        {hasStartedChat && (
          <div className="header-avatar">
            <span className="avatar-sm">🤖</span>
            <span className="header-title">Restaurant Assistant</span>
          </div>
        )}
      </div>

      {/* Avatar + Greeting — only shown before first message */}
      {!hasStartedChat && (
        <div className="chatbox-greeting">
          <div className="avatar-wrap">
            <div className="avatar">🤖</div>
          </div>
          <h2 className="greeting-title">Hello!,</h2>
          <p className="greeting-subtitle">How Can I help You</p>
        </div>
      )}

      {/* Quick action chips — only shown before first message */}
      {!hasStartedChat && (
        <div className="chatbox-chips">
          {QUICK_ACTIONS.map((a) => (
            <button key={a.label} className="chip" onClick={() => quickClick(a.query)}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat messages */}
      <div className={`chatbox-messages ${hasStartedChat ? "messages-expanded" : ""}`} ref={chatRef}>
        {chat.map((msg, index) => (
          <div
            key={index}
            className={`bubble ${msg.sender === "user" ? "bubble-user" : "bubble-bot"}`}
          >
            {msg.sender === "user" ? (
              msg.text
            ) : (
              <div>
                {formatMessage(msg.text)}
                {/* Render structured data if present: restaurants with matchedSignatureMenus or plain menus */}
                {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
                  <div className="matched-data">
                    {msg.data.map((item, idx) => (
                      <div key={idx} className="matched-restaurant">
                        <div className="matched-restaurant-name"><strong>{item.name || item.title || 'Restaurant'}</strong></div>
                        {Array.isArray(item.matchedSignatureMenus) && item.matchedSignatureMenus.length > 0 && (
                          <ul className="matched-menus-list">
                            {item.matchedSignatureMenus.map((m, mi) => (
                              <li key={mi} className="matched-menu-item">
                                <span className="menu-name">{m.name}</span>
                                {typeof m.price === 'number' && (
                                  <span className="menu-price"> — ${m.price.toFixed(2)}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* If item looks like a menu object itself */}
                        {item.name && item.price && !item.matchedSignatureMenus && (
                          <div className="single-menu">
                            <span className="menu-name">{item.name}</span>
                            <span className="menu-price"> — ${Number(item.price).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="bubble bubble-bot typing">...</div>}
      </div>

      {/* Input bar */}
      <div className="chatbox-inputbar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Ask Something"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="chat-input"
        />
        <button onClick={sendMessage} className="send-btn">
          ➤
        </button>
      </div>
    </div>
  );
}
