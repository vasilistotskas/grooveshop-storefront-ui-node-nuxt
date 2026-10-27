/**
 * The store's blog tags: one list under one key, read by every drawing of
 * the tag filter (`Blog/Tags/List.vue` and the tenants' own).
 */
export function useBlogTags() {
  return useApi('/api/blog/tags', {
    key: 'blogTags',
    method: 'GET',
    headers: useRequestHeaders(),
  })
}
