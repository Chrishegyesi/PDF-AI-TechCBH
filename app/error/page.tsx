'use client'

import { useSearchParams } from 'next/navigation'

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ color: 'red' }}>Authentication Error</h1>
      
      {message ? (
        <div style={{ 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {decodeURIComponent(message)}
        </div>
      ) : (
        <p>Sorry, something went wrong with authentication.</p>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>Common Issues:</h3>
        <ul>
          <li><strong>Invalid email/password:</strong> Check your credentials</li>
          <li><strong>User not found:</strong> Try signing up first</li>
          <li><strong>Email not confirmed:</strong> Check your email for confirmation link</li>
          <li><strong>Rate limited:</strong> Too many attempts, wait a few minutes</li>
        </ul>
      </div>

      <div style={{ marginTop: '30px' }}>
        <a 
          href="/login" 
          style={{ 
            color: 'white', 
            backgroundColor: 'blue', 
            padding: '10px 20px', 
            textDecoration: 'none', 
            borderRadius: '5px' 
          }}
        >
          ← Back to Login
        </a>
      </div>
    </div>
  )
}
