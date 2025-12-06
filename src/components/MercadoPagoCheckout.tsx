import { useEffect, useRef, useState } from 'react'
import { Loader2, CreditCard, Lock } from 'lucide-react'
import { env } from '../config/env'

interface MercadoPagoCheckoutProps {
  preferenceId: string
  onSuccess: () => void
  onError: (error: string) => void
}

declare global {
  interface Window {
    MercadoPago: any
  }
}

export default function MercadoPagoCheckout({ preferenceId, onSuccess, onError }: MercadoPagoCheckoutProps) {
  const [loading, setLoading] = useState(true)
  const [mpLoaded, setMpLoaded] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const checkoutContainerRef = useRef<HTMLDivElement>(null)

  // Carrega Public Key
  useEffect(() => {
    const loadPublicKey = async () => {
      try {
        const response = await fetch(`${env.apiUrl}/payments/public-key`)
        const data = await response.json()
        if (data.success) {
          setPublicKey(data.data.publicKey)
        } else {
          onError('Não foi possível carregar as configurações de pagamento')
        }
      } catch (error) {
        console.error('Erro ao carregar Public Key:', error)
        onError('Erro ao carregar configurações de pagamento')
      }
    }

    loadPublicKey()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carrega SDK do Mercado Pago
  useEffect(() => {
    if (!publicKey) return

    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    script.onload = () => {
      setMpLoaded(true)
    }
    script.onerror = () => {
      onError('Erro ao carregar SDK do Mercado Pago')
      setLoading(false)
    }

    document.body.appendChild(script)

    return () => {
      // Remove script ao desmontar
      const existingScript = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [publicKey, onError])

  // Inicializa checkout quando SDK e Public Key estiverem prontos
  useEffect(() => {
    if (!mpLoaded || !publicKey || !checkoutContainerRef.current || !preferenceId) return

    try {
      const mp = new window.MercadoPago(publicKey, {
        locale: 'pt-BR',
      })

      const checkout = mp.checkout({
        preference: {
          id: preferenceId,
        },
        render: {
          container: checkoutContainerRef.current,
          label: 'Pagar',
          theme: {
            elementsColor: '#4F46E5', // Cor primária do projeto
            headerColor: '#4F46E5',
          },
        },
        callbacks: {
          onReady: () => {
            setLoading(false)
          },
          onError: (error: any) => {
            console.error('Erro no checkout:', error)
            onError('Erro ao processar pagamento. Tente novamente.')
            setLoading(false)
          },
        },
      })

      // Escuta eventos de pagamento
      checkout.on('onApproved', (data: any) => {
        console.log('Pagamento aprovado:', data)
        onSuccess()
      })

      checkout.on('onRejected', (data: any) => {
        console.log('Pagamento rejeitado:', data)
        onError('Pagamento não foi aprovado. Tente novamente.')
      })

      return () => {
        // Cleanup se necessário
      }
    } catch (error: any) {
      console.error('Erro ao inicializar checkout:', error)
      onError('Erro ao inicializar checkout de pagamento')
      setLoading(false)
    }
  }, [mpLoaded, publicKey, preferenceId, onSuccess, onError])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary-600 mb-4" size={48} />
        <p className="text-gray-600">Carregando checkout seguro...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
        <Lock size={16} className="text-green-600" />
        <span>Pagamento 100% seguro processado pelo Mercado Pago</span>
      </div>
      <div ref={checkoutContainerRef} className="mercado-pago-checkout" />
    </div>
  )
}

