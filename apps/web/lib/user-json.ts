import { publicSubscription } from "./subscription";

/**
 * Single source of truth for the user JSON returned by every auth /me
 * endpoint. Strips the raw receipt out of the subscription before sending
 * it to the client.
 *
 * `user` is a Mongoose document. Typed loosely on purpose so callers don't
 * fight the InferSchemaType — every field we read is either defaulted on
 * the schema or coerced here.
 */
type AnyUser = {
  _id: unknown;
  email: string;
  name: string;
  onboarding?: unknown;
  xp?: number;
  rank?: number;
  username?: string | null;
  weeklyPlan?: string[] | null;
  reminders?: unknown;
  subscription?: unknown;
};

export function publicUserJson(user: AnyUser) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    onboarding: user.onboarding ?? null,
    xp: user.xp ?? 0,
    rank: user.rank ?? 1,
    username: user.username ?? null,
    weeklyPlan: user.weeklyPlan ?? null,
    reminders: user.reminders ?? null,
    subscription: publicSubscription(
      user.subscription as Parameters<typeof publicSubscription>[0],
    ),
  };
}
