import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Timer,
  LogIn,
  LogOut,
  Coffee,
  Play,
  ArrowLeft,
  Clock,
  MapPin,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  History,
  ChevronDown,
  HeartPulse,
  Umbrella,
  Calendar,
  FileText,
} from 'lucide-react'
import {
  findEmployeeByPin,
  addTimeEntry,
  getTimeEntriesByDate,
  getTimeEntriesByEmployee,
  getWorkZones,
  getWorkZoneById,
  addAbsence,
  addLeaveRequest,
  getLeaveBalanceByEmployee,
  getLeaveRequestsByEmployee,
  getSchedulesByEmployee,
} from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Employee, TimeEntry, WorkZone, LeaveBalance, LeaveRequest, Schedule } from '@/lib/db'
import { supabase } from '@/lib/supabase'

// Helper for consistent time display (assumes local time input)
function formatTimeDisplay(ts: string) {
  return new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(start: string) {
  const diff = new Date().getTime() - new Date(start).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const DUTCH_DAYS = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']

function getScheduleForDate(schedules: Schedule[], dateStr: string): Schedule | undefined {
  const dayOfWeek = DUTCH_DAYS[new Date(dateStr + 'T00:00:00').getDay() === 0 ? 6 : new Date(dateStr + 'T00:00:00').getDay() - 1]
  return schedules.find(s => s.day_of_week === dayOfWeek && s.is_active)
}

/* ── GPS helpers ─────────────────────────────────────────── */

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocatie wordt niet ondersteund'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
  })
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // aardstraal in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/* ── History helpers ─────────────────────────────────────── */

interface DaySummary {
  date: string
  clockIn: TimeEntry | null
  clockOut: TimeEntry | null
  pauses: { in: TimeEntry; out: TimeEntry | null }[]
  totalMinutes: number
  wasOutside: boolean
}

function groupEntriesByDate(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  return entries.reduce((acc, entry) => {
    const d = entry.date || entry.timestamp.split('T')[0]
    if (!acc[d]) acc[d] = []
    acc[d].push(entry)
    return acc
  }, {} as Record<string, TimeEntry[]>)
}

