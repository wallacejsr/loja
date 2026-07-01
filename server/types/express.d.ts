export {};

declare global {
  namespace Express {
    interface Request {
    clientIp?: string;
    cookies?: Record<string, string>;
    currentCustomerId?: string;
    currentSessionId?: string;
    rawBody?: Buffer;
    requestId?: string;
  }
}
}
