/**
 * Deleting one saved address, apart from its drawing (`Address/Card` and
 * the tenants' own).
 *
 * The main address is the one checkout fills in, so it is never deleted:
 * another address has to become the main one first. Django does not
 * refuse it, so the rule is here; `remove()` answers `'main'` without a
 * request, and a drawing that offers the button on the main address says
 * why in its own words. A failed request is told with Django's reason
 * (`useApiError().notify`). On success the drawing's `deleted` is toasted
 * and `onDeleted` called so the list can reload.
 */
export function useAddressRemoval(options: {
  address: () => UserAddress
  messages: () => { deleted: string, deleteError: string }
  onDeleted: () => void
}) {
  const toast = useToast()
  const { notify } = useApiError()

  const removing = ref(false)

  async function remove(): Promise<'removed' | 'main' | 'failed'> {
    const address = options.address()
    if (address.isMain) return 'main'
    removing.value = true
    try {
      await $api(`/api/user/addresses/${address.id}`, { method: 'DELETE' })
      toast.add({ title: options.messages().deleted, color: 'success' })
      options.onDeleted()
      return 'removed'
    }
    catch (error) {
      log.error({ action: 'address:delete', error })
      notify('address:delete', error, { title: options.messages().deleteError })
      return 'failed'
    }
    finally {
      removing.value = false
    }
  }

  return { removing, remove }
}
