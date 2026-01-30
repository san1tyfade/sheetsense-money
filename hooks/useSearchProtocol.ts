import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Unified logic for the expanding "Universal Discovery" search pattern.
 */
export function useSearchProtocol(initialValue: string = '') {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isExpanded]);

  const toggle = useCallback(() => {
      setIsExpanded(prev => !prev);
  }, []);

  const clear = useCallback(() => {
      setSearchTerm('');
      setIsExpanded(false);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    isExpanded,
    setIsExpanded,
    inputRef,
    toggle,
    clear
  };
}