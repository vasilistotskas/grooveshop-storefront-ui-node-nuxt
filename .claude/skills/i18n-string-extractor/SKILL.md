---
name: i18n-string-extractor
description: Find hardcoded user-facing strings (Greek or English) in Vue components and pages, propose i18n keys, and add translations to either component-scoped <i18n lang="yaml"> blocks or shared locale files under i18n/locales/. Use after adding/editing UI to enforce the project's "no hardcoded strings" rule. Locale el is the only active locale — do not generate en/de translations.
---

# i18n String Extractor

Audit a Vue file (component or page) for user-facing strings that bypass `useI18n()` and either translate them inline via a component-scoped `<i18n lang="yaml">` block or move them to one of the shared locale files. Greek (`el`) is the only active locale — do not write `en` or `de` entries.

## Decision tree: where does the key go?

| Trigger | Destination |
|---|---|
| String is unique to this component (button label, aria-label, single-screen heading) | Component-scoped `<i18n lang="yaml">` block in the same `.vue` file |
| String belongs to an existing domain bundle (auth, breadcrumb, checkout, cookies, validation) | Append to the matching `i18n/locales/<domain>/el-GR.json` |
| String is reused across 2+ files OR is a generic noun/verb (`save`, `cancel`, `confirm`, etc.) | Append to the root `i18n/locales/el-GR.json` |
| String is a server-side error / validation message | `i18n/locales/validation/el-GR.json` |
| String is a Django/parler model field (product name, blog title, category) | **Do not translate** — use `extractTranslated(obj, field, locale)` from `app/utils/translate.ts` |

## What counts as a hardcoded string

Flag these:
- `>Some text<` between Vue template tags
- `:label="'Foo'"` / `label="Foo"` / `placeholder="..."` / `:title="..."` / `aria-label="..."` / `alt="..."` with literal text
- `toast.add({ title: 'Success', ... })` and similar in `<script setup>`
- Error messages: `throw new Error('...')`, `setError('...')`
- Greek strings (e.g. `'Αναζήτηση'`) and English strings — both are violations

Do **not** flag:
- Icon names: `'i-heroicons-x-mark'` (these are CSS class identifiers)
- Color tokens: `'primary'`, `'neutral'`, `'success'`, `'warning'`, `'error'`, `'info'`
- Nuxt UI variants: `'solid'`, `'outline'`, `'soft'`, `'subtle'`, `'ghost'`, `'link'`
- Routing names from `RedirectToURLs`, `AuthenticatedRoutes`, `Flow2path` (constants)
- ISO codes (`'el-GR'`, `'EUR'`), date format strings, regex patterns
- `console.error` / `log.*` tag arguments (e.g. `log.info('cart', ...)`) — those tags are programmatic, not user-facing
- Test files, type files, schema definitions
- Strings inside `extractTranslated(...)` calls — the model-translation pathway

## Component-scoped block format

Single root `el:` key, no language code prefix in the file (the `<i18n lang="yaml">` block tag does that). Nest naturally for hierarchy. Use placeholders with curly braces for interpolation: `{appTitle}`, `{count}`.

Example matching the project style (`Account/Login/Form.vue`):

```vue
<i18n lang="yaml">
el:
  logo_alt: "Λογότυπο {appTitle}"
  social:
    title: Ή συνδέσου μέσω ενός τρίτου παρόχου
  email:
    label: Email
  password:
    label: Κωδικός πρόσβασης
  submit: Σύνδεση
  no:
    account: Δεν έχεις λογαριασμό;
</i18n>
```

Place the `<i18n>` block **after** `<style scoped>` (or after `<template>` if there's no style block). One block per file.

## Shared file format

Domain files (`auth/el-GR.json`, `breadcrumb/el-GR.json`, `cookies/el-GR.json`, `validation/el-GR.json`) wrap everything under a single root key matching the file's directory name:

```json
{
  "auth": {
    "login": {
      "success": "Συνδεθείτε με επιτυχία"
    }
  }
}
```

Reference in templates as `t('auth.login.success')`.

The `checkout/el-GR.json` file is **flat** (no `checkout` root key) — match its existing shape if appending.

The root `el-GR.json` is mostly flat with selective nesting (`error.default`, `error.page.not.found`). Match the surrounding style when appending.

## Workflow

1. **Read the target file**. If multiple files were edited recently, ask the user which one to scan.
2. **Grep for literal strings** in templates and script-setup blocks. Show the user a numbered list of all hits with line numbers and the proposed key for each.
3. **Group by destination** (component block vs. shared file). For each shared-file destination, show the exact JSON diff before writing.
4. **Confirm with the user** which strings to translate. Do not assume Greek translation quality — if the literal is in English, ask the user for the Greek translation rather than guessing.
5. **Apply the edits**:
   - Replace each literal in the template/script with `t('key')` (template uses `{{ t('key') }}` for text content, `:attr="t('key')"` for attribute bindings).
   - Confirm `useI18n` is imported in `<script setup>`: `const { t } = useI18n()`.
   - Add component block or append to shared JSON.
6. **Do not run** `pnpm dev` or any build — the user can verify visually.

## Gotchas

- Component-scoped i18n keys override shared keys with the same name within that component only — prefer scoped blocks for component-unique copy to keep shared files lean.
- Some files use `useI18n()` in a different shape: `const { t } = useI18n({ useScope: 'local' })` for strict component-scoped lookup. Inspect the existing file before adding the import.
- The `i18n/` directory is **outside** Nitro/Nuxt auto-import scope, so the `log` global is unavailable there. Don't suggest moving translation glue code into `i18n/`.
- Interpolation uses Vue I18n syntax with single curly braces (`{appTitle}`), not `${}` or `{{}}`. Don't translate the placeholder name itself.
- `t()` returns Greek strings at runtime in nuxt tests too — when updating tests, assert with `expect.any(String)` or the actual Greek text, not the key.
- After changes to shared locale files, the user may need a dev server restart for HMR to pick them up.

## What NOT to do

- Don't translate generated content from API responses — that's what `extractTranslated` is for.
- Don't add `en-US.json` or `de-DE.json` entries; only `el` is active per `i18n/locales.ts`.
- Don't move strings out of component scope just because they could be — components stay self-contained unless reused.
- Don't rename existing keys without grepping for every consumer first.
