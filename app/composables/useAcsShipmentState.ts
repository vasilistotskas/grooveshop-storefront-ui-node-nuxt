/**
 * Composable that maps ACS shipment states (poll-derived) to display
 * presentation values (translated label, Nuxt UI colour token, icon).
 *
 * Mirrors {@link useBoxNowParcelState} so order-detail components can
 * be carrier-agnostic where useful.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AcsShipmentStateValue
  = | 'pending_creation'
    | 'new'
    | 'in_transit'
    | 'at_destination'
    | 'out_for_delivery'
    | 'delivered'
    | 'attempted'
    | 'returned'
    | 'canceled'
    | 'lost'

export interface AcsShipmentStatePresentation {
  label: string
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  icon: string
}

// ---------------------------------------------------------------------------
// Static mapping (color + icon — label is translated at call time)
// ---------------------------------------------------------------------------

type StaticPresentation = Omit<AcsShipmentStatePresentation, 'label'>

const STATE_MAP: Record<AcsShipmentStateValue, StaticPresentation> = {
  pending_creation: { color: 'neutral', icon: 'i-lucide-loader-2' },
  new: { color: 'neutral', icon: 'i-lucide-package' },
  in_transit: { color: 'info', icon: 'i-lucide-truck' },
  at_destination: { color: 'info', icon: 'i-lucide-warehouse' },
  out_for_delivery: { color: 'warning', icon: 'i-lucide-package-search' },
  delivered: { color: 'success', icon: 'i-lucide-check-circle-2' },
  attempted: { color: 'warning', icon: 'i-lucide-alert-circle' },
  returned: { color: 'error', icon: 'i-lucide-undo-2' },
  canceled: { color: 'error', icon: 'i-lucide-x-circle' },
  lost: { color: 'error', icon: 'i-lucide-search-x' },
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useAcsShipmentState() {
  // Per project convention: composables must use useNuxtApp().$i18n,
  // never useI18n() directly (which is only valid inside component setup).
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  function presentationFor(state: AcsShipmentStateValue): AcsShipmentStatePresentation {
    const map = STATE_MAP[state] ?? STATE_MAP.new
    return {
      label: t(`tracking.acs.state.${state}`),
      color: map.color,
      icon: map.icon,
    }
  }

  return { presentationFor }
}
