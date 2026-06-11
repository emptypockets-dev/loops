/**
 * Every AI action resolves to this — failures are values, not exceptions,
 * so a screen can show a toast instead of crashing.
 */
export type AiResult = { ok: true } | { ok: false; error: string };

export type AiCallResult<T> = { ok: true; data: T } | { ok: false; error: string };
