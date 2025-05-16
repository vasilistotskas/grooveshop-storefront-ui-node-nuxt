import type * as z from 'zod'

export type FloorEnum = z.infer<typeof ZodFloorEnum>
export type LocationTypeEnum = z.infer<typeof ZodLocationTypeEnum>
