/**
 * Where the editor's add-section library is open: the document and the
 * place in it a new section or block goes (`BuilderInsertPoint`), or none.
 * Every way in (the outline, the selection's toolbar, the preview) opens it
 * here, and `Builder/Library.vue` reads it.
 */
export const useBuilderLibraryStore = defineStore('builderLibrary', () => {
  const target = ref<({ documentKey: string } & BuilderInsertPoint) | null>(null)

  function open(documentKey: string, at: BuilderInsertPoint): void {
    target.value = { documentKey, ...at }
  }

  function close(): void {
    target.value = null
  }

  return { target, open, close }
})
