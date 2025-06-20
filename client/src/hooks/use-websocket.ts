import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  projectId?: number;
  comment?: any;
  user?: any;
}

export function useWebSocket(projectId: number | null) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Join the project room
      if (ws.current) {
        ws.current.send(JSON.stringify({
          type: 'join-project',
          projectId
        }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [projectId]);

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  const sendComment = (comment: any) => {
    sendMessage({
      type: 'new-comment',
      projectId: projectId!,
      comment
    });
  };

  const sendTyping = (user: any) => {
    sendMessage({
      type: 'user-typing',
      projectId: projectId!,
      user
    });
  };

  return {
    isConnected,
    lastMessage,
    sendComment,
    sendTyping
  };
}