<script lang="ts" setup>
/**
 * The newsletter band: an email form for the store's default newsletter
 * topic, open to everyone — signed in or not. The signup itself — the
 * double opt-in, the consent sentence, when a form may be offered — is
 * `useNewsletterSignup`, shared with the footer's form.
 *
 * Laid out as a STATEMENT — the promise on the left, the one action on
 * the right — like `cta_banner`, so the two conversion bands read as
 * the same kind of thing and neither is a centred icon over a heading.
 *
 * A page that draws the band draws no second form: `data-newsletter-section`
 * hides the footer's (`main.css`, "One newsletter form a page").
 */
import type { FormSubmitEvent } from '@nuxt/ui'

withDefaults(defineProps<{
  heading?: string
  description?: string
  placeholder?: string
  buttonText?: string
  surface?: 'default' | 'muted'
  /**
   * The heading's colour: the theme's heading colour, or its accent (the
   * token the hero's accent line paints with). The heading is large text
   * (24px and up), so AA asks 3:1: the theme's contrast rules check the
   * accent against that on both grounds in both designs
   * (`themeContrastRulesFor`: `accent-light` / `accent-dark` on the page,
   * `accent-muted-light` / `accent-muted-dark` on the muted ground). They
   * are warnings: the theme panel lists a failing one with a Fix, and
   * nothing stops or flags a publish for it.
   */
  headingColor?: 'accent'
}>(), {
  surface: 'muted',
})

const { t } = useStoreI18n('components/PageSection/NewsletterSignup')
const localePath = useLocalePath()

const { available, consent, schema, state, submitting, outcome, failure, subscribe }
  = await useNewsletterSignup({ consentRequired: () => t('consent_required') })

const errorMessage = computed(() => {
  const value = failure.value
  if (!value) return ''
  if (value.kind === 'rate_limited') return t('error.rate_limited')
  if (value.kind === 'fields') return formatDrfFieldErrors(value.errors, t)
  return t('failed')
})

async function onSubmit(event: FormSubmitEvent<Parameters<typeof subscribe>[0]>) {
  await subscribe(event.data)
}

/**
 * The base design (a store with its own templates, webside), laid out `open`
 * (`useBandFlow`), draws its board's newsletter: on a desk a muted band
 * between two rules, 88px below the band above, the promise on the left and
 * the form on the right (at most 480px); on a phone a bordered muted card,
 * the form stacked under the promise. Both with a heavier heading. Groove
 * Volt, and a band framed on a page, keep the band as it was.
 */
const design = useStorefrontDesign()
const own = design.value !== 'volt' && useBandFlow() === 'open'

const [DefineContent, ReuseContent] = createReusableTemplate()
</script>

