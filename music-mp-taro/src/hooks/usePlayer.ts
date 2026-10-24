import { useSyncExternalStore } from 'react';
import { playerCore } from '../store/player';

export function usePlayer() {
  useSyncExternalStore(
    cb => playerCore.subscribe(cb),
    () => playerCore.version,
    () => playerCore.version,
  );
  return playerCore;
}
