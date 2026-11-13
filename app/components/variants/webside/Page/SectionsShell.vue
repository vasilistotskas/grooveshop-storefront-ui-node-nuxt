<script lang="ts" setup>
/**
 * webside's page-builder section shell — the markup AROUND the sections:
 * a `PageWrapper` with a gap between sections, each band a card on the
 * page. Extracted rather than written in each page because
 * `pages/index.vue` and `pages/[slug].vue` carried a byte-identical copy
 * of it.
 *
 * A section that draws its own full-width band (`sectionDrawsBand`: the
 * hero, the promises, the product and post bands, the newsletter) is laid
 * out of that frame, edge to edge and with no gap, as the platform's shell
 * lays every section: its band holds the store's measure itself, and its
 * own padding is the space between it and the next. The others stay in the
 * frame, so a page of webside's own sections draws as it always has.
 *
 * Both grids below `md` have ONE column that may shrink (`grid-cols-1` is
 * `minmax(0, 1fr)`): an `auto` column is as wide as the widest section's
 * min-content, and a section that scrolls a rail sideways (the blog posts, a
 * product slider) reports the rail's whole width as its min-content, so the
 * page scrolled sideways on a phone.
 */
const props = defineProps<{ sections: BuilderSection[] }>()

defineSlots<{
  /** The page's h1, which is a page concern, not a section's. */
  title?: (props: object) => unknown
  /** What the page carries UNDER its sections — `/contact`'s form. */
  after?: (props: object) => unknown
}>()

const runs = computed(() => sectionRuns(props.sections))
const hasBands = computed(() => runs.value.some(run => run.bands))
const opensWithBand = computed(() => runs.value[0]?.bands === true)
/** What the page carries after its sections closes the last framed run, or a frame of its own after a band. */
const endsWithBand = computed(() => runs.value.at(-1)?.bands === true)
</script>

<template>
  <!-- No section draws its own band: the frame as it always was. -->
  <WebsidePageWrapper v-if="!hasBands">
    <slot name="title" />
    <section
      class="
        grid grid-cols-1 gap-4 pt-4
        md:flex md:flex-col md:gap-8
      "
    >
      <div
        class="
          grid grid-cols-1 gap-4
          md:gap-8
        "
      >
        <PageSectionRenderer
          v-for="section in sections"
          :key="section.id"
          :section="section"
        />
      </div>
      <slot name="after" />
    </section>
  </WebsidePageWrapper>
  <div v-else>
    <!-- The page's title keeps the store's measure: in the first frame,
         or in a container of its own above a band. -->
    <UContainer v-if="opensWithBand">
      <slot name="title" />
    </UContainer>
    <template
      v-for="(run, index) in runs"
      :key="run.key"
    >
      <WebsidePageBandRun
        v-if="run.bands"
        :sections="run.sections"
      />
      <WebsidePageWrapper v-else>
        <slot
          v-if="index === 0"
          name="title"
        />
        <section
          class="
            grid grid-cols-1 gap-4 pt-4
            md:flex md:flex-col md:gap-8
          "
        >
          <div
            class="
              grid grid-cols-1 gap-4
              md:gap-8
            "
          >
            <PageSectionRenderer
              v-for="section in run.sections"
              :key="section.id"
              :section="section"
            />
          </div>
          <slot
            v-if="index === runs.length - 1"
            name="after"
          />
        </section>
      </WebsidePageWrapper>
    </template>
    <WebsidePageWrapper v-if="endsWithBand && $slots.after">
      <section
        class="
          grid grid-cols-1 gap-4 pt-4
          md:flex md:flex-col md:gap-8
        "
      >
        <slot name="after" />
      </section>
    </WebsidePageWrapper>
  </div>
</template>
