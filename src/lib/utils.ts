export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('598')) {
    const num = cleaned.slice(3)
    return `🇺🇾 +598 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`.trim()
  }
  
  if (cleaned.startsWith('55')) {
    const num = cleaned.slice(2)
    if (num.length === 11) {
      return `🇧🇷 +55 (${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`
    }
    return `🇧🇷 +55 ${num}`
  }

  if (cleaned.length === 11) {
    return `🇧🇷 (${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const number = (cleaned.startsWith('55') || cleaned.startsWith('598')) ? cleaned : `55${cleaned}`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
