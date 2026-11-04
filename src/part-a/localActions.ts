// Changes that the mock API doesn't support, applied to a local copy of the subscription.
// Once any of these is used, the page works from that copy (see README).
import { totalAfterDiscount } from "../api/fixtures";
import type { Subscription } from "../api/types";

export const DAY_MS = 24 * 60 * 60 * 1000;

const nowIso = () => new Date().toISOString();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Short delay so local actions feel like the real request they stand in for. */
export const fakeLatency = () => wait(600);

export function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** What one shipment costs after the discount, whatever the status. */
export const perShipmentCents = (sub: Subscription) =>
  sub.nextChargeTotalCents ?? totalAfterDiscount(sub.items, sub.discountPercent);

/** Rough monthly cost for a given frequency, treating a month as 30 days like the "every 30 days" plan does. */
export const monthlyCents = (sub: Subscription, intervalDays: number) =>
  Math.round((perShipmentCents(sub) * 30) / intervalDays);

export async function simulateSkip(sub: Subscription): Promise<Subscription> {
  await fakeLatency();
  return {
    ...sub,
    nextChargeAt: new Date(Date.parse(sub.nextChargeAt!) + sub.intervalDays * DAY_MS).toISOString(),
    updatedAt: nowIso(),
  };
}

/** Resume a paused subscription or restart a cancelled one. First charge is tomorrow. */
export function restart(sub: Subscription): Subscription {
  return {
    ...sub,
    status: "active",
    nextChargeAt: tomorrow().toISOString(),
    nextChargeTotalCents: totalAfterDiscount(sub.items, sub.discountPercent),
    pausedUntil: null,
    cancelledAt: null,
    updatedAt: nowIso(),
  };
}

/**
 * The next shipment date for a new frequency: the same time after the last shipment as the new interval.
 * Moving from 30 to 60 days pushes Nov 10 to Dec 10. Never earlier than tomorrow.
 */
export function nextDateForFrequency(sub: Subscription, intervalDays: number): string | null {
  if (sub.status !== "active" || !sub.nextChargeAt) return null;
  const moved = Date.parse(sub.nextChargeAt) + (intervalDays - sub.intervalDays) * DAY_MS;
  return new Date(Math.max(moved, tomorrow().getTime())).toISOString();
}

export function changeFrequency(sub: Subscription, intervalDays: number): Subscription {
  return {
    ...sub,
    intervalDays,
    nextChargeAt: nextDateForFrequency(sub, intervalDays) ?? sub.nextChargeAt,
    updatedAt: nowIso(),
  };
}

/** When a pause of `months` would end. A paused subscription is extended from its current end date. */
export function pauseEnd(sub: Subscription, months: number): Date {
  const start = sub.status === "paused" && sub.pausedUntil ? new Date(sub.pausedUntil) : new Date();
  return addMonths(start, months);
}

export function pause(sub: Subscription, months: number): Subscription {
  return {
    ...sub,
    status: "paused",
    pausedUntil: pauseEnd(sub, months).toISOString(),
    nextChargeAt: null,
    nextChargeTotalCents: null,
    updatedAt: nowIso(),
  };
}

export function cancel(sub: Subscription): Subscription {
  return {
    ...sub,
    status: "cancelled",
    cancelledAt: nowIso(),
    nextChargeAt: null,
    nextChargeTotalCents: null,
    pausedUntil: null,
    updatedAt: nowIso(),
  };
}
