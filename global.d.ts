/* prettier-ignore */
// @ts-nocheck
// global.d.ts
export {}

declare module 'vue' {
  export interface GlobalComponents {
    VDatePicker: (typeof import('v-calendar'))['DatePicker']
    VCalendar: (typeof import('v-calendar'))['Calendar']
  }
}
