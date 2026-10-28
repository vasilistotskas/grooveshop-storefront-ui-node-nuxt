/** The part of h3's event a render marks itself degraded on. */
export interface DegradableEvent {
  context: { degradedRender?: { status: number } }
  node: { res: { statusCode: number } }
}

/**
 * Mark the render in progress as a fallback that must reach no cache:
 * remember the status it would answer with, and answer with
 * `DEGRADED_RENDER_STATUS` while it is inside Nitro's page cache, which
 * stores nothing below that bar. `server/plugins/edge-cache.ts` puts the
 * remembered status back as the response ends
 * (`shared/constants/degradedRender.ts`).
 */
export function markDegradedRender(event: DegradableEvent): void {
  event.context.degradedRender = { status: event.node.res.statusCode }
  event.node.res.statusCode = DEGRADED_RENDER_STATUS
}
