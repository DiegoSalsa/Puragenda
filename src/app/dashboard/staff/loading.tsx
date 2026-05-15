export default function StaffLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-24 bg-muted rounded-lg" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-10 w-44 bg-muted rounded-lg" />
      </div>
      <div className="h-12 w-full bg-muted/50 rounded-xl border border-border" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-3 w-36 bg-muted rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-muted rounded-full" />
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-5 w-12 bg-muted rounded-full" />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-muted rounded-lg" />
              <div className="h-8 flex-1 bg-muted rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
