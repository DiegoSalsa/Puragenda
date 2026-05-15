export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-muted rounded-lg" />
          <div className="h-4 w-56 bg-muted rounded" />
        </div>
        <div className="h-10 w-36 bg-muted rounded-lg" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-muted rounded-lg" />
        <div className="h-10 w-32 bg-muted rounded-lg" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-12 bg-muted/50 border-b border-border px-4 flex items-center gap-6">
          {[140, 180, 110, 80, 80].map((w, i) => (
            <div key={i} className="h-3 bg-muted rounded" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
            <div className="h-4 w-24 bg-muted rounded hidden sm:block" />
            <div className="h-4 w-16 bg-muted rounded hidden md:block" />
            <div className="h-6 w-20 bg-muted rounded-full hidden lg:block" />
            <div className="h-8 w-8 bg-muted rounded-lg ml-auto shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
