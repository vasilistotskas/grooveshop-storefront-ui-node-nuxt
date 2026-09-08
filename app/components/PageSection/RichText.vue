<script lang="ts" setup>
const props = defineProps<{
  title?: string
  content?: string
}>()

// This rendered ``content`` through ``v-html`` with NO sanitiser at
// all — the only rich-text surface in the app that did. It is the
// ``rich_text`` CMS section, so the HTML is admin-authored rather than
// shopper-supplied, but "authored by a store operator" is not the same
// as "safe to inject": a compromised or careless staff account, or any
// future path that lets less-trusted input reach a page section, lands
// straight in the DOM. Sanitising here also means CMS sections get
// video embeds on the same terms as blog posts.
const sanitizedContent = computed(() => sanitizeRichHtml(props.content))
</script>

<template>
  <div class="w-full">
    <h2
      v-if="title"
      class="mb-4 text-2xl font-bold"
    >
      {{ title }}
    </h2>
    <div
      v-if="sanitizedContent"
      class="article prose dark:prose-invert"
      v-html="sanitizedContent"
    />
  </div>
</template>
