import 'dotenv/config'
import { Client, GatewayIntentBits } from 'discord.js'

import { appConfig } from '../config'
import { initBacklog } from './backlog'
import { onMessageCreate } from './message-create'
import { onMessageDelete } from './message-delete'
import { onMessageUpdate } from './message-update'
import { initMediaModule } from './media-module-run'
import { onMessageReactionAdd } from './message-reaction-add'
import { preFetchSubmissionPeriodMessages } from './pre-fetch'
import { debugEnabled, debugLog } from './logger'

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_TOKEN,
} = process.env

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_TOKEN) {
  throw new Error('Missing required environment variables, please check your .env file or refer to the README.md for instructions.')
}

const { mediaModules } = appConfig
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
})

client.once('ready', (c) => {
  console.info(`Logged in as ${c.user.tag}`)
  initBacklog(c, mediaModules)
  c.on('messageCreate', (message) => onMessageCreate(c, message, mediaModules))
  c.on('messageDelete', (message) => onMessageDelete(c, message, mediaModules))
  c.on('messageUpdate', (oldMessage, newMessage) => onMessageUpdate(c, oldMessage, newMessage, mediaModules))
  c.on('messageReactionAdd', (reaction, user) => onMessageReactionAdd(c, reaction, user, mediaModules))
  mediaModules.forEach((mediaModule) => {
    initMediaModule(c, mediaModule)
    preFetchSubmissionPeriodMessages(c, mediaModule)
  })

  if (debugEnabled) {
    c.on('debug', (info) => debugLog('debug', info))
      .on('warn', (info) => debugLog('warn', info))
      .on('error', (info) => debugLog('error', info));
    c.rest.on('rateLimited', (info) => debugLog('rate-limited', info))
  }
})

client.login(DISCORD_CLIENT_TOKEN)