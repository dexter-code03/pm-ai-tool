import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

type Collaborator = {
  name: string;
  color: string;
  cursor?: { anchor: number; head: number };
};

export function useCollaboration(docId: string | undefined) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!docId) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const wsUrl = import.meta.env.VITE_COLLAB_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/collab`;
    const provider = new WebsocketProvider(wsUrl, `prd-${docId}`, ydoc, {
      connect: true,
      maxBackoffTime: 10000,
    });
    providerRef.current = provider;

    provider.on('status', ({ status }: { status: string }) => {
      setConnected(status === 'connected');
    });

    provider.awareness.on('change', () => {
      const states = provider.awareness.getStates();
      const collabs: Collaborator[] = [];
      states.forEach((state, clientId) => {
        if (clientId === ydoc.clientID) return;
        if (state.user) {
          collabs.push({
            name: state.user.name || 'Anonymous',
            color: state.user.color || '#5B7EF8',
            cursor: state.cursor,
          });
        }
      });
      setCollaborators(collabs);
    });

    const userName = localStorage.getItem('pm_ai_user_name') || 'You';
    const colors = ['#5B7EF8', '#2DD4B7', '#F59E0B', '#EF4444', '#A78BFA'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    provider.awareness.setLocalStateField('user', { name: userName, color });

    return () => {
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
    };
  }, [docId]);

  return useMemo(() => ({
    ydoc: ydocRef.current,
    provider: providerRef.current,
    collaborators,
    connected,
  }), [collaborators, connected]);
}
