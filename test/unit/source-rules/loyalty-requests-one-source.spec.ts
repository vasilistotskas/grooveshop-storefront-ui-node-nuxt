import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP, appLabel, readSource, withoutComments } from '../../helpers/sourceText'

/**
 * The app asks for loyalty data through `useLoyalty` alone.
 *
 * Django refuses a store's loyalty API while the programme is off
 * (`feature_gate:refused`, which pages the team). `useLoyalty` gates
 * every request on the store's `loyalty` feature, so any caller is
 * safe; a component calling `/api/loyalty/*` itself would have to
 * remember that gate again, and the one that did not, on webside's
 * checkout, is how a store with loyalty off kept being asked. The
 * frozen webside tree is held to it too: it renders a live store.
 */
const SOURCE = resolve(APP, 'composables/useLoyalty.ts')

const files = (readdirSync(APP, { recursive: true }) as string[])
  .map(entry => resolve(APP, entry))
  .filter(file => /\.(ts|vue)$/.test(file))
const asking = files.filter(file => withoutComments(readSource(file)).includes('/api/loyalty/'))

describe('loyalty requests', () => {
  it('are made in useLoyalty alone', () => {
    expect(asking.map(appLabel)).toEqual([appLabel(SOURCE)])
  })
})
