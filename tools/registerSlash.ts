import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { loadCommands } from '../lib/loader.js';
import { getEnv } from '../lib/env.js';
import { Client } from 'discord.js';

// Registers slash commands globally (use carefully due to caching)
(async () => {
  const env = getEnv();
  const client = new Client({ intents: [] });
  (client as any).commands = new Map();
  (client as any).prefixCommands = new Map();
  await loadCommands(client);

  // Exclude 9 persistent commands that already exist on Discord
  const EXCLUDED_COMMANDS = [
    'add', 'remove', 'resetmoney', 
    'ping', 'reset', 'status', 'turnoff',
    'help', 'guildowner'
  ];
  
  console.log('Available commands:', Array.from((client as any).commands.keys()));
  console.log('Excluded commands:', EXCLUDED_COMMANDS);

  // Register new commands (basic + hunt + hatch + dungeon + guild)
  const NEW_COMMANDS = ['info', 'give', 'bxh', 'quest', 'hunt_equip', 'hunt_inventory', 'hunt_use', 'hunt_main', 'hatch_place', 'hatch_collect', 'hatch_upgrade', 'hatch_main', 'dungeon_enter', 'dungeon_stats', 'dungeon_leaderboard', 'dungeon_main', 'guild_create', 'guild_add', 'guild_remove', 'guild_list', 'guild_daily', 'guild_bxh', 'guild_inv', 'guild_quest', 'guild_info', 'guild_donate'];
  const slash = Array.from((client as any).commands.values())
    .filter((c: any) => NEW_COMMANDS.includes(c.data.name))
    .map((c: any) => c.data.toJSON());
    
  console.log('Commands to register:', slash.map(c => c.name));
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  
  try {
    let registeredCommands;
    if (env.DISCORD_GUILD_ID) {
      registeredCommands = await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), { body: slash });
      console.log(`✅ Registered ${slash.length} guild slash commands for server ${env.DISCORD_GUILD_ID}.`);
    } else {
      registeredCommands = await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: slash });
      console.log(`✅ Registered ${slash.length} global slash commands.`);
    }
    
    // Verify registration
    console.log('🔍 Verifying registration...');
    const registeredNames = registeredCommands.map((cmd: any) => cmd.name);
    console.log('📋 Registered commands:', registeredNames);
    
    // Check if all commands were registered
    const missingCommands = slash.filter(cmd => !registeredNames.includes(cmd.name));
    if (missingCommands.length > 0) {
      console.warn('⚠️ Missing commands:', missingCommands.map(cmd => cmd.name));
    } else {
      console.log('✅ All commands registered successfully!');
    }
    
  } catch (error) {
    console.error('❌ Registration failed:', error);
    
    if (error.code === 429) {
      console.log('⏰ Rate limited. Waiting 5 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        if (env.DISCORD_GUILD_ID) {
          await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), { body: slash });
        } else {
          await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: slash });
        }
        console.log('✅ Retry successful!');
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
})();


