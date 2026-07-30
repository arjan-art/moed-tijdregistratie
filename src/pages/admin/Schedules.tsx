import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Search,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  Clock,
} from 'lucide-react'
import { getEmployees, getSchedules, addSchedule, updateSchedule, deleteSchedule } from '@/lib/db'
import type { Employee, Schedule } from '@/lib/db'

const DUTCH_DAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DUTCH_DAYS_FULL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

function getDutchDayName(dayOfWeek: number): string {
  return DUTCH_DAYS_FULL[dayOfWeek] || ''
}

interface ScheduleFormData {
  employee_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_recurring: boolean
}

const defaultFormData: ScheduleFormData = {
  employee_id: '',
  day_of_week: 0,
  start_time: '08:00',
  end_time: '17:00',
  is_recurring: true,
}

export default function AdminSchedules() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<ScheduleFormData>({ ...defaultFormData })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [emps, schs] = await Promise.all([
      getEmployees(),
      getSchedules(),
    ])
    setEmployees(emps)
    setSchedules(schs)
    setLoading(false)
  }

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees
    return employees.filter((emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [employees, search])

  const resetForm = () => {
    setFormData({ ...defaultFormData })
    setEditingId(null)
    setShowForm(false)
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.employee_id) {
      setFormError('Selecteer een medewerker')
      return
    }
    if (!formData.start_time || !formData.end_time) {
      setFormError('Vul starttijd en eindtijd in')
      return
    }
    if (formData.start_time >= formData.end_time) {
      setFormError('Starttijd moet eerder zijn dan eindtijd')
      return
    }

    if (editingId) {
      await updateSchedule(editingId, formData)
    } else {
      await addSchedule(formData)
    }
    resetForm()
    await loadData()
  }

  const handleEdit = (schedule: Schedule) => {
    setFormData({
      employee_id: schedule.employee_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      is_recurring: schedule.is_recurring,
    })
    setEditingId(schedule.id)
    setShowForm(true)
    setFormError('')
  }

  const handleDelete = async (id: string) => {
    await deleteSchedule(id)
    setDeleteConfirm(null)
    await loadData()
  }

  const handleAddForEmployee = (employeeId: string, dayOfWeek: number) => {
    setFormData({
      ...defaultFormData,
      employee_id: employeeId,
      day_of_week: dayOfWeek,
    })
    setEditingId(null)
    setShowForm(true)
    setFormError('')
  }

  const getScheduleForDay = (employeeId: string, day: number) => {
    return schedules.find((s) => s.employee_id === employeeId && s.day_of_week === day)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-brand-600" />
            Rooster
          </h1>
          <p className="text-muted-foreground mt-1">Beheer werkroosters per medewerker</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Annuleren' : 'Nieuw Rooster'}
        </button>
      </div>

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
                {editingId ? 'Rooster Bewerken' : 'Nieuw Rooster'}
              </h3>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Medewerker</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Selecteer medewerker...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Dag</label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {DUTCH_DAYS_FULL.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Starttijd</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Eindtijd</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                      className="w-5 h-5 rounded border-border text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium">Wekelijks terugkerend</span>
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Zoek medewerker..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Week Overview Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium min-w-[160px]">Medewerker</th>
                    {DUTCH_DAYS_SHORT.map((day, i) => (
                      <th key={i} className="text-center px-2 py-3 font-medium w-[100px]">{day}</th>
                    ))}
                    <th className="text-right px-4 py-3 font-medium w-[80px]">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{emp.name}</td>
                      {Array.from({ length: 7 }).map((_, day) => {
                        const sched = getScheduleForDay(emp.id, day)
                        return (
                          <td key={day} className="px-2 py-2 text-center">
                            {sched ? (
                              <button
                                onClick={() => handleEdit(sched)}
                                className="inline-block px-2 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-medium hover:bg-brand-100 transition-colors"
                              >
                                {sched.start_time.slice(0, 5)}-{sched.end_time.slice(0, 5)}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddForEmployee(emp.id, day)}
                                className="inline-block px-2 py-1 rounded-lg text-muted-foreground/40 text-xs hover:bg-muted hover:text-muted-foreground transition-colors"
                              >
                                +
                              </button>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-right">
                        {schedules.filter((s) => s.employee_id === emp.id).length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {schedules.filter((s) => s.employee_id === emp.id).length}x
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                        Geen medewerkers gevonden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Schedule List */}
          {schedules.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-sm">Alle roosters</h3>
                <span className="text-xs text-muted-foreground">{schedules.length} roosters</span>
              </div>
              <div className="divide-y divide-border">
                {schedules.map((schedule) => {
                  const emp = employees.find((e) => e.id === schedule.employee_id)
                  return (
                    <motion.div
                      key={schedule.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-brand-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{emp?.name || 'Onbekend'}</p>
                          <p className="text-xs text-muted-foreground">
                            {getDutchDayName(schedule.day_of_week)} • {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                            {schedule.is_recurring && ' • Wekelijks'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(schedule)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Bewerken"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === schedule.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(schedule.id)}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Bevestig verwijderen"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                              title="Annuleren"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(schedule.id)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
