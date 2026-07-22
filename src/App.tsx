import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { seedData, getSession } from '@/lib/db';
import { AdminLayout } from '@/components/AdminLayout';
import { EmployeePortal } from '@/pages/EmployeePortal';
import { AdminLogin } from '@/pages/admin/Login';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { AdminEmployees } from '@/pages/admin/Employees';
import { AdminTimeEntries } from '@/pages/admin/TimeEntries';
import { AdminWorkZones } from '@/pages/admin/WorkZones';
import { AdminManagement } from '@/pages/admin/AdminManagement';
import { AdminSettings } from '@/pages/admin/Settings';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    seedData();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<EmployeePortal />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="werknemers" element={<AdminEmployees />} />
          <Route path="uren" element={<AdminTimeEntries />} />
          <Route path="werkzones" element={<AdminWorkZones />} />
          <Route path="beheerders" element={<AdminManagement />} />
          <Route path="instellingen" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
