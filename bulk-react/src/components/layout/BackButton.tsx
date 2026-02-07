import { useNavigate } from 'react-router-dom'

export function BackButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/')}
      className="fixed top-4 left-4 z-50 px-4 py-2 bg-purple-darker/80 border border-purple-DEFAULT/50 rounded-lg text-white text-sm font-bold backdrop-blur-sm hover:bg-purple-dark/80 hover:border-gold-DEFAULT/50 transition-all cursor-pointer"
    >
      &larr; BACK
    </button>
  )
}
