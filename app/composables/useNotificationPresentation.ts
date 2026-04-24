/**
 * Single source of truth for how notifications render in the UI.
 *
 * Backend emits ``kind`` (urgency — ERROR / SUCCESS / …) and ``category``
 * (domain — ORDER / PAYMENT / …); different surfaces (toast on
 * WebSocket arrival, bell dropdown card, dedicated list page) all need
 * to agree on which color / icon to show for each. Centralising those
 * mappings here prevents the three surfaces from drifting.
 *
 * Colors are returned BOTH as a semantic name (for Nuxt UI component
 * props like ``<UToaster color>``) AND as a fully-literal Tailwind
 * class string. The Tailwind JIT compiler needs the class names to
 * appear verbatim in source to emit them — constructing something like
 * ``text-${color}-500`` at runtime produces no CSS at build time and
 * looks blank in production. Enumerating every ``text-success-500`` /
 * ``text-warning-500`` / … literal below solves that without a
 * safelist.
 *
 * ``NotificationCategory`` / ``NotificationKindEnum`` come from
 * ``shared/openapi/types.gen.ts`` via Nuxt's auto-import — no explicit
 * import needed.
 */

type UiColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export interface NotificationPresentation {
  color: UiColor
  /** Pre-composed Tailwind class for ``text`` tone (``text-{color}-500``). */
  textClass: string
  /** Heroicons name reflecting urgency (kind). */
  icon: string
  /** Heroicons name for the notification's domain (category). */
  categoryIcon: string
}

// Kind → semantic color. Maps cleanly onto UToast / UAlert / UBadge
// color tokens so we get consistent theming across surfaces.
const KIND_COLOR: Record<NotificationKindEnum, UiColor> = {
  ERROR: 'error',
  DANGER: 'error',
  WARNING: 'warning',
  INFO: 'info',
  SUCCESS: 'success',
}

// Kind → intent icon. Used on the urgency badge/chip, independently of
// the category icon.
const KIND_ICON: Record<NotificationKindEnum, string> = {
  ERROR: 'i-heroicons-x-circle',
  DANGER: 'i-heroicons-exclamation-triangle',
  WARNING: 'i-heroicons-exclamation-triangle',
  INFO: 'i-heroicons-information-circle',
  SUCCESS: 'i-heroicons-check-circle',
}

// Category → domain icon. Deliberately uses heroicons for consistency
// with the rest of the app (NotifyMe / ProductAlert / OrderCard etc.
// already rely on heroicons).
const CATEGORY_ICON: Record<NotificationCategory, string> = {
  ORDER: 'i-heroicons-shopping-bag',
  PAYMENT: 'i-heroicons-credit-card',
  SHIPPING: 'i-heroicons-truck',
  CART: 'i-heroicons-shopping-cart',
  PRODUCT: 'i-heroicons-cube',
  ACCOUNT: 'i-heroicons-user',
  SECURITY: 'i-heroicons-lock-closed',
  PROMOTION: 'i-heroicons-trophy',
  SYSTEM: 'i-heroicons-cog-6-tooth',
  REVIEW: 'i-heroicons-chat-bubble-left-right',
  WISHLIST: 'i-heroicons-heart',
  SUPPORT: 'i-heroicons-lifebuoy',
  NEWSLETTER: 'i-heroicons-envelope',
  RECOMMENDATION: 'i-heroicons-sparkles',
}

// Literal Tailwind classes for each semantic color. Enumerated so JIT
// picks them up; do not refactor into a template string.
const COLOR_TEXT_CLASS: Record<UiColor, string> = {
  primary: 'text-primary-500',
  secondary: 'text-secondary-500',
  success: 'text-success-500',
  info: 'text-info-500',
  warning: 'text-warning-500',
  error: 'text-error-500',
  neutral: 'text-neutral-500',
}

const DEFAULT: NotificationPresentation = {
  color: 'info',
  textClass: COLOR_TEXT_CLASS.info,
  icon: KIND_ICON.INFO,
  categoryIcon: CATEGORY_ICON.SYSTEM,
}

/**
 * Resolve visual presentation for a notification kind + category pair.
 *
 * Both arguments are optional so callers can pass what they have (the
 * WS toast may have only ``kind`` if the backend payload ever drifts;
 * defaults fall through gracefully).
 */
export function useNotificationPresentation() {
  const presentationFor = (
    kind?: NotificationKindEnum | string | null,
    category?: NotificationCategory | string | null,
  ): NotificationPresentation => {
    const resolvedKind = kind as NotificationKindEnum | undefined
    const resolvedCategory = category as NotificationCategory | undefined
    const color = (resolvedKind && KIND_COLOR[resolvedKind]) || DEFAULT.color
    return {
      color,
      textClass: COLOR_TEXT_CLASS[color],
      icon: (resolvedKind && KIND_ICON[resolvedKind]) || DEFAULT.icon,
      categoryIcon: (resolvedCategory && CATEGORY_ICON[resolvedCategory]) || DEFAULT.categoryIcon,
    }
  }

  return { presentationFor }
}
