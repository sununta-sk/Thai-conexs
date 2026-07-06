import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const { error } = await supabase
    .from('profiles')
    .update({ is_verified: true })
    .eq('id', userId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
