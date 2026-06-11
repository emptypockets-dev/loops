import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** One-line helper so consequential mutations always leave an audit trail. */
export async function logAudit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await ctx.db.insert("auditLog", {
    userId,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: Date.now(),
  });
}

/** Strip undefined values so db.patch never accidentally unsets fields. */
export function pruneUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}
