// ─── Types ──────────────────────────────────────────────────────────────────
export interface Employee {
  id: string;
  name: string;
  pin: string;
  email: string;
  phone?: string;
  workZoneId: string;
  active: boolean;
  createdAt: string;
}

export interface WorkZone {
  id: string;
  name: string;
  address: string;
  radius: number;
  isDefault: boolean;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'super' | 'admin';
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'clockIn' | 'clockOut' | 'breakIn' | 'breakOut';
  timestamp: string;
  date: string;
  time: string;
  workZoneId?: string;
  workZoneName?: string;
  notes?: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  hours?: number;
}

export interface Company {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  kvk: string;
  btw: string;
  logoUrl?: string;
}

// ─── Storage Keys ───────────────────────────────────────────────────────────
const KEYS = {
  employees: 'moed_employees',
  workZones: 'moed_workZones',
  admins: 'moed_admins',
  timeEntries: 'moed_timeEntries',
  company: 'moed_company',
  session: 'moed_admin_session',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}
function timeStr(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

// ─── Seed Data ──────────────────────────────────────────────────────────────
export function seedData(): void {
  const admins = getItem<Admin[]>(KEYS.admins, []);
  const hasDefault = admins.some(a => a.email === 'admin@moed.nl');
  if (!hasDefault) {
    admins.push({
      id: uid(),
      name: 'Systeembeheerder',
      email: 'admin@moed.nl',
      password: 'admin123',
      role: 'super',
      createdAt: new Date().toISOString(),
    });
    setItem(KEYS.admins, admins);
  }

  const zones = getItem<WorkZone[]>(KEYS.workZones, []);
  if (zones.length === 0) {
    const defaultZones: WorkZone[] = [
      {
        id: uid(), name: 'Hoofdkantoor Rotterdam',
        address: 'Weena 100, 3012 CK Rotterdam',
        radius: 200, isDefault: true,
        lat: 51.9225, lng: 4.47917,
        createdAt: new Date().toISOString(),
      },
      {
        id: uid(), name: 'Werkplaats Delft',
        address: 'Mekelweg 4, 2628 CD Delft',
        radius: 150, isDefault: false,
        lat: 51.9988, lng: 4.3734,
        createdAt: new Date().toISOString(),
      },
      {
        id: uid(), name: 'Kantoor Amsterdam',
        address: 'Zuidas 1, 1082 MS Amsterdam',
        radius: 200, isDefault: false,
        lat: 52.3377, lng: 4.8718,
        createdAt: new Date().toISOString(),
      },
    ];
    setItem(KEYS.workZones, defaultZones);
  }

  const employees = getItem<Employee[]>(KEYS.employees, []);
  if (employees.length === 0) {
    const defaultZones = getItem<WorkZone[]>(KEYS.workZones, []);
    const defaultZoneId = defaultZones[0]?.id || '';
    const defaultEmployees: Employee[] = [
      { id: uid(), name: 'Jan de Vries', pin: '1234', email: 'jan@moed.nl', phone: '0612345678', workZoneId: defaultZoneId, active: true, createdAt: new Date().toISOString() },
      { id: uid(), name: 'Maria Jansen', pin: '2345', email: 'maria@moed.nl', phone: '0623456789', workZoneId: defaultZoneId, active: true, createdAt: new Date().toISOString() },
      { id: uid(), name: 'Pieter Bakker', pin: '3456', email: 'pieter@moed.nl', phone: '0634567890', workZoneId: defaultZoneId, active: true, createdAt: new Date().toISOString() },
      { id: uid(), name: 'Sanne van Dijk', pin: '4567', email: 'sanne@moed.nl', phone: '0645678901', workZoneId: defaultZoneId, active: false, createdAt: new Date().toISOString() },
    ];
    setItem(KEYS.employees, defaultEmployees);
  }

  const company = getItem<Company | null>(KEYS.company, null);
  if (!company) {
    setItem<Company>(KEYS.company, {
      name: 'Viento Circulair BV',
      address: 'Weena 100',
      city: 'Rotterdam',
      postalCode: '3012 CK',
      country: 'Nederland',
      phone: '+31 10 123 4567',
      email: 'info@moed.nl',
      kvk: '12345678',
      btw: 'NL123456789B01',
      logoUrl: '/moed-logo.png',
    });
  }

  const entries = getItem<TimeEntry[]>(KEYS.timeEntries, []);
  if (entries.length === 0) {
    const employees = getItem<Employee[]>(KEYS.employees, []);
    const zones = getItem<WorkZone[]>(KEYS.workZones, []);
    const zoneId = zones[0]?.id || '';
    const zoneName = zones[0]?.name || '';
    const sampleEntries: TimeEntry[] = [];

    employees.forEach(emp => {
      const yd = new Date();
      yd.setDate(yd.getDate() - 1);
      const ydStr = yd.toISOString().split('T')[0];

      sampleEntries.push({
        id: uid(), employeeId: emp.id, employeeName: emp.name,
        type: 'clockIn', timestamp: `${ydStr}T08:00:00`,
        date: ydStr, time: '08:00', workZoneId: zoneId, workZoneName: zoneName,
        approved: true, hours: 8,
      });
      sampleEntries.push({
        id: uid(), employeeId: emp.id, employeeName: emp.name,
        type: 'breakIn', timestamp: `${ydStr}T12:00:00`,
        date: ydStr, time: '12:00', workZoneId: zoneId, workZoneName: zoneName,
        approved: true,
      });
      sampleEntries.push({
        id: uid(), employeeId: emp.id, employeeName: emp.name,
        type: 'breakOut', timestamp: `${ydStr}T12:30:00`,
        date: ydStr, time: '12:30', workZoneId: zoneId, workZoneName: zoneName,
        approved: true,
      });
      sampleEntries.push({
        id: uid(), employeeId: emp.id, employeeName: emp.name,
        type: 'clockOut', timestamp: `${ydStr}T17:00:00`,
        date: ydStr, time: '17:00', workZoneId: zoneId, workZoneName: zoneName,
        approved: true,
      });
    });
    setItem(KEYS.timeEntries, sampleEntries);
  }
}

// ─── CRUD: Employees ────────────────────────────────────────────────────────
export function getEmployees(): Employee[] {
  return getItem<Employee[]>(KEYS.employees, []);
}
export function getEmployeeByPin(pin: string): Employee | undefined {
  return getEmployees().find(e => e.pin === pin && e.active);
}
export function addEmployee(emp: Omit<Employee, 'id' | 'createdAt'>): Employee {
  const employees = getEmployees();
  const newEmp: Employee = { ...emp, id: uid(), createdAt: new Date().toISOString() };
  employees.push(newEmp);
  setItem(KEYS.employees, employees);
  return newEmp;
}
export function updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
  const employees = getEmployees();
  const idx = employees.findIndex(e => e.id === id);
  if (idx === -1) return null;
  employees[idx] = { ...employees[idx], ...updates };
  setItem(KEYS.employees, employees);
  return employees[idx];
}
export function deleteEmployee(id: string): boolean {
  const employees = getEmployees();
  const filtered = employees.filter(e => e.id !== id);
  if (filtered.length === employees.length) return false;
  setItem(KEYS.employees, filtered);
  return true;
}

