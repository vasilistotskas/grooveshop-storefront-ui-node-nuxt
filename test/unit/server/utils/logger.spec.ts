import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger } from '../../../../server/utils/logger'
import type { ErrorLogEntry } from '../../../../server/utils/logger'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}))

describe('Server Utils - Logger', () => {
  let logger: Logger
  let consoleErrorSpy: any
  let consoleLogSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger = new Logger()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleLogSpy.mockRestore()
  })

  describe('logError', () => {
    it('should log error to console', async () => {
      const entry: ErrorLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        level: 'error',
        message: 'Test error',
      }

      await logger.logError(entry)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error'),
      )
    })

    it('should log error with stack trace', async () => {
      const entry: ErrorLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        level: 'error',
        message: 'Test error',
        stack: 'Error: Test error\n    at test.ts:1:1',
      }

      await logger.logError(entry)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error'),
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(entry.stack)
    })

    it('should log warning level', async () => {
      const entry: ErrorLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        level: 'warn',
        message: 'Test warning',
      }

      await logger.logError(entry)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warning'),
      )
    })

    it('should log info level', async () => {
      const entry: ErrorLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        level: 'info',
        message: 'Test info',
      }

      await logger.logError(entry)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info'),
      )
    })

    it('should include optional fields in log entry', async () => {
      const entry: ErrorLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        level: 'error',
        message: 'Test error',
        statusCode: 500,
        url: '/api/test',
        method: 'GET',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
        cartId: 'cart-456',
        sessionKey: 'key-789',
      }

      await logger.logError(entry)

      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('ErrorLogEntry interface', () => {
    it('should accept all valid log levels', () => {
      const errorEntry: ErrorLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        level: 'error',
        message: 'Error',
      }

      const warnEntry: ErrorLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        level: 'warn',
        message: 'Warning',
      }

      const infoEntry: ErrorLogEntry = {
        timestamp: '2024-01-01T00:00:00.000Z',
        level: 'info',
        message: 'Info',
      }

      expect(errorEntry.level).toBe('error')
      expect(warnEntry.level).toBe('warn')
      expect(infoEntry.level).toBe('info')
    })
  })
})
