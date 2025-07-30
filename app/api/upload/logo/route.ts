import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { uploadLogoAndGetPublicUrl } from '@/lib/storage'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload PNG, JPG, or SVG' }, { status: 400 })
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size should be less than 2MB' }, { status: 400 })
    }

    // Upload logo and get public URL
    const { key, publicUrl } = await uploadLogoAndGetPublicUrl(user.id, file)

    // Update business record with new logo URL
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ 
        logo_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      logger.error('Error updating business with logo URL', { error: updateError, userId: user.id })
      // Don't fail the request if this fails, just log it
    }

    return NextResponse.json({ 
      success: true, 
      logo_url: publicUrl,
      key: key,
      message: 'Logo uploaded successfully' 
    })

  } catch (error) {
    logger.error('Error uploading logo', { error })
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}