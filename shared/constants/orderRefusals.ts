/**
 * The `code` of the 503 Django answers when a pickup point could not be
 * checked against its carrier's catalogue (`shipping.api_errors`
 * `PickupPointCheckUnavailable`, with `Retry-After`): the point is not
 * judged, so the same order may succeed shortly. The order route forwards
 * that body (`server/api/orders/index.post.ts`) and the checkout says to
 * try again, never to choose another point (`classifyOrderError`).
 */
export const PICKUP_POINT_CHECK_UNAVAILABLE = 'pickup_point_check_unavailable'
