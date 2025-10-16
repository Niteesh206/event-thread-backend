// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import connectDB from './config/database.js';
// import authRoutes from './routes/auth.js';
// import threadRoutes from './routes/threads.js';
// import adminRoutes from './routes/admin.js';

// // Load environment variables
// dotenv.config();

// // Initialize Express app
// const app = express();

// // CORS Configuration
// const corsOptions = {
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   credentials: true,
//   optionsSuccessStatus: 200,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// };

// // Middleware
// app.use(cors(corsOptions));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Connect to MongoDB
// connectDB();

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/threads', threadRoutes);
// app.use('/api/admin', adminRoutes);

// // Root route
// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'EventThreads API',
//     version: '1.0.0',
//     status: 'running',
//     endpoints: {
//       health: '/api/health',
//       auth: '/api/auth',
//       threads: '/api/threads',
//       admin: '/api/admin'
//     }
//   });
// });

// // Health check
// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'ok', 
//     message: 'EventThreads API is running',
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV || 'development'
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({ 
//     success: false,
//     message: 'Route not found' 
//   });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Error:', err.stack);
//   res.status(err.status || 500).json({ 
//     success: false, 
//     message: err.message || 'Something went wrong!',
//     error: process.env.NODE_ENV === 'development' ? err.message : undefined
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📡 API: http://localhost:${PORT}/api`);
//   console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
//   console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
//   console.log(`🔗 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
// });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import threadRoutes from './routes/threads.js';
import adminRoutes from './routes/admin.js';
import gossipRoutes from './routes/gossips.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Socket.io setup
const io = new Server(httpServer, {
  cors: corsOptions
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join a thread room
  socket.on('join-thread', (threadId) => {
    socket.join(threadId);
    console.log(`📌 User ${socket.id} joined thread: ${threadId}`);
  });

  // Leave a thread room
  socket.on('leave-thread', (threadId) => {
    socket.leave(threadId);
    console.log(`🚪 User ${socket.id} left thread: ${threadId}`);
  });

  // Handle new message
  socket.on('send-message', (data) => {
    const { threadId, message } = data;
    console.log(`💬 Message in thread ${threadId}:`, message.message.substring(0, 50));
    // Broadcast to all users in the thread room
    io.to(threadId).emit('new-message', message);
  });

  // Handle thread updates (new thread, join requests, etc.)
  socket.on('thread-update', (threadId) => {
    console.log(`🔄 Thread update: ${threadId}`);
    io.emit('refresh-threads');
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'EventThreads API',
    version: '1.0.0',
    status: 'running',
    websocket: 'enabled',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      threads: '/api/threads',
      admin: '/api/admin'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'EventThreads API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    websocket: 'enabled'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`⚡ WebSocket enabled`);
});