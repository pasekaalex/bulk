import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LoadingScreen } from './components/ui/LoadingScreen'

const Landing = lazy(() => import('./pages/Landing'))
const Soon = lazy(() => import('./pages/Soon'))
const BulkClimb = lazy(() => import('./pages/games/BulkClimb'))
const FlappyBulk = lazy(() => import('./pages/games/FlappyBulk'))
const BulkRunner = lazy(() => import('./pages/games/BulkRunner'))
const Bulkagachi = lazy(() => import('./pages/games/Bulkagachi'))
const BulkRampage = lazy(() => import('./pages/games/BulkRampage'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/soon" element={<Soon />} />
          <Route path="/games/climb" element={<BulkClimb />} />
          <Route path="/games/flappy" element={<FlappyBulk />} />
          <Route path="/games/runner" element={<BulkRunner />} />
          <Route path="/games/bulkagachi" element={<Bulkagachi />} />
          <Route path="/games/rampage" element={<BulkRampage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
