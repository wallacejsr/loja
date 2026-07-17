import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseAnonKey.length);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error querying promotions table:', error.message);
    } else {
      console.log('Successfully queried promotions table! Data:', data);
    }
  } catch (e: any) {
    console.error('Exception:', e.message);
  }
}

check();
