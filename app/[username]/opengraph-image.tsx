import { ImageResponse } from 'next/og'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const alt = 'BookShelf profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ username: string }> }

export default async function ProfileOpengraphImage({ params }: Props) {
  const { username } = await params

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, name, profile_visibility')
    .eq('username', username)
    .single()

  let name = 'BookShelf'
  let countLabel = ''
  if (profile && profile.profile_visibility !== 'private') {
    name = profile.name
    const { count } = await supabaseAdmin
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
    const n = count ?? 0
    countLabel = `${n} ${n === 1 ? 'book' : 'books'} shared`
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f0eb',
          fontFamily: 'Georgia, serif',
          padding: '80px',
        }}
      >
        <div style={{ fontSize: 30, color: '#a8a29e', letterSpacing: '0.02em' }}>
          BookShelf
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 88,
            fontWeight: 700,
            color: '#292524',
            textAlign: 'center',
            letterSpacing: '-0.03em',
            maxWidth: 1000,
            lineHeight: 1.1,
          }}
        >
          {`${name}'s BookShelf`}
        </div>
        {countLabel && (
          <div style={{ marginTop: 32, fontSize: 40, color: '#78716c' }}>
            {countLabel}
          </div>
        )}
        <div style={{ marginTop: 48, fontSize: 24, color: '#a8a29e' }}>
          bookshelf.name
        </div>
      </div>
    ),
    { ...size }
  )
}
