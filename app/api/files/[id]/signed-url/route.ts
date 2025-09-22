import { createClient } from '../../../../../utils/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return Response.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build the file path (assuming id is the full path or just the filename)
    // If id is just filename, construct the full path with user.id
    const path = id.includes('/') ? id : `${user.id}/${id}`

    // Create signed read URL (2 minutes TTL)
    const { data, error } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(path, 120)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!data?.signedUrl) {
      return Response.json({ error: 'Failed to generate signed URL' }, { status: 500 })
    }

    return Response.json({ url: data.signedUrl })

  } catch (error) {
    console.error('Signed URL route error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
