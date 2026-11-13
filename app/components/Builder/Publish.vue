<script lang="ts" setup>
import { getLocalTimeZone, now, toCalendarDateTime, toZoned } from '@internationalized/date'
import type { CalendarDateTime } from '@internationalized/date'

/**
 * Publishing the page being edited: the page, the section groups drawn
 * around it and the store's theme, which every page draws with, released
 * together (Django's `POST builder/publish`, through
 * `POST /api/builder/publish`). The staff member picks which of them go
 * live; each one with changes is picked to begin with. Their drafts are
 * saved first (`useBuilderAutosaveStore().settle`), since Django releases
 * what it holds. A refusal lists every problem by document, each with a way
 * to what it is about: the node, or the theme panel's contrast rule. A
 * theme rule that only warns (Django refuses the error rules alone) is
 * listed too, and does not stop the publish. ADMIN and OWNER only: STAFF see
 * no button.
 *
 * They go live now, or at a time the staff member picks (Django's `POST
 * builder/schedules`): validated and frozen now, released then. The time is
 * the staff member's own, sent with its offset, since the store's timezone
 * is not exposed. The dialog lists the store's publishes still to come, each
 * one cancellable, and the ones that failed with why, until someone says
 * they saw them.
 */
const { t, locale } = useStoreI18n('components/Builder/Publish')
const { documentLabel, groupLabel } = useBuilderLabels()
const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()
const toast = useToast()
const { notify } = useApiError()
const { documentKey, openDocument, select, openPanel } = useBuilderEditorView()
const tenantStore = useTenantStore()

/** How long a note may be, as Django's publish takes it (the generated request schema). */
const NOTE_MAX_LENGTH = zPublishWriteRequest.shape.note.unwrap().unwrap().maxLength ?? undefined

/** The staff member's own timezone, in which the time to publish at is picked. */
const timeZone = getLocalTimeZone()

const open = ref(false)
/** Now, or at a time. */
const when = ref<'now' | 'later'>('now')
/** The wall-clock time picked, read in `timeZone`: a zone-free value, so the field draws no zone segment. */
const at = shallowRef<CalendarDateTime>()
/** A time to publish at that has passed, or none picked. */
const atInvalid = ref(false)
const picked = ref<string[]>([])
const note = ref('')
const publishing = ref(false)
/** Why the last attempt did not publish: the drafts could not all be saved first, or Django's problems. */
const unsaved = ref<string[]>([])
/** Every problem in the way: from the check as the dialog opens and the picks change, or from Django's refusal. */
const problems = ref<PublishProblem[]>([])
/** The check is asked: the drafts are saved, then Django says what publishing them would do. */
const checking = ref(false)
let checks = 0
/** The picks the last check was asked for. */
let checkedPicks = ''

/** The documents this view publishes: the page, then its groups, as the outline lists them, then the theme. */
const keys = computed(() => [documentKey.value, ...store.groups.map(({ key }) => key), BUILDER_THEME_DOCUMENT].filter(key => store.opened[key]))

/** Whether a document has anything to publish: changes Django holds as unpublished, or changes not saved yet. */
function changed(key: string): boolean {
  const document = store.opened[key]
  return Boolean(document && (document.meta.hasUnpublishedChanges || !sameWorkingCopy(document.copy, document.saved)))
}

const anyChanged = computed(() => keys.value.some(changed))

function labelOf(key: string): string {
  const group = store.groups.find(entry => entry.key === key)?.group
  return group ? groupLabel(group) : documentLabel(key)
}

/**
 * The theme's contrast rules that fail as warnings, while the theme is
 * picked: shown at publish, never in its way. Django refuses only a failing
 * error rule (`insufficient_contrast`, among the problems); a warning is
 * the editor's, measured on the working copy as the theme panel does.
 */
const themeWarnings = computed(() => {
  if (!picked.value.includes(BUILDER_THEME_DOCUMENT)) return []
  const settings = zThemeSettings.safeParse(store.theme?.copy.draft.settings)
  if (!settings.success) return []
  return evaluateContrastRules(settings.data, themeContrastRulesFor(resolveDesign(tenantStore.schemaName)))
    .filter(outcome => !outcome.pass && outcome.rule.severity === 'warning')
})

const items = computed(() => keys.value.map(key => ({
  value: key,
  label: labelOf(key),
  description: changed(key) ? t('changed') : t('unchanged'),
  disabled: !changed(key),
})))

