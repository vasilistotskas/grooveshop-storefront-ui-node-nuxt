import * as z from 'zod'

/** An id of a record in the store: a positive integer that fits a 32-bit key. */
export const recordId = () => z.number().int().min(1).max(2_147_483_647)
