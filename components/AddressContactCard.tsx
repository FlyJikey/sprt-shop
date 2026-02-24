"use client";

import { useState, useRef, useEffect } from 'react';
import { MapPin, Map, Navigation, Globe } from 'lucide-react';

export default function AddressContactCard({ address }: { address: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const links = [
    { name: "Яндекс Карты", url: `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`, icon: Map },
    { name: "2GIS", url: `https://2gis.ru/search/${encodeURIComponent(address)}`, icon: Navigation },
    { name: "Google Maps", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, icon: Globe }
  ];

  return (
    <div className="relative group" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left block group hover:opacity-70 transition-opacity focus:outline-none"
      >
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200 shadow-sm mb-4 text-gray-900 group-hover:scale-110 transition-transform">
          <MapPin size={20} />
        </div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Адрес</h3>
        <p className="font-bold text-lg text-gray-900 leading-tight">{address}</p>
      </button>

      {isOpen && (
        <div className="absolute z-10 top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
            Построить маршрут
          </div>
          <div className="py-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a 
                  key={link.name} 
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors"
                >
                  <Icon size={16} className="text-gray-400" />
                  <span className="text-sm font-semibold">{link.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
