import React from 'react';
import { EVENT_INFO } from '../types';
import { MapPin } from 'lucide-react';

const EventMap: React.FC = () => {
  // Using Google Maps Embed API with the specific location query
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(EVENT_INFO.location + ' ' + EVENT_INFO.address)}&output=embed`;

  return (
    <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden relative border border-slate-600 bg-slate-800/50">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 text-amber-500 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30 flex items-center gap-2 shadow-lg">
        <MapPin size={12} />
        <span>Sede Oficial</span>
      </div>
      <iframe
        title="Event Location"
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: '300px' }}
        loading="lazy"
        allowFullScreen
        src={mapSrc}
        className="filter grayscale hover:grayscale-0 transition-all duration-500"
      ></iframe>
    </div>
  );
};

export default EventMap;