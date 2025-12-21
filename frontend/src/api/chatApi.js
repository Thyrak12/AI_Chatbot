const API_URL = "http://localhost:5000/api";

/**
 * Create a new chat session
 * @returns {Promise<{sessionId: string}>}
 */
export async function createSession() {
  try {
    const response = await fetch(`${API_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("createSession error:", error);
    throw error;
  }
}

/**
 * Send a message to the chatbot
 * @param {string} message - User message
 * @param {string} sessionId - Session ID
 * @returns {Promise<{response: string, sessionId: string}>}
 */
export async function sendMessage(message, sessionId) {
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("sendMessage error:", error);
    throw error;
  }
}

export default { createSession, sendMessage };
