import * as z from 'zod'

export const zPageSection = z.object({
  id: z.number(),
  uuid: z.string(),
  componentType: z.string(),
  title: z.string(),
  isVisible: z.boolean(),
  props: z.record(z.string(), z.unknown()),
  sortOrder: z.number(),
})

export const zPageLayoutResponse = z.object({
  id: z.number(),
  uuid: z.string(),
  pageType: z.string(),
  title: z.string(),
  isPublished: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  sections: z.array(zPageSection),
})

export type PageSection = z.infer<typeof zPageSection>
export type PageLayoutResponse = z.infer<typeof zPageLayoutResponse>
