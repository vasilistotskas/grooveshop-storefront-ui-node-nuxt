/**
 * The gift cards linked to the signed-in shopper's account. Every drawing
 * of the account's gift-card page reads them here, so they are one request
 * under one key.
 *
 * Returns the request itself: a page that renders only once the cards are
 * in `await`s it, one that shows its own loading state does not.
 */
export function useMyGiftCards() {
  return useApi('/api/giftcard/mine', {
    key: 'account-gift-cards',
    method: 'GET',
  })
}
