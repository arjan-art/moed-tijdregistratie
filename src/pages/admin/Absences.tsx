import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  HeartPulse,
  Stethoscope,
  Umbrella,
  HelpCircle,
  Filter,
} from 'lucide-react'
import StatCard from '@/components/StatCard'
import { getEmployees, getAbsences, addAbsence, updateAbsence, deleteAbsence } from '@/lib/db'
import type { Employee, Absence } from '@/lib/db'

/* ── helpers ────────────────────────────────────────────── */

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDutchDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDutchDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isDateInCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

/* ── type / status helpers ──────────────────────────────── */

type AbsenceType = Absence['type']
type AbsenceStatus = Absence['status']

const ABSENCE_TYPES: AbsenceType[] = ['ziekte', 'medische_afspraak', 'vakantie', 'anders']

const ABSENCE_STATUS: AbsenceStatus[] = ['ingediend', 'goedgekeurd', 'afgewezen']

function getTypeLabel(type: string): string {
  switch (type) {
    case 'ziekte':
      return 'Ziekte'
    case 'medische_afspraak':
      return 'Medische afspraak'
    case 'vakantie':
      return 'Vakantie'
    case 'anders':
      return 'Anders'
    default:
      return type
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'ingediend':
      return 'Ingediend'
    case 'goedgekeurd':
      return 'Goedgekeurd'
    case 'afgewezen':
      return 'Afgewezen'
    default:
      return status
  }
}

