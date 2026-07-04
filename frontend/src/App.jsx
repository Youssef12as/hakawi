import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Landing from './pages/Landing'
import MapInteract from './pages/MapInteract'
import FamilyTree from './pages/FamilyTree'
import AncientMode from './pages/AncientMode'
import Settings from './pages/Settings'

export default function App() {
  return (
    <div className="min-h-screen bg-sand font-cairo">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/map" element={<MapInteract />} />
          <Route path="/ancient/:regionId" element={<AncientMode />} />
          <Route path="/family" element={<FamilyTree />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
