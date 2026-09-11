/**
 * dsh-session-manager host plugin (v0.1.2: trash + restore).
 *
 * Routes:
 *   POST /dsh-session-manager/delete   body: { sessionId }  -> move to trash
 *   POST /dsh-session-manager/restore  body: { sessionId }  -> restore from trash
 *   POST /dsh-session-manager/purge    body: { sessionId }  -> permanently purge
 *   GET  /dsh-session-manager/trash                          -> list trash entries
 *
 * Delete flow (soft delete):
 *  1. Resolve the persisted session; refuse sessions whose agent is actively
 *     running a turn.
 *  2. Move the session's artifact directory into the plugin trash folder
 *     (a blank session without an artifact just records the entry).
 *  3. Archive the session so every client hides the row immediately.
 *  4. Record the entry (original path + deletedAt) in the plugin's storage
 *     domain; when the trash exceeds the limit, the oldest entries are
 *     purged for good.
 *
 * Restore flow:
 *  1. Find the trash entry; move the artifact back to its original path.
 *  2. Remove the session id from the workspace archive set through the
 *     workspace domain (the official broadcast refreshes every client).
 *  3. Drop the trash entry.
 *
 * Purge flow: remove the artifact directory and the trash entry.
 */
import type { Context } from '@deepseek-ai/cordis';
import { z } from 'zod';
export declare const name = "dsh-session-manager";
export declare const inject: string[];
/** Maximum trash entries kept; the oldest overflow is purged automatically. */
export declare const TRASH_LIMIT = 10;
declare const trashEntrySchema: z.ZodObject<{
    sessionId: z.ZodString;
    cwd: z.ZodOptional<z.ZodString>;
    originalPath: z.ZodOptional<z.ZodString>;
    deletedAt: z.ZodNumber;
}, z.core.$strip>;
export type TrashEntry = z.infer<typeof trashEntrySchema>;
/**
 * Mirror of the JSONL backend's per-segment escaping: anything outside
 * `[A-Za-z0-9._-]` becomes `~XXXX` (uppercase hex of the UTF-16 code unit).
 * @param raw - the id to encode.
 * @returns the encoded path segment.
 */
export declare function encodeSegment(raw: string): string;
/**
 * Mirror of the JSONL backend's project-directory key for one working
 * directory: separators collapse to single `-`, anything else outside
 * `[A-Za-z0-9._-]` escapes to `~XXXX`, wrapped in `--…--` and length-capped.
 * @param cwd - the session's working directory.
 * @returns the project directory basename.
 */
export declare function projectKey(cwd: string): string;
/**
 * The directory holding one stored session's log, derived exactly the way the
 * JSONL persistence backend names it: `<root>/<projectKey(cwd)>/<encodeSegment(id)>`,
 * with `root` defaulting to `$DSH_HOME/sessions` and `_no-cwd` standing in for a
 * session without a working directory.
 *
 * `SessionPersistence.locate()` used to answer this, but 0.1.5-rc.1 removed it:
 * the seam is handle-based and deliberately carries no consumer-facing path
 * query (upstream note "Persistence export() and pre-release read-path trims" —
 * all three of its consumers were only functional with compression disabled).
 * The trash feature still needs the session DIRECTORY to move a log aside, so
 * this mirrors the backend's naming instead. It is a pure function of
 * (id, cwd); a change to the backend's layout needs this to follow.
 * @param sessionId - the stored session's id.
 * @param cwd - the session's working directory from its header, when it has one.
 * @returns the absolute session directory.
 */
export declare function sessionLogDir(sessionId: string, cwd: string | undefined): string;
export declare function apply(ctx: Context): Promise<() => Promise<void>>;
export {};
//# sourceMappingURL=index.d.ts.map