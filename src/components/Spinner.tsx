export function Spinner({ label = '読み込み中…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand"
        aria-hidden
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
