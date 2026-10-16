import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { APP, appLabel, parseScript, readSource, walkAst } from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

/**
 * An async composable reads its Pinia stores before its first `await`.
 *
 * On the server, Nuxt's async context keeps `useNuxtApp()` working after
 * an `await`, but Pinia finds its instance through Vue's injection
 * context, which an `await` inside a composable loses. It then falls
 * back to the active Pinia, which belongs to whichever request set it
 * last, or to none. `useBlogPostPage` called `useHtmlContent()` (a
 * tenant-store read) after two awaits, and blog posts answered 500
 * ("Cannot read properties of undefined (reading '_s')") 286 times in
 * three days on demo and ekfyseosfyteias (2026-10-16).
 *
 * `<script setup>` is not covered: Vue's compiler restores the instance
 * after each top-level await there. Calls inside a nested function
 * (a computed, a callback) run later and are not covered either.
 */

/** Calls that read a store while running. */
const STORE_READER = /^use\w*Store$|^storeToRefs$|^useHtmlContent$/

const FUNCTION = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod'])

function composableFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return composableFiles(path)
    return entry.name.endsWith('.ts') ? [path] : []
  })
}

/** Every exported async function of a module, with its body. */
function asyncExports(program: AstNode): AstNode[] {
  return program.body.flatMap((statement: AstNode) => {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : null
    if (!declaration) return []
    if (declaration.type === 'FunctionDeclaration') return declaration.async ? [declaration] : []
    if (declaration.type === 'VariableDeclaration') {
      return declaration.declarations
        .map((declarator: AstNode) => declarator.init)
        .filter((init: AstNode | null) => init && FUNCTION.has(init.type) && init.async)
    }
    return []
  })
}

/** Nodes of `statement` that run when it runs, not in a nested function. */
function ownNodes(statement: AstNode, visit: (node: AstNode) => void) {
  walkAst(statement, (node, parents) => {
    if (parents.some(parent => FUNCTION.has(parent.type))) return
    visit(node)
  })
}

function storeReadsAfterAwait(file: string): string[] {
  const out: string[] = []
  for (const fn of asyncExports(parseScript(readSource(file)))) {
    if (fn.body.type !== 'BlockStatement') continue
    let awaited = false
    for (const statement of fn.body.body as AstNode[]) {
      if (awaited) {
        ownNodes(statement, (node) => {
          if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && STORE_READER.test(node.callee.name)) {
            out.push(`${appLabel(file)}:${node.loc?.start.line}: ${node.callee.name}()`)
          }
        })
      }
      ownNodes(statement, (node) => {
        if (node.type === 'AwaitExpression') awaited = true
      })
    }
  }
  return out
}

describe('async composables read their stores before the first await', () => {
  const files = composableFiles(join(APP, 'composables'))

  it('scans the composables', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('has no store read after an await', () => {
    expect(files.flatMap(storeReadsAfterAwait)).toEqual([])
  })
})
