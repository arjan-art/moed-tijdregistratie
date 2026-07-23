import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egoxnzbxecinxocnucrn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnb3huemJ4ZWNpbnhvY251Y3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODk1MzksImV4cCI6MjA2ODg2NTUzOX0.h5XufBFNOb5G9kMyXlO8hM7nJKXSmw0E6Urzyog3cJI'

export const supabase = createClient(supabaseUrl, supabaseKey)
