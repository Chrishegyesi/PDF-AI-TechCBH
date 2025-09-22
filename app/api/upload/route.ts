import { createClient } from '@/utils/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()

    if (!name) {
      return Response.json({ error: 'File name is required' }, { status: 400 })
    }

    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build userId-prefixed path
    const path = `${user.id}/${crypto.randomUUID()}-${name}`

    // Create signed upload URL using service role client
    const { data, error } = await supabase.storage
      .from('pdfs')
      .createSignedUploadUrl(path)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ 
      url: data.signedUrl, 
      token: data.token, 
      path 
    })

  } catch (error) {
    console.error('Upload route error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
