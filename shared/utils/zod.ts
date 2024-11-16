import type {
  AnyZodObject,
  Effect,
  objectInputType,
  objectOutputType,
  UnknownKeysParam,
  ZodObject,
  ZodRawShape,
  ZodType,
  ZodTypeAny,
  ZodTypeDef,
} from 'zod'
import * as z from 'zod'

export const addEffect = <
  Output = unknown,
  Def extends ZodTypeDef = ZodTypeDef,
  Input = Output,
  Base extends ZodType<Output, Def, Input> = ZodType<Output, Def, Input>,
>(
  base: Base,
  effect: Effect<unknown>,
) => {
  switch (effect.type) {
    case 'preprocess':
      return z.preprocess(effect.transform, base)
    case 'transform':
      return base.transform(effect.transform)
    case 'refinement':
      return base.superRefine(effect.refinement)
    default:
      throw new Error('Unknown effect type')
  }
}

export const mergeWithEffect = <
  Incoming extends AnyZodObject,
  T extends ZodRawShape,
  UnknownKeys extends UnknownKeysParam = UnknownKeysParam,
  Catchall extends ZodTypeAny = ZodTypeAny,
  Output = objectOutputType<T, Catchall, UnknownKeys>,
  Input = objectInputType<T, Catchall, UnknownKeys>,
>(
  a: z.ZodEffects<ZodObject<T, UnknownKeys, Catchall, Output, Input>>,
  b: Incoming,
) => {
  if (!(a instanceof z.ZodEffects)) {
    throw new TypeError('The first argument must be a z.ZodEffects instance.')
  }
  return addEffect(a.innerType().merge(b), a._def.effect)
}

export function ZodSearchResult<T>(
  zodSchema: z.ZodType<T>,
): z.ZodType<SearchResult<T>> {
  return z.object({
    limit: z.number(),
    offset: z.number(),
    estimatedTotalHits: z.number(),
    results: z.array(zodSchema),
  })
}
