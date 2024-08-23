#!/usr/bin/env node
import { existsSync } from 'fs'
import { defineCommand, runMain } from 'citty'
import { type ConsolaInstance, createConsola } from 'consola'
import { mainCLI } from '~~/tools/translator/src/main-cli'
import { loadTranslatorConfig, type TranslatorConfig } from '~~/tools/translator/src/config'
import { main as mainArgs } from '~~/tools/translator/src/main'
import { FileExtensions } from '~~/tools/translator/src/types'
import pkg from '~~/package.json'

const validateInputFile = (filePath?: string) => {
  if (filePath && !existsSync(filePath)) {
    throw new Error(`Input file "${filePath}" does not exist.`)
  }
}

const validateConfigPath = (configPath?: string) => {
  if (configPath && !existsSync(configPath)) {
    throw new Error(`Config file "${configPath}" does not exist.`)
  }
}

const validateSelectedLocales = (locales?: string) => {
  if (locales) {
    const selectedLocales = locales.split(',')
    const invalidLocales = selectedLocales.filter(
      locale => !/^[a-z]{2}-[A-Z]{2}$/.test(locale),
    )
    if (invalidLocales.length) {
      throw new Error(
        `Invalid locale(s) detected: ${invalidLocales.join(', ')}. Please provide valid locales in the format "xx-XX".`,
      )
    }
  }
}

const validateOutputExtension = (extension?: FileExtensions) => {
  if (extension && !Object.values(FileExtensions).includes(extension)) {
    throw new Error(
      `Invalid output extension "${extension}". Please provide a valid output extension.`,
    )
  }
}

const validateArgs = (args: any) => {
  validateInputFile(args.inputFilePath)
  validateConfigPath(args.configPath)
  validateSelectedLocales(args.selectedLocales)
  validateOutputExtension(args.outputExtension)
}

const main = defineCommand({
  meta: {
    name: pkg.name,
    description: 'Translate locale files',
    version: pkg.version,
  },
  args: {
    configPath: {
      type: 'string',
      description: 'Path to the config file',
      required: false,
      default: process.cwd(),
    },
    inputFilePath: {
      type: 'string',
      description: 'Path to the input file',
      required: false,
    },
    selectedLocales: {
      type: 'string',
      description: 'Selected locales',
      required: false,
    },
    outputExtension: {
      type: 'string',
      description: 'Output extension',
      required: false,
    },
  },
  async run({ args }) {
    let _config: TranslatorConfig
    let _consola: ConsolaInstance

    try {
      validateArgs(args)

      _config = await loadTranslatorConfig(args.configPath)
      _consola = createConsola({
        ..._config.consola,
        level: _config.debug?.mode === 'silent' ? 0 : 3,
      })

      if (args.inputFilePath && args.selectedLocales && args.outputExtension) {
        const selectedLocales = args.selectedLocales.split(',')
        const outputExtension = args.outputExtension as FileExtensions
        await mainArgs(
          _config,
          _consola,
          args.inputFilePath,
          selectedLocales,
          outputExtension,
        )
      }
      else {
        await mainCLI(_config, _consola)
      }

      _consola.success('Translation process completed.')
    }
    catch (error) {
      console.error(error)
      process.exit(1)
    }
  },
})

runMain(main)
  .then(() => console.info('Translation process completed.'))
  .catch(() => process.exit(1))
  .finally(() => process.exit(0))
