import { useState, useEffect, useRef } from 'react'
import orelhaLogo from '../images/orelha_logo.png'
import olhoLogo from '../images/olho_logo.png'
import pupilaNormalEsquerdo from '../images/pupila_esquerda_base.png'
import pupilaNormalDireito from '../images/pupila_direita_base.png'
import pupilaDormindoEsquerdo from '../images/pupila_dormindo_esquerda.png'
import pupilaDormindoDireito from '../images/pupila_dormindo_direita.png'
import nariz from '../images/nariz.png'
import comprimidoEsquerdo from '../images/comprimido_esquerdo.png'
import comprimidoDireito from '../images/comprimido_direito.png'

interface AnimatedLogoProps {
  className?: string
  alt?: string
}

interface ZBubble {
  id: number
  delay: number
}

export default function AnimatedLogo({ className = '' }: AnimatedLogoProps) {
  const [isBlinking, setIsBlinking] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [zBubbles, setZBubbles] = useState<ZBubble[]>([])
  const blinkChanceRef = useRef(10) // Começa com 10% (1 em 10)
  const zChanceRef = useRef(10) // Começa com 10% (1 em 10) para os Z
  const intervalRef = useRef<number | null>(null)
  const zIntervalRef = useRef<number | null>(null)
  const zIdCounterRef = useRef(0)

  // Detecta modo escuro
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setIsDarkMode(isDark)
      // Se estiver em modo escuro, mantém os olhos fechados
      if (isDark) {
        setIsBlinking(true)
      } else {
        setIsBlinking(false)
      }
    }

    // Verifica inicialmente
    checkDarkMode()

    // Observa mudanças no elemento raiz
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  // Lógica de piscar aleatório (apenas no modo claro)
  useEffect(() => {
    // Se estiver em modo escuro, não faz nada (olhos ficam fechados)
    if (isDarkMode) {
      // Limpa qualquer intervalo existente
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const checkBlink = () => {
      // Gera número aleatório de 1 a 100
      const random = Math.floor(Math.random() * 100) + 1

      // Se o número aleatório for menor ou igual à chance atual, pisca
      if (random <= blinkChanceRef.current) {
        setIsBlinking(true)
        // Reseta a chance para 10% após piscar
        blinkChanceRef.current = 10

        // Remove a classe de piscar após a animação (200ms)
        setTimeout(() => {
          setIsBlinking(false)
        }, 200)
      } else {
        // Se não piscou, aumenta a chance para a próxima tentativa
        // Aumenta em 5% a cada tentativa (máximo 100%)
        blinkChanceRef.current = Math.min(blinkChanceRef.current + 5, 100)
      }
    }

    // Verifica a cada 5 segundos
    const intervalTime = 5000
    intervalRef.current = window.setInterval(checkBlink, intervalTime)

    // Primeira verificação após o intervalo
    const timeoutId = window.setTimeout(checkBlink, intervalTime)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      clearTimeout(timeoutId)
    }
  }, [isDarkMode])

  // Lógica de Z saindo (apenas no modo escuro)
  useEffect(() => {
    // Se não estiver em modo escuro, não faz nada
    if (!isDarkMode) {
      // Limpa qualquer intervalo existente
      if (zIntervalRef.current) {
        clearInterval(zIntervalRef.current)
        zIntervalRef.current = null
      }
      // Remove todos os Z quando sair do modo escuro
      setZBubbles([])
      return
    }

    const checkZ = () => {
      // Gera número aleatório de 1 a 100
      const random = Math.floor(Math.random() * 100) + 1

      // Se o número aleatório for menor ou igual à chance atual, mostra os Z
      if (random <= zChanceRef.current) {
        // Cria sequência de 3 Z com micro intervalo entre cada (200ms)
        const newZBubbles: ZBubble[] = []
        for (let i = 0; i < 3; i++) {
          newZBubbles.push({
            id: zIdCounterRef.current++,
            delay: i * 200 // 200ms de intervalo entre cada Z
          })
        }
        setZBubbles(newZBubbles)

        // Reseta a chance para 10% após mostrar os Z
        zChanceRef.current = 10

        // Remove os Z após a animação (2 segundos para subir e desaparecer)
        setTimeout(() => {
          setZBubbles([])
        }, 2000 + (2 * 200)) // 2000ms de animação + 2 intervalos de 200ms
      } else {
        // Se não mostrou os Z, aumenta a chance para a próxima tentativa
        // Aumenta em 5% a cada tentativa (máximo 100%)
        zChanceRef.current = Math.min(zChanceRef.current + 5, 100)
      }
    }

    // Verifica a cada 5 segundos
    const intervalTime = 5000
    zIntervalRef.current = window.setInterval(checkZ, intervalTime)

    // Primeira verificação após o intervalo
    const timeoutId = window.setTimeout(checkZ, intervalTime)

    return () => {
      if (zIntervalRef.current) {
        clearInterval(zIntervalRef.current)
      }
      clearTimeout(timeoutId)
    }
  }, [isDarkMode])

  return (
    <div
      className={`relative inline-block ${className}`}
    >
      {/* Container principal com proporção mantida */}
      <div className="relative w-full h-full" style={{ aspectRatio: '1 / 1' }}>
        {/* Orelha Esquerda - Topo esquerdo (espelho da direita) */}
        <img
          src={orelhaLogo}
          alt=""
          className="absolute"
          style={{
            top: '-3%',
            left: '-5%',
            width: '48%',
            height: 'auto',
            zIndex: 1,
            objectFit: 'contain',
            transform: 'scaleX(-1)',
            transformOrigin: 'center center'
          }}
        />

        {/* Orelha Direita - Topo direito */}
        <img
          src={orelhaLogo}
          alt=""
          className="absolute"
          style={{
            top: '-3%',
            right: '-5%',
            width: '48%',
            height: 'auto',
            zIndex: 1,
            objectFit: 'contain',
            transform: 'none',
            transformOrigin: 'center center'
          }}
        />

        {/* olho esquerdo */}
        <img
          src={olhoLogo}
          alt=""
          className="absolute panda-eye-left"
          style={{
            top: '22%',
            left: '22%',
            width: '25%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain',
            transform: 'scaleX(-1)',
            transformOrigin: 'center center'
          }}
        />

        {/* pupila esquerdo */}
        <img
          src={isBlinking ? pupilaDormindoEsquerdo : pupilaNormalEsquerdo}
          alt=""
          className="absolute panda-pupil-left"
          style={{
            top: '27%',
            left: '34%',
            width: '7.5%',
            height: 'auto',
            zIndex: 3,
            objectFit: 'contain',
            pointerEvents: 'none'
          }}
        />

        {/* olho direito */}
        <img
          src={olhoLogo}
          alt=""
          className="absolute panda-eye-right"
          style={{
            top: '22%',
            right: '22%',
            width: '25%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain',
            transform: 'none',
            transformOrigin: 'center center'
          }}
        />

        {/* pupila direita */}
        <img
          src={isBlinking ? pupilaDormindoDireito : pupilaNormalDireito}
          alt=""
          className="absolute panda-pupil-right"
          style={{
            top: '27%',
            right: '34%',
            width: '7.5%',
            height: 'auto',
            zIndex: 3,
            objectFit: 'contain',
            pointerEvents: 'none'
          }}
        />

        {/* Nariz - Centro inferior, muito próximo dos olhos */}
        <img
          src={nariz}
          alt=""
          className="absolute"
          style={{
            top: '29%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '25%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain'
          }}
        />

        {/* Comprimido Esquerdo - Parte inferior esquerda, próximo ao nariz */}
        <img
          src={comprimidoEsquerdo}
          alt=""
          className="absolute"
          style={{
            bottom: '19%',
            left: '-1%',
            width: '51%',
            height: 'auto',
            zIndex: 1,
            objectFit: 'contain'
          }}
        />

        {/* Comprimido Direito - Parte inferior direita, próximo ao nariz */}
        <img
          src={comprimidoDireito}
          alt=""
          className="absolute"
          style={{
            bottom: '19%',
            right: '-1%',
            width: '51%',
            height: 'auto',
            zIndex: 1,
            objectFit: 'contain'
          }}
        />

      </div>

      {/* Z bubbles - aparecem quando está dormindo (modo escuro) */}
      {zBubbles.map((zBubble, index) => (
        <div
          key={zBubble.id}
          className="absolute text-2xl sm:text-3xl font-bold text-gray-400 dark:text-gray-500 pointer-events-none z-50"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `zFloat${zBubble.id} 2s ${zBubble.delay}ms ease-out forwards`,
            opacity: 0
          }}
        >
          <style>{`
            @keyframes zFloat${zBubble.id} {
              0% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(0px) translateX(${index * 5 - 5}px) rotate(0deg) scale(0.8);
              }
              5% {
                opacity: 1;
                transform: translate(-50%, -50%) translateY(-8px) translateX(${index * 5 - 5}px) rotate(-4deg) scale(0.95);
              }
              100% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(-120px) translateX(${(index * 6 - 3) * 0.3}px) rotate(${(index % 2 === 0 ? -2 : 2)}deg) scale(0.5);
              }
            }
          `}</style>
          Z
        </div>
      ))}
    </div>
  )
}

