<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  userAccount: {
    type: Object as PropType<UserDetails>,
    required: true,
  },
  showName: {
    type: Boolean,
    required: false,
    default: true,
  },
  imgWidth: {
    type: Number,
    required: false,
    default: 50,
  },
  imgHeight: {
    type: [Number, String],
    required: false,
    default: 50,
  },
  backgroundBorder: {
    type: Boolean,
    required: false,
    default: false,
  },
  changeAvatar: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const {
  userAccount,
  showName,
  imgWidth,
  imgHeight,
  backgroundBorder,
  changeAvatar,
} = toRefs(props)

const { t } = useI18n()
const toast = useToast()
const { fetch } = useUserSession()
const { $i18n } = useNuxtApp()
const { enabled } = useAuthPreviewMode()

const loading = ref(false)

const alt = computed(() => {
  return userAccount.value?.firstName + ' ' + userAccount.value?.lastName
})

const uploadImage = async (event: Event) => {
  loading.value = true
  const allowedExtensions = ['jpg', 'jpeg', 'png']
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  const fileExtensionAllowed = allowedExtensions.includes(
    file?.name.split('.').pop()?.toLowerCase() || '',
  )

  if (!file) {
    loading.value = false
    return toast.add({
      title: t('no_file_selected'),
      color: 'error',
    })
  }
  if (!fileExtensionAllowed) {
    loading.value = false
    return toast.add({
      title: t('file_extension_not_allowed'),
      color: 'error',
    })
  }

  const formData = new FormData()
  formData.append('image', file)

  if (!userAccount.value) {
    loading.value = false
    return
  }

  await $fetch(`/api/user/account/${userAccount.value.id}`, {
    method: 'PATCH',
    headers: useRequestHeaders(),
    body: formData,
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('image.updated'),
        color: 'success',
      })
      await fetch()
    },
    onResponseError() {
      toast.add({
        title: t('image.upload.error'),
        color: 'error',
      })
    },
  })
}

const avatarContainerStyle = computed(() => {
  return {
    width: imgWidth.value + 'px',
    height: imgHeight.value + 'px',
  }
})
</script>

<template>
  <UTooltip
    :text="enabled ? t('preview_mode') : ''"
    :class="[showName ? 'gap-2' : 'gap-0']"
    class="flex flex-col items-center"
    arrow
  >
    <div
      :class="{
        'inline-block size-[135px] shrink-0 text-center align-middle': backgroundBorder,
        'hover:cursor-pointer': true,
      }"
      :style="avatarContainerStyle"
      class="
        group relative grid items-center justify-center justify-items-center
      "
    >
      <ImgWithFallback
        :alt="alt"
        :background="'transparent'"
        :class="`
          ${enabled ? 'border-2 border-orange-500' : ''}
        `"
        fit="cover"
        :height="imgHeight"
        :sizes="`sm:${imgWidth}px md:${imgWidth}px lg:${imgWidth}px xl:${imgWidth}px xxl:${imgWidth}px 2xl:${imgWidth}px`"
        :src="userAccount.mainImagePath"
        :style="{ objectFit: 'contain' }"
        :width="imgWidth"
        class="rounded-full bg-primary-100"
        densities="x1"
        loading="lazy"
        @load="() => (loading = false)"
      />

      <form
        v-if="changeAvatar"
        :title="t('change')"
        class="absolute inset-0 z-10"
        enctype="multipart/form-data"
        name="uploadImageForm"
        @submit.prevent="uploadImage"
      >
        <label
          class="
            absolute top-0 left-0 grid h-full w-full cursor-pointer
            place-items-center
          "
          for="selfie"
        >
          <svg
            id="camera"
            class="
              h-14 w-18 stroke-white opacity-0 transition-opacity duration-200
              group-hover:opacity-100
            "
            viewBox="0 0 25 15"
            x="0px"
            xml:space="preserve"
            xmlns="http://www.w3.org/2000/svg"
            y="0px"
          >
            <path
              id="cameraFrame"
              d="M23.1,14.1H1.9c-0.6,0-1-0.4-1-1V1.9c0-0.6,0.4-1,1-1h21.2
           c0.6,0,1,0.4,1,1v11.3C24.1,13.7,23.7,14.1,23.1,14.1z"
              fill="none"
              stroke="currentColor"
              stroke-miterlimit="10"
            />
            <path
              id="circle"
              d="M17.7,7.5c0-2.8-2.3-5.2-5.2-5.2S7.3,4.7,7.3,7.5s2.3,5.2,5.2,5.2
           S17.7,10.3,17.7,7.5z"
              fill="none"
              stroke="currentColor"
              stroke-miterlimit="12"
              stroke-width="1.4"
            />
            <g id="plus">
              <path
                id="plusLine"
                d="M20.9,2.3v4.4"
                fill="none"
                stroke="currentColor"
                stroke-miterlimit="10"
              />
              <path
                d="M18.7,4.6h4.4"
                fill="none"
                stroke="currentColor"
                stroke-miterlimit="10"
              />
            </g>
          </svg>
          <span class="sr-only">{{ t('change') }}</span>
        </label>
        <label
          class="
            grid h-full w-full
            md:hidden
          "
          for="selfie"
        >
          <span class="sr-only">{{ t('change') }}</span>
        </label>
        <input
          id="selfie"
          :disabled="loading"
          accept="image/*"
          capture="user"
          class="sr-only"
          name="selfie"
          type="file"
          @change="uploadImage"
        >
        <button
          class="sr-only"
          type="submit"
        >
          {{ $i18n.t('upload') }}
        </button>
      </form>
    </div>
    <div
      v-if="showName"
      class="flex flex-col"
    >
      <span
        class="
          font-bold text-primary-950
          dark:text-primary-50
        "
      >
        {{ userAccount?.firstName }}
      </span>
    </div>
  </UTooltip>
</template>

<i18n lang="yaml">
el:
  change: Αλλαγή
  no_file_selected: Κανένα επιλεγμένο αρχείο
  file_extension_not_allowed: Δεν επιτρέπεται η επέκταση αρχείου
  preview_mode: Preview
  image:
    updated: Η εικόνα ενημερώθηκε
    upload:
      error: Σφάλμα ανέβασμα εικόνας
</i18n>
