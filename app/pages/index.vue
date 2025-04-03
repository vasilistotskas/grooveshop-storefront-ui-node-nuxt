<script setup lang="ts">
import { useIntersectionObserver, useLocalStorage, useTimeAgo } from '@vueuse/core'

const config = useRuntimeConfig()
const { isMobileOrTablet } = useDevice()

const appTitle = computed(() => config.public.appTitle as string)

// Banner images
const bannerWidth = ref(isMobileOrTablet ? 510 : 1194)
const bannerHeight = ref(isMobileOrTablet ? 638 : 418)

// Featured articles
const featuredArticles = ref([
  {
    id: 1,
    title: 'The Future of Smart Home Technology',
    excerpt: 'How interconnected devices are transforming the way we live',
    image: '/img/main-banner.png',
    category: 'Tech',
    author: 'John Doe',
    date: new Date(2025, 3, 2),
    featured: true,
  },
  {
    id: 2,
    title: 'Review: Latest Smartphone Innovations',
    excerpt: 'A deep dive into this year\'s most impressive mobile devices',
    image: '/img/main-banner-mobile.png',
    category: 'Reviews',
    author: 'Jane Smith',
    date: new Date(2025, 3, 1),
    featured: true,
  },
  {
    id: 3,
    title: 'AI Breakthroughs: What\'s Next?',
    excerpt: 'The latest advancements in artificial intelligence and machine learning',
    image: '/img/main-banner.png',
    category: 'AI',
    author: 'Alex Johnson',
    date: new Date(2025, 2, 30),
    featured: true,
  },
])

// Latest news articles
const latestArticles = ref([
  {
    id: 4,
    title: 'Wearable Tech Trends for 2025',
    excerpt: 'From health monitoring to AR glasses, wearables are evolving rapidly',
    image: '/img/main-banner-mobile.png',
    category: 'Wearables',
    author: 'Maria Garcia',
    date: new Date(2025, 3, 3),
  },
  {
    id: 5,
    title: 'The Rise of Quantum Computing',
    excerpt: 'How quantum processors are reshaping our computational capabilities',
    image: '/img/main-banner.png',
    category: 'Computing',
    author: 'David Chen',
    date: new Date(2025, 3, 2),
  },
  {
    id: 6,
    title: 'Electric Vehicles: Market Disruption',
    excerpt: 'Analysis of how EVs are changing the automotive landscape',
    image: '/img/main-banner-mobile.png',
    category: 'Transportation',
    author: 'Sarah Williams',
    date: new Date(2025, 3, 1),
  },
  {
    id: 7,
    title: 'Sustainable Tech: Eco-Friendly Innovations',
    excerpt: 'Green technology solutions addressing climate challenges',
    image: '/img/main-banner.png',
    category: 'Sustainability',
    author: 'Michael Brown',
    date: new Date(2025, 2, 29),
  },
])

// Newsletter display state
const showNewsletter = ref(false)
const newsletterTarget = ref(null)

// Format time ago
const formatTimeAgo = (date: Date) => {
  return useTimeAgo(date).value
}

// Handle newsletter subscription
const handleNewsletterSubscribe = () => {
  showNewsletter.value = false
}

definePageMeta({
  layout: 'default',
})

useHead({
  titleTemplate: `%s | ${appTitle.value}`,
  title: 'Home',
})

useSeoMeta({
  titleTemplate: `%s | ${appTitle.value}`,
  title: 'Home',
  description: 'The latest in technology news, reviews, and innovations',
})
</script>

