import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export interface ErrorLogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info'
  message: string
  statusCode?: number
  url?: string
  method?: string
  userAgent?: string
  stack?: string
  sessionId?: string
  cartId?: string
  sessionKey?: string
}

export class Logger {
  private logDir = './logs'

  constructor() {
    this.ensureLogDir()
  }

  private async ensureLogDir() {
    try {
      await mkdir(this.logDir, { recursive: true })
    }
    catch (error) {
      console.error('Failed to create log directory:', error)
    }
  }

  async logError(entry: ErrorLogEntry) {
    console.error(`[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`)

    if (entry.stack) {
      console.error(entry.stack)
    }

    await this.writeToFile(entry)
  }

  private async writeToFile(entry: ErrorLogEntry) {
    try {
      const fileName = `error-${new Date().toISOString().split('T')[0]}.json`
      const filePath = join(this.logDir, fileName)
      const logLine = JSON.stringify(entry) + '\n'

      await writeFile(filePath, logLine, { flag: 'a' })
    }
    catch (error) {
      console.error('Failed to write error log to file:', error)
    }
  }
}
