import { UserRole } from "@prisma/client";
import { Request } from "express";

export type AuthContext = {
  userId: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};
