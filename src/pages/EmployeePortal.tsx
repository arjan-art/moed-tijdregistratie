import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut,
  Clock,
  MapPin,
  Utensils,
  Coffee,
  Play,
  Pause,
  StopCircle,
  Sun,
  Moon,
  Calendar,
  ChevronRight,
  ArrowRight,
  Footprints,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  Timer,
  Briefcase,
  Heart,
  Umbrella,
} from 'lucide-react'
import {
  getEmployeeById,
  getTimeEntriesByEmployee,
  getTimeEntriesByDate,
  addTimeEntry,
  getWorkZones,
  getSchedulesByEmployee,
  getAbsencesByEmployee,
  getLeaveRequestsByEmployee,
  getLeaveBalanceByEmployee,
  addLeaveRequest,
  addAbsence,
  type TimeEntry,
  type WorkZone,
  type Schedule,
  type LeaveRequest,
  type LeaveBalance,
  type Absence,
} from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const WORK_START_HOUR = 8
const WORK_END_HOUR = 18

function getTodayDateStr() {
  return new Date().toISOString().split('T')[0]
}

function getNowTimeStr() {
  return new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function getDayName(dayOfWeek: number) {
  const days = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
  return days[dayOfWeek]
}

function getNextAction(entries: TimeEntry[]): 'inklokken' | 'pauze_in' | 'pauze_uit' | 'uitklokken' | null {
  if (entries.length === 0) return 'inklokken'
  const lastType = entries[0].type
  switch (lastType) {
    case 'inklokken': return 'pauze_in'
    case 'pauze_in': return 'pauze_uit'
    case 'pauze_uit': return 'uitklokken'
    case 'uitklokken': return 'inklokken'
    default: return null
  }
}

function calculateWorkDuration(entries: TimeEntry[]): number {
  let totalMs = 0
  let lastIn: Date | null = null
  let lastPauseIn: Date | null = null

  const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  for (const entry of sorted) {
    const time = new Date(entry.timestamp)
    if (entry.type === 'inklokken') {
      lastIn = time
    } else if (entry.type === 'pauze_in') {
      if (lastIn) {
        totalMs += time.getTime() - lastIn.getTime()
        lastIn = null
      }
      lastPauseIn = time
    } else if (entry.type === 'pauze_uit') {
      lastPauseIn = null
      lastIn = time
    } else if (entry.type === 'uitklokken') {
      if (lastIn) {
        totalMs += time.getTime() - lastIn.getTime()
        lastIn = null
      }
      if (lastPauseIn) {
        lastPauseIn = null
      }
    }
  }
  if (lastIn) {
    totalMs += new Date().getTime() - lastIn.getTime()
  }

  return Math.max(0, totalMs / (1000 * 60 * 60))
}

function getScheduleForDate(dayOfWeek: number, schedules: Schedule[]): Schedule | null {
  return schedules.find(s => s.day_of_week === dayOfWeek) || null
}

export default function EmployeePortal() {
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState('')
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([])
  const [workZones, setWorkZones] = useState<WorkZone[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isWithinZone, setIsWithinZone] = useState(true)
  const [nearestZone, setNearestZone] = useState<WorkZone | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('today')
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [showAbsenceForm, setShowAbsenceForm] = useState(false)
  const [leaveFormData, setLeaveFormData] = useState({
    type: 'vakantie' as LeaveRequest['type'],
    start_date: '',
    end_date: '',
    hours_requested: 0,
    note: '',
  })
  const [absenceFormData, setAbsenceFormData] = useState({
    type: 'ziekte' as Absence['type'],
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    note: '',
  })

  // Load employee from session
  useEffect(() => {
    const stored = sessionStorage.getItem('moed_employee')
    if (stored) {
      try {
        const emp = JSON.parse(stored)
        setEmployeeId(emp.id)
        setEmployeeName(emp.name)
      } catch {
        setError('Ongeldige sessie')
      }
    } else {
      setError('Geen medewerker ingelogd')
    }
  }, [])

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadData = useCallback(async () => {
    if (!employeeId) return
    try {
      setLoading(true)
      const [
        empEntries,
        todayDateStr,
        zones,
        empSchedules,
        empAbsences,
        empLeaves,
        balance,
      ] = await Promise.all([
        getTimeEntriesByEmployee(employeeId),
        getTodayDateStr(),
        getWorkZones(),
        getSchedulesByEmployee(employeeId),
        getAbsencesByEmployee(employeeId),
        getLeaveRequestsByEmployee(employeeId),
        getLeaveBalanceByEmployee(employeeId),
      ])

      const todayDate = todayDateStr
      const todayData = await getTimeEntriesByDate(todayDate)
      const todayEmpEntries = todayData.filter(e => e.employee_id === employeeId)

      setEntries(empEntries)
      setTodayEntries(todayEmpEntries)
      setWorkZones(zones)
      setSchedules(empSchedules)
      setAbsences(empAbsences)
      setLeaveRequests(empLeaves)
      setLeaveBalance(balance)

      // Calculate location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude, longitude } = pos.coords
            let nearest: WorkZone | null = null
            let minDist = Infinity
            for (const zone of zones) {
              if (zone.lat != null && zone.lng != null) {
                const dist = Math.sqrt(
                  Math.pow(latitude - zone.lat, 2) + Math.pow(longitude - zone.lng, 2)
                )
                if (dist < minDist) {
                  minDist = dist
                  nearest = zone
                }
              }
            }
            setNearestZone(nearest)
            // Check if within radius (rough approximation: 1 degree ~ 111km)
            const within = nearest ? minDist * 111000 < nearest.radius : true
            setIsWithinZone(within)
          },
          () => setIsWithinZone(true)
        )
      }
    } catch (err: any) {
      setError(err.message || 'Fout bij laden')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleClockAction = async (type: TimeEntry['type']) => {
    if (!employeeId) return
    if (!isWithinZone) {
      setError('Je bent niet binnen het werkgebied')
      return
    }

    try {
      const now = new Date()
      const timestamp = now.toISOString()
      const date = getTodayDateStr()
      const timeStr = getNowTimeStr()
      const location: TimeEntry['location'] = isWithinZone ? 'binnen' : 'buiten'

      await addTimeEntry({
        employee_id: employeeId,
        employee_name: employeeName,
        type,
        timestamp,
        note: '',
        date,
        location,
        reason: type === 'uitklokken' && currentTime.getHours() >= WORK_END_HOUR ? 'Werkdag afgelopen' : '',
      })

      await loadData()
    } catch (err: any) {
      setError(err.message || 'Fout bij klokken')
    }
  }

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) return
    try {
      await addLeaveRequest({
        employee_id: employeeId,
        employee_name: employeeName,
        type: leaveFormData.type,
        start_date: leaveFormData.start_date,
        end_date: leaveFormData.end_date,
        hours_requested: leaveFormData.hours_requested,
        note: leaveFormData.note || null,
      })
      await loadData()
      setShowLeaveForm(false)
      setLeaveFormData({ type: 'vakantie', start_date: '', end_date: '', hours_requested: 0, note: '' })
    } catch (err: any) {
      setError(err.message || 'Fout bij indienen')
    }
  }

  const handleAbsenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) return
    try {
      await addAbsence({
        employee_id: employeeId,
        type: absenceFormData.type,
        start_date: absenceFormData.start_date,
        end_date: absenceFormData.end_date,
        start_time: absenceFormData.start_time || null,
        end_time: absenceFormData.end_time || null,
        note: absenceFormData.note || null,
        status: 'ingediend',
      })
      await loadData()
      setShowAbsenceForm(false)
      setAbsenceFormData({ type: 'ziekte', start_date: '', end_date: '', start_time: '', end_time: '', note: '' })
    } catch (err: any) {
      setError(err.message || 'Fout bij registreren')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('moed_employee')
    window.location.reload()
  }

  const nextAction = getNextAction(todayEntries)
  const workDuration = calculateWorkDuration(todayEntries)
  const dayOfWeek = currentTime.getDay()
  const todaySchedule = getScheduleForDate(dayOfWeek, schedules)

  const getActionButton = () => {
    switch (nextAction) {
      case 'inklokken':
        return (
          <Button
            onClick={() => handleClockAction('inklokken')}
            className="w-full h-16 bg-green-600 hover:bg-green-700 text-white text-lg"
          >
            <Play className="w-6 h-6 mr-2" />
            Inklokken
          </Button>
        )
      case 'pauze_in':
        return (
          <Button
            onClick={() => handleClockAction('pauze_in')}
            className="w-full h-16 bg-amber-500 hover:bg-amber-600 text-white text-lg"
          >
            <Pause className="w-6 h-6 mr-2" />
            Pauze starten
          </Button>
        )
      case 'pauze_uit':
        return (
          <Button
            onClick={() => handleClockAction('pauze_uit')}
            className="w-full h-16 bg-amber-500 hover:bg-amber-600 text-white text-lg"
          >
            <Play className="w-6 h-6 mr-2" />
            Pauze beeindigen
          </Button>
        )
      case 'uitklokken':
        return (
          <Button
            onClick={() => handleClockAction('uitklokken')}
            className="w-full h-16 bg-red-600 hover:bg-red-700 text-white text-lg"
          >
            <StopCircle className="w-6 h-6 mr-2" />
            Uitklokken
          </Button>
        )
      default:
        return null
    }
  }

  const getActionLabel = () => {
    switch (nextAction) {
      case 'inklokken': return 'Klaar om te starten?'
      case 'pauze_in': return 'Tijd voor pauze'
      case 'pauze_uit': return 'Pauze beeindigen'
      case 'uitklokken': return 'Werkdag afronden'
      default: return ''
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'goedgekeurd':
        return <Badge className="bg-green-100 text-green-800">Goedgekeurd</Badge>
      case 'afgewezen':
        return <Badge className="bg-red-100 text-red-800">Afgewezen</Badge>
      default:
        return <Badge className="bg-amber-100 text-amber-800">Ingediend</Badge>
    }
  }

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'vakantie': return 'Vakantie'
      case 'adv': return 'ADV'
      case 'zorgverlof': return 'Zorgverlof'
      default: return 'Anders'
    }
  }

  const getAbsenceTypeLabel = (type: string) => {
    switch (type) {
      case 'ziekte': return 'Ziekte'
      case 'medische_afspraak': return 'Medische afspraak'
      case 'vakantie': return 'Vakantie'
      default: return 'Anders'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!employeeId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Niet ingelogd</h2>
            <p className="text-gray-500 mb-4">Log in om je tijdregistratie te bekijken</p>
            <Button onClick={() => window.location.href = '/'} className="bg-blue-600 hover:bg-blue-700">
              Naar login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-700">{employeeName.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{employeeName}</h1>
              <p className="text-sm text-gray-500">Medewerker portaal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-bold text-gray-900">
                {currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm text-gray-500">
                {currentTime.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Clock Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <p className="text-blue-100 text-sm mb-1">{getActionLabel()}</p>
                <p className="text-4xl font-bold">
                  {currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-blue-100 text-sm mt-1">
                  {isWithinZone ? (
                    <span className="flex items-center gap-1 justify-center md:justify-start">
                      <MapPin className="w-4 h-4" />
                      {nearestZone ? `Binnen ${nearestZone.name}` : 'Locatie onbekend'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 justify-center md:justify-start text-amber-200">
                      <AlertTriangle className="w-4 h-4" />
                      Buiten werkgebied
                    </span>
                  )}
                </p>
              </div>
              <div className="w-full md:w-64">
                {getActionButton()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Gewerkte uren vandaag</p>
                <p className="text-2xl font-bold text-gray-900">{workDuration.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Registraties vandaag</p>
                <p className="text-2xl font-bold text-gray-900">{todayEntries.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Umbrella className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Vakantie-uren resterend</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leaveBalance ? (leaveBalance.total_hours - leaveBalance.used_hours - leaveBalance.pending_hours).toFixed(1) : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today">Vandaag</TabsTrigger>
            <TabsTrigger value="history">Geschiedenis</TabsTrigger>
            <TabsTrigger value="leave">Verlof</TabsTrigger>
            <TabsTrigger value="absences">Afwezig</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Registraties vandaag
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayEntries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nog geen registraties vandaag</p>
                ) : (
                  <div className="space-y-3">
                    {[...todayEntries].reverse().map((entry, idx) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            entry.type === 'inklokken' ? 'bg-green-100' :
                            entry.type === 'pauze_in' ? 'bg-amber-100' :
                            entry.type === 'pauze_uit' ? 'bg-amber-100' :
                            'bg-red-100'
                          }`}>
                            {entry.type === 'inklokken' && <Play className="w-5 h-5 text-green-600" />}
                            {entry.type === 'pauze_in' && <Pause className="w-5 h-5 text-amber-600" />}
                            {entry.type === 'pauze_uit' && <Play className="w-5 h-5 text-amber-600" />}
                            {entry.type === 'uitklokken' && <StopCircle className="w-5 h-5 text-red-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {entry.type === 'inklokken' ? 'Ingeklokt' :
                               entry.type === 'pauze_in' ? 'Pauze gestart' :
                               entry.type === 'pauze_uit' ? 'Pauze beeindigd' :
                               'Uitgeklokt'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(entry.timestamp).toLocaleTimeString('nl-NL')}
                              {entry.location && ` · ${entry.location === 'binnen' ? 'Binnen' : 'Buiten'}`}
                            </p>
                          </div>
                        </div>
                        {entry.reason && (
                          <Badge variant="outline" className="text-xs">{entry.reason}</Badge>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {todaySchedule && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Rooster vandaag
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {todaySchedule.start_time.slice(0, 5)} - {todaySchedule.end_time.slice(0, 5)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getDayName(dayOfWeek)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recente registraties</CardTitle>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nog geen registraties</p>
                ) : (
                  <div className="space-y-2">
                    {entries.slice(0, 20).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            entry.type === 'inklokken' ? 'bg-green-500' :
                            entry.type === 'pauze_in' || entry.type === 'pauze_uit' ? 'bg-amber-500' :
                            'bg-red-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {entry.type === 'inklokken' ? 'Ingeklokt' :
                               entry.type === 'pauze_in' ? 'Pauze gestart' :
                               entry.type === 'pauze_uit' ? 'Pauze beeindigd' :
                               'Uitgeklokt'}
                            </p>
                            <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleDateString('nl-NL')}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(entry.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Verlofaanvragen</h3>
              <Button onClick={() => setShowLeaveForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Verlof aanvragen
              </Button>
            </div>

            {leaveBalance && (
              <Card>
                <CardHeader>
                  <CardTitle>Verlofsaldo {leaveBalance.year}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{leaveBalance.total_hours}</p>
                      <p className="text-sm text-gray-500">Totaal</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">{leaveBalance.used_hours}</p>
                      <p className="text-sm text-gray-500">Gebruikt</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{leaveBalance.total_hours - leaveBalance.used_hours - leaveBalance.pending_hours}</p>
                      <p className="text-sm text-gray-500">Resterend</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <AnimatePresence>
              {showLeaveForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Verlof aanvragen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleLeaveSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={leaveFormData.type}
                              onChange={e => setLeaveFormData({ ...leaveFormData, type: e.target.value as LeaveRequest['type'] })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="vakantie">Vakantie</option>
                              <option value="adv">ADV</option>
                              <option value="zorgverlof">Zorgverlof</option>
                              <option value="andere">Anders</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Uren</label>
                            <Input
                              type="number"
                              step="0.5"
                              value={leaveFormData.hours_requested}
                              onChange={e => setLeaveFormData({ ...leaveFormData, hours_requested: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                            <Input
                              type="date"
                              value={leaveFormData.start_date}
                              onChange={e => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Einddatum</label>
                            <Input
                              type="date"
                              value={leaveFormData.end_date}
                              onChange={e => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })}
                              required
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Opmerking</label>
                            <textarea
                              value={leaveFormData.note}
                              onChange={e => setLeaveFormData({ ...leaveFormData, note: e.target.value })}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Optionele opmerking..."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button type="button" variant="outline" onClick={() => setShowLeaveForm(false)}>Annuleren</Button>
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Indienen</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card>
              <CardHeader>
                <CardTitle>Aanvragen</CardTitle>
              </CardHeader>
              <CardContent>
                {leaveRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Geen verlofaanvragen</p>
                ) : (
                  <div className="space-y-3">
                    {leaveRequests.map(request => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{getLeaveTypeLabel(request.type)}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(request.start_date).toLocaleDateString('nl-NL')} - {new Date(request.end_date).toLocaleDateString('nl-NL')}
                            {' · '}{request.hours_requested} uur
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="absences" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Afwezigheden</h3>
              <Button onClick={() => setShowAbsenceForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Afwezigheid melden
              </Button>
            </div>

            <AnimatePresence>
              {showAbsenceForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Afwezigheid melden</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAbsenceSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={absenceFormData.type}
                              onChange={e => setAbsenceFormData({ ...absenceFormData, type: e.target.value as Absence['type'] })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="ziekte">Ziekte</option>
                              <option value="medische_afspraak">Medische afspraak</option>
                              <option value="vakantie">Vakantie</option>
                              <option value="andere">Anders</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                            <Input
                              type="date"
                              value={absenceFormData.start_date}
                              onChange={e => setAbsenceFormData({ ...absenceFormData, start_date: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Einddatum</label>
                            <Input
                              type="date"
                              value={absenceFormData.end_date}
                              onChange={e => setAbsenceFormData({ ...absenceFormData, end_date: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Starttijd</label>
                            <Input
                              type="time"
                              value={absenceFormData.start_time}
                              onChange={e => setAbsenceFormData({ ...absenceFormData, start_time: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Eindtijd</label>
                            <Input
                              type="time"
                              value={absenceFormData.end_time}
                              onChange={e => setAbsenceFormData({ ...absenceFormData, end_time: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Opmerking</label>
                            <textarea
                              value={absenceFormData.note}
                              onChange={e => setAbsenceFormData({ ...absenceFormData, note: e.target.value })}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Optionele opmerking..."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button type="button" variant="outline" onClick={() => setShowAbsenceForm(false)}>Annuleren</Button>
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Indienen</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card>
              <CardHeader>
                <CardTitle>Overzicht</CardTitle>
              </CardHeader>
              <CardContent>
                {absences.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Geen afwezigheden</p>
                ) : (
                  <div className="space-y-3">
                    {absences.map(absence => (
                      <div key={absence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{getAbsenceTypeLabel(absence.type)}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(absence.start_date).toLocaleDateString('nl-NL')} - {new Date(absence.end_date).toLocaleDateString('nl-NL')}
                          </p>
                          {absence.note && <p className="text-xs text-gray-400 mt-1">{absence.note}</p>}
                        </div>
                        {getStatusBadge(absence.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
