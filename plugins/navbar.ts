export default defineNuxtPlugin(() => {
  // when page redirect on mobile device, close drawer navbar
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
