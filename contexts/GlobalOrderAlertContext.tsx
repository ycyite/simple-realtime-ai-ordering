'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Order } from '@/types';

interface GlobalOrderAlertContextType {
  isAlertActive: boolean;
  undealtCount: number;
  dismissAlert: () => void;
  playbackError: string | null;
}

const GlobalOrderAlertContext = createContext<GlobalOrderAlertContextType | undefined>(undefined);

export function GlobalOrderAlertProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userInteracted = useRef(false);
  const isDismissed = useRef(false);

  // Track user interaction for autoplay policy
  useEffect(() => {
    const handleInteraction = () => {
      userInteracted.current = true;
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Poll for orders every 5 seconds
  useEffect(() => {
    const fetchOrders = () => {
      // Only fetch if user has an active restaurant
      const restaurantId = localStorage.getItem('activeRestaurantId');
      if (!restaurantId) return;

      apiFetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          const fetchedOrders = Array.isArray(data) ? data : [];
          setOrders(fetchedOrders);
        })
        .catch(err => {
          console.error('Failed to poll orders:', err);
        });
    };

    // Initial fetch
    fetchOrders();

    // Poll every 5 seconds
    const interval = setInterval(fetchOrders, 5000);

    return () => clearInterval(interval);
  }, []);

  // Monitor orders for alerts
  useEffect(() => {
    const undealtOrders = orders.filter(order => order.status === 'undealt');
    const hasUndealtOrders = undealtOrders.length > 0;

    if (hasUndealtOrders && !isAlertActive && !isDismissed.current) {
      setIsAlertActive(true);
      playAlert();
    } else if (!hasUndealtOrders) {
      isDismissed.current = false;
      if (isAlertActive) {
        setIsAlertActive(false);
      }
      stopAlert();
    }
  }, [orders, isAlertActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAlert = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/alert.mp3');
      audioRef.current.loop = true;

      audioRef.current.addEventListener('loadeddata', () => {
        console.log('Global alert audio loaded successfully');
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('Global audio load error:', e);
        setPlaybackError('Failed to load audio file');
      });
    }

    audioRef.current.play().catch(err => {
      console.error('Failed to play global alert:', err);
      if (err.name === 'NotAllowedError') {
        setPlaybackError('Click anywhere to enable sound alerts');
      } else {
        setPlaybackError(`Audio error: ${err.message}`);
      }
    });
  };

  const stopAlert = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaybackError(null);
  };

  const dismissAlert = () => {
    isDismissed.current = true;
    setIsAlertActive(false);
    stopAlert();
  };

  const undealtCount = orders.filter(order => order.status === 'undealt').length;

  return (
    <GlobalOrderAlertContext.Provider
      value={{
        isAlertActive,
        undealtCount,
        dismissAlert,
        playbackError
      }}
    >
      {children}
    </GlobalOrderAlertContext.Provider>
  );
}

export function useGlobalOrderAlert() {
  const context = useContext(GlobalOrderAlertContext);
  if (context === undefined) {
    throw new Error('useGlobalOrderAlert must be used within a GlobalOrderAlertProvider');
  }
  return context;
}
