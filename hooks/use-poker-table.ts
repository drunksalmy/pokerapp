import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { Action, TableSnapshot } from '@/lib/poker';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * In development the phone cannot reach "localhost" — that is the phone itself.
 * Metro already told us the dev machine's LAN address, so reuse it.
 */
function resolveServerUrl() {
  const override = process.env.EXPO_PUBLIC_SERVER_URL;
  if (override) return override;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3001` : 'http://localhost:3001';
}

// Stable for the life of the app process. Real accounts replace this entirely
// once there is authentication; see the note in server/index.js.
let deviceUserId: string | null = null;
function getDeviceUserId() {
  if (!deviceUserId) deviceUserId = `u-${Math.random().toString(36).slice(2, 10)}`;
  return deviceUserId;
}

interface Options {
  tableId: string;
  name: string;
  userId?: string;
}

export function usePokerTable({ tableId, name, userId }: Options) {
  const [snapshot, setSnapshot] = useState<TableSnapshot | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const me = userId ?? getDeviceUserId();

  useEffect(() => {
    const socket = io(resolveServerUrl(), {
      auth: { userId: me, name },
      transports: ['websocket'],
      reconnectionDelay: 500
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      setError(null);
      socket.emit('table:join', { tableId });
    });
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', err => {
      setStatus('disconnected');
      setError(err.message);
    });
    socket.on('table:state', (next: TableSnapshot) => setSnapshot(next));
    socket.on('table:error', (payload: { message: string }) => setError(payload.message));

    return () => {
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
    };
  }, [tableId, name, me]);

  // Every mutation is a request, never a local state change: the server is the
  // only thing that decides what actually happened.
  const send = useCallback((event: string, payload?: unknown) => {
    return new Promise<void>(resolve => {
      const socket = socketRef.current;
      if (!socket) return resolve();
      socket.emit(event, payload, (res: { ok: boolean; error?: string }) => {
        if (res && res.ok === false) setError(res.error ?? 'Something went wrong');
        resolve();
      });
    });
  }, []);

  const sit = useCallback(
    (seatIndex: number, buyIn: number) => send('table:sit', { seatIndex, buyIn }),
    [send]
  );
  const leave = useCallback(() => send('table:leave'), [send]);
  const sitOut = useCallback((sittingOut: boolean) => send('table:sitOut', { sittingOut }), [send]);
  const act = useCallback(
    (action: Action, amount?: number) => send('hand:action', { action, amount }),
    [send]
  );

  return { snapshot, status, error, clearError: () => setError(null), sit, leave, sitOut, act, userId: me };
}
