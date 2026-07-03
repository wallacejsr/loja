import type express from 'express';

export function applyNoStoreHeaders() {
  return (_request: express.Request, response: express.Response, next: express.NextFunction) => {
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    next();
  };
}
