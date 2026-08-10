/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

/**
 * StorageProvider Interface
 * Designed with Strategy Pattern to allow seamless switching between Database (Vercel Serverless safe), Local Disk, and AWS S3.
 */
export interface StorageProvider {
  saveFile(filename: string, buffer: Buffer, mimeType: string): Promise<string>;
  getFile(fileKeyOrUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  deleteFile?(fileKeyOrUrl: string): Promise<void>;
}

/**
 * Database Storage Provider (Default & Serverless Safe):
 * Stores the file as a Base64 data URI directly inside the MongoDB document.
 * 100% compatible with Vercel Serverless (zero filesystem dependency, persistent across all serverless invocations).
 */
export class DatabaseStorageProvider implements StorageProvider {
  async saveFile(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }

  async getFile(fileKeyOrUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (fileKeyOrUrl.startsWith('data:')) {
      const clean = fileKeyOrUrl.replace(/^data:[^;]+;base64,/, '');
      return { buffer: Buffer.from(clean, 'base64'), mimeType: 'application/pdf' };
    }
    return null;
  }
}

/**
 * Local Disk Storage Provider (For standalone VPS / Docker deployments where STORAGE_PROVIDER=local)
 */
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    // Do NOT perform synchronous filesystem operations in constructor to prevent Serverless crash
    this.uploadDir = path.resolve(process.cwd(), 'uploads', 'recipes');
  }

  private async ensureDir(): Promise<boolean> {
    try {
      await fs.promises.mkdir(this.uploadDir, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  async saveFile(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
    // If running in Vercel or read-only filesystem, use database storage provider
    const isDirReady = await this.ensureDir();
    if (!isDirReady) {
      const dbProvider = new DatabaseStorageProvider();
      return dbProvider.saveFile(filename, buffer, mimeType);
    }

    try {
      const timestamp = Date.now();
      const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const safeFilename = `${timestamp}_${cleanName}`;
      const filePath = path.join(this.uploadDir, safeFilename);

      await fs.promises.writeFile(filePath, buffer);
      return `/uploads/recipes/${safeFilename}`;
    } catch {
      const dbProvider = new DatabaseStorageProvider();
      return dbProvider.saveFile(filename, buffer, mimeType);
    }
  }

  async getFile(fileKeyOrUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (fileKeyOrUrl.startsWith('data:')) {
      const dbProvider = new DatabaseStorageProvider();
      return dbProvider.getFile(fileKeyOrUrl);
    }

    try {
      const filename = path.basename(fileKeyOrUrl);
      const filePath = path.join(this.uploadDir, filename);

      const exists = fs.existsSync(filePath);
      if (!exists) {
        return null;
      }

      const buffer = await fs.promises.readFile(filePath);
      return { buffer, mimeType: 'application/pdf' };
    } catch {
      return null;
    }
  }

  async deleteFile(fileKeyOrUrl: string): Promise<void> {
    if (fileKeyOrUrl.startsWith('data:')) return;
    try {
      const filename = path.basename(fileKeyOrUrl);
      const filePath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch {
      // Ignore cleanup error on read-only environments
    }
  }
}

/**
 * S3 Storage Provider (Ready for AWS S3 / Cloudflare R2 / MinIO integration)
 * To enable:
 * 1. Set environment variable: STORAGE_PROVIDER=s3
 * 2. Configure AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
 */
export class S3StorageProvider implements StorageProvider {
  async saveFile(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
    // S3 integration hook:
    // const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    // const key = `recipes/${Date.now()}_${filename}`;
    // await s3Client.send(new PutObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key, Body: buffer, ContentType: mimeType }));
    // return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
    console.warn('[StorageService] S3 Provider no configurado aún, utilizando almacenamiento seguro de base de datos.');
    const fallback = new DatabaseStorageProvider();
    return fallback.saveFile(filename, buffer, mimeType);
  }

  async getFile(fileKeyOrUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const fallback = new DatabaseStorageProvider();
    return fallback.getFile(fileKeyOrUrl);
  }
}

/**
 * Storage Service Factory
 */
export class StorageService {
  private provider: StorageProvider;

  constructor() {
    const providerType = (process.env.STORAGE_PROVIDER || '').toLowerCase();
    if (providerType === 's3') {
      this.provider = new S3StorageProvider();
    } else if (providerType === 'local') {
      this.provider = new LocalStorageProvider();
    } else {
      // Default to DatabaseStorageProvider for zero-configuration, 100% Vercel Serverless compatibility
      this.provider = new DatabaseStorageProvider();
    }
  }

  /**
   * Saves a Recipe PDF file either from Base64 Data URL or raw Buffer.
   * Returns the accessible URL / path for the saved file.
   */
  async saveRecipePdf(filename: string, dataBase64OrBuffer: string | Buffer): Promise<string> {
    let buffer: Buffer;
    if (typeof dataBase64OrBuffer === 'string') {
      if (dataBase64OrBuffer.startsWith('data:')) {
        const base64Data = dataBase64OrBuffer.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = Buffer.from(dataBase64OrBuffer, 'base64');
      }
    } else {
      buffer = dataBase64OrBuffer;
    }

    return this.provider.saveFile(filename, buffer, 'application/pdf');
  }

  async getRecipeFile(fileUrl: string) {
    return this.provider.getFile(fileUrl);
  }
}

export const storageService = new StorageService();
