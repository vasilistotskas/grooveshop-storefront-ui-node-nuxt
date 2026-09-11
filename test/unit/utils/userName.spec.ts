/**
 * Usernames on this platform are GENERATED (`{Adjective}{Noun}#{hash}`
 * from the email), so every account has one. A name-or-username check
 * written the wrong way round therefore never reaches the real name:
 * the blog comment byline read `username || firstName + ' ' + lastName`
 * and signed a comment by "Webside Admin" as "Paok1441".
 */

import { describe, it, expect } from 'vitest'
import { displayUserName, displayUserInitials } from '../../../app/utils/userName'

describe('displayUserName', () => {
  it('prefers the person over the generated handle', () => {
    expect(displayUserName({
      username: 'Paok1441',
      firstName: 'Webside',
      lastName: 'Admin',
    })).toBe('Webside Admin')
  })

  it('accepts a first name alone', () => {
    expect(displayUserName({ firstName: 'Μαρία', lastName: '' }))
      .toBe('Μαρία')
  })

  it('falls back to the handle when no name is set', () => {
    expect(displayUserName({
      username: 'QuietOtter#4417',
      firstName: '',
      lastName: '',
    })).toBe('QuietOtter#4417')
  })

  it('never renders "undefined" when nothing is set', () => {
    expect(displayUserName({})).toBe('')
    expect(displayUserName(null)).toBe('')
    expect(displayUserName(undefined)).toBe('')
  })

  it('treats a null name the same as an absent one', () => {
    expect(displayUserName({ firstName: null, lastName: null, username: 'Handle7' }))
      .toBe('Handle7')
  })
})

describe('displayUserInitials', () => {
  it('uses both initials when the person is named', () => {
    expect(displayUserInitials({ firstName: 'Webside', lastName: 'Admin' }))
      .toBe('WA')
  })

  it('falls back to the first letter of the handle', () => {
    expect(displayUserInitials({ firstName: '', lastName: '', username: 'quietOtter' }))
      .toBe('Q')
  })

  it('is empty when there is nothing to initialise', () => {
    expect(displayUserInitials({})).toBe('')
    expect(displayUserInitials(null)).toBe('')
  })
})
