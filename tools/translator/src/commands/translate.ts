#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import pkg from '../../../../package.json'
import consola from '../consola'
import { main as translateFiles } from '../app'

const main = defineCommand({
  meta: {
    name: pkg.name,
    description: 'Translate locale files',
    version: pkg.version,
  },
  async run() {
    await translateFiles()
    consola.success('Translation process completed.')
  },
})

await runMain(main)
