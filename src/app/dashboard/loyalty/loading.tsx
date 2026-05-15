export default function LoyaltyLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-muted rounded-lg" />
          <div className="h-8 w-40 bg-muted rounded-lg" />
        </div>
        <div className="h-4 w-80 bg-muted rounded" />
      </div>
      <div className="rounded-2xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="space-y-1.5">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
          <div className="h-6 w-12 bg-muted rounded-full" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
        ))}
        <div className="h-10 w-36 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
