export default function Spinner({ label, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-20 text-sand-400 ${className}`} role="status">
      <span className="relative grid h-10 w-10 place-items-center">
        <span className="absolute inset-0 rounded-full border-[3px] border-sand-200" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-brand-600" />
      </span>
      {label && <span className="text-sm font-medium">{label}</span>}
      <span className="sr-only">Loading</span>
    </div>
  )
}
