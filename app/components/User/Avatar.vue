<script lang="ts" setup>
import type { PropType } from 'vue'

import type { UserAccount } from '~/types/user/account'

const props = defineProps({
  userAccount: {
    type: Object as PropType<UserAccount>,
    required: true,
  },
  showName: {
    type: Boolean,
    required: false,
    default: true,
  },
  imgWidth: {
    type: [Number, String],
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
const { resolveImageSrc } = useImageResolver()
const { fetch } = useUserSession()

const loading = ref(true)

const src = computed(() => {
  return resolveImageSrc(
    userAccount.value?.mainImageFilename,
    `media/uploads/users/${userAccount.value?.mainImageFilename}`,
  )
})

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
      title: t('components.user.avatar.no_file_selected'),
      color: 'red',
    })
  }
  if (!fileExtensionAllowed) {
    loading.value = false
    return toast.add({
      title: t('components.user.avatar.file_extension_not_allowed'),
      color: 'red',
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
    body: formData,
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('components.user.avatar.image.updated'),
        color: 'green',
      })
      await fetch()
    },
    onResponseError() {
      toast.add({
        title: t('components.user.avatar.image.upload.error'),
        color: 'red',
      })
    },
  })
}
</script>

<template>
  <div
    :class="[showName ? 'gap-2' : 'gap-0']"
    class="flex flex-col items-center"
  >
    <div
      :class="{
        'inline-block h-[135px] w-[135px] shrink-0 text-center align-middle':
          backgroundBorder,
        'loading': loading,
      }"
      :style="{
        width: typeof imgWidth === 'number' ? imgWidth + 'px' : imgWidth,
        height: typeof imgHeight === 'number' ? imgHeight + 'px' : imgHeight,
      }"
      class="
        user-avatar relative grid items-center justify-center
        justify-items-center
      "
    >
      <ImgWithFallback
        :alt="alt"
        :background="'transparent'"
        :class="{
          'blur-sm filter': loading,
        }"
        :fit="'cover'"
        :height="imgHeight"
        :position="'entropy'"
        :sizes="`xs:${imgWidth}px sm:${imgWidth}px md:${imgWidth}px lg:${imgWidth}px xl:${imgWidth}px xxl:${imgWidth}px 2xl:${imgWidth}px`"
        :src="src"
        :style="{ objectFit: 'contain' }"
        :trim-threshold="5"
        :width="imgWidth"
        class="user-avatar-img bg-primary-100 rounded-full"
        densities="x1"
        loading="lazy"
        provider="mediaStream"
        @load="() => (loading = false)"
      />

      <form
        v-if="changeAvatar"
        :title="$t('components.user.avatar.change')"
        class="user-avatar-change absolute inset-0 z-10"
        enctype="multipart/form-data"
        name="uploadImageForm"
        @submit.prevent="uploadImage"
      >
        <label
          class="user-avatar-change-label"
          for="selfie"
        >
          <svg
            id="camera"
            class="hide-small-viewport hide-medium-viewport"
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
              stroke="white"
              stroke-miterlimit="10"
            />
            <path
              id="circle"
              d="M17.7,7.5c0-2.8-2.3-5.2-5.2-5.2S7.3,4.7,7.3,7.5s2.3,5.2,5.2,5.2
           S17.7,10.3,17.7,7.5z"
              fill="none"
              stroke="#ffffff"
              stroke-miterlimit="12"
              stroke-width="1.4"
            />
            <g id="plus">
              <path
                id="plusLine"
                class="line"
                d="M20.9,2.3v4.4"
                fill="none"
                stroke="#ffffff"
                stroke-miterlimit="10"
              />
              <path
                class="line"
                d="M18.7,4.6h4.4"
                fill="none"
                stroke="#ffffff"
                stroke-miterlimit="10"
              />
            </g>
          </svg>
          <span class="sr-only">{{ $t('components.user.avatar.change') }}</span>
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
          {{ $t('common.upload') }}
        </button>
      </form>
    </div>
    <div
      v-if="showName"
      class="flex flex-col"
    >
      <span
        class="
          text-primary-950 font-bold

          dark:text-primary-50
        "
      >
        {{ userAccount?.firstName }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.user-avatar-change {
  svg {
    display: none;
    position: absolute;
    top: 18px;
    left: 1px;
    transform: scale(0.4);
    cursor: pointer;

    @media screen and (min-width: 768px) {
      display: block;
      top: 21px;
      transform: scale(0.5);
      transition: all 0.5s linear;
      stroke-dashoffset: 75px;
      stroke-dasharray: 75px;
    }
  }

  &:hover {
    background-color: transparent;

    svg {
      stroke-dashoffset: 0;
    }
  }

  .user-avatar:hover & svg {
    stroke-dashoffset: 0;
  }

  &-label {
    @media screen and (width <= 767px) {
      display: grid;
      width: 100%;
      height: 100%;
    }
  }
}

.user-avatar-img {
  width: v-bind(imgWidth);
  height: v-bind(imgHeight);
}
</style>
