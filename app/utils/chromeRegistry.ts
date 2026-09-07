import type { AsyncComponentLoader } from 'vue'
import { defineAsyncComponent } from 'vue'

/**
 * Per-tenant CHROME registry — the navbar and footer.
 *
 * The page-builder already has this seam for sections
 * (`componentRegistry`, keyed `<type>@<schema>`): a tenant whose design
 * needs its own band ships a component under
 * `PageSection/variants/<schema>/` and registers it there. Chrome had
 * no equivalent — `layouts/default.vue` hardcoded `<PageNavbar />` and
 * the two footers — so a tenant could restyle every band of a page and
 * still be wrapped in the platform's header.
 *
 * That is exactly the Δelta Σigma case. Its design specifies a header
 * with a ΔΣ logomark, a monospace `CONSULTING · ENGINEERING` caption, a
 * plain text nav, an `EL / EN` pill and one teal CTA — and none of the
 * platform's storefront affordances (⌘K search, favourites, account
 * avatar), because it is a contractor's site rather than a shop.
 * Overriding the shared Navbar with tenant conditionals would push that
 * design into every other tenant's component; a variant keeps it in the
 * tenant's own file and its own lazy chunk.
 *
 * Same fallback chain as the sections: `<slot>@<schema>` → `<slot>` →
 * the platform component. A tenant with no entry is untouched.
 *
 * NOT lazy-hydrated, unlike most sections: chrome is above the fold on
 * every route and carries the nav a visitor may click immediately.
 */
const chromeComponent = (loader: AsyncComponentLoader) =>
  defineAsyncComponent(loader)

export const chromeRegistry: Record<
  string,
  ReturnType<typeof defineAsyncComponent>
> = {
  'navbar@delta_sigma': chromeComponent(
    () => import('~/components/Chrome/variants/delta_sigma/Navbar.vue'),
  ),
  'footer@delta_sigma': chromeComponent(
    () => import('~/components/Chrome/variants/delta_sigma/Footer.vue'),
  ),
}

/**
 * The tenant's chrome component for `slot`, or `undefined` when it has
 * none — in which case the caller renders the platform's own.
 */
export function resolveChromeComponent(
  slot: 'navbar' | 'footer',
  tenantSchema?: string | null,
) {
  if (!tenantSchema) return undefined
  return chromeRegistry[`${slot}@${tenantSchema}`]
}
