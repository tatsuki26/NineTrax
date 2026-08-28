export function Spinner({ label = '読み込み中…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-ink-faint">
      <span className="relative flex h-8 w-8" aria-hidden>
        <span className="absolute inset-0 animate-ping rounded-full bg-field/30" />
        <span className="relative h-8 w-8 animate-spin rounded-full border-[3px] border-field/25 border-t-field" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
