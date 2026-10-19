// Thin green bar showing how many of a list's items have been found.
export default function ProgressBar({ value, total, label, className = 'h-xs' }) {
  const percent = total ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div
      className={`w-full rounded-full bg-grey overflow-hidden ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
    >
      <div className="h-full rounded-full bg-green transition-all duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}
