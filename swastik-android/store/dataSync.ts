// swastik-android/store/dataSync.ts
// Real-time Cross-Module Data Synchronization Bus for Swastik Hospital
// Enables instant data propagation across Doctor, Receptionist, Admin, Billing, and Lab modules.

import { useEffect } from 'react';

type SyncTopic = 'patient' | 'appointment' | 'invoice' | 'user' | 'admission' | 'lab' | 'all';
type SyncCallback = (topic: SyncTopic) => void;

class DataSyncBus {
  private listeners = new Set<SyncCallback>();

  public subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public notify(topic: SyncTopic = 'all'): void {
    this.listeners.forEach((cb) => {
      try {
        cb(topic);
      } catch (err) {
        console.warn('DataSync listener error:', err);
      }
    });
  }
}

export const dataSync = new DataSyncBus();

/**
 * React hook to automatically trigger a reload when any hospital data changes across modules.
 */
export function useDataSync(reloadFn: () => void, topics: SyncTopic[] = ['all']) {
  useEffect(() => {
    const unsubscribe = dataSync.subscribe((topic) => {
      if (topics.includes('all') || topics.includes(topic)) {
        reloadFn();
      }
    });
    return () => unsubscribe();
  }, [reloadFn]);
}
