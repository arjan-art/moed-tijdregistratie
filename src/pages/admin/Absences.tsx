import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, Pencil, Trash2, CalendarDays } from 'lucide-react'
import { getAbsences, addAbsence, updateAbsence, deleteAbsence } from '@/lib/db'
import { formatDutchDateTime } from '@/lib/date-utils'
import type { AbsenceType } from '@/lib/db'

const ABSENCE_TYPES: AbsenceType[] = ['ziekte', 'medische_afspraak', 'vakantie', 'andere']

function getTypeLabel(type: AbsenceType): string {
  switch (type) {
    case 'ziekte': return 'Ziekte'
    case 'medische_afspraak': return 'Medische afspraak'
    case 'vakantie': return 'Vakantie'
    case 'andere': return 'Anders'
    default: return type
  }
}

export default function AdminAbsences() {
  const [absences, setAbsences] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    employee_id: '',
    type: 'ziekte' as AbsenceType,
    start_date: '',
    end_date: '',
    reason: '',
    documents: [] as string[],
  })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<AbsenceType | 'all'>('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const data = await getAbsences()
    setAbsences(data)
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      employee_id: '',
      type: 'ziekte',
      start_date: '',
      end_date: '',
      reason: '',
      documents: [],
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employee_id.trim() || !formData.start_date || !formData.end_date) return

    if (editingId) {
      await updateAbsence(editingId, formData)
    } else {
      await addAbsence(formData)
    }
    resetForm()
    await loadData()
  }

  const handleEdit = (absence: any) => {
    setFormData({
      employee_id: absence.employee_id,
      type: absence.type,
      start_date: absence.start_date,
      end_date: absence.end_date,
      reason: absence.reason || '',
      documents: absence.documents || [],
    })
    setEditingId(absence.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    await deleteAbsence(id)
    setDeleteConfirm(null)
    await loadData()
  }

  const filteredAbsences = absences.filter((absence) =>
    filterType === 'all' ? true : absence.type === filterType
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Afwezigheden</h1>
          <p className="text-muted-foreground mt-1">Beheer ziekte, vakantie en andere afwezigheden</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Annuleren' : 'Afwezigheid Toevoegen'}
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filterType === 'all'
              ? 'bg-brand-100 text-brand-700'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Alles
        </button>
        {ABSENCE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterType === type
                ? 'bg-brand-100 text-brand-700'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {getTypeLabel(type)}
          </button>
        ))}
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
                {editingId ? 'Afwezigheid Bewerken' : 'Nieuwe Afwezigheid'}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Werknemer ID</label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    placeholder="Werknemer ID"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as AbsenceType })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ABSENCE_TYPES.map((type) => (
                      <option key={type} value={type}>{getTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Startdatum</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Einddatum</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Reden (optioneel)</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Extra informatie..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
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

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : filteredAbsences.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center text-muted-foreground">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Geen afwezigheden gevonden
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Werknemer</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Periode</th>
                  <th className="text-left px-4 py-3 font-medium">Reden</th>
                  <th className="text-right px-4 py-3 font-medium">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAbsences.map((absence) => (
                  <tr key={absence.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{absence.employee_id}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        absence.type === 'ziekte'
                          ? 'bg-red-100 text-red-700'
                          : absence.type === 'vakantie'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {getTypeLabel(absence.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDutchDateTime(absence.start_date)} - {formatDutchDateTime(absence.end_date)}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{absence.reason || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(absence)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === absence.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(absence.id)}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(absence.id)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
