export function removeDuplicates<T>(arr: Array<T>): T[] {
  return [...new Set(arr)]
}
