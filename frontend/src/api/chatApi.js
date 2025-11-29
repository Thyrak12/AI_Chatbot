import { io } from "socket.io-client";

// Socket.IO client connects to backend Socket.IO server
const SOCKET_URL = "http://127.0.0.1:5000";
const socket = io(SOCKET_URL, { autoConnect: true });

const pending = new Map();

socket.on('connect', () => {
  console.log('socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn('socket disconnected:', reason);
});

socket.on('chat:response', (data) => {
  if (!data) return;
  const cb = pending.get(data.id);
  if (cb) {
    pending.delete(data.id);
    cb.resolve(data);
  }
});

socket.on('session:created', (data) => {
  // session creation uses same pending map by id
  if (!data) return;
  const cb = pending.get(data.id);
  if (cb) {
    pending.delete(data.id);
    cb.resolve(data);
  }
});

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getSession() {
  return new Promise((resolve, reject) => {
    const id = makeId();
    pending.set(id, { resolve, reject });
    socket.emit('session:create', { id });
    // timeout
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('session:create timeout'));
      }
    }, 5000);
  });
}

export function sendMessage(message, sessionId = null) {
  return new Promise((resolve, reject) => {
    const id = makeId();
    pending.set(id, { resolve, reject });
    socket.emit('chat:message', { id, message, sessionId });
    // timeout
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('chat:message timeout'));
      }
    }, 15000);
  });
}

export default { getSession, sendMessage, socket };
