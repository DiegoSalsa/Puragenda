export default function MarketingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-56 bg-muted rounded-lg" />
        <div className="h-4 w-80 bg-muted rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded-lg" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border p-6 space-y-5">
        <div className="h-5 w-44 bg-muted rounded" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-10 w-full bg-muted rounded-lg" />
          <div className="h-10 w-full bg-muted rounded-lg" />
        </div>
        <div className="h-24 w-full bg-muted rounded-xl" />
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-muted rounded-lg" />
          <div className="h-10 w-28 bg-muted rounded-lg" />
        </div>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-10 bg-muted/50 border-b border-border" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 flex-1 bg-muted rounded" />
            <div className="h-6 w-16 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
