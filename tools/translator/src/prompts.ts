import path from 'path'
import { validatePathAccess } from '~/tools/translator/src/file-ops'
import { FileExtensions, type LocaleOption } from '~/tools/translator/src/types'
import type { ConsolaInstance } from 'consola'

export async function promptForInputFile(consola: ConsolaInstance) {
  const inputFile = (await consola.prompt(
    'Enter the path to the input file: ',
    {
      type: 'text',
      placeholder: 'For example: ./locales/en-US.yml',
    },
  )) as unknown as string | symbol
  if (typeof inputFile === 'symbol') process.exit(0)

  const resolvedInputFile = path.resolve(process.cwd(), inputFile)
  await validatePathAccess(resolvedInputFile, 'input file')
  return resolvedInputFile
}

export async function promptForOutputExtension(consola: ConsolaInstance) {
  const outputExtension = (await consola.prompt('Choose output extension: ', {
    type: 'select',
    options: Object.values(FileExtensions),
  })) as unknown as FileExtensions | symbol
  if (typeof outputExtension === 'symbol') process.exit(0)
  return outputExtension
}

export async function promptForLocales(
  consola: ConsolaInstance,
  options: LocaleOption[],
) {
  const selectedLocales = (await consola.prompt('Select locales: ', {
    type: 'multiselect',
    options,
    required: true,
  })) as unknown as string[] | symbol
  if (typeof selectedLocales === 'symbol') process.exit(0)
  return selectedLocales
}
