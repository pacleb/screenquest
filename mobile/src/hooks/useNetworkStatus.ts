import { useState, useEffect, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineQueue } from '../services/offlineQueue';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

let globalStatus: NetworkStatus = { isConnected: true, isInternetReachable: true };
const listeners = new Set<(status: NetworkStatus) => void>();
let unsubscribe: (() => void) | null = null;

function initNetInfo() {
  if (unsubscribe) return;
  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const wasConnected = globalStatus.isConnected;
    globalStatus = {
      isConnected: state.isConnected ?? true,
      isInternetReachable: state.isInternetReachable,
    };
    listeners.forEach((cb) => cb(globalStatus));

    // Flush offline queue on reconnect
    if (!wasConnected && globalStatus.isConnected) {
      offlineQueue.flush().catch(() => {});
    }
  });
}

/** Get current network status without React (for use in services) */
export function getNetworkStatus(): NetworkStatus {
  return globalStatus;
}

/** React hook for network status */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(globalStatus);

  useEffect(() => {
    initNetInfo();
    const handler = (s: NetworkStatus) => setStatus(s);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    isConnected: status.isConnected,
    isInternetReachable: status.isInternetReachable,
  };
}
