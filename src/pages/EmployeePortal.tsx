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
} from 'lucide-react'
import { findEmployeeByPin, addTimeEntry, getTimeEntriesByDate, getWorkZones } from '@/lib/db'
import type { Employee, TimeEntry } from '@/lib/db'

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
