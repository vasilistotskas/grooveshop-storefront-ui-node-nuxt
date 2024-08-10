import path from 'path'
import { pathToFileURL } from 'url'
import vm, { type Context } from 'vm'
import { access, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import ts from 'typescript'
import yaml from 'js-yaml'
import { FileExtensions, type LocaleFile, type LocaleOption } from '~~/tools/translator/src/types'

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

async function safelyRenameFile(originalPath: string, newPath: string) {
  try {
    await rename(originalPath, newPath)
  }
  catch (error) {
    console.error(
      `Error renaming file from ${originalPath} to ${newPath}: ${error}`,
    )
    throw error
  }
}

export async function readFileContents(
  filePath: string,
  extension: FileExtensions,
): Promise<Record<string, any>> {
  let fileURL
  const fileContents = await readFile(filePath, 'utf8')

  switch (extension) {
    case FileExtensions.JSON:
      return JSON.parse(fileContents)
    case FileExtensions.YML:
    case FileExtensions.YAML:
      return yaml.load(fileContents) as Record<string, any>
    case FileExtensions.TS:
    case FileExtensions.MTS:
      return executeTs(fileContents)
    case FileExtensions.CJS:
      fileURL = pathToFileURL(filePath).href
      return (await import(fileURL)).default
    case FileExtensions.JS:
      await safelyRenameFile(filePath, filePath.replace(/\.js$/, '.cjs'))
      try {
        const module = await import(
          pathToFileURL(filePath.replace(/\.js$/, '.cjs')).href
        )
        return module.default
      }
      finally {
        await safelyRenameFile(filePath.replace(/\.js$/, '.cjs'), filePath)
      }
    default:
      console.error(`Unsupported file extension: ${extension}`)
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
    case FileExtensions.MTS:
      fileContents = `export default ${JSON.stringify(data, null, 2)};`
      break
    case FileExtensions.JS:
    case FileExtensions.CJS:
      fileContents = `module.exports = ${JSON.stringify(data, null, 2)};`
      break
    default:
      console.error(`Unsupported file extension: ${extension}`)
      throw new Error(`Unsupported file extension: ${extension}`)
  }

  try {
    await access(filePath)
    console.info(`File exists, updating: ${filePath}`)
  }
  catch {
    console.info(`File does not exist, creating: ${filePath}`)
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
          console.warn(`Unsupported file extension: ${fileExtension}`)
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
      }
      else if (status.isDirectory()) {
        const subFiles = await getFilesFromDir(filePath)
        files.push(...subFiles)
      }
    }
  }
  catch (error) {
    console.warn(`Error reading directory at ${dir}: ${error}`)
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
    }
    catch {
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
  }
  catch (error) {
    throw new Error(`Failed to access the ${fileType}: ${filePath} - ${error}`)
  }
}

export function generateLocalePaths(
  localeDirPath: string,
  inputFileExtension: FileExtensions,
  availableLocales: LocaleOption[],
): LocaleFile[] {
  const filteredLocales = availableLocales.filter(l => l.label !== 'All')

  return filteredLocales.map((l) => {
    const [lang, country] = l.value.split('-')
    if (!lang || !country) {
      throw new Error(
        `Invalid locale code: ${l.value}, expected format: lang-countryCode`,
      )
    }
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
