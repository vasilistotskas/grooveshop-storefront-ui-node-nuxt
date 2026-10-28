/** What is missing from and what is extra in `actual` against the `expected` shape. */
function describeDifference(expected: MessageShape, actual: MessageShape): string {
  const missing = expected.params.filter(param => !actual.params.includes(param))
  const unexpected = actual.params.filter(param => !expected.params.includes(param))
  const parts = [
    missing.length > 0 && `missing ${missing.join(', ')}`,
    unexpected.length > 0 && `unexpected ${unexpected.join(', ')}`,
    expected.pluralCases !== actual.pluralCases && `${actual.pluralCases} plural case(s), expected ${expected.pluralCases}`,
  ]
  return parts.filter(Boolean).join('; ')
}

/**
 * Whether a store may use `input.value` for a text of the catalogue.
 *
 * The default of the same locale is the reference; a locale without one is
 * held to every other locale's default, which must therefore agree.
 * With a `schema` the key must also belong to a component that store
 * renders (`findTextEntry`). No side effects: Django asks before it stores anything.
 */
export function validateText(input: TextValidateBody): TextValidation {
  const entry = findTextEntry(input.namespace, input.key, input.schema)
  if (!entry) {
    return { ok: false, code: 'unknown_key', detail: `The build has no text "${input.key}" in "${input.namespace}"${input.schema === undefined ? '' : ` that the store "${input.schema}" renders`}.` }
  }
  if (entry.locked) {
    return { ok: false, code: 'locked_key', detail: `"${input.key}" in "${input.namespace}" is locked: only the platform changes it.` }
  }

  const { errors, shape } = analyzeMessage(input.value)
  if (errors.length > 0) {
    return { ok: false, code: 'syntax_error', detail: errors[0]! }
  }

  const own = entry.placeholders[input.locale]
  const references = own ? [own] : Object.values(entry.placeholders).filter(reference => reference !== undefined)
  const mismatch = references.find(reference => !sameShape(reference, shape))
  if (mismatch) {
    return { ok: false, code: 'placeholder_mismatch', detail: describeDifference(mismatch, shape) }
  }
  return { ok: true }
}
