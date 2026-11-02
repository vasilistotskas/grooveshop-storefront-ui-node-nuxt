import * as z from 'zod'

/**
 * A block's settings as the catalogue states them, in JSON Schema: what
 * Django validates every save against, and what the editor draws its
 * settings forms from, so the two read one description.
 *
 * The schema is the INPUT type (`io: 'input'`): what the editor saves and
 * Django validates is the raw settings, in which a field with a default
 * may be absent (the output type would require it). The input conversion
 * leaves objects open, and a closed contract is the point (an unknown
 * key is refused on save), so every object schema is closed here.
 */
export function blockSettingsJsonSchema(schema: z.ZodObject): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'input',
    override: ({ jsonSchema }) => {
      if (jsonSchema.type === 'object' && jsonSchema.additionalProperties === undefined) {
        jsonSchema.additionalProperties = false
      }
    },
  })
}
