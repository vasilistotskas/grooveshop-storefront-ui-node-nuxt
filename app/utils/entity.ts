import type { EntityOrPrimitive, ExtractIfTranslationObject } from '~/types'

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

export function getEntityId<T>(
  entity: EntityOrPrimitive<T>,
): number | undefined {
  if (isEntityId(entity)) {
    return entity
  }
  else if (typeof entity === 'object' && entity !== null) {
    const entityId = (entity as Record<string, any>).id
    if (typeof entityId === 'number') {
      return entityId
    }
  }
  return undefined
}

export function deepEqual(object1: any, object2: any): boolean {
  const keys1 = Object.keys(object1)
  const keys2 = Object.keys(object2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    const val1 = object1[key]
    const val2 = object2[key]
    const areObjects = isObject(val1) && isObject(val2)
    if ((areObjects && !deepEqual(val1, val2)) || (!areObjects && val1 !== val2)) {
      return false
    }
  }

  return true
}

function isObject(object: any): boolean {
  return object != null && typeof object === 'object'
}
