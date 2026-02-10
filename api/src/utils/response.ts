import type { ServerResponse } from 'http';

export function jsonResponse(res: ServerResponse, data: any, status: number = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function errorResponse(res: ServerResponse, message: string, status: number = 404): void {
  jsonResponse(res, { error: message }, status);
}
