import mongoose from 'mongoose';
import { config } from './env.js';

let cachedPromise: Promise<typeof mongoose> | null = null;

const DB_CONNECT_TIMEOUT_MS = 7000;
const DB_SOCKET_TIMEOUT_MS = 20000;

mongoose.set('bufferCommands', false);

export const getDBState = () => {
  const readyState = mongoose.connection.readyState;
  const labels: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    readyState,
    status: labels[readyState] || 'unknown',
  };
};

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: DB_CONNECT_TIMEOUT_MS,
    connectTimeoutMS: DB_CONNECT_TIMEOUT_MS,
    socketTimeoutMS: DB_SOCKET_TIMEOUT_MS,
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000,
  }).then((m) => m).catch((err) => {
    cachedPromise = null;
    console.error('MongoDB connection failed:', {
      name: err?.name,
      message: err?.message,
      readyState: mongoose.connection.readyState,
    });
    throw err;
  });

  return cachedPromise;
};

mongoose.connection.on('disconnected', () => {
  cachedPromise = null;
});

mongoose.connection.on('error', () => {
  cachedPromise = null;
});
