import { baseCompile } from '@intlify/message-compiler'
import type { LinkedNode, MessageNode, NodeTypes } from '@intlify/message-compiler'
import type { MessageShape } from '../types/textCatalogue.ts'

// `NodeTypes` is an ambient const enum, which `isolatedModules` forbids
// reading as a value, and the package does not export it at runtime. The
// numbers are the package's own; `satisfies` makes the compiler check each
// one against its enum member.
const NAMED = 4 satisfies NodeTypes.Named
const LIST = 5 satisfies NodeTypes.List
const LINKED = 6 satisfies NodeTypes.Linked
const LITERAL = 9 satisfies NodeTypes.Literal
const PLURAL = 1 satisfies NodeTypes.Plural

type MessageItem = MessageNode['items'][number]

function linkedTokens(node: LinkedNode): string[] {
  const { key } = node
  // `@:{name}` and `@:{0}` name a parameter, not another message.
  if (key.type === NAMED) return [`named:${key.key}`]
  if (key.type === LIST) return [`list:${key.index}`]
  const target = key.value ?? ''
  const modifier = node.modifier?.value
  return [modifier ? `linked:${target}|${modifier}` : `linked:${target}`]
}

function itemTokens(item: MessageItem): string[] {
  if (item.type === NAMED) return [`named:${item.key}`]
  if (item.type === LIST) return [`list:${item.index}`]
  if (item.type === LITERAL) return []
  if (item.type === LINKED) return linkedTokens(item)
  return []
}

/**
 * Compile `source` the way the app does at run time (vue-i18n compiles a
 * message with `baseCompile(message, { jit: true })` in
 * `@intlify/core-base`) and report what it uses, or why it does not
 * compile.
 *
 * `strictMessage: false` (`i18n.compilation` in `nuxt.config.ts`) governs
 * only the build plugin's HTML check for `<i18n>` blocks; the run-time
 * compiler never rejects HTML, so neither does this. A lone trailing `{`
 * is likewise accepted by the compiler itself (it drops the brace), and so
 * by this.
 */
export function analyzeMessage(source: string): { errors: string[], shape: MessageShape } {
  const errors: string[] = []
  const { ast } = baseCompile(source, {
    jit: true,
    onError: error => errors.push(error.message),
  })
  const { body } = ast
  const cases = body.type === PLURAL ? body.cases : [body]
  const params = new Set(cases.flatMap(message => message.items.flatMap(itemTokens)))
  return {
    errors,
    shape: { params: [...params].sort(), pluralCases: cases.length },
  }
}

/** Whether two shapes accept the same parameters and the same number of plural cases. */
export function sameShape(a: MessageShape, b: MessageShape): boolean {
  return a.pluralCases === b.pluralCases
    && a.params.length === b.params.length
    && a.params.every((param, index) => param === b.params[index])
}
