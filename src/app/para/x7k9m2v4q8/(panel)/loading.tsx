export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-9 w-64 bg-black/10 border-2 border-black/20" />
        <div className="mt-2 h-4 w-40 bg-black/5 border-2 border-black/10" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-4 border-black/20 bg-black/5 p-4 shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
            <div className="h-3 w-16 bg-black/10 mb-3" />
            <div className="h-8 w-12 bg-black/10" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="border-4 border-black/20 bg-white shadow-[6px_6px_0_rgba(0,0,0,0.08)]">
        <div className="border-b-4 border-black/20 bg-black/5 px-6 py-4 flex gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 bg-black/10" style={{ width: `${60 + i * 20}px` }} />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border-b-2 border-black/5 px-6 py-4 flex items-center gap-6">
            <div className="h-9 w-9 bg-black/8 border-2 border-black/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 bg-black/10" />
              <div className="h-3 w-24 bg-black/5" />
            </div>
            <div className="h-5 w-16 bg-black/5 border-2 border-black/10" />
            <div className="h-5 w-20 bg-black/5 border-2 border-black/10" />
            <div className="ml-auto h-7 w-20 bg-black/5 border-2 border-black/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
