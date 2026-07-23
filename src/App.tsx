import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Home from './pages/Home'
import EmployeePortal from './pages/EmployeePortal'
import AdminLogin from './pages/admin/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminEmployees from './pages/admin/Employees'
import AdminTimeEntries from './pages/admin/TimeEntries'
import AdminWorkZones from './pages/admin/WorkZones'
import AdminManagement from './pages/admin/AdminManagement'
import AdminSettings from './pages/admin/Settings'
import AdminLayout from './components/AdminLayout'
import { getAdmins, addAdmin } from './lib/db'

// Seed default admin if none exists
async function seedDefaultAdmin() {
  try {
    const admins = await getAdmins()
    if (admins.length === 0) {
      await addAdmin({
        name: 'Admin',
        email: 'admin@moed.nl',
        password: 'admin123',
        role: 'superadmin',
      })
      console.log('[MOED] Default admin account created')
    }
  } catch (err) {
    console.error('[MOED] Seed error:', err)
  }
}

// Run seed on module load
seedDefaultAdmin()

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<boolean | null>(null)
  useEffect(() => {
    const admin = sessionStorage.getItem('moed_admin_session')
    setAuth(!!admin)
  }, [])
  if (auth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }
  if (!auth) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/portal" element={<EmployeePortal />} />
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/employees" element={<AdminEmployees />} />
          <Route path="/admin/time-entries" element={<AdminTimeEntries />} />
          <Route path="/admin/work-zones" element={<AdminWorkZones />} />
          <Route path="/admin/admins" element={<AdminManagement />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
