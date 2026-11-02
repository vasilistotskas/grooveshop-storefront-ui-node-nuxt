/**
 * Where the server reports a node `parseDocument` (`shared/builder/document.ts`)
 * left out of a published document: one warning per node, so a page that
 * renders without a section says which one and why. The code is stable, the
 * detail says more.
 */
export function logSkippedNode(skip: BuilderNodeSkip): void {
  log.warn({
    tag: 'builder',
    message: 'node skipped',
    node: skip.path,
    reason: skip.reason,
    ...(skip.detail && { detail: skip.detail }),
  })
}
