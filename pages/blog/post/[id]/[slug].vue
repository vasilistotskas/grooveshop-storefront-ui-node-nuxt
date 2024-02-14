<script lang="ts" setup>
import type { UseSeoMetaInput } from '@unhead/schema'
import { isClient } from '@vueuse/shared'
import type { BlogTag } from '~/types/blog/tag'
import type { BlogAuthor } from '~/types/blog/author'
import type { Account } from '~/types/user/account'

const blogPostStore = useBlogPostStore()
const { post } = storeToRefs(blogPostStore)
const { fetchBlogPost } = blogPostStore

const route = useRoute('blog-post-id-slug___en')
const config = useRuntimeConfig()
const { t, locale } = useI18n()
const { extractTranslated } = useTranslationExtractor()
const { resolveImageSrc } = useImageResolver()

const blogPostId = route.params.id

await fetchBlogPost(blogPostId, 'true')

const blogPostBody = computed(() => {
	return extractTranslated(post.value, 'body', locale.value)
})
const blogPostSubtitle = computed(() => {
	return extractTranslated(post.value, 'subtitle', locale.value)
})
const blogPostTitle = computed(() => {
	return extractTranslated(post.value, 'title', locale.value)
})
const blogPostAuthor = computed(() => {
	if (typeof post.value?.author !== 'number') {
		return post.value?.author as BlogAuthor
	}
	return null
})
const blogPostAuthorUser = computed(() => {
	if (typeof blogPostAuthor.value?.user !== 'number') {
		return blogPostAuthor.value?.user as Account
	}
	return null
})
const blogPostTags = computed(() => {
	if (typeof post.value?.tags !== 'number') {
		return post.value?.tags as BlogTag[]
	}
	return null
})
const blogPostImageSrc = computed(() => {
	return resolveImageSrc(
		post.value?.mainImageFilename,
		`media/uploads/blog/${post.value?.mainImageFilename}`
	)
})
const blogPostAuthorUserImgSrc = computed(() => {
	return resolveImageSrc(
		blogPostAuthorUser.value?.mainImageFilename,
		`media/uploads/users/${blogPostAuthorUser.value?.mainImageFilename}`
	)
})

const links = [
	{
		to: locale.value === config.public.defaultLocale ? '/' : `/${locale.value}`,
		label: t('breadcrumb.items.index.label'),
		icon: 'i-heroicons-home'
	},
	{
		to: locale.value === config.public.defaultLocale ? '/blog' : `/${locale.value}/blog`,
		label: t('breadcrumb.items.blog.label')
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? `/blog/post/${blogPostId}/${post.value?.slug}`
				: `/${locale.value}/blog/post/${blogPostId}/${post.value?.slug}`,
		label: blogPostTitle.value
	}
]

const routeFullPath = computed(() => {
	return route.fullPath
})

const shareOptions = ref({
	title: blogPostTitle.value,
	text: blogPostSubtitle.value || '',
	url: isClient ? routeFullPath : ''
})
const { share, isSupported } = useShare(shareOptions)
const startShare = () => share().catch((err) => err)

const seoMetaOptions = {
	title: blogPostTitle.value,
	description: blogPostSubtitle.value,
	ogTitle: blogPostTitle.value,
	ogType: 'article',
	ogUrl: config.public.baseUrl + routeFullPath.value,
	ogImage: post.value?.mainImageAbsoluteUrl,
	ogImageAlt: blogPostTitle.value,
	twitterTitle: blogPostTitle.value,
	twitterDescription: blogPostSubtitle.value,
	twitterImage: post.value?.mainImageAbsoluteUrl,
	msapplicationTileImage: post.value?.mainImageAbsoluteUrl
} satisfies UseSeoMetaInput
useSchemaOrg([
	defineArticle({
		headline: blogPostTitle.value,
		description: blogPostSubtitle.value,
		image: post.value?.mainImageAbsoluteUrl,
		datePublished: post.value?.createdAt,
		dateModified: post.value?.updatedAt,
		author: {
			name:
				blogPostAuthorUser.value?.firstName + ' ' + blogPostAuthorUser.value?.lastName,
			url: blogPostAuthor.value?.website
		}
	})
])
useSeoMeta(seoMetaOptions)
const ogImageOptions = {
	title: blogPostTitle.value,
	description: blogPostSubtitle.value,
	alt: blogPostTitle.value,
	url: post.value?.mainImageAbsoluteUrl || '',
	cache: true,
	cacheKey: `og-image-blog-post-${blogPostId}`,
	cacheTtl: 60 * 60 * 24 * 7
}
defineOgImageComponent('NuxtSeo', ogImageOptions)
definePageMeta({
	layout: 'default'
})
</script>

