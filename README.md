# VoidSync - Simple File Synchronization API

VoidSync is a lightweight file synchronization API designed for easy deployment on Replit. It provides endpoints for syncing files and tracking sync history, with real-time updates via WebSockets.

## 🚀 Quick Start

To run the simplified version on Replit:

1. Run the server:
   ```
   node server.js
   ```

2. Open the web UI by clicking the browser icon in Replit

3. Or use the API directly via:
   ```
   curl -X POST http://localhost:3000/sync \
     -H "Content-Type: application/json" \
     -d '{"filePath":"test.txt","content":"Hello World"}'
   ```

## Features

- ✅ Simple Express-based API
- ✅ WebSocket support for real-time updates
- ✅ File fingerprinting with SHA-256
- ✅ Sync history tracking
- ✅ Easy deployment on Replit

## API Endpoints

### `GET /`

Returns basic API information.

### `POST /sync`

Syncs a file to the server.

**Request body:**

```json
{
  "filePath": "path/to/file.txt",
  "content": "File content here",
  "metadata": {
    "author": "user123",
    "description": "Updated file with new content"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "filePath": "path/to/file.txt",
    "fingerprint": "sha256hash",
    "action": "create|update|nochange"
  }
}
```

### `GET /history`

Returns the sync history.

**Response:**

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "uuid",
        "filePath": "path/to/file.txt",
        "fingerprint": "sha256hash",
        "previousFingerprint": "oldsha256hash",
        "action": "create|update",
        "metadata": { /* custom metadata */ },
        "timestamp": "2025-04-15T12:34:56.789Z"
      }
    ]
  }
}
```

### `GET /files/:filePath`

Returns a specific file.

**Response:**

```json
{
  "success": true,
  "data": {
    "filePath": "path/to/file.txt",
    "content": "File content here",
    "fingerprint": "sha256hash"
  }
}
```

## WebSocket API

Connect to the WebSocket server at `/ws` to receive real-time updates.

### Messages from server

**Initial history:**

```json
{
  "type": "INITIAL_HISTORY",
  "data": { "history": [ /* history entries */ ] }
}
```

**History updated:**

```json
{
  "type": "HISTORY_UPDATED",
  "data": { "entry": { /* new history entry */ } }
}
```

### Messages to server

**Get history:**

```json
{
  "type": "GET_HISTORY"
}
```

## Example Usage

### Sync a file with cURL

```bash
curl -X POST http://localhost:3000/sync \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "example.txt",
    "content": "Hello, VoidSync!",
    "metadata": {
      "author": "user123"
    }
  }'
```

### Sync a file with JavaScript Fetch

```javascript
fetch('http://localhost:3000/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filePath: 'example.txt',
    content: 'Hello, VoidSync!',
    metadata: {
      author: 'user123'
    }
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### Connect to WebSocket with JavaScript

```javascript
const socket = new WebSocket('ws://localhost:3000/ws');

socket.onopen = () => {
  console.log('Connected to WebSocket');
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Request history
socket.send(JSON.stringify({ type: 'GET_HISTORY' }));
```

## Running the Project

1. Make sure you have Node.js installed
2. Run `npm install` to install dependencies
3. Start the server with `node server.js`
4. Access the API at `http://localhost:3000`

## Deployment on Replit

This project is ready to run on Replit without any configuration:

1. Click the "Run" button on Replit
2. The server will start automatically
3. Use the provided Replit URL to access your API

## License

MIT