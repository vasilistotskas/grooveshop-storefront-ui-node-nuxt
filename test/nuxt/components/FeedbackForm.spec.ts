import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import FeedbackForm from '~/components/FeedbackForm.vue'
import { failWith } from '~~/test/helpers/api'

/**
 * Feedback, one question at a time. Each step asks for its own field
 * before Next lets the visitor on; the fifth sends all five. A refusal
 * from Django is shown and keeps the visitor where they were.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const FEEDBACK_URL = '/api/feedback'
const posted = () => api.callsTo(FEEDBACK_URL).map(call => call.options.body as Record<string, unknown>)

const MESSAGE = 'Η παράδοση ήταν γρήγορη και το κουτί ήρθε άθικτο.'

beforeEach(() => {
  api.routes({ [FEEDBACK_URL]: { id: 1 } })
})

async function mount() {
  // In the document, so focus is real.
  const wrapper = await mountSuspended(FeedbackForm, { route: false, attachTo: document.body })
  await flushPromises()
  return wrapper
}

const heading = (wrapper: VueWrapper) => wrapper.find('h2').text()
const progress = (wrapper: VueWrapper) => wrapper.find('form').element.parentElement!.textContent

async function press(wrapper: VueWrapper, label: string) {
  await wrapper.findAll('button').find(button => button.text() === label)!.trigger('click')
  await flushPromises()
}

/** The radio of the card labelled `label` (a category, or a rating). */
async function choose(wrapper: VueWrapper, label: string) {
  const card = wrapper.findAll('[data-slot="item"]').find(item => item.text().includes(label))!
  await card.find('[role="radio"]').trigger('click')
}

async function toRating(wrapper: VueWrapper) {
  await press(wrapper, 'Επόμενο')
}

async function toMessage(wrapper: VueWrapper, rating = '4') {
  await toRating(wrapper)
  await choose(wrapper, rating)
  await press(wrapper, 'Επόμενο')
}

