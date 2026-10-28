// The shape of app/utils/componentRegistry.ts, over the fixture tree.
const section = (loader: () => Promise<unknown>) => loader

export const componentRegistry = {
  'hero_banner': section(() => import('~/components/PageSection/Hero.vue')),
  'hero_banner@delta_sigma': section(() => import('~/components/PageSection/variants/delta_sigma/Hero.vue')),
}
