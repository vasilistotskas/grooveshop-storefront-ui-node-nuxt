<script lang="ts" setup>
import { type Cookie, COOKIE_ID_SEPARATOR, ZodCookieTypeEnum } from '#cookie-control/types'
import { getCookieIds } from '#cookie-control/methods'

const { t } = useI18n()
const { $i18n } = useNuxtApp()

const { cookiesEnabled, cookiesEnabledIds, isConsentGiven, isModalActive, moduleOptions } = useCookieControl()

const localCookiesEnabled = ref([...(cookiesEnabled.value || [])])

const onModalClick = () => {
  if (moduleOptions.closeModalOnClickOutside) {
    isModalActive.value = false
  }
}

const resolveLinkEntryText = (entry: [string, unknown]) => (typeof entry[1] === 'string' ? t(entry[1] as string) : entry[0])

const getName = (name: string) => t(name)

const getDescription = (description: string) =>
  `${!moduleOptions.isDashInDescriptionEnabled ? '' : '-'} ${t(description)}`

const toggleButton = ($event: MouseEvent) => {
  const target = $event.target as HTMLButtonElement | null
  if (!target) return
  const nextSibling = target.nextSibling as HTMLLabelElement | null
  if (!nextSibling) return
  nextSibling.click()
}

const toggleCookie = (cookie: Cookie) => {
  const cookieIndex = getCookieIds(localCookiesEnabled.value).indexOf(cookie.id)
  if (cookieIndex < 0) {
    localCookiesEnabled.value.push(cookie)
  }
  else {
    if (getName(cookie.name) === t('cookies.necessary')) {
      return
    }
    localCookiesEnabled.value.splice(cookieIndex, 1)
  }
}

const toggleLabel = ($event: KeyboardEvent) => {
  const target = $event.target as HTMLLabelElement | null
  if (!target) return
  if ($event.key === ' ') {
    target.click()
  }
}

const setCookies = ({
  cookiesOptionalEnabled: cookiesOptionalEnabledNew,
  isConsentGiven: isConsentGivenNew,
}: {
  cookiesOptionalEnabled: Cookie[]
  isConsentGiven: boolean
}) => {
  isConsentGiven.value = isConsentGivenNew // must come before an update to `cookiesEnabled`
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
    isConsentGiven: false,
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
  <Transition name="cookie-control-Modal">
    <div
      v-if="isModalActive"
      class="cookie-control-Modal"
      @click.self="onModalClick"
    >
      <p
        v-if="isUnSaved"
        class="cookie-control-ModalUnsaved"
        v-text="t('settings.unsaved')"
      />
      <div class="cookie-control-ModalContent">
        <div class="cookie-control-ModalContentInner">
          <slot name="modal">
            <h2>{{ t('modal.title') }}</h2>
            <p>{{ t('modal.description') }}</p>
          </slot>
          <button
            v-if="!moduleOptions.isModalForced"
            class="cookie-control-ModalClose"
            type="button"
            @click="isModalActive = false"
            v-text="t('close')"
          />
          <template
            v-for="cookieType in ZodCookieTypeEnum.enum"
            :key="cookieType"
          >
            <template v-if="moduleOptions.cookies[cookieType].length">
              <h2
                v-text="cookieType === ZodCookieTypeEnum.enum.necessary ? $i18n.t('cookies.necessary') : $i18n.t('cookies.optional')"
              />
              <ul>
                <li
                  v-for="cookie in moduleOptions.cookies[cookieType]"
                  :key="cookie.id"
                >
                  <div class="cookie-control-ModalInputWrapper">
                    <input
                      v-if="cookieType === ZodCookieTypeEnum.enum.necessary && getName(cookie.name) === $i18n.t('cookies.necessary')"
                      :id="cookie.id"
                      class="sr-only"
                      :name="getName(cookie.name)"
                      :placeholder="getName(cookie.name)"
                      checked
                      disabled
                      type="checkbox"
                    >
                    <input
                      v-else
                      :id="cookie.id"
                      :checked="getCookieIds(localCookiesEnabled).includes(cookie.id)"
                      type="checkbox"
                      @change="toggleCookie(cookie)"
                    >
                    <button
                      type="button"
                      @click="toggleButton($event)"
                    >
                      {{ getName(cookie.name) }}
                    </button>
                    <label
                      :for="getName(cookie.name)"
                      class="cookie-control-ModalCookieName"
                      tabindex="0"
                      @click="toggleCookie(cookie)"
                      @keydown="toggleLabel($event)"
                    >
                      {{ getName(cookie.name) }}
                      <span v-if="moduleOptions.isCookieIdVisible && cookie.targetCookieIds">
                        {{ 'IDs: ' + cookie.targetCookieIds.map((id) => `"${id}"`).join(', ') }}
                      </span>
                      <template v-if="Object.entries(cookie.links || {}).length">
                        <span
                          v-for="entry in Object.entries(cookie.links || {})"
                          :key="entry[0]"
                        >
                          <a :href="entry[0]">{{ resolveLinkEntryText(entry) }}</a>
                        </span>
                      </template>
                    </label>
                    <ReadMore
                      v-if="cookie.description"
                      :max-chars="100"
                      :text="getDescription(cookie.description)"
                      class="mt-2"
                    />
                  </div>
                </li>
              </ul>
            </template>
          </template>
          <div class="cookie-control-ModalButtons">
            <button
              type="button"
              @click="() => { acceptPartial(); isModalActive = false }"
              v-text="t('save')"
            />
            <button
              type="button"
              @click="() => { accept(); isModalActive = false }"
              v-text="t('accept_all')"
            />
            <button
              v-if="!moduleOptions.isModalForced"
              type="button"
              @click="() => { declineAll(); isModalActive = false }"
              v-text="t('decline_all')"
            />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<i18n lang="yaml">
el:
  title: Cookies
  accept: Αποδοχή
  accept_all: Αποδοχή όλων
  modal:
    title: Προσαρμογή
    description: Χρησιμοποιούμε διαφορετικούς τύπους cookies για να βελτιστοποιήσουμε
      την εμπειρία σας στον ιστότοπο μας. Κάνε click στις παρακάτω κατηγορίες για
      να μάθεις περισσότερα σχετικά με τους σκοπούς τους. Μπορείς να επιλέξεις τους
      τύπους Cookies που θα επιτρέπονται καθώς και να αλλάξεις τις προτιμήσεις σου
      αργότερα. Να θυμάσαι ότι η απαγόρευση των cookies μπορεί να επηρεάσει την
      εμπειρία σαυ.
  close: Κλείσιμο
  decline_all: Απόρριψη όλων
  save: Αποθήκευση
  settings:
    unsaved: Έχεις μη αποθηκευμένες αλλαγές
</i18n>
