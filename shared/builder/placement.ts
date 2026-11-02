import type { BlockDefinition } from '../types/builder'
import { parseBuilderDocumentKey } from '../utils/builderEditor'

/** The section group the theme document is: a block offered to the theme names it in `groups`. */
export const BUILDER_THEME_GROUP = 'theme'

/**
 * Whether a section of `definition` may sit at the top of the document
 * `documentKey`, as Django decides it on save (`builder/validation.py:
 * _placement_allowed`): a block restricted to groups lives only in those
 * groups, and the theme is the group `theme`; a block restricted to
 * templates lives only in those (a page the store made is the template
 * `page`); a block that names neither goes in any template or page.
 *
 * The editor's add-section library asks it to offer only what a save would
 * take. Django stays the judge: this only filters what is offered.
 * `test/fixtures/builder/placement-cases.json` holds the cases both sides are
 * tested against, so the two cannot drift apart unnoticed.
 */
export function builderPlacementAllowed(definition: Pick<BlockDefinition, 'groups' | 'templates'>, documentKey: string): boolean {
  const { kind, name } = parseBuilderDocumentKey(documentKey)
  if (kind === 'theme') return definition.groups?.includes(BUILDER_THEME_GROUP) ?? false
  if (kind === 'group') return name !== undefined && (definition.groups?.includes(name) ?? false)
  const template = kind === 'page' ? 'page' : name
  if (definition.templates !== undefined) return template !== undefined && definition.templates.includes(template)
  return definition.groups === undefined
}
