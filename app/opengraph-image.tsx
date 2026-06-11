import { ImageResponse } from 'next/og'

export const alt = 'BookShelf — Your personal library, shared with friends'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
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
        <div
          style={{
            fontSize: 110,
            fontWeight: 700,
            color: '#292524',
            letterSpacing: '-0.03em',
          }}
        >
          BookShelf
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 40,
            color: '#78716c',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.3,
          }}
        >
          Your personal library, shared with friends
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 26,
            color: '#a8a29e',
            letterSpacing: '0.02em',
          }}
        >
          bookshelf.name
        </div>
      </div>
    ),
    { ...size }
  )
}
