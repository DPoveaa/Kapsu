import { useRef, useState, useCallback, useEffect } from 'react'

export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragged, setDragged] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollButtons = useCallback(() => {
    const el = ref.current
    if (!el) return
    
    // We check if we can scroll left (scrollLeft > 2 pixels)
    setCanScrollLeft(el.scrollLeft > 2)
    
    // We check if we can scroll right (scrollLeft + clientWidth < scrollWidth - 2 pixels)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  // Listen to scroll events, resize events, and mutations
  useEffect(() => {
    const el = ref.current
    if (!el) return

    updateScrollButtons()
    
    el.addEventListener('scroll', updateScrollButtons, { passive: true })
    window.addEventListener('resize', updateScrollButtons)

    // Setup mutation observer to capture when items render dynamically
    const observer = new MutationObserver(updateScrollButtons)
    observer.observe(el, { childList: true, subtree: true })

    return () => {
      el.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
      observer.disconnect()
    }
  }, [updateScrollButtons])

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    
    setIsDragging(true)
    setDragged(false)
    setStartX(e.clientX)
    setScrollLeft(el.scrollLeft)
    
    // Temporarily turn off smooth scrolling & snap to prevent drag lag
    el.style.scrollBehavior = 'auto'
    el.style.scrollSnapType = 'none'
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!isDragging || !el) return
    
    e.preventDefault()
    const walk = (e.clientX - startX) * 1.5 // Speed factor
    el.scrollLeft = scrollLeft - walk
    
    if (Math.abs(e.clientX - startX) > 5) {
      setDragged(true)
    }
  }, [isDragging, startX, scrollLeft])

  const onMouseUpOrLeave = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    
    const el = ref.current
    if (el) {
      // Re-enable smooth scrolling and snapping transitions
      el.style.scrollBehavior = ''
      el.style.scrollSnapType = ''
    }
    
    // Defer resetting dragged state so that the browser-fired onClickCapture event handles it first
    setTimeout(() => {
      setDragged(false)
    }, 50)
  }, [isDragging])

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragged) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [dragged])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = ref.current
    if (!el) return
    
    const scrollAmount = el.clientWidth * 0.75
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }, [])

  return {
    ref,
    onMouseDown,
    onMouseMove,
    onMouseUp: onMouseUpOrLeave,
    onMouseLeave: onMouseUpOrLeave,
    onClickCapture,
    scroll,
    canScrollLeft,
    canScrollRight,
    isDragging
  }
}
