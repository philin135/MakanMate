import React from 'react';
import { MapPin, Star, ExternalLink } from 'lucide-react';
import { GroundingChunk } from '../types';

interface Props {
  chunk: GroundingChunk;
}

const RestaurantCard: React.FC<Props> = ({ chunk }) => {
  if (!chunk.maps) return null;

  const { maps } = chunk;
  const reviewSnippet = maps.placeAnswerSources?.reviewSnippets?.[0]?.content;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-800 leading-tight">
            {maps.title}
          </h3>
          <a 
            href={maps.uri} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-500 hover:text-orange-600 p-1"
          >
            <ExternalLink size={18} />
          </a>
        </div>
        
        {reviewSnippet && (
          <div className="mb-3 bg-orange-50 p-2 rounded-lg text-sm text-gray-600 italic border-l-2 border-orange-300">
            "{reviewSnippet}"
          </div>
        )}

        <div className="flex items-center text-sm text-gray-500">
          <MapPin size={14} className="mr-1 text-gray-400" />
          <span>View on Google Maps</span>
        </div>
      </div>
      <a 
        href={maps.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-orange-500 text-white text-center py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
      >
        Get Directions
      </a>
    </div>
  );
};

export default RestaurantCard;