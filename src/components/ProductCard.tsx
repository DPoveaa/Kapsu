import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Plus, Check } from 'lucide-react'
import { Product } from '../types'
import { useCart } from '../context/CartContext'
import { productsService } from '../services/products.service'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'
import { animateAddToCart } from '../utils/cartFlyAnimation'
import { generateProductUrl } from '../utils/productUrl'

// ─── Color palettes ────────────────────────────────────────────────────────
const BURST_COLORS = [
  '#00A86B', '#33D782', '#6BE7A8', '#008A57', '#A3F7CE', '#00C878',
]
const CONFETTI_COLORS = [
  '#00A86B', '#33D782', '#6BE7A8', '#FBBF24', '#F59E0B',
  '#60A5FA', '#F472B6', '#A78BFA', '#FB923C', '#FFFFFF',
  '#34D399', '#FCD34D', '#93C5FD', '#F9A8D4',
]

// ─── Types ─────────────────────────────────────────────────────────────────
interface Piece {
  id: number
  x: number   // fixed screen x
  y: number   // fixed screen y
  tx: number  // translation x (CSS --tx)
  ty: number  // translation y (CSS --ty)
  rot: number // rotation deg (CSS --rot, confetti only)
  size: number
  color: string
  duration: number
  round: boolean
}
interface Ring  { id: number; x: number; y: number; color: string }

let _uid = 0
const uid = () => ++_uid

// ─── Component ─────────────────────────────────────────────────────────────
interface ProductCardProps { product: Product }

