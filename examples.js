/**
 * VoidSync API Usage Examples
 * 
 * This file contains examples of how to use the VoidSync API with both Node.js and browser JavaScript.
 * Run these examples with 'node examples.js' after starting the VoidSync server.
 */

// Node.js example using fetch
async function nodeExample() {
  // Import dependencies
  const fetch = (await import('node-fetch')).default;
  const WebSocket = (await import('ws')).default;
  
  console.log('Running Node.js VoidSync examples...');
  
  const API_URL = 'http://localhost:3000';
  const WS_URL = 'ws://localhost:3000/ws';
  
  // Example 1: Sync a file
  async function syncFile() {
    try {
      const response = await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filePath: 'example/test.txt',
          content: 'Hello, VoidSync! This file was created with Node.js.',
          metadata: {
            author: 'node-client',
            timestamp: new Date().toISOString()
          }
        })
      });
      
      const result = await response.json();
      console.log('Sync result:', result);
      return result;
    } catch (error) {
      console.error('Error syncing file:', error);
    }
  }
  
  // Example 2: Get sync history
  async function getHistory() {
    try {
      const response = await fetch(`${API_URL}/history`);
      const result = await response.json();
      console.log('History entries:', result.data.history.length);
      return result;
    } catch (error) {
      console.error('Error getting history:', error);
    }
  }
  
  // Example 3: Get a specific file
  async function getFile(filePath) {
    try {
      const response = await fetch(`${API_URL}/files/${encodeURIComponent(filePath)}`);
      const result = await response.json();
      console.log('File content:', result.data.content);
      return result;
    } catch (error) {
      console.error('Error getting file:', error);
    }
  }
  
  // Example 4: Connect to WebSocket
  function connectWebSocket() {
    const socket = new WebSocket(WS_URL);
    
    socket.on('open', () => {
      console.log('Connected to WebSocket server');
      
      // Request history
      socket.send(JSON.stringify({ type: 'GET_HISTORY' }));
    });
    
    socket.on('message', (data) => {
      const message = JSON.parse(data);
      console.log('WebSocket message:', message.type);
      
      // Close after receiving history
      if (message.type === 'HISTORY_DATA') {
        socket.close();
      }
    });
    
    socket.on('close', () => {
      console.log('WebSocket connection closed');
    });
    
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    return socket;
  }
  
  // Run the examples
  await syncFile();
  await getHistory();
  await getFile('example/test.txt');
  const socket = connectWebSocket();
  
  // Allow time for WebSocket communication
  await new Promise(resolve => setTimeout(resolve, 3000));
  if (socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
}

// Browser JavaScript example (for reference)
function browserExample() {
  // This code should be copied into a browser console or script tag
  return `
// Browser-side VoidSync API example

// Example 1: Sync a file
async function syncFile() {
  try {
    const response = await fetch('/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filePath: 'example/browser-test.txt',
        content: 'Hello, VoidSync! This file was created from a browser.',
        metadata: {
          author: 'browser-client',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    const result = await response.json();
    console.log('Sync result:', result);
    return result;
  } catch (error) {
    console.error('Error syncing file:', error);
  }
}

// Example 2: Connect to WebSocket
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
  
  const socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log('Connected to WebSocket server');
    
    // Request history
    socket.send(JSON.stringify({ type: 'GET_HISTORY' }));
  };
  
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('WebSocket message:', message.type);
  };
  
  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return socket;
}

// Run examples
syncFile();
connectWebSocket();
  `;
}

// Run the Node.js example if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  nodeExample().catch(console.error);
}