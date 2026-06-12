/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as calendar from "../calendar.js";
import type * as crons from "../crons.js";
import type * as dailyBriefs from "../dailyBriefs.js";
import type * as drafts from "../drafts.js";
import type * as http from "../http.js";
import type * as inboxItems from "../inboxItems.js";
import type * as integrations from "../integrations.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_validators from "../lib/validators.js";
import type * as loops from "../loops.js";
import type * as reviews from "../reviews.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  calendar: typeof calendar;
  crons: typeof crons;
  dailyBriefs: typeof dailyBriefs;
  drafts: typeof drafts;
  http: typeof http;
  inboxItems: typeof inboxItems;
  integrations: typeof integrations;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/validators": typeof lib_validators;
  loops: typeof loops;
  reviews: typeof reviews;
  tasks: typeof tasks;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