function getTypeBadgeClasses(type: string): string {
  switch (type) {
    case 'ziekte':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'medische_afspraak':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'vakantie':
      return 'bg-green-50 text-green-700 border-green-200'
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'ziekte':
      return <HeartPulse className="w-3.5 h-3.5" />
    case 'medische_afspraak':
      return <Stethoscope className="w-3.5 h-3.5" />
    case 'vakantie':
      return <Umbrella className="w-3.5 h-3.5" />
    default:
      return <HelpCircle className="w-3.5 h-3.5" />
  }
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'ingediend':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'goedgekeurd':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'afgewezen':
      return 'bg-red-50 text-red-600 border-red-200'
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

/* ── component ──────────────────────────────────────────── */

export default function AdminAbsences() {
  /* state */
  const [absences, setAbsences] = useState<Absence[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('alle')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    employee_id: '',
    type: 'ziekte' as AbsenceType,
    start_date: formatDateForInput(new Date()),
    end_date: formatDateForInput(new Date()),
    start_time: '',
    end_time: '',
    note: '',
    status: 'goedgekeurd' as AbsenceStatus,
  })

  /* data loading */
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [allAbsences, allEmployees] = await Promise.all([
      getAbsences(),
      getEmployees(),
    ])
    setAbsences(allAbsences)
    setEmployees(allEmployees)
    setLoading(false)
  }

  /* derived state */
  const filteredAbsences = useMemo(() => {
    return absences.filter((absence) => {
      const emp = employees.find((e) => e.id === absence.employee_id)
      const empName = emp?.name || ''

      const matchesSearch =
        !search || empName.toLowerCase().includes(search.toLowerCase())

      const matchesType = typeFilter === 'alle' || absence.type === typeFilter

      const matchesDateFrom = !dateFrom || absence.start_date >= dateFrom
      const matchesDateTo = !dateTo || absence.end_date <= dateTo

      return matchesSearch && matchesType && matchesDateFrom && matchesDateTo
    })
  }, [absences, employees, search, typeFilter, dateFrom, dateTo])

  const stats = useMemo(() => {
    const thisMonth = absences.filter((a) => isDateInCurrentMonth(a.start_date))
    return {
      totalThisMonth: thisMonth.length,
      sicknessCount: thisMonth.filter((a) => a.type === 'ziekte').length,
      vacationCount: thisMonth.filter((a) => a.type === 'vakantie').length,
      medicalCount: thisMonth.filter((a) => a.type === 'medische_afspraak').length,
    }
  }, [absences])

  /* form handling */
  const resetForm = () => {
    setFormData({
      employee_id: '',
      type: 'ziekte' as AbsenceType,
      start_date: formatDateForInput(new Date()),
      end_date: formatDateForInput(new Date()),
      start_time: '',
      end_time: '',
      note: '',
      status: 'goedgekeurd' as AbsenceStatus,
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employee_id) return

    const payload = {
      ...formData,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
    }

    if (editingId) {
      await updateAbsence(editingId, payload)
    } else {
      await addAbsence(payload)
    }

    resetForm()
    await loadData()
  }

  const handleEdit = (absence: Absence) => {
    setFormData({
      employee_id: absence.employee_id,
      type: absence.type,
      start_date: absence.start_date,
      end_date: absence.end_date,
      start_time: absence.start_time || '',
      end_time: absence.end_time || '',
      note: absence.note || '',
      status: absence.status,
    } as any)
    setEditingId(absence.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    await deleteAbsence(id)
    setDeleteConfirm(null)
    await loadData()
  }

  /* render helpers */
  const formatPeriod = (absence: Absence) => {
    const start = formatDutchDate(absence.start_date)
    const end = formatDutchDate(absence.end_date)

    if (absence.start_time || absence.end_time) {
      const timeParts: string[] = []
      if (absence.start_time) timeParts.push(absence.start_time.slice(0, 5))
      if (absence.end_time) timeParts.push(absence.end_time.slice(0, 5))
      if (timeParts.length > 0) {
        return `${start} ${timeParts.join(' - ')}`
      }
    }

    if (absence.start_date === absence.end_date) {
      return start
    }
    return `${start} - ${end}`
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Afwezigheden</h1>
          <p className="text-muted-foreground mt-1">Beheer ziekte, vakantie en andere afwezigheden</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Annuleren' : 'Afwezigheid registreren'}
        </button>
      </div>

      {/* ── Statistics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Totaal deze maand"
          value={stats.totalThisMonth}
          icon={CalendarDays}
          description="Alle afwezigheden deze maand"
        />
        <StatCard
          title="Ziekte meldingen"
          value={stats.sicknessCount}
          icon={HeartPulse}
          description="Ziektegevallen deze maand"
        />
        <StatCard
          title="Vakantie dagen"
          value={stats.vacationCount}
          icon={Umbrella}
          description="Vakantiedagen deze maand"
        />
        <StatCard
          title="Medische afspraken"
          value={stats.medicalCount}
          icon={Stethoscope}
          description="Afspraken deze maand"
        />
      </div>

      {/* ── Form ── */}
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
                {editingId ? 'Afwezigheid Bewerken' : 'Afwezigheid Registreren'}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Medewerker</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        employee_id: e.target.value,
                      })
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Selecteer medewerker</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as AbsenceType })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ABSENCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {getTypeLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start datum</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Eind datum</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>

                {/* Times */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start tijd (optioneel)</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Eind tijd (optioneel)</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Note */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Notitie</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                    placeholder="Optionele opmerking..."
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AbsenceStatus })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ABSENCE_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {getStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit */}
                <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
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

      {/* ── Filters ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Zoek medewerker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showFilters
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-border bg-background hover:bg-muted'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="alle">Alle types</option>
                  {ABSENCE_TYPES.map((t) => (
                    <option key={t} value={t}>{getTypeLabel(t)}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  placeholder="Van"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  placeholder="Tot"
                />
                <button
                  onClick={() => {
                    setTypeFilter('alle')
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium">Medewerker</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Periode</th>
                  <th className="text-left px-4 py-3 font-medium">Notitie</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAbsences.map((absence) => {
                  const emp = employees.find((e) => e.id === absence.employee_id)
                  const empName = emp?.name || ''
                  return (
                    <motion.tr
                      key={absence.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{empName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getTypeBadgeClasses(absence.type)}`}>
                          {getTypeIcon(absence.type)}
                          {getTypeLabel(absence.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPeriod(absence)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                        {absence.note || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadgeClasses(absence.status)}`}>
                          {getStatusLabel(absence.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(absence)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Bewerken"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {deleteConfirm === absence.id ? (
                            <div className="flex items-center gap-1">
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
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(absence.id)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                              title="Verwijderen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
                {filteredAbsences.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Geen afwezigheden gevonden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
