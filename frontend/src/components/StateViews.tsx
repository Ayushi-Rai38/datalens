export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <div className="animate-spin h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full mr-3" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
      {message}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
  );
}
