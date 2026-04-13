import ChatOverlay from '@/components/chat/ChatOverlay';

import GameLoader from './GameLoader';

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <GameLoader />
      <ChatOverlay />
    </main>
  );
}
