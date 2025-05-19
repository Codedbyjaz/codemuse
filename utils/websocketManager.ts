/**
 * WebSocket Manager
 * 
 * Provides functionality for managing WebSocket connections
 * and broadcasting updates to connected clients.
 */
import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Change } from '@shared/types';
import { log } from './logger';

/**
 * WebSocket client with additional metadata
 */
interface WebSocketClient extends WebSocket {
  id: string;
  isAlive: boolean;
  lastActivity: number;
  metadata: Record<string, any>;
  ipAddress?: string;
}

/**
 * WebSocket manager class
 */
export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private path: string;
  private pingInterval: NodeJS.Timeout | null = null;
  
  /**
   * Create a new WebSocket manager
   * @param server HTTP server instance
   * @param path WebSocket path
   */
  constructor(server: Server, path: string = '/ws') {
    this.path = path;
    
    // Create WebSocket server
    this.wss = new WebSocketServer({ server, path });
    
    // Set up connection handler
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Set up ping interval
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000); // 30 seconds
    
    log('info', 'websocket', `WebSocket server initialized on path: ${path}`);
  }
  
  /**
   * Handle new WebSocket connection
   * @param ws WebSocket client
   * @param req HTTP request
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = `client_${Date.now()}_${this.generateId(8)}`;
    const client = ws as WebSocketClient;
    
    // Set client properties
    client.id = clientId;
    client.isAlive = true;
    client.lastActivity = Date.now();
    client.metadata = {};
    client.ipAddress = req.socket.remoteAddress;
    
    // Add to clients map
    this.clients.set(clientId, client);
    
    // Log connection
    log('info', 'websocket', `Client connected: ${clientId}`, {
      clientId,
      ip: client.ipAddress,
    });
    
    // Set up message handler
    client.on('message', (message: Buffer) => {
      this.handleMessage(client, message);
    });
    
    // Set up pong handler
    client.on('pong', () => {
      client.isAlive = true;
      client.lastActivity = Date.now();
    });
    
    // Set up close handler
    client.on('close', () => {
      this.clients.delete(clientId);
      log('info', 'websocket', `Client disconnected: ${clientId}`);
    });
    
    // Set up error handler
    client.on('error', (error) => {
      log('error', 'websocket', `WebSocket error for client ${clientId}`, { error });
      this.clients.delete(clientId);
    });
    
    // Send welcome message
    this.sendToClient(client, {
      type: 'CONNECTED',
      data: { clientId }
    });
  }
  
  /**
   * Handle message from WebSocket client
   * @param client WebSocket client
   * @param message Message data
   */
  private handleMessage(client: WebSocketClient, message: Buffer): void {
    try {
      // Update activity timestamp
      client.lastActivity = Date.now();
      
      // Parse message
      const data = JSON.parse(message.toString());
      
      // Handle different message types
      switch (data.type) {
        case 'PING':
          this.sendToClient(client, { type: 'PONG' });
          break;
          
        case 'SUBSCRIBE':
          if (data.channel) {
            client.metadata.subscribedChannels = client.metadata.subscribedChannels || [];
            client.metadata.subscribedChannels.push(data.channel);
            
            this.sendToClient(client, {
              type: 'SUBSCRIBED',
              data: { channel: data.channel }
            });
            
            log('info', 'websocket', `Client ${client.id} subscribed to ${data.channel}`);
          }
          break;
          
        case 'UNSUBSCRIBE':
          if (data.channel && client.metadata.subscribedChannels) {
            client.metadata.subscribedChannels = client.metadata.subscribedChannels.filter(
              (c: string) => c !== data.channel
            );
            
            this.sendToClient(client, {
              type: 'UNSUBSCRIBED',
              data: { channel: data.channel }
            });
            
            log('info', 'websocket', `Client ${client.id} unsubscribed from ${data.channel}`);
          }
          break;
          
        default:
          // Custom message handler could be added here
          break;
      }
    } catch (error) {
      log('error', 'websocket', `Error handling client message`, { 
        error, 
        clientId: client.id 
      });
    }
  }
  
  /**
   * Send message to specific client
   * @param client WebSocket client
   * @param message Message to send
   * @returns Whether the message was sent
   */
  public sendToClient(client: WebSocketClient, message: any): boolean {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      log('error', 'websocket', `Error sending message to client`, { 
        error, 
        clientId: client.id 
      });
      return false;
    }
  }
  
  /**
   * Broadcast message to all connected clients
   * @param message Message to broadcast
   * @param channel Optional channel to broadcast to
   * @returns Number of clients message was sent to
   */
  public broadcast(message: any, channel?: string): number {
    let count = 0;
    
    this.clients.forEach(client => {
      // Skip clients not subscribed to channel if specified
      if (channel && 
          (!client.metadata.subscribedChannels || 
           !client.metadata.subscribedChannels.includes(channel))) {
        return;
      }
      
      // Send message
      if (this.sendToClient(client, message)) {
        count++;
      }
    });
    
    return count;
  }
  
  /**
   * Broadcast changes update to connected clients
   * @param changes Pending changes
   */
  public broadcastChangesUpdate(changes: Change[]): void {
    this.broadcast({
      type: 'CHANGES_UPDATED',
      data: { changes }
    }, 'changes');
  }
  
  /**
   * Broadcast change status update
   * @param changeId Change ID
   * @param status New status
   */
  public broadcastChangeStatus(changeId: number, status: string): void {
    this.broadcast({
      type: 'CHANGE_STATUS',
      data: { changeId, status }
    }, 'changes');
  }
  
  /**
   * Ping all clients to check they're still connected
   */
  private pingClients(): void {
    this.clients.forEach(client => {
      if (!client.isAlive) {
        log('info', 'websocket', `Terminating inactive client: ${client.id}`);
        client.terminate();
        this.clients.delete(client.id);
        return;
      }
      
      client.isAlive = false;
      client.ping();
    });
  }
  
  /**
   * Get number of connected clients
   * @returns Client count
   */
  public getClientCount(): number {
    return this.clients.size;
  }
  
  /**
   * Close all connections and stop the WebSocket server
   */
  public close(): void {
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Close all connections
    this.clients.forEach(client => {
      client.terminate();
    });
    
    this.clients.clear();
    
    // Close server
    this.wss.close();
    
    log('info', 'websocket', 'WebSocket server closed');
  }
  
  /**
   * Generate a random ID
   * @param length ID length
   * @returns Random ID
   */
  private generateId(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
}

// Singleton instance
let websocketManager: WebSocketManager | null = null;

/**
 * Initialize WebSocket manager
 * @param server HTTP server
 * @param path WebSocket path
 * @returns WebSocket manager instance
 */
export function initWebSocketManager(
  server: Server,
  path: string = '/ws'
): WebSocketManager {
  if (!websocketManager) {
    websocketManager = new WebSocketManager(server, path);
  }
  
  return websocketManager;
}

/**
 * Get WebSocket manager instance
 * @returns WebSocket manager instance or null if not initialized
 */
export function getWebSocketManager(): WebSocketManager | null {
  return websocketManager;
}

/**
 * Close WebSocket manager
 */
export function closeWebSocketManager(): void {
  if (websocketManager) {
    websocketManager.close();
    websocketManager = null;
  }
}