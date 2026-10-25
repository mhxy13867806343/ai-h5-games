import { useSyncExternalStore } from 'react';
import { playerCore } from '../store/player';

/** 订阅全局播放器的 React Hook */
export function usePlayer() {
  useSyncExternalStore(
    cb => playerCore.subscribe(cb),
    () => playerCore.version,
    () => playerCore.version,
  );
  return playerCore;
}
