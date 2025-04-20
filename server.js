const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static('public'));

// Game sessions storage
const gameSessions = new Map();

// Function to generate unique game code
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('New client connected');

  // Create a new game session
  socket.on('create_game', () => {
    // Generate a new unique game code
    const gameCode = generateGameCode();
    
    const gameSession = {
      code: gameCode,
      admin: socket.id,
      participants: new Map(),
      startTime: null,
      results: [],
      currentRound: 0,
      isGameActive: false,
      buzzTimer: null,
      createdAt: Date.now()
    };
    
    gameSessions.set(gameCode, gameSession);
    
    // Send the new game code back to the admin
    socket.emit('game_created', gameCode);
  });

  // Join game
  socket.on('join_game', (data) => {
    const { gameCode, username, isAdmin } = data;
    const gameSession = gameSessions.get(gameCode);

    if (gameSession) {
      // Check if username is unique
      const isUsernameTaken = Array.from(gameSession.participants.values())
        .some(participant => participant.username === username);

      if (isUsernameTaken) {
        socket.emit('join_error', 'Username already taken');
        return;
      }

      // Add participant to game session
      gameSession.participants.set(socket.id, {
        id: socket.id,
        username,
        buzzTime: null,
        isAdmin: isAdmin || false
      });

      // Notify admin about new participant
      if (gameSession.admin) {
        io.to(gameSession.admin).emit('participant_joined', {
          username,
          socketId: socket.id,
          totalConnected: gameSession.participants.size
        });
      }

      socket.emit('join_success', { 
        gameCode, 
        participants: Array.from(gameSession.participants.values()).map(p => p.username)
      });
    } else {
      socket.emit('join_error', 'Game session not found');
    }
  });

  // Admin remove user
  socket.on('remove_user', (data) => {
    const { gameCode, socketId } = data;
    const gameSession = gameSessions.get(gameCode);

    if (gameSession && socket.id === gameSession.admin) {
      const removedUser = gameSession.participants.get(socketId);
      
      if (removedUser) {
        // Remove from game session
        gameSession.participants.delete(socketId);
        
        // Notify the removed user
        io.to(socketId).emit('user_removed');
        
        // Notify admin about removal and updated participant count
        io.to(gameSession.admin).emit('participant_left', {
          socketId,
          username: removedUser.username,
          totalConnected: gameSession.participants.size
        });
      }
    }
  });

  // Start buzzer
  socket.on('start_buzzer', (gameCode) => {
    const gameSession = gameSessions.get(gameCode);
    if (gameSession && socket.id === gameSession.admin) {
      // Clear any existing timer
      if (gameSession.buzzTimer) {
        clearTimeout(gameSession.buzzTimer);
      }

      gameSession.isGameActive = true;
      gameSession.startTime = Date.now();
      gameSession.currentRound++;
      gameSession.results = []; // Clear previous results

      // Reset participants' buzz status
      gameSession.participants.forEach((participant) => {
        if (!participant.isAdmin) {
          participant.buzzTime = null;
        }
      });

      // Broadcast to all participants
      gameSession.participants.forEach((participant, participantId) => {
        if (!participant.isAdmin) {
          io.to(participantId).emit('buzzer_started', {
            roundNumber: gameSession.currentRound,
            duration: 15
          });
        }
      });

      // Notify admin
      io.to(gameSession.admin).emit('buzzer_started', {
        roundNumber: gameSession.currentRound,
        duration: 15
      });

      // Start timer to end buzzer
      gameSession.buzzTimer = setTimeout(() => {
        endBuzzer(gameCode);
      }, 15000);
    }
  });

  // Stop buzzer manually
  socket.on('stop_buzzer', (gameCode) => {
    if (gameSessions.get(gameCode)?.admin === socket.id) {
      endBuzzer(gameCode);
    }
  });

  // Participant buzz
  socket.on('buzz', (gameCode) => {
    const gameSession = gameSessions.get(gameCode);
    if (gameSession && gameSession.isGameActive && gameSession.startTime) {
      const participant = gameSession.participants.get(socket.id);
      
      if (participant && !participant.isAdmin && !participant.buzzTime) {
        const buzzTime = Date.now() - gameSession.startTime;
        
        // Ensure buzz is within 15 seconds
        if (buzzTime <= 15000) {
          participant.buzzTime = buzzTime;
          
          gameSession.results.push({
            username: participant.username,
            time: buzzTime
          });

          // Sort results by buzz time
          gameSession.results.sort((a, b) => a.time - b.time);

          // Broadcast results to admin in real-time
          if (gameSession.admin) {
            io.to(gameSession.admin).emit('admin_buzz_results', gameSession.results);
          }

          // Notify the buzzing participant
          io.to(socket.id).emit('buzz_recorded', (buzzTime / 1000).toFixed(3));
        }
      }
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    for (const [gameCode, gameSession] of gameSessions.entries()) {
      if (gameSession.participants.has(socket.id)) {
        const removedUser = gameSession.participants.get(socket.id);
        gameSession.participants.delete(socket.id);
        
        // If admin disconnects, reset admin
        if (socket.id === gameSession.admin) {
          gameSession.admin = null;
        }
        
        // Notify admin about disconnection
        if (gameSession.admin) {
          io.to(gameSession.admin).emit('participant_left', {
            socketId: socket.id,
            username: removedUser.username,
            totalConnected: gameSession.participants.size
          });
        }
      }
    }
  });
});

// Helper function to end buzzer
function endBuzzer(gameCode) {
  const gameSession = gameSessions.get(gameCode);
  if (gameSession) {
    if (gameSession.buzzTimer) {
      clearTimeout(gameSession.buzzTimer);
    }

    gameSession.isGameActive = false;

    // Broadcast to all participants
    gameSession.participants.forEach((participant, participantId) => {
      if (!participant.isAdmin) {
        io.to(participantId).emit('buzzer_ended', {
          results: gameSession.results
        });
      }
    });

    // Notify admin
    if (gameSession.admin) {
      io.to(gameSession.admin).emit('buzzer_ended', {
        results: gameSession.results
      });
    }
  }
}

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  // Get local IP address
  const networkInterfaces = require('os').networkInterfaces();
  let ipAddress;

  // Serve QR Code page
app.get('/qr', (req, res) => {
  const serverUrl = `http://${ipAddress}:${PORT}/user.html`;

  QRCode.toDataURL(serverUrl, (err, url) => {
    if (err) {
      return res.status(500).send('Error generating QR Code');
    }

    res.send(`
      <html>
      <head>
        <title>QR Code</title>
      </head>
      <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
        <h2>Scan to Open User Page</h2>
        <img src="${url}" alt="QR Code">
      </body>
      </html>
    `);
  });
});


  // Find the first IPv4 non-internal address
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        ipAddress = details.address;
      }
    });
  });

  console.log(`Buzzer System running on:`);
  console.log(`- http://localhost:${PORT}`);
  console.log(`- http://${ipAddress}:${PORT}/admin.html`);
  console.log(`- http://${ipAddress}:${PORT}/qr`);
});


const QRCode = require('qrcode');

