import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Umbrella,
  Search,
  Check,
  X,
  CheckCircle,
  XCircle,
  Hourglass,
  Pencil,
  Trash2,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  getEmployees,
  getLeaveRequests,
  getLeaveBalances,
  reviewLeaveRequest,
  deleteLeaveRequest,
  upsertLeaveBalance,
} from '@/lib/db'
import { supabase } from '@/lib/supabase'
import type { Employee, LeaveRequest, LeaveBalance } from '@/lib/db'
import { formatDutchDateOnly } from '@/lib/timezone'

type LeaveStatus = 'alle' | 'ingediend' | 'goedgekeurd' | 'afgewezen'

const typeLabels: Record<string, string> = {
  vakantie: 'Vakantie',
  adv: 'ADV',
  zorgverlof: 'Zorgverlof',
  andere: 'Anders',
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  ingediend: {
    label: 'Ingediend',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Hourglass className="w-3 h-3" />,
  },
  goedgekeurd: {
    label: 'Goedgekeurd',
    className: 'bg-green-50 text-green-700 border-green-200',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  afgewezen: {
    label: 'Afgewezen',
    className: 'bg-red-50 text-red-600 border-red-200',
    icon: <XCircle className="w-3 h-3" />,
  },
}

function getAdminId(): string | null {
  try {
    const session = JSON.parse(sessionStorage.getItem('moed_admin_session') || '{}')
    return session.id || null
  } catch {
    return null
  }
}

export default function AdminLeave() {
  // ── Data ──
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)

  // ── Tab 1: Requests ──
  const [searchRequest, setSearchRequest] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeaveStatus>('alle')
  const [showPendingOnly, setShowPendingOnly] = useState(false)
  const [reviewLoading, setReviewLoading] = useState<string | null>(null)
  const [deleteConfirmRequest, setDeleteConfirmRequest] = useState<string | null>(null)

  // ── Tab 2: Balances ──
  const [searchBalance, setSearchBalance] = useState('')
  const [editBalanceModal, setEditBalanceModal] = useState<LeaveBalance | null>(null)
  const [editTotalHours, setEditTotalHours] = useState('')
  const [balanceLoading, setBalanceLoading] = useState(false)

  // ── General ──
  const [activeTab, setActiveTab] = useState('requests')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    const [emps, reqs, bals] = await Promise.all([
      getEmployees(),
      getLeaveRequests(),
      getLeaveBalances(),
    ])
    setEmployees(emps)
    setRequests(reqs)
    setBalances(bals)
    setLoading(false)
  }

  // ── Derived: filtered requests ──
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const emp = employees.find((e) => e.id === req.employee_id)
      const empName = emp?.name || req.employee_name || ''
      const matchesSearch =
        !searchRequest ||
        empName.toLowerCase().includes(searchRequest.toLowerCase()) ||
        typeLabels[req.type]?.toLowerCase().includes(searchRequest.toLowerCase())
      const matchesStatus = statusFilter === 'alle' || req.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [requests, employees, searchRequest, statusFilter])

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'ingediend'),
    [requests]
  )

  // ── Derived: filtered balances ──
  const filteredBalances = useMemo(() => {
    return balances.filter((bal) => {
      const emp = employees.find((e) => e.id === bal.employee_id)
      const empName = emp?.name || ''
      return (
        !searchBalance ||
        empName.toLowerCase().includes(searchBalance.toLowerCase()) ||
        bal.year.toString().includes(searchBalance)
      )
    })
  }, [balances, employees, searchBalance])

  const balanceSummary = useMemo(() => {
    const totalEarned = balances.reduce((sum, b) => sum + b.total_hours, 0)
    const totalUsed = balances.reduce((sum, b) => sum + b.used_hours, 0)
    const totalPending = balances.reduce((sum, b) => sum + b.pending_hours, 0)
    const totalRemaining = totalEarned - totalUsed - totalPending
    return { totalEarned, totalUsed, totalPending, totalRemaining }
  }, [balances])

  // ── Actions ──
  const handleReview = async (requestId: string, status: 'goedgekeurd' | 'afgewezen') => {
    const adminId = getAdminId()
    if (!adminId) {
      setError('Geen admin sessie gevonden. Log opnieuw in.')
      return
    }
    setReviewLoading(requestId)
    setError('')

    // Find the request
    const req = requests.find((r) => r.id === requestId)

    const success = await reviewLeaveRequest(requestId, status, adminId)
    if (!success) {
      setError('Beoordeling mislukt. Probeer opnieuw.')
      setReviewLoading(null)
      return
    }

    // If approved, update leave balance
    if (status === 'goedgekeurd' && req) {
      const year = new Date(req.start_date).getFullYear()
      const bal = balances.find(
        (b) => b.employee_id === req.employee_id && b.year === year
      )
      if (bal) {
        const newUsed = bal.used_hours + req.hours_requested
        const newPending = Math.max(0, bal.pending_hours - req.hours_requested)
        await upsertLeaveBalance({
          id: bal.id,
          employee_id: bal.employee_id,
          year: bal.year,
          total_hours: bal.total_hours,
          used_hours: newUsed,
          pending_hours: newPending,
        })
      }
    }

    await loadData()
    setReviewLoading(null)
  }

  const handleDeleteRequest = async (id: string) => {
    await deleteLeaveRequest(id)
    setDeleteConfirmRequest(null)
    await loadData()
  }

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBalanceModal) return

    const hours = parseFloat(editTotalHours)
    if (isNaN(hours) || hours < 0) {
      setError('Voer een geldig aantal uren in.')
      return
    }

    setBalanceLoading(true)
    setError('')

    const success = await upsertLeaveBalance({
      id: editBalanceModal.id,
      employee_id: editBalanceModal.employee_id,
      year: editBalanceModal.year,
      total_hours: hours,
      used_hours: editBalanceModal.used_hours,
      pending_hours: editBalanceModal.pending_hours,
    })

    if (!success) {
      setError('Opslaan mislukt. Probeer opnieuw.')
      setBalanceLoading(false)
      return
    }

    setEditBalanceModal(null)
    setEditTotalHours('')
    await loadData()
    setBalanceLoading(false)
  }

  const openEditBalance = (bal: LeaveBalance) => {
    setEditBalanceModal(bal)
    setEditTotalHours(bal.total_hours.toString())
    setError('')
  }

  const getRemaining = (bal: LeaveBalance) => bal.total_hours - bal.used_hours - bal.pending_hours

  const getEmployeeName = (empId: string) => {
    const emp = employees.find((e) => e.id === empId)
    return emp?.name || 'Onbekend'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Umbrella className="w-6 h-6 text-brand-600" />
            Vakantie & Verlof
          </h1>
          <p className="text-muted-foreground mt-1">Beheer verlofaanvragen en vakantiesaldo's</p>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="requests" className="gap-1.5">
            <Calendar className="w-4 h-4" />
            Vakantieaanvragen
            {pendingRequests.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="balances" className="gap-1.5">
            <Clock className="w-4 h-4" />
            Vakantiesaldo
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════
            TAB 1: VAKANTIEAANVRAGEN (Leave Requests)
            ════════════════════════════════════════════ */}
        <TabsContent value="requests" className="space-y-6">
          {/* ── Pending requests (highlighted) ── */}
          {pendingRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Hourglass className="w-5 h-5 text-amber-600" />
                Openstaande aanvragen
                <span className="text-sm font-normal text-muted-foreground">
                  ({pendingRequests.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card rounded-xl border-2 border-amber-300 shadow-sm p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Umbrella className="w-5 h-5 text-amber-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {getEmployeeName(req.employee_id)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {typeLabels[req.type] || req.type}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                        <Hourglass className="w-3 h-3" />
                        Ingediend
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-xs text-muted-foreground mb-0.5">Periode</p>
                        <p className="font-medium">
                          {formatDutchDateOnly(req.start_date)}
                          {req.start_date !== req.end_date && (
                            <>
                              {' '}
                              –<br />
                              {formatDutchDateOnly(req.end_date)}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-xs text-muted-foreground mb-0.5">Uren</p>
                        <p className="font-medium">{req.hours_requested} uur</p>
                      </div>
                    </div>

                    {req.note && (
                      <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                        <span className="font-medium text-foreground">Notitie:</span> {req.note}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleReview(req.id, 'goedgekeurd')}
                        disabled={reviewLoading === req.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {reviewLoading === req.id ? (
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Goedkeuren
                      </button>
                      <button
                        onClick={() => handleReview(req.id, 'afgewezen')}
                        disabled={reviewLoading === req.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Afwijzen
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── All requests table ── */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold">Alle aanvragen</h2>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchRequest}
                    onChange={(e) => setSearchRequest(e.target.value)}
                    placeholder="Zoek op medewerker of type..."
                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Status filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as LeaveStatus)}
                    className="pl-10 pr-8 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    <option value="alle">Alle statussen</option>
                    <option value="ingediend">Ingediend</option>
                    <option value="goedgekeurd">Goedgekeurd</option>
                    <option value="afgewezen">Afgewezen</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Medewerker
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Type
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Periode
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Uren
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                        Notitie
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto" />
                        </td>
                      </tr>
                    ) : filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          Geen aanvragen gevonden
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => {
                        const cfg = statusConfig[req.status]
                        return (
                          <motion.tr
                            key={req.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-6 py-4 text-sm font-medium">
                              {getEmployeeName(req.employee_id)}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                {typeLabels[req.type] || req.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {formatDutchDateOnly(req.start_date)}
                              {req.start_date !== req.end_date && (
                                <>
                                  <br />
                                  <span className="text-muted-foreground">
                                    – {formatDutchDateOnly(req.end_date)}
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              {req.hours_requested} uur
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                              {req.note || '-'}
                            </td>
                            <td className="px-6 py-4">
                              {cfg && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.className}`}
                                >
                                  {cfg.icon}
                                  {cfg.label}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Approve / Reject for pending */}
                                {req.status === 'ingediend' && (
                                  <>
                                    <button
                                      onClick={() => handleReview(req.id, 'goedgekeurd')}
                                      disabled={reviewLoading === req.id}
                                      className="p-2 rounded-lg hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                                      title="Goedkeuren"
                                    >
                                      {reviewLoading === req.id ? (
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 inline-block" />
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleReview(req.id, 'afgewezen')}
                                      disabled={reviewLoading === req.id}
                                      className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                                      title="Afwijzen"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {/* Delete */}
                                {deleteConfirmRequest === req.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleDeleteRequest(req.id)}
                                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmRequest(null)}
                                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirmRequest(req.id)}
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════
            TAB 2: VAKANTIESALDO (Leave Balances)
            ════════════════════════════════════════════ */}
        <TabsContent value="balances" className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border shadow-sm p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground">Totaal verdiend</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {balanceSummary.totalEarned.toFixed(1)} uur
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-card rounded-xl border border-border shadow-sm p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Umbrella className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-sm text-muted-foreground">Totaal opgenomen</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {balanceSummary.totalUsed.toFixed(1)} uur
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl border border-border shadow-sm p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    balanceSummary.totalRemaining >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <Calendar
                    className={`w-5 h-5 ${
                      balanceSummary.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Totaal resterend</p>
              </div>
              <p
                className={`text-2xl font-bold ${
                  balanceSummary.totalRemaining >= 0 ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {balanceSummary.totalRemaining.toFixed(1)} uur
              </p>
            </motion.div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchBalance}
              onChange={(e) => setSearchBalance(e.target.value)}
              placeholder="Zoek op medewerker of jaar..."
              className="w-full sm:w-80 pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Balances table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Medewerker
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Jaar
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Totaal uren
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Opgenomen
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      In behandeling
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Resterend
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Geen saldo's gevonden
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((bal) => {
                      const remaining = getRemaining(bal)
                      return (
                        <motion.tr
                          key={bal.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-medium">
                            {getEmployeeName(bal.employee_id)}
                          </td>
                          <td className="px-6 py-4 text-sm">{bal.year}</td>
                          <td className="px-6 py-4 text-sm font-medium">{bal.total_hours.toFixed(1)}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {bal.used_hours.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 text-sm text-amber-600">
                            {bal.pending_hours.toFixed(1)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                remaining >= 0
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-red-50 text-red-600'
                              }`}
                            >
                              {remaining.toFixed(1)} uur
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openEditBalance(bal)}
                              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              title="Saldo aanpassen"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════
          EDIT BALANCE MODAL
          ════════════════════════════════════════════ */}
      <AnimatePresence>
        {editBalanceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEditBalanceModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Vakantiesaldo aanpassen</h3>
                <button
                  onClick={() => setEditBalanceModal(null)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Medewerker:</span>{' '}
                    <span className="font-medium">
                      {getEmployeeName(editBalanceModal.employee_id)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Jaar:</span>{' '}
                    <span className="font-medium">{editBalanceModal.year}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Opgenomen:</span>{' '}
                    <span className="font-medium">
                      {editBalanceModal.used_hours.toFixed(1)} uur
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">In behandeling:</span>{' '}
                    <span className="font-medium">
                      {editBalanceModal.pending_hours.toFixed(1)} uur
                    </span>
                  </p>
                </div>

                <form onSubmit={handleUpdateBalance} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Totaal aantal uren</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editTotalHours}
                      onChange={(e) => setEditTotalHours(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Resterend wordt:{' '}
                      <span
                        className={`font-medium ${
                          parseFloat(editTotalHours || '0') -
                            editBalanceModal.used_hours -
                            editBalanceModal.pending_hours >=
                          0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {(
                          parseFloat(editTotalHours || '0') -
                          editBalanceModal.used_hours -
                          editBalanceModal.pending_hours
                        ).toFixed(1)}{' '}
                        uur
                      </span>
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditBalanceModal(null)}
                      className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      type="submit"
                      disabled={balanceLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {balanceLoading ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Opslaan
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
