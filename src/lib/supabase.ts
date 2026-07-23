import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egoxnzbxecinxocnucrn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnb3huemJ4ZWNpbnhvY251Y3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTI0MzAsImV4cCI6MjEwMDM2ODQzMH0.Gof8IG4m3L-YsnfC8TnHjnmOrSbw83Zkvozc3lxUuog'

export const supabase = createClient(supabaseUrl, supabaseKey)
