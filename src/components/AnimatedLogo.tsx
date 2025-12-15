import { useState, useEffect, useRef } from 'react'
import orelhaEsquerda from '../images/orelha_esquerda.png'
import orelhaDireita from '../images/orelha_direita.png'
import olhoEsquerdo from '../images/olho_esquerdo.png'
import olhoDireito from '../images/olho_direito.png'
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

export default function AnimatedLogo({ className = '', alt = 'Kapsu Logo' }: AnimatedLogoProps) {
  const [isBlinking, setIsBlinking] = useState(false)
  const blinkChanceRef = useRef(10) // Começa com 10% (1 em 10)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
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
    intervalRef.current = setInterval(checkBlink, intervalTime)

    // Primeira verificação após o intervalo
    const timeoutId = setTimeout(checkBlink, intervalTime)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div 
      className={`relative inline-block ${className}`}
    >
      {/* Container principal com proporção mantida */}
      <div className="relative w-full h-full" style={{ aspectRatio: '1 / 1' }}>
        {/* Orelha Esquerda - Topo esquerdo */}
        <img 
          src={orelhaEsquerda} 
          alt=""
          className="absolute"
          style={{
            top: '0%',
            left: '0%',
            width: '38%',
            height: 'auto',
            zIndex: 1,
            objectFit: 'contain'
          }}
        />
        
        {/* Orelha Direita - Topo direito */}
        <img 
          src={orelhaDireita} 
          alt=""
          className="absolute"
          style={{
            top: '0%',
            right: '0%',
            width: '38%',
            height: 'auto',
            zIndex: 1,
            objectFit: 'contain'
          }}
        />
        
        {/* olho esquerdo */}
        <img 
          src={olhoEsquerdo} 
          alt=""
          className="absolute panda-eye-left"
          style={{
            top: '25%',
            left: '25%',
            width: '18%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain'
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
          src={olhoDireito} 
          alt=""
          className="absolute panda-eye-right"
          style={{
            top: '25%',
            right: '25%',
            width: '18%',
            height: 'auto',
            zIndex: 2,
            objectFit: 'contain'
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
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '10%',
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
            left: '0%',
            width: '50%',
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
            right: '0.9%',
            width: '49%',
            height: 'auto',
            zIndex: 1,
            objectFit: 'contain'
          }}
        />
        
      </div>
    </div>
  )
}

