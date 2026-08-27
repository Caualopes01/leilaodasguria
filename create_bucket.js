import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rpwuxmhzabijhhhcmhzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM'
)

async function run() {
  const { data, error } = await supabase.storage.createBucket('lojas', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
    fileSizeLimit: 5242880 // 5MB
  })
  
  if (error) {
    console.error('Error creating bucket:', error)
  } else {
    console.log('Bucket created successfully:', data)
  }
}

run()
