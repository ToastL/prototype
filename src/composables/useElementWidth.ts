import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export function useElementWidth(el: Ref<HTMLElement | null>) {
  const width = ref(0)
  let observer: ResizeObserver | undefined

  onMounted(() => {
    if (!el.value) return
    width.value = el.value.clientWidth
    observer = new ResizeObserver((entries) => {
      width.value = entries[0].contentRect.width
    })
    observer.observe(el.value)
  })
  onBeforeUnmount(() => observer?.disconnect())

  return width
}
