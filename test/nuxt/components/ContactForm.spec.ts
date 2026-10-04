import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ContactForm from '~/components/ContactForm.vue'
import { failWith } from '~~/test/helpers/api'

/**
 * The enquiry form. What matters: the topic reaches Django as the
 * `subject` (its label, in the visitor's language) or not at all; the
 * consent tick is checked here and never sent; the spam filter's
 * five-word rule is mirrored as an inline hint; files already uploaded
 * ride along as `attachmentIds`; and a refusal from Django is shown.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

// The upload step is tested on its own (`useContactAttachments.spec.ts`);
// here only what the form does with it.
const attachmentStub = vi.hoisted(() => ({
  enabled: false,
  ids: [] as string[],
  isUploading: false,
  added: [] as File[][],
  refusals: [] as Array<{ code: string, data?: unknown }>,
  resets: { count: 0 },
}))
mockNuxtImport('useContactAttachments', () => () => ({
  enabled: computed(() => attachmentStub.enabled),
  maxCount: computed(() => 3),
  maxMegabytes: computed(() => 5),
  maxBytes: computed(() => 5 * 1024 * 1024),
  allowedTypes: computed(() => ['application/pdf']),
  accept: computed(() => 'application/pdf'),
  uploads: computed(() => []),
  attachmentIds: computed(() => attachmentStub.ids),
  isUploading: computed(() => attachmentStub.isUploading),
  canAddMore: computed(() => true),
  add: (files: File[]) => {
    attachmentStub.added.push(files)
    return attachmentStub.refusals
  },
  remove: () => {},
  retry: () => {},
  reset: () => {
    attachmentStub.resets.count += 1
  },
}))

const CONTACT_URL = '/api/contact'
const posted = () => api.callsTo(CONTACT_URL).map(call => call.options.body as Record<string, unknown>)

const MESSAGE = 'Η παραγγελία μου δείχνει ως απεσταλμένη αλλά δεν έφτασε.'

beforeEach(() => {
  api.routes({ [CONTACT_URL]: { id: 1 } })
  attachmentStub.enabled = false
  attachmentStub.ids = []
  attachmentStub.isUploading = false
  attachmentStub.added = []
  attachmentStub.refusals = []
  attachmentStub.resets.count = 0
})

async function mount() {
  const wrapper = await mountSuspended(ContactForm, { route: false })
  await flushPromises()
  return wrapper
}

async function fill(wrapper: VueWrapper, fields: { message?: string, consent?: boolean } = {}) {
  await wrapper.find('input[autocomplete="name"]').setValue('Ελένη Παπά')
  await wrapper.find('input[type="email"]').setValue('eleni@example.com')
  await wrapper.find('textarea').setValue(fields.message ?? MESSAGE)
  if (fields.consent ?? true) {
    await wrapper.find('button[role="checkbox"]').trigger('click')
  }
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('ContactForm', () => {
  describe('sending the enquiry', () => {
    it('sends the name, email and message, and tells the visitor it went', async () => {
      const wrapper = await mount()
      await fill(wrapper)

      await submit(wrapper)

      expect(posted()).toEqual([{
        name: 'Ελένη Παπά',
        email: 'eleni@example.com',
        message: MESSAGE,
        subject: undefined,
        attachmentIds: undefined,
      }])
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Το μήνυμά σου στάλθηκε', color: 'success' }))
    })

    it('sends the chosen topic as the subject, in the visitor\'s language', async () => {
      const wrapper = await mount()
      await fill(wrapper)
      await wrapper.findComponent({ name: 'USelect' }).setValue('delivery')

      await submit(wrapper)

      expect(posted()[0]!.subject).toBe('Παράδοση ή επιστροφή')
    })

    it('leaves the consent tick out of the enquiry', async () => {
      const wrapper = await mount()
      await fill(wrapper)

      await submit(wrapper)

      expect(Object.keys(posted()[0]!)).not.toContain('consent')
    })

    it('empties the form after it was sent', async () => {
      const wrapper = await mount()
      await fill(wrapper)

      await submit(wrapper)

      expect(wrapper.find<HTMLTextAreaElement>('textarea').element.value).toBe('')
      expect(wrapper.find('button[role="checkbox"]').attributes('aria-checked')).toBe('false')
    })
  })

  describe('what is asked before it is sent', () => {
    it('does not send without the consent tick, and says why', async () => {
      const wrapper = await mount()
      await fill(wrapper, { consent: false })

      await submit(wrapper)

      expect(posted()).toEqual([])
      expect(wrapper.text()).toContain('Χρειαζόμαστε τη συγκατάθεσή σου για να απαντήσουμε')
    })

    it('does not send after the consent tick was taken back', async () => {
      const wrapper = await mount()
      await fill(wrapper)
      await wrapper.find('button[role="checkbox"]').trigger('click')

      await submit(wrapper)

      expect(posted()).toEqual([])
      expect(wrapper.text()).toContain('Χρειαζόμαστε τη συγκατάθεσή σου για να απαντήσουμε')
    })

    it('asks for at least five words, as the spam filter does', async () => {
      const wrapper = await mount()
      await fill(wrapper, { message: 'Πολύ μικρό μήνυμα εδώ' })

      await submit(wrapper)

      expect(posted()).toEqual([])
      expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.message.min_words', { min: 5 }))
    })
  })

  describe('when Django refuses it', () => {
    it('keeps what was typed and shows the reason Django gave', async () => {
      api.routes({ [CONTACT_URL]: failWith(400, { message: ['Το μήνυμα μοιάζει με spam.'] }) })
      const wrapper = await mount()
      await fill(wrapper)

      await submit(wrapper)

      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Το μήνυμα δεν στάλθηκε. Δοκίμασε ξανά.',
        color: 'error',
        description: expect.stringContaining('spam'),
      }))
      expect(wrapper.find<HTMLTextAreaElement>('textarea').element.value).toBe(MESSAGE)
    })
  })

  describe('files', () => {
    it('draws no attachment control when the store does not accept files', async () => {
      const wrapper = await mount()

      expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    })

    it('draws it, with the store\'s limits, when it does', async () => {
      attachmentStub.enabled = true

      const wrapper = await mount()

      expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('application/pdf')
      expect(wrapper.text()).toContain('Έως 3 αρχεία, 5 MB το καθένα')
    })

    it('hands a picked file to the uploader and says why one was refused', async () => {
      attachmentStub.enabled = true
      attachmentStub.refusals = [{ code: 'too-large' }]
      const wrapper = await mount()
      const file = new File(['x'], 'photo.pdf', { type: 'application/pdf' })
      const input = wrapper.find<HTMLInputElement>('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

      await input.trigger('change')

      expect(attachmentStub.added).toEqual([[file]])
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Το αρχείο δεν προστέθηκε',
        description: 'Το αρχείο ξεπερνά τα 5 MB.',
      }))
    })

    it('sends the ids of the uploaded files with the enquiry, and spends them', async () => {
      attachmentStub.enabled = true
      attachmentStub.ids = ['0a0a0a0a-0000-4000-8000-000000000001']
      const wrapper = await mount()
      await fill(wrapper)

      await submit(wrapper)

      expect(posted()[0]!.attachmentIds).toEqual(['0a0a0a0a-0000-4000-8000-000000000001'])
      expect(attachmentStub.resets.count).toBe(1)
    })

    it('holds the enquiry back while a file is still uploading', async () => {
      attachmentStub.enabled = true
      attachmentStub.isUploading = true
      const wrapper = await mount()
      await fill(wrapper)

      await submit(wrapper)

      expect(posted()).toEqual([])
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Περίμενε να ανέβουν τα αρχεία', color: 'warning' }))
    })
  })
})