/**
 * Asks Django what publishing the picked documents would do (`POST
 * /api/builder/publish/check`), after saving them: the check reads the
 * drafts Django holds. A check overtaken by a newer one is dropped.
 */
async function check(): Promise<void> {
  const documents = picked.value.filter(key => keys.value.includes(key))
  const run = ++checks
  checkedPicks = picked.value.join()
  problems.value = []
  if (documents.length === 0) return
  checking.value = true
  try {
    if (!await autosave.settle(documents)) {
      if (run === checks) unsaved.value = documents.filter(key => autosave.stateOf(key) !== 'saved')
      return
    }
    const result = await $api('/api/builder/publish/check', { method: 'POST', body: { documents } })
    if (run === checks) problems.value = result.problems
  }
  catch (error) {
    if (run === checks) notify('builder:publish-check', error, { title: t('checkFailed') })
  }
  finally {
    if (run === checks) checking.value = false
  }
}

// A pick changed while the dialog is open: check what publishing them would do now.
watch(picked, (next) => {
  if (open.value && next.join() !== checkedPicks) void check()
})

/** The next whole hour but one: a time to begin from that is surely ahead. */
const nextHour = () => toCalendarDateTime(now(timeZone).add({ hours: 2 }).set({ minute: 0, second: 0, millisecond: 0 }))

/** Now, as a wall-clock time in `timeZone`: the earliest time the field offers. */
const earliest = () => toCalendarDateTime(now(timeZone))

const whenItems = computed(() => [
  { label: t('when.now'), value: 'now' },
  { label: t('when.later'), value: 'later' },
])

/** Opens the dialog with the documents that have changes picked, and checks them. */
function begin(): void {
  note.value = ''
  when.value = 'now'
  at.value = nextHour()
  atInvalid.value = false
  unsaved.value = []
  open.value = true
  picked.value = keys.value.filter(changed)
  void check()
  void loadSchedules()
}

