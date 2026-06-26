export const displayText = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) return fallback
  const text = String(value)
  return text.trim() ? text : fallback
}

export const normalizeForSearch = (value: unknown): string => {
  return displayText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const normalizeForDedupe = (value: unknown): string => normalizeForSearch(value)

export const normalizeCepForDedupe = (value: unknown): string => displayText(value).replace(/\D/g, '')
