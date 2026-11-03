import type { BlockUpgrade } from '../types/builder'

/**
 * Version 1 of the offers band (`limit`) to version 2 (`offers`): the first
 * offers running, as many as it asked for, or as its component drew when it
 * asked for none (`defaultLimit`). The size is the same in every language, so
 * no translation is left pointing at a setting the block no longer has.
 */
export function upgradeOffers(defaultLimit: number): BlockUpgrade {
  return ({ settings, ...body }) => {
    const { limit, ...kept } = settings
    return { ...body, settings: { ...kept, offers: { limit: typeof limit === 'number' ? limit : defaultLimit } } }
  }
}
