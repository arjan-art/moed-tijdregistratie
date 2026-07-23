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
