import jwt from "jsonwebtoken";
import { NextFunction, Response } from "express";
import { UserRole } from "@prisma/client";
import { config } from "../lib/config.js";
import { AuthenticatedRequest } from "../types.js";

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { sub: string; role: UserRole };
    req.auth = {
      userId: decoded.sub,
      role: decoded.role
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(role: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.auth.role !== role) {
      return res.status(403).json({ error: "Insufficient role" });
    }

    return next();
  };
}
