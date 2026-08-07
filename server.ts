import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './server/config/db.js';
import { config } from './server/config/env.js';
import { errorHandler } from './server/middlewares/error.middleware.js';
import routes from './server/routes/index.js';
import { Tenant } from './server/models/Tenant.js';
import { User } from './server/models/User.js';
import { Order } from './server/models/Order.js';

async function runTenantMigration() {
  try {
    let defaultTenant = await Tenant.findOne({ id: 'TEN-0001' });
    if (!defaultTenant) {
      defaultTenant = new Tenant({ id: 'TEN-0001', name: 'Centro Médico Principal', subdomain: 'www' });
      await defaultTenant.save();
      console.log('Created default tenant TEN-0001');
    }
    let wwwTenant = await Tenant.findOne({ subdomain: 'www' });
    if (!wwwTenant) {
      wwwTenant = new Tenant({ id: 'TEN-WWW', name: 'Centro Médico Principal', subdomain: 'www' });
      await wwwTenant.save();
      console.log('Created www tenant');
    }

    const updatedUsers = await User.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: 'TEN-0001' } }
    );
    if (updatedUsers.modifiedCount > 0) console.log(`Migrated ${updatedUsers.modifiedCount} users to TEN-0001`);

    const updatedOrders = await Order.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: 'TEN-0001' } }
    );
    if (updatedOrders.modifiedCount > 0) console.log(`Migrated ${updatedOrders.modifiedCount} orders to TEN-0001`);

    // Unify chatMessages into messages and clean up legacy redundant fields
    const legacyOrders = await Order.find({
      $or: [
        { chatMessages: { $exists: true } },
        { notificationsSent: { $exists: true } }
      ]
    });
    for (const ord of legacyOrders) {
      if ((ord as any).chatMessages && (!ord.messages || ord.messages.length === 0)) {
        ord.messages = (ord as any).chatMessages;
      }
      (ord as any).chatMessages = undefined;
      (ord as any).notificationsSent = undefined;
      await ord.save();
    }
  } catch (error) {
    console.error('Error running tenant migration:', error);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  await connectDB();
  await runTenantMigration();

  const uploadsDir = path.resolve('uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  app.use('/api', routes);

  // Global Error Handler
  app.use(errorHandler);

  // Setup Vite / Frontend
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(config.PORT, () => {
    console.log(`Server is running on http://localhost:${config.PORT}`);
  });
}

startServer();
