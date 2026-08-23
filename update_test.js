const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('lances').update({ whatsapp: '598099553763' }).in('id', ['97c24f15-fcc6-4b72-a8fb-a2ff882474ae']).select();
  console.log("Update Data:", data);
  console.log("Update Error:", error);
}
run();
