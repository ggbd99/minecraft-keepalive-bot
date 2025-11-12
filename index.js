const mineflayer = require('mineflayer');

// Configuration
const CONFIG = {
  host: 'anyaxd.sdlf.fun',
  port: 25565,
  username: 'KeepAliveBot', // You can change this name
  version: '1.21.10',
  auth: 'offline' // Since your server is in offline mode
};

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

function createBot() {
  console.log(`[${new Date().toLocaleTimeString()}] Creating bot...`);
  
  const bot = mineflayer.createBot(CONFIG);

  bot.on('login', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Bot logged in successfully!`);
    console.log(`[${new Date().toLocaleTimeString()}] Username: ${bot.username}`);
    reconnectAttempts = 0; // Reset reconnect attempts on successful login
  });

  bot.on('spawn', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Bot spawned in the world!`);
    console.log(`[${new Date().toLocaleTimeString()}] Position: ${bot.entity.position}`);
    
    // Optional: Make the bot look around occasionally to seem more active
    setInterval(() => {
      if (bot.entity) {
        const yaw = Math.random() * Math.PI * 2;
        bot.look(yaw, 0, true);
      }
    }, 30000); // Every 30 seconds
  });

  bot.on('chat', (username, message) => {
    console.log(`[${new Date().toLocaleTimeString()}] <${username}> ${message}`);
    
    // Optional: Make bot respond to specific commands
    if (message === '!ping') {
      bot.chat('Pong! Server is alive! 🟢');
    }
  });

  bot.on('kicked', (reason) => {
    console.log(`[${new Date().toLocaleTimeString()}] ✗ Bot was kicked: ${reason}`);
    handleReconnect();
  });

  bot.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] ✗ Error:`, err.message);
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
      handleReconnect();
    }
  });

  bot.on('end', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ✗ Bot disconnected`);
    handleReconnect();
  });

  bot.on('health', () => {
    if (bot.health < 6) {
      console.log(`[${new Date().toLocaleTimeString()}] ⚠ Low health: ${bot.health}`);
    }
  });

  bot.on('death', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ✗ Bot died! Respawning...`);
    bot.chat('I died but I\'m back! 💀');
  });

  return bot;
}

function handleReconnect() {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 Reconnecting in ${RECONNECT_DELAY/1000} seconds... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    setTimeout(() => {
      createBot();
    }, RECONNECT_DELAY);
  } else {
    console.log(`[${new Date().toLocaleTimeString()}] ✗ Max reconnection attempts reached. Resetting counter and trying again in 30 seconds...`);
    reconnectAttempts = 0;
    setTimeout(() => {
      createBot();
    }, 30000);
  }
}

// Start the bot
console.log('='.repeat(50));
console.log('🤖 Minecraft Keep-Alive Bot Starting...');
console.log(`📡 Server: ${CONFIG.host}:${CONFIG.port}`);
console.log(`👤 Username: ${CONFIG.username}`);
console.log('='.repeat(50));

createBot();