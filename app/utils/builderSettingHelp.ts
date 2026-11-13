import el from '~/builder/labels/el.json'

type Messages = Readonly<Record<string, unknown>>

const isMessages = (value: unknown): value is Messages => typeof value === 'object' && value !== null

/** The node at `parts` of the label messages, `undefined` when there is none. */
function at(messages: Messages, parts: readonly string[]): unknown {
  return parts.reduce<unknown>((node, part) => (isMessages(node) ? node[part] : undefined), messages)
}

/**
 * The label key of a setting's help line in the settings form of a block of
 * `type`: the block's own (`blocks.<type>.settings.<path>.help`) when the
 * block has one, else the one every block with that setting shares
 * (`settings.<path>.help`), else none.
 *
 * A setting name is shared by every block that has it (`icon` is a posts
 * band's tile and a footer column's mark alike), so a line that is true of
 * one block only is written under that block, where no other block reads it
 * (2026-11-13: the posts band's icon line showed on the footer columns).
 * Read off the default language's file, which `labels.spec.ts` keeps in step
 * with the other.
 */
export function builderSettingHelpKey(type: string, path: string): string | undefined {
  const parts = path.split('.')
  const own = ['blocks', type, 'settings', ...parts, 'help']
  if (typeof at(el, own) === 'string') return own.join('.')
  const shared = ['settings', ...parts, 'help']
  return typeof at(el, shared) === 'string' ? shared.join('.') : undefined
}
