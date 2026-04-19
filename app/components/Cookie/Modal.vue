<script lang="ts" setup>
import { type Cookie, COOKIE_ID_SEPARATOR, ZodCookieTypeEnum } from '#cookie-control/types'
import { getCookieIds } from '#cookie-control/methods'

// Migrated to UModal so that focus-trap, body scroll lock, ESC-to-close,
// aria-modal and click-outside dismissal come from Reka UI Dialog by
// default — the previous hand-rolled overlay (`fixed inset-0 z-[1000]
// @click.self`) only handled click-outside and missed every other a11y
// requirement.

const { t } = useI18n()

const { cookiesEnabled, cookiesEnabledIds, isConsentGiven, isModalActive, moduleOptions } = useCookieControl()

const localCookiesEnabled = ref([...(cookiesEnabled.value || [])])

// Forced modals (first-visit consent) must not be dismissible — disable
// click-outside + ESC + hide the close button so users cannot bypass
// the consent step.
const dismissible = computed(() => !moduleOptions.isModalForced)

const resolveLinkEntryText = (entry: [string, unknown]) =>
  typeof entry[1] === 'string' ? t(entry[1] as string) : entry[0]

const getName = (name: string) => t(name)

const getDescription = (description: string) =>
  `${!moduleOptions.isDashInDescriptionEnabled ? '' : '-'} ${t(description)}`

function isCookieEnabled(cookie: Cookie) {
  return localCookiesEnabled.value.some(c => c.id === cookie.id)
}

const toggleCookie = (cookie: Cookie, cookieType: string) => {
  const cookieIndex = getCookieIds(localCookiesEnabled.value).indexOf(cookie.id)
  if (cookieIndex < 0) {
    localCookiesEnabled.value.push(cookie)
    cookiesEnabledIds.value = getCookieIds(localCookiesEnabled.value)
  }
  else {
    if (cookieType === ZodCookieTypeEnum.enum.necessary) {
      cookiesEnabledIds.value = getCookieIds(localCookiesEnabled.value)
      return
    }
    localCookiesEnabled.value.splice(cookieIndex, 1)
    cookiesEnabledIds.value = getCookieIds(localCookiesEnabled.value)
  }
}

const setCookies = ({
  cookiesOptionalEnabled: cookiesOptionalEnabledNew,
  isConsentGiven: isConsentGivenNew,
}: {
  cookiesOptionalEnabled: Cookie[]
  isConsentGiven: boolean
}) => {
  isConsentGiven.value = isConsentGivenNew
  cookiesEnabled.value = isConsentGivenNew
    ? [
        ...moduleOptions.cookies.necessary,
        ...moduleOptions.cookies.optional.filter(cookieOptional => cookiesOptionalEnabledNew.includes(cookieOptional)),
      ]
    : []
  cookiesEnabledIds.value = isConsentGivenNew ? getCookieIds(cookiesEnabled.value) : []
}

const accept = () => {
  setCookies({
    isConsentGiven: true,
    cookiesOptionalEnabled: moduleOptions.cookies.optional,
  })
}

const acceptPartial = () => {
  const localCookiesEnabledIds = getCookieIds(localCookiesEnabled.value)
  setCookies({
    isConsentGiven: true,
    cookiesOptionalEnabled: [
      ...moduleOptions.cookies.necessary,
      ...moduleOptions.cookies.optional,
    ].filter(cookie => localCookiesEnabledIds.includes(cookie.id)),
  })
}

const declineAll = () => {
  setCookies({
    isConsentGiven: true,
    cookiesOptionalEnabled: [],
  })
}

const isUnSaved = computed(() => {
  return getCookieIds(cookiesEnabled.value || [])
    .sort()
    .join(COOKIE_ID_SEPARATOR) !== getCookieIds(localCookiesEnabled.value).sort().join(COOKIE_ID_SEPARATOR)
})
</script>

