import * as z from 'zod'

type Schema = z.core.$ZodType

const strictCache = new WeakMap<Schema, Schema>()
const inProgress = new WeakSet<Schema>()

/**
 * `schema` with every object in it — however deeply nested — made
 * strict, so an unknown key anywhere in a fixture fails the parse.
 *
 * `schema.strict()` alone only closes the TOP-level object: a stale key
 * inside `product.category` or `translations.el` passes it silently.
 * This walks the wrappers the generated and hand-written schemas use
 * (object, array, optional, nullable, default, readonly, union, record,
 * pipe, lazy) and rebuilds each with Zod 4's `clone(def)`, so checks and
 * refinements survive. Intersections are left as they are: making each
 * side strict would reject the other side's keys.
 */
export function deepStrict<T extends Schema>(schema: T): T {
  return strictOf(schema) as T
}

function strictOf(schema: Schema): Schema {
  const cached = strictCache.get(schema)
  if (cached) return cached
  // A schema that reaches itself (a getter-defined tree) resolves to its
  // own strict version once that is built.
  if (inProgress.has(schema)) return z.lazy(() => strictCache.get(schema) ?? schema)

  inProgress.add(schema)
  const strict = rebuild(schema)
  inProgress.delete(schema)
  strictCache.set(schema, strict)
  return strict
}

function rebuild(schema: Schema): Schema {
  if (schema instanceof z.ZodObject) {
    const shape = Object.fromEntries(
      Object.entries(schema.shape).map(([key, value]) => [key, strictOf(value)]),
    )
    return schema.safeExtend(shape).strict()
  }
  if (schema instanceof z.ZodArray)
    return schema.clone({ ...schema._zod.def, element: strictOf(schema.element) })
  // One branch per wrapper: a union of them narrows `clone`'s parameter to `never`.
  if (schema instanceof z.ZodOptional)
    return schema.clone({ ...schema._zod.def, innerType: strictOf(schema._zod.def.innerType) })
  if (schema instanceof z.ZodNullable)
    return schema.clone({ ...schema._zod.def, innerType: strictOf(schema._zod.def.innerType) })
  if (schema instanceof z.ZodDefault)
    return schema.clone({ ...schema._zod.def, innerType: strictOf(schema._zod.def.innerType) })
  if (schema instanceof z.ZodReadonly)
    return schema.clone({ ...schema._zod.def, innerType: strictOf(schema._zod.def.innerType) })
  if (schema instanceof z.ZodUnion)
    return schema.clone({ ...schema._zod.def, options: schema._zod.def.options.map(strictOf) as typeof schema._zod.def.options })
  if (schema instanceof z.ZodRecord)
    return schema.clone({ ...schema._zod.def, valueType: strictOf(schema.valueType) })
  if (schema instanceof z.ZodPipe)
    return schema.clone({ ...schema._zod.def, in: strictOf(schema.in), out: strictOf(schema.out) })
  if (schema instanceof z.ZodLazy) {
    const getter = schema._zod.def.getter
    return schema.clone({ ...schema._zod.def, getter: () => strictOf(getter()) })
  }
  return schema
}

/**
 * Every issue `value` raises against `schema` made deeply strict, as
 * `path: message` lines — `[]` when it parses. The fixture specs assert
 * `toEqual([])`, so a failure names the offending field.
 */
export function problems(schema: Schema, value: unknown): string[] {
  const result = z.safeParse(deepStrict(schema), value)
  return result.success
    ? []
    : result.error.issues.map(issue => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
}
