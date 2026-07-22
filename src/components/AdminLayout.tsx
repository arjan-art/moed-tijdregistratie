import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Clock, MapPin, Shield, Settings,
  LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import { clearSession } from '@/lib/db';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/werknemers', label: 'Werknemers', icon: Users },
  { path: '/admin/uren', label: 'Urenregistratie', icon: Clock },
  { path: '/admin/werkzones', label: 'Werkzones', icon: MapPin },
  { path: '/admin/beheerders', label: 'Beheerders', icon: Shield },
  { path: '/admin/instellingen', label: 'Instellingen', icon: Settings },
];

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearSession();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-primary text-white fixed h-full">
        <div className="p-6 flex items-center gap-3">
          <img src="/moed-logo.png" alt="MOED" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="font-bold text-lg tracking-tight">MOED</h1>
            <p className="text-xs text-white/60">Admin Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Uitloggen
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-primary text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/moed-logo.png" alt="MOED" className="w-8 h-8 rounded-lg" />
          <span className="font-bold">MOED</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-primary text-white flex flex-col"
            >
              <div className="p-6 flex items-center gap-3 mt-12">
                <img src="/moed-logo.png" alt="MOED" className="w-10 h-10 rounded-lg" />
                <div>
                  <h1 className="font-bold text-lg tracking-tight">MOED</h1>
                  <p className="text-xs text-white/60">Admin Dashboard</p>
                </div>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Uitloggen
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