<template>
  <div class="homepage mt-8">
    <!-- Hero Section with Featured Article -->
    <section class="hero-section mb-10">
      <UContainer>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Main Featured Article -->
          <div class="lg:col-span-8">
            <UCard v-if="featuredArticles[0]" class="overflow-hidden rounded-xl" padding="0">
              <NuxtImg
                :src="featuredArticles[0].image"
                class="w-full h-[400px] object-cover rounded-t-xl"
                :alt="featuredArticles[0].title"
                :width="bannerWidth"
                :height="bannerHeight"
                quality="90"
                format="webp"
                sizes="(max-width: 768px) 100vw, 66vw"
              />
              <div class="p-6">
                <UBadge size="sm" color="primary" class="mb-2">
                  {{ featuredArticles[0].category }}
                </UBadge>
                <h1 class="text-3xl font-bold mb-2">
                  {{ featuredArticles[0].title }}
                </h1>
                <p class="text-gray-600 dark:text-gray-400 mb-4">
                  {{ featuredArticles[0].excerpt }}
                </p>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UAvatar size="sm" :src="`https://i.pravatar.cc/150?u=${featuredArticles[0].author}`" />
                    <span class="text-sm">{{ featuredArticles[0].author }}</span>
                  </div>
                  <UBadge variant="subtle" size="sm" color="secondary">
                    {{ formatTimeAgo(featuredArticles[0].date) }}
                  </UBadge>
                </div>
              </div>
            </UCard>
          </div>

          <!-- Secondary Featured Articles -->
          <div class="lg:col-span-4 flex flex-col gap-6">
            <UCard
              v-for="article in featuredArticles.slice(1, 3)"
              :key="article.id"
              class="overflow-hidden rounded-xl"
              padding="0"
            >
              <NuxtImg
                :src="article.image"
                class="w-full h-[180px] object-cover rounded-t-xl"
                :alt="article.title"
                width="400"
                height="180"
                quality="85"
                format="webp"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div class="p-4">
                <UBadge size="xs" color="primary" class="mb-1">
                  {{ article.category }}
                </UBadge>
                <h2 class="text-xl font-bold mb-2">
                  {{ article.title }}
                </h2>
                <div class="flex items-center justify-between">
                  <span class="text-xs">{{ article.author }}</span>
                  <UBadge variant="subtle" size="xs" color="secondary">
                    {{ formatTimeAgo(article.date) }}
                  </UBadge>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Latest Articles Section -->
    <section class="latest-articles mb-10">
      <UContainer>
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-2xl font-bold">
            Latest Articles
          </h2>
          <UButton variant="ghost" trailing-icon="i-heroicons-arrow-right-20-solid">
            View All
          </UButton>
        </div>

        <UCarousel
          :items="latestArticles.map(article => ({
            id: article.id,
            content: article,
          }))"
          :arrows="true"
          :dots="true"
          align="start"
          :slides-to-scroll="1"
          :break-points="{
            '(min-width: 768px)': {
              slidesToScroll: 2,
            },
            '(min-width: 1024px)': {
              slidesToScroll: 3,
            },
          }"
          class="py-4"
          :ui="{
            container: 'p-1',
            item: 'basis-full md:basis-1/2 xl:basis-1/4 items-center justify-center justify-items-center',
          }"
        >
          <template #default="{ item }">
            <UCard
              class="w-full md:w-80 overflow-hidden rounded-xl hover:shadow-lg transition-shadow duration-300"
              padding="0"
            >
              <NuxtImg
                :src="item.content.image"
                class="w-full h-[180px] object-cover rounded-t-xl"
                :alt="item.content.title"
                width="320"
                height="180"
                quality="85"
                format="webp"
                sizes="320px"
              />
              <div class="p-4">
                <UBadge size="xs" color="primary" class="mb-1">
                  {{ item.content.category }}
                </UBadge>
                <h3 class="text-lg font-bold mb-2">
                  {{ item.content.title }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {{ item.content.excerpt }}
                </p>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <UAvatar size="xs" :src="`https://i.pravatar.cc/150?u=${item.content.author}`" />
                    <span class="text-xs">{{ item.content.author }}</span>
                  </div>
                  <UBadge variant="subtle" size="xs" color="secondary">
                    {{ formatTimeAgo(item.content.date) }}
                  </UBadge>
                </div>
              </div>
            </UCard>
          </template>
        </UCarousel>
      </UContainer>
    </section>

    <!-- Newsletter Section -->
    <section ref="newsletterTarget" class="newsletter-section mb-10 py-16 bg-gray-50 dark:bg-gray-900">
      <UContainer>
        <div class="text-center mb-10">
          <UBadge color="primary" class="mb-4">
            Newsletter
          </UBadge>
          <h2 class="text-3xl md:text-4xl font-bold mb-3">
            Stay informed with tech updates
          </h2>
          <p class="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Join our community of tech enthusiasts and get the latest news, reviews, and insights delivered to your inbox.
          </p>
        </div>

        <div class="max-w-2xl mx-auto">
          <UCard class="border-0 shadow-xl rounded-2xl overflow-hidden p-8">
            <EditorialNewsletter
              class="space-y-4"
              @subscribe="handleNewsletterSubscribe"
            />
            <div class="flex items-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
              <UIcon name="i-heroicons-shield-check" class="text-primary" />
              <span>Your information is secure and will never be shared with third parties</span>
            </div>
          </UCard>
        </div>
      </UContainer>
    </section>

    <!-- Topic Categories Section -->
    <section class="categories-section mb-10">
      <UContainer class="max-w-(--container-4xl)">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-2xl font-bold">
            Explore Topics
          </h2>
        </div>

        <UCarousel
          :items="[
            { id: 1, icon: 'i-heroicons-device-phone-mobile', title: 'Smartphones' },
            { id: 2, icon: 'i-heroicons-computer-desktop', title: 'Computing' },
            { id: 3, icon: 'i-heroicons-sparkles', title: 'AI' },
            { id: 4, icon: 'i-heroicons-globe-alt', title: 'Internet' },
            { id: 5, icon: 'i-heroicons-puzzle-piece', title: 'Gaming' },
            { id: 6, icon: 'i-heroicons-bolt', title: 'Energy' },
          ]"
          :arrows="true"
          :dots="true"
          align="center"
          :slides-to-scroll="2"
          :break-points="{
            '(min-width: 768px)': {
              slidesToScroll: 3,
            },
            '(min-width: 1024px)': {
              slidesToScroll: 4,
            },
          }"
          class="py-4"
          :ui="{
            container: 'p-1',
            item: 'basis-full md:basis-1/2 xl:basis-1/4 items-center justify-center justify-items-center',
          }"
        >
          <template #default="{ item }">
            <UCard
              class="w-32 h-32 text-center hover:shadow-md transition-shadow duration-300 flex flex-col justify-center items-center"
            >
              <div class="flex flex-col items-center gap-2">
                <UIcon :name="item.icon" class="text-3xl" />
                <h3 class="font-semibold">
                  {{ item.title }}
                </h3>
              </div>
            </UCard>
          </template>
        </UCarousel>
      </UContainer>
    </section>
  </div>
</template>
