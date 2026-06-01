'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateLocation } from './actions'
import { COUNTRIES } from '@/lib/countries'

type Props = {
  initialCountry: string | null
  initialCity: string | null
}

export default function LocationSection({ initialCountry, initialCity }: Props) {
  const [country, setCountry] = useState(initialCountry ?? '')
  const [city, setCity] = useState(initialCity ?? '')
  const [saving, setSaving] = useState(false)

  // Country searchable dropdown state
  const [countryQuery, setCountryQuery] = useState(initialCountry ?? '')
  const [countryOpen, setCountryOpen] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countryQuery.toLowerCase())
  ).slice(0, 60)

  useEffect(() => {
    if (!countryOpen) return
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false)
        // Reset query to selected country if user clicked away without selecting
        setCountryQuery(country)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [countryOpen, country])

  function selectCountry(name: string) {
    setCountry(name)
    setCountryQuery(name)
    setCountryOpen(false)
    setCity('')
  }

  function clearCountry() {
    setCountry('')
    setCountryQuery('')
    setCity('')
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateLocation(country || null, city || null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Location saved')
    }
    setSaving(false)
  }

  const isDirty = country !== (initialCountry ?? '') || city !== (initialCity ?? '')

  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-800 mb-4">Location</h2>
      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">

        {/* Country */}
        <div className="space-y-1.5">
          <Label className="text-stone-700">Country</Label>
          <div ref={countryRef} className="relative">
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              <Input
                value={countryQuery}
                onChange={e => {
                  setCountryQuery(e.target.value)
                  setCountryOpen(true)
                  // If user clears input, also clear selected country
                  if (!e.target.value) clearCountry()
                }}
                onFocus={() => setCountryOpen(true)}
                placeholder="Search country…"
                className="border-stone-200 focus-visible:ring-stone-400 pl-8"
              />
              {countryQuery && (
                <button
                  type="button"
                  onClick={clearCountry}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors text-sm leading-none"
                  aria-label="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {countryOpen && filteredCountries.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg py-1">
                {filteredCountries.map(c => (
                  <li key={c}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 transition-colors ${
                        c === country ? 'bg-stone-100 font-medium text-stone-900' : 'text-stone-700'
                      }`}
                      onClick={() => selectCountry(c)}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* City — only shown when country is selected */}
        {country && (
          <div className="space-y-1.5">
            <Label className="text-stone-700">City</Label>
            <Input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder={`City in ${country}…`}
              className="border-stone-200 focus-visible:ring-stone-400"
            />
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="bg-stone-800 hover:bg-stone-700 text-white"
        >
          {saving ? 'Saving…' : 'Save location'}
        </Button>

      </div>
    </section>
  )
}
