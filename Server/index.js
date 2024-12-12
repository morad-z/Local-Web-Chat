const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function main() {
  const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
  `);

  const app = express();
  const server = createServer(app);
  const io = new Server(server);

  app.use(express.static(join(__dirname, '../Client')));
  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, '../Client/index.html'));
  });

  io.on('connection', async (socket) => {
    console.log('New client connected:', socket.id);

    // Send all existing messages when a new client connects
    try {
      await db.each(
        'SELECT content, client_offset FROM messages ORDER BY id ASC',
        (_err, row) => {
          socket.emit('chat message', row.content, row.client_offset);
        }
      );
    } catch (e) {
      console.error('Error retrieving messages:', e);
    }

    // Handle chat messages
    socket.on('chat message', async (msg, clientOffset, callback) => {
      let result;
      try {
        // Insert the message into the database
        result = await db.run(
          'INSERT INTO messages (content, client_offset) VALUES (?, ?)',
          msg,
          clientOffset
        );
      } catch (e) {
        if (e.errno === 19 /* SQLITE_CONSTRAINT */) {
          // If the message already exists, call the callback
          if (callback) callback();
          return;
        }
        console.error('Database error:', e);
        return;
      }

      // Emit the message to all clients
      io.emit('chat message', msg, clientOffset);
      if (callback) callback();
    });
  });

  server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
  });
}

main();
