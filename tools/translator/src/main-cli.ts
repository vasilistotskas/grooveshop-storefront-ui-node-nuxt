import type { ConsolaInstance } from 'consola'
import {
  promptForInputFile,
  promptForLocales,
  promptForOutputExtension,
} from '~/tools/translator/src/prompts'
import { main } from '~/tools/translator/src/main'
import type { TranslatorConfig } from '~/tools/translator/src/config'

export async function mainCLI(
  config: TranslatorConfig,
  consola: ConsolaInstance,
) {
  try {
    const inputFile = await promptForInputFile(consola)
    const availableLocaleOptions = config.locales.available
    availableLocaleOptions.push({ label: 'All', value: 'all' })

    const selectedLocales = await promptForLocales(
      consola,
      availableLocaleOptions,
    )
    const outputExtension = await promptForOutputExtension(consola)

    await main(config, consola, inputFile, selectedLocales, outputExtension)
  }
  catch (error) {
    consola.error(error)
    process.exit(1)
  }
}
