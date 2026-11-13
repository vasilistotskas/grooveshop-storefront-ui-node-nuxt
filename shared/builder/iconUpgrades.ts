import type { BlockUpgrade } from '../types/builder'
import { builderIconOf } from './icons'

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
