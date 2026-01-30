
import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useFinancialStore } from '../context/FinancialContext';

export const MobileSearchFAB: React.FC = () => {
  const { setIsSearchOpen, isSearchOpen } = useFinancialStore();
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      // Use window scroll as it's the most reliable on mobile browsers
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      const delta = currentScrollY - lastScrollY.current;
      
      // show on any significant interaction (scrolling movement > 5px)
      if (Math.abs(delta) > 5) {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;

      // Stationary fade-out: If no scroll events for 2.5s, assume user is reading and hide
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Hide the trigger when the search overlay is already open
  if (isSearchOpen) return null;

  return (
    <button
      onClick={() => setIsSearchOpen(true)}
      className={`md:hidden fixed bottom-24 right-6 z-[60] p-5 bg-blue-600 text-white rounded-full shadow-2xl transition-all duration-500 transform border border-blue-400/30 ${
        isVisible 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-75 translate-y-10 pointer-events-none'
      } active:scale-90 shadow-blue-500/40 flex items-center justify-center`}
      aria-label="Universal Discovery"
    >
      <Search size={28} strokeWidth={3} />
      <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20 pointer-events-none" />
    </button>
  );
};
