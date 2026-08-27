import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://rpwuxmhzabijhhhcmhzv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM')

async function run() {
  const { data, error } = await supabase.from('lances').select('*').limit(1)
  console.log('Error:', error)
  console.log('Keys:', data ? Object.keys(data[0] || {}) : 'No data')
  console.log('Data:', data)
}
run()
