import React from 'react';

/** Shared primitives. Tailwind classes live here so screens stay readable. */

export const Label: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-2 mb-1">
    {children}
  </label>
);

export const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-1 text-xs leading-snug text-ink-2">{children}</p>
);

export const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }> = ({
  invalid, className = '', ...rest
}) => (
  <input
    {...rest}
    className={`w-full min-w-0 min-h-[38px] rounded-lg border px-2.5 py-2 text-[13px] bg-white text-ink
      focus-visible:outline-2 focus-visible:outline-green placeholder:italic placeholder:text-ink-3
      ${invalid ? 'border-red bg-red-soft' : 'border-line-2'} ${className}`}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', ...rest }) => (
  <select
    {...rest}
    className={`w-full min-w-0 min-h-[38px] rounded-lg border border-line-2 px-2.5 py-2 text-[13px]
      bg-white text-ink focus-visible:outline-2 focus-visible:outline-green ${className}`}
  />
);

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'quiet' | 'outline' | 'danger';
};

export const Button: React.FC<BtnProps> = ({ variant = 'default', className = '', ...rest }) => {
  const base = 'min-h-[38px] rounded-lg px-3 py-2 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-green';
  const styles: Record<string, string> = {
    default: 'border border-line-2 bg-white text-ink hover:bg-surface-2',
    primary: 'border border-ink bg-ink text-bg font-semibold hover:bg-black',
    quiet: 'border-0 bg-transparent text-green font-semibold hover:bg-green-soft',
    outline: 'w-full border border-dashed border-line-2 bg-transparent text-green font-semibold',
    danger: 'border-0 bg-transparent text-red font-semibold',
  };
  return <button type="button" {...rest} className={`${base} ${styles[variant]} ${className}`} />;
};

/** Segmented control. `null` is a legitimate value — it means "inherit". */
export function Segmented<T extends string | null>({
  value, options, onChange, ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex overflow-hidden rounded-lg border border-line-2">
      {options.map((o, i) => (
        <button
          key={String(o.value) + i}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 min-h-[34px] px-1 py-1.5 text-[12px] border-0 ${i > 0 ? 'border-l border-line-2' : ''}
            ${value === o.value ? 'bg-ink text-bg font-semibold' : 'bg-white text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Stepper: React.FC<{ value: number; onChange: (n: number) => void; min?: number; label: string }> = ({
  value, onChange, min = 1, label,
}) => (
  <div className="flex items-center gap-1">
    <Button aria-label={`Fewer ${label}`} onClick={() => value > min && onChange(value - 1)}
      className="w-8 min-h-[32px] px-0 text-base font-semibold">−</Button>
    <span className="min-w-[26px] text-center font-bold tabular-nums">{value}</span>
    <Button aria-label={`More ${label}`} onClick={() => onChange(value + 1)}
      className="w-8 min-h-[32px] px-0 text-base font-semibold">+</Button>
  </div>
);

export const Banner: React.FC<{ tone?: 'neutral' | 'warn'; children: React.ReactNode }> = ({
  tone = 'neutral', children,
}) => (
  <div className={`mt-3 rounded-[10px] border px-3 py-2.5 text-xs leading-snug
    ${tone === 'warn' ? 'border-[#E3CFA8] bg-amber-soft text-amber' : 'border-line bg-surface-2 text-ink-2'}`}>
    {children}
  </div>
);

/** Shows what a field inherits, derived from the CURRENT value on every render. */
export const InheritNote: React.FC<{
  overridden: boolean; from: string; inherited: string | number | ''; scope?: string; onReset: () => void;
}> = ({ overridden, from, inherited, scope = 'meal', onReset }) => (
  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-ink-3">
    {overridden ? (
      <>
        <span>set for this {scope}</span>
        <button type="button" onClick={onReset} className="min-h-[24px] border-0 bg-transparent px-1 font-semibold text-green">
          Reset
        </button>
      </>
    ) : (
      <>
        <span className="rounded bg-surface-2 px-1.5 py-px text-[9.5px] font-semibold text-ink-2">inherited</span>
        <span>from {from}{inherited === '' ? '' : ` · ${inherited}`}</span>
      </>
    )}
  </div>
);
