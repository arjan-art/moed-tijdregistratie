import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Calendar,
  Filter,
  AlertTriangle,
  CheckCircle2,
  X,
  Pencil,
  Trash2,
  Clock,
  FileText,
} from 'lucide-react'
import {
  getEmployees,
  getAbsences,
  addAbsence,
  updateAbsence,
  deleteAbsence,
} from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Employee, Absence } from '@/lib/db'

function formatDutchDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL')
}

export default function Absences() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ingediend' | 'goedgekeurd' | 'afgewezen'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    type: 'ziekte' as Absence['type'],
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    note: '',
    status: 'ingediend' as Absence['status'],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [empData, absData] = await Promise.all([
        getEmployees(),
        getAbsences(),
      ])
      setEmployees(empData)
      setAbsences(absData)
    } catch (err: any) {
      setError(err.message || 'Fout bij laden')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employee_id || !formData.start_date || !formData.end_date) {
      setError('Vul alle verplichte velden in')
      return
    }

    const submissionData = {
      employee_id: formData.employee_id,
      type: formData.type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      note: formData.note || null,
      status: formData.status,
    }

    try {
      if (editingId) {
        await updateAbsence(editingId, submissionData)
      } else {
        await addAbsence(submissionData)
      }
      await loadData()
      setShowForm(false)
      setEditingId(null)
      setFormData({
        employee_id: '',
        type: 'ziekte',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        note: '',
        status: 'ingediend',
      })
    } catch (err: any) {
      setError(err.message || 'Fout bij opslaan')
    }
  }

  const handleEdit = (absence: Absence) => {
    setEditingId(absence.id)
    setFormData({
      employee_id: absence.employee_id,
      type: absence.type,
      start_date: absence.start_date,
      end_date: absence.end_date,
      start_time: absence.start_time || '',
      end_time: absence.end_time || '',
      note: absence.note || '',
      status: absence.status,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze afwezigheid wilt verwijderen?')) return
    try {
      await deleteAbsence(id)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Fout bij verwijderen')
    }
  }

  const filteredAbsences = absences.filter(absence => {
    const employee = employees.find(e => e.id === absence.employee_id)
    const matchesSearch = !searchQuery ||
      employee?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      absence.note?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || absence.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'goedgekeurd':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Goedgekeurd</Badge>
      case 'afgewezen':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Afgewezen</Badge>
      default:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Ingediend</Badge>
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ziekte': return 'Ziekte'
      case 'medische_afspraak': return 'Medische afspraak'
      case 'vakantie': return 'Vakantie'
      default: return 'Anders'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Afwezigheden</h1>
          <p className="text-gray-500">Beheer ziekteverzuim en afwezigheden</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null)
            setFormData({
              employee_id: '',
              type: 'ziekte',
              start_date: '',
              end_date: '',
              start_time: '',
              end_time: '',
              note: '',
              status: 'ingediend',
            })
            setShowForm(true)
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Afwezigheid registreren
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Zoek op naam, e-mail of opmerking..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle statussen</option>
              <option value="ingediend">Ingediend</option>
              <option value="goedgekeurd">Goedgekeurd</option>
              <option value="afgewezen">Afgewezen</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? 'Afwezigheid bewerken' : 'Nieuwe afwezigheid'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Medewerker *
                      </label>
                      <select
                        value={formData.employee_id}
                        onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Selecteer medewerker</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as Absence['type'] })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ziekte">Ziekte</option>
                        <option value="medische_afspraak">Medische afspraak</option>
                        <option value="vakantie">Vakantie</option>
                        <option value="andere">Anders</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Startdatum *
                      </label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Einddatum *
                      </label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Starttijd
                      </label>
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Eindtijd
                      </label>
                      <Input
                        type="time"
                        value={formData.end_time}
                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opmerking
                      </label>
                      <textarea
                        value={formData.note}
                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Optionele opmerking..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                    >
                      Annuleren
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingId ? 'Bijwerken' : 'Registreren'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle>Overzicht ({filteredAbsences.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Medewerker</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Periode</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Opmerking</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbsences.map(absence => {
                  const employee = employees.find(e => e.id === absence.employee_id)
                  return (
                    <tr key={absence.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {employee?.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{employee?.name}</p>
                            <p className="text-xs text-gray-500">{employee?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900">{getTypeLabel(absence.type)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDutchDate(absence.start_date)} - {formatDutchDate(absence.end_date)}
                          </span>
                        </div>
                        {absence.start_time && absence.end_time && (
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {absence.start_time.slice(0, 5)} - {absence.end_time.slice(0, 5)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(absence.status)}</td>
                      <td className="py-3 px-4">
                        {absence.note ? (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600 max-w-xs truncate">{absence.note}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(absence)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(absence.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredAbsences.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Geen afwezigheden gevonden</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
