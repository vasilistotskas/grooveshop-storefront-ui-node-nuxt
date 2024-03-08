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
    default: 100,
  },
  imgHeight: {
    type: [Number, String],
    required: false,
    default: 100,
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
const { fetchUser } = useAuth()

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
  const allowedExtensions = ['jpg', 'jpeg', 'png']
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  const fileExtensionAllowed = allowedExtensions.includes(
    file?.name.split('.').pop()?.toLowerCase() || '',
  )
  if (!file)
    return toast.add({
      title: t('components.user.avatar.no_file_selected'),
    })
  if (!fileExtensionAllowed)
    return toast.add({
      title: t('components.user.avatar.file_extension_not_allowed'),
    })
  const formData = new FormData()
  formData.append('image', file)
  if (!userAccount.value) return

  await useFetch(`/api/user/account/${userAccount.value.id}`, {
    method: 'PATCH',
    body: formData,
    onRequestError() {
      toast.add({
        title: t('components.user.avatar.image.upload.error'),
        color: 'red',
      })
    },
    async onResponse() {
      toast.add({
        title: t('components.user.avatar.image.updated'),
      })
      await fetchUser()
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
    class="flex flex-col items-center"
    :class="[showName ? 'gap-2' : 'gap-0']"
  >
    <div
      class="user-avatar relative grid items-center justify-center justify-items-center"
      :class="{
        'inline-block h-[135px] w-[135px] shrink-0 text-center align-middle':
          backgroundBorder,
      }"
      :style="{
        width: typeof imgWidth === 'number' ? imgWidth + 'px' : imgWidth,
        height: typeof imgHeight === 'number' ? imgHeight + 'px' : imgHeight,
      }"
    >
      <ImgWithFallback
        loading="lazy"
        provider="mediaStream"
        class="rounded-full bg-white"
        :style="{ objectFit: 'contain' }"
        :width="imgWidth"
        :height="imgHeight"
        :fit="'contain'"
        :position="'entropy'"
        :background="'transparent'"
        :trim-threshold="5"
        :sizes="`xs:${imgWidth}px sm:${imgWidth}px md:${imgWidth}px lg:${imgWidth}px xl:${imgWidth}px xxl:${imgWidth}px 2xl:${imgWidth}px`"
        :src="src"
        :alt="alt"
        densities="x1"
      />

      <form
        v-if="changeAvatar"
        enctype="multipart/form-data"
        class="user-avatar-change absolute inset-0 z-10"
        name="uploadImageForm"
        :title="$t('components.user.avatar.change')"
        @submit.prevent="uploadImage"
      >
        <label for="image">
          <svg
            id="camera"
            class="hide-small-viewport hide-medium-viewport"
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            viewBox="0 0 25 15"
            xml:space="preserve"
          >
            <path
              id="cameraFrame"
              fill="none"
              stroke="white"
              stroke-miterlimit="10"
              d="M23.1,14.1H1.9c-0.6,0-1-0.4-1-1V1.9c0-0.6,0.4-1,1-1h21.2
           c0.6,0,1,0.4,1,1v11.3C24.1,13.7,23.7,14.1,23.1,14.1z"
            />
            <path
              id="circle"
              fill="none"
              stroke="#ffffff"
              stroke-width="1.4"
              stroke-miterlimit="12"
              d="M17.7,7.5c0-2.8-2.3-5.2-5.2-5.2S7.3,4.7,7.3,7.5s2.3,5.2,5.2,5.2
           S17.7,10.3,17.7,7.5z"
            />
            <g id="plus">
              <path
                id="plusLine"
                fill="none"
                class="line"
                stroke="#ffffff"
                stroke-miterlimit="10"
                d="M20.9,2.3v4.4"
              />
              <path
                fill="none"
                class="line"
                stroke="#ffffff"
                stroke-miterlimit="10"
                d="M18.7,4.6h4.4"
              />
            </g>
          </svg>
          <span class="sr-only">{{ $t('components.user.avatar.change') }}</span>
        </label>
        <input
          id="image"
          type="file"
          name="image"
          accept="image/*"
          class="sr-only"
          @change="uploadImage"
        >
        <button type="submit" class="sr-only">
          {{ $t('common.upload') }}
        </button>
      </form>
    </div>
    <div v-if="showName" class="flex flex-col">
      <span class="text-primary-700 dark:text-primary-100 font-bold">
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
  }

  .user-avatar:hover & svg {
    stroke-dashoffset: 0;
  }
}
</style>
