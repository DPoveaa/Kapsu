import { ImgHTMLAttributes, useEffect, useRef, useState } from 'react'
import { productsService } from '../services/products.service'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import { getResponsiveImageSrcSet } from '../utils/imageUrl'

interface DeferredProductImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  imagePath?: string | null
}

const EMPTY_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E'

export default function DeferredProductImage({ imagePath, onError, ...props }: DeferredProductImageProps) {
  const ref = useRef<HTMLImageElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '150px 150px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return <img
    ref={ref}
    {...props}
    src={visible ? productsService.getImageUrl(imagePath) : EMPTY_IMAGE}
    srcSet={visible ? getResponsiveImageSrcSet(imagePath, [160, 320, 640]) : undefined}
    sizes="(max-width: 640px) 50vw, 240px"
    width={320}
    height={320}
    loading="lazy"
    decoding="async"
    onError={(event) => {
      const image = event.currentTarget
      if (image.srcset) {
        image.srcset = ''
        image.removeAttribute('srcset')
        image.src = productsService.getImageUrl(imagePath)
        return
      }
      if (onError) onError(event)
      else handleImageError(event, PRODUCT_IMAGE_FALLBACK)
    }}
  />
}
