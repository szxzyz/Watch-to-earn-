// Application configuration
// Use environment variables for channel settings

export const config = {
  // Telegram channel settings - use numeric ID for more reliable verification
  // To get numeric channel ID:
  // 1. Add @userinfobot to your channel
  // 2. Forward a message from the channel to @userinfobot
  // 3. It will show the channel ID (looks like: -1001234567890)
  telegram: {
    // Channel settings (environment variables required)
    channelId: process.env.TELEGRAM_CHANNEL_ID || '-1002242502661',
    channelUrl: process.env.TELEGRAM_CHANNEL_URL || 'https://t.me/MoneyAdz',
    channelName: process.env.TELEGRAM_CHANNEL_NAME || 'Money adz',
    // Group settings (environment variables required)
    groupId: process.env.TELEGRAM_GROUP_ID || '-1002769424144',
    groupUrl: process.env.TELEGRAM_GROUP_URL || 'https://t.me/LightningSatCommunity',
    groupName: process.env.TELEGRAM_GROUP_NAME || 'Lightning Sat Community',
    moneyCatsId: process.env.TELEGRAM_MONEYCATS_ID || '',
    moneyCatsUrl: process.env.TELEGRAM_MONEYCATS_URL || '',
    moneyCatsName: process.env.TELEGRAM_MONEYCATS_NAME || '',
  },
  
  // Bot configuration
  bot: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    adminId: process.env.TELEGRAM_ADMIN_ID || '',
    username: process.env.BOT_USERNAME || 'MoneyAXNbot',
    botUrl: process.env.TELEGRAM_BOT_URL || 'https://t.me/MoneyAXNbot',
  },
};

// Helper function to get channel config for API responses
export function getChannelConfig() {
  return {
    channelId: config.telegram.channelId,
    channelUrl: config.telegram.channelUrl,
    channelName: config.telegram.channelName,
    groupId: config.telegram.groupId,
    groupUrl: config.telegram.groupUrl,
    groupName: config.telegram.groupName,
    moneyCatsId: config.telegram.moneyCatsId,
    moneyCatsUrl: config.telegram.moneyCatsUrl,
    moneyCatsName: config.telegram.moneyCatsName,
    botUsername: config.bot.username,
    botUrl: config.bot.botUrl,
  };
}
