import type { Attribute, AttributeValue } from '~~/shared/openapi/types.gen'

/**
 * The listing's attribute filters, one group per attribute (Power
 * output, Colour, …), each value with how many products carry it under
 * the other filters.
 */
export interface AttributeOption {
  /** The attribute value's id, as the URL's `attributeValue` holds it. */
  id: string
  label: string
  count: number
  selected: boolean
}

export interface AttributeGroup {
  id: number
  label: string
  options: AttributeOption[]
}

/**
 * Groups in the attributes' own order, values in theirs (`sortOrder`,
 * the merchant's: 20W, 30W, 65W, 100W). Order never follows the counts
 * or the selection, so a ticked box stays where it was ticked.
 *
 * A value no product in the listing carries is left out — on a charger
 * page, a case's colour is not a choice — unless it is selected, so it
 * can be cleared. An attribute left with no values is left out whole.
 */
export function buildAttributeGroups(
  attributes: readonly Attribute[],
  values: readonly AttributeValue[],
  counts: Readonly<Record<string, number>>,
  selected: readonly string[],
  locale: string,
): AttributeGroup[] {
  const valuesByAttribute = new Map<number, AttributeValue[]>()
  for (const value of values) {
    if (value.active === false) continue
    const list = valuesByAttribute.get(value.attribute)
    if (list) list.push(value)
    else valuesByAttribute.set(value.attribute, [value])
  }

  return attributes
    .filter(attribute => attribute.active !== false)
    .map(attribute => ({
      id: attribute.id,
      label: extractTranslated(attribute, 'name', locale) ?? '',
      options: (valuesByAttribute.get(attribute.id) ?? [])
        .toSorted((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(value => ({
          id: String(value.id),
          label: extractTranslated(value, 'value', locale) ?? '',
          count: counts[value.id] ?? 0,
          selected: selected.includes(String(value.id)),
        }))
        .filter(option => option.count > 0 || option.selected),
    }))
    .filter(group => group.options.length > 0)
}
