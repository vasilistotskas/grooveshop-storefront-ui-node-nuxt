<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The sage contact band: the phone as the headline, the email under it,
 * the address and the hours beside, and one button to the contact page.
 *
 * Nothing but the copy is a prop. The phone and email are the merchant's
 * published identity (what `Contact/MethodsCard` prints), the address is
 * the first of the store's public offices (`STORE_OFFICES`, what the
 * footer prints) and the hours are the `BUSINESS_HOURS` setting, so the
 * band cannot disagree with them. A piece the store has not published is
 * left out, with its label. `eyebrow`, `heading`, `body` and `hint` are
 * the section's own copy. `subjects` and `responseTime` belong to the
 * form variant and are not read.
 *
 * Consecutive days with the same hours print as one range ("Δευτέρα –
 * Παρασκευή"), and a closed day prints nothing.
 */
// The section row hands over every prop its type admits. The ones this
// band does not read must not fall through onto it as DOM attributes.
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  eyebrow?: string
  heading?: string
  body?: string
  hint?: string
}>()

const CONTACT_PATH = '/contact'

const { t } = useStoreI18n('components/PageSection/variants/ekfyseosfyteias/ContactPanel')
const { identity } = useMerchantIdentity()
const { offices } = useStoreOffices()
const { schedule } = useBusinessHours()

const label = computed(() => props.heading || props.title)

const phone = computed(() => identity.value?.phone?.trim() ?? '')
const email = computed(() => identity.value?.email?.trim() ?? '')

/** The `tel:` target: dialable characters only, the way the number is dialled. */
const phoneHref = computed(() => `tel:${phone.value.replace(/[^\d+]/g, '')}`)

const address = computed(() => {
  const office = offices.value[0]
  if (!office) return []
  return [
    [office.street, office.area].filter(Boolean).join(', '),
    [office.postal, office.city].filter(Boolean).join(' '),
  ].filter(Boolean)
})

const hours = computed(() => {
  if (!schedule.value) return []

  const runs: { first: WeekDayKey, last: WeekDayKey, span: string }[] = []
  for (const day of WEEK_DAY_KEYS) {
    const entry = schedule.value[day]
    if (!entry) continue
    const span = `${entry.opens} – ${entry.closes}`
    const previous = runs.at(-1)
    const continues = previous?.span === span
      && WEEK_DAY_KEYS.indexOf(previous.last) === WEEK_DAY_KEYS.indexOf(day) - 1
    if (previous && continues) previous.last = day
    else runs.push({ first: day, last: day, span })
  }

  return runs.map(run => ({
    days: run.first === run.last
      ? t(`days.${run.first}`)
      : `${t(`days.${run.first}`)} – ${t(`days.${run.last}`)}`,
    span: run.span,
  }))
})

const facts = computed(() => [
  { key: 'address', label: t('address'), lines: address.value },
  { key: 'hours', label: t('hours'), lines: hours.value.flatMap(run => [run.days, run.span]) },
].filter(fact => fact.lines.length))

const hasContent = computed(
  () => !!(label.value || phone.value || email.value || facts.value.length),
)
</script>

<template>
  <section
    v-if="hasContent"
    class="bg-(--fy-sage) text-(--fy-text)"
  >
    <div
      class="
        mx-auto grid w-full max-w-[1280px] items-end gap-x-[72px] gap-y-10
        px-6 py-[clamp(64px,7vw,96px)]
        grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))]
      "
    >
      <div class="flex flex-col items-start gap-[18px]">
        <p
          v-if="eyebrow"
          class="
            text-[13px] font-bold tracking-[0.16em] text-(--fy-eyebrow-on-sage)
            uppercase
          "
        >
          {{ eyebrow }}
        </p>
        <h2
          v-if="label"
          class="
            font-display text-[length:clamp(36px,3.8vw,54px)] leading-[1.04]
            font-extrabold text-balance
          "
        >
          {{ label }}
        </h2>
        <p
          v-if="body"
          class="max-w-[32em] text-[18px] leading-[1.65] text-pretty"
        >
          {{ body }}
        </p>
        <a
          v-if="phone"
          :href="phoneHref"
          class="
            font-display text-[length:clamp(44px,6vw,84px)] leading-none
            font-extrabold tracking-[-0.02em]
            [font-variant-numeric:lining-nums]
            focus-visible:outline-3 focus-visible:outline-offset-3
            focus-visible:outline-(--fy-focus)
          "
        >{{ phone }}</a>
        <a
          v-if="email"
          :href="`mailto:${email}`"
          class="
            inline-flex min-h-11 items-center text-xl font-semibold break-all
            underline underline-offset-4
            focus-visible:outline-3 focus-visible:outline-offset-3
            focus-visible:outline-(--fy-focus)
          "
        >{{ email }}</a>
      </div>

      <div class="flex flex-col items-start gap-7">
        <dl
          v-if="facts.length"
          class="
            grid w-full gap-6
            grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))]
          "
        >
          <div
            v-for="fact in facts"
            :key="fact.key"
            class="
              flex flex-col gap-1.5 border-t-[1.5px] border-dashed
              border-(--fy-text) pt-4
            "
          >
            <dt class="text-[13px] font-bold tracking-[0.12em] uppercase">
              {{ fact.label }}
            </dt>
            <dd class="text-[17px] leading-[1.6]">
              <span
                v-for="(line, index) in fact.lines"
                :key="index"
                class="block"
              >{{ line }}</span>
            </dd>
          </div>
        </dl>

        <p
          v-if="hint"
          class="text-[15px] leading-[1.6]"
        >
          {{ hint }}
        </p>

        <PageSectionVariantsEkfyseosfyteiasLink
          :to="CONTACT_PATH"
          look="ink"
          arrow
        >
          {{ t('write') }}
        </PageSectionVariantsEkfyseosfyteiasLink>
      </div>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  address: Διεύθυνση
  hours: Ωράριο
  write: Στείλτε μας μήνυμα
  days:
    mon: Δευτέρα
    tue: Τρίτη
    wed: Τετάρτη
    thu: Πέμπτη
    fri: Παρασκευή
    sat: Σάββατο
    sun: Κυριακή
en:
  address: Address
  hours: Opening hours
  write: Send us a message
  days:
    mon: Monday
    tue: Tuesday
    wed: Wednesday
    thu: Thursday
    fri: Friday
    sat: Saturday
    sun: Sunday
</i18n>
