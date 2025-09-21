'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function TestSupabase() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...')
  const [error, setError] = useState('')

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient()
        
        // Test 1: Check if client is created
        if (!supabase) {
          throw new Error('Supabase client not created')
        }
        
        // Test 2: Try to connect to database
        const { data, error } = await supabase
          .from('auth.users') // This should work even without tables
          .select('count', { count: 'exact', head: true })
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is expected for missing table
          throw error
        }
        
        setConnectionStatus('✅ Connected to Supabase successfully!')
        
      } catch (err: any) {
        console.error('Supabase connection error:', err)
        setError(err.message)
        setConnectionStatus('❌ Connection failed')
      }
    }

    testConnection()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Supabase Connection Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Environment Variables:</h3>
        <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing'}</p>
        <p>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing'}</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Connection Status:</h3>
        <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{connectionStatus}</p>
        {error && (
          <p style={{ color: 'red', backgroundColor: '#ffe6e6', padding: '10px' }}>
            Error: {error}
          </p>
        )}
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <a href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
          ← Back to Home
        </a>
      </div>
    </div>
  )
}
