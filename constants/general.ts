import { ZodLocationChoicesEnum, ZodFloorChoicesEnum } from '~/types/global/general'

export const locationChoicesList = Object.keys(ZodLocationChoicesEnum.Values).filter(
	(element) => {
		return isNaN(Number(element))
	}
)
export const floorChoicesList = Object.keys(ZodFloorChoicesEnum.Values).filter(
	(element) => {
		return isNaN(Number(element))
	}
)

export const defaultSelectOptionChoose = 'choose'
