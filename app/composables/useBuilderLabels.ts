import { createI18n } from 'vue-i18n'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'
import el from '~/builder/labels/el.json'
import en from '~/builder/labels/en.json'

type BuilderLabelMessages = typeof el

/**
 * The editor's names for the block catalogue: what each block, section
 * group and page type is called, in Greek and English
 * (`app/builder/labels/<locale>.json`).
 *
 * Its own composer, apart from the app's: these texts exist only in the
 * editor, so they stay out of the global locale files (every page would
 * carry them, and the store's text editor would offer them), and only the
 * editor's chunk imports this file. Every key is checked for both
 * languages by `test/unit/app/builder/labels.spec.ts`.
 */
let composer: ReturnType<typeof createComposer> | undefined

function createComposer() {
  return createI18n<[BuilderLabelMessages], SupportedLocale, false>({
    legacy: false,
    locale: DEFAULT_LOCALE,
    fallbackLocale: DEFAULT_LOCALE,
    messages: { el, en },
  }).global
}

/**
 * The text a preset starts with, by setting path (`presets.<type>.<preset>`),
 * in the language a draft is written in: the store's content, not the
 * editor's interface, so it never follows the editor's language.
 */
export function builderPresetText(type: string, preset: string): Readonly<Record<string, string>> | undefined {
  const presets: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>> = { el, en }[DEFAULT_LOCALE].presets
  return presets[type]?.[preset]
}

/**
 * Labels in the editor's language (the route's locale, not the language
 * being edited). Each function reads the locale when it runs, so a template
 * that calls it re-renders on a language switch.
 */
export function useBuilderLabels() {
  const { locale } = useI18n({ useScope: 'global' })
  const labels = (composer ??= createComposer())
  const read = (key: string) => labels.t(key, {}, { locale: locale.value })

  return {
    /**
     * What a block type is called. A type this build does not define (a
     * document written by another build) is shown by its type name, which
     * is what the merchant would have to report.
     */
    blockLabel: (type: string) => labels.te(`blocks.${type}.label`, DEFAULT_LOCALE) ? read(`blocks.${type}.label`) : type,
    groupLabel: (group: BuilderEditorGroup) => read(`groups.${group}`),
    /** What a page type of the storefront's static routes is called (`template:<name>`; Django holds no other). */
    templateLabel: (name: StaticLayoutPageType) => read(`templates.${name}`),
    /** What a tab of the add-section library is called. */
    categoryLabel: (category: (typeof BUILDER_BLOCK_CATEGORIES)[number]) => read(`categories.${category}`),
    /** What a store feature a block needs is called, as it reads after "needs". */
    featureLabel: (feature: StoreFeatureName) => read(`features.${feature}`),
    /** What a page document is called: a page type by its name, a page the store made by its address. */
    documentLabel: (key: string): string => {
      const { kind, name = key } = parseBuilderDocumentKey(key)
      return kind === 'template' && isStaticLayoutPageType(name) ? read(`templates.${name}`) : pagePath(name)
    },
    /** What a setting is called, by its path (`prompt.title`): one name per setting, whichever block has it. */
    settingLabel: (path: string) => read(`settings.${path}.label`),
    /** The setting's help line, for the settings that have one. */
    settingHelp: (path: string): string | undefined => labels.te(`settings.${path}.help`, DEFAULT_LOCALE) ? read(`settings.${path}.help`) : undefined,
    /** What a choice of a setting is called, by the setting's own name (the last part of its path). */
    optionLabel: (path: string, value: string) => read(`options.${path.split('.').at(-1)}.${value}`),
    /** What a fixed route a link may name is called (`/`, `/products`, `/account/login`). */
    routeLabel: (route: string) => read(`routes.${builderRouteLabelKey(route)}`),
  }
}
