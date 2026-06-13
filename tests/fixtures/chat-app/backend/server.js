const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;

app.get('/health', (_req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  socket.on('ping', () => socket.emit('pong'));
});

server.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});
