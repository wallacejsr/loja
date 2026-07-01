import type express from 'express';

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseRequestCookies() {
  return (request: express.Request, _response: express.Response, next: express.NextFunction) => {
    const cookieHeader = request.headers.cookie;
    const cookies: Record<string, string> = {};

    if (cookieHeader) {
      for (const cookieEntry of cookieHeader.split(';')) {
        const separatorIndex = cookieEntry.indexOf('=');
        if (separatorIndex <= 0) continue;

        const key = cookieEntry.slice(0, separatorIndex).trim();
        const value = cookieEntry.slice(separatorIndex + 1).trim();
        if (!key) continue;

        cookies[key] = decodeCookieValue(value);
      }
    }

    request.cookies = cookies;
    next();
  };
}

