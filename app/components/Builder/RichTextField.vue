<script lang="ts" setup>
import type { EditorProps, EditorToolbarItem } from '@nuxt/ui'

const props = defineProps<{
  /** The HTML the setting holds. */
  value: string
  /** The setting's name, for the editing area's accessible name. */
  label: string
  disabled: boolean
}>()

const emit = defineEmits<{
  /** The new HTML, or `undefined` when nothing is left in it. */
  update: [value: string | undefined]
}>()

const { t } = useStoreI18n('components/Builder/RichTextField')

/**
 * What the editor may write: only markup the store's sanitiser keeps
 * (`core/utils/sanitize.py` in Django, which refuses a save that would lose
 * content), so a merchant never types something a save refuses or a page
 * drops. Headings start at the second level, under the section's own title;
 * no code blocks and no images (pictures come with the media library).
 */
const STARTER_KIT: EditorProps['starterKit'] = {
  heading: { levels: [...BUILDER_RICH_TEXT_HEADING_LEVELS] },
  codeBlock: false,
  code: false,
  link: { openOnClick: false, autolink: true, HTMLAttributes: { target: null, rel: null } },
}

/** A bordered field like the form's inputs, spaced for a narrow pane, scrolling past a screenful of text. */
const EDITOR_UI = {
  root: 'rounded-md ring ring-accented ring-inset',
  content: 'max-h-96 overflow-y-auto',
  base: 'px-3 py-2 *:my-3 sm:px-3',
}

const editorRef = useTemplateRef('editorRef')
const html = computed(() => props.value)

/**
 * An emptied editor still writes an empty paragraph; whether anything is
 * left is the editor's own document's answer (TipTap's `isEmpty`: no text
 * and no divider), so an emptied field takes the setting out.
 */
function update(next: unknown): void {
  const value = typeof next === 'string' ? next : ''
  emit('update', editorRef.value?.editor?.isEmpty ? undefined : value)
}

const items = computed<EditorToolbarItem[][]>(() => [
  [
    { 'kind': 'mark', 'mark': 'bold', 'icon': 'i-lucide-bold', 'aria-label': t('bold'), 'tooltip': { text: t('bold') } },
    { 'kind': 'mark', 'mark': 'italic', 'icon': 'i-lucide-italic', 'aria-label': t('italic'), 'tooltip': { text: t('italic') } },
    { 'kind': 'mark', 'mark': 'underline', 'icon': 'i-lucide-underline', 'aria-label': t('underline'), 'tooltip': { text: t('underline') } },
    { 'kind': 'mark', 'mark': 'strike', 'icon': 'i-lucide-strikethrough', 'aria-label': t('strike'), 'tooltip': { text: t('strike') } },
  ],
  [
    {
      'icon': 'i-lucide-heading',
      'aria-label': t('heading'),
      'tooltip': { text: t('heading') },
      'content': { align: 'start' },
      'items': [
        { kind: 'paragraph', icon: 'i-lucide-pilcrow', label: t('paragraph') },
        ...BUILDER_RICH_TEXT_HEADING_LEVELS.map(level => ({ kind: 'heading' as const, level, icon: `i-lucide-heading-${level}`, label: t('headingLevel', { level }) })),
      ],
    },
    { 'kind': 'bulletList', 'icon': 'i-lucide-list', 'aria-label': t('bulletList'), 'tooltip': { text: t('bulletList') } },
    { 'kind': 'orderedList', 'icon': 'i-lucide-list-ordered', 'aria-label': t('orderedList'), 'tooltip': { text: t('orderedList') } },
    { 'kind': 'blockquote', 'icon': 'i-lucide-text-quote', 'aria-label': t('blockquote'), 'tooltip': { text: t('blockquote') } },
    { 'kind': 'horizontalRule', 'icon': 'i-lucide-separator-horizontal', 'aria-label': t('horizontalRule'), 'tooltip': { text: t('horizontalRule') } },
  ],
  [{ slot: 'link' as const }],
])

