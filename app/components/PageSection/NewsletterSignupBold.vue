<script lang="ts" setup>
/**
 * The newsletter band in its bold look (`newsletter_signup` with
 * `look: 'bold'`, every design): the same signup as `PageSection/NewsletterSignup`
 * (`useNewsletterSignup`: the double opt-in, the consent sentence, when a form
 * may be offered), laid out the bold way. On a desk a muted band between two
 * rules, 88px below the band above when its shell lays bands out `open`, the
 * promise on the left and the form on the right (at most 480px); on a phone a
 * bordered muted card with the form stacked under the promise. The heading is
 * heavier (22px on a phone, 30px on a desk, at 800) and an accent heading
 * takes `--ds-accent-heading`: the accent's deep shade on a light ground,
 * the accent as text on a dark one.
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
  /** Always `bold` here: the setting that chose this look. */
  look?: 'bold'
}>(), {
  surface: 'muted',
})

const { t } = useStoreI18n('components/PageSection/NewsletterSignupBold')
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

const open = useBandFlow() === 'open'
</script>

<template>
  <section
    v-if="available"
    data-newsletter-section
    class="
      w-full pt-11
      lg:border-y lg:border-default lg:bg-muted lg:pt-0
    "
    :class="open ? 'lg:mt-22' : 'lg:mt-0'"
  >
    <UContainer>
      <div
        class="
          flex flex-col gap-2.5 rounded-xl border border-default bg-muted px-4
          py-5
          lg:flex-row lg:flex-wrap lg:items-center lg:justify-between
          lg:gap-x-12 lg:gap-y-6 lg:rounded-none lg:border-0 lg:bg-transparent
          lg:px-0 lg:py-12
        "
      >
        <div
          class="
            flex flex-col gap-2
            lg:flex-[1_1_22.5rem]
          "
        >
          <h2
            class="
              font-display text-[1.375rem]/[1.25] font-extrabold text-balance
              wrap-break-word
              lg:text-[1.875rem]/[1.2]
            "
            :class="headingColor === 'accent' ? 'text-(--ds-accent-heading)' : `
              text-highlighted
            `"
          >
            {{ heading || t('heading') }}
          </h2>
          <p
            class="
              text-[0.9375rem]/normal text-pretty text-muted
              lg:text-lg/normal
            "
          >
            {{ description || t('description') }}
          </p>
        </div>

        <div
          class="
            mt-1 w-full
            lg:mt-0 lg:max-w-120 lg:flex-[1_1_22.5rem]
          "
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
              class="
                flex flex-col gap-2.5
                lg:flex-row lg:items-start lg:gap-2
              "
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
                  :ui="{ base: 'min-h-12' }"
                />
              </UFormField>
              <UButton
                type="submit"
                :label="buttonText || t('submit')"
                :loading="submitting"
                color="secondary"
                size="xl"
                trailing-icon="i-heroicons-arrow-right"
                class="
                  min-h-12 shrink-0 justify-center px-5 text-[0.9375rem]
                  font-semibold
                "
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
    </UContainer>
  </section>
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