// ─── CRUD: Work Zones ───────────────────────────────────────────────────────
export function getWorkZones(): WorkZone[] {
  return getItem<WorkZone[]>(KEYS.workZones, []);
}
export function getWorkZoneById(id: string): WorkZone | undefined {
  return getWorkZones().find(z => z.id === id);
}
export function addWorkZone(zone: Omit<WorkZone, 'id' | 'createdAt'>): WorkZone {
  const zones = getWorkZones();
  const newZone: WorkZone = { ...zone, id: uid(), createdAt: new Date().toISOString() };
  zones.push(newZone);
  setItem(KEYS.workZones, zones);
  return newZone;
}
export function updateWorkZone(id: string, updates: Partial<WorkZone>): WorkZone | null {
  const zones = getWorkZones();
  const idx = zones.findIndex(z => z.id === id);
  if (idx === -1) return null;
  zones[idx] = { ...zones[idx], ...updates };
  setItem(KEYS.workZones, zones);
  return zones[idx];
}
export function deleteWorkZone(id: string): boolean {
  const zones = getWorkZones();
  const filtered = zones.filter(z => z.id !== id);
  if (filtered.length === zones.length) return false;
  setItem(KEYS.workZones, filtered);
  return true;
}
export function setDefaultWorkZone(id: string): void {
  const zones = getWorkZones().map(z => ({ ...z, isDefault: z.id === id }));
  setItem(KEYS.workZones, zones);
}

