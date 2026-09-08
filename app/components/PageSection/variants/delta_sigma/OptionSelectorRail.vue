<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * `option_selector` with `layout: "rail"` — the list IS the page.
 *
 * "Ειδίκευση σε επτά πεδία": the seven fields down the left, what the
 * chosen one covers on the right. Measured off the ειδίκευση artboard
 * at 1440px: a 380px rail of full-width rows, each a 14px title with a
 * chevron, the chosen one on the raised ground with a teal left edge;
 * then the prompt card under the rail; and beside them a bordered
 * panel whose head is the field's name, whose body is its own line and
 * a two-column checklist of what it covers, closing on a right-aligned
 * CTA.
 *
 * A rail rather than tabs because seven boxed tabs across a 1280px
 * track are 180px each — narrower than their own titles — and because
 * the seven ARE the page's subject: the reader is scanning the list
 * for their own field, not choosing between variants of one product.
 *
 * `aria-orientation="vertical"`, and Up/Down move the selection.
 *
 * COLOUR IS TOKENS, so the band inverts for light mode on its own.
 */
interface Option {
  name: string
  title?: string
  rationale?: string
  note?: string
  ctaText?: string
  ctaLink?: string
  bullets?: string[]
}

const props = defineProps<{
  heading?: string
  standfirst?: string
  bulletsLabel?: string
  options?: Option[]
  prompt?: {
    title: string
    text?: string
    ctaText?: string
    ctaLink?: string
  }
}>()

const { active, tabs, tabId, panelId, onKeydown } = useTabList(
  () => props.options?.length ?? 0,
  'vertical',
)
const current = computed(() => props.options?.[active.value])
</script>

<template>
  <section
    v-if="options?.length"
    class="
      border-b border-default bg-default px-5 py-16
      lg:px-20 lg:pt-20 lg:pb-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <div
        v-if="heading || standfirst"
        class="
          flex flex-col gap-5
          lg:flex-row lg:items-end lg:justify-between lg:gap-16
        "
      >
        <h2
          v-if="heading"
          class="
            text-[26px] leading-[1.15] font-bold tracking-[-0.02em]
            text-highlighted
            lg:text-[36px]
          "
        >
          {{ heading }}
        </h2>
        <p
          v-if="standfirst"
          class="
            max-w-[420px] text-[14px] leading-[1.7] text-dimmed
            lg:text-right
          "
        >
          {{ standfirst }}
        </p>
      </div>

      <div
        class="
          grid gap-6
          lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start
        "
        :class="heading || standfirst ? 'mt-10' : ''"
      >
        <div class="flex flex-col gap-3">
          <div
            role="tablist"
            aria-orientation="vertical"
            :aria-label="heading"
            class="
              flex flex-col overflow-hidden rounded-xl border border-default
            "
          >
            <button
              v-for="(option, index) in options"
              :id="tabId(index)"
              :key="option.name"
              ref="tabs"
              type="button"
              role="tab"
              :aria-selected="index === active"
              :aria-controls="panelId"
              :tabindex="index === active ? 0 : -1"
              class="
                flex cursor-pointer items-center gap-3 border-l-2 px-5 py-4
                text-left transition-colors
              "
              :class="[
                index > 0 ? 'border-t border-t-default' : '',
                index === active
                  ? 'border-l-primary bg-muted'
                  : 'border-l-transparent hover:bg-muted/60',
              ]"
              @click="active = index"
              @keydown="onKeydown($event, index)"
            >
              <span
                class="flex-1 text-[14px] leading-[1.35]"
                :class="index === active
                  ? 'font-semibold text-highlighted'
                  : 'text-muted'"
              >{{ option.name }}</span>
              <UIcon
                name="i-lucide:chevron-right"
                class="size-4 shrink-0"
                :class="index === active ? 'text-primary' : 'text-dimmed'"
                aria-hidden="true"
              />
            </button>
          </div>

          <div
            v-if="prompt"
            class="rounded-xl border border-default bg-muted p-5"
          >
            <p class="text-[14px] font-semibold text-highlighted">
              {{ prompt.title }}
            </p>
            <p
              v-if="prompt.text"
              class="mt-3 text-[13px] leading-[1.6] text-dimmed"
            >
              {{ prompt.text }}
            </p>
            <NuxtLinkLocale
              v-if="prompt.ctaText"
              :to="(prompt.ctaLink ?? '/contact') as RouteLocationNamedI18n"
              class="
                mt-4 flex items-center gap-2 text-[13.5px] text-primary
                transition-colors
                hover:text-primary/80
              "
            >
              {{ prompt.ctaText }}
              <UIcon
                name="i-lucide:arrow-right"
                class="size-3.5"
              />
            </NuxtLinkLocale>
          </div>
        </div>

        <div
          v-if="current"
          :id="panelId"
          role="tabpanel"
          :aria-labelledby="tabId(active)"
          aria-live="polite"
          class="overflow-hidden rounded-xl border border-default bg-muted"
        >
          <p
            class="
              flex items-center gap-2.5 border-b border-default px-6 py-5
              lg:px-8
            "
          >
            <span
              aria-hidden="true"
              class="block size-2 rounded-full bg-primary"
            />
            <span class="text-[17px] font-semibold text-highlighted">
              {{ current.title ?? current.name }}
            </span>
          </p>

          <div
            class="
              p-6
              lg:p-8
            "
          >
            <p
              v-if="current.rationale"
              class="text-[15px] leading-[1.7] text-muted"
            >
              {{ current.rationale }}
            </p>
            <ul
              v-if="current.bullets?.length"
              class="
                grid gap-3
                sm:grid-cols-2 sm:gap-x-8
              "
              :class="current.rationale ? 'mt-7' : ''"
            >
              <li
                v-for="bullet in current.bullets"
                :key="bullet"
                class="flex items-start gap-3"
              >
                <UIcon
                  name="i-lucide:check"
                  class="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span class="text-[13.5px] leading-[1.6] text-muted">
                  {{ bullet }}
                </span>
              </li>
            </ul>
            <p
              v-if="current.note"
              class="
                mt-7 border-t border-default pt-5 text-[13px] leading-[1.7]
                text-dimmed
              "
            >
              {{ current.note }}
            </p>
            <div
              v-if="current.ctaText"
              class="mt-7 flex justify-end"
            >
              <NuxtLinkLocale
                :to="(current.ctaLink ?? '/contact') as RouteLocationNamedI18n"
                class="
                  flex h-[46px] items-center justify-center gap-2 rounded-md
                  bg-primary px-6 text-[14px] font-semibold text-inverted
                  transition-colors
                  hover:bg-primary/85
                "
              >
                {{ current.ctaText }}
                <UIcon
                  name="i-lucide:arrow-right"
                  class="size-4"
                />
              </NuxtLinkLocale>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
