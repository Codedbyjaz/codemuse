import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Configuration from "@/pages/Configuration";
import Logs from "@/pages/Logs";
import Agents from "@/pages/Agents";
import Locks from "@/pages/Locks";
import Statistics from "@/pages/Statistics";
import ChangeHistory from "@/pages/ChangeHistory";
import AgentPerformance from "@/pages/AgentPerformance";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";

// WebSocket connection setup with security enhancements
function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000; // 3 seconds

  useEffect(() => {
    let reconnectTimer: number | null = null;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted || connectionAttempts >= MAX_RECONNECT_ATTEMPTS) return;

      // Secure WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      // Add timeout for connection
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          handleReconnect();
        }
      }, 10000); // 10 second timeout

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("WebSocket connected");
        setConnectionAttempts(0);
        
        // Send authentication if needed
        // (This would use a token from your auth system)
        // ws.send(JSON.stringify({ type: 'AUTH', token: authToken }));
        
        // Subscribe to relevant channels
        ws.send(JSON.stringify({ 
          type: 'SUBSCRIBE', 
          channel: 'changes' 
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Validate message format before processing
          if (!message.type) {
            console.warn("Invalid message format received");
            return;
          }
          
          switch (message.type) {
            case "CHANGES_UPDATED":
              // Invalidate cache for changes
              queryClient.invalidateQueries({ queryKey: ['/api/changes'] });
              break;
              
            case "CHANGE_STATUS":
              if (message.data && message.data.changeId) {
                // Invalidate specific change and general changes list
                queryClient.invalidateQueries({ queryKey: ['/api/changes', message.data.changeId] });
                queryClient.invalidateQueries({ queryKey: ['/api/changes'] });
                
                // Also invalidate stats data when changes occur
                queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
                queryClient.invalidateQueries({ queryKey: ['/api/agents/stats'] });
              }
              break;
              
            case "PONG":
              // Handle pong response (keep-alive)
              break;
              
            default:
              console.log("Unhandled message type:", message.type);
          }
        } catch (error) {
          console.error("WebSocket message parsing error:", error);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error("WebSocket error:", error);
        handleReconnect();
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        
        // Only attempt to reconnect on abnormal closure
        if (event.code !== 1000 && event.code !== 1001) {
          handleReconnect();
        }
      };

      setSocket(ws);
      
      // Set up ping interval to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 30000); // 30 seconds
      
      return () => {
        clearInterval(pingInterval);
        clearTimeout(connectionTimeout);
        ws.close();
      };
    };

    const handleReconnect = () => {
      if (isUnmounted) return;
      
      setConnectionAttempts(prev => prev + 1);
      if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log(`Attempting to reconnect (${connectionAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
        reconnectTimer = window.setTimeout(connectWebSocket, RECONNECT_INTERVAL);
      } else {
        console.error("Max reconnection attempts reached. Please refresh the page.");
      }
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [connectionAttempts]);

  return socket;
}

function Router() {
  // Initialize WebSocket
  useWebSocket();

  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/configuration" component={Configuration} />
        <Route path="/logs" component={Logs} />
        <Route path="/agents" component={Agents} />
        <Route path="/agents/performance" component={AgentPerformance} />
        <Route path="/locks" component={Locks} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/changes/history" component={ChangeHistory} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
