import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, MapPin, CalendarCheck, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { getEmployees, getWorkZones, getTimeEntries } from '@/lib/db';

export function AdminDashboard() {
  const employees = getEmployees();
  const workZones = getWorkZones();
  const entries = getTimeEntries();

  const today = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => e.date === today);
  const uniqueClockedIn = new Set(todayEntries.filter(e => e.type === 'clockIn').map(e => e.employeeId)).size;

  const stats = useMemo(() => [
    { title: 'Werknemers', value: employees.filter(e => e.active).length, icon: Users, color: 'bg-primary' },
    { title: 'Werkzones', value: workZones.length, icon: MapPin, color: 'bg-teal' },
    { title: 'Ingeklokt vandaag', value: uniqueClockedIn, icon: CalendarCheck, color: 'bg-emerald-500' },
    { title: 'Registraties vandaag', value: todayEntries.length, icon: Clock, color: 'bg-accent' },
  ], [employees, workZones, uniqueClockedIn, todayEntries.length]);

  const recentActivity = useMemo(() => {
    return [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20);
  }, [entries]);

  const typeLabels: Record<string, { label: string; color: string }> = {
    clockIn: { label: 'Ingeklokt', color: 'text-emerald-600 bg-emerald-50' },
    clockOut: { label: 'Uitgeklokt', color: 'text-rose-600 bg-rose-50' },
    breakIn: { label: 'Pauze', color: 'text-accent bg-accent/10' },
    breakOut: { label: 'Pauze uit', color: 'text-teal bg-teal/10' },
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overzicht van uw tijdregistratiesysteem</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <StatCard key={stat.title} {...stat} delay={i * 0.1} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-gray-900">Weekoverzicht</h2>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dStr = d.toISOString().split('T')[0];
            const dayEntries = entries.filter(e => e.date === dStr);
            const dayClocks = dayEntries.filter(e => e.type === 'clockIn').length;
            const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
            const isToday = i === 6;
            return (
              <div key={i} className={`text-center p-3 rounded-xl ${isToday ? 'bg-primary/5 border border-primary/20' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500 mb-1">{dayNames[d.getDay()]}</p>
                <p className="text-lg font-bold text-gray-900">{dayClocks}</p>
                <p className="text-xs text-gray-400">registraties</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recente activiteit</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>Geen recente activiteit</p>
            </div>
          ) : (
            recentActivity.map((entry, idx) => {
              const cfg = typeLabels[entry.type] || typeLabels.clockIn;
              return (
                <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${cfg.color}`}>{cfg.label}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{entry.employeeName}</p>
                    <p className="text-xs text-gray-500">{entry.workZoneName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{entry.time}</p>
                    <p className="text-xs text-gray-500">{entry.date}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
