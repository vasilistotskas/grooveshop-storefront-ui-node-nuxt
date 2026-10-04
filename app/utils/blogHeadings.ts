import type { ContentTocLink } from '@nuxt/ui'

/**
 * The "On this page" list of a blog post, read from the post's own
 * headings.
 *
 * The article body is the editor's HTML, so the headings have no
 * anchors to link to. This gives every `<h2>` and `<h3>` an id of its
 * own (`section-1`, `section-2`, … in reading order) and hands back the
 * list `UContentToc` links to, an `<h3>` nested under the
 * `<h2>` before it. A heading with no words in it gets no entry.
 *
 * The HTML is returned UNSANITISED: the one place that renders it
 * (`Blog/Article.vue`) sanitises it, and an id this adds is plain
 * `section-N`.
 */
const HEADING = /<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/gi
const ID_ATTRIBUTE = /\sid\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi

export function anchorHeadings(html: string): { html: string, links: ContentTocLink[] } {
  const links: ContentTocLink[] = []
  let count = 0

  const anchored = html.replace(HEADING, (whole, level: string, attributes: string, inner: string) => {
    const text = htmlToPlainText(inner)
    if (!text) return whole

    count += 1
    const id = `section-${count}`
    const depth = level === '2' ? 2 : 3
    const link: ContentTocLink = { id, depth, text }

    const parent = links.at(-1)
    if (depth === 3 && parent?.depth === 2) {
      parent.children = [...(parent.children ?? []), link]
    }
    else {
      links.push(link)
    }

    return `<h${level}${attributes.replace(ID_ATTRIBUTE, '')} id="${id}">${inner}</h${level}>`
  })

  return { html: anchored, links }
}
