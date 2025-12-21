import express from 'express';
import cors from 'cors';
import chatRoutes from './src/routes/chat_routes.js';
import { connectDB } from './src/config/db.js';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { handleChat } from './src/services/chatbot_service.js';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// REST API routes
app.use('/api', chatRoutes);

// Create HTTP + Socket.IO server
const httpServer = http.createServer(app);
const io = new IOServer(httpServer, { cors: { origin: '*' } });

// Session ID generator
function generateSessionId() {
  try {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch (e) { }
  return crypto.randomBytes(16).toString('hex');
}

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('chat:message', async ({ id, message, sessionId }) => {
    try {
      if (!message) return socket.emit('chat:response', { id, error: 'Message is required' });
      const sid = sessionId || generateSessionId();
      const reply = await handleChat(message, sid);
      const text = (typeof reply === 'string') ? reply : (reply?.text ?? '');
      socket.emit('chat:response', { id, response: text, sessionId: sid });
    } catch (err) {
      console.error('socket chat:message error:', err);
      socket.emit('chat:response', { id, error: 'Server error' });
    }
  });

  socket.on('session:create', () => {
    const sessionId = generateSessionId();
    socket.emit('session:created', { sessionId });
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected', socket.id, reason);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use.`);
  } else {
    console.error('HTTP server error:', err);
  }
  process.exit(1);
});

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
