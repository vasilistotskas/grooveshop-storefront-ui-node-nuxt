export {}

declare module '@vue/runtime-core' {
	export interface GlobalComponents {
		VueDatePicker: (typeof import('@vuepic/vue-datepicker'))['default']
	}
}
