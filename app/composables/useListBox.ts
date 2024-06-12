export const useListBox = (listBox: globalThis.Ref<null>) => {
  const listBoxOpen = ref(false)
  const listBoxToggle = () => {
    listBoxOpen.value = !listBoxOpen.value
  }
  onClickOutside(listBox, () => {
    listBoxOpen.value = false
  })
  return {
    listBoxOpen,
    listBoxToggle,
  }
}
