import { Client, SlashCommandBuilder } from 'discord.js';
import { readdirSync } from 'node:fs';
import path from 'node:path';

export async function loadCommands(client: Client): Promise<void> {
  const commandsDir = path.join(process.cwd(), 'dist', 'modules');
  
  // Create completely new Maps to avoid any contamination
  const slashCommands = new Map();
  const prefixCommands = new Map();
  
  // Clear any existing commands first
  (client as any).commands?.clear();
  (client as any).prefixCommands?.clear();
  
  for (const file of readdirSync(commandsDir)) {
    if (!file.endsWith('.js')) continue;
    
    const filePath = 'file://' + path.join(commandsDir, file).replace(/\\/g, '/');
    const imported = await import(filePath);
    
    // Load ONLY from prefixes array (skip individual exports to prevent duplicates)
    if (Array.isArray(imported.prefixes)) {
      for (const cmd of imported.prefixes) {
        if (!prefixCommands.has(cmd.name)) {
          prefixCommands.set(cmd.name, cmd);
          console.log(`Loaded prefix: ${cmd.name}`);
        }
      }
    }
    
    // Load ONLY individual slash exports (skip prefix individual exports to prevent duplicates)
    for (const [key, value] of Object.entries(imported)) {
      if (key.startsWith('slash') && 
          key !== 'slash' && 
          key !== 'slashes' &&
          typeof value === 'object' && 
          value !== null && 
          'data' in value) {
        const data = (value as any).data as SlashCommandBuilder;
        if (!slashCommands.has(data.name)) {
          slashCommands.set(data.name, value);
          console.log(`Loaded slash: ${data.name} from ${key}`);
        }
      }
    }
  }
  
  (client as any).commands = slashCommands;
  (client as any).prefixCommands = prefixCommands;
  
  console.log(`Loaded ${slashCommands.size} slash commands.`);
  console.log(`Loaded ${prefixCommands.size} prefix commands.`);
  
  // Debug: Check for duplicate work commands
  console.log('Prefix commands:', Array.from(prefixCommands.keys()));
  console.log('Work command count:', Array.from(prefixCommands.keys()).filter(k => k === 'work').length);
}



