import { supabase } from './supabase'

export interface Employee {
  id: string
  name: string
  pin: string
  email: string
  role: 'werknemer' | 'manager'
  status: 'actief' | 'inactief'
  work_zone_id: string | null
  created_at: string
}

export interface WorkZone {
  id: string
  name: string
  address: string
  radius: number
  is_default: boolean
  created_at: string
}

export interface TimeEntry {
  id: string
  employee_id: string
  employee_name: string
  type: 'inklokken' | 'pauze_in' | 'pauze_uit' | 'uitklokken'
  timestamp: string
  note: string
  date: string
  location: 'binnen' | 'buiten'
  reason: string
  created_at: string
}

export interface Admin {
  id: string
  name: string
  email: string
  password: string
  role: 'superadmin' | 'admin'
  created_at: string
}

export interface Company {
  id: string
  name: string
  address: string
  postal_code: string
  city: string
  phone: string
  email: string
  website: string
  kvk: string
  created_at: string
}

export interface EmailSettings {
  id: string
  provider: 'resend' | 'sendgrid'
  api_key: string
  from_email: string
  from_name: string
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  employee_id: string | null
  employee_email: string
  employee_name: string
  email_type: string
  status: 'pending' | 'sent' | 'failed'
  error_message: string | null
  sent_at: string | null
  created_at: string
}

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

export interface Absence {
  id: string
  employee_id: string
  type: 'ziekte' | 'medische_afspraak' | 'vakantie' | 'andere'
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  note: string | null
  status: 'ingediend' | 'goedgekeurd' | 'afgewezen'
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  hours_requested: number
  type: 'vakantie' | 'adv' | 'zorgverlof' | 'andere'
  note: string | null
  status: 'ingediend' | 'goedgekeurd' | 'afgewezen'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

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

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase.from('employees').select('*').order('name')
  if (error) {
    console.error('getEmployees error:', error)
    return []
  }
  return data || []
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const { data, error } = await supabase.from('employees').select('*').eq('id', id).single()
  if (error) {
    console.error('getEmployeeById error:', error)
    return null
  }
  return data
}

export async function addEmployee(employee: Omit<Employee, 'id' | 'created_at'>): Promise<string | null> {
  const { data, error } = await supabase.from('employees').insert(employee).select('id').single()
  if (error) {
    console.error('addEmployee error:', error)
    return null
  }
  return data?.id || null
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<boolean> {
  const { error } = await supabase.from('employees').update(data).eq('id', id)
  if (error) {
    console.error('updateEmployee error:', error)
    return false
  }
  return true
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) {
    console.error('deleteEmployee error:', error)
    return false
  }
  return true
}

export async function findEmployeeByPin(pin: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('pin', pin)
    .eq('status', 'actief')
    .single()
  if (error) {
    console.error('findEmployeeByPin error:', error)
    return null
  }
  return data
}

export async function getWorkZones(): Promise<WorkZone[]> {
  const { data, error } = await supabase.from('work_zones').select('*').order('name')
  if (error) {
    console.error('getWorkZones error:', error)
    return []
  }
  return data || []
}

export async function getWorkZoneById(id: string): Promise<WorkZone | null> {
  const { data, error } = await supabase.from('work_zones').select('*').eq('id', id).single()
  if (error) {
    console.error('getWorkZoneById error:', error)
    return null
  }
  return data
}

export async function addWorkZone(zone: Omit<WorkZone, 'id' | 'created_at'>): Promise<string | null> {
  const { data, error } = await supabase.from('work_zones').insert(zone).select('id').single()
  if (error) {
    console.error('addWorkZone error:', error)
    return null
  }
  return data?.id || null
}

export async function updateWorkZone(id: string, data: Partial<WorkZone>): Promise<boolean> {
  const { error } = await supabase.from('work_zones').update(data).eq('id', id)
  if (error) {
    console.error('updateWorkZone error:', error)
    return false
  }
  return true
}

export async function deleteWorkZone(id: string): Promise<boolean> {
  const { error } = await supabase.from('work_zones').delete().eq('id', id)
  if (error) {
    console.error('deleteWorkZone error:', error)
    return false
  }
  return true
}

export async function setDefaultWorkZone(id: string): Promise<boolean> {
  const { error: resetError } = await supabase.from('work_zones').update({ is_default: false }).neq('id', 'dummy')
  if (resetError) {
    console.error('setDefaultWorkZone reset error:', resetError)
  }
  const { error } = await supabase.from('work_zones').update({ is_default: true }).eq('id', id)
  if (error) {
    console.error('setDefaultWorkZone error:', error)
    return false
  }
  return true
}

