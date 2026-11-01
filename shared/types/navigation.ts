/** One entry of a header, mobile or footer menu, as the chrome renders it. */
export interface NavLink {
  label: string
  /** An internal path. */
  to?: string
  /** An external https URL. */
  href?: string
  icon?: string
}

/** A footer heading with its links. */
export interface NavColumn {
  label: string
  icon?: string
  showsMerchantIdentity?: boolean
  children: NavLink[]
}
