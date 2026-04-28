/**
 * Composable that maps BoxNow parcel states to display-ready
 * presentation values (translated label, Nuxt UI colour token, icon name).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BoxNowParcelStateValue
  = | 'pending_creation'
    | 'new'
    | 'in_depot'
    | 'final_destination'
    | 'delivered'
    | 'returned'
    | 'expired'
    | 'canceled'
    | 'accepted_for_return'
    | 'accepted_to_locker'
    | 'missing'
    | 'lost'

export interface BoxNowParcelStatePresentation {
  label: string
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  icon: string
}

// ---------------------------------------------------------------------------
// Static mapping (color + icon — label is translated at call time)
// ---------------------------------------------------------------------------

type StaticPresentation = Omit<BoxNowParcelStatePresentation, 'label'>

const STATE_MAP: Record<BoxNowParcelStateValue, StaticPresentation> = {
  pending_creation: { color: 'neutral', icon: 'i-lucide-loader-2' },
  new: { color: 'neutral', icon: 'i-lucide-package' },
  in_depot: { color: 'info', icon: 'i-lucide-warehouse' },
  final_destination: { color: 'warning', icon: 'i-lucide-package-check' },
  delivered: { color: 'success', icon: 'i-lucide-check-circle-2' },
  returned: { color: 'error', icon: 'i-lucide-undo-2' },
  expired: { color: 'error', icon: 'i-lucide-clock-alert' },
  canceled: { color: 'error', icon: 'i-lucide-x-circle' },
  accepted_for_return: { color: 'info', icon: 'i-lucide-package-2' },
  accepted_to_locker: { color: 'info', icon: 'i-lucide-truck' },
  missing: { color: 'error', icon: 'i-lucide-package-x' },
  lost: { color: 'error', icon: 'i-lucide-search-x' },
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useBoxNowParcelState() {
  // Per project convention: composables must use useNuxtApp().$i18n,
  // never useI18n() directly (which is only valid inside component setup).
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  /**
   * Returns the full presentation object for the given parcel state,
   * including the translated label for the active locale.
   */
  function presentationFor(state: BoxNowParcelStateValue): BoxNowParcelStatePresentation {
    const { color, icon } = STATE_MAP[state]
    return {
      label: t(`tracking.boxnow.state.${state}`),
      color,
      icon,
    }
  }

  return { presentationFor }
}
