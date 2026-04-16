import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCheckoutIntentTransition,
  canTransitionCheckoutIntent,
  deriveSubscriptionLifecycle,
  getBillingAvailability,
  isCheckoutIntentTerminal,
} from "../src/lib/server/billing-domain.mjs";

test("checkout intent transitions allow only valid forward and retry states", () => {
  assert.equal(canTransitionCheckoutIntent("pending", "requires_action"), true);
  assert.equal(canTransitionCheckoutIntent("requires_action", "pending"), true);
  assert.equal(canTransitionCheckoutIntent("pending", "completed"), true);
  assert.equal(canTransitionCheckoutIntent("completed", "pending"), false);
  assert.equal(canTransitionCheckoutIntent("failed", "completed"), false);
});

test("assertCheckoutIntentTransition rejects invalid terminal transition", () => {
  assert.throws(
    () => {
      assertCheckoutIntentTransition("completed", "pending");
    },
    /INVALID_CHECKOUT_INTENT_TRANSITION:completed->pending/,
  );
});

test("isCheckoutIntentTerminal marks final statuses", () => {
  assert.equal(isCheckoutIntentTerminal("completed"), true);
  assert.equal(isCheckoutIntentTerminal("failed"), true);
  assert.equal(isCheckoutIntentTerminal("cancelled"), true);
  assert.equal(isCheckoutIntentTerminal("expired"), true);
  assert.equal(isCheckoutIntentTerminal("pending"), false);
});

test("deriveSubscriptionLifecycle reports active cancellation window", () => {
  const lifecycle = deriveSubscriptionLifecycle(
    {
      status: "cancelled",
      currentPeriodEnd: "2026-05-01T00:00:00.000Z",
      endedAt: null,
      renewalAt: null,
      cancelAtPeriodEnd: false,
    },
    new Date("2026-04-14T20:00:00.000Z"),
  );

  assert.deepEqual(lifecycle, {
    phase: "access_until_period_end",
    hasAccess: true,
    autoRenews: false,
    isCancelled: true,
    isCancellationScheduled: false,
  });
});

test("deriveSubscriptionLifecycle reports scheduled cancellation separately from cancelled", () => {
  const lifecycle = deriveSubscriptionLifecycle(
    {
      status: "active",
      currentPeriodEnd: "2026-05-01T00:00:00.000Z",
      endedAt: null,
      renewalAt: null,
      cancelAtPeriodEnd: true,
    },
    new Date("2026-04-14T20:00:00.000Z"),
  );

  assert.deepEqual(lifecycle, {
    phase: "cancel_scheduled",
    hasAccess: true,
    autoRenews: false,
    isCancelled: false,
    isCancellationScheduled: true,
  });
});

test("getBillingAvailability exposes disabled mode as not ready for checkout", () => {
  assert.deepEqual(getBillingAvailability("disabled"), {
    mode: "disabled",
    checkoutAvailable: false,
    customerPortalAvailable: false,
    reason: "billing_disabled",
  });
});
