import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { User } from '../server/models/User.js';
import { Order } from '../server/models/Order.js';

dotenv.config();

const DB_PATH = path.join(process.cwd(), 'database.json');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mi-receta';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB at ${MONGODB_URI}`);

    let users = [];
    let orders = [];

    if (!fs.existsSync(DB_PATH)) {
      console.log('No database.json found. Proceeding to check for default users.');
    } else {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      users = data.users || [];
      orders = data.orders || [];
    }

    if (users && users.length > 0) {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log(`Seeding ${users.length} users...`);
        await User.insertMany(users);
        console.log('Users seeded.');
      } else {
        console.log('Users collection is not empty, skipping user seed.');
      }
    } else {
      // Ensure at least one admin exists if no database.json users were found
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('No users found to seed. Creating default admin user...');
        await User.create({
          id: 'USR-ADMIN',
          name: 'Admin',
          lastName: 'Principal',
          role: 'admin',
          identifier: 'admin',
          email: 'admin@recetafacil.com',
          status: 'Activo',
          password: 'admin',
        });
        console.log('Default admin created (identifier: admin, password: admin)');
      }
    }

    if (orders && orders.length > 0) {
      const orderCount = await Order.countDocuments();
      if (orderCount === 0) {
        console.log(`Seeding ${orders.length} orders...`);
        await Order.insertMany(orders);
        console.log('Orders seeded.');
      } else {
        console.log('Orders collection is not empty, skipping order seed.');
      }
    }

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
