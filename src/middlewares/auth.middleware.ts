import { NextFunction, Response, RequestHandler } from "express";
import { AuthRequest } from "../interfaces/Auth";

type AuthServiceResponse = {
  user?: any;
  hasPermission?: boolean;
  role?: string;
};

// Cache configuration with TTL
const API_CACHE = new Map<string, { data: AuthServiceResponse; expiresAt: number }>();
const CACHE_TTL_MS = 5000; // 5 seconds cache

// Unified API caller with improved caching and error handling
const callAuthService = async (
  endpoint: string,
  token: string,
  body?: Record<string, unknown>
): Promise<AuthServiceResponse> => {
  const cacheKey = `${endpoint}:${token}:${body ? JSON.stringify(body) : ''}`;

  // Check cache and validate TTL
  const cached = API_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const init: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    const response = await fetch(`${process.env.AUTH_URL}${endpoint}`, init);

    if (!response.ok) {
      throw new Error(`Auth service error: ${response.statusText}`);
    }

    const data: AuthServiceResponse = await response.json();

    // Cache the response with expiration time
    API_CACHE.set(cacheKey, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return data;
  } catch (error) {
    // Invalidate cache on error
    API_CACHE.delete(cacheKey);
    throw error;
  }
};

// Token verification with caching
const verifyAuthToken = async (token: string): Promise<{ user: any }> => {
  const response = await callAuthService('/middleware/verify-token', token);
  if (!response.user) {
    throw new Error('Invalid token or user data');
  }
  return { user: response.user };
};

// Permission verification with caching
const verifyPermission = async (token: string, permission: string): Promise<{ hasPermission: boolean }> => {
  const response = await callAuthService('/middleware/authorize-permission', token, { permission });
  if (typeof response.hasPermission !== 'boolean') {
    throw new Error('Invalid permission response');
  }
  return { hasPermission: response.hasPermission };
};

// Optimized token extraction with strict validation
const getTokenFromHeader = (req: AuthRequest): string => {
  const authHeader = req.headers.authorization?.trim();
  if (!authHeader) throw new Error('Authorization header missing');

  const [scheme, token] = authHeader.split(/\s+/);
  if (!token || !/^Bearer$/i.test(scheme)) throw new Error('Invalid authorization format');

  return token;
};

// Base authentication middleware with improved error handling
export const authenticate: RequestHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = getTokenFromHeader(req);
    const { user } = await verifyAuthToken(token);

    if (!user) throw new Error('Invalid user data');

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    res.status(401).json({
      success: false,
      message,
      code: "UNAUTHORIZED"
    });
  }
};

// Optimized role authorization middleware factory
export const authorizeRole = (requiredRole: string): RequestHandler => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const token = req.token || getTokenFromHeader(req);

      // First check if we already have the user with the correct role
      if (req.user?.role === requiredRole) return next();

      // Otherwise verify with auth service
      const { user } = await verifyAuthToken(token);

      if (user?.role !== requiredRole) {
        res.status(403).json({
          success: false,
          message: "Insufficient privileges",
          code: "FORBIDDEN"
        });
        return;
      }

      // Update request user if not already set
      req.user = req.user || user;
      next();
    } catch (err) {
      res.status(403).json({
        success: false,
        message: "Authorization failed",
        code: "FORBIDDEN"
      });
    }
  };
};

// Optimized permission authorization middleware factory
export const authorizePermission = (permission: string): RequestHandler => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const token = req.token || getTokenFromHeader(req);
      const { hasPermission } = await verifyPermission(token, permission);

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          code: "FORBIDDEN"
        });
        return;
      }

      next();
    } catch (err) {
      res.status(403).json({
        success: false,
        message: "Permission verification failed",
        code: "FORBIDDEN"
      });
    }
  };
};

// Cache cleanup function (optional, runs periodically to clean expired entries)
function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of API_CACHE.entries()) {
    if (entry.expiresAt <= now) {
      API_CACHE.delete(key);
    }
  }
}

// Run cache cleanup every minute
setInterval(cleanCache, 60000);