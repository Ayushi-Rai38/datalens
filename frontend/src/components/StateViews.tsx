export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-400 animate-fade-in">
      <div className="relative w-10 h-10 mb-4">
        <div className="absolute inset-0 rounded-full border-t-2 border-brand-500 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-r-2 border-brand-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <span className="text-sm font-medium tracking-wide">{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 backdrop-blur-sm text-red-400 px-5 py-4 text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <h4 className="font-semibold mb-1">Error</h4>
        <p className="opacity-90">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 backdrop-blur-sm py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4 border border-zinc-700/50">
        <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="font-semibold text-zinc-200 text-lg">{title}</p>
      {description && <p className="text-sm text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">{description}</p>}
    </div>
  );
}
