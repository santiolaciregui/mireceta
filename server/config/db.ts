import mongoose from 'mongoose';
import { config } from './env.js';

let cachedPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    maxPoolSize: 10,
    minPoolSize: 0,
  }).catch((err) => {
    cachedPromise = null;
    console.error('Error connecting to MongoDB:', err);
    throw err;
  });

  return cachedPromise;
};
