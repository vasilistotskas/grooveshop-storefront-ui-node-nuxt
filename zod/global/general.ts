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

export const locationChoicesList = Object.keys(LocationChoicesEnum).filter((element) => {
	return isNaN(Number(element))
})
export const floorChoicesList = Object.keys(FloorChoicesEnum).filter((element) => {
	return isNaN(Number(element))
})

export const defaultSelectOptionChoose = 'choose'
