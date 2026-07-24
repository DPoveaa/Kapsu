export interface ParsedShippingAddress {
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  cep: string
}

/** Parseia tanto o formato textual atual quanto o JSON legado de orders.shipping_address. */
export function parseStoredShippingAddress(addressStr: string): ParsedShippingAddress {
  let street = ''
  let number = ''
  let complement = ''
  let neighborhood = ''
  let city = ''
  let state = ''
  let cep = ''

  if (!addressStr?.trim()) {
    return { street, number, complement, neighborhood, city, state, cep }
  }

  const trimmedAddress = addressStr.trim()
  if (trimmedAddress.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmedAddress)
      street = String(parsed.address || parsed.street || parsed.logradouro || '').trim()
      number = String(parsed.addressNumber || parsed.number || parsed.numero || '').trim()
      complement = String(parsed.complement || parsed.complemento || '').trim()
      neighborhood = String(parsed.neighborhood || parsed.bairro || parsed.province || '').trim()
      city = String(parsed.city || parsed.cidade || '').trim()
      state = String(parsed.state || parsed.estado || parsed.uf || '').trim()
      cep = String(parsed.postalCode || parsed.cep || '').trim()
      return { street, number, complement, neighborhood, city, state, cep }
    } catch {
      // Mantém compatibilidade com textos que apenas começam com "{".
    }
  }

  const parts = trimmedAddress.split(' - ').map((part) => part.trim()).filter(Boolean)

  if (parts.length >= 3) {
    const firstPart = parts[0]
    const commaIndex = firstPart.lastIndexOf(',')
    if (commaIndex !== -1) {
      street = firstPart.substring(0, commaIndex).trim()
      number = firstPart.substring(commaIndex + 1).trim()
    } else {
      street = firstPart
    }

    const lastPart = parts[parts.length - 1]
    cep = lastPart.toLowerCase().startsWith('cep')
      ? lastPart.replace(/cep/i, '').trim()
      : lastPart

    let cityStateIndex = parts.length - 2
    for (let index = parts.length - 2; index >= 1; index -= 1) {
      if (/\/[A-Za-z]{2}$/.test(parts[index])) {
        cityStateIndex = index
        break
      }
    }

    const cityStatePart = parts[cityStateIndex]
    const slashIndex = cityStatePart.indexOf('/')
    if (slashIndex !== -1) {
      city = cityStatePart.substring(0, slashIndex).trim()
      state = cityStatePart.substring(slashIndex + 1).trim()
    } else {
      city = cityStatePart
    }

    const details = parts.slice(1, cityStateIndex)
    if (details.length === 1) {
      complement = details[0]
    } else if (details.length >= 2) {
      complement = details.slice(0, -1).join(' - ')
      neighborhood = details[details.length - 1]
    }
  } else {
    street = trimmedAddress
  }

  return { street, number, complement, neighborhood, city, state, cep }
}

export function formatShippingAddressForCopy(parts: ParsedShippingAddress): string {
  const cityState = parts.city && parts.state
    ? `${parts.city}/${parts.state}`
    : parts.city || parts.state

  return [
    [parts.street, parts.number].filter(Boolean).join(', '),
    parts.complement,
    parts.neighborhood,
    cityState,
    parts.cep ? `CEP ${parts.cep}` : '',
  ].filter(Boolean).join(' - ')
}

export function formatStoredShippingAddress(addressStr?: string | null): string {
  if (!addressStr?.trim()) return ''
  return formatShippingAddressForCopy(parseStoredShippingAddress(addressStr))
}
