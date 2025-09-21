// Temporary test file to check environment variables
require('dotenv').config({ path: '.env.local' });

console.log('=== Environment Variables Test ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');

// Check Supabase client creation
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  console.log('Supabase Client:', supabase ? '✅ Created successfully' : '❌ Failed to create');
} catch (error) {
  console.log('Supabase Client Error:', error.message);
}
