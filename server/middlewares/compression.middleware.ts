import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

/**
 * Lightweight native HTTP compression middleware using Node.js zlib.
 * Compresses responses >= 1KB with gzip or deflate based on Accept-Encoding.
 */
export function httpCompression(req: Request, res: Response, next: NextFunction): void {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (
    typeof acceptEncoding !== 'string' ||
    (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate'))
  ) {
    return next();
  }

  const originalSend = res.send.bind(res);

  res.send = function (body: any): Response {
    if (!body || req.method === 'HEAD') {
      return originalSend(body);
    }

    let buffer: Buffer;
    if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (typeof body === 'string') {
      buffer = Buffer.from(body);
    } else if (typeof body === 'object') {
      buffer = Buffer.from(JSON.stringify(body));
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
    } else {
      return originalSend(body);
    }

    // Skip small payloads under 1KB
    if (buffer.length < 1024) {
      return originalSend(buffer);
    }

    const useGzip = acceptEncoding.includes('gzip');
    const encoding = useGzip ? 'gzip' : 'deflate';
    const compressFn = useGzip ? zlib.gzipSync : zlib.deflateSync;

    try {
      const compressed = compressFn(buffer);
      res.removeHeader('Content-Length');
      res.setHeader('Content-Encoding', encoding);
      res.setHeader('Vary', 'Accept-Encoding');
      return originalSend(compressed);
    } catch {
      return originalSend(buffer);
    }
  };

  next();
}
