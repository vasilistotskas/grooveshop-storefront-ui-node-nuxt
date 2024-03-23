import type { TranslatorConfig } from '~/tools/translator/src/config'
import consola from '~/tools/translator/src/consola'
import path from 'path'
import { validatePathAccess } from '~/tools/translator/src/file-ops'
import { FileExtensions } from '~/tools/translator/src/types'

export async function promptForInputFile(config: TranslatorConfig) {
  const inputFile = (await consola.prompt(
    'Enter the path to the input file: ',
    {
      type: 'text',
      default: config.input,
      placeholder: 'For example: ./locales/en-US.yml',
    },
  )) as unknown as string | symbol
  if (typeof inputFile === 'symbol') process.exit(0)

  const resolvedInputFile = path.resolve(process.cwd(), inputFile)
  await validatePathAccess(resolvedInputFile, 'input file')
  return resolvedInputFile
}

export async function promptForOutputExtension() {
  const outputExtension = (await consola.prompt('Choose output extension: ', {
    type: 'select',
    options: Object.values(FileExtensions),
  })) as unknown as FileExtensions | symbol
  if (typeof outputExtension === 'symbol') process.exit(0)
  return outputExtension
}

export async function promptForLocales() {
  const selectedLocales = (await consola.prompt('Select locales: ', {
    type: 'multiselect',
    options: [
      { label: 'Greek', value: 'el-GR' },
      { label: 'German', value: 'de-DE' },
      { label: 'English', value: 'en-US' },
      { label: 'All', value: 'all' },
    ],
    required: true,
  })) as unknown as string[] | symbol
  if (typeof selectedLocales === 'symbol') process.exit(0)
  return selectedLocales
}
