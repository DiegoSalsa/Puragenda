export default function RewardsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-8 w-40 bg-muted rounded-lg" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-6 flex flex-col items-center gap-4">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-24 w-24 bg-muted rounded-full" />
          <div className="h-6 w-24 bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded-lg" />
        </div>
        <div className="rounded-xl border border-border p-6 space-y-4">
          <div className="h-5 w-40 bg-muted rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-8 w-24 bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
