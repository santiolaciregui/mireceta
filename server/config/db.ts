import mongoose from 'mongoose';
import { config } from './env.js';

let cachedPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async () => {
  // 1. If already connected (readyState === 1), reuse existing connection immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // 2. If a connection attempt is already in progress, await the existing promise
  if (cachedPromise) {
    return cachedPromise;
  }

  // 3. Initiate a new connection with robust timeouts for serverless environments
  cachedPromise = mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
    minPoolSize: 0,
    bufferCommands: true,
  }).then((m) => {
    return m;
  }).catch((err) => {
    cachedPromise = null;
    console.error('Error connecting to MongoDB:', err);
    throw err;
  });

  return cachedPromise;
};

// Reset cachedPromise if the connection drops so subsequent requests can re-establish
mongoose.connection.on('disconnected', () => {
  cachedPromise = null;
});
mongoose.connection.on('error', () => {
  cachedPromise = null;
});
