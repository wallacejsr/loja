export {};

declare global {
  namespace Express {
    interface Request {
    clientIp?: string;
    cookies?: Record<string, string>;
    currentAdminEmail?: string;
    currentAdminRole?: string;
    currentAdminSessionId?: string;
    currentAdminUserId?: string;
    currentCustomerId?: string;
    currentSessionId?: string;
    rawBody?: Buffer;
    requestId?: string;
  }
}
}
