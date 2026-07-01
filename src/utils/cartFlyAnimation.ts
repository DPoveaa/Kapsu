type AnimateCartFlyOptions = {
  fromElement: HTMLElement | null
  productId?: string
  cartElement?: HTMLElement | null
  onArrive?: () => void
  color?: string
}

const prefersReducedMotion = () => {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const animateCartFly = ({ fromElement, cartElement, onArrive, color }: AnimateCartFlyOptions): Promise<boolean> => {
  if (typeof document === 'undefined' || !fromElement || prefersReducedMotion()) {
    onArrive?.()
    return Promise.resolve(false)
  }

  const target = cartElement
    || document.querySelector<HTMLElement>('[data-cart-icon-target]')
    || document.querySelector<HTMLElement>('a[href="/carrinho"]')

  if (!target) {
    onArrive?.()
    return Promise.resolve(false)
  }

  const from = fromElement.getBoundingClientRect()
  const to = target.getBoundingClientRect()

  const dotColor = color || '#00A86B'

  const dot = document.createElement('span')
  dot.setAttribute('aria-hidden', 'true')
  dot.style.position = 'fixed'
  dot.style.left = `${from.left + from.width / 2 - 5}px`
  dot.style.top = `${from.top + from.height / 2 - 5}px`
  dot.style.width = '10px'
  dot.style.height = '10px'
  dot.style.borderRadius = '9999px'
  dot.style.background = dotColor
  dot.style.boxShadow = `0 8px 18px ${dotColor}5c`
  dot.style.zIndex = '9999'
  dot.style.pointerEvents = 'none'
  dot.style.transform = 'translate3d(0, 0, 0) scale(1)'
  dot.style.transition = 'transform 650ms cubic-bezier(.2,.8,.2,1), opacity 200ms ease 550ms'

  document.body.appendChild(dot)

  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)

  return new Promise((resolve) => {
    let finished = false
    const cleanup = (value: boolean) => {
      if (finished) return
      finished = true
      dot.remove()
      if (value) onArrive?.()
      resolve(value)
    }

    window.requestAnimationFrame(() => {
      dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.45)`
      dot.style.opacity = '0.25'
    })

    window.setTimeout(() => cleanup(true), 700)
  })
}

export const animateAddToCart = animateCartFly