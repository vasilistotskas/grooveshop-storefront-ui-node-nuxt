<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  userAccount: {
    type: Object as PropType<UserDetails>,
    required: true,
  },
  showName: {
    type: Boolean,
    default: true,
  },
  size: {
    type: String as PropType<'3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'>,
    default: 'sm',
  },
  changeAvatar: {
    type: Boolean,
    default: false,
  },
})

const { t } = useI18n()
const toast = useToast()
const img = useImage()
const { fetch } = useUserSession()
const { enabled } = useAuthPreviewMode()

const loading = ref(false)
const uploadFile = ref<File | null>(null)

const iconSizeClass = computed(() => {
  const sizeMap: Record<string, string> = {
    '3xs': 'size-3',
    '2xs': 'size-3',
    'xs': 'size-4',
    'sm': 'size-4',
    'md': 'size-5',
    'lg': 'size-6',
    'xl': 'size-6',
    '2xl': 'size-7',
    '3xl': 'size-8',
    '4xl': 'size-9',
    '5xl': 'size-10',
    '6xl': 'size-12',
    '7xl': 'size-14',
  }
  return sizeMap[props.size] || 'size-8'
})

const skeletonSizeClass = computed(() => {
  const sizeMap: Record<string, string> = {
    '3xs': 'size-4',
    '2xs': 'size-5',
    'xs': 'size-6',
    'sm': 'size-7',
    'md': 'size-8',
    'lg': 'size-9',
    'xl': 'size-10',
    '2xl': 'size-11',
    '3xl': 'size-12',
    '4xl': 'size-16',
    '5xl': 'size-20',
    '6xl': 'size-24',
    '7xl': 'size-28',
  }
  return sizeMap[props.size] || 'size-8'
})

const userImage = computed(() => {
  const image = props.userAccount?.mainImagePath
  if (!image) return ''

  return img(image, {
    width: 120,
    height: 120,
    fit: 'cover',
  }, {
    provider: 'mediaStream',
  })
})

const avatarSrc = computed(() => {
  if (uploadFile.value) {
    return URL.createObjectURL(uploadFile.value)
  }
  return userImage.value
})

const avatarAlt = computed(() => {
  return `${props.userAccount?.firstName} ${props.userAccount?.lastName}`
})

const handleUpload = async (file: File | null) => {
  if (!file) {
    return toast.add({
      title: t('no_file_selected'),
      color: 'error',
    })
  }

  const allowedExtensions = ['jpg', 'jpeg', 'png']
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''

  if (!allowedExtensions.includes(fileExtension)) {
    uploadFile.value = null
    return toast.add({
      title: t('file_extension_not_allowed'),
      color: 'error',
    })
  }

  loading.value = true

  const formData = new FormData()
  formData.append('image', file)

  if (!props.userAccount) {
    loading.value = false
    return
  }

  await $fetch(`/api/user/account/${props.userAccount.id}`, {
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
      uploadFile.value = null
    },
    onResponseError() {
      toast.add({
        title: t('image.upload.error'),
        color: 'error',
      })
      uploadFile.value = null
    },
  })

  loading.value = false
}

watch(uploadFile, (newFile) => {
  if (newFile) {
    handleUpload(newFile)
  }
})
</script>

<template>
  <UTooltip
    :text="enabled ? t('preview_mode') : ''"
    :class="showName ? 'gap-2' : 'gap-0'"
    class="flex flex-col items-center"
    arrow
  >
    <div class="group relative">
      <UAvatar
        v-if="!loading"
        :src="avatarSrc"
        :alt="avatarAlt"
        :size="size"
        :class="{
          'ring-2 ring-orange-500': enabled,
        }"
        class="transition-opacity"
      />

      <USkeleton
        v-else
        :class="skeletonSizeClass"
        class="rounded-full"
      />

      <UFileUpload
        v-if="changeAvatar && !loading"
        v-slot="{ open }"
        v-model="uploadFile"
        accept="image/jpeg,image/jpg,image/png"
        class="absolute inset-0 cursor-pointer"
        :interactive="false"
      >
        <button
          type="button"
          :title="t('change')"
          class="
            absolute inset-0 flex cursor-pointer items-center justify-center
            rounded-full bg-black/50 opacity-0 transition-opacity duration-200
            group-hover:opacity-100
          "
          @click="open()"
        >
          <UIcon
            name="i-lucide-camera"
            :class="iconSizeClass"
            class="text-white"
          />
          <span class="sr-only">{{ t('change') }}</span>
        </button>
      </UFileUpload>
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
