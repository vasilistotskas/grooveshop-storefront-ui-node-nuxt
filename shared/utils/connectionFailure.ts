/**
 * What a browser says when the visitor's connection failed, not our code.
 * One definition for the browser reporter (`app/utils/clientErrors.ts`,
 * `levelOf`) and the ingest (`server/utils/clientEventLevel.ts`), so a
 * failure is `warn` whichever path reported it.
 */

/**
 * What a browser says when a script chunk cannot be downloaded, whatever
 * the cause (offline, blocker, flaky network): Chrome "Failed to fetch
 * dynamically imported module", Firefox "error loading dynamically
 * imported module", Safari "Importing a module script failed.", Vite's
 * "Unable to preload CSS", webpack's `ChunkLoadError` / "Loading chunk N
 * failed". The visitor's connection failed, not our code, and Nuxt
 * (`experimental.emitRouteChunkError`) already reloads the page.
 */
const CHUNK_LOAD_MESSAGE = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|loading (?:css )?chunk [\w-]+ failed/i

/**
 * What a browser's `fetch` rejects with when the request got no response
 * at all (offline, the page left mid-request, a blocker): Chrome "Failed to
 * fetch", Firefox "NetworkError when attempting to fetch resource.", Safari
 * "Load failed" and "A network error occurred.". The whole message, not a
 * substring: an error that merely mentions one is not one.
 */
const NO_RESPONSE_MESSAGE = /^(?:failed to fetch|networkerror when attempting to fetch resource\.?|load failed|a network error occurred\.?)$/i

/** Whether an error message is a chunk download failure in the visitor's browser. */
export function isChunkLoadMessage(message: string): boolean {
  return CHUNK_LOAD_MESSAGE.test(message)
}

/** Whether an error message is a `fetch` that got no response in the visitor's browser. */
export function isNoResponseMessage(message: string): boolean {
  return NO_RESPONSE_MESSAGE.test(message.trim())
}
