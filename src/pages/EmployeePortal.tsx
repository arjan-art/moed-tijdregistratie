import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn, LogOut, Coffee, Play, History, CheckCircle2,
  Clock, MapPin, User, AlertCircle,
} from 'lucide-react';
import {
  getEmployeeByPin, addTimeEntry, getTodayEntries, getWorkZones,
  getWorkZoneById, type Employee, type TimeEntry,
} from '@/lib/db';

type PinState = 'idle' | 'loading' | 'success' | 'error';

export function EmployeePortal() {
  const [pin, setPin] = useState('');
  const [pinState, setPinState] = useState<PinState>('idle');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadToday = useCallback(() => {
    if (employee) {
      setTodayEntries(getTodayEntries(employee.id));
    }
  }, [employee]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const showNotification = (msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotification(msg);
    timerRef.current = setTimeout(() => setNotification(null), 3000);
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        handlePinSubmit(newPin);
      }
    }
  };

  const handlePinSubmit = (enteredPin: string) => {
    setPinState('loading');
    setTimeout(() => {
      const emp = getEmployeeByPin(enteredPin);
      if (emp) {
        setPinState('success');
        setEmployee(emp);
        showNotification(`Welkom, ${emp.name}!`);
        setTimeout(() => setPinState('idle'), 800);
      } else {
        setPinState('error');
        showNotification('Ongeldige PIN code');
        setTimeout(() => {
          setPinState('idle');
          setPin('');
        }, 800);
      }
    }, 300);
  };

  const handleClockAction = (type: 'clockIn' | 'clockOut' | 'breakIn' | 'breakOut') => {
    if (!employee) return;
    const zones = getWorkZones();
    const zone = getWorkZoneById(employee.workZoneId) || zones[0];
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);

    const typeLabels: Record<string, string> = {
      clockIn: 'Ingeklokt',
      clockOut: 'Uitgeklokt',
      breakIn: 'Pauze gestart',
      breakOut: 'Pauze beëindigd',
    };

    addTimeEntry({
      employeeId: employee.id,
      employeeName: employee.name,
      type,
      timestamp: now.toISOString(),
      date,
      time,
      workZoneId: zone?.id,
      workZoneName: zone?.name,
      notes: '',
      approved: false,
    });

    showNotification(`${typeLabels[type]} om ${time}`);
    loadToday();
  };

  const handleLogout = () => {
    setEmployee(null);
    setPin('');
    setTodayEntries([]);
    showNotification('Succesvol uitgelogd');
  };

  const calculateDayHours = () => {
    let totalMs = 0;
    let breakMs = 0;
    let lastClockIn = 0;
    let lastBreakIn = 0;
    let hasClockedIn = false;

    for (const entry of todayEntries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
      const ts = new Date(entry.timestamp).getTime();
      switch (entry.type) {
        case 'clockIn':
          lastClockIn = ts;
          hasClockedIn = true;
          break;
        case 'clockOut':
          if (hasClockedIn) totalMs += ts - lastClockIn;
          break;
        case 'breakIn':
          lastBreakIn = ts;
          break;
        case 'breakOut':
          breakMs += ts - lastBreakIn;
          break;
      }
    }
    return {
      worked: Math.max(0, (totalMs - breakMs) / (1000 * 60 * 60)),
      break: breakMs / (1000 * 60 * 60),
    };
  };

  const dayStats = calculateDayHours();
  const lastEntry = todayEntries[todayEntries.length - 1];

  const getNextAction = (): 'clockIn' | 'clockOut' | 'breakIn' | 'breakOut' => {
    if (!lastEntry) return 'clockIn';
    switch (lastEntry.type) {
      case 'clockIn': return 'clockOut';
      case 'clockOut': return 'clockIn';
      case 'breakIn': return 'breakOut';
      case 'breakOut': return 'clockOut';
      default: return 'clockIn';
    }
  };

  const nextAction = getNextAction();

  const clockButtons = [
    { type: 'clockIn' as const, label: 'In', icon: LogIn, color: 'bg-emerald-500 hover:bg-emerald-600', active: nextAction === 'clockIn' },
    { type: 'clockOut' as const, label: 'Uit', icon: LogOut, color: 'bg-rose-500 hover:bg-rose-600', active: nextAction === 'clockOut' },
    { type: 'breakIn' as const, label: 'Pauze', icon: Coffee, color: 'bg-accent hover:bg-accent-600', active: nextAction === 'breakIn' },
    { type: 'breakOut' as const, label: 'Pauze uit', icon: Play, color: 'bg-teal hover:bg-teal-600', active: nextAction === 'breakOut' },
  ];

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary-800 flex items-center justify-center p-4">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 bg-white text-gray-900 px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2"
            >
              {pinState === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {notification}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <img src="/moed-logo.png" alt="MOED" className="w-20 h-20 mx-auto mb-4 rounded-2xl" />
            <h1 className="text-2xl font-bold text-primary">MOED</h1>
            <p className="text-gray-500 text-sm">Voer je PIN code in</p>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  i < pin.length
                    ? pinState === 'error'
                      ? 'border-rose-500 bg-rose-50'
                      : pinState === 'success'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {i < pin.length ? '●' : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
              <button
                key={digit}
                onClick={() => handlePinDigit(digit.toString())}
                className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-semibold text-gray-800 transition-colors active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={() => setPin(pin.slice(0, -1))}
              className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-600 transition-colors active:scale-95"
            >
              Wis
            </button>
            <button
              onClick={() => handlePinDigit('0')}
              className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-semibold text-gray-800 transition-colors active:scale-95"
            >
              0
            </button>
            <button
              onClick={() => { setPin(''); setPinState('idle'); }}
              className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-600 transition-colors active:scale-95"
            >
              Reset
            </button>
          </div>

          <div className="mt-6 text-center">
            <a href="#/admin/login" className="text-sm text-primary hover:underline">
              Administrator login
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-white text-gray-900 px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-primary text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/moed-logo.png" alt="MOED" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="font-bold text-lg">MOED</h1>
            <p className="text-xs text-white/60">{currentTime.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{employee.name}</h2>
              <p className="text-sm text-gray-500">{employee.email}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-xs text-gray-500">Huidig</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-xs text-emerald-600 font-bold">W</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{dayStats.worked.toFixed(1)}h</p>
            <p className="text-xs text-gray-500">Gewerkt</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <Coffee className="w-5 h-5 text-accent mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{dayStats.break.toFixed(1)}h</p>
            <p className="text-xs text-gray-500">Pauze</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {clockButtons.map(({ type, label, icon: Icon, color, active }) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClockAction(type)}
              disabled={!active}
              className={`${color} ${active ? 'opacity-100' : 'opacity-40 cursor-not-allowed'} text-white rounded-xl p-6 flex flex-col items-center gap-2 transition-all shadow-lg`}
            >
              <Icon className="w-8 h-8" />
              <span className="font-semibold">{label}</span>
            </motion.button>
          ))}
        </div>

        {employee.workZoneId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-teal" />
            <div>
              <p className="text-sm text-gray-500">Huidige werkzone</p>
              <p className="font-medium text-gray-900">{getWorkZoneById(employee.workZoneId)?.name || 'Onbekend'}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Dagoverzicht</h3>
          </div>
          {todayEntries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>Nog geen registraties vandaag</p>
              <p className="text-sm">Klik op "In" om te starten</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayEntries.map((entry, idx) => {
                const typeConfig: Record<string, { label: string; color: string; icon: typeof LogIn }> = {
                  clockIn: { label: 'Ingeklokt', color: 'text-emerald-600 bg-emerald-50', icon: LogIn },
                  clockOut: { label: 'Uitgeklokt', color: 'text-rose-600 bg-rose-50', icon: LogOut },
                  breakIn: { label: 'Pauze', color: 'text-accent bg-accent/10', icon: Coffee },
                  breakOut: { label: 'Pauze einde', color: 'text-teal bg-teal/10', icon: Play },
                };
                const cfg = typeConfig[entry.type] || typeConfig.clockIn;
                const EIcon = cfg.icon;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center`}>
                      <EIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{cfg.label}</p>
                      <p className="text-xs text-gray-500">{entry.workZoneName}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{entry.time}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
