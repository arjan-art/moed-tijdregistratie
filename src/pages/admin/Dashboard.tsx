import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Clock, Coffee, Calendar } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { getEmployees, getTimeEntriesByDate } from '@/lib/db'
import type { Employee, TimeEntry } from '@/lib/db'

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    clockedInToday: 0,
    totalHoursToday: '0.0',
    openPauses: 0,
  })
  const [recentActivity, setRecentActivity] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    const today = getTodayDate()

    const [employees, entries] = await Promise.all([
      getEmployees(),
      getTimeEntriesByDate(today),
    ])

    const activeEmployees = employees.filter((e: Employee) => e.status === 'actief')

    const todayEntries = entries
    const uniqueClockedIn = new Set<string>()
    let totalMs = 0
    let openPauses = 0

    const employeeSessions = new Map<string, { lastIn?: string; lastPauseIn?: string; isPaused?: boolean }>()

    for (const entry of todayEntries) {
      const state = employeeSessions.get(entry.employee_id) || {}

      if (entry.type === 'inklokken') {
        state.lastIn = entry.timestamp
        state.isPaused = false
        uniqueClockedIn.add(entry.employee_id)
      } else if (entry.type === 'pauze_in') {
        state.lastPauseIn = entry.timestamp
        state.isPaused = true
        if (state.lastIn) {
          totalMs += new Date(entry.timestamp).getTime() - new Date(state.lastIn).getTime()
        }
      } else if (entry.type === 'pauze_uit') {
        state.isPaused = false
      } else if (entry.type === 'uitklokken') {
        state.isPaused = false
        if (state.lastIn) {
          totalMs += new Date(entry.timestamp).getTime() - new Date(state.lastIn).getTime()
          state.lastIn = undefined
        }
      }

      employeeSessions.set(entry.employee_id, state)
    }

    for (const [, state] of employeeSessions) {
      if (state.isPaused) openPauses++
    }

    const totalHours = (totalMs / 3600000).toFixed(1)

    setStats({
      totalEmployees: activeEmployees.length,
      clockedInToday: uniqueClockedIn.size,
      totalHoursToday: totalHours,
      openPauses,
    })

    setRecentActivity(todayEntries.slice(0, 10))
    setLoading(false)
  }

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'inklokken': return <Clock className="w-4 h-4 text-green-600" />
      case 'uitklokken': return <Clock className="w-4 h-4 text-red-500" />
      case 'pauze_in': return <Coffee className="w-4 h-4 text-amber-500" />
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
    return new Date(timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overzicht van vandaag ({new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })})
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Actieve Werknemers"
              value={stats.totalEmployees}
              icon={Users}
              description="Totaal actieve werknemers"
            />
            <StatCard
              title="Ingeklokt Vandaag"
              value={stats.clockedInToday}
              icon={Calendar}
              description="Unieke medewerkers ingeklokt"
            />
            <StatCard
              title="Uren Vandaag"
              value={stats.totalHoursToday}
              icon={Clock}
              description="Totaal gewerkte uren"
            />
            <StatCard
              title="Open Pauzes"
              value={stats.openPauses}
              icon={Coffee}
              description="Actieve pauzes"
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Recente Activiteit</h2>
              <p className="text-sm text-muted-foreground">Laatste registraties van vandaag</p>
            </div>
            <div className="divide-y divide-border">
              {recentActivity.length === 0 ? (
                <div className="px-6 py-12 text-center text-muted-foreground">
                  Geen activiteit vandaag
                </div>
              ) : (
                recentActivity.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-6 py-3 flex items-center gap-4"
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getEntryIcon(entry.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{entry.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{getEntryLabel(entry.type)}</p>
                    </div>
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatTime(entry.timestamp)}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
