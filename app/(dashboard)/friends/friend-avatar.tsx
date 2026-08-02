// Shared avatar for the friends feature. Server-safe (no hooks) so it can be
// used in both server and client components.

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function FriendAvatar({
  name,
  src,
  size = 38,
}: {
  name: string
  src: string | null
  size?: number
}) {
  return (
    <div
      className="shrink-0 rounded-full overflow-hidden bg-[#e8ddd0] flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-medium text-[#7a5c3e]" style={{ fontSize: Math.round(size * 0.38) }}>
          {initials(name)}
        </span>
      )}
    </div>
  )
}
