/**
 * Imagens SVG inline como fallback
 * Estas imagens sempre funcionarão, mesmo sem conexão com a internet
 */

// Fallback para produtos
export const PRODUCT_IMAGE_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect fill="%2367C090" width="400" height="400"/%3E%3Cg transform="translate(200,200)"%3E%3Ccircle fill="white" opacity="0.3" r="80"/%3E%3Cpath fill="white" d="M-30,-20 L-30,20 L0,40 L30,20 L30,-20 L0,-40 Z"/%3E%3C/g%3E%3Ctext x="50%25" y="85%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white" opacity="0.8"%3EProduto%3C/text%3E%3C/svg%3E'

// Fallback para banners
export const BANNER_IMAGE_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="600" viewBox="0 0 1920 600"%3E%3Crect fill="%2367C090" width="1920" height="600"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="white"%3EBanner%3C/text%3E%3C/svg%3E'

// Fallback para avatares de usuários
export const AVATAR_IMAGE_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"%3E%3Crect fill="%2367C090" width="150" height="150"/%3E%3Ccircle cx="75" cy="60" r="25" fill="white"/%3E%3Cpath d="M 40 120 Q 40 90 75 90 Q 110 90 110 120 Z" fill="white"/%3E%3C/svg%3E'

/**
 * Handler genérico para erro de imagem
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback: string = PRODUCT_IMAGE_FALLBACK
) => {
  const target = e.target as HTMLImageElement
  // Evita loop infinito
  target.onerror = null
  target.src = fallback
}

