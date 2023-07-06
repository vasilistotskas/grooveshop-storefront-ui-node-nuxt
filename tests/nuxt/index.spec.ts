import { describe, expect, it } from 'vitest'

import { mountSuspended, registerEndpoint } from 'vitest-environment-nuxt/utils'
import App from '~/pages/testing/app.vue'
import OptionsComponent from '~/components/Testing/OptionsComponent.vue'
import FetchComponent from '~/components/Testing/FetchComponent.vue'

describe('client-side nuxt features', () => {
	it('can use core nuxt composables within test file', () => {
		expect(useAppConfig().hey).toMatchInlineSnapshot('undefined')
		expect(useAppConfig().author).toMatchInlineSnapshot('"Groove"')
	})

	it('can access auto-imported composables from within project', () => {
		const state = useSingleState()
		expect(state.value).toMatchInlineSnapshot('{}')
		state.value.field = 'new value'
		expect(state.value.field).toMatchInlineSnapshot('"new value"')
		expect(useSingleState().value.field).toMatchInlineSnapshot('"new value"')
	})

	it('can access injections from nuxt plugins', () => {
		const app = useNuxtApp()
		expect(app.$i18n.didInject).toMatchInlineSnapshot('undefined')
		expect(app.$router).toBeDefined()
	})
})

describe('test utils', () => {
	it('can mount components within nuxt suspense', async () => {
		const component = await mountSuspended(App)
		expect(component.html()).toMatchInlineSnapshot(`
      "<div>This is an auto-imported component</div>
      <div>I am a global component</div>
      <div class=\\"wrapper relative\\">
        <section>
          <div class=\\"native_slider\\"><button type=\\"button\\" data-scroll_left_by=\\"-1\\" data-always_show=\\"false\\" aria-label=\\"Previous\\" class=\\"native_slider-btn native_slider-btn-prev\\">Previous</button>
            <div class=\\"native_slider-lg\\" data-drag_speed=\\"1\\"><a href=\\"/\\"><img src=\\"/_ipx/w_1920&h_640&f_webp&s_1920x640/assets/images/dummy/1920x640.png\\" width=\\"1920\\" height=\\"640\\" alt=\\"Main Banner\\" data-nuxt-img=\\"\\" class=\\"w-full h-full object-cover\\"></a><a href=\\"/\\"><img src=\\"/_ipx/w_1920&h_640&f_webp&s_1920x640/assets/images/dummy/1920x640.png\\" width=\\"1920\\" height=\\"640\\" alt=\\"Main Banner\\" data-nuxt-img=\\"\\" class=\\"w-full h-full object-cover\\"></a><a href=\\"/\\"><img src=\\"/_ipx/w_1920&h_640&f_webp&s_1920x640/assets/images/dummy/1920x640.png\\" width=\\"1920\\" height=\\"640\\" alt=\\"Main Banner\\" data-nuxt-img=\\"\\" class=\\"w-full h-full object-cover\\"></a></div><button type=\\"button\\" data-scroll_left_by=\\"1\\" aria-label=\\"Next\\" data-always_show=\\"false\\" class=\\"native_slider-btn native_slider-btn-next\\">Next</button>
          </div>
          <div class=\\"usps container-small flex flex-wrap items-center justify-center gap-8 my-16 text-center brand lg:justify-between\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"></div>
        </section>
      </div>"
	  `)
	})

	it('should render default props within nuxt suspense', async () => {
		const component = await mountSuspended(OptionsComponent)
		expect(component.find('h2').html()).toMatchInlineSnapshot('"<h2>The original</h2>"')
	})

	it('should render passed props within nuxt suspense', async () => {
		const component = await mountSuspended(OptionsComponent, {
			props: {
				title: 'title from mount suspense props'
			}
		})
		expect(component.find('h2').html()).toMatchInlineSnapshot(
			'"<h2>title from mount suspense props</h2>"'
		)
	})

	it('can pass slots to mounted components within nuxt suspense', async () => {
		const component = await mountSuspended(OptionsComponent, {
			slots: {
				default: () => 'slot from mount suspense'
			}
		})
		expect(component.find('div').html()).toMatchInlineSnapshot(
			'"<div>slot from mount suspense</div>"'
		)
	})

	it('can mock fetch requests', async () => {
		registerEndpoint('https://jsonplaceholder.typicode.com/todos/1', () => ({
			title: 'title from mocked api'
		}))
		const component = await mountSuspended(FetchComponent)
		expect(component.html()).toMatchInlineSnapshot('"<div>title from mocked api</div>"')
	})

	it('handles nuxt routing', async () => {
		const component = await mountSuspended(App, { route: '/testing' })
		expect(component.html()).toMatchInlineSnapshot(`
      "<div>This is an auto-imported component</div>
      <div>I am a global component</div>
      <div class=\\"wrapper relative\\">
        <section>
          <div class=\\"native_slider\\"><button type=\\"button\\" data-scroll_left_by=\\"-1\\" data-always_show=\\"false\\" aria-label=\\"Previous\\" class=\\"native_slider-btn native_slider-btn-prev\\">Previous</button>
            <div class=\\"native_slider-lg\\" data-drag_speed=\\"1\\"><a href=\\"/\\"><img src=\\"/_ipx/w_1920&h_640&f_webp&s_1920x640/assets/images/dummy/1920x640.png\\" width=\\"1920\\" height=\\"640\\" alt=\\"Main Banner\\" data-nuxt-img=\\"\\" class=\\"w-full h-full object-cover\\"></a><a href=\\"/\\"><img src=\\"/_ipx/w_1920&h_640&f_webp&s_1920x640/assets/images/dummy/1920x640.png\\" width=\\"1920\\" height=\\"640\\" alt=\\"Main Banner\\" data-nuxt-img=\\"\\" class=\\"w-full h-full object-cover\\"></a><a href=\\"/\\"><img src=\\"/_ipx/w_1920&h_640&f_webp&s_1920x640/assets/images/dummy/1920x640.png\\" width=\\"1920\\" height=\\"640\\" alt=\\"Main Banner\\" data-nuxt-img=\\"\\" class=\\"w-full h-full object-cover\\"></a></div><button type=\\"button\\" data-scroll_left_by=\\"1\\" aria-label=\\"Next\\" data-always_show=\\"false\\" class=\\"native_slider-btn native_slider-btn-next\\">Next</button>
          </div>
          <div class=\\"usps container-small flex flex-wrap items-center justify-center gap-8 my-16 text-center brand lg:justify-between\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"><img src=\\"/_ipx/w_80&h_40&f_webp&s_80x40/assets/images/dummy/80x40.png\\" width=\\"80\\" height=\\"40\\" alt=\\"Usp\\" data-nuxt-img=\\"\\" class=\\"w-auto h-auto object-cover\\"></div>
        </section>
      </div>"
	  `)
	})
})