<template>
  <DefineContent>
    <div
      class="flex flex-col"
      :class="own ? `
        gap-2.5 rounded-xl border border-default bg-muted px-4 py-5
        lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-12
        lg:gap-y-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0
        lg:py-12
      ` : `
        gap-5
        md:flex-row md:items-center md:justify-between md:gap-10
      `"
    >
      <div
        class="flex flex-col gap-2"
        :class="own ? 'lg:flex-[1_1_22.5rem]' : 'max-w-2xl'"
      >
        <h2
          class="font-display text-balance wrap-break-word"
          :class="[
            own ? `
              text-[1.375rem]/[1.25] font-extrabold
              lg:text-[1.875rem]/[1.2]
            ` : `
              text-2xl font-semibold tracking-tight
              md:text-3xl
            `,
            headingColor === 'accent' ? 'text-accent' : 'text-highlighted',
          ]"
        >
          {{ heading || t('heading') }}
        </h2>
        <p
          class="text-pretty text-muted"
          :class="own ? `
            text-[0.9375rem]/normal
            lg:text-lg/normal
          ` : `
            text-base
            md:text-lg
          `"
        >
          {{ description || t('description') }}
        </p>
      </div>

      <div
        class="w-full"
        :class="own ? `
          mt-1
          lg:mt-0 lg:max-w-120 lg:flex-[1_1_22.5rem]
        ` : 'md:max-w-md'"
      >
        <div
          v-if="outcome === 'pending_confirmation'"
          role="status"
          class="flex items-start gap-3"
        >
          <UIcon
            name="i-heroicons-envelope-open"
            class="mt-0.5 size-6 shrink-0 text-success"
          />
          <div class="flex flex-col gap-1">
            <p class="font-semibold text-highlighted">
              {{ t('sent.title') }}
            </p>
            <p class="text-sm text-muted">
              {{ t('sent.description') }}
            </p>
          </div>
        </div>

        <div
          v-else-if="outcome === 'already_subscribed'"
          role="status"
          class="flex items-start gap-3"
        >
          <UIcon
            name="i-heroicons-check-circle"
            class="mt-0.5 size-6 shrink-0 text-success"
          />
          <div class="flex flex-col items-start gap-1">
            <p class="font-semibold text-highlighted">
              {{ t('already.title') }}
            </p>
            <p class="text-sm text-muted">
              {{ t('already.description') }}
            </p>
            <ULink
              :to="localePath('account-subscriptions')"
              class="
                text-sm text-primary underline underline-offset-2
                hover:text-primary/80
              "
            >
              {{ t('already.manage') }}
            </ULink>
          </div>
        </div>

        <UForm
          v-else
          :schema="schema"
          :state="state"
          class="flex flex-col gap-3"
          @submit="onSubmit"
        >
          <div
            class="flex flex-col gap-2"
            :class="own ? `
              gap-2.5
              lg:flex-row lg:items-start lg:gap-2
            ` : 'sm:flex-row sm:items-start'"
          >
            <UFormField
              name="email"
              :label="t('email_label')"
              :ui="{ label: 'sr-only' }"
              class="flex-1"
            >
              <UInput
                v-model="state.email"
                type="email"
                autocomplete="email"
                size="xl"
                :placeholder="placeholder || t('placeholder')"
                class="w-full"
                :ui="{ base: own ? 'min-h-12' : `
                  min-h-11
                  sm:min-h-0
                ` }"
              />
            </UFormField>
            <UButton
              type="submit"
              :label="buttonText || t('submit')"
              :loading="submitting"
              color="secondary"
              size="xl"
              trailing-icon="i-heroicons-arrow-right"
              class="shrink-0 justify-center"
              :class="own ? 'min-h-12 px-5 text-[0.9375rem] font-semibold' : `
                min-h-11
                sm:min-h-0
              `"
            />
          </div>

          <UFormField name="consent">
            <UCheckbox
              v-model="state.consent"
              :ui="{ label: 'text-sm/relaxed text-muted' }"
            >
              <template #label>
                {{ consent.before }}<ULink
                  :to="localePath('privacy-policy')"
                  class="
                    text-primary underline underline-offset-2
                    hover:text-primary/80
                  "
                >{{ consent.privacy }}</ULink>{{ consent.after }}
              </template>
            </UCheckbox>
          </UFormField>

          <p
            v-if="errorMessage"
            role="alert"
            class="text-sm whitespace-pre-line text-error"
          >
            {{ errorMessage }}
          </p>
        </UForm>
      </div>
    </div>
  </DefineContent>

  <section
    v-if="available && own"
    data-newsletter-section
    class="
      w-full pt-11
      lg:mt-22 lg:border-y lg:border-default lg:bg-muted lg:pt-0
    "
  >
    <UContainer>
      <ReuseContent />
    </UContainer>
  </section>
  <PageSectionBand
    v-else-if="available"
    :surface="surface"
    data-newsletter-section
  >
    <template #header>
      <ReuseContent />
    </template>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  heading: Μείνε ενημερωμένος
  description: Νέα προϊόντα και προσφορές, χωρίς θόρυβο.
  email_label: Το email σου
  placeholder: Το email σου
  submit: Εγγραφή
  consent_required: Τσέκαρε το πλαίσιο για να εγγραφείς.
  failed: Η εγγραφή δεν ολοκληρώθηκε. Δοκίμασε ξανά.
  sent:
    title: Έλεγξε τα εισερχόμενά σου
    description: Σου στείλαμε ένα email για την εγγραφή σου.
  already:
    title: Είσαι ήδη εγγεγραμμένος
    description: Ο λογαριασμός σου είναι ήδη εγγεγραμμένος στο ενημερωτικό δελτίο. Δεν χρειάζεται να κάνεις κάτι.
    manage: Διαχείριση εγγραφών
en:
  heading: Stay in the loop
  description: New products and offers, without the noise.
  email_label: Your email
  placeholder: Your email
  submit: Subscribe
  consent_required: Tick the box to subscribe.
  failed: The subscription did not go through. Please try again.
  sent:
    title: Check your inbox
    description: We sent you an email about your subscription.
  already:
    title: You are already subscribed
    description: Your account is already subscribed to the newsletter. There is nothing more to do.
    manage: Manage your subscriptions
</i18n>
