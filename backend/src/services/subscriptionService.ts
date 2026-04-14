import { SubscriptionState } from "@prisma/client";
import { db } from "../lib/db.js";
import { evaluateSubscriptionState } from "../domain/subscriptionState.js";

export class SubscriptionService {
  async getActiveSubscription(userId: string) {
    const subscription = await db.subscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    if (!subscription) {
      throw new Error("No subscription found");
    }

    const state = evaluateSubscriptionState({
      current: subscription.state,
      now: new Date(),
      endDate: subscription.endDate
    });

    if (state.nextState !== subscription.state) {
      await db.subscription.update({
        where: { userId },
        data: { state: state.nextState }
      });
    }

    return {
      ...subscription,
      state: state.nextState,
      canStream: state.canStream && state.nextState !== SubscriptionState.SUSPENDED
    };
  }

  async startOrRenew(userId: string, planId: string) {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return db.subscription.upsert({
      where: { userId },
      update: {
        planId,
        state: "ACTIVE",
        startDate: now,
        endDate: end
      },
      create: {
        userId,
        planId,
        state: "ACTIVE",
        startDate: now,
        endDate: end
      }
    });
  }
}
