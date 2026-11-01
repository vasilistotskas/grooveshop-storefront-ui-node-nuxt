import * as z from 'zod'

/**
 * One entry of a menu. It names WHAT it points at, never a typed path: a page
 * of the store (`page`, its page type), a content page (`contentPage`, its
 * slug), a built-in route or an external https URL, exactly one of them. A
 * link to a page that is not in the current release is hidden when the menu
 * renders (`navigationItems`), as a link to an unpublished page always was.
 */
export default defineBlock({
  type: 'nav_link',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    label: builderField.requiredText(100),
    icon: builderField.icon(64).optional(),
    page: z.string().min(1).max(50).optional(),
    contentPage: z.string().min(1).max(255).regex(/^[-a-zA-Z0-9_]+$/).optional(),
    route: z.enum(NAVIGATION_ROUTES).optional(),
    href: builderField.httpsUrl().optional(),
  })
    .refine(link => [link.page, link.contentPage, link.route, link.href].filter(target => target !== undefined).length === 1, { message: 'needs exactly one target' })
    // Stated in the catalogue too, so Django refuses a link with none or two targets on save.
    .meta({ oneOf: [{ required: ['page'] }, { required: ['contentPage'] }, { required: ['route'] }, { required: ['href'] }] }),
  translatable: ['/label'],
  refs: { '/page': 'page', '/contentPage': 'contentPage' },
})
