/**
 * Gate for the account subscriptions (newsletter) page — merchant
 * extra-setting NEWSLETTER_ENABLED. Token-based unsubscribe/confirm
 * links from already-sent emails are deliberately NOT gated (backend
 * keeps those endpoints open too).
 */
export default createSettingGate('NEWSLETTER_ENABLED')
