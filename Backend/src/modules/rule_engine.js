// ==========================
// rule_engine.js
// ==========================

function isGreeting(text) {
  return /(hi|hello|hey)\b/i.test(text);
}
function isThanks(text) {
  return /(thank|thanks)/i.test(text);
}
function isHelp(text) {
  return /(help|how do i|commands)/i.test(text);
}

/**
 * detectSimpleMessage
 */
export function detectSimpleMessage(userMsg) {
  const t = String(userMsg || '').trim().toLowerCase();

  if (isGreeting(t)) return "Hello! How can I help you find a restaurant today?";
  if (isThanks(t)) return "You're welcome! Need more assistance?";
  if (isHelp(t)) return "You can ask like 'Show me KFC menu' or 'cheap restaurants'.";

  return null;
}

/**
 * handleRule
 */
export function handleRule(parsed, userMsg, data, err) {
  if (err) return "Database error. Please try again later.";
  if (Array.isArray(data) && data.length === 0) return "I couldn't find anything that matches. Try another name or filter.";
  return null;
}

export default { detectSimpleMessage, handleRule };