<template>
  <UModal
    v-model:open="isModalActive"
    :title="t('modal.title')"
    :description="t('modal.description')"
    :dismissible="dismissible"
    :close="dismissible"
    scrollable
    :ui="{
      content: 'max-w-3xl',
    }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <template
          v-for="cookieType in ZodCookieTypeEnum.enum"
          :key="cookieType"
        >
          <div v-if="moduleOptions.cookies[cookieType].length">
            <h3
              class="
                mb-2 text-lg font-semibold text-primary-600
                dark:text-primary-100
              "
              v-text="cookieType === ZodCookieTypeEnum.enum.necessary ? t('cookies.necessary') : t('cookies.optional')"
            />
            <ul class="flex flex-col gap-3">
              <li
                v-for="cookie in moduleOptions.cookies[cookieType]"
                :key="cookie.id"
                class="
                  rounded-md border border-primary-200 bg-primary-100 p-3
                  md:p-5
                  dark:border-primary-700 dark:bg-primary-700
                "
              >
                <div class="flex flex-col">
                  <USwitch
                    :model-value="isCookieEnabled(cookie)"
                    color="secondary"
                    size="xl"
                    unchecked-icon="i-heroicons-x-mark"
                    checked-icon="i-heroicons-check"
                    :label="getName(cookie.name)"
                    :disabled="cookieType === ZodCookieTypeEnum.enum.necessary"
                    :ui="{
                      root: 'w-full flex-row-reverse',
                      base: 'cursor-pointer',
                      wrapper: 'm-0 w-full',
                      label: 'cursor-pointer',
                    }"
                    @update:model-value="(_: boolean) => toggleCookie(cookie, cookieType)"
                  />
                  <div>
                    <span
                      v-if="moduleOptions.isCookieIdVisible && cookie.targetCookieIds && cookie.targetCookieIds.length"
                      class="mt-2 block text-xs font-normal"
                    >
                      {{ 'IDs: ' + cookie.targetCookieIds.map((id) => `"${id}"`).join(', ') }}
                    </span>
                    <template v-if="Object.entries(cookie.links || {}).length">
                      <span
                        v-for="entry in Object.entries(cookie.links || {})"
                        :key="entry[0]"
                      >
                        <a
                          :href="entry[0]"
                          class="
                            text-blue-600 underline
                            hover:text-blue-800
                          "
                        >
                          {{ resolveLinkEntryText(entry) }}
                        </a>
                      </span>
                    </template>
                  </div>
                  <ReadMore
                    v-if="cookie.description"
                    :max-chars="100"
                    :text="getDescription(cookie.description)"
                    class="mt-2"
                  />
                </div>
              </li>
            </ul>
          </div>
        </template>

        <p
          v-if="isUnSaved"
          role="status"
          aria-live="polite"
          class="
            rounded-md border border-primary-200 bg-primary-50 p-3 text-center
            text-sm
            dark:border-primary-700 dark:bg-primary-800
          "
          v-text="t('settings.unsaved')"
        />
      </div>
    </template>

    <template #footer>
      <div
        class="
          grid w-full gap-2
          md:flex md:justify-between md:gap-0
        "
      >
        <UButton
          v-if="dismissible"
          :label="t('decline_all')"
          color="neutral"
          variant="outline"
          size="lg"
          @click="() => { declineAll(); isModalActive = false }"
        />
        <div
          class="
            grid gap-2
            md:flex
          "
        >
          <UButton
            :label="t('accept_all')"
            color="neutral"
            variant="outline"
            size="lg"
            @click="() => { accept(); isModalActive = false }"
          />
          <UButton
            :label="t('save')"
            color="secondary"
            variant="solid"
            size="lg"
            @click="() => { acceptPartial(); isModalActive = false }"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  title: Cookies
  accept: Αποδοχή
  accept_all: Αποδοχή όλων
  modal:
    title: Προσαρμογή
    description: "Χρησιμοποιούμε διαφορετικούς τύπους cookies για να βελτιστοποιήσουμε την εμπειρία σας στον ιστότοπο μας. Κάνε click στις παρακάτω κατηγορίες για να μάθεις περισσότερα σχετικά με τους σκοπούς τους. Μπορείς να επιλέξεις τους τύπους Cookies που θα επιτρέπονται καθώς και να αλλάξεις τις προτιμήσεις σου αργότερα. Να θυμάσαι ότι η απαγόρευση των cookies μπορεί να επηρεάσει την εμπειρία σου."
  close: Κλείσιμο
  decline_all: Απόρριψη όλων
  save: Αποθήκευση
  settings:
    unsaved: Έχεις μη αποθηκευμένες αλλαγές
</i18n>
