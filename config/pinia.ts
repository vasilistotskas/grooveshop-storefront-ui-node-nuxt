export const pinia = {
	autoImports: [
		// automatically imports `defineStore`
		'defineStore', // import { defineStore } from 'pinia'
		'storeToRefs', // import { storeToRefs } from 'pinia'
		'acceptHMRUpdate'
	]
}
