export default function ScoreBadge({ score }) {
  const tone = score >= 80 ? 'bg-brand-700 text-white' : score >= 65 ? 'bg-sun-400 text-ink' : 'bg-gray-200 text-ink'
  return (
    <div className={`grid size-14 shrink-0 place-items-center rounded-2xl font-display ${tone}`} title="Índice de compatibilidade">
      <span className="text-xl font-extrabold leading-none">{score}<span className="text-xs">%</span></span>
    </div>
  )
}