export async function getTimeEntries(): Promise<TimeEntry[]> {
  const { data, error } = await supabase.from('time_entries').select('*').order('timestamp', { ascending: false })
  if (error) {
    console.error('getTimeEntries error:', error)
    return []
  }
  return data || []
}

export async function getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .order('timestamp', { ascending: false })
  if (error) {
    console.error('getTimeEntriesByEmployee error:', error)
    return []
  }
  return data || []
}

export async function getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('date', date)
    .order('timestamp', { ascending: false })
  if (error) {
    console.error('getTimeEntriesByDate error:', error)
    return []
  }
  return data || []
}

export async function getTimeEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('timestamp', { ascending: false })
  if (error) {
    console.error('getTimeEntriesByDateRange error:', error)
    return []
  }
  return data || []
}

export async function addTimeEntry(entry: Omit<TimeEntry, 'id' | 'created_at'>): Promise<string | null> {
  const { data, error } = await supabase.from('time_entries').insert(entry).select('id').single()
  if (error) {
    console.error('addTimeEntry error:', error)
    return null
  }
  return data?.id || null
}

export async function updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<boolean> {
  const { error } = await supabase.from('time_entries').update(data).eq('id', id)
  if (error) {
    console.error('updateTimeEntry error:', error)
    return false
  }
  return true
}

export async function deleteTimeEntry(id: string): Promise<boolean> {
  const { error } = await supabase.from('time_entries').delete().eq('id', id)
  if (error) {
    console.error('deleteTimeEntry error:', error)
    return false
  }
  return true
}

export async function getAdmins(): Promise<Admin[]> {
  const { data, error } = await supabase.from('admins').select('*').order('name')
  if (error) {
    console.error('getAdmins error:', error)
    return []
  }
  return data || []
}

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const { data, error } = await supabase.from('admins').select('*').eq('email', email).single()
  if (error) {
    console.error('getAdminByEmail error:', error)
    return null
  }
  return data
}

export async function addAdmin(admin: Omit<Admin, 'id' | 'created_at'>): Promise<string | null> {
  const { data, error } = await supabase.from('admins').insert(admin).select('id').single()
  if (error) {
    console.error('addAdmin error:', error)
    return null
  }
  return data?.id || null
}

export async function updateAdmin(id: string, data: Partial<Admin>): Promise<boolean> {
  const { error } = await supabase.from('admins').update(data).eq('id', id)
  if (error) {
    console.error('updateAdmin error:', error)
    return false
  }
  return true
}

export async function deleteAdmin(id: string): Promise<boolean> {
  const { error } = await supabase.from('admins').delete().eq('id', id)
  if (error) {
    console.error('deleteAdmin error:', error)
    return false
  }
  return true
}

export async function getCompany(): Promise<Company | null> {
  const { data, error } = await supabase.from('company').select('*').single()
  if (error) {
    console.error('getCompany error:', error)
    return null
  }
  return data
}

export async function updateCompany(companyData: Partial<Company>): Promise<boolean> {
  const { error } = await supabase.from('company').update(companyData).eq('id', 'default')
  if (error) {
    console.error('updateCompany error:', error)
    return false
  }
  return true
}

export async function upsertCompany(companyData: Omit<Company, 'id' | 'created_at'>): Promise<boolean> {
  const { error } = await supabase.from('company').upsert({ id: 'default', ...companyData })
  if (error) {
    console.error('upsertCompany error:', error)
    return false
  }
  return true
}

// ============ EMAIL SETTINGS ============

export async function getEmailSettings(): Promise<EmailSettings | null> {
  const { data, error } = await supabase.from('email_settings').select('*').single()
  if (error) {
    console.error('getEmailSettings error:', error)
    return null
  }
  return data
}

export async function upsertEmailSettings(settings: Omit<EmailSettings, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('email_settings').upsert({
    id: 'default',
    ...settings,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('upsertEmailSettings error:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function sendWelcomeEmail(employeeName: string, employeeEmail: string, pin: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-welcome-v2', {
      body: {
        employee_name: employeeName,
        employee_email: employeeEmail,
        pin,
      },
    })
    if (error) {
      console.error('sendWelcomeEmail error:', error)
      return { success: false, message: error.message || 'E-mail versturen mislukt' }
    }
    return { success: true, message: data?.message || 'Welkomstmail verstuurd' }
  } catch (err: any) {
    console.error('sendWelcomeEmail exception:', err)
    return { success: false, message: err.message || 'E-mail versturen mislukt' }
  }
}

// ============ ABSENCES ============

export async function getAbsences(): Promise<Absence[]> {
  const { data, error } = await supabase.from('absences').select('*').order('start_date', { ascending: false })
  if (error) {
    console.error('getAbsences error:', error)
    return []
  }
  return data || []
}

export async function getAbsencesByEmployee(employeeId: string): Promise<Absence[]> {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false })
  if (error) {
    console.error('getAbsencesByEmployee error:', error)
    return []
  }
  return data || []
}

