/**
 * The store's product categories as a flat, crawlable list: the one
 * internal link into `/products/category/**` on a listing that has no
 * category chips (the frozen webside listing). One page of the
 * categories, under its own key.
 */
export function useProductCategoriesNav() {
  return useApi('/api/products/categories', {
    key: 'productCategoriesNav',
    method: 'GET',
    headers: useRequestHeaders(),
  })
}