export default function ProductCard({ product }: ProductCardProps) {
  const { addProduct } = useCart()

  // UI state
  const [isAdded,    setIsAdded]    = useState(false)
  const [btnAnim,    setBtnAnim]    = useState(false)
  const [bursts,     setBursts]     = useState<Piece[]>([])
  const [confetti,   setConfetti]   = useState<Piece[]>([])
  const [rings,      setRings]      = useState<Ring[]>([])

  // Refs
  const btnRef         = useRef<HTMLButtonElement>(null)
  const addedTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickCount     = useRef(0)
  const clickResetTimer= useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Get button screen centre ──────────────────────────────────────────
  const centre = () => {
    const r = btnRef.current?.getBoundingClientRect()
    return { x: (r?.left ?? 0) + (r?.width ?? 0) / 2, y: (r?.top ?? 0) + (r?.height ?? 0) / 2 }
  }

  // ── Burst particles (always) ──────────────────────────────────────────
  const spawnBurst = useCallback(() => {
    const { x, y } = centre()
    const COUNT = 10
    const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
      const angleDeg = (360 / COUNT) * i + (Math.random() - 0.5) * 30
      const angleRad = (angleDeg * Math.PI) / 180
      const dist = 28 + Math.random() * 20
      return {
        id: uid(), x, y,
        tx: Math.cos(angleRad) * dist,
        ty: Math.sin(angleRad) * dist,
        rot: 0,
        size: 5 + Math.random() * 4,
        color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
        duration: 480 + Math.random() * 80,
        round: true,
      }
    })
    setBursts(prev => [...prev, ...pieces])
    setTimeout(() => setBursts(prev => prev.filter(p => !pieces.some(n => n.id === p.id))), 600)
  }, [])

  // ── Confetti + ring + toast (every 5 rapid clicks) ────────────────────
  const spawnConfetti = useCallback((count: number) => {
    const { x, y } = centre()

    // Confetti pieces
    const COUNT = 32
    const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
      const angleDeg = (360 / COUNT) * i + (Math.random() - 0.5) * 18
      const angleRad = (angleDeg * Math.PI) / 180
      const dist = 65 + Math.random() * 90
      return {
        id: uid(), x, y,
        tx: Math.cos(angleRad) * dist,
        ty: Math.sin(angleRad) * dist,
        rot: (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 420),
        size: 7 + Math.random() * 8,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        duration: 850 + Math.random() * 500,
        round: Math.random() > 0.42,
      }
    })
    setConfetti(prev => [...prev, ...pieces])
    setTimeout(() => setConfetti(prev => prev.filter(p => !pieces.some(n => n.id === p.id))), 1500)

    // Determine ring color depending on quantity: first green, then blue, last gold
    let ringColor = '#00A86B' // verde (5 clicks)
    if (count === 10) {
      ringColor = '#3B82F6' // azul (10 clicks)
    } else if (count >= 15) {
      ringColor = '#FBBF24' // dourado (15+ clicks)
    }

    // Expanding ring
    const ringId = uid()
    setRings(prev => [...prev, { id: ringId, x, y, color: ringColor }])
    setTimeout(() => setRings(prev => prev.filter(r => r.id !== ringId)), 700)
  }, [])

  // ── Main click handler ────────────────────────────────────────────────
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.active) return

    addProduct(product, 1)

    // Track rapid clicks (reset after 2 s of inactivity)
    clickCount.current += 1
    if (clickResetTimer.current) clearTimeout(clickResetTimer.current)
    clickResetTimer.current = setTimeout(() => { clickCount.current = 0 }, 2000)

    // Determine fly color dynamically
    let flyColor = '#00A86B'
    const count = clickCount.current
    if (count >= 15) {
      flyColor = '#FBBF24'
    } else if (count >= 10) {
      flyColor = '#3B82F6'
    }

    animateAddToCart({ fromElement: btnRef.current, color: flyColor })

    // Always burst
    spawnBurst()

    // Confetti every 5th rapid click
    if (clickCount.current % 5 === 0) spawnConfetti(clickCount.current)

    // Button bounce — retrigger each click
    setBtnAnim(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setBtnAnim(true)))
    setTimeout(() => setBtnAnim(false), 420)

    // Checkmark — reset timer on every click so it stays visible while clicking
    if (addedTimer.current) clearTimeout(addedTimer.current)
    setIsAdded(true)
    addedTimer.current = setTimeout(() => setIsAdded(false), 1500)
  }

  const imageUrl = productsService.getImageUrl(product.image)

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <Link to={generateProductUrl(product)} className="block h-full group">
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg dark:hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">

          {/* ── Image ── */}
          <div className="relative w-full aspect-square bg-white flex-shrink-0 overflow-hidden">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
            />
            {product.promo_price && (
              <span className="absolute top-2 left-2 bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                {Math.round(((Number(product.price) - Number(product.promo_price)) / Number(product.price)) * 100)}% OFF
              </span>
            )}
            {!product.active && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1 rounded-full">Inativo</span>
              </div>
            )}
          </div>

          {/* ── Content ── */}
          <div className="flex flex-col flex-1 p-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {product.name}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2 flex-1">
              {product.description || 'Fórmula manipulada com alto padrão de qualidade e eficácia.'}
            </p>
            {product.free_shipping && (
              <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold mb-2">
                🚚 Frete grátis
              </span>
            )}

            {/* ── Price + button ── */}
            <div className="flex items-center justify-between gap-2 mt-auto">
              <div className="flex flex-col min-w-0">
                {product.promo_price ? (
                  <>
                    <span className="text-[10px] text-gray-400 line-through leading-none">
                      R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-base font-bold text-primary-600 dark:text-primary-400 leading-tight">
                      R$ {Number(product.promo_price || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </>
                ) : (
                  <span className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>

              <button
                ref={btnRef}
                onClick={handleAddToCart}
                disabled={!product.active}
                aria-label="Adicionar ao carrinho"
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm ${
                  isAdded ? 'bg-green-500' : 'bg-primary-600 hover:bg-primary-700'
                } ${btnAnim ? 'btn-pop-anim' : ''}`}
              >
                {isAdded
                  ? <Check size={16} strokeWidth={2.5} />
                  : <Plus  size={18} strokeWidth={2.5} />
                }
              </button>
            </div>
          </div>
        </div>
      </Link>

      {/* ── Portal: all visual effects bypass overflow-hidden ── */}
      {createPortal(
        <>
          {/* Regular burst particles */}
          {bursts.map(p => (
            <span
              key={p.id}
              className="fixed pointer-events-none z-[9999]"
              style={{
                left: p.x, top: p.y,
                width: p.size, height: p.size,
                backgroundColor: p.color,
                borderRadius: '50%',
                animation: `particle-burst ${p.duration}ms ease-out forwards`,
                ['--tx' as string]: `${p.tx}px`,
                ['--ty' as string]: `${p.ty}px`,
              }}
            />
          ))}

          {/* Confetti pieces */}
          {confetti.map(p => (
            <span
              key={p.id}
              className="fixed pointer-events-none z-[9999]"
              style={{
                left: p.x, top: p.y,
                width: p.size, height: p.round ? p.size : p.size * 0.55,
                backgroundColor: p.color,
                borderRadius: p.round ? '50%' : '3px',
                animation: `confetti-fall ${p.duration}ms ease-out forwards`,
                ['--tx' as string]: `${p.tx}px`,
                ['--ty' as string]: `${p.ty}px`,
                ['--rot' as string]: `${p.rot}deg`,
              } as React.CSSProperties}
            />
          ))}

          {/* Expanding ring */}
          {rings.map(r => (
            <span
              key={r.id}
              className="fixed pointer-events-none z-[9998]"
              style={{
                left: r.x, top: r.y,
                width: 36, height: 36,
                borderRadius: '50%',
                border: `2.5px solid ${r.color}`,
                animation: 'ring-burst 0.62s ease-out forwards',
              }}
            />
          ))}
        </>,
        document.body
      )}
    </>
  )
}
