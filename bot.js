/**
 * A human-like Mineflayer AFK bot designed to keep Minecraft servers alive.
 * -- TELEPORT-TO-BASE EDITION --
 * This bot uses the /tp command to ensure it is always at its home base
 * upon spawning or respawning. It operates in a 100% safe mode,
 * incapable of breaking or placing any blocks.
 *
 * REQUIREMENT: The bot MUST have operator permissions (`/op <botname>`).
 */
const http = require('http');
const port = process.env.PORT || 3000; // Use the PORT Render provides, or 3000 for local testing

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Bot is running.\n');
}).listen(port, '0.0.0.0', () => {
  console.log(`[System] Dummy web server started on port ${port} to keep Render happy.`);
});
// --- 1. IMPORTS ---

const mineflayer = require('mineflayer');
const config = require('./config.json');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const vec3 = require('vec3');

// --- 2. CONSTANTS ---
const RECONNECT_DELAY = 10000;
const RECONNECT_FAIL_DELAY = 300000;
const WATCHDOG_TIMEOUT = 45000;
const SESSION_DURATION = 10800000;

// --- Home Base Configuration ---
const HOME_X = -695;
const HOME_Y = 96;
const HOME_Z = 16;
const WANDER_RADIUS = 8; 

// --- 3. GLOBAL HELPER ---
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// --- 4. MAIN BOT FUNCTION ---
function createAndRunBot() {
  console.log('[System] Attempting to connect to server...');

  let hasSuccessfullySpawned = false, isDisconnecting = false, isSneaking = false, lastChatReply = 0, watchdogTimer = null;

  const bot = mineflayer.createBot({ host: config.serverHost, port: config.serverPort, username: config.botUsername, auth: 'offline', version: config.serverVersion, viewDistance: config.viewDistance || 'normal', checkTimeoutInterval: WATCHDOG_TIMEOUT });
  bot.loadPlugin(pathfinder);

  function resetWatchdog() { if (watchdogTimer) clearTimeout(watchdogTimer); watchdogTimer = setTimeout(forceReconnect, WATCHDOG_TIMEOUT); }
  function forceReconnect() { console.log(`[System] WATCHDOG: No server tick received for ${WATCHDOG_TIMEOUT / 1000}s. Forcing reconnect...`); bot.end('watchdog_timeout'); }
  function handleDisconnect(reason) { if (isDisconnecting) return; isDisconnecting = true; console.log(`⛔️ Bot Disconnected/Failed! Reason: ${reason}`); if (watchdogTimer) clearTimeout(watchdogTimer); if (hasSuccessfullySpawned) { setTimeout(createAndRunBot, RECONNECT_DELAY); } else { setTimeout(createAndRunBot, RECONNECT_FAIL_DELAY); } }

  /**
   * The main loop for all random "human-like" actions.
   * This version is 100% safe and cannot break blocks.
   */
  function performRandomAction() {
    if (!bot.entity || isDisconnecting) return;
    const currentPos = bot.entity.position; const distanceFromHome = currentPos.distanceTo(new vec3(HOME_X, currentPos.y, HOME_Z));

    // Leash logic: If it gets knocked away, walk back.
    if (distanceFromHome > WANDER_RADIUS && !bot.pathfinder.isMoving()) {
      const homeGoal = new GoalBlock(HOME_X, HOME_Y, HOME_Z);
      bot.pathfinder.setGoal(homeGoal);
      setTimeout(performRandomAction, randomInt(4000, 8000));
      return;
    }

    const actionId = randomInt(0, 9);
    console.log(`[Action] Performing Action ID: ${actionId}`);

    if (actionId !== 5 && bot.pathfinder.isMoving()) { bot.pathfinder.stop(); }

    switch (actionId) {
      case 0: // Short Random Movement Burst
        const directions=['forward','back','left','right'];const direction=directions[randomInt(0,3)];const duration=randomInt(100,300);bot.setControlState(direction,true);setTimeout(()=>{if(bot&&bot.entity){bot.setControlState(direction,false);}},duration);break;
      case 1: // Jump
        bot.setControlState('jump',true);bot.setControlState('jump',false);break;
      case 2: // Look Around
        const yaw=Math.random()*Math.PI*2-Math.PI;const pitch=(Math.random()*(Math.PI/2))-(Math.PI/4);bot.look(yaw,pitch,false);break;
      case 3: // "Fake" Mining (SAFE)
        const block=bot.findBlock({matching:(blk)=>blk.type!==0,maxDistance:3});if(block){bot.lookAt(block.position,false,()=>{bot.swingArm();setTimeout(()=>bot.swingArm(),300);setTimeout(()=>bot.swingArm(),600);});}else{bot.swingArm();}break;
      case 4: // Toggle Sneak
        isSneaking=!isSneaking;bot.setControlState('sneak',isSneaking);break;
      case 5: // Wander (Pathfinder)
        if(bot.pathfinder.isMoving()){break;}const targetX=HOME_X+randomInt(-WANDER_RADIUS,WANDER_RADIUS);const targetZ=HOME_Z+randomInt(-WANDER_RADIUS,WANDER_RADIUS);const goal=new GoalBlock(targetX,HOME_Y,targetZ);bot.pathfinder.setGoal(goal);break;
      case 6: // Switch Hotbar Slot
        const newSlot=randomInt(0,8);bot.setQuickBarSlot(newSlot);break;
      case 7: // Look at Nearest Player
        const player=bot.nearestEntity((e)=>e.type==='player'&&e.username!==bot.username);
        if(player){bot.lookAt(player.position.offset(0,player.height,0));}
        break;
      case 8: // Do Nothing (Idle)
        break;
      case 9: // Toss Random Item (SAFE)
        const mainInventoryItems=bot.inventory.items().filter(item=>item.slot>=9&&item.slot<=35);if(mainInventoryItems.length>0){const itemToToss=mainInventoryItems[randomInt(0,mainInventoryItems.length-1)];bot.toss(itemToToss.type,null,1);}break;
    }
    setTimeout(performRandomAction, randomInt(2000, 7000));
  }

  bot.on('spawn', () => {
    hasSuccessfullySpawned = true;
    console.log(`✅ ${config.botUsername} has spawned!`);

    let afkModeStarted = false;
    const startSafeAFKMode = () => {
      if (afkModeStarted) return;
      afkModeStarted = true;

      console.log('[System] Configuring bot for SAFE AFK MODE.');
      const safeMovements = new Movements(bot);
      safeMovements.canDig = false;
      safeMovements.canPlace = false;
      bot.pathfinder.setMovements(safeMovements);

      console.log('[System] Starting random action cycle...');
      setTimeout(performRandomAction, 3000);
    };

    const homePosition = new vec3(HOME_X, HOME_Y, HOME_Z);
    const distanceFromHome = bot.entity.position.distanceTo(homePosition);

    if (distanceFromHome > 10) {
      console.log(`[System] Bot is ${distanceFromHome.toFixed(0)} blocks from base. Teleporting home...`);
      bot.chat(`/tp ${config.botUsername} ${HOME_X} ${HOME_Y} ${HOME_Z}`);
      
      const onMoveAfterTeleport = () => {
        if (afkModeStarted) return; // Don't run if we already started
        const currentPos = bot.entity.position;
        // Check if the bot is now within a 5-block radius of its home base
        if (homePosition.distanceTo(currentPos) < 5) {
          console.log('[System] Teleport successful! Bot has arrived at base.');
          bot.removeListener('move', onMoveAfterTeleport); // CRUCIAL: Stop listening to this event
          startSafeAFKMode();
        }
      };

      console.log('[System] Waiting for teleport to be confirmed by checking position...');
      bot.on('move', onMoveAfterTeleport);

      // Add a fallback timer in case the move event never confirms the position
      setTimeout(() => {
        if (!afkModeStarted) {
          console.log('[System] Fallback timer triggered. Attempting to start AFK mode anyway.');
          bot.removeListener('move', onMoveAfterTeleport); // Clean up the listener
          startSafeAFKMode();
        }
      }, 10000); // 10-second fallback

    } else {
      console.log('[System] Bot spawned at base. Starting safe AFK mode directly.');
      startSafeAFKMode();
    }

    resetWatchdog();
    setTimeout(() => { bot.end('proactive_session_reconnect'); }, SESSION_DURATION);
  });

  bot.on('physicTick', resetWatchdog);
  bot.on('chat', (username, message) => { if (username === bot.username) return; const messageLower = message.toLowerCase(); const botNameLower = config.botUsername.toLowerCase(); if (messageLower.includes(botNameLower)) { const now = Date.now(); if (now - lastChatReply < 30000) return; lastChatReply = now; const replies = ["Sorry, I'm AFK.", "brb", "zZzZz...", "?"]; const reply = replies[randomInt(0, replies.length - 1)]; setTimeout(() => { bot.chat(reply); }, randomInt(1500, 4500)); } });
  bot.on('error', (err) => { console.error('⚠️ Error:', err.message); handleDisconnect(err.message); });
  bot.on('kicked', (reason) => { hasSuccessfullySpawned = true; handleDisconnect(`Kicked: ${JSON.stringify(reason)}`); });
  bot.on('end', (reason) => { handleDisconnect(`Connection ended: ${reason}`); });
}

createAndRunBot();
