'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import LoadingSpinner from '@/components/Global/LoadingSpinner/LoadingSpinner';

interface NavigationContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export const useNavigation = (): NavigationContextType => useContext(NavigationContext);

interface NavigationProviderProps {
  children: ReactNode;
}

export default function NavigationProvider({ children }: NavigationProviderProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const pathname = usePathname();

  const startLoading = (): void => setIsLoading(true);
  const stopLoading = (): void => setIsLoading(false);

  // Listen for pathname changes to stop loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Override default link behavior to show loading
  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      const target = (e.target as Element)?.closest('a');
      if (target && target.href && !target.href.startsWith('mailto:') && !target.href.startsWith('tel:') && !target.href.includes('#')) {
        // Check if it's an internal navigation
        const currentOrigin = window.location.origin;
        const linkOrigin = new URL(target.href).origin;
        
        if (currentOrigin === linkOrigin) {
          const currentPath = window.location.pathname;
          const targetPath = new URL(target.href).pathname;
          
          // Only show loading if navigating to a different page
          if (currentPath !== targetPath) {
            setIsLoading(true);
          }
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <NavigationContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      <LoadingSpinner isLoading={isLoading} />
      {children}
    </NavigationContext.Provider>
  );
}