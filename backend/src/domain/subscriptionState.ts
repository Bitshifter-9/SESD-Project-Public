import { SubscriptionState as PrismaSubscriptionState } from "@prisma/client";

type TransitionContext = {
  current: PrismaSubscriptionState;
  now: Date;
  endDate: Date;
};

abstract class BaseState {
  abstract key: PrismaSubscriptionState;
  abstract canStream(context: TransitionContext): boolean;
  abstract next(context: TransitionContext): PrismaSubscriptionState;
}

class ActiveState extends BaseState {
  key = PrismaSubscriptionState.ACTIVE;

  canStream(context: TransitionContext): boolean {
    return context.now <= context.endDate;
  }

  next(context: TransitionContext): PrismaSubscriptionState {
    if (context.now <= context.endDate) {
      return PrismaSubscriptionState.ACTIVE;
    }
    return PrismaSubscriptionState.GRACE_PERIOD;
  }
}

class GracePeriodState extends BaseState {
  key = PrismaSubscriptionState.GRACE_PERIOD;

  canStream(context: TransitionContext): boolean {
    const graceDeadline = new Date(context.endDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    return context.now <= graceDeadline;
  }

  next(context: TransitionContext): PrismaSubscriptionState {
    return this.canStream(context) ? PrismaSubscriptionState.GRACE_PERIOD : PrismaSubscriptionState.SUSPENDED;
  }
}

class SuspendedState extends BaseState {
  key = PrismaSubscriptionState.SUSPENDED;

  canStream(): boolean {
    return false;
  }

  next(): PrismaSubscriptionState {
    return PrismaSubscriptionState.SUSPENDED;
  }
}

class CancelledState extends BaseState {
  key = PrismaSubscriptionState.CANCELLED;

  canStream(context: TransitionContext): boolean {
    return context.now <= context.endDate;
  }

  next(context: TransitionContext): PrismaSubscriptionState {
    return context.now > context.endDate ? PrismaSubscriptionState.EXPIRED : PrismaSubscriptionState.CANCELLED;
  }
}

class ExpiredState extends BaseState {
  key = PrismaSubscriptionState.EXPIRED;

  canStream(): boolean {
    return false;
  }

  next(): PrismaSubscriptionState {
    return PrismaSubscriptionState.EXPIRED;
  }
}

const stateMachine: Record<PrismaSubscriptionState, BaseState> = {
  ACTIVE: new ActiveState(),
  GRACE_PERIOD: new GracePeriodState(),
  SUSPENDED: new SuspendedState(),
  CANCELLED: new CancelledState(),
  EXPIRED: new ExpiredState()
};

export function evaluateSubscriptionState(input: TransitionContext): {
  nextState: PrismaSubscriptionState;
  canStream: boolean;
} {
  const node = stateMachine[input.current];
  return {
    nextState: node.next(input),
    canStream: node.canStream(input)
  };
}
