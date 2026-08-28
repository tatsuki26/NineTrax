'use client';

export function RbiStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
      {[0, 1, 2, 3, 4].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={
            'h-10 w-10 text-sm font-semibold ' +
            (value === n ? 'bg-brand text-white' : 'bg-white text-slate-600 active:bg-slate-100')
          }
        >
          {n}
        </button>
      ))}
    </div>
  );
}
