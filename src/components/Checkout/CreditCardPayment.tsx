import { useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import {
  CreditCardFormData,
  detectCardBrand,
  CardBrand,
} from '../../utils/cardValidation'

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface InstallmentOption {
  installments: number
  installmentValue: number
  totalValue: number
  hasInterest: boolean
  label: string
}

interface CreditCardPaymentProps {
  formData: CreditCardFormData
  onChange: (data: CreditCardFormData) => void
  errors: Record<string, string>
  installmentOptions: InstallmentOption[]
  loadingOptions?: boolean
  maxInterestFree?: number
  disabled?: boolean
}

/* ─── Brand configuration ────────────────────────────────────────────────── */

interface BrandConfig {
  name: string
  /** CSS gradient used only for the card edge glow */
  edgeGlow: string
  /** Positioned shadow colors that softly extend the edge glow outside the card */
  edgeShadows: Array<{ x: number; y: number; color: string; alpha: number }>
  /**
   * Path to the official SVG asset in /public/brands/.
   * null = no logo (unknown brand, card empty).
   */
  logoSrc: string | null
}

/**
 * All brand logos are served as static SVG files from /public/brands/.
 * Each is rendered via <img> with object-contain so aspect ratio is always
 * preserved regardless of the intrinsic SVG dimensions.
 */
const BRAND_CONFIGS: Record<CardBrand, BrandConfig> = {
  visa: {
    name: 'Visa',
    edgeGlow: 'linear-gradient(90deg, rgba(37,99,235,0.22), rgba(59,130,246,0.3) 50%, rgba(147,197,253,0.18))',
    edgeShadows: [{ x: 0, y: 0, color: '37,99,235', alpha: 0.18 }],
    logoSrc: '/brands/visa.svg',
  },
  mastercard: {
    name: 'Mastercard',
    edgeGlow: 'radial-gradient(circle at 86% 84%, rgba(255,95,0,0.34) 0%, rgba(255,95,0,0.2) 26%, transparent 52%), radial-gradient(circle at 72% 84%, rgba(235,0,27,0.26) 0%, rgba(235,0,27,0.16) 24%, transparent 50%)',
    edgeShadows: [
      { x: 6, y: 10, color: '235,0,27', alpha: 0.1 },
      { x: 14, y: 10, color: '255,95,0', alpha: 0.12 },
    ],
    logoSrc: '/brands/mastercard.svg',
  },
  amex: {
    name: 'Amex',
    edgeGlow: 'linear-gradient(90deg, rgba(22,163,74,0.18), rgba(34,197,94,0.28) 52%, rgba(134,239,172,0.16))',
    edgeShadows: [{ x: 0, y: 0, color: '34,197,94', alpha: 0.16 }],
    logoSrc: '/brands/amex.svg',
  },
  elo: {
    name: 'Elo',
    edgeGlow: 'radial-gradient(circle at 0% 100%, rgba(0,114,206,0.34) 0%, rgba(0,114,206,0.2) 24%, transparent 48%), radial-gradient(circle at 100% 0%, rgba(255,203,5,0.34) 0%, rgba(255,203,5,0.2) 24%, transparent 48%), radial-gradient(circle at 100% 100%, rgba(239,51,64,0.3) 0%, rgba(239,51,64,0.18) 24%, transparent 48%)',
    edgeShadows: [
      { x: -14, y: 16, color: '0,114,206', alpha: 0.13 },
      { x: 14, y: -16, color: '255,203,5', alpha: 0.14 },
      { x: 16, y: 16, color: '239,51,64', alpha: 0.12 },
    ],
    logoSrc: '/brands/elo.svg',
  },
  hipercard: {
    name: 'Hipercard',
    edgeGlow: 'linear-gradient(90deg, rgba(185,28,28,0.18), rgba(220,38,38,0.28) 52%, rgba(248,113,113,0.16))',
    edgeShadows: [{ x: 0, y: 0, color: '220,38,38', alpha: 0.16 }],
    logoSrc: null,
  },
  unknown: {
    name: '',
    edgeGlow: 'linear-gradient(90deg, rgba(148,163,184,0.1), rgba(255,255,255,0.14), rgba(148,163,184,0.1))',
    edgeShadows: [{ x: 0, y: 0, color: '148,163,184', alpha: 0.08 }],
    logoSrc: null,
  },
}

function getBrandOpacity(number: string, brand: CardBrand): number {
  const d = number.replace(/\D/g, '')
  if (d.length === 0 || brand === 'unknown') return 0
  if (d.length <= 2) return 0.35
  if (d.length <= 4) return 0.6
  if (d.length <= 8) return 0.85
  return 1
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function CreditCardPayment({
  formData,
  onChange,
  errors,
  installmentOptions,
  loadingOptions = false,
  maxInterestFree = 1,
  disabled = false,
}: CreditCardPaymentProps) {
  const brand = detectCardBrand(formData.number)

  /* animate brand switch: crossfade old → new */
  const [displayBrand, setDisplayBrand] = useState<CardBrand>(brand)
  const [brandOpacity, setBrandOpacity] = useState(1)
  const brandTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (brand === displayBrand) return
    if (brandTimeout.current) clearTimeout(brandTimeout.current)
    // fade out current
    setBrandOpacity(0)
    brandTimeout.current = setTimeout(() => {
      setDisplayBrand(brand)
      setBrandOpacity(1)
    }, 180)
    return () => { if (brandTimeout.current) clearTimeout(brandTimeout.current) }
  }, [brand]) // eslint-disable-line react-hooks/exhaustive-deps

  const [isCvvFocused, setIsCvvFocused] = useState(false)

  /* parallax (desktop only, max 3–4°) */
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [shineX, setShineX] = useState(50)
  const [shineY, setShineY] = useState(50)
  const [isHovered, setIsHovered] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(hover: none)')
    setIsMobile(mq.matches)
  }, [])

  useEffect(() => {
    const updateTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  /* derived values */
  const logoOpacity = getBrandOpacity(formData.number, displayBrand)
  const activeConfig = BRAND_CONFIGS[displayBrand]
  const glowIntensity = logoOpacity          // 0-1
  const edgeGlowOpacity = Math.min(glowIntensity * 0.34, 0.34)
  const edgeGlowBlur = Math.round(44 + glowIntensity * 24)
  const edgeGlowAlpha = Math.min(0.08 + glowIntensity * 0.38, 0.38)
  const brandEdgeShadows = activeConfig.edgeShadows
    .map(({ x, y, color, alpha }) => `${x}px ${y}px ${edgeGlowBlur}px rgba(${color},${Math.min(alpha * edgeGlowAlpha, 0.18).toFixed(2)})`)
    .join(', ')
  const virtualCardBackground = isDark
    ? 'radial-gradient(ellipse at 30% 30%, #2c2c3e 0%, #141418 55%, #0d0d10 100%)'
    : 'radial-gradient(ellipse at 28% 22%, #ffffff 0%, #eef1f5 44%, #cfd5dd 100%)'
  const cardTextColor = isDark ? '#ffffff' : '#111827'
  const cardLabelColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(17,24,39,0.48)'
  const cardTextShadow = isDark ? '0 1px 8px rgba(0,0,0,0.5)' : '0 1px 0 rgba(255,255,255,0.75)'
  const cardNumberDigits = formData.number.replace(/\D/g, '').slice(0, 16)
  const cardNumberGroups = (cardNumberDigits.padEnd(16, '•').match(/.{1,4}/g) || ['••••', '••••', '••••', '••••']).slice(0, 4)
  const topHighlight = isDark
    ? 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)'
    : 'radial-gradient(circle, rgba(255,255,255,0.42) 0%, transparent 66%)'
  const cardBaseShadow = isDark
    ? '0 18px 34px rgba(0,0,0,0.42)'
    : '0 16px 30px rgba(15,23,42,0.14)'
  const cardBaseStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.16)'

  /* ─── Handlers ───────────────────────────────────────────────────────── */

  const handleField = (field: keyof CreditCardFormData, value: string | number) =>
    onChange({ ...formData, [field]: value })

  useEffect(() => {
    if (
      installmentOptions.length > 0 &&
      !installmentOptions.some((o) => o.installments === formData.installments)
    ) {
      onChange({ ...formData, installments: installmentOptions[0].installments })
    }
  }, [installmentOptions]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Parallax */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || isMobile) return
    const rect = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    setRotateX(-ny * 7)   // max ±3.5°
    setRotateY(nx * 7)
    setShineX(((e.clientX - rect.left) / rect.width) * 100)
    setShineY(((e.clientY - rect.top) / rect.height) * 100)
  }
  const handleMouseEnter = () => { if (!reducedMotion && !isMobile) setIsHovered(true) }
  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotateX(0)
    setRotateY(0)
  }

  /* ── Cursor-aware input masks ─────────────────────────────────────────── */

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const sel = input.selectionStart ?? 0
    let raw = input.value
    const prev = formData.number

    if (prev.length - raw.length === 1 && prev.charAt(sel) === ' ')
      raw = raw.slice(0, sel - 1) + raw.slice(sel)

    const digits = raw.replace(/\D/g, '').slice(0, 16)
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ')
    handleField('number', formatted)

    setTimeout(() => {
      let c = sel
      if (prev.length < formatted.length && formatted.charAt(sel - 1) === ' ') c += 1
      if (prev.length > formatted.length && prev.charAt(sel) === ' ') c = Math.max(0, sel - 1)
      input.setSelectionRange(c, c)
    }, 0)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const sel = input.selectionStart ?? 0
    let raw = input.value
    const prev = formData.expiry

    if (prev.length - raw.length === 1 && prev.charAt(sel) === '/')
      raw = raw.slice(0, sel - 1) + raw.slice(sel)

    const digits = raw.replace(/\D/g, '').slice(0, 4)
    let formatted = digits
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
    else if (digits.length === 2 && prev.length === 3 && raw.length === 2) formatted = digits

    handleField('expiry', formatted)

    setTimeout(() => {
      let c = sel
      if (prev.length < formatted.length && formatted.charAt(sel - 1) === '/') c += 1
      if (prev.length > formatted.length && prev.charAt(sel) === '/') c = Math.max(0, sel - 1)
      input.setSelectionRange(c, c)
    }, 0)
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const sel = input.selectionStart ?? 0
    let raw = input.value
    const prev = formData.cpf

    if (prev.length - raw.length === 1 && (prev.charAt(sel) === '.' || prev.charAt(sel) === '-'))
      raw = raw.slice(0, sel - 1) + raw.slice(sel)

    const digits = raw.replace(/\D/g, '').slice(0, 11)
    let formatted = digits
    if (digits.length > 9) formatted = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    else if (digits.length > 6) formatted = digits.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
    else if (digits.length > 3) formatted = digits.replace(/(\d{3})(\d{1,3})/, '$1.$2')
    handleField('cpf', formatted)

    setTimeout(() => {
      let c = sel
      const last = formatted.charAt(sel - 1)
      if (prev.length < formatted.length && (last === '.' || last === '-')) c += 1
      const del = prev.charAt(sel)
      if (prev.length > formatted.length && (del === '.' || del === '-')) c = Math.max(0, sel - 1)
      input.setSelectionRange(c, c)
    }, 0)
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleField('ccv', e.target.value.replace(/\D/g, '').slice(0, 3))

  /* ── Reserved-height error ────────────────────────────────────────────── */

  const renderError = (error?: string) => (
    <div className="h-4 mt-1 overflow-hidden pointer-events-none" aria-live="polite">
      <p className={`text-[11px] text-red-500 transition-all duration-200 ${error ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
        {error ?? ''}
      </p>
    </div>
  )

  /* Card box-shadow (edge glow + CVV glow) */
  const cardShadow = isCvvFocused
    ? `0 0 0 1.5px rgba(249,115,22,0.78), 0 0 34px rgba(249,115,22,0.42), ${cardBaseShadow}`
    : `0 0 0 1px ${cardBaseStroke}, ${cardBaseShadow}${brandEdgeShadows ? `, ${brandEdgeShadows}` : ''}`

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 space-y-4 animate-fade-in">

      {/* Keyframes injected once */}
      <style>{`
        @keyframes chip-sweep {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(400%); }
        }
        .chip-sweep { animation: chip-sweep 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .chip-sweep { animation: none; } }
      `}</style>

      {/* ══ Virtual Card ═════════════════════════════════════════════════ */}
      <div className="flex justify-center">
        <div
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          /* Fixed dimensions — never change */
          className="relative isolate w-full max-w-sm h-48 rounded-2xl overflow-hidden select-none will-change-transform"
          style={{
            background: virtualCardBackground,
            borderRadius: 16,
            backgroundClip: 'padding-box',
            boxShadow: cardShadow,
            transition: isHovered
              ? 'box-shadow 0.3s'
              : 'transform 0.55s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s',
            transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          }}
        >
          {/* — Subtle noise texture — */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              opacity: 0.04,
              mixBlendMode: 'overlay',
            }}
          />

          {/* — Subtle top-right highlight (very low opacity, not distracting) — */}
          <div
            className="absolute -top-20 -right-20 w-52 h-52 rounded-full pointer-events-none"
            style={{
              background: topHighlight,
            }}
          />

          {/* Brand accent is clipped by the card radius; no masks to avoid corner artifacts */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500 ease-out"
            style={{
              background: activeConfig.edgeGlow,
              boxShadow: `inset 0 0 0 1px ${cardBaseStroke}`,
              opacity: edgeGlowOpacity,
            }}
          />

          {/* ═══════════════ CARD FACE CONTENT ═══════════════ */}
          {/* Mouse sheen is clipped to the same rounded card bounds */}
          {!isMobile && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                opacity: isHovered ? 0.08 : 0,
                background: `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.28) 0%, transparent 55%)`,
                transition: 'opacity 0.25s',
                mixBlendMode: 'overlay',
              }}
            />
          )}
          <div className="relative z-10 flex flex-col justify-between h-full px-6 py-5">

            {/* ROW 1: card type label ← → lock icon */}
            <div className="flex justify-between items-start">
              <div className="relative h-[14px] w-28">
              </div>

              {/* Lock icon — pulses orange on CVV focus */}
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`w-4 h-4 transition-all duration-300 ${isCvvFocused ? 'text-orange-400 opacity-100' : 'opacity-35'}`}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            {/* ROW 2: Card number — prominent */}
            <div className={`min-w-0 transition-opacity duration-250 ${isCvvFocused ? 'opacity-35' : 'opacity-100'}`}>
              <div
                className="flex w-full min-w-0 items-center justify-between gap-1.5 whitespace-nowrap font-mono font-medium select-all overflow-hidden sm:gap-2"
                aria-label={formData.number || 'Número do cartão'}
                style={{ color: cardTextColor, fontSize: 'clamp(0.86rem, 4.4vw, 1.4rem)', letterSpacing: 'clamp(0.02em, 0.75vw, 0.22em)', textShadow: cardTextShadow }}
              >
                {cardNumberGroups.map((group, index) => (
                  <span key={index} className="shrink min-w-0 tabular-nums leading-none">
                    {group}
                  </span>
                ))}
              </div>
            </div>

            {/* ROW 3: Holder + Expiry */}
            <div className={`flex justify-between items-end gap-4 transition-opacity duration-250 ${isCvvFocused ? 'opacity-35' : 'opacity-100'}`}>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-[0.18em] mb-0.5" style={{ color: cardLabelColor }}>Titular</p>
                <p className="font-mono text-[15px] font-semibold tracking-wide truncate uppercase" style={{ color: cardTextColor, textShadow: cardTextShadow }}>
                  {formData.holderName || 'NOME IMPRESSO'}
                </p>
              </div>
              <div className="shrink-0">
                <p className="text-[9px] uppercase tracking-[0.18em] mb-0.5 text-right" style={{ color: cardLabelColor }}>Validade</p>
                <p className="font-mono text-[15px] font-semibold tracking-wide text-right" style={{ color: cardTextColor, textShadow: cardTextShadow }}>
                  {formData.expiry || 'MM/AA'}
                </p>
              </div>
            </div>

            {/* ROW 4: Chip ← → Brand logo */}
            <div className="flex justify-between items-center">
              {/* EMV chip */}
              <div
                className="relative overflow-hidden rounded-[4px] shrink-0"
                style={{
                  width: 42, height: 30,
                  background: 'linear-gradient(135deg, #d4a843 0%, #f0d060 40%, #c89020 70%, #e8c040 100%)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {/* chip sweep shimmer */}
                <div
                  className="chip-sweep absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)' }}
                />
                {/* chip etched lines */}
                <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0,0,0,0.12)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(0,0,0,0.12)' }} />
              </div>

              {/* Brand logo — fixed wrapper, logos crossfade inside.
                  All brands use <img> + object-contain: aspect ratio is always
                  preserved, retina-sharp (SVG), and layout never shifts. */}
              <div className="relative h-7 w-[80px] flex items-center justify-end overflow-hidden">
                {(Object.keys(BRAND_CONFIGS) as CardBrand[]).map((key) => {
                  const cfg = BRAND_CONFIGS[key]
                  if (!cfg.logoSrc) return null
                  const visible = key === displayBrand
                  return (
                    <div
                      key={key}
                      aria-hidden={!visible}
                      className="absolute inset-0 flex items-center justify-end"
                      style={{
                        opacity: visible ? brandOpacity : 0,
                        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(3px)',
                        transition: 'opacity 0.22s ease, transform 0.22s ease',
                        pointerEvents: visible ? 'auto' : 'none',
                      }}
                    >
                      {/* Fixed bounding box: every logo is constrained to the same
                          80×28px rectangle. object-contain scales the SVG to fit
                          without stretching, so even different aspect ratios render
                          at a consistent perceived size. */}
                      <img
                        src={cfg.logoSrc}
                        alt={cfg.name}
                        className="object-contain"
                        style={{ width: 80, height: 28 }}
                        draggable={false}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Form Fields ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Card number */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Número do cartão *
          </label>
          <input
            type="text" inputMode="numeric" disabled={disabled}
            value={formData.number}
            onChange={handleCardNumberChange}
            placeholder="0000 0000 0000 0000"
            className={`w-full px-3 py-2.5 text-sm border rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#00A86B] outline-none ${errors.number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
          />
          {renderError(errors.number)}
        </div>

        {/* Holder name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Nome no cartão *
          </label>
          <input
            type="text" disabled={disabled}
            value={formData.holderName}
            onChange={(e) => handleField('holderName', e.target.value.toUpperCase())}
            placeholder="Como impresso no cartão"
            className={`w-full px-3 py-2.5 text-sm border rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#00A86B] outline-none ${errors.holderName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
          />
          {renderError(errors.holderName)}
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Validade *
          </label>
          <input
            type="text" inputMode="numeric" disabled={disabled}
            value={formData.expiry}
            onChange={handleExpiryChange}
            placeholder="MM/AA" maxLength={5}
            className={`w-full px-3 py-2.5 text-sm border rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#00A86B] outline-none ${errors.expiry ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
          />
          {renderError(errors.expiry)}
        </div>

        {/* CVV */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            CVV *
          </label>
          <input
            type="text" inputMode="numeric" disabled={disabled}
            value={formData.ccv}
            onFocus={() => setIsCvvFocused(true)}
            onBlur={() => setIsCvvFocused(false)}
            onChange={handleCvvChange}
            placeholder="123" maxLength={3}
            className={`w-full px-3 py-2.5 text-sm border rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#00A86B] outline-none ${errors.ccv ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
          />
          {renderError(errors.ccv)}
        </div>

        {/* CPF */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            CPF do titular *
          </label>
          <input
            type="text" inputMode="numeric" disabled={disabled}
            value={formData.cpf}
            onChange={handleCpfChange}
            placeholder="000.000.000-00"
            className={`w-full px-3 py-2.5 text-sm border rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#00A86B] outline-none ${errors.cpf ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
          />
          {renderError(errors.cpf)}
        </div>

        {/* Installments */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Parcelas *
          </label>

          {/* Fixed-height wrapper prevents CLS */}
          <div className="relative h-[42px] w-full">
            {/* Credit: custom styled dropdown or skeleton */}
            <div className="absolute inset-0 transition-opacity duration-300 opacity-100 pointer-events-auto">
              {loadingOptions
                ? <div className="w-full h-full rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
                : (
                  <div className="relative w-full h-full">
                    <select
                      disabled={disabled || installmentOptions.length === 0}
                      value={formData.installments}
                      onChange={(e) => handleField('installments', parseInt(e.target.value, 10))}
                      className="w-full h-full pl-3 pr-9 text-sm font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-[#00A86B] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {installmentOptions.map((opt) => (
                        <option key={opt.installments} value={opt.installments}>{opt.label}</option>
                      ))}
                    </select>
                    {/* Custom chevron */}
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                      <svg viewBox="0 0 16 16" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </div>
                  </div>
                )
              }
            </div>
          </div>

          {/* Sub-label — crossfade, reserved height */}
          <div className="relative h-4 mt-1 pointer-events-none">
            <p className="absolute inset-x-0 text-[11px] text-gray-500 dark:text-gray-400 transition-opacity duration-300 opacity-100">
              {maxInterestFree > 1 ? `Até ${maxInterestFree}x sem juros` : 'Pagamento no crédito'}
            </p>
          </div>
        </div>
      </div>

      {/* Security badge */}
      <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <ShieldCheck className="w-4 h-4 text-[#00A86B] shrink-0" />
        Pagamento processado com segurança via Asaas
      </p>
    </div>
  )
}



