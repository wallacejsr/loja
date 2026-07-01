export {};

declare global {
  namespace Express {
    interface Request {
      clientIp?: string;
      cookies?: Record<string, string>;
      rawBody?: Buffer;
      requestId?: string;
    }
  }
}

