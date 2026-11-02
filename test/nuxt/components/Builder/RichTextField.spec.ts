import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import type { ShallowRef } from 'vue'
import type { EditorCustomHandlers } from '@nuxt/ui'
import { UApp, UEditor } from '#components'
import BuilderRichTextField from '~/components/Builder/RichTextField.vue'

/** TipTap's editor, as Nuxt UI's handlers name it. */
type TiptapEditor = Parameters<EditorCustomHandlers[string]['canExecute']>[0]

/**
 * A rich text setting: Nuxt UI's editor, writing only the markup the
 * store's sanitiser keeps, with a toolbar for it and a link of the
 * selection that is an https address or a path of the store.
 */
async function mount(value: string, disabled = false) {
  const updates: Array<string | undefined> = []
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, {
      default: () => h(BuilderRichTextField, { value, label: 'Περιεχόμενο', disabled, onUpdate: (next: string | undefined) => updates.push(next) }),
    }),
  }), { attachTo: document.body })
  await flushPromises()
  // The editor's own instance, as the component exposes it (`defineExpose({ editor })`).
  const editor = () => (wrapper.findComponent(UEditor).vm.$.exposed as { editor: ShallowRef<TiptapEditor | undefined> }).editor.value!
  return { wrapper, updates, editor }
}

const area = (wrapper: Awaited<ReturnType<typeof mount>>['wrapper']) => wrapper.get('[aria-label="Περιεχόμενο"][contenteditable]')

describe('BuilderRichTextField', () => {
  it('shows the text the setting holds, in an editing area named by the setting', async () => {
    const { wrapper } = await mount('<p>Γρήγορη <strong>φόρτιση</strong></p>')

    expect(area(wrapper).attributes('contenteditable')).toBe('true')
    expect(area(wrapper).attributes('role')).toBe('textbox')
    expect(area(wrapper).html()).toContain('<strong>φόρτιση</strong>')
  })

  it('offers only the formatting the store keeps', async () => {
    const { wrapper } = await mount('<p>Κείμενο</p>')

    const offered = wrapper.findAll('button[aria-label]').map(button => button.attributes('aria-label'))
    expect(offered).toEqual(['Έντονα', 'Πλάγια', 'Υπογράμμιση', 'Διακριτή διαγραφή', 'Μορφή κειμένου', 'Λίστα με κουκκίδες', 'Αριθμημένη λίστα', 'Παράθεση', 'Διαχωριστική γραμμή', 'Σύνδεσμος'])
  })

  it('writes what is typed as HTML, and an emptied field as no text', async () => {
    const { updates, editor } = await mount('<p>Κείμενο</p>')

    editor().chain().focus('end').insertContent(' νέο').run()
    await flushPromises()
    editor().commands.clearContent(true)
    await flushPromises()

    expect(updates).toEqual(['<p>Κείμενο νέο</p>', undefined])
  })

  it('links the selected words to a path of the store, and refuses an address the store would not keep', async () => {
    const { wrapper, updates, editor } = await mount('<p>Δείτε τις προσφορές</p>')
    editor().commands.selectAll()

    await wrapper.get('button[aria-label="Σύνδεσμος"]').trigger('click')
    await flushPromises()
    const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!
    input.value = 'javascript:alert(1)'
    input.dispatchEvent(new Event('input'))
    document.querySelector<HTMLFormElement>('[role="dialog"] form')!.requestSubmit()
    await flushPromises()
    expect(document.body.textContent).toContain('Μια διεύθυνση https:// ή μια διαδρομή του καταστήματος που αρχίζει με /.')
    expect(updates).toEqual([])

    input.value = '/offers'
    input.dispatchEvent(new Event('input'))
    document.querySelector<HTMLFormElement>('[role="dialog"] form')!.requestSubmit()
    await flushPromises()

    expect(updates.at(-1)).toBe('<p><a href="/offers">Δείτε τις προσφορές</a></p>')
  })

  it('shows STAFF the text with no toolbar, and lets them change nothing', async () => {
    const { wrapper } = await mount('<p>Κείμενο</p>', true)

    expect(area(wrapper).attributes('contenteditable')).toBe('false')
    expect(wrapper.find('button[aria-label="Έντονα"]').exists()).toBe(false)
  })
})
