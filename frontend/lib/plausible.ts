// frontend/lib/plausible.ts
// Utility to track custom events in Plausible

export const trackEvent = (eventName: string, props?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible(eventName, { props });
  } else {
    console.warn('Plausible not initialized, event not tracked:', eventName);
  }
};