describe('FeedbackForm', () => {
  describe('the walk through the questions', () => {
    it('starts at the first of five, and says how far along it is', async () => {
      const wrapper = await mount()

      expect(heading(wrapper)).toBe('Για τι αφορούν τα σχόλιά σου;')
      expect(progress(wrapper)).toContain('Ερώτηση 1 από 5')
      expect(progress(wrapper)).toContain('20%')
    })

    it('moves on with Next and back with Back', async () => {
      const wrapper = await mount()

      await toRating(wrapper)
      expect(heading(wrapper)).toBe('Πώς ήταν η εμπειρία σου συνολικά;')
      expect(progress(wrapper)).toContain('Ερώτηση 2 από 5')
      expect(progress(wrapper)).toContain('40%')

      await press(wrapper, 'Πίσω')
      expect(heading(wrapper)).toBe('Για τι αφορούν τα σχόλιά σου;')
    })

    it('offers no Back on the first question, and "Send feedback" instead of Next on the last', async () => {
      const wrapper = await mount()
      expect(wrapper.findAll('button').some(button => button.text() === 'Πίσω')).toBe(false)

      await toMessage(wrapper)
      await wrapper.find('textarea').setValue(MESSAGE)
      await press(wrapper, 'Επόμενο')
      await press(wrapper, 'Επόμενο')

      expect(wrapper.findAll('button').some(button => button.text() === 'Αποστολή σχολίων')).toBe(true)
      expect(wrapper.findAll('button').some(button => button.text() === 'Επόμενο')).toBe(false)
    })
  })

  describe('what each question asks before it lets the visitor on', () => {
    it('needs a rating', async () => {
      const wrapper = await mount()
      await toRating(wrapper)

      await press(wrapper, 'Επόμενο')

      expect(heading(wrapper)).toBe('Πώς ήταν η εμπειρία σου συνολικά;')
      expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.required'))
    })

    it('needs at least five words of comment, as the spam filter does', async () => {
      const wrapper = await mount()
      await toMessage(wrapper)
      await wrapper.find('textarea').setValue('Πολύ μικρό μήνυμα εδώ')

      await press(wrapper, 'Επόμενο')

      expect(heading(wrapper)).toBe('Τι θέλεις να μας πεις;')
      expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.message.min_words', { min: 5 }))
    })

    it('refuses an email that is not one, on the last question', async () => {
      const wrapper = await mount()
      await toMessage(wrapper)
      await wrapper.find('textarea').setValue(MESSAGE)
      await press(wrapper, 'Επόμενο')
      await press(wrapper, 'Επόμενο')
      await wrapper.find('input[type="email"]').setValue('not-an-email')

      await press(wrapper, 'Αποστολή σχολίων')

      expect(posted()).toEqual([])
      expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.email.valid'))
    })

    it('treats Enter in a one-line field as Next', async () => {
      const wrapper = await mount()
      await toMessage(wrapper)
      await wrapper.find('textarea').setValue(MESSAGE)
      await press(wrapper, 'Επόμενο')
      expect(heading(wrapper)).toBe('Πώς να σε λέμε; (προαιρετικό)')

      await wrapper.find('input').trigger('keydown.enter')
      await flushPromises()

      expect(heading(wrapper)).toBe('Πού μπορούμε να σε βρούμε; (προαιρετικό)')
    })
  })

  describe('Enter', () => {
    it('leaves Enter on the Back button to the button, instead of going on', async () => {
      const wrapper = await mount()
      await toRating(wrapper)
      await choose(wrapper, '4')

      await wrapper.findAll('button').find(button => button.text() === 'Πίσω')!.trigger('keydown.enter')
      await flushPromises()

      expect(heading(wrapper)).toBe('Πώς ήταν η εμπειρία σου συνολικά;')
    })

    it('leaves Enter on a rating card to the card, instead of going on', async () => {
      const wrapper = await mount()
      await toRating(wrapper)
      await choose(wrapper, '4')

      await wrapper.find('[data-slot="item"] [role="radio"]').trigger('keydown.enter')
      await flushPromises()

      expect(heading(wrapper)).toBe('Πώς ήταν η εμπειρία σου συνολικά;')
    })
  })

  describe('Enter while composing', () => {
    async function toName(wrapper: VueWrapper) {
      await toMessage(wrapper)
      await wrapper.find('textarea').setValue(MESSAGE)
      await press(wrapper, 'Επόμενο')
    }

    it('leaves the Enter that confirms an IME candidate to the composition', async () => {
      const wrapper = await mount()
      await toName(wrapper)

      await wrapper.find('input').trigger('keydown', { key: 'Enter', isComposing: true })
      await flushPromises()

      expect(heading(wrapper)).toBe('Πώς να σε λέμε; (προαιρετικό)')
    })

    it('leaves it too when the browser only reports keyCode 229', async () => {
      const wrapper = await mount()
      await toName(wrapper)

      await wrapper.find('input').trigger('keydown', { key: 'Enter', keyCode: 229 })
      await flushPromises()

      expect(heading(wrapper)).toBe('Πώς να σε λέμε; (προαιρετικό)')
    })
  })

  describe('a second Next before the first has settled', () => {
    const nextButton = (wrapper: VueWrapper) => wrapper.findAll('button').find(button => button.text() === 'Επόμενο')!

    it('advances one question, not two', async () => {
      const wrapper = await mount()
      const button = nextButton(wrapper)

      void button.trigger('click')
      void button.trigger('click')
      await flushPromises()

      expect(progress(wrapper)).toContain('Ερώτηση 2 από 5')
    })

    it('sends the feedback once', async () => {
      const wrapper = await mount()
      await toMessage(wrapper)
      await wrapper.find('textarea').setValue(MESSAGE)
      await press(wrapper, 'Επόμενο')
      await press(wrapper, 'Επόμενο')
      const send = wrapper.findAll('button').find(button => button.text() === 'Αποστολή σχολίων')!

      void send.trigger('click')
      void send.trigger('click')
      await flushPromises()

      expect(posted()).toHaveLength(1)
    })
  })

  describe('focus', () => {
    it('moves to the new question when the visitor goes on', async () => {
      const wrapper = await mount()

      await toRating(wrapper)

      expect(document.activeElement).toBe(wrapper.find('h2').element)
      expect(document.activeElement!.textContent).toBe('Πώς ήταν η εμπειρία σου συνολικά;')
    })

    it('moves to the question when the visitor goes back', async () => {
      const wrapper = await mount()
      await toRating(wrapper)
      // The question's heading is the same element on every step; focus
      // has to be put back on it, not just left there.
      ;(document.activeElement as HTMLElement).blur()

      await press(wrapper, 'Πίσω')

      expect(document.activeElement).toBe(wrapper.find('h2').element)
      expect(document.activeElement!.textContent).toBe('Για τι αφορούν τα σχόλιά σου;')
    })
  })

  describe('sending', () => {
    async function answerAll(wrapper: VueWrapper, extra: { name?: string, email?: string } = {}) {
      await choose(wrapper, 'Παράδοση')
      await toRating(wrapper)
      await choose(wrapper, '5')
      await press(wrapper, 'Επόμενο')
      await wrapper.find('textarea').setValue(MESSAGE)
      await press(wrapper, 'Επόμενο')
      if (extra.name) await wrapper.find('input').setValue(extra.name)
      await press(wrapper, 'Επόμενο')
      if (extra.email) await wrapper.find('input[type="email"]').setValue(extra.email)
    }

    it('sends the five answers, the rating as a number', async () => {
      const wrapper = await mount()
      await answerAll(wrapper, { name: 'Ελένη', email: 'eleni@example.com' })

      await press(wrapper, 'Αποστολή σχολίων')

      expect(posted()).toEqual([{
        rating: 5,
        category: 'delivery',
        message: MESSAGE,
        name: 'Ελένη',
        email: 'eleni@example.com',
      }])
    })

    it('sends without a name or an email when the visitor gave neither', async () => {
      const wrapper = await mount()
      await answerAll(wrapper)

      await press(wrapper, 'Αποστολή σχολίων')

      expect(posted()).toEqual([{ rating: 5, category: 'delivery', message: MESSAGE }])
    })

    it('thanks the visitor, and starts again on request', async () => {
      const wrapper = await mount()
      await answerAll(wrapper)
      await press(wrapper, 'Αποστολή σχολίων')

      expect(heading(wrapper)).toBe('Ευχαριστούμε για τα σχόλιά σου!')
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ευχαριστούμε για τα σχόλιά σου!', color: 'success' }))

      await press(wrapper, 'Νέα αποστολή')

      expect(heading(wrapper)).toBe('Για τι αφορούν τα σχόλιά σου;')
      expect(progress(wrapper)).toContain('Ερώτηση 1 από 5')
    })

    it('shows the reason Django gave and keeps the visitor on the last question', async () => {
      api.routes({ [FEEDBACK_URL]: failWith(400, { message: ['Το μήνυμα μοιάζει με spam.'] }) })
      const wrapper = await mount()
      await answerAll(wrapper)

      await press(wrapper, 'Αποστολή σχολίων')

      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.',
        color: 'error',
        description: expect.stringContaining('spam'),
      }))
      expect(heading(wrapper)).toBe('Πού μπορούμε να σε βρούμε; (προαιρετικό)')
    })
  })
})
