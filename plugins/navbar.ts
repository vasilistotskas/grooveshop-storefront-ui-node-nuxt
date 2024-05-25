export default defineNuxtPlugin(() => {
  onNuxtReady(async () => {
    const showDrawer = useState<boolean>('navbar.showDrawer', () => false)
    const showOptions = useState<boolean>(
      'navbar.showOptions',
      () => false,
    )
    showDrawer.value = false
    showOptions.value = false
  })
})
