export const useSticky = (el: HTMLElement, offset: number) => {
  const onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    if (scrollTop > offset) {
      el.classList.add('sticky')
    }
    else {
      el.classList.remove('sticky')
    }
  }

  useEventListener('scroll', onScroll)

  return {
    onScroll,
  }
}
