import React, { useState, useRef, useEffect } from 'react';
import { Mic, Search, Loader2, MapPin } from 'lucide-react';
import { Coordinates, SearchResult } from '../types';
import { searchRestaurants } from '../services/gemini';
import { blobToBase64 } from '../utils/audio';
import RestaurantCard from './RestaurantCard';
import ReactMarkdown from 'react-markdown';

const FoodFinder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Location error:", error);
          setLocationError("Location access needed for nearby results.");
        }
      );
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Browsers record in webm usually
        const base64 = await blobToBase64(audioBlob);
        handleSearch(base64);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic Error:", err);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSearch = async (audioBase64: string | null = null) => {
    if (!searchQuery && !audioBase64) return;
    
    setIsProcessing(true);
    setResult(null);

    try {
      const prompt = searchQuery || (audioBase64 ? "Find restaurants based on this request." : "Recommend good food nearby.");
      
      const searchResult = await searchRestaurants(prompt, audioBase64, location);
      setResult(searchResult);
    } catch (error) {
      console.error(error);
      alert("Failed to find restaurants. Please try again.");
    } finally {
      setIsProcessing(false);
      setSearchQuery(''); // Clear text input if used
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-4 pb-24 pt-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-stone-800 mb-2">Find Your Makan</h2>
        <p className="text-stone-500">Tap the mic and say what you're craving</p>
        {locationError && (
          <p className="text-xs text-red-500 mt-2 flex justify-center items-center">
             <MapPin size={12} className="mr-1"/> {locationError}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mb-6 scrollbar-hide">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center h-64 text-orange-500">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="text-stone-600 font-medium">Hunting for food spots...</p>
          </div>
        ) : result ? (
          <div className="space-y-6">
            <div className="prose prose-stone prose-p:text-stone-700 max-w-none bg-white p-4 rounded-xl shadow-sm">
              <ReactMarkdown>{result.text}</ReactMarkdown>
            </div>
            
            {result.groundingChunks && result.groundingChunks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.groundingChunks.map((chunk, i) => (
                  <RestaurantCard key={i} chunk={chunk} />
                ))}
              </div>
            )}
            
            {result.groundingChunks && result.groundingChunks.length === 0 && (
              <p className="text-center text-stone-500 italic mt-4">No specific map locations returned.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 opacity-20">
            <Search size={80} className="text-stone-400 mb-4" />
            <p className="text-stone-400 font-bold text-xl">Ready to search</p>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-xl border border-stone-100 sticky bottom-24">
        <div className="flex items-center gap-3">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-4 rounded-full transition-all duration-200 transform active:scale-95 shadow-lg ${
              isRecording 
                ? 'bg-red-500 text-white shadow-red-200 ring-4 ring-red-100' 
                : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-200 hover:shadow-orange-300'
            }`}
          >
            <Mic size={28} className={isRecording ? 'animate-pulse' : ''} />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={isRecording ? "Listening..." : "Or type 'Best Nasi Lemak nearby'..."}
              className="w-full bg-stone-100 border-0 rounded-full py-3.5 px-5 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all outline-none"
              disabled={isRecording}
            />
            <button 
              onClick={() => handleSearch()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-orange-500 transition-colors"
            >
              <Search size={20} />
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-stone-400 mt-2">
          {isRecording ? "Release to search" : "Hold mic to speak"}
        </p>
      </div>
    </div>
  );
};

export default FoodFinder;