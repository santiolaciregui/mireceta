import express from 'express';
import { connectDB } from '../server/config/db.js';
import routes from '../server/routes/index.js';
import { errorHandler } from '../server/middlewares/error.middleware.js';
import { Tenant } from '../server/models/Tenant.js';

const app = express();
app.use(express.json({ limit: '50mb' }));

let isMigrated = false;

async function ensureDBAndMigration() {
  await connectDB();
  if (!isMigrated) {
    try {
      let defaultTenant = await (Tenant as any).findOne({ id: 'TEN-0001' });
      if (!defaultTenant) {
        defaultTenant = new Tenant({ id: 'TEN-0001', name: 'Centro Médico Principal', subdomain: 'www' });
        await defaultTenant.save();
      }
      let wwwTenant = await (Tenant as any).findOne({ subdomain: 'www' });
      if (!wwwTenant) {
        wwwTenant = new Tenant({ id: 'TEN-WWW', name: 'Centro Médico Principal', subdomain: 'www' });
        await wwwTenant.save();
      }
      isMigrated = true;
    } catch (e) {
      console.error('Migration error:', e);
    }
  }
}

app.use(async (req, res, next) => {
  await ensureDBAndMigration();
  next();
});

// Mount API routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
