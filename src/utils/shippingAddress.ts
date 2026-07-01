export interface ParsedShippingAddress {
  street: string
  number: string
  complement: string
  city: string
  state: string
  cep: string
}

/** Parseia o texto gravado em orders.shipping_address (formato Kapsu/Asaas). */
export function parseStoredShippingAddress(addressStr: string): ParsedShippingAddress {
  let street = ''
  let number = ''
  let complement = ''
  let city = ''
  let state = ''
  let cep = ''

  if (!addressStr?.trim()) {
    return { street, number, complement, city, state, cep }
  }

  // Ex: "Rua das Flores, 123 - Apt 4 - Centro/SP - CEP 01234-567"
  const parts = addressStr.split(' - ').map((p) => p.trim())

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

    if (parts.length === 4) {
      complement = parts[1]
      const cityStatePart = parts[2]
      const slashIndex = cityStatePart.indexOf('/')
      if (slashIndex !== -1) {
        city = cityStatePart.substring(0, slashIndex).trim()
        state = cityStatePart.substring(slashIndex + 1).trim()
      } else {
        city = cityStatePart
      }
    } else {
      const cityStatePart = parts[1]
      const slashIndex = cityStatePart.indexOf('/')
      if (slashIndex !== -1) {
        city = cityStatePart.substring(0, slashIndex).trim()
        state = cityStatePart.substring(slashIndex + 1).trim()
      } else {
        city = cityStatePart
      }
    }
  } else {
    street = addressStr.trim()
  }

  return { street, number, complement, city, state, cep }
}

export function formatShippingAddressForCopy(parts: ParsedShippingAddress): string {
  const cityState = parts.city && parts.state
    ? `${parts.city}/${parts.state}`
    : parts.city || parts.state

  return [
    [parts.street, parts.number].filter(Boolean).join(', '),
    parts.complement,
    cityState,
    parts.cep ? `CEP ${parts.cep}` : '',
  ].filter(Boolean).join(' - ')
}
