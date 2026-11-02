import { getActivePinia } from 'pinia'
import { useBuilderAutosaveStore } from '~/stores/builderAutosave'
import { useBuilderEditorStore } from '~/stores/builderEditor'
import { useBuilderLibraryStore } from '~/stores/builderLibrary'

/**
 * Starts the editor's stores afresh: they live as long as the Nuxt app,
 * which every spec of a file shares, and their history and pending saves
 * would otherwise carry from one test into the next. Disposing a store and
 * deleting its state is how Pinia drops one; the next use builds it new.
 */
export function resetBuilderEditorStores(): void {
  const pinia = getActivePinia()
  for (const store of [useBuilderAutosaveStore(), useBuilderEditorStore(), useBuilderLibraryStore()]) {
    store.$dispose()
    if (pinia) Reflect.deleteProperty(pinia.state.value, store.$id)
  }
}
