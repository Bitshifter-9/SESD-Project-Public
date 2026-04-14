import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../lib/config.js";
import { db } from "../lib/db.js";

type LoginInput = {
  email: string;
  password: string;
  deviceInfo: string;
  ipAddress: string;
};

export class AuthService {
  async register(email: string, password: string) {
    const hash = await bcrypt.hash(password, 10);
    return db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hash,
          role: UserRole.VIEWER
        }
      });

      const defaultPlan = await tx.plan.findFirst({
        where: { name: "Starter" }
      });

      if (defaultPlan) {
        const now = new Date();
        await tx.subscription.create({
          data: {
            userId: user.id,
            planId: defaultPlan.id,
            state: "ACTIVE",
            startDate: now,
            endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          }
        });
      }

      return user;
    });
  }

  async login(input: LoginInput) {
    const user = await db.user.findUnique({
      where: { email: input.email },
      include: { subscription: { include: { plan: true } } }
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new Error("Invalid credentials");
    }

    const maxDevices = user.subscription?.plan.maxDevices ?? 1;

    await db.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lte: new Date() }
      }
    });

    const activeSessions = await db.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "asc" }
    });

    if (activeSessions.length >= maxDevices) {
      const oldest = activeSessions[0];
      await db.session.delete({ where: { id: oldest.id } });
    }

    const session = await db.session.create({
      data: {
        userId: user.id,
        deviceInfo: input.deviceInfo,
        ipAddress: input.ipAddress,
        expiresAt: new Date(Date.now() + config.defaultSessionTtlHours * 60 * 60 * 1000)
      }
    });

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        sessionId: session.id
      },
      config.jwtSecret,
      { expiresIn: "24h" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }
}
