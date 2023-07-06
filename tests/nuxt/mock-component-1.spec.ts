import { expect, it } from 'vitest'
import { mockComponent, mountSuspended } from 'vitest-environment-nuxt/utils'
import App from '~/pages/testing/app.vue'

mockComponent('TestingSomeComponent', async () => {
	const { h } = await import('vue')
	return {
		setup() {
			return () => h('div', null, 'Mocked')
		}
	}
})

it('should mock', async () => {
	const component = await mountSuspended(App)
	expect(component.html()).toMatchInlineSnapshot(`
  "<div>Mocked</div>
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
