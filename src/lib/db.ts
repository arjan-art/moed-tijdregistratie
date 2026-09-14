import { supabase } from './supabase'

/* ── TimeEntry ──────────────────────────────────────────── */

export interface TimeEntry {
  id: string
  employee_id: string
  employee_name: string
  type: 'inklokken' | 'uitklokken' | 'pauze_in' | 'pauze_uit'
  timestamp: string
  note: string
  date: string
  location: string
  reason: string
  created_at: string
}

export async function getTimeEntries(): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .order('timestamp', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getTimeEntriesByDate(
  employeeId: string,
  date: string
): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .order('timestamp', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addTimeEntry(
  entry: Omit<TimeEntry, 'id' | 'created_at'>
): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('time_entries')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data
}

/* ── Employee ───────────────────────────────────────────── */

export interface Employee {
  id: string
  name: string
  pin: string
  email: string
  role: 'manager' | 'werknemer'
  status: 'actief' | 'inactief'
  work_zone_id: string | null
  created_at: string
}

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function addEmployee(
  employee: Omit<Employee, 'id' | 'created_at'>
): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmployee(
  id: string,
  updates: Partial<Employee>
): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
}

export async function findEmployeeByPin(pin: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('pin', pin)
    .eq('status', 'actief')
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

/* ── WorkZone ───────────────────────────────────────────── */

export interface WorkZone {
  id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  radius: number
  is_default: boolean
  created_at: string
}

export async function getWorkZones(): Promise<WorkZone[]> {
  const { data, error } = await supabase
    .from('work_zones')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function getWorkZoneById(id: string): Promise<WorkZone | null> {
  const { data, error } = await supabase
    .from('work_zones')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function addWorkZone(
  zone: Omit<WorkZone, 'id' | 'created_at'>
): Promise<WorkZone> {
  const { data, error } = await supabase
    .from('work_zones')
    .insert(zone)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkZone(
  id: string,
  updates: Partial<WorkZone>
): Promise<WorkZone> {
  const { data, error } = await supabase
    .from('work_zones')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkZone(id: string): Promise<void> {
  const { error } = await supabase.from('work_zones').delete().eq('id', id)
  if (error) throw error
}

/* ── Schedule ───────────────────────────────────────────── */

export interface Schedule {
  id: string
  employee_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_recurring: boolean
  specific_date: string | null
  created_at: string
  updated_at: string
}

export async function getSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('day_of_week')
  if (error) throw error
  return data || []
}

export async function getSchedulesByEmployee(
  employeeId: string
): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('employee_id', employeeId)
    .order('day_of_week')
  if (error) throw error
  return data || []
}

export async function addSchedule(
  schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>
): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .insert(schedule)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSchedule(
  id: string,
  updates: Partial<Schedule>
): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) throw error
}

/* ── Absence ────────────────────────────────────────────── */

export interface Absence {
  id: string
  employee_id: string
  type: 'ziekte' | 'medische_afspraak' | 'vakantie' | 'anders'
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  note: string | null
  status: 'ingediend' | 'goedgekeurd' | 'afgewezen'
  created_at: string
  updated_at: string
}

export async function getAbsences(): Promise<Absence[]> {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .order('start_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAbsencesByEmployee(
  employeeId: string
): Promise<Absence[]> {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addAbsence(
  absence: Omit<Absence, 'id' | 'created_at' | 'updated_at'>
): Promise<Absence> {
  const { data, error } = await supabase
    .from('absences')
    .insert(absence)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAbsence(
  id: string,
  updates: Partial<Absence>
): Promise<Absence> {
  const { data, error } = await supabase
    .from('absences')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAbsence(id: string): Promise<void> {
  const { error } = await supabase.from('absences').delete().eq('id', id)
  if (error) throw error
}

/* ── LeaveRequest ───────────────────────────────────────── */

export interface LeaveRequest {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  hours_requested: number
  type: 'vakantie' | 'persoonlijk' | 'ziekte' | 'anders'
  note: string | null
  status: 'ingediend' | 'goedgekeurd' | 'afgewezen'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getLeaveRequestsByEmployee(
  employeeId: string
): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addLeaveRequest(
  request: Omit<LeaveRequest, 'id' | 'status' | 'reviewed_by' | 'reviewed_at' | 'created_at' | 'updated_at'>
): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({ ...request, status: 'ingediend' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLeaveRequest(
  id: string,
  updates: Partial<LeaveRequest>
): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  const { error } = await supabase.from('leave_requests').delete().eq('id', id)
  if (error) throw error
}

export async function reviewLeaveRequest(
  id: string,
  status: 'goedgekeurd' | 'afgewezen',
  reviewedBy: string
): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/* ── LeaveBalance ───────────────────────────────────────── */

export interface LeaveBalance {
  id: string
  employee_id: string
  year: number
  total_hours: number
  used_hours: number
  pending_hours: number
  created_at: string
  updated_at: string
}

export async function getLeaveBalances(): Promise<LeaveBalance[]> {
  const { data, error } = await supabase
    .from('leave_balance')
    .select('*')
    .order('year', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getLeaveBalanceByEmployee(
  employeeId: string,
  year?: number
): Promise<LeaveBalance | null> {
  const currentYear = year || new Date().getFullYear()
  const { data, error } = await supabase
    .from('leave_balance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', currentYear)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertLeaveBalance(
  balance: Omit<LeaveBalance, 'id' | 'created_at' | 'updated_at'>
): Promise<LeaveBalance> {
  const { data, error } = await supabase
    .from('leave_balance')
    .upsert(balance, { onConflict: 'employee_id,year' })
    .select()
    .single()
  if (error) throw error
  return data
}