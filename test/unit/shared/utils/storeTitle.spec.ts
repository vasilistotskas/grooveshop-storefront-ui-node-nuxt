import { describe, expect, it } from 'vitest'
import { storeTitle } from '~~/shared/utils/storeTitle'

describe('storeTitle', () => {
  it('adds the store\'s name after the page\'s title', () => {
    expect(storeTitle('Πολιτική Επιστροφών', 'Webside', '|')).toBe('Πολιτική Επιστροφών | Webside')
  })

  // webside's product SEO titles end with "| Webside", and the page read
  // "… | Webside | Webside" in every search result.
  it('adds nothing to a title that already ends with the store\'s name', () => {
    expect(storeTitle('Mini Powerbank 5000mAh – Μαύρο | Webside', 'Webside', '|')).toBe('Mini Powerbank 5000mAh – Μαύρο | Webside')
    expect(storeTitle('Mini Powerbank – webside', 'Webside', '|')).toBe('Mini Powerbank – webside')
    expect(storeTitle('Τα νέα του Webside', 'Webside', '|')).toBe('Τα νέα του Webside')
  })

  // Greek capitals drop the tonos, and the final sigma folds the same way
  // on the server and in the browser.
  it('recognises a Greek store name in capitals, without its accents, final sigma included', () => {
    expect(storeTitle('Βότανα | ΕΚ ΦΥΣΕΩΣ ΦΥΤΕΙΑΣ', 'Εκ Φύσεως Φυτειάς', '|')).toBe('Βότανα | ΕΚ ΦΥΣΕΩΣ ΦΥΤΕΙΑΣ')
    expect(storeTitle('Βότανα | Εκ Φύσεως Φυτειάς', 'Εκ Φύσεως Φυτειάς', '|')).toBe('Βότανα | Εκ Φύσεως Φυτειάς')
    expect(storeTitle('Βότανα | ΑΓΡΟΣ', 'Αγρός', '|')).toBe('Βότανα | ΑΓΡΟΣ')
    expect(storeTitle('Βότανα', 'Αγρός', '|')).toBe('Βότανα | Αγρός')
  })

  it('still adds the name when the title only contains it, or ends with a longer word', () => {
    expect(storeTitle('Webside Mini Power Bank', 'Webside', '|')).toBe('Webside Mini Power Bank | Webside')
    expect(storeTitle('Superwebside', 'Webside', '|')).toBe('Superwebside | Webside')
  })

  it('is the store\'s name for a page with no title of its own', () => {
    expect(storeTitle('', 'Webside', '|')).toBe('Webside')
    expect(storeTitle(undefined, 'Webside', '|')).toBe('Webside')
  })

  it('leaves out an empty separator rather than doubling a space', () => {
    expect(storeTitle('Καλάθι', 'Webside', '')).toBe('Καλάθι Webside')
    expect(storeTitle('Καλάθι', 'Webside', undefined)).toBe('Καλάθι Webside')
  })

  it('is the page\'s title alone when the store has no name', () => {
    expect(storeTitle('Καλάθι', '', '|')).toBe('Καλάθι')
    expect(storeTitle('Καλάθι', undefined, '|')).toBe('Καλάθι')
  })
})
