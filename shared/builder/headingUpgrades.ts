import type { BlockUpgrade } from '../types/builder'

/**
 * A band's heading was two settings, `title` and `heading`, and every
 * component drew `heading` first: this keeps the one it drew under the one
 * name. A translation of either follows (`upgradeNodeTranslations`).
 */
export const upgradeTitleIntoHeading: BlockUpgrade = ({ settings, ...body }) => {
  const { title, heading, ...kept } = settings
  const text = heading || title
  return { ...body, settings: { ...kept, ...(text ? { heading: text } : {}) } }
}
