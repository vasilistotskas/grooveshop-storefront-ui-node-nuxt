import type { BlockUpgrade } from '../types/builder'
import { builderIconOf } from './icons'
import type { BuilderIcon } from './icons'

/**
 * The upgrade that brought an icon setting onto the list: a saved name is
 * written as its entry, and one the list does not hold is left out (the
 * setting is optional), so the node passes the closed field and the page
 * renders as before, the icon painted on the server.
 */
export const upgradeIconSetting: BlockUpgrade = ({ settings, ...body }) => {
  const { icon, ...rest } = settings
  if (typeof icon !== 'string') return { ...body, settings }
  const listed = builderIconOf(icon)
  return { ...body, settings: listed ? { ...rest, icon: listed } : rest }
}

/**
 * `upgradeIconSetting` for a block that needs a mark, an image, an image URL
 * or an icon (`trust_badge`): when the icon the upgrade leaves out was its
 * only mark, `fallback` (the block's own preset icon) takes its place, so the
 * node still passes its block's rule rather than being left off the page.
 * Django's port takes the same argument (`block_upgrades.py`).
 */
export function upgradeIconSettingKeepingAMark(fallback: BuilderIcon): BlockUpgrade {
  return (body) => {
    const upgraded = upgradeIconSetting(body)
    const { settings } = upgraded
    const dropped = typeof body.settings.icon === 'string' && settings.icon === undefined
    const marked = settings.image !== undefined || Boolean(settings.imageUrl)
    return dropped && !marked ? { ...upgraded, settings: { ...settings, icon: fallback } } : upgraded
  }
}
