export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-36 rounded-md bg-muted" />
        <div className="h-36 rounded-md bg-muted" />
        <div className="h-36 rounded-md bg-muted" />
      </div>
      <div className="h-64 rounded-md bg-muted" />
    </div>
  );
}
