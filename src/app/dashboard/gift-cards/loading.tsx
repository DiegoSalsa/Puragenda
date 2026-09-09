export default function LoadingGiftCards() {
  return <div className="space-y-5 animate-pulse"><div className="h-10 w-60 rounded bg-muted" /><div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-2xl bg-muted" />)}</div><div className="h-96 rounded-2xl bg-muted" /></div>;
}