/** A time as the staff member reads it: their language, their timezone. */
const formatTime = (iso: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

async function publish(): Promise<void> {
  const documents = picked.value.filter(key => keys.value.includes(key))
  if (documents.length === 0) return
  atInvalid.value = when.value === 'later' && (!at.value || at.value.compare(earliest()) <= 0)
  if (atInvalid.value) return
  publishing.value = true
  unsaved.value = []
  problems.value = []
  try {
    if (!await autosave.settle(documents)) {
      unsaved.value = documents.filter(key => autosave.stateOf(key) !== 'saved')
      return
    }
    if (when.value === 'later') {
      const schedule = await $api('/api/builder/schedules', { method: 'POST', body: { documents, scheduledFor: toZoned(at.value!, timeZone).toAbsoluteString(), note: note.value.trim() } })
      open.value = false
      toast.add({ title: t('scheduled.title'), description: t('scheduled.description', { when: formatTime(schedule.scheduledFor) }), color: 'success', icon: 'i-lucide-calendar-check' })
      return
    }
    const release = await $api('/api/builder/publish', { method: 'POST', body: { documents, note: note.value.trim() } })
    await store.refresh(documents)
    open.value = false
    toast.add({ title: t('done.title'), description: t('done.description', { number: release.number }), color: 'success', icon: 'i-lucide-circle-check' })
  }
  catch (error) {
    const refused = refusalOf(error)
    if (refused) problems.value = refused
    else notify('builder:publish', error, { title: t('failed') })
  }
  finally {
    publishing.value = false
  }
}

/** Django's problems when it refuses the drafts (`400 invalid_document`), else nothing. */
function refusalOf(error: unknown): PublishProblem[] | undefined {
  const data = typeof error === 'object' && error !== null && 'data' in error ? error.data : undefined
  const parsed = zBuilderDocumentInvalidError.safeParse(data)
  return parsed.success ? parsed.data.errors : undefined
}

/** The store's publishes still to come, soonest first, and those that failed and nobody has seen yet. */
const pending = ref<Schedule[]>([])
const failed = ref<Schedule[]>([])
/** The schedule being cancelled or acknowledged. */
const acting = ref<number>()

/** Reads the schedules the dialog lists (`GET /api/builder/schedules?status=`), as it opens. */
async function loadSchedules(): Promise<void> {
  try {
    const [next, broken] = await Promise.all([
      $api('/api/builder/schedules', { query: { status: 'pending' } }),
      $api('/api/builder/schedules', { query: { status: 'failed' } }),
    ])
    pending.value = next.results
    failed.value = broken.results.filter(schedule => !schedule.acknowledgedAt)
  }
  catch (error) {
    notify('builder:schedules', error, { title: t('schedules.loadFailed') })
  }
}

/** Cancels a publish still to come (`DELETE /api/builder/schedules/<id>`). */
async function cancelSchedule(schedule: Schedule): Promise<void> {
  acting.value = schedule.id
  try {
    await $api(`/api/builder/schedules/${schedule.id}`, { method: 'DELETE' })
    pending.value = pending.value.filter(entry => entry.id !== schedule.id)
    toast.add({ title: t('schedules.cancelled'), color: 'success', icon: 'i-lucide-calendar-x' })
  }
  catch (error) {
    notify('builder:schedule-cancel', error, { title: t('schedules.cancelFailed') })
  }
  finally {
    acting.value = undefined
  }
}

/** Says a failed publish was seen (`POST /api/builder/schedules/<id>/acknowledge`): it stops being listed. */
async function acknowledge(schedule: Schedule): Promise<void> {
  acting.value = schedule.id
  try {
    await $api(`/api/builder/schedules/${schedule.id}/acknowledge`, { method: 'POST' })
    failed.value = failed.value.filter(entry => entry.id !== schedule.id)
  }
  catch (error) {
    notify('builder:schedule-acknowledge', error, { title: t('schedules.acknowledgeFailed') })
  }
  finally {
    acting.value = undefined
  }
}

/** Whether a problem has somewhere to be shown: the theme panel's rule, or a node. */
const showable = (problem: PublishProblem) => problem.document === BUILDER_THEME_DOCUMENT || Boolean(builderProblemNodeId(problem.path))

/** The element the focus goes to once the dialog has closed, in place of the Publish button. */
let focusAfterClose: string | undefined

/**
 * The dialog gives the focus back to the Publish button as it closes;
 * where it was closed to show something, the focus goes there instead.
 */
function onCloseAutoFocus(event: Event): void {
  const target = focusAfterClose ? window.document.getElementById(focusAfterClose) : null
  focusAfterClose = undefined
  if (!target) return
  event.preventDefault()
  target.scrollIntoView({ block: 'center' })
  target.focus()
}

/**
 * Takes the staff member to a rule of the theme panel (`rule`, the id
 * Django names in the problem's params, `ThemePanel`'s `theme-rule-<id>`):
 * the panel opens and the rule takes the focus.
 */
async function showThemeRule(rule?: string): Promise<void> {
  focusAfterClose = rule ? `theme-rule-${rule}` : undefined
  await openPanel('theme')
  open.value = false
}

/** Takes the staff member to what a problem is about: its document, and the node selected; a theme problem, to its rule. */
async function show(problem: Pick<PublishProblem, 'document' | 'path' | 'params'>): Promise<void> {
  if (problem.document === BUILDER_THEME_DOCUMENT) return showThemeRule(problem.params?.rule)
  const key = problem.document ?? documentKey.value
  const nodeId = builderProblemNodeId(problem.path)
  open.value = false
  if (key !== documentKey.value && !store.groups.some(entry => entry.key === key)) await openDocument(key)
  if (nodeId) await select(builderNodeRef(key, nodeId))
}
</script>

<template>
  <template v-if="store.canEdit">
    <UChip
      :show="anyChanged"
      color="warning"
      inset
    >
      <UButton
        icon="i-lucide-rocket"
        :label="t('publish')"
        size="sm"
        :disabled="store.status !== 'ready'"
        @click="begin"
      />
    </UChip>
    <UModal
      v-model:open="open"
      :title="t('title')"
      :description="t('description')"
      :content="{ onCloseAutoFocus }"
    >
      <template #body>
        <form
          id="builder-publish"
          class="flex flex-col gap-4"
          @submit.prevent="publish"
        >
          <UCheckboxGroup
            v-model="picked"
            :items="items"
            :legend="t('documents')"
          />
          <URadioGroup
            v-model="when"
            :items="whenItems"
            :legend="t('when.label')"
            orientation="horizontal"
            variant="table"
            indicator="hidden"
            size="sm"
          />
          <UFormField
            v-if="when === 'later'"
            :label="t('at.label')"
            :help="t('at.help', { zone: timeZone })"
            :error="atInvalid ? t('at.past') : undefined"
          >
            <UInputDate
              v-model="at"
              granularity="minute"
              :hour-cycle="24"
              :min-value="earliest()"
              :locale="locale"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('note')"
            :help="t('noteHelp')"
          >
            <UTextarea
              v-model="note"
              :maxlength="NOTE_MAX_LENGTH"
              :rows="2"
              autoresize
              class="w-full"
            />
          </UFormField>
          <UAlert
            v-if="unsaved.length"
            color="warning"
            variant="subtle"
            icon="i-lucide-cloud-off"
            :title="t('unsaved.title')"
            :description="t('unsaved.description', { documents: unsaved.map(labelOf).join(', ') })"
          />
          <UAlert
            v-if="problems.length"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="t('problems', { count: problems.length }, problems.length)"
          >
            <template #description>
              <ul class="mt-1 flex flex-col gap-1">
                <li
                  v-for="(problem, index) in problems"
                  :key="index"
                  class="flex items-start justify-between gap-2"
                >
                  <span>
                    <span
                      v-if="problem.document"
                      class="font-medium"
                    >{{ labelOf(problem.document) }}: </span>{{ problem.message }}
                  </span>
                  <UButton
                    v-if="showable(problem)"
                    color="error"
                    variant="link"
                    size="xs"
                    class="shrink-0"
                    :label="t('show')"
                    @click="() => show(problem)"
                  />
                </li>
              </ul>
            </template>
          </UAlert>
          <UAlert
            v-if="themeWarnings.length"
            color="warning"
            variant="subtle"
            icon="i-lucide-contrast"
            :title="t('themeWarnings.title', { count: themeWarnings.length }, themeWarnings.length)"
            :description="t('themeWarnings.description')"
            :actions="[{ label: t('show'), color: 'warning', variant: 'link', size: 'xs', onClick: () => showThemeRule(themeWarnings[0]?.rule.id) }]"
          />
        </form>
        <section
          v-if="failed.length || pending.length"
          class="mt-6 flex flex-col gap-3 border-t border-default pt-4"
          :aria-label="t('schedules.title')"
        >
          <h3 class="text-sm font-semibold text-highlighted">
            {{ t('schedules.title') }}
          </h3>
          <UAlert
            v-for="schedule in failed"
            :key="schedule.id"
            color="error"
            variant="subtle"
            icon="i-lucide-calendar-x-2"
            :title="t('schedules.failed', { when: formatTime(schedule.scheduledFor) })"
            :actions="[{ label: t('schedules.acknowledge'), color: 'error', variant: 'outline', size: 'xs', loading: acting === schedule.id, onClick: () => acknowledge(schedule) }]"
          >
            <template #description>
              <p>{{ schedule.documents.map(labelOf).join(', ') }}</p>
              <ul class="mt-1 list-disc ps-4">
                <li
                  v-for="(problem, index) in schedule.failure ?? []"
                  :key="index"
                >
                  <span
                    v-if="problem.document"
                    class="font-medium"
                  >{{ labelOf(problem.document) }}: </span>{{ problem.message }}
                </li>
              </ul>
            </template>
          </UAlert>
          <ul class="flex flex-col divide-y divide-default">
            <li
              v-for="schedule in pending"
              :key="schedule.id"
              class="flex items-start justify-between gap-3 py-2"
            >
              <div class="min-w-0 text-sm">
                <p class="font-medium text-highlighted">
                  {{ formatTime(schedule.scheduledFor) }}
                </p>
                <p class="text-muted">
                  {{ schedule.documents.map(labelOf).join(', ') }}
                </p>
                <p
                  v-if="schedule.note || schedule.scheduledBy"
                  class="text-dimmed"
                >
                  {{ [schedule.note, schedule.scheduledBy?.name].filter(Boolean).join(' · ') }}
                </p>
              </div>
              <UButton
                color="neutral"
                variant="outline"
                size="xs"
                class="shrink-0"
                :label="t('schedules.cancel')"
                :loading="acting === schedule.id"
                @click="() => cancelSchedule(schedule)"
              />
            </li>
          </ul>
        </section>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('cancel')"
            @click="() => { open = false }"
          />
          <UButton
            type="submit"
            form="builder-publish"
            :icon="when === 'later' ? 'i-lucide-calendar-clock' : 'i-lucide-rocket'"
            :label="when === 'later' ? t('confirmLater') : t('confirm')"
            :loading="publishing || checking"
            :disabled="picked.length === 0 || problems.length > 0"
          />
        </div>
      </template>
    </UModal>
  </template>
</template>

<i18n lang="yaml">
el:
  publish: Δημοσίευση
  title: Δημοσίευση στο κατάστημα
  description: Ό,τι επιλέξετε βγαίνει μαζί στους πελάτες, ή τίποτα από αυτά.
  documents: Τι δημοσιεύεται
  changed: Έχει αλλαγές που δεν έχουν δημοσιευτεί
  unchanged: Χωρίς αλλαγές
  note: Σημείωση
  noteHelp: Τι άλλαξε, για το ιστορικό. Προαιρετικό.
  unsaved:
    title: Δεν αποθηκεύτηκαν όλα
    description: "Δεν δημοσιεύτηκε τίποτα. Αποθηκεύστε πρώτα: {documents}."
  problems: "Ένα πρόβλημα πρέπει να διορθωθεί πρώτα | {count} προβλήματα πρέπει να διορθωθούν πρώτα"
  show: Εμφάνιση
  themeWarnings:
    title: "Ένα ζεύγος χρωμάτων του θέματος έχει λιγότερη αντίθεση από την προτεινόμενη | {count} ζεύγη χρωμάτων του θέματος έχουν λιγότερη αντίθεση από την προτεινόμενη"
    description: Δεν εμποδίζει τη δημοσίευση· κάποιοι πελάτες ίσως διαβάζουν δύσκολα.
  failed: Η δημοσίευση δεν έγινε
  checkFailed: Ο έλεγχος πριν από τη δημοσίευση δεν έγινε
  cancel: Άκυρο
  confirm: Δημοσίευση τώρα
  confirmLater: Προγραμματισμός
  when:
    label: Πότε
    now: Τώρα
    later: Σε συγκεκριμένη ώρα
  at:
    label: Ημερομηνία και ώρα
    help: "Στη δική σας ώρα ({zone}). Ελέγχεται τώρα και δημοσιεύεται όπως είναι τώρα."
    past: Διαλέξτε μια ώρα που δεν έχει περάσει.
  scheduled:
    title: Προγραμματίστηκε
    description: "Θα δημοσιευτεί στις {when}."
  done:
    title: Δημοσιεύτηκε
    description: "Οι πελάτες βλέπουν πλέον την έκδοση #{number}."
  schedules:
    title: Προγραμματισμένες δημοσιεύσεις
    failed: "Η δημοσίευση για τις {when} δεν έγινε"
    acknowledge: Το είδα
    cancel: Ακύρωση
    cancelled: Ο προγραμματισμός ακυρώθηκε
    loadFailed: Οι προγραμματισμένες δημοσιεύσεις δεν φορτώθηκαν
    cancelFailed: Ο προγραμματισμός δεν ακυρώθηκε
    acknowledgeFailed: Δεν καταγράφηκε ότι το είδατε
en:
  publish: Publish
  title: Publish to the store
  description: What you pick goes live for shoppers together, or none of it does.
  documents: What to publish
  changed: Has changes that are not published
  unchanged: No changes
  note: Note
  noteHelp: What changed, for the history. Optional.
  unsaved:
    title: Not everything is saved
    description: "Nothing was published. Save these first: {documents}."
  problems: "One problem must be fixed first | {count} problems must be fixed first"
  show: Show
  themeWarnings:
    title: "One colour pair of the theme has less contrast than recommended | {count} colour pairs of the theme have less contrast than recommended"
    description: It does not stop the publish; some shoppers may find them hard to read.
  failed: Publishing didn't work
  checkFailed: The check before publishing didn't work
  cancel: Cancel
  confirm: Publish now
  confirmLater: Schedule
  when:
    label: When
    now: Now
    later: At a set time
  at:
    label: Date and time
    help: "In your own time ({zone}). Checked now, and published as it is now."
    past: Pick a time that has not passed.
  scheduled:
    title: Scheduled
    description: "It will be published on {when}."
  done:
    title: Published
    description: "Shoppers now see release #{number}."
  schedules:
    title: Scheduled publishes
    failed: "The publish set for {when} did not happen"
    acknowledge: Got it
    cancel: Unschedule
    cancelled: The schedule was cancelled
    loadFailed: The scheduled publishes could not be loaded
    cancelFailed: The schedule was not cancelled
    acknowledgeFailed: Could not record that you saw it
</i18n>
