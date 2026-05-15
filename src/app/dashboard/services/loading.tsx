export default function ServicesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="h-8 w-32 bg-muted rounded-lg" />
        <div className="h-10 w-40 bg-muted rounded-lg" />
      </div>
      <div className="h-16 w-full bg-muted/50 rounded-xl border border-border" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-36 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
              <div className="h-6 w-20 bg-muted rounded-full shrink-0" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
            <div className="h-px bg-border" />
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-muted rounded-lg" />
              <div className="h-8 w-8 bg-muted rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
