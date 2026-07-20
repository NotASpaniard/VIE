import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { loadCommands } from '../lib/loader.js';
import { getEnv } from '../lib/env.js';
import { Client } from 'discord.js';

// Đăng ký TẤT CẢ slash command mà bot thực sự xử lý (nguồn sự thật = loadCommands,
// cùng logic với runtime handler trong index.ts). Guild = hiện tức thì; global = ~1h.
(async () => {
  const env = getEnv();
  const client = new Client({ intents: [] });
  (client as any).commands = new Map();
  (client as any).prefixCommands = new Map();
  await loadCommands(client);

  const slash = Array.from((client as any).commands.values()).map((c: any) => c.data.toJSON());
  console.log(`Chuẩn bị đăng ký ${slash.length} lệnh:`, slash.map((c: any) => c.name).sort());

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  // --global (hoặc REGISTER_GLOBAL=1): đăng ký cho MỌI server bot tham gia (mất tới ~1h để hiện).
  // Mặc định: đăng ký theo guild trong .env (hiện tức thì, tiện dev).
  const useGlobal = process.argv.includes('--global') || process.env.REGISTER_GLOBAL === '1';

  async function put() {
    if (!useGlobal && env.DISCORD_GUILD_ID) {
      const data: any = await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
        { body: slash }
      );
      console.log(`✅ Đã đăng ký ${data.length} lệnh cho server ${env.DISCORD_GUILD_ID} (guild, tức thì).`);
    } else {
      const data: any = await rest.put(
        Routes.applicationCommands(env.DISCORD_CLIENT_ID),
        { body: slash }
      );
      console.log(`✅ Đã đăng ký ${data.length} lệnh GLOBAL cho mọi server (có thể mất tới ~1h để hiện).`);
    }
  }

  try {
    await put();
  } catch (error: any) {
    if (error?.code === 429) {
      console.log('⏰ Bị rate limit, thử lại sau 5s...');
      await new Promise((r) => setTimeout(r, 5000));
      await put();
    } else {
      console.error('❌ Đăng ký thất bại:', error);
      process.exit(1);
    }
  }
})();
