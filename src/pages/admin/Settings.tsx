import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Save,
  CheckCircle2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Hash,
} from 'lucide-react'
import { getCompany, upsertCompany } from '@/lib/db'
import type { Company } from '@/lib/db'

export default function AdminSettings() {
  const [company, setCompany] = useState<Company>({
    id: 'default',
    name: '',
    address: '',
    postal_code: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    kvk: '',
    created_at: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadCompany()
  }, [])

  async function loadCompany() {
    setLoading(true)
    const data = await getCompany()
    if (data) {
      setCompany(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const { id, created_at, ...dataToSave } = company
    void id
    void created_at

    await upsertCompany(dataToSave)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const updateField = (field: keyof Company, value: string) => {
    setCompany((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Instellingen</h1>
        <p className="text-muted-foreground mt-1">Bedrijfsgegevens en voorkeuren</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold">Bedrijfsgegevens</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Bedrijfsnaam
              </label>
              <input
                type="text"
                value={company.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Bedrijfsnaam"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Adres
              </label>
              <input
                type="text"
                value={company.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Straat en huisnummer"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Postcode</label>
                <input
                  type="text"
                  value={company.postal_code}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                  placeholder="1234 AB"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stad</label>
                <input
                  type="text"
                  value={company.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Plaatsnaam"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Telefoon
                </label>
                <input
                  type="tel"
                  value={company.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+31 6 12345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  E-mail
                </label>
                <input
                  type="email"
                  value={company.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="info@bedrijf.nl"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  Website
                </label>
                <input
                  type="url"
                  value={company.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://www.bedrijf.nl"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  KVK Nummer
                </label>
                <input
                  type="text"
                  value={company.kvk}
                  onChange={(e) => updateField('kvk', e.target.value)}
                  placeholder="12345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Bezig...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Opslaan
                  </>
                )}
              </button>

              {saved && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-green-600 text-sm font-medium"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Opgeslagen!
                </motion.div>
              )}
            </div>
          </form>
        </motion.div>

        {/* Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-brand-800 text-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Voorbeeld</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-brand-300 uppercase tracking-wider">Bedrijfsnaam</p>
              <p className="text-sm font-medium mt-0.5">{company.name || 'Niet ingesteld'}</p>
            </div>
            <div>
              <p className="text-xs text-brand-300 uppercase tracking-wider">Adres</p>
              <p className="text-sm mt-0.5">{company.address || '-'}</p>
              <p className="text-sm">{company.postal_code} {company.city}</p>
            </div>
            <div>
              <p className="text-xs text-brand-300 uppercase tracking-wider">Contact</p>
              <p className="text-sm mt-0.5">{company.phone || '-'}</p>
              <p className="text-sm">{company.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-brand-300 uppercase tracking-wider">Website</p>
              <p className="text-sm mt-0.5">{company.website || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-brand-300 uppercase tracking-wider">KVK</p>
              <p className="text-sm mt-0.5">{company.kvk || '-'}</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-brand-700">
            <p className="text-xs text-brand-400">
              Deze gegevens worden gebruikt in rapportages en exporten.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
