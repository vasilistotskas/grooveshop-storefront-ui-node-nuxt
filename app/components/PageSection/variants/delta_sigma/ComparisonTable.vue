<script lang="ts" setup>
/**
 * "Συγκριτικός πίνακας" — one characteristic per row, one option per
 * column.
 *
 * Measured off the artboard at 1440px: a 30px heading, then a
 * bordered table whose header row carries the row-label in monospace
 * 10.5px/0.14em uppercase and the option names in 15px semibold, and
 * whose body rows put the characteristic in 14px muted against
 * monospace 13px values — 1px rules throughout, no zebra.
 *
 * The table SCROLLS inside its own container below `lg`. Four columns
 * of technical values cannot narrow to 390px, and the alternative —
 * reflowing each row into a stacked card — turns a comparison into
 * three separate lists, which is the one thing a comparison is not.
 *
 * Django refuses a ragged row (`_check_matrix_rows`), so a row's
 * values always line up with `columns`; the guard here is only for
 * historical data that predates it.
 */
const props = defineProps<{
  heading?: string
  rowLabel?: string
  columns?: string[]
  rows?: { label: string, values: string[] }[]
  note?: string
}>()

const width = computed(() => props.columns?.length ?? 0)

/** Rows whose width matches the header, so nothing lands under the
 *  wrong heading if older data disagrees. */
const rows = computed(
  () => (props.rows ?? []).filter(row => row.values.length === width.value),
)
</script>

<template>
  <section
    v-if="width && rows.length"
    class="
      border-b border-default bg-default px-5 py-16
      lg:px-20 lg:py-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <h2
        v-if="heading"
        class="
          text-[24px] leading-[1.15] font-bold tracking-[-0.02em]
          text-highlighted
          lg:text-[30px]
        "
      >
        {{ heading }}
      </h2>

      <div class="mt-9 overflow-x-auto">
        <table
          class="
            w-full min-w-[720px] border-separate border-spacing-0 text-left
          "
        >
          <thead>
            <tr>
              <th
                scope="col"
                class="
                  rounded-tl-lg border-t border-l border-default bg-muted px-5
                  py-4 font-mono text-[10.5px] font-normal tracking-[0.14em]
                  text-dimmed uppercase
                "
              >
                {{ rowLabel }}
              </th>
              <th
                v-for="(column, index) in columns"
                :key="column"
                scope="col"
                class="
                  border-t border-l border-default bg-muted px-5 py-4
                  text-[15px] font-semibold text-highlighted
                "
                :class="index === width - 1
                  ? 'rounded-tr-lg border-r'
                  : ''"
              >
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in rows"
              :key="row.label"
            >
              <th
                scope="row"
                class="
                  border-t border-l border-default px-5 py-3.5 text-[14px]
                  font-normal text-muted
                "
                :class="rowIndex === rows.length - 1
                  ? 'rounded-bl-lg border-b'
                  : ''"
              >
                {{ row.label }}
              </th>
              <td
                v-for="(value, index) in row.values"
                :key="`${row.label}-${index}`"
                class="
                  border-t border-l border-default px-5 py-3.5 font-mono
                  text-[13px] text-default
                "
                :class="[
                  index === width - 1 ? 'border-r' : '',
                  rowIndex === rows.length - 1 ? 'border-b' : '',
                  rowIndex === rows.length - 1 && index === width - 1
                    ? 'rounded-br-lg'
                    : '',
                ]"
              >
                {{ value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p
        v-if="note"
        class="mt-6 max-w-[900px] text-[13px] leading-[1.7] text-dimmed"
      >
        {{ note }}
      </p>
    </div>
  </section>
</template>
