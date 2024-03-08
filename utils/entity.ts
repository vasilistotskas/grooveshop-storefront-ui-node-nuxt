import type { ExtractIfTranslationObject } from '~/utils/translate'

type EntityOrPrimitive<T> = T | number

export function isEntityId<T>(entity: EntityOrPrimitive<T>): entity is number {
  return typeof entity === 'number'
}
export function getEntityObject<T>(
  entity: EntityOrPrimitive<T>,
): ExtractIfTranslationObject<Exclude<T, number>> | undefined {
  if (typeof entity === 'object' && entity !== null) {
    return entity as ExtractIfTranslationObject<Exclude<T, number>>
  }
  return undefined
}

export function getEntityObjectsFromArray<T>(
  entities: Array<EntityOrPrimitive<T>> | undefined,
): Array<ExtractIfTranslationObject<Exclude<T, number>> | undefined> {
  return entities?.map(getEntityObject) || []
}
