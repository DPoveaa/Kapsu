import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { toast } from './utils/toast'

// Sobrescreve alert nativo por toats animados e modernos
window.alert = (message: any) => {
  const str = String(message)
  const lowerStr = str.toLowerCase()
  if (
    lowerStr.includes('erro') || 
    lowerStr.includes('error') || 
    lowerStr.includes('falha') || 
    lowerStr.includes('fail') || 
    lowerStr.includes('limitar') || 
    lowerStr.includes('não') ||
    lowerStr.includes('inválido') ||
    lowerStr.includes('expirou')
  ) {
    toast.error(str)
  } else if (
    lowerStr.includes('✅') || 
    lowerStr.includes('sucesso') || 
    lowerStr.includes('sucess') || 
    lowerStr.includes('salvo') || 
    lowerStr.includes('adicionado') || 
    lowerStr.includes('excluído') || 
    lowerStr.includes('atualizado') ||
    lowerStr.includes('confirmado') ||
    lowerStr.includes('importado')
  ) {
    toast.success(str)
  } else {
    toast.info(str)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)







