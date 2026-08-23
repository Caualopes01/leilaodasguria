import { useState, useEffect } from 'react'
import { Phone } from 'lucide-react'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
}

export default function PhoneInput({ value, onChange }: PhoneInputProps) {
  // O value esperado e retornado é sempre "cleanPhone" sem máscara, mas COM DDI (55 ou 598)
  const [country, setCountry] = useState<'BR' | 'UY'>('BR')
  const [rawNumber, setRawNumber] = useState('')

  // Ao iniciar ou receber value externo, separamos o DDI do numero
  useEffect(() => {
    if (!value) {
      setRawNumber('')
      return
    }
    const clean = value.replace(/\D/g, '')
    if (clean.startsWith('598')) {
      setCountry('UY')
      setRawNumber(clean.slice(3))
    } else if (clean.startsWith('55')) {
      setCountry('BR')
      setRawNumber(clean.slice(2))
    } else {
      // Legado (sem DDI) assume BR
      setCountry('BR')
      setRawNumber(clean)
    }
  }, [value])

  function handleNumberChange(val: string) {
    const cleanNum = val.replace(/\D/g, '')
    // Para UY (8 dígitos geralmente, max 9), para BR (max 11)
    const limit = country === 'BR' ? 11 : 9
    const limited = cleanNum.slice(0, limit)
    
    // Avisa o form pai (combina DDI com numero)
    const prefix = country === 'BR' ? '55' : '598'
    onChange(prefix + limited)
  }

  function handleCountryChange(newCountry: 'BR' | 'UY') {
    setCountry(newCountry)
    const prefix = newCountry === 'BR' ? '55' : '598'
    // Avisa o form pai imediatamente da troca (mesmo que sem numero ainda)
    if (rawNumber) onChange(prefix + rawNumber)
  }

  function formatDisplayNumber(num: string) {
    if (!num) return ''
    if (country === 'BR') {
      if (num.length <= 2) return num
      if (num.length <= 7) return `(${num.slice(0, 2)}) ${num.slice(2)}`
      return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7, 11)}`
    } else {
      if (num.length <= 2) return num
      if (num.length <= 5) return `${num.slice(0, 2)} ${num.slice(2)}`
      return `${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5, 9)}`
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
        <Phone className="w-4 h-4 text-gray-400" /> WhatsApp *
      </label>
      <div className="flex w-full items-stretch bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-rosa-500/20 focus-within:border-rosa-500 transition-all overflow-hidden">
        <div className="flex items-center bg-gray-50/80 p-1 border-r border-gray-200">
          <button
            type="button"
            onClick={() => handleCountryChange('BR')}
            className={`flex items-center justify-center px-2.5 py-2 text-xs font-semibold rounded-lg transition-all ${country === 'BR' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/60' : 'text-gray-500 hover:text-gray-700 border border-transparent'}`}
          >
            🇧🇷 +55
          </button>
          <button
            type="button"
            onClick={() => handleCountryChange('UY')}
            className={`flex items-center justify-center px-2.5 py-2 text-xs font-semibold rounded-lg transition-all ${country === 'UY' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/60' : 'text-gray-500 hover:text-gray-700 border border-transparent'}`}
          >
            🇺🇾 +598
          </button>
        </div>
        <input
          type="tel"
          inputMode="numeric"
          value={formatDisplayNumber(rawNumber)}
          onChange={e => handleNumberChange(e.target.value)}
          placeholder={country === 'BR' ? '(51) 99999-9999' : '99 123 456'}
          className="flex-1 w-full px-4 py-3 text-sm outline-none bg-transparent"
        />
      </div>
    </div>
  )
}
