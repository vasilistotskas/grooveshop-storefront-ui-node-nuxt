<script lang="ts" setup>
defineProps({
	width: {
		type: [Number, String],
		default: 'auto'
	},
	height: {
		type: [Number, String],
		default: 'auto'
	},
	borderRadius: {
		type: String,
		required: false,
		default: '5px'
	},
	showAnimation: {
		type: Boolean,
		default: true
	},
	text: {
		type: String,
		default: 'Loading...'
	},
	textVisibility: {
		type: String,
		default: 'hidden'
	},
	textColor: {
		type: String,
		default: 'black'
	}
})
</script>

<template>
	<div class="client-only-fallback" :class="{ skeleton: showAnimation }">
		<p class="client-only-fallback-text" v-text="text"></p>
	</div>
</template>

<style lang="scss" scoped>
.skeleton {
	animation: skeleton-loading 1s linear infinite alternate;
}

@keyframes skeleton-loading {
	0% {
		background-color: hsl(200deg 20% 80%);
	}

	100% {
		background-color: hsl(200deg 20% 95%);
	}
}

.client {
	&-only {
		&-fallback {
			border-radius: v-bind(borderRadius);
			display: grid;
			width: v-bind(width);
			height: v-bind(height);

			&-text {
				display: grid;
				align-items: center;
				justify-items: center;
				justify-content: center;
				visibility: v-bind(textVisibility);
				color: v-bind(textColor);
				font-weight: 600;
			}
		}
	}
}
</style>
