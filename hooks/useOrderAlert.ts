import { useEffect, useRef, useState } from 'react';
import { Order } from '@/types';

export function useOrderAlert(orders: Order[]) {
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

  useEffect(() => {
    const undealtOrders = orders.filter(order => order.status === 'undealt');
    const hasUndealtOrders = undealtOrders.length > 0;

    if (hasUndealtOrders && !isAlertActive && !isDismissed.current) {
      setIsAlertActive(true);
      playAlert();
    } else if (!hasUndealtOrders) {
      // Always stop alert when no undealt orders
      isDismissed.current = false; // Reset dismiss flag
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

      // Log when audio is loaded
      audioRef.current.addEventListener('loadeddata', () => {
        console.log('Alert audio loaded successfully');
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio load error:', e);
        setPlaybackError('Failed to load audio file');
      });
    }

    audioRef.current.play().catch(err => {
      console.error('Failed to play alert:', err);
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

  return { isAlertActive, dismissAlert, playbackError };
}
