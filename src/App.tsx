import { HangarScene } from './components/canvas/HangarScene';
import { TopHeader } from './components/hud/TopHeader';
import { FleetSidebar } from './components/hud/FleetSidebar';
import { InfoPanel } from './components/hud/InfoPanel';
import { HotspotCard } from './components/hud/HotspotCard';
import { BottomDock } from './components/hud/BottomDock';

export function App() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#060d18]">
      {/* Kanvas 3D Interaktif */}
      <HangarScene />

      {/* Lapisan HUD Militer */}
      <TopHeader />
      <FleetSidebar />
      <InfoPanel />
      <HotspotCard />
      <BottomDock />
    </main>
  );
}

export default App;
