import { createConsola } from 'consola'
import { loadTranslatorConfig } from '~/tools/translator/src/config'

const config = await loadTranslatorConfig()
const consola = createConsola(config?.consola)
export default consola