// The link of the selection: an address the staff member types, applied to
// the selected words (or the link the cursor is in), or taken off them.
const linkOpen = ref(false)
const linkHref = ref('')
const linkError = ref(false)

function openLink(open: boolean): void {
  linkOpen.value = open
  if (!open) return
  const href: unknown = editorRef.value?.editor?.getAttributes('link').href
  linkHref.value = typeof href === 'string' ? href : ''
  linkError.value = false
}

function applyLink(): void {
  const href = linkHref.value.trim()
  if (href === '') {
    removeLink()
    return
  }
  if (!builderRichTextLinkAllowed(href)) {
    linkError.value = true
    return
  }
  editorRef.value?.editor?.chain().focus().extendMarkRange('link').setLink({ href }).run()
  linkOpen.value = false
}

function removeLink(): void {
  editorRef.value?.editor?.chain().focus().extendMarkRange('link').unsetLink().run()
  linkOpen.value = false
}
</script>

<template>
  <UEditor
    ref="editorRef"
    v-slot="{ editor }"
    :model-value="html"
    content-type="html"
    :starter-kit="STARTER_KIT"
    :image="false"
    :mention="false"
    :editable="!disabled"
    :placeholder="{ placeholder: t('placeholder'), mode: 'firstLine' }"
    :editor-props="{ attributes: { 'aria-label': label, 'aria-multiline': 'true', 'role': 'textbox' } }"
    :ui="EDITOR_UI"
    class="w-full"
    @update:model-value="update"
  >
    <UEditorToolbar
      v-if="!disabled"
      :editor="editor"
      :items="items"
      class="flex-wrap border-b border-default p-1"
    >
      <template #link>
        <UPopover
          :open="linkOpen"
          @update:open="openLink"
        >
          <UButton
            icon="i-lucide-link"
            color="neutral"
            :variant="editor.isActive('link') ? 'soft' : 'ghost'"
            size="sm"
            :aria-label="t('link')"
          />
          <template #content>
            <form
              class="flex w-72 flex-col gap-2 p-2"
              @submit.prevent="applyLink"
            >
              <UFormField
                :label="t('linkHref')"
                :error="linkError ? t('linkInvalid') : undefined"
              >
                <UInput
                  v-model="linkHref"
                  placeholder="https://"
                  autofocus
                  class="w-full"
                />
              </UFormField>
              <div class="flex justify-end gap-1">
                <UButton
                  v-if="editor.isActive('link')"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-unlink"
                  :label="t('linkRemove')"
                  @click="removeLink"
                />
                <UButton
                  type="submit"
                  size="sm"
                  :label="t('linkApply')"
                />
              </div>
            </form>
          </template>
        </UPopover>
      </template>
    </UEditorToolbar>
  </UEditor>
</template>

<i18n lang="yaml">
el:
  placeholder: Γράψτε εδώ…
  bold: Έντονα
  italic: Πλάγια
  underline: Υπογράμμιση
  strike: Διακριτή διαγραφή
  heading: Μορφή κειμένου
  paragraph: Κείμενο
  headingLevel: "Επικεφαλίδα {level}"
  bulletList: Λίστα με κουκκίδες
  orderedList: Αριθμημένη λίστα
  blockquote: Παράθεση
  horizontalRule: Διαχωριστική γραμμή
  link: Σύνδεσμος
  linkHref: Διεύθυνση συνδέσμου
  linkInvalid: Μια διεύθυνση https:// ή μια διαδρομή του καταστήματος που αρχίζει με /.
  linkApply: Εφαρμογή
  linkRemove: Αφαίρεση συνδέσμου
en:
  placeholder: Write here…
  bold: Bold
  italic: Italic
  underline: Underline
  strike: Strikethrough
  heading: Text style
  paragraph: Text
  headingLevel: "Heading {level}"
  bulletList: Bulleted list
  orderedList: Numbered list
  blockquote: Quote
  horizontalRule: Divider
  link: Link
  linkHref: Link address
  linkInvalid: An https:// address, or a store path that starts with /.
  linkApply: Apply
  linkRemove: Remove link
</i18n>
