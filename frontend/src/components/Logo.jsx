import { Link } from 'react-router-dom'

export default function Logo({ light = false }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-display text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-brand-700'}`}>
      <img src="/favicon.svg" alt="" className="size-8" />
      CHAMALÁ<span className="text-sun-500">FREE</span>
    </Link>
  )
}
