/**
 * Text compared without case or accents. Greek capitals drop the tonos
 * ("ΑΓΡΟΣ" is "Αγρός" in capitals), so a case-only fold would miss a name
 * a merchant typed in capitals. `toLowerCase`, not `toLocaleLowerCase`:
 * the server and the browser must reach the same answer, and a fold that
 * follows the runtime's locale could differ between them.
 */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
