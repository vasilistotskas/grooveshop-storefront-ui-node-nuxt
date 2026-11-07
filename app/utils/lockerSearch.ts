/**
 * Finding a locker in a carrier's catalogue, in the browser: the text a
 * shopper types and the distance from a point.
 *
 * The search folds both sides to one phonetic Latin form, so case,
 * Greek accents and dialytika, final sigma and the common Greeklish
 * spellings all meet: «Πειραιάς», «ΠΕΙΡΑΙΑΣ», «peiraias» and «pireas» are
 * one form, and each query word only has to START a word of the locker,
 * so the shopper's half-typed «πειρ» already matches. The Greek-to-Latin
 * letters follow the canonical Greeklish of Django's search index
 * (`grooveshop-django-api/search/transliteration.py`), with the sounds
 * shoppers spell several ways collapsed to one (η/ι/υ/ει/οι, αι/ε, χ/ξ
 * and h for χ, ου, αυ/av/af, ευ/ev/ef, μπ/mb, ντ/nd, γκ/ng, a doubled
 * consonant), since a filter has no typo tolerance to absorb them.
 */

export interface GeoPoint {
  lat: number
  lng: number
}

const GREEK_DIGRAPHS: ReadonlyArray<[string, string]> = [
  ['ου', 'u'],
  // αυ / ευ sound av, ev (or af, ef): Greeklish writes the consonant.
  ['αυ', 'av'],
  ['ευ', 'ev'],
  ['ει', 'i'],
  ['οι', 'i'],
  ['υι', 'i'],
  ['αι', 'e'],
  ['μπ', 'b'],
  ['ντ', 'd'],
  ['γκ', 'g'],
  ['γγ', 'g'],
]

const GREEK_LETTERS: Readonly<Record<string, string>> = {
  α: 'a',
  β: 'v',
  γ: 'g',
  δ: 'd',
  ε: 'e',
  ζ: 'z',
  η: 'i',
  θ: 'th',
  ι: 'i',
  κ: 'k',
  λ: 'l',
  μ: 'm',
  ν: 'n',
  ξ: 'x',
  ο: 'o',
  π: 'p',
  ρ: 'r',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'i',
  φ: 'f',
  χ: 'x',
  ψ: 'ps',
  ω: 'o',
}

// The same sounds as Latin shoppers type them, applied after the Greek
// letters so both sides end in one spelling.
const LATIN_SPELLINGS: ReadonlyArray<[RegExp, string]> = [
  [/ch/g, 'x'],
  // A lone h is χ («halandri»); th stays θ.
  [/(?<!t)h/g, 'x'],
  [/ks/g, 'x'],
  [/ou/g, 'u'],
  [/mp|mb/g, 'b'],
  [/nt|nd/g, 'd'],
  [/gk|gg|ng/g, 'g'],
  [/y/g, 'i'],
  [/w/g, 'o'],
  [/ei|oi/g, 'i'],
  [/ai/g, 'e'],
  [/af/g, 'av'],
  [/ef/g, 'ev'],
  // «Κηφισσιά» / «kifisia»: a doubled letter, never a doubled digit,
  // which a postcode keeps.
  [/([a-z])\1+/g, '$1'],
]

/** `text` in the one form the search compares. */
export function foldSearchText(text: string): string {
  let folded = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  for (const [greek, latin] of GREEK_DIGRAPHS) folded = folded.replaceAll(greek, latin)
  folded = folded.replace(/[α-ω]/g, letter => GREEK_LETTERS[letter] ?? letter)
  for (const [pattern, latin] of LATIN_SPELLINGS) folded = folded.replace(pattern, latin)
  return folded
}

function words(text: string): string[] {
  return foldSearchText(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

/** The words a locker answers to: its name, address, city and postcode. */
export function lockerSearchWords(locker: Locker): string[] {
  return words([
    locker.name,
    locker.addressLine1,
    locker.addressLine2 ?? '',
    locker.city,
    postcodeDigits(locker.postalCode),
  ].join(' '))
}

function postcodeDigits(postalCode: string): string {
  return postalCode.replace(/\D/g, '')
}

// The letters that finish a pair the fold rewrites, by the letter that
// starts it (αι, αυ, μπ, ντ, γκ, ch, ks…): the word being typed may stop
// half way through one.
const PAIR_ENDS: Readonly<Record<string, ReadonlyArray<string>>> = {
  α: ['ι', 'υ'],
  ε: ['ι', 'υ'],
  ο: ['ι', 'υ'],
  υ: ['ι'],
  μ: ['π'],
  ν: ['τ'],
  γ: ['κ', 'γ'],
  a: ['i', 'f'],
  e: ['i', 'f'],
  o: ['i', 'u'],
  m: ['p', 'b'],
  n: ['t', 'd', 'g'],
  g: ['k', 'g'],
  c: ['h'],
  k: ['s'],
}

/**
 * The words of what the shopper typed, each with the forms it may match,
 * or none for a blank query. A Greek postcode typed with its space
 * («546 22») is one word, as stored; other numbers stay apart («50»,
 * then «10433»). The word still being typed ends with each way its last
 * pair could finish, so «Πειρα» finds «Πειραιάς» before the «ι» that
 * makes «αι» is typed, without matching more than the finished word would.
 */
export function searchQueryWords(query: string): string[][] {
  const text = query.replace(/\b(\d{3})\s+(\d{2})\b/g, '$1$2')
  const typed = words(text).map(word => [word])
  const last = typed.at(-1)
  const lastLetter = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().at(-1) ?? ''
  if (!last) return typed
  for (const end of PAIR_ENDS[lastLetter] ?? []) {
    const finished = words(text + end).at(-1)
    if (finished && !last.includes(finished)) last.push(finished)
  }
  return typed
}

/** Whether every query word, in one of its forms, starts one of the locker's words. */
export function matchesQuery(lockerWords: ReadonlyArray<string>, queryWords: ReadonlyArray<ReadonlyArray<string>>): boolean {
  return queryWords.every(forms => forms.some(form => lockerWords.some(word => word.startsWith(form))))
}

const EARTH_RADIUS_KM = 6371

/** Great-circle distance in kilometres. */
export function distanceKm(from: GeoPoint, to: GeoPoint): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = rad(to.lat - from.lat)
  const dLng = rad(to.lng - from.lng)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

const POSTCODE_AREA_DIGITS = 3

/**
 * Where a postcode is, from the catalogue itself: the middle of the
 * lockers at that postcode or, when it has none, of its area (the first
 * three digits, as ACS's own nearest search falls back). `null` when
 * neither has a placed locker.
 */
export function postcodeCentre(lockers: ReadonlyArray<Locker>, postalCode: string): GeoPoint | null {
  const digits = postcodeDigits(postalCode)
  if (digits.length < POSTCODE_AREA_DIGITS) return null
  const placed = lockers.filter((l): l is Locker & GeoPoint => typeof l.lat === 'number' && typeof l.lng === 'number')
  const area = digits.slice(0, POSTCODE_AREA_DIGITS)
  const exact = placed.filter(l => postcodeDigits(l.postalCode) === digits)
  const near = exact.length > 0 ? exact : placed.filter(l => postcodeDigits(l.postalCode).startsWith(area))
  if (near.length === 0) return null
  return {
    lat: near.reduce((sum, l) => sum + l.lat, 0) / near.length,
    lng: near.reduce((sum, l) => sum + l.lng, 0) / near.length,
  }
}
