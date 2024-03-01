import type { ISettingsParam } from 'tslog'

import type { Config } from './types'

type ValidatorFn<T> = (v: T) => boolean
type Validator<T> = { validator: ValidatorFn<T>; errorMsg: string }
type Rule<T> = {
	property: keyof T | string
	validators: Validator<any>[]
	optional?: boolean
}

const isRequired = <T>(v: T): v is NonNullable<T> => v !== undefined && v !== null

const isString = (v: any): v is string => typeof v === 'string'

const isBoolean = (v: any): v is boolean => typeof v === 'boolean'

const isObject = (v: any): v is object => v !== null && typeof v === 'object'

const isStringArray = (v: any): v is string[] =>
	Array.isArray(v) && v.every((item) => typeof item === 'string')

const isNonNegativeNumber = (v: any): v is number => typeof v === 'number' && v >= 0

const isOneOf =
	<T>(validValues: T[]) =>
	(v: any): v is T =>
		validValues.includes(v)

const isRegExpArray = (v: any): v is RegExp[] =>
	Array.isArray(v) && v.every((item) => item instanceof RegExp)

function createRule<T>(
	propertyPath: keyof T | string,
	validators: Validator<any>[],
	optional: boolean = false
): Rule<T> {
	return { property: propertyPath, validators, optional }
}

function matchesPattern(pattern: RegExp): ValidatorFn<string> {
	return (v: string) => pattern.test(v)
}

const getValue = <T>(obj: Partial<T>, propertyPath: string): any => {
	return propertyPath.split('.').reduce((acc: any, part: string) => {
		return acc && acc[part]
	}, obj as any)
}

const validateRules = <T>(obj: Partial<T>, rules: Rule<T>[]) => {
	rules.forEach(({ property, validators, optional }) => {
		const propertyPath = property.toString()
		const value = getValue(obj, propertyPath)

		if (optional && value === undefined) {
			return
		}

		if (propertyPath in obj || propertyPath.includes('.')) {
			validators.forEach(({ validator, errorMsg }) => {
				if (!validator(value)) {
					throw new Error(`Config validation error at '${propertyPath}': ${errorMsg}`)
				}
			})
		} else if (!optional) {
			throw new Error(`Required property missing: ${propertyPath}`)
		}
	})
}

const configValidationRules: Rule<Config<any>>[] = [
	createRule(
		'localePath',
		[
			{ validator: isRequired, errorMsg: `'localePath' is a required field.` },
			{ validator: isString, errorMsg: `'localePath' must be a string.` }
		],
		false
	),
	createRule(
		'sourceFileName',
		[
			{ validator: isRequired, errorMsg: `'sourceFileName' is a required field.` },
			{ validator: isString, errorMsg: `'sourceFileName' must be a string.` },
			{
				validator: matchesPattern(/^[a-z]{2}-[A-Z]{2}$/),
				errorMsg: `'sourceFileName' must be in the format of 'en-US'.`
			}
		],
		false
	),
	createRule(
		'translate',
		[{ validator: isObject, errorMsg: `'translate' must be an object.` }],
		true
	),
	createRule(
		'translate.engine',
		[
			{
				validator: isOneOf(['google', 'deepl', 'libre', 'yandex']),
				errorMsg: `'translate.engine' must be one of 'google', 'deepl', 'libre', 'yandex'.`
			}
		],
		true
	),
	createRule(
		'translate.bundleDelay',
		[
			{
				validator: isNonNegativeNumber,
				errorMsg: `'translate.bundleDelay' must be a non-negative number.`
			}
		],
		true
	),
	createRule(
		'translate.bundleMaxRetries',
		[
			{
				validator: isNonNegativeNumber,
				errorMsg: `'translate.bundleMaxRetries' must be a non-negative number.`
			}
		],
		true
	),
	createRule(
		'debug',
		[{ validator: isObject, errorMsg: `'debug' must be an object.` }],
		true
	),
	createRule(
		'debug.mode',
		[
			{
				validator: isOneOf(['progress-bar', 'logger', 'hidden']),
				errorMsg: `'debug.mode' must be one of 'progress-bar', 'logger', 'hidden'.`
			}
		],
		true
	)
]

