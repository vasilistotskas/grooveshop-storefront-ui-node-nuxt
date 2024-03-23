import { loadConfig, setupDotenv } from 'c12'
import type { DebugMode, TranslateEngine } from '~/tools/translator/src/types'
import type { ConsolaOptions } from 'consola'
import consola from '~/tools/translator/src/consola'

export type LocaleOption = {
  label: string
  value: `${string}-${string}`
}

export interface TranslatorConfig {
  input: string
  translate?: {
    engine?: TranslateEngine
    delay?: number
    maxRetries?: number
  }
  debug?: {
    mode: DebugMode
  }
  consola?: Partial<ConsolaOptions>
  locales: {
    available: LocaleOption[]
    default: string
  }
}

const getDefaultConfig = () =>
  <TranslatorConfig>{
    input: './locales/en-US.yml',
    translate: {
      engine: 'google',
      delay: 500,
      maxRetries: 3,
    },
    debug: {
      mode: 'consola',
    },
    locales: {
      available: [
        { label: 'Greek', value: 'el-GR' },
        { label: 'German', value: 'de-DE' },
        { label: 'English', value: 'en-US' },
      ],
      default: 'all',
    },
  }

export async function loadTranslatorConfig(cwd: string = process.cwd()) {
  await setupDotenv({ cwd })
  const defaults = getDefaultConfig()
  const { config } = await loadConfig<TranslatorConfig>({
    cwd,
    name: 'translator',
    packageJson: true,
    defaults,
  })

  if (!config) {
    const error = new Error('Failed to load translator config')
    consola.error(error)
    throw error
  }

  return config
}
