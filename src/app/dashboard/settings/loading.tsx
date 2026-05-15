export default function SettingsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted rounded" />
      </div>

      {/* Widget URL card */}
      <div className="rounded-2xl border border-border p-6 space-y-4">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 bg-muted rounded-lg" />
          <div className="h-10 w-24 bg-muted rounded-lg" />
        </div>
        <div className="h-10 w-full bg-muted rounded-lg" />
        <div className="h-10 w-36 bg-muted rounded-lg" />
      </div>

      {/* Business name */}
      <div className="rounded-2xl border border-border p-6 space-y-4">
        <div className="h-5 w-44 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 bg-muted rounded-lg" />
          <div className="h-10 w-20 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Business hours */}
      <div className="rounded-2xl border border-border p-6 space-y-4">
        <div className="h-5 w-36 bg-muted rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-10 bg-muted rounded shrink-0" />
            <div className="h-6 w-10 bg-muted rounded-full" />
            <div className="h-9 w-24 bg-muted rounded-lg" />
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-9 w-24 bg-muted rounded-lg" />
          </div>
        ))}
      </div>

      {/* Logo + MercadoPago side by side */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-6 space-y-4">
          <div className="h-5 w-28 bg-muted rounded" />
          <div className="h-28 w-full bg-muted rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border p-6 space-y-4">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-16 w-full bg-muted rounded-xl" />
          <div className="h-10 w-full bg-muted rounded-lg" />
        </div>
      </div>

      {/* Plan */}
      <div className="rounded-2xl border border-border p-6 space-y-4">
        <div className="h-5 w-24 bg-muted rounded" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
          <div className="h-10 w-36 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}