const settingsParamValidationRules: Rule<ISettingsParam<any>>[] = [
	createRule(
		'type',
		[
			{
				validator: isOneOf(['json', 'pretty', 'hidden']),
				errorMsg: `'type' must be one of 'json', 'pretty', 'hidden'.`
			}
		],
		true
	),
	createRule(
		'name',
		[{ validator: isString, errorMsg: `'name' must be a string.` }],
		true
	),
	createRule(
		'parentNames',
		[
			{ validator: isStringArray, errorMsg: `'parentNames' must be an array of strings.` }
		],
		true
	),
	createRule(
		'minLevel',
		[
			{
				validator: isNonNegativeNumber,
				errorMsg: `'minLevel' must be a non-negative number.`
			}
		],
		true
	),
	createRule(
		'argumentsArrayName',
		[{ validator: isString, errorMsg: `'argumentsArrayName' must be a string.` }],
		true
	),
	createRule(
		'hideLogPositionForProduction',
		[
			{
				validator: isBoolean,
				errorMsg: `'hideLogPositionForProduction' must be a boolean.`
			}
		],
		true
	),
	createRule(
		'prettyLogTemplate',
		[{ validator: isString, errorMsg: `'prettyLogTemplate' must be a string.` }],
		true
	),
	createRule(
		'prettyErrorTemplate',
		[{ validator: isString, errorMsg: `'prettyErrorTemplate' must be a string.` }],
		true
	),
	createRule(
		'prettyErrorStackTemplate',
		[{ validator: isString, errorMsg: `'prettyErrorStackTemplate' must be a string.` }],
		true
	),
	createRule(
		'prettyErrorParentNamesSeparator',
		[
			{
				validator: isString,
				errorMsg: `'prettyErrorParentNamesSeparator' must be a string.`
			}
		],
		true
	),
	createRule(
		'prettyErrorLoggerNameDelimiter',
		[
			{
				validator: isString,
				errorMsg: `'prettyErrorLoggerNameDelimiter' must be a string.`
			}
		],
		true
	),
	createRule(
		'stylePrettyLogs',
		[{ validator: isBoolean, errorMsg: `'stylePrettyLogs' must be a boolean.` }],
		true
	),
	createRule(
		'prettyLogTimeZone',
		[
			{
				validator: isOneOf(['UTC', 'local']),
				errorMsg: `'prettyLogTimeZone' must be one of 'UTC', 'local'.`
			}
		],
		true
	),
	createRule(
		'prettyLogStyles',
		[{ validator: isObject, errorMsg: `'prettyLogStyles' must be an object.` }],
		true
	),
	createRule(
		'prettyInspectOptions',
		[{ validator: isObject, errorMsg: `'prettyInspectOptions' must be an object.` }],
		true
	),
	createRule(
		'metaProperty',
		[{ validator: isString, errorMsg: `'metaProperty' must be a string.` }],
		true
	),
	createRule(
		'maskPlaceholder',
		[{ validator: isString, errorMsg: `'maskPlaceholder' must be a string.` }],
		true
	),
	createRule(
		'maskValuesOfKeys',
		[
			{
				validator: isStringArray,
				errorMsg: `'maskValuesOfKeys' must be an array of strings.`
			}
		],
		true
	),
	createRule(
		'maskValuesOfKeysCaseInsensitive',
		[
			{
				validator: isBoolean,
				errorMsg: `'maskValuesOfKeysCaseInsensitive' must be a boolean.`
			}
		],
		true
	),
	createRule(
		'maskValuesRegEx',
		[
			{
				validator: isRegExpArray,
				errorMsg: `'maskValuesRegEx' must be an array of RegExp.`
			}
		],
		true
	),
	createRule(
		'prefix',
		[{ validator: isObject, errorMsg: `'prefix' must be an object.` }],
		true
	),
	createRule(
		'attachedTransports',
		[{ validator: isObject, errorMsg: `'attachedTransports' must be an object.` }],
		true
	),
	createRule(
		'overwrite',
		[{ validator: isObject, errorMsg: `'overwrite' must be an object.` }],
		true
	)
]

const validateConfig = <LogObj>(config: Partial<Config<LogObj>>): void => {
	validateRules(config, configValidationRules)
	if (config.logger) {
		validateISettingsParam(config.logger)
	}
}

const validateISettingsParam = <LogObj>(
	settings: Partial<ISettingsParam<LogObj>>
): void => {
	validateRules(settings, settingsParamValidationRules)
}

export {
	configValidationRules,
	createRule,
	getValue,
	isBoolean,
	isNonNegativeNumber,
	isObject,
	isOneOf,
	isRegExpArray,
	isRequired,
	isString,
	isStringArray,
	matchesPattern,
	settingsParamValidationRules,
	validateConfig,
	validateISettingsParam,
	validateRules
}
