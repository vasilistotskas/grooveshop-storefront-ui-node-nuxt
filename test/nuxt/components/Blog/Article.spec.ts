import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Article from '~/components/Blog/Article.vue'

/**
 * The body of a post: the editor's HTML, sanitised, with the anchors on
 * its headings left in place for the table of contents to link to.
 */
async function render(html: string) {
  return mountSuspended(Article, { route: false, props: { html } })
}

describe('Blog/Article', () => {
  it('shows the editor\'s markup', async () => {
    const wrapper = await render('<h2 id="section-1">Τίτλος</h2><p>Κείμενο <strong>έντονο</strong></p>')

    expect(wrapper.find('h2').text()).toBe('Τίτλος')
    expect(wrapper.find('p strong').text()).toBe('έντονο')
  })

  it('keeps the anchor on a heading', async () => {
    const wrapper = await render('<h2 id="section-2">Τίτλος</h2>')

    expect(wrapper.find('#section-2').text()).toBe('Τίτλος')
  })

  it('strips a script and an event handler out of the body', async () => {
    const wrapper = await render('<p onclick="steal()">Κείμενο</p><script>alert(1)</script>')

    expect(wrapper.html()).toContain('Κείμενο')
    expect(wrapper.html()).not.toContain('script')
    expect(wrapper.html()).not.toContain('onclick')
  })

  it('keeps an embedded video from a listed host and drops one from any other', async () => {
    const wrapper = await render(
      '<iframe src="https://www.youtube.com/embed/abc"></iframe><iframe src="https://evil.example/embed"></iframe>',
    )

    expect(wrapper.findAll('iframe').map(frame => frame.attributes('src'))).toEqual(['https://www.youtube.com/embed/abc'])
  })
})