<template>
	<PageWrapper class="container">
		<PageBody>
			<div v-if="post" class="mx-auto max-w-7xl pb-6 sm:px-6 md:px-4 lg:px-8">
				<UBreadcrumb :links="links" class="mb-5 md:pl-4" />
				<article
					class="mx-auto flex max-w-2xl flex-col items-start justify-center border-gray-200 dark:border-gray-700"
				>
					<div class="mx-auto flex max-w-2xl flex-col items-start justify-center gap-4">
						<h2
							class="text-primary-700 dark:text-primary-100 text-3xl font-bold tracking-tight md:text-5xl"
						>
							{{ blogPostTitle }}
						</h2>
						<div class="grid w-full grid-cols-3 items-center gap-2 md:gap-4">
							<div
								class="flex items-center justify-start border-r-2 border-gray-400 pr-2"
							>
								<div class="relative mr-4 flex h-12 w-12 items-center">
									<ImgWithFallback
										loading="lazy"
										provider="mediaStream"
										class="rounded-full bg-white"
										:style="{ objectFit: 'contain' }"
										:width="48"
										:height="48"
										:fit="'contain'"
										:position="'entropy'"
										:background="'transparent'"
										:trim-threshold="5"
										:sizes="`xs:${48}px sm:${48}px md:${48}px lg:${48}px xl:${48}px xxl:${48}px 2xl:${48}px`"
										:src="blogPostAuthorUserImgSrc"
										:alt="
											blogPostAuthorUser?.firstName + ' ' + blogPostAuthorUser?.lastName
										"
										densities="x1"
									/>
								</div>
								<div class="text-primary-700 dark:text-primary-100 text-sm font-bold">
									{{ blogPostAuthorUser?.firstName + ' ' + blogPostAuthorUser?.lastName }}
								</div>
							</div>
							<div
								class="text-primary-700 dark:text-primary-100 grid h-full items-center justify-center border-r-2 border-gray-400 pr-2 text-sm"
							>
								<time :datetime="post?.createdAt">
									{{ new Date(post?.createdAt).toLocaleString() }}
								</time>
							</div>
							<div class="flex justify-end">
								<ClientOnly>
									<UButton
										v-if="isSupported"
										:disabled="!isSupported"
										icon="i-heroicons-share"
										size="lg"
										color="white"
										square
										variant="solid"
										class="justify-self-start font-extrabold capitalize"
										@click="startShare"
									/>
									<template #fallback>
										<ClientOnlyFallback height="40px" width="40px" />
									</template>
								</ClientOnly>
							</div>
						</div>
						<div class="w-full sm:mx-0">
							<div class="sm:mx-0">
								<div class="shadow-small">
									<NuxtImg
										loading="lazy"
										provider="mediaStream"
										class="rounded-lg bg-white"
										:style="{ objectFit: 'contain' }"
										:width="675"
										:height="340"
										:fit="'contain'"
										:position="'entropy'"
										:background="'transparent'"
										:trim-threshold="5"
										:sizes="`xs:${675}px sm:${675}px md:${675}px lg:${675}px xl:${675}px xxl:${675}px 2xl:${675}px`"
										:src="blogPostImageSrc"
										:alt="blogPostTitle"
										densities="x1"
									/>
								</div>
							</div>
						</div>
						<div class="grid">
							<ul
								v-if="blogPostTags && blogPostTags.length > 0"
								class="scrollable-tags flex flex-wrap items-center md:gap-4"
							>
								<li v-for="tag in blogPostTags" :key="tag.id">
									<span class="flex w-full items-center text-sm"
										><UIcon name="i-heroicons-hashtag" />{{
											extractTranslated(tag, 'name', locale)
										}}</span
									>
								</li>
							</ul>
						</div>
						<div class="text-primary-700 dark:text-primary-100 mx-auto max-w-2xl">
							<!-- eslint-disable vue/no-v-html -->
							<div v-html="blogPostBody" />
						</div>
					</div>
				</article>
			</div>
		</PageBody>
	</PageWrapper>
</template>
