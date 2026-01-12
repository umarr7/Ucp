import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from './auth';
import { JWTPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    (req as AuthenticatedRequest).user = payload;
    return handler(req as AuthenticatedRequest);
  };
}

export function withRole(allowedRoles: string[]) {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return withAuth(async (req: AuthenticatedRequest) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      return handler(req);
    });
  };
}

// Rate limiting store (in-memory, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function withRateLimit(maxRequests: number = 60, windowMs: number = 60000) {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      const token = getTokenFromRequest(req);
      const key = token || req.headers.get('x-forwarded-for') || 'anonymous';
      
      const now = Date.now();
      const record = rateLimitStore.get(key);

      if (record && record.resetAt > now) {
        if (record.count >= maxRequests) {
          return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429 }
          );
        }
        record.count++;
      } else {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      }

      // Clean up old entries periodically
      if (Math.random() < 0.01) {
        for (const [k, v] of rateLimitStore.entries()) {
          if (v.resetAt <= now) {
            rateLimitStore.delete(k);
          }
        }
      }

      return handler(req as AuthenticatedRequest);
    };
  };
}
