import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import * as h3 from 'h3'
import { beforeAll, describe, expect, it } from 'vitest'
import type { AstNode } from '../../helpers/sourceText'
import { REPO, parseScript, readSource, relativeLabel, walkAst } from '../../helpers/sourceText'

/**
 * Server code imports what it uses from h3 and Nitro; nothing of theirs
 * is reached through an auto-import.
 *
 * Nuxt 5 runs on Nitro v3, which has no auto-imports, and its upgrade
 * guide moves server code to explicit imports: the portable helpers from
 * `nuxt/server`, and the Nitro-only APIs (cache, storage, plugins,
 * `useEvent`) from Nitro itself. An import names where a helper comes
 * from, so the upgrade is a change to that line rather than a hunt
 * through every handler for a helper that silently changed meaning.
 * `server/utils` and `shared` stay auto-imported: they are ours, and
 * Nuxt 5 keeps scanning them.
 *
 * `experimental.nitroAutoImports` cannot enforce this on Nuxt 4.6: turned
 * off, it still declares every h3 and Nitro name and only drops evlog's
 * `log`.
 */
const SERVER = resolve(REPO, 'server')

const nitropackRuntime = (): string[] => {
  const require = createRequire(resolve(REPO, 'node_modules/nuxt/package.json'))
  const root = dirname(require.resolve('nitropack/package.json'))
  const declarations = readFileSync(resolve(root, 'dist/runtime/index.d.ts'), 'utf8')
  return [...declarations.matchAll(/export \{([^}]*)\}/g)]
    .flatMap(([, names]) => names!.split(',').map(name => name.trim()).filter(Boolean))
}

const tsFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory()
    ? tsFiles(resolve(dir, entry.name))
    : entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [resolve(dir, entry.name)] : [])

// Positions where an identifier names something else: an object key, a
// member property, a label, or a binding being declared.
const isReference = (node: AstNode, parent: AstNode | undefined): boolean => {
  if (!parent) return true
  if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && parent.property === node && !parent.computed) return false
  if ((parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod' || parent.type === 'ClassMethod' || parent.type === 'ClassProperty' || parent.type === 'TSPropertySignature' || parent.type === 'TSMethodSignature') && parent.key === node && !parent.computed) return false
  if (parent.type === 'TSQualifiedName' && parent.right === node) return false
  if (parent.type.startsWith('Import') || parent.type.startsWith('Export')) return false
  if (parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' || parent.type === 'ContinueStatement') return false
  return true
}

const declaredNames = (program: AstNode): Set<string> => {
  const names = new Set<string>()
  const addPattern = (pattern: AstNode | null | undefined): void => {
    if (!pattern) return
    if (pattern.type === 'Identifier') names.add(pattern.name)
    else if (pattern.type === 'ObjectPattern') pattern.properties.forEach((p: AstNode) => addPattern(p.type === 'RestElement' ? p.argument : p.value))
    else if (pattern.type === 'ArrayPattern') pattern.elements.forEach(addPattern)
    else if (pattern.type === 'AssignmentPattern') addPattern(pattern.left)
    else if (pattern.type === 'RestElement') addPattern(pattern.argument)
    else if (pattern.type === 'TSParameterProperty') addPattern(pattern.parameter)
  }
  walkAst(program, (node) => {
    if (node.type === 'ImportSpecifier' || node.type === 'ImportDefaultSpecifier' || node.type === 'ImportNamespaceSpecifier') names.add(node.local.name)
    else if (node.type === 'VariableDeclarator') addPattern(node.id)
    else if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' || node.type === 'TSInterfaceDeclaration' || node.type === 'TSTypeAliasDeclaration' || node.type === 'TSEnumDeclaration') && node.id) names.add(node.id.name)
    else if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression' || node.type === 'ObjectMethod' || node.type === 'ClassMethod') node.params.forEach(addPattern)
    else if (node.type === 'CatchClause') addPattern(node.param)
  })
  return names
}

let files: string[]
let foreign: Set<string>

beforeAll(() => {
  files = tsFiles(SERVER)
  foreign = new Set([...Object.keys(h3), ...nitropackRuntime()])
})

describe('server code and the h3 / Nitro auto-imports', () => {
  it('knows the names it guards', () => {
    // A guard on the guard: an emptied list would pass every file.
    expect(foreign).toContain('defineEventHandler')
    expect(foreign).toContain('defineCachedEventHandler')
    expect(foreign).toContain('useRuntimeConfig')
    expect(files.length).toBeGreaterThan(200)
  })

  it('imports every h3 and Nitro helper it uses', () => {
    const implicit = files.flatMap((file) => {
      const program = parseScript(readSource(file))
      const declared = declaredNames(program)
      const used = new Map<string, number>()
      walkAst(program, (node, parents) => {
        if (node.type !== 'Identifier' || !foreign.has(node.name) || declared.has(node.name)) return
        if (!isReference(node, parents.at(-1))) return
        if (!used.has(node.name)) used.set(node.name, node.loc?.start.line ?? 0)
      })
      return [...used].map(([name, line]) => `${relativeLabel(REPO, file)}:${line} ${name}`)
    })

    expect(implicit).toEqual([])
  })
})
