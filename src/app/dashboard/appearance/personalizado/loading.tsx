export default function AppearanceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted rounded-lg" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        <div className="h-9 w-28 bg-muted rounded-t-lg" />
        <div className="h-9 w-24 bg-muted rounded-t-lg opacity-50" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: form */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="rounded-xl border border-border p-5 space-y-3">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-28 w-full bg-muted rounded-xl" />
          </div>

          {/* Colors */}
          <div className="rounded-xl border border-border p-5 space-y-4">
            <div className="h-4 w-24 bg-muted rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-muted rounded-md border border-border" />
                  <div className="h-9 w-28 bg-muted rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          {/* Font size */}
          <div className="rounded-xl border border-border p-5 space-y-3">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-9 w-full bg-muted rounded-lg" />
          </div>

          <div className="h-10 w-28 bg-muted rounded-lg" />
        </div>

        {/* Right: preview */}
        <div className="rounded-xl border border-border p-5 space-y-4">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-[480px] w-full bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  );
}
