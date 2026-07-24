import {
  Activity,
  Award,
  Bookmark,
  Camera,
  Coffee,
  Compass,
  CreditCard,
  Feather,
  Flag,
  Gift,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Info,
  Key,
  Package,
  Percent,
  ShoppingBag,
  Smile,
  Star,
  Tag,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export const HEADER_ICON_NAMES = [
  'Tag', 'Star', 'Percent', 'Gift', 'ShoppingBag', 'Package', 'Truck', 'Zap',
  'Heart', 'Smile', 'Coffee', 'Info', 'HelpCircle', 'Home', 'Activity', 'Award',
  'Bookmark', 'Camera', 'Compass', 'CreditCard', 'Feather', 'Flag', 'Globe', 'Key',
] as const

const HEADER_ICONS: Record<string, LucideIcon> = {
  Activity,
  Award,
  Bookmark,
  Camera,
  Coffee,
  Compass,
  CreditCard,
  Feather,
  Flag,
  Gift,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Info,
  Key,
  Package,
  Percent,
  ShoppingBag,
  Smile,
  Star,
  Tag,
  Truck,
  Zap,
}

export function getHeaderIcon(name?: string | null): LucideIcon {
  return (name && HEADER_ICONS[name]) || Tag
}
