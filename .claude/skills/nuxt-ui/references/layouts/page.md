# Page Layout

The storefront does not use Nuxt UI's Header and Page shells for its own pages:
`app/layouts/default.vue` and `checkout.vue` build the frame (`UMain` inside it),
and `Chrome/Footer.vue` is the `UFooter` with `UFooterColumns`. Page-builder
sections and a few store pages use the Page components for their content.

## Where each is used

| Component | Used in |
|---|---|
| `UPageSection`, `UPageHero` | webside's `PageSection/*` content sections (`AboutContent`, `VisionContent`, `WhyMicrolearning`, `WhatIsMicrolearning`) |
| `UPageGrid` | `PageSection/ProductsGrid.vue`, `StoreAssurances.vue`, `BlogCategoryTiles.vue`, `Product/Suggestions.vue`, webside's `Storefront/Offers.vue` |
| `UPageCard` | `PageSection/FeaturesGrid.vue`, `BlogCategoryTiles.vue`, webside's auth and account cards |
| `UPageFeature` | `PageSection/FeaturesGrid.vue`, `StoreAssurances.vue` |
| `UPageHeader` | webside's `Storefront/Legal.vue` |
| `UContentToc` | `Storefront/BlogPost.vue` (links come from `app/utils/blogHeadings.ts`) |

Search for the component name before relying on this table: sections move.

## Rules

- Content is data from the page builder or `t()`: no hardcoded text, and
  images through `<NuxtImg>` / `ImgWithFallback`, never a raw `<img>`.
- Style with tokens and the repo's classes, and check the section in every
  design (default and webside).
- A page is a Nuxt page under `app/pages/`; the repo has no `@nuxt/content`
  collections, so a Nuxt UI blog or changelog example that calls
  `queryCollection` does not apply. The blog reads from the Django API.

Props and slots are in
`node_modules/@nuxt/ui/dist/runtime/components/Page<Name>.vue.d.ts`.
