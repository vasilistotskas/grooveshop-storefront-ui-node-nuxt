import { z } from 'zod'

export const ZodFloorChoicesEnum = z.enum([
	'BASEMENT',
	'GROUND_FLOOR',
	'FIRST_FLOOR',
	'SECOND_FLOOR',
	'THIRD_FLOOR',
	'FOURTH_FLOOR',
	'FIFTH_FLOOR',
	'SIXTH_FLOOR_PLUS'
])

export const ZodLocationChoicesEnum = z.enum(['HOME', 'OFFICE', 'OTHER'])

export enum FloorChoicesEnum {
	BASEMENT = 0,
	GROUND_FLOOR = 1,
	FIRST_FLOOR = 2,
	SECOND_FLOOR = 3,
	THIRD_FLOOR = 4,
	FOURTH_FLOOR = 5,
	FIFTH_FLOOR = 6,
	SIXTH_FLOOR_PLUS = 7
}

export enum LocationChoicesEnum {
	HOME = 0,
	OFFICE = 1,
	OTHER = 2
}

export type ImageLoading = 'lazy' | 'eager' | undefined
export type FloorChoicesEnumType = z.infer<typeof ZodFloorChoicesEnum>
export type LocationChoicesEnumType = z.infer<typeof ZodLocationChoicesEnum>
