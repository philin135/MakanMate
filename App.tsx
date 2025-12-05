import React, { useState } from 'react';
import { Map, MessageSquareText, Utensils } from 'lucide-react';
import FoodFinder from './components/FoodFinder';
import LiveChat from './components/LiveChat';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.FINDER);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-stone-100">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-center relative">
          <div className="flex items-center gap-2 absolute left-4">
            <div className="bg-orange-500 p-1.5 rounded-lg">
              <Utensils size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">MakanMate</span>
          </div>
          
          <nav className="flex p-1 bg-stone-100/50 rounded-full">
            <button
              onClick={() => setMode(AppMode.FINDER)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === AppMode.FINDER
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Map size={16} />
              Find Food
            </button>
            <button
              onClick={() => setMode(AppMode.LIVE_CHAT)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === AppMode.LIVE_CHAT
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <MessageSquareText size={16} />
              Voice Chat
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {mode === AppMode.FINDER ? <FoodFinder /> : <LiveChat />}
      </main>

    </div>
  );
};

export default App;