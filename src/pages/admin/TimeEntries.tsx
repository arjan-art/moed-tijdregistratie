import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Search,
  Download,
  Trash2,
  Check,
  X,
  Filter,
} from 'lucide-react'
import { getTimeEntries, getEmployees, deleteTimeEntry } from '@/lib/db'
import type { TimeEntry, Employee } from '@/lib/db'

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

export default function AdminTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState(formatDateForInput(new Date()))
  const [dateTo, setDateTo] = useState(formatDateForInput(new Date()))
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [allEntries, allEmployees] = await Promise.all([
      getTimeEntries(),
      getEmployees(),
    ])
    setEntries(allEntries)
    setEmployees(allEmployees)
    setLoading(false)
  }

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !search ||
        entry.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        entry.type.toLowerCase().includes(search.toLowerCase())

      const matchesEmployee =
        selectedEmployees.length === 0 || selectedEmployees.includes(entry.employee_id)

      const entryDate = entry.date
      const matchesDate = entryDate >= dateFrom && entryDate <= dateTo

      return matchesSearch && matchesEmployee && matchesDate
    })
  }, [entries, search, selectedEmployees, dateFrom, dateTo])

  const handleDelete = async (id: string) => {
    await deleteTimeEntry(id)
    setDeleteConfirm(null)
    await loadData()
  }

  const exportCSV = () => {
    const headers = ['Datum', 'Medewerker', 'Type', 'Tijd', 'Locatie', 'Notitie']
    const rows = filteredEntries.map((e) => [
      e.date,
      e.employee_name,
      getEntryLabel(e.type),
      new Date(e.timestamp).toLocaleTimeString('nl-NL'),
      e.location,
      e.note || '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `urenregistratie_${dateFrom}_${dateTo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleEmployeeFilter = (id: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'inklokken': return <Clock className="w-4 h-4 text-green-600" />
      case 'uitklokken': return <Clock className="w-4 h-4 text-red-500" />
      case 'pauze_in': return <Clock className="w-4 h-4 text-amber-500" />
      case 'pauze_uit': return <Clock className="w-4 h-4 text-blue-500" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getEntryLabel = (type: string) => {
    switch (type) {
      case 'inklokken': return 'Ingeklokt'
      case 'uitklokken': return 'Uitgeklokt'
      case 'pauze_in': return 'Pauze gestart'
      case 'pauze_uit': return 'Pauze beëindigd'
      default: return type
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Urenregistratie</h1>
          <p className="text-muted-foreground mt-1">Overzicht van alle tijdregistraties</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exporteer CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek op medewerker of type..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showFilters ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-border hover:bg-muted'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-2 border-t border-border"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Van</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tot</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Medewerkers</label>
              <div className="flex flex-wrap gap-2">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => toggleEmployeeFilter(emp.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedEmployees.includes(emp.id)
                        ? 'bg-brand-600 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {selectedEmployees.includes(emp.id) && <Check className="w-3 h-3" />}
                    {emp.name}
                  </button>
                ))}
                {selectedEmployees.length > 0 && (
                  <button
                    onClick={() => setSelectedEmployees([])}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Wis selectie
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datum</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medewerker</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tijd</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notitie</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Geen registraties gevonden
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">
                      {new Date(entry.date).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{entry.employee_name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted">
                        {getEntryIcon(entry.type)}
                        {getEntryLabel(entry.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">{formatTime(entry.timestamp)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{entry.note || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirm === entry.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDelete(entry.id)}
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
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(entry.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
