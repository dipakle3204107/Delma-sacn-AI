import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zqpdhtwpuumdihbwvkfa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3dY7ldqIAIC2xrcoVZJfow_vMhm6gAk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);