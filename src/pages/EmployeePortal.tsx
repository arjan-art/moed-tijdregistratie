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
  CheckCircle2,
  HeartPulse,
  Umbrella,
  Calendar,
  FileText,
} from 'lucide-react'
import {
  findEmployeeByPin,
  addTimeEntry,
  getTimeEntriesByDate,
  getWorkZones,
  addAbsence,
  addLeaveRequest,
  getLeaveBalanceByEmployee,
  getLeaveRequestsByEmployee,
  getSchedulesByEmployee,
} from '@/lib/db'
import type { Employee, TimeEntry, Absence, LeaveRequest, Schedule, LeaveBalance } from '@/lib/db'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatDutchDateOnly, formatTimeDisplay } from '@/lib/timezone'

const DUTCH_DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

const PIN_LENGTH = 4

function formatDuration(startTime: string): string {
  const diff = Date.now() - new Date(startTime).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export default function EmployeePortal() {
  const [pin, setPin] = useState('')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [loading, setLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<{ start: string; type: string } | null>(null)
  const [elapsed, setElapsed] = useState('00:00:00')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pinInputRef = useRef<HTMLInputElement>(null)

  // Absence modal state
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [absenceForm, setAbsenceForm] = useState({
    type: 'ziekte' as Absence['type'],
    start_date: getTodayDate(),
    end_date: getTodayDate(),
    start_time: '',
    end_time: '',
    note: '',
  })

  // Leave request modal state
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveForm, setLeaveForm] = useState({
    start_date: getTodayDate(),
    end_date: getTodayDate(),
    hours: 8,
    type: 'vakantie' as LeaveRequest['type'],
    note: '',
  })
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])

  // Schedule state
  const [schedules, setSchedules] = useState<Schedule[]>([])

  const today = getTodayDate()

  const loadEntries = useCallback(async (empId: string) => {
    const allEntries = await getTimeEntriesByDate(today)
    const myEntries = allEntries.filter(e => e.employee_id === empId)
    setEntries(myEntries)

    const lastIn = myEntries.find(e => e.type === 'inklokken')
    const lastOut = myEntries.find(e => e.type === 'uitklokken')
    const lastPauseIn = myEntries.find(e => e.type === 'pauze_in')
    const lastPauseOut = myEntries.find(e => e.type === 'pauze_uit')

    if (lastIn && (!lastOut || new Date(lastIn.timestamp) > new Date(lastOut.timestamp))) {
      if (lastPauseIn && (!lastPauseOut || new Date(lastPauseIn.timestamp) > new Date(lastPauseOut.timestamp))) {
        setActiveSession({ start: lastPauseIn.timestamp, type: 'pauze' })
      } else {
        setActiveSession({ start: lastIn.timestamp, type: 'werk' })
      }
    } else {
      setActiveSession(null)
    }
  }, [today])

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

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, PIN_LENGTH)
    setPin(digits)
    if (digits.length === PIN_LENGTH) {
      handlePinLogin(digits)
    }
  }

  const handlePinLogin = async (pinCode: string) => {
    setLoading(true)
    const emp = await findEmployeeByPin(pinCode)
    if (emp) {
      setEmployee(emp)
      setMessage(`Welkom, ${emp.name}!`)
      setMessageType('success')
      await loadEntries(emp.id)
      await loadEmployeeData(emp.id)
    } else {
      setMessage('Ongeldige PIN code. Probeer opnieuw.')
      setMessageType('error')
      setPin('')
      setTimeout(() => pinInputRef.current?.focus(), 100)
    }
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleClockAction = async (type: TimeEntry['type']) => {
    if (!employee) return
    setLoading(true)

    const workZones = await getWorkZones()
    const defaultZone = workZones.find(z => z.is_default)

    const entry: Omit<TimeEntry, 'id' | 'created_at'> = {
      employee_id: employee.id,
      employee_name: employee.name,
      type,
      timestamp: new Date().toISOString(),
      note: '',
      date: today,
      location: 'binnen',
      reason: '',
    }

    if (defaultZone) {
      entry.note = `Zone: ${defaultZone.name}`
    }

    await addTimeEntry(entry)
    await loadEntries(employee.id)

    const actionLabels: Record<string, string> = {
      inklokken: 'Succesvol ingeklokt!',
      uitklokken: 'Succesvol uitgeklokt!',
      pauze_in: 'Pauze gestart!',
      pauze_uit: 'Pauze beëindigd!',
    }
    setMessage(actionLabels[type] || 'Actie geregistreerd!')
    setMessageType('success')
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleLogout = () => {
    setEmployee(null)
    setPin('')
    setEntries([])
    setActiveSession(null)
    setElapsed('00:00:00')
    setLeaveBalance(null)
    setLeaveRequests([])
    setSchedules([])
  }

  const loadEmployeeData = useCallback(async (empId: string) => {
    const [balance, requests, scheds] = await Promise.all([
      getLeaveBalanceByEmployee(empId),
      getLeaveRequestsByEmployee(empId),
      getSchedulesByEmployee(empId),
    ])
    setLeaveBalance(balance)
    setLeaveRequests(requests)
    setSchedules(scheds)
  }, [])

  const handleAbsenceSubmit = async () => {
    if (!employee) return
    setLoading(true)
    const result = await addAbsence({
      employee_id: employee.id,
      type: absenceForm.type,
      start_date: absenceForm.start_date,
      end_date: absenceForm.end_date,
      start_time: absenceForm.start_time || null,
      end_time: absenceForm.end_time || null,
      note: absenceForm.note || null,
      status: 'goedgekeurd',
    })
    setLoading(false)
    if (result) {
      setAbsenceOpen(false)
      setAbsenceForm({ type: 'ziekte', start_date: getTodayDate(), end_date: getTodayDate(), start_time: '', end_time: '', note: '' })
      setMessage('Afwezigheid succesvol gemeld!')
      setMessageType('success')
    } else {
      setMessage('Er is iets misgegaan. Probeer opnieuw.')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleLeaveSubmit = async () => {
    if (!employee) return
    setLoading(true)
    const result = await addLeaveRequest({
      employee_id: employee.id,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      hours_requested: leaveForm.hours,
      type: leaveForm.type,
      note: leaveForm.note || null,
    })
    setLoading(false)
    if (result) {
      setLeaveOpen(false)
      setLeaveForm({ start_date: getTodayDate(), end_date: getTodayDate(), hours: 8, type: 'vakantie', note: '' })
      setMessage('Verlofaanvraag succesvol ingediend!')
      setMessageType('success')
      await loadEmployeeData(employee.id)
    } else {
      setMessage('Er is iets misgegaan. Probeer opnieuw.')
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'inklokken': return <LogIn className="w-4 h-4 text-green-600" />
      case 'uitklokken': return <LogOut className="w-4 h-4 text-red-500" />
      case 'pauze_in': return <Coffee className="w-4 h-4 text-amber-500" />
      case 'pauze_uit': return <Play className="w-4 h-4 text-blue-500" />
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

  const canClockIn = !activeSession
  const canClockOut = activeSession?.type === 'werk'
  const canPauseIn = activeSession?.type === 'werk'
  const canPauseOut = activeSession?.type === 'pauze'

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ingediend': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Ingediend</Badge>
      case 'goedgekeurd': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Goedgekeurd</Badge>
      case 'afgewezen': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Afgewezen</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-brand-700 text-white px-4 py-4 flex items-center gap-3 shadow-md">
        <button
          onClick={() => window.location.hash = '/'}
          className="p-2 rounded-lg hover:bg-brand-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">MOED</h1>
            <p className="text-xs text-brand-200">Medewerker Portaal</p>
          </div>
        </div>
        {employee && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm font-medium">{employee.name}</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-brand-600 transition-colors text-xs"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!employee ? (
            <motion.div
              key="pin-entry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">PIN Invoer</h2>
                <p className="text-muted-foreground">Voer je 4-cijferige PIN code in</p>
              </div>

              {/* PIN Display */}
              <div className="flex justify-center gap-4">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      i < pin.length
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                    animate={i < pin.length ? { scale: [1, 1.1, 1] } : {}}
                  >
                    {i < pin.length ? '•' : ''}
                  </motion.div>
                ))}
              </div>

              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className="absolute opacity-0 w-0 h-0"
                maxLength={PIN_LENGTH}
              />

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <motion.button
                    key={num}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePinChange(pin + num)}
                    className="h-14 rounded-xl bg-card border border-border text-xl font-semibold text-foreground hover:bg-muted hover:border-brand-300 transition-all shadow-sm"
                  >
                    {num}
                  </motion.button>
                ))}
                <div />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePinChange(pin + '0')}
                  className="h-14 rounded-xl bg-card border border-border text-xl font-semibold text-foreground hover:bg-muted hover:border-brand-300 transition-all shadow-sm"
                >
                  0
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPin(pin.slice(0, -1))}
                  className="h-14 rounded-xl bg-muted border border-border text-lg font-semibold text-foreground hover:bg-muted/80 transition-all shadow-sm"
                >
                  ⌫
                </motion.button>
              </div>

              {loading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500" />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="clock-interface"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Timer Display */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 text-brand-700 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  {activeSession
                    ? activeSession.type === 'pauze'
                      ? 'Pauze bezig'
                      : 'Ingeklokt'
                    : 'Niet ingeklokt'}
                </div>
                <motion.div
                  className="text-5xl font-mono font-bold text-foreground tracking-wider"
                  key={elapsed}
                  initial={{ scale: 1.02 }}
                  animate={{ scale: 1 }}
                >
                  {elapsed}
                </motion.div>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleClockAction('inklokken')}
                  disabled={!canClockIn || loading}
                  className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all shadow-sm ${
                    canClockIn
                      ? 'border-green-400 bg-green-50 hover:bg-green-100 hover:shadow-md'
                      : 'border-border bg-muted opacity-50 cursor-not-allowed'
                  }`}
                >
                  <LogIn className={`w-8 h-8 ${canClockIn ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span className={`font-semibold ${canClockIn ? 'text-green-700' : 'text-muted-foreground'}`}>Inklokken</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleClockAction('uitklokken')}
                  disabled={!canClockOut || loading}
                  className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all shadow-sm ${
                    canClockOut
                      ? 'border-red-400 bg-red-50 hover:bg-red-100 hover:shadow-md'
                      : 'border-border bg-muted opacity-50 cursor-not-allowed'
                  }`}
                >
                  <LogOut className={`w-8 h-8 ${canClockOut ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <span className={`font-semibold ${canClockOut ? 'text-red-600' : 'text-muted-foreground'}`}>Uitklokken</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleClockAction('pauze_in')}
                  disabled={!canPauseIn || loading}
                  className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all shadow-sm ${
                    canPauseIn
                      ? 'border-amber-400 bg-amber-50 hover:bg-amber-100 hover:shadow-md'
                      : 'border-border bg-muted opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Coffee className={`w-8 h-8 ${canPauseIn ? 'text-amber-600' : 'text-muted-foreground'}`} />
                  <span className={`font-semibold ${canPauseIn ? 'text-amber-700' : 'text-muted-foreground'}`}>Pauze Start</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleClockAction('pauze_uit')}
                  disabled={!canPauseOut || loading}
                  className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all shadow-sm ${
                    canPauseOut
                      ? 'border-blue-400 bg-blue-50 hover:bg-blue-100 hover:shadow-md'
                      : 'border-border bg-muted opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Play className={`w-8 h-8 ${canPauseOut ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  <span className={`font-semibold ${canPauseOut ? 'text-blue-700' : 'text-muted-foreground'}`}>Pauze Einde</span>
                </motion.button>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Dialog open={absenceOpen} onOpenChange={setAbsenceOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      <HeartPulse className="w-4 h-4" />
                      Afwezigheid melden
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Afwezigheid melden</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>Type</Label>
                        <select
                          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={absenceForm.type}
                          onChange={(e) => setAbsenceForm({ ...absenceForm, type: e.target.value as Absence['type'] })}
                        >
                          <option value="ziekte">Ziekte</option>
                          <option value="medische_afspraak">Medische afspraak</option>
                          <option value="vakantie">Vakantie</option>
                          <option value="andere">Anders</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Start datum</Label>
                          <Input
                            type="date"
                            value={absenceForm.start_date}
                            onChange={(e) => setAbsenceForm({ ...absenceForm, start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Eind datum</Label>
                          <Input
                            type="date"
                            value={absenceForm.end_date}
                            onChange={(e) => setAbsenceForm({ ...absenceForm, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Start tijd (optioneel)</Label>
                          <Input
                            type="time"
                            value={absenceForm.start_time}
                            onChange={(e) => setAbsenceForm({ ...absenceForm, start_time: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Eind tijd (optioneel)</Label>
                          <Input
                            type="time"
                            value={absenceForm.end_time}
                            onChange={(e) => setAbsenceForm({ ...absenceForm, end_time: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Notitie</Label>
                        <textarea
                          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                          value={absenceForm.note}
                          onChange={(e) => setAbsenceForm({ ...absenceForm, note: e.target.value })}
                          placeholder="Optionele opmerking..."
                        />
                      </div>
                      <Button onClick={handleAbsenceSubmit} disabled={loading} className="w-full">
                        {loading ? 'Bezig...' : 'Afwezigheid melden'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      <Umbrella className="w-4 h-4" />
                      Vakantie aanvragen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vakantie aanvragen</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      {leaveBalance && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                          <p className="font-medium text-blue-800">
                            Vakantiesaldo: {leaveBalance.total_hours - leaveBalance.used_hours - leaveBalance.pending_hours} uur beschikbaar
                          </p>
                          <p className="text-blue-600 text-xs">
                            Totaal: {leaveBalance.total_hours}u | Opgenomen: {leaveBalance.used_hours}u | In behandeling: {leaveBalance.pending_hours}u
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Start datum</Label>
                          <Input
                            type="date"
                            value={leaveForm.start_date}
                            onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Eind datum</Label>
                          <Input
                            type="date"
                            value={leaveForm.end_date}
                            onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Aantal uren</Label>
                          <Input
                            type="number"
                            min={1}
                            max={160}
                            value={leaveForm.hours}
                            onChange={(e) => setLeaveForm({ ...leaveForm, hours: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <select
                            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={leaveForm.type}
                            onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as LeaveRequest['type'] })}
                          >
                            <option value="vakantie">Vakantie</option>
                            <option value="adv">ADV</option>
                            <option value="zorgverlof">Zorgverlof</option>
                            <option value="andere">Anders</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label>Notitie</Label>
                        <textarea
                          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                          value={leaveForm.note}
                          onChange={(e) => setLeaveForm({ ...leaveForm, note: e.target.value })}
                          placeholder="Optionele opmerking..."
                        />
                      </div>
                      <Button onClick={handleLeaveSubmit} disabled={loading} className="w-full">
                        {loading ? 'Bezig...' : 'Aanvraag indienen'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Schedule */}
              {schedules.length > 0 && (
                <div className="bg-card rounded-xl border border-border shadow-sm">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-600" />
                    <h3 className="font-semibold text-sm">Mijn rooster</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {schedules.map((sched) => (
                      <div key={sched.id} className="px-4 py-2 flex items-center justify-between text-sm">
                        <span className="font-medium">{DUTCH_DAYS[sched.day_of_week]}</span>
                        <span className="text-muted-foreground">
                          {formatTimeDisplay(sched.start_time)} - {formatTimeDisplay(sched.end_time)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leave Requests */}
              {leaveRequests.length > 0 && (
                <div className="bg-card rounded-xl border border-border shadow-sm">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-600" />
                    <h3 className="font-semibold text-sm">Mijn verlofaanvragen</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {leaveRequests.map((req) => (
                      <div key={req.id} className="px-4 py-3 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{formatDutchDateOnly(req.start_date)} {req.start_date !== req.end_date && `– ${formatDutchDateOnly(req.end_date)}`}</p>
                          <p className="text-muted-foreground text-xs">{req.hours_requested} uur — {req.type}</p>
                        </div>
                        {getStatusBadge(req.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Timeline */}
              <div className="bg-card rounded-xl border border-border shadow-sm">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-600" />
                  <h3 className="font-semibold text-sm">Dagoverzicht</h3>
                </div>
                <div className="divide-y divide-border">
                  {entries.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Geen registraties vandaag
                    </div>
                  ) : (
                    entries.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-4 py-3 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {getEntryIcon(entry.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{getEntryLabel(entry.type)}</p>
                          {entry.note && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entry.note}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-mono text-muted-foreground">
                          {formatTime(entry.timestamp)}
                        </span>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Toast */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 ${
                messageType === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {messageType === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
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
