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
      <div className="flex w-full items-stretch relative">
        <div className="relative flex-shrink-0">
          <select
            className="h-full pl-3 pr-8 py-3 bg-gray-50 border border-gray-200 border-r-0 rounded-l-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all cursor-pointer"
            value={country}
            onChange={e => handleCountryChange(e.target.value as 'BR' | 'UY')}
          >
            <option value="BR">🇧🇷 +55</option>
            <option value="UY">🇺🇾 +598</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <input
          type="tel"
          inputMode="numeric"
          value={formatDisplayNumber(rawNumber)}
          onChange={e => handleNumberChange(e.target.value)}
          placeholder={country === 'BR' ? '(51) 99999-9999' : '99 123 456'}
          className="flex-1 w-full px-4 py-3 border border-gray-200 rounded-r-xl text-sm outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all"
        />
      </div>
    </div>
  )
}
