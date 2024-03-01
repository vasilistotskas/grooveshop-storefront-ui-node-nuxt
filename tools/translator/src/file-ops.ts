import { promises as fsPromises } from 'fs'
import path from 'path'

import useLogger from './logger'
import type { LocaleFile } from './types'

const logger = useLogger()

const getFiles = async (dir: string): Promise<LocaleFile[]> => {
	const files: LocaleFile[] = []
	try {
		const fileList = await fsPromises.readdir(dir)
		for (const file of fileList) {
			const filePath = path.join(dir, file)
			const stat = await fsPromises.stat(filePath)
			if (stat.isFile() && file.endsWith('.yml')) {
				files.push({
					path: filePath,
					lang: file.replace('.yml', ''),
					dir
				})
			} else if (stat.isDirectory()) {
				const subFiles = await getFiles(filePath)
				files.push(...subFiles)
			}
		}
	} catch (e) {
		const error = new Error(`Error reading directory at ${dir}: ${e}`)
		logger.fatal(error)
		throw error
	}
	return files
}

export { getFiles }
