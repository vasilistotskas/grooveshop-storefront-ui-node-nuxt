/* eslint-disable no-console */
import { loadConfig, setupDotenv } from 'c12'
import type { debugMode, translateEngine } from '~/tools/translator/src/types'

export interface TranslatorConfig {
  localePath: string
  sourceFileName: string
  translate?: {
    engine?: translateEngine
    bundleDelay?: number
    bundleMaxRetries?: number
  }
  debug?: {
    mode: debugMode
  }
}

const getDefaultConfig = () =>
  <TranslatorConfig>{
    localePath: './locales',
    sourceFileName: 'en-US',
    translate: {
      engine: 'google',
      bundleDelay: 500,
      bundleMaxRetries: 3,
    },
    debug: {
      mode: 'consola',
    },
  }

export async function loadTranslatorConfig(
  cwd: string = process.cwd(),
): Promise<TranslatorConfig> {
  await setupDotenv({ cwd })
  const defaults = getDefaultConfig()
  const { config } = await loadConfig<TranslatorConfig>({
    cwd,
    name: 'translator',
    packageJson: true,
    defaults,
  })

  return config as TranslatorConfig
}