// ─── CRUD: Admins ───────────────────────────────────────────────────────────
export function getAdmins(): Admin[] {
  return getItem<Admin[]>(KEYS.admins, []);
}
export function validateAdmin(email: string, password: string): Admin | null {
  return getAdmins().find(a => a.email === email && a.password === password) || null;
}
export function addAdmin(admin: Omit<Admin, 'id' | 'createdAt'>): Admin {
  const admins = getAdmins();
  const newAdmin: Admin = { ...admin, id: uid(), createdAt: new Date().toISOString() };
  admins.push(newAdmin);
  setItem(KEYS.admins, admins);
  return newAdmin;
}
export function updateAdmin(id: string, updates: Partial<Admin>): Admin | null {
  const admins = getAdmins();
  const idx = admins.findIndex(a => a.id === id);
  if (idx === -1) return null;
  admins[idx] = { ...admins[idx], ...updates };
  setItem(KEYS.admins, admins);
  return admins[idx];
}
export function deleteAdmin(id: string): boolean {
  const admins = getAdmins();
  const filtered = admins.filter(a => a.id !== id);
  if (filtered.length === admins.length) return false;
  setItem(KEYS.admins, filtered);
  return true;
}

// ─── CRUD: Time Entries ─────────────────────────────────────────────────────
export function getTimeEntries(): TimeEntry[] {
  return getItem<TimeEntry[]>(KEYS.timeEntries, []);
}
export function getTodayEntries(employeeId: string): TimeEntry[] {
  const today = todayStr();
  return getTimeEntries().filter(e => e.employeeId === employeeId && e.date === today);
}
export function addTimeEntry(entry: Omit<TimeEntry, 'id'>): TimeEntry {
  const entries = getTimeEntries();
  const newEntry: TimeEntry = { ...entry, id: uid() };
  entries.push(newEntry);
  setItem(KEYS.timeEntries, entries);
  return newEntry;
}
export function updateTimeEntry(id: string, updates: Partial<TimeEntry>): TimeEntry | null {
  const entries = getTimeEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return null;
  entries[idx] = { ...entries[idx], ...updates };
  setItem(KEYS.timeEntries, entries);
  return entries[idx];
}
export function deleteTimeEntry(id: string): boolean {
  const entries = getTimeEntries();
  const filtered = entries.filter(e => e.id !== id);
  if (filtered.length === entries.length) return false;
  setItem(KEYS.timeEntries, filtered);
  return true;
}

// ─── Company ────────────────────────────────────────────────────────────────
export function getCompany(): Company {
  return getItem<Company>(KEYS.company, {
    name: 'Viento Circulair BV',
    address: '', city: '', postalCode: '', country: 'Nederland',
    phone: '', email: '', kvk: '', btw: '',
  });
}
export function updateCompany(company: Company): void {
  setItem(KEYS.company, company);
}

// ─── Session ────────────────────────────────────────────────────────────────
export function getSession(): Admin | null {
  return getItem<Admin | null>(KEYS.session, null);
}
export function setSession(admin: Admin): void {
  setItem(KEYS.session, admin);
}
export function clearSession(): void {
  localStorage.removeItem(KEYS.session);
}

// ─── Reset ──────────────────────────────────────────────────────────────────
export function resetAllData(): void {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  seedData();
}

// ─── Export helpers ─────────────────────────────────────────────────────────
export function exportToCSV(entries: TimeEntry[]): string {
  const headers = ['Datum', 'Medewerker', 'Type', 'Tijd', 'Werkzone', 'Notities', 'Goedgekeurd'];
  const typeMap: Record<string, string> = {
    clockIn: 'Ingeklokt',
    clockOut: 'Uitgeklokt',
    breakIn: 'Pauze gestart',
    breakOut: 'Pauze beëindigd',
  };
  const rows = entries.map(e => [
    e.date, e.employeeName, typeMap[e.type] || e.type,
    e.time, e.workZoneName || '', e.notes || '', e.approved ? 'Ja' : 'Nee',
  ]);
  return [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
}

export { todayStr, timeStr, uid };
