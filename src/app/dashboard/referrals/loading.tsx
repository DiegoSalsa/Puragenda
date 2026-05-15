export default function ReferralsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted rounded-lg" />
          <div className="h-4 w-72 bg-muted rounded" />
        </div>
      </div>
      <div className="rounded-xl border border-border p-6 space-y-3">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="h-3 w-56 bg-muted rounded" />
        <div className="flex gap-2 pt-1">
          <div className="h-10 flex-1 bg-muted rounded-lg" />
          <div className="h-10 w-32 bg-muted rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-8 w-10 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 bg-muted rounded" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-4">
            <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="h-6 w-16 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
