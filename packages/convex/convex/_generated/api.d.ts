/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_askAnything from "../ai/askAnything.js";
import type * as ai_intents from "../ai/intents.js";
import type * as ai_replySuggestions from "../ai/replySuggestions.js";
import type * as ai_summary from "../ai/summary.js";
import type * as ai_transcribe from "../ai/transcribe.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as http from "../http.js";
import type * as manager from "../manager.js";
import type * as seed from "../seed.js";
import type * as serviceRequests from "../serviceRequests.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/askAnything": typeof ai_askAnything;
  "ai/intents": typeof ai_intents;
  "ai/replySuggestions": typeof ai_replySuggestions;
  "ai/summary": typeof ai_summary;
  "ai/transcribe": typeof ai_transcribe;
  auth: typeof auth;
  chat: typeof chat;
  http: typeof http;
  manager: typeof manager;
  seed: typeof seed;
  serviceRequests: typeof serviceRequests;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
