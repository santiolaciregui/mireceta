/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

/**
 * StorageProvider Interface
 * Designed with Strategy Pattern to allow seamless switching from local disk to AWS S3, Azure Blob, or Cloudflare R2.
 */
export interface StorageProvider {
  saveFile(filename: string, buffer: Buffer, mimeType: string): Promise<string>;
  getFile(fileKeyOrUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  deleteFile?(fileKeyOrUrl: string): Promise<void>;
}

/**
 * Local Storage Provider: saves files to server disk in ./uploads/recipes/
 */
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads', 'recipes');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
    const timestamp = Date.now();
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFilename = `${timestamp}_${cleanName}`;
    const filePath = path.join(this.uploadDir, safeFilename);

    await fs.promises.writeFile(filePath, buffer);
    // Relative URL served statically by express at /uploads/recipes/...
    return `/uploads/recipes/${safeFilename}`;
  }

  async getFile(fileKeyOrUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const filename = path.basename(fileKeyOrUrl);
    const filePath = path.join(this.uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const buffer = await fs.promises.readFile(filePath);
    return { buffer, mimeType: 'application/pdf' };
  }

  async deleteFile(fileKeyOrUrl: string): Promise<void> {
    const filename = path.basename(fileKeyOrUrl);
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

/**
 * S3 Storage Provider (Ready for future AWS S3 / Cloudflare R2 / MinIO integration)
 * To switch to S3 in the future:
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
    console.warn('[StorageService] S3 Provider no configurado aún, utilizando almacenamiento local de respaldo.');
    const fallback = new LocalStorageProvider();
    return fallback.saveFile(filename, buffer, mimeType);
  }

  async getFile(fileKeyOrUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const fallback = new LocalStorageProvider();
    return fallback.getFile(fileKeyOrUrl);
  }
}

/**
 * Storage Service Factory
 */
export class StorageService {
  private provider: StorageProvider;

  constructor() {
    const providerType = process.env.STORAGE_PROVIDER || 'local';
    if (providerType.toLowerCase() === 's3') {
      this.provider = new S3StorageProvider();
    } else {
      this.provider = new LocalStorageProvider();
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