function calculateDaySummary(dayEntries: TimeEntry[]): DaySummary {
  const sorted = [...dayEntries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const clockIn = sorted.find(e => e.type === 'inklokken') || null
  const clockOut = sorted.findLast(e => e.type === 'uitklokken') || null

  const pauses: { in: TimeEntry; out: TimeEntry | null }[] = []
  let currentPauseIn: TimeEntry | null = null
  for (const e of sorted) {
    if (e.type === 'pauze_in') {
      currentPauseIn = e
    } else if (e.type === 'pauze_uit' && currentPauseIn) {
      pauses.push({ in: currentPauseIn, out: e })
      currentPauseIn = null
    }
  }

  let totalMinutes = 0
  if (clockIn && clockOut) {
    const workStart = new Date(clockIn.timestamp).getTime()
    const workEnd = new Date(clockOut.timestamp).getTime()
    totalMinutes = Math.max(0, Math.round((workEnd - workStart) / 60000))
    for (const p of pauses) {
      if (p.out) {
        const pStart = new Date(p.in.timestamp).getTime()
        const pEnd = new Date(p.out.timestamp).getTime()
        totalMinutes -= Math.max(0, Math.round((pEnd - pStart) / 60000))
      }
    }
  }

  const wasOutside = sorted.some(e => e.location === 'buiten')

  return { date: dayEntries[0]?.date || '', clockIn, clockOut, pauses, totalMinutes, wasOutside }
}

function formatDurationHM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}u ${m}m`
}

export default function EmployeePortal() {
  const [step, setStep] = useState<'pin' | 'portal'>('pin')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [workZones, setWorkZones] = useState<WorkZone[]>([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success')
  const [activeSession, setActiveSession] = useState<{ start: string; zone: WorkZone } | null>(null)
  const [elapsed, setElapsed] = useState('00:00:00')
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const [selectedZone, setSelectedZone] = useState<WorkZone | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])

  // History state
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [historyEntries, setHistoryEntries] = useState<TimeEntry[]>([])

  // Schedule state
  const [schedules, setSchedules] = useState<Schedule[]>([])

  useEffect(() => {
    loadWorkZones()
  }, [])

  const loadWorkZones = async () => {
    const zones = await getWorkZones()
    setWorkZones(zones)
  }

  const loadEntries = async (empId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const todayEntries = await getTimeEntriesByDate(empId, today)
    setEntries(todayEntries)

    const inEntry = todayEntries.find(e => e.type === 'inklokken')
    const outEntry = todayEntries.find(e => e.type === 'uitklokken')
    const zone = inEntry ? workZones.find(z => z.id === inEntry.zone_id) : undefined

    if (inEntry && !outEntry && zone) {
      setActiveSession({ start: inEntry.timestamp, zone })
    } else {
      setActiveSession(null)
    }
  }

  const loadEmployeeData = async (empId: string) => {
    const balance = await getLeaveBalanceByEmployee(empId)
    setLeaveBalance(balance)
    const requests = await getLeaveRequestsByEmployee(empId)
    setLeaveRequests(requests)
    const scheds = await getSchedulesByEmployee(empId)
    setSchedules(scheds)
  }

  const loadHistory = useCallback(async (empId: string) => {
    const allEntries = await getTimeEntriesByEmployee(empId)
    setHistoryEntries(allEntries)
  }, [])

  const handlePinLogin = async () => {
    setError('')
    if (!pin) {
      setError('Voer je PIN in')
      return
    }
    try {
      const emp = await findEmployeeByPin(pin)
      if (!emp) {
        setError('Ongeldige PIN')
        return
      }
      setEmployee(emp)
      setStep('portal')
      setPin('')
      setMessage(`Welkom, ${emp.name}!`)
      setMessageType('success')
      await loadEntries(emp.id)
      await loadEmployeeData(emp.id)
      await loadHistory(emp.id)
    } catch (err: any) {
      setError(err.message || 'Inloggen mislukt')
    }
  }

  const handleClockAction = async (type: 'inklokken' | 'pauze_in' | 'pauze_uit' | 'uitklokken') => {
    if (!employee || !selectedZone) return

    let isOutside = false
    let outsideReason = ''

    // GPS-check alleen voor inklokken en uitklokken
    if (type === 'inklokken' || type === 'uitklokken') {
      if (selectedZone.lat != null && selectedZone.lng != null && selectedZone.radius > 0) {
        try {
          const position = await getCurrentPosition()
          const userLat = position.coords.latitude
          const userLng = position.coords.longitude
          const distance = haversineDistance(selectedZone.lat, selectedZone.lng, userLat, userLng)
          if (distance > selectedZone.radius) {
            isOutside = true
            outsideReason = `Je bent ~${Math.round(distance)}m van ${selectedZone.name} (max ${selectedZone.radius}m).`
          }
        } catch (geoErr: any) {
          // GPS niet beschikbaar — geen blokkade, alleen geen locatie-check
          console.warn('GPS niet beschikbaar:', geoErr.message)
        }
      }
    }

    const now = new Date().toISOString()
    const today = now.split('T')[0]
    const entryData: Omit<TimeEntry, 'id' | 'created_at'> = {
      employee_id: employee.id,
      type,
      timestamp: now,
      date: today,
      zone_id: selectedZone.id,
      location: isOutside ? 'buiten' : 'binnen',
      reason: isOutside ? outsideReason : null,
    }

    try {
      await addTimeEntry(entryData)
      if (type === 'inklokken') {
        setActiveSession({ start: now, zone: selectedZone })
        setMessage(`Ingeklokt bij ${selectedZone.name}${isOutside ? ' (buiten zone)' : ''}`)
      } else if (type === 'uitklokken') {
        setActiveSession(null)
        setMessage(`Uitgeklokt${isOutside ? ' (buiten zone)' : ''}`)
      } else if (type === 'pauze_in') {
        setMessage('Pauze gestart')
      } else {
        setMessage('Pauze beëindigd')
      }
      setMessageType(isOutside ? 'warning' : 'success')
      await loadEntries(employee.id)
      await loadHistory(employee.id)
    } catch (err: any) {
      setMessage(err.message || 'Actie mislukt')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), isOutside ? 5000 : 3000)
  }

  const handleLogout = () => {
    setEmployee(null)
    setStep('pin')
    setEntries([])
    setActiveSession(null)
    setMessage('')
    setSelectedZone(null)
    setHistoryEntries([])
  }

  const handleAbsence = async (type: 'ziekte' | 'vakantie' | 'verlof', startDate: string, endDate: string, reason?: string) => {
    if (!employee) return
    try {
      await addAbsence({
        employee_id: employee.id,
        type,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
        status: 'pending',
      })
      setMessage('Afwezigheid geregistreerd')
      setMessageType('success')
    } catch (err: any) {
      setMessage(err.message || 'Registratie mislukt')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleLeaveRequest = async (type: 'vakantie' | 'persoonlijk' | 'ziekte' | 'anders', startDate: string, endDate: string, reason?: string) => {
    if (!employee) return
    try {
      await addLeaveRequest({
        employee_id: employee.id,
        type,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
        status: 'pending',
      })
      setMessage('Verlofaanvraag ingediend')
      setMessageType('success')
      await loadEmployeeData(employee.id)
    } catch (err: any) {
      setMessage(err.message || 'Aanvraag mislukt')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const getNextAction = () => {
    if (!entries.length) return 'inklokken'
    const lastEntry = entries[entries.length - 1]
    switch (lastEntry.type) {
      case 'inklokken': return 'pauze_in'
      case 'pauze_in': return 'pauze_uit'
      case 'pauze_uit': return 'uitklokken'
      case 'uitklokken': return 'inklokken'
      default: return 'inklokken'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'inklokken': return 'bg-green-50 text-green-700'
      case 'pauze_in': return 'bg-yellow-50 text-yellow-700'
      case 'pauze_uit': return 'bg-blue-50 text-blue-700'
      case 'uitklokken': return 'bg-red-50 text-red-700'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'inklokken': return 'Ingeklokt'
      case 'pauze_in': return 'Pauze gestart'
      case 'pauze_uit': return 'Pauze beëindigd'
      case 'uitklokken': return 'Uitgeklokt'
      default: return type
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inklokken':
        return <LogIn className="w-4 h-4" />
      case 'pauze_in':
        return <Coffee className="w-4 h-4" />
      case 'pauze_uit':
        return <Play className="w-4 h-4" />
      case 'uitklokken':
        return <LogOut className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getMonthOptions = () => {
    const options: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }

  const getMonthHistory = (): DaySummary[] => {
    const byDate = groupEntriesByDate(historyEntries)
    const [year, month] = historyMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const result: DaySummary[] = []

    for (let day = daysInMonth; day >= 1; day--) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayEntries = byDate[dateStr] || []
      if (dayEntries.length > 0) {
        result.push(calculateDaySummary(dayEntries))
      } else {
        result.push({
          date: dateStr,
          clockIn: null,
          clockOut: null,
          pauses: [],
          totalMinutes: 0,
          wasOutside: false,
        })
      }
    }
    return result
  }

  const today = new Date().toISOString().split('T')[0]
  const todaySchedule = getScheduleForDate(schedules, today)

  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => {
        setElapsed(formatDuration(activeSession.start))
      }, 1000)
      setElapsed(formatDuration(activeSession.start))
    } else {
      setElapsed('00:00:00')
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeSession])

  useEffect(() => {
    if (employee) {
      loadHistory(employee.id)
    }
  }, [employee, historyMonth, loadHistory])

  if (step === 'pin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Card className="shadow-2xl border-0">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                  <Clock className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Medewerker Portaal</h1>
                <p className="text-gray-500 mt-1">Voer je PIN in om verder te gaan</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePinLogin()}
                    placeholder="••••••"
                    className="w-full text-center text-3xl tracking-[0.5em] font-mono border-2 border-gray-200 rounded-xl py-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}

                <Button
                  onClick={handlePinLogin}
                  className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                  Inloggen
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee?.name}</h1>
            <p className="text-gray-500">{employee?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Uitloggen
          </Button>
        </div>

        {/* Zone selector */}
        {workZones.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Werkzone</label>
              <div className="grid grid-cols-1 gap-2">
                {workZones.map(zone => (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      selectedZone?.id === zone.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <MapPin className={`w-5 h-5 ${selectedZone?.id === zone.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{zone.name}</p>
                      <p className="text-sm text-gray-500">{zone.address}</p>
                    </div>
                    {selectedZone?.id === zone.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active session */}
        {activeSession && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Card className="border-0 shadow-lg bg-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Actieve sessie</p>
                    <p className="text-2xl font-bold mt-1">{elapsed}</p>
                    <p className="text-blue-200 text-sm mt-1">{activeSession.zone.name}</p>
                  </div>
                  <Timer className="w-12 h-12 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Schedule info */}
        {todaySchedule && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Dienst vandaag: {todaySchedule.start_time?.slice(0, 5)} - {todaySchedule.end_time?.slice(0, 5)}
                  {todaySchedule.break_duration && ` · Pauze: ${todaySchedule.break_duration} min`}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          {selectedZone ? (
            <>
              <Button
                onClick={() => handleClockAction('inklokken')}
                disabled={!!activeSession}
                className="h-auto py-6 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <LogIn className="w-8 h-8" />
                <span className="font-semibold">Inklokken</span>
              </Button>
              <Button
                onClick={() => handleClockAction('pauze_in')}
                disabled={!activeSession}
                className="h-auto py-6 flex flex-col items-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50"
              >
                <Coffee className="w-8 h-8" />
                <span className="font-semibold">Pauze</span>
              </Button>
              <Button
                onClick={() => handleClockAction('pauze_uit')}
                disabled={!activeSession}
                className="h-auto py-6 flex flex-col items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              >
                <Play className="w-8 h-8" />
                <span className="font-semibold">Pauze uit</span>
              </Button>
              <Button
                onClick={() => handleClockAction('uitklokken')}
                disabled={!activeSession}
                className="h-auto py-6 flex flex-col items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50"
              >
                <LogOut className="w-8 h-8" />
                <span className="font-semibold">Uitklokken</span>
              </Button>
            </>
          ) : (
            <div className="col-span-2 p-8 text-center text-gray-500 bg-white rounded-2xl">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Selecteer een werkzone om te klokken</p>
            </div>
          )}
        </div>

        {/* Today's entries */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dagoverzicht</h2>
          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nog geen registraties vandaag</p>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${getTypeColor(entry.type)}`}
                >
                  <div className="flex items-center gap-3">
                    {getTypeIcon(entry.type)}
                    <div>
                      <p className="font-medium">{getTypeLabel(entry.type)}</p>
                      <p className="text-sm opacity-75">{formatTimeDisplay(entry.timestamp)}</p>
                    </div>
                  </div>
                  {entry.location === 'buiten' && (
                    <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Buiten zone
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── History Overview ─────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Historisch Overzicht
            </h2>
            <div className="relative">
              <select
                value={historyMonth}
                onChange={e => setHistoryMonth(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getMonthOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {getMonthHistory().map((day, idx) => {
              const hasData = day.clockIn !== null
              const dateObj = new Date(day.date + 'T00:00:00')
              const dayName = DUTCH_DAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]
              const dateNum = dateObj.getDate()
              const monthShort = dateObj.toLocaleDateString('nl-NL', { month: 'short' })

              return (
                <div
                  key={day.date}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                    hasData ? 'bg-gray-50 hover:bg-gray-100' : 'opacity-40'
                  }`}
                >
                  <div className="flex-shrink-0 w-14 text-center">
                    <p className="text-xs text-gray-500 uppercase">{dayName.slice(0, 2)}</p>
                    <p className="text-lg font-bold text-gray-900">{dateNum}</p>
                    <p className="text-xs text-gray-400">{monthShort}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    {hasData ? (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <LogIn className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">
                            {day.clockIn ? formatTimeDisplay(day.clockIn.timestamp) : '--:--'}
                          </span>
                        </div>
                        <span className="text-gray-300">→</span>
                        <div className="flex items-center gap-2">
                          <LogOut className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium">
                            {day.clockOut ? formatTimeDisplay(day.clockOut.timestamp) : '--:--'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Geen registraties</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {hasData && (
                      <>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatDurationHM(day.totalMinutes)}
                        </span>
                        {day.wasOutside ? (
                          <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Buiten
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-300 text-green-600 bg-green-50">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Binnen
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Leave & Absence */}
        <Tabs defaultValue="verlof" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="verlof">Verlof</TabsTrigger>
            <TabsTrigger value="ziekte">Ziekte</TabsTrigger>
            <TabsTrigger value="verzoeken">Verzoeken</TabsTrigger>
          </TabsList>

          <TabsContent value="verlof" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Umbrella className="w-5 h-5 text-blue-600" />
                    Verlofsaldo
                  </h3>
                  {leaveBalance && (
                    <Badge variant="outline" className="text-blue-600 bg-blue-50">
                      {leaveBalance.remaining_days} dagen resterend
                    </Badge>
                  )}
                </div>

                {leaveBalance && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-gray-900">{leaveBalance.total_days}</p>
                      <p className="text-xs text-gray-500">Totaal</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-gray-900">{leaveBalance.used_days}</p>
                      <p className="text-xs text-gray-500">Gebruikt</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-green-600">{leaveBalance.remaining_days}</p>
                      <p className="text-xs text-gray-500">Resterend</p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setShowLeaveModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Verlof aanvragen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ziekte" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-red-600" />
                  Ziekmelding
                </h3>
                <p className="text-sm text-gray-500">
                  Meld je ziek door een afwezigheid te registreren. Je werkgever wordt hiervan op de hoogte gebracht.
                </p>
                <Button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0]
                    handleAbsence('ziekte', today, today)
                  }}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <HeartPulse className="w-4 h-4 mr-2" />
                  Ik ben ziek vandaag
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verzoeken" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Mijn verlofaanvragen
                </h3>
                {leaveRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Geen verlofaanvragen</p>
                ) : (
                  <div className="space-y-3">
                    {leaveRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium capitalize">{req.type}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(req.start_date).toLocaleDateString('nl-NL')} - {new Date(req.end_date).toLocaleDateString('nl-NL')}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            req.status === 'approved'
                              ? 'border-green-300 text-green-600 bg-green-50'
                              : req.status === 'rejected'
                              ? 'border-red-300 text-red-600 bg-red-50'
                              : 'border-yellow-300 text-yellow-600 bg-yellow-50'
                          }
                        >
                          {req.status === 'approved' ? 'Goedgekeurd' : req.status === 'rejected' ? 'Afgewezen' : 'In behandeling'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Leave request modal */}
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">Verlof aanvragen</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select id="leaveType" className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 mt-1 focus:border-blue-500 outline-none">
                    <option value="vakantie">Vakantie</option>
                    <option value="persoonlijk">Persoonlijk</option>
                    <option value="ziekte">Ziekte</option>
                    <option value="anders">Anders</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Van</label>
                    <input id="leaveStart" type="date" className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 mt-1 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tot</label>
                    <input id="leaveEnd" type="date" className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 mt-1 focus:border-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Reden (optioneel)</label>
                  <textarea id="leaveReason" rows={3} className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 mt-1 focus:border-blue-500 outline-none resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowLeaveModal(false)}>
                  Annuleren
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    const type = (document.getElementById('leaveType') as HTMLSelectElement).value as 'vakantie' | 'persoonlijk' | 'ziekte' | 'anders'
                    const start = (document.getElementById('leaveStart') as HTMLInputElement).value
                    const end = (document.getElementById('leaveEnd') as HTMLInputElement).value
                    const reason = (document.getElementById('leaveReason') as HTMLTextAreaElement).value
                    if (start && end) {
                      handleLeaveRequest(type, start, end, reason)
                      setShowLeaveModal(false)
                    }
                  }}
                >
                  Indienen
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 ${
                messageType === 'success'
                  ? 'bg-green-600 text-white'
                  : messageType === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {messageType === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : messageType === 'warning' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium text-sm">{message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}