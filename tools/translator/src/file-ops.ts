import path from 'path'

import consola from '~/tools/translator/src/consola'
import { FileExtensions, type LocaleFile } from '~/tools/translator/src/types'
import yaml from 'js-yaml'
import ts from 'typescript'
import vm from 'vm'
import { type Context } from 'vm'
import { writeFile, readFile, readdir, stat, access } from 'node:fs/promises'

async function executeTs(tsCode: string): Promise<Record<string, any>> {
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText

  const sandbox = { exports: {} }
  const script = new vm.Script(jsCode)
  const context: Context = new (vm.createContext as any)(sandbox)
  script.runInContext(context)

  return sandbox.exports
}

export async function readFileContents(
  filePath: string,
  extension: FileExtensions,
): Promise<Record<string, any>> {
  const fileContents = await readFile(filePath, 'utf8')
  switch (extension) {
    case FileExtensions.JSON:
      return JSON.parse(fileContents)
    case FileExtensions.YML:
    case FileExtensions.YAML:
      return yaml.load(fileContents) as Record<string, any>
    case FileExtensions.TS:
      return executeTs(fileContents)
    default:
      consola.error(new Error(`Unsupported file extension: ${extension}`))
      throw new Error(`Unsupported file extension: ${extension}`)
  }
}

export async function writeFileContents(
  filePath: string,
  data: Record<string, any>,
  extension: FileExtensions,
): Promise<void> {
  let fileContents: string
  switch (extension) {
    case FileExtensions.JSON:
      fileContents = JSON.stringify(data, null, 2)
      break
    case FileExtensions.YML:
    case FileExtensions.YAML:
      fileContents = yaml.dump(data)
      break
    case FileExtensions.TS:
      fileContents = `export default ${JSON.stringify(data, null, 2)};`
      break
    default:
      consola.error(new Error(`Unsupported file extension: ${extension}`))
      throw new Error(`Unsupported file extension: ${extension}`)
  }

  try {
    await access(filePath)
    consola.info(`File exists, updating: ${filePath}`)
  } catch (error) {
    consola.info(`File does not exist, creating: ${filePath}`)
  }

  await writeFile(filePath, fileContents)
}

export const getFilesFromDir = async (dir: string): Promise<LocaleFile[]> => {
  const files: LocaleFile[] = []
  try {
    const fileList = await readdir(dir)
    for (const file of fileList) {
      const filePath = path.join(dir, file)
      const status = await stat(filePath)
      if (status.isFile()) {
        const fileExtension = path.extname(file).toLowerCase()

        if (
          !Object.values(FileExtensions).includes(
            fileExtension.substring(1) as FileExtensions,
          )
        ) {
          consola.warn(`Unsupported file extension: ${fileExtension}`)
          continue
        }
        if (
          Object.values(FileExtensions).includes(
            fileExtension.substring(1) as FileExtensions,
          )
        ) {
          const langCode = file.replace(fileExtension, '')
          files.push({
            path: filePath,
            langCode,
            dir,
          })
        }
      } else if (status.isDirectory()) {
        const subFiles = await getFilesFromDir(filePath)
        files.push(...subFiles)
      }
    }
  } catch (error) {
    consola.warn(`Error reading directory at ${dir}: ${error}`)
    return []
  }
  return files
}

export async function findFileExtension(
  basePath: string,
  fileName: string,
  extensions: FileExtensions[],
): Promise<FileExtensions | undefined> {
  for (const ext of extensions) {
    try {
      await access(`${basePath}/${fileName}.${ext}`)
      return ext
    } catch {
      // ignore
    }
  }
}

export function getFileExtension(
  input: string,
  extensions: FileExtensions[],
): FileExtensions | undefined {
  const parts = input.split('.')
  const extension = parts[parts.length - 1] as FileExtensions

  if (extensions.includes(extension)) {
    return extension
  }
  return undefined
}

export async function validatePathAccess(filePath: string, fileType = 'file') {
  try {
    await access(filePath)
  } catch (error) {
    throw new Error(`Failed to access the ${fileType}: ${filePath} - ${error}`)
  }
}

export function generateLocalePaths(
  localeDirPath: string,
  inputFileExtension: FileExtensions,
): LocaleFile[] {
  const localeFiles = [
    { label: 'Greek', value: 'el-GR' },
    { label: 'German', value: 'de-DE' },
    { label: 'English', value: 'en-US' },
  ]

  return localeFiles.map((l) => {
    const [lang, country] = l.value.split('-')
    const modifiedLocaleCode = `${lang}-${country.toUpperCase()}`
    return {
      path: path.join(
        localeDirPath,
        `${modifiedLocaleCode}.${inputFileExtension}`,
      ),
      langCode: l.value,
      dir: localeDirPath,
    }
  })
}
