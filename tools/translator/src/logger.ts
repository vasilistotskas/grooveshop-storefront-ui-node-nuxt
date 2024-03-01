import { Logger, type ILogObj } from 'tslog'

import { loadConfig } from './config'
import { loggerName } from './constants'

const config = await loadConfig()

const useLogger = (): Logger<ILogObj> => {
	return new Logger({
		name: loggerName,
		type: config?.debug?.mode === 'logger' ? 'pretty' : 'hidden',
		minLevel: config?.logger?.minLevel,
		prettyLogTemplate:
			'{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t'
	})
}

export default useLogger
