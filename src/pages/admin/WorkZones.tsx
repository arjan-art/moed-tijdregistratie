import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  Star,
  AlertCircle,
} from 'lucide-react'
import { getWorkZones, addWorkZone, updateWorkZone, deleteWorkZone, setDefaultWorkZone } from '@/lib/db'
import type { WorkZone } from '@/lib/db'

export default function AdminWorkZones() {
  const [zones, setZones] = useState<WorkZone[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    radius: 500,
    is_default: false,
  })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const data = await getWorkZones()
    setZones(data)
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({ name: '', address: '', radius: 500, is_default: false })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.address.trim()) return

    if (editingId) {
      await updateWorkZone(editingId, formData)
      if (formData.is_default) {
        await setDefaultWorkZone(editingId)
      }
    } else {
      const id = await addWorkZone(formData)
      if (formData.is_default && id) {
        await setDefaultWorkZone(id)
      }
    }
    resetForm()
    await loadData()
  }

  const handleEdit = (zone: WorkZone) => {
    setFormData({
      name: zone.name,
      address: zone.address,
      radius: zone.radius,
      is_default: zone.is_default,
    })
    setEditingId(zone.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    await deleteWorkZone(id)
    setDeleteConfirm(null)
    await loadData()
  }

  const handleSetDefault = async (id: string) => {
    await setDefaultWorkZone(id)
    await loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Werkzones</h1>
          <p className="text-muted-foreground mt-1">Beheer werkzones en radius instellingen</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Annuleren' : 'Zone Toevoegen'}
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Zone Bewerken' : 'Nieuwe Werkzone'}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Naam</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Bijv. Hoofdlocatie"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Adres</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Straat, postcode, stad"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Radius: {formData.radius} meter</label>
                  <input
                    type="range"
                    min={50}
                    max={2000}
                    step={50}
                    value={formData.radius}
                    onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                    className="w-full accent-brand-600"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50m</span>
                    <span>1000m</span>
                    <span>2000m</span>
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 rounded accent-brand-600"
                  />
                  <label htmlFor="is_default" className="text-sm font-medium">
                    Stel in als standaard zone
                  </label>
                </div>
                <div className="sm:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    {editingId ? 'Opslaan' : 'Toevoegen'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zones Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Geen werkzones gevonden
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    zone.is_default ? 'bg-brand-100' : 'bg-muted'
                  }`}>
                    <MapPin className={`w-5 h-5 ${zone.is_default ? 'text-brand-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{zone.name}</h3>
                    {zone.is_default && (
                      <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium">
                        <Star className="w-3 h-3 fill-brand-600" />
                        Standaard
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!zone.is_default && (
                    <button
                      onClick={() => handleSetDefault(zone.id)}
                      className="p-2 rounded-lg hover:bg-brand-50 transition-colors text-muted-foreground hover:text-brand-600"
                      title="Stel in als standaard"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(zone)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {deleteConfirm === zone.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(zone.id)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(zone.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{zone.address}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span>Radius: {zone.radius} meter</span>
                </div>
              </div>

              {/* Radius Visual */}
              <div className="mt-4 relative h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-brand-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((zone.radius / 2000) * 100, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
