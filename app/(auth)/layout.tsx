export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-stone-800 tracking-tight">BookShelf</h1>
          <p className="text-stone-500 mt-1 text-sm">Your personal lending library</p>
        </div>
        {children}
      </div>
    </div>
  )
}
