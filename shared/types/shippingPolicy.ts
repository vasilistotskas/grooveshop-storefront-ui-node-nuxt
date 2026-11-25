/**
 * One row of the store's shipping policy as `GET /api/shipping/policy`
 * answers it (`server/api/shipping/policy.get.ts`): Django's row, plus the
 * `Region` records its `regionCodes` name, in that order, so a page can say
 * in its own language which regions a regional price applies to. A row
 * whose `regionCodes` is empty applies to the whole country and has no
 * regions.
 */
export type ShippingPolicyRow = ShippingPolicyEntry & { regions: Region[] }
