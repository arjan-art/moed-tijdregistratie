import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  Plus,
  X,
  Check,
  Trash2,
  AlertCircle,
  Crown,
  UserCog,
} from 'lucide-react'
import { getAdmins, addAdmin, deleteAdmin } from '@/lib/db'
import type { Admin } from '@/lib/db'

export default function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin' as 'superadmin' | 'admin',
  })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; role: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const session = sessionStorage.getItem('moed_admin_session')
    if (session) {
      try {
        const parsed = JSON.parse(session)
        setCurrentAdmin({ id: parsed.id, role: parsed.role })
      } catch {
        // ignore
      }
    }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const data = await getAdmins()
    setAdmins(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Vul alle velden in.')
      return
    }

    const existing = admins.find((a) => a.email === formData.email.trim())
    if (existing) {
      setError('Er bestaat al een beheerder met dit e-mailadres.')
      return
    }

    await addAdmin({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    })

    setFormData({ name: '', email: '', password: '', role: 'admin' })
    setShowForm(false)
    await loadData()
  }

  const handleDelete = async (id: string) => {
    if (currentAdmin?.id === id) return
    await deleteAdmin(id)
    setDeleteConfirm(null)
    await loadData()
  }

  const canDelete = (admin: Admin) => {
    if (currentAdmin?.id === admin.id) return false
    if (currentAdmin?.role !== 'superadmin') return false
    return true
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Beheerders</h1>
          <p className="text-muted-foreground mt-1">Beheer admin accounts en rollen</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Annuleren' : 'Beheerder Toevoegen'}
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Nieuwe Beheerder</h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Naam</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Volledige naam"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mailadres</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@bedrijf.nl"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Wachtwoord</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'superadmin' | 'admin' })}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                {error && (
                  <div className="sm:col-span-2 flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="sm:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setError(''); }}
                    className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Toevoegen
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admins Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Naam</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto" />
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Geen beheerders gevonden
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <motion.tr
                    key={admin.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          admin.role === 'superadmin' ? 'bg-brand-100' : 'bg-muted'
                        }`}>
                          {admin.role === 'superadmin' ? (
                            <Crown className="w-4 h-4 text-brand-600" />
                          ) : (
                            <UserCog className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{admin.name}</p>
                          {currentAdmin?.id === admin.id && (
                            <p className="text-xs text-brand-600 font-medium">Jij</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{admin.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        admin.role === 'superadmin'
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {admin.role === 'superadmin' ? (
                          <Crown className="w-3 h-3" />
                        ) : (
                          <UserCog className="w-3 h-3" />
                        )}
                        {admin.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canDelete(admin) ? (
                        deleteConfirm === admin.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDelete(admin.id)}
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
                            onClick={() => setDeleteConfirm(admin.id)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                            title="Verwijder beheerder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {currentAdmin?.id === admin.id ? 'Eigen account' : 'Geen rechten'}
                        </span>
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
