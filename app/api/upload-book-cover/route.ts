import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const formData = await request.formData()
  const image = formData.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const buffer = Buffer.from(await image.arrayBuffer())
  const resized = await sharp(buffer).resize({ width: 600, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()

  const filename = `${user.id}/${Date.now()}.jpg`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('book-covers')
    .upload(filename, resized, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('book-covers').getPublicUrl(filename)
  return NextResponse.json({ cover_url: publicUrl })
}