export async function addAbsence(absence: Omit<Absence, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  const { data, error } = await supabase.from('absences').insert(absence).select('id').single()
  if (error) {
    console.error('addAbsence error:', error)
    return null
  }
  return data?.id || null
}

export async function updateAbsence(id: string, data: Partial<Absence>): Promise<boolean> {
  const { error } = await supabase.from('absences').update(data).eq('id', id)
  if (error) {
    console.error('updateAbsence error:', error)
    return false
  }
  return true
}

export async function deleteAbsence(id: string): Promise<boolean> {
  const { error } = await supabase.from('absences').delete().eq('id', id)
  if (error) {
    console.error('deleteAbsence error:', error)
    return false
  }
  return true
}

// ============ LEAVE REQUESTS ============

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const { data, error } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false })
  if (error) {
    console.error('getLeaveRequests error:', error)
    return []
  }
  return data || []
}

export async function getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getLeaveRequestsByEmployee error:', error)
    return []
  }
  return data || []
}

export async function addLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status' | 'reviewed_by' | 'reviewed_at' | 'created_at' | 'updated_at'>): Promise<string | null> {
  const { data, error } = await supabase.from('leave_requests').insert({
    ...request,
    status: 'ingediend',
    reviewed_by: null,
    reviewed_at: null,
  }).select('id').single()
  if (error) {
    console.error('addLeaveRequest error:', error)
    return null
  }
  return data?.id || null
}

export async function updateLeaveRequest(id: string, data: Partial<LeaveRequest>): Promise<boolean> {
  const { error } = await supabase.from('leave_requests').update(data).eq('id', id)
  if (error) {
    console.error('updateLeaveRequest error:', error)
    return false
  }
  return true
}

export async function deleteLeaveRequest(id: string): Promise<boolean> {
  const { error } = await supabase.from('leave_requests').delete().eq('id', id)
  if (error) {
    console.error('deleteLeaveRequest error:', error)
    return false
  }
  return true
}

export async function getLeaveBalances(): Promise<LeaveBalance[]> {
  const { data, error } = await supabase
    .from('leave_balance')
    .select('*, employees(name)')
    .order('year', { ascending: false })
  if (error) {
    console.error('getLeaveBalances error:', error)
    return []
  }
  return data || []
}

export async function reviewLeaveRequest(
  requestId: string,
  status: 'goedgekeurd' | 'afgewezen',
  adminId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('leave_requests')
    .update({
      status,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
  if (error) {
    console.error('reviewLeaveRequest error:', error)
    return false
  }
  return true
}

export async function upsertLeaveBalance(
  balance: Omit<LeaveBalance, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<boolean> {
  const { error } = await supabase.from('leave_balance').upsert({
    ...balance,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('upsertLeaveBalance error:', error)
    return false
  }
  return true
}

export async function getLeaveBalanceByEmployee(employeeId: string, year?: number): Promise<LeaveBalance | null> {
  const targetYear = year || new Date().getFullYear()
  const { data, error } = await supabase
    .from('leave_balance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', targetYear)
    .single()
  if (error) {
    console.error('getLeaveBalanceByEmployee error:', error)
    return null
  }
  return data
}

// ============ SCHEDULES ============

export async function getSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase.from('schedules').select('*, employees(name)').order('day_of_week')
  if (error) {
    console.error('getSchedules error:', error)
    return []
  }
  return data || []
}

export async function getSchedulesByEmployee(employeeId: string): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('employee_id', employeeId)
    .order('day_of_week')
  if (error) {
    console.error('getSchedulesByEmployee error:', error)
    return []
  }
  return data || []
}

export async function addSchedule(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  const { data, error } = await supabase.from('schedules').insert(schedule).select('id').single()
  if (error) {
    console.error('addSchedule error:', error)
    return null
  }
  return data?.id || null
}

export async function updateSchedule(id: string, data: Partial<Schedule>): Promise<boolean> {
  const { error } = await supabase.from('schedules').update(data).eq('id', id)
  if (error) {
    console.error('updateSchedule error:', error)
    return false
  }
  return true
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) {
    console.error('deleteSchedule error:', error)
    return false
  }
  return true
}
