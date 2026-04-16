const TERMINAL_CHECKOUT_INTENT_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "expired",
]);

const CHECKOUT_INTENT_TRANSITIONS = {
  pending: new Set(["requires_action", "completed", "failed", "cancelled", "expired"]),
  requires_action: new Set(["pending", "completed", "failed", "cancelled", "expired"]),
  completed: new Set(),
  failed: new Set(),
  cancelled: new Set(),
  expired: new Set(),
};

function toTimestamp(value) {
  if (!value) {
    return null;
  }

  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function canTransitionCheckoutIntent(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedTransitions = CHECKOUT_INTENT_TRANSITIONS[currentStatus];
  if (!allowedTransitions) {
    return false;
  }

  return allowedTransitions.has(nextStatus);
}

export function assertCheckoutIntentTransition(currentStatus, nextStatus) {
  if (!canTransitionCheckoutIntent(currentStatus, nextStatus)) {
    throw new Error(
      `INVALID_CHECKOUT_INTENT_TRANSITION:${currentStatus}->${nextStatus}`,
    );
  }
}

export function isCheckoutIntentTerminal(status) {
  return TERMINAL_CHECKOUT_INTENT_STATUSES.has(status);
}

export function deriveSubscriptionLifecycle(subscription, nowInput = new Date()) {
  const now = toTimestamp(nowInput) ?? Date.now();
  const currentPeriodEnd =
    toTimestamp(subscription.currentPeriodEnd) ?? toTimestamp(subscription.renewalAt);
  const endedAt = toTimestamp(subscription.endedAt);

  if (subscription.status === "expired") {
    return {
      phase: "expired",
      hasAccess: false,
      autoRenews: false,
      isCancelled: true,
      isCancellationScheduled: false,
    };
  }

  if (endedAt !== null && endedAt <= now) {
    return {
      phase: "expired",
      hasAccess: false,
      autoRenews: false,
      isCancelled: true,
      isCancellationScheduled: false,
    };
  }

  if (subscription.status === "cancelled") {
    if (currentPeriodEnd !== null && currentPeriodEnd > now) {
      return {
        phase: "access_until_period_end",
        hasAccess: true,
        autoRenews: false,
        isCancelled: true,
        isCancellationScheduled: false,
      };
    }

    return {
      phase: "expired",
      hasAccess: false,
      autoRenews: false,
      isCancelled: true,
      isCancellationScheduled: false,
    };
  }

  if (subscription.cancelAtPeriodEnd && currentPeriodEnd !== null && currentPeriodEnd > now) {
    return {
      phase: "cancel_scheduled",
      hasAccess: true,
      autoRenews: false,
      isCancelled: false,
      isCancellationScheduled: true,
    };
  }

  if (subscription.status === "trial") {
    return {
      phase: "trial",
      hasAccess: true,
      autoRenews: false,
      isCancelled: false,
      isCancellationScheduled: false,
    };
  }

  return {
    phase: "active",
    hasAccess: true,
    autoRenews: true,
    isCancelled: false,
    isCancellationScheduled: false,
  };
}

export function getBillingAvailability(mode) {
  return {
    mode,
    checkoutAvailable: false,
    customerPortalAvailable: false,
    reason:
      mode === "disabled" ? "billing_disabled" : "billing_not_implemented",
  };
}
