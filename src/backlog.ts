import { Client, Message } from "discord.js";
import { MediaModule } from "./types";
import { validateSubmissionMediaSources } from "./message-create";
import { debugLog } from "./logger";

export const initBacklog = async (
  client: Client<true>,
  mediaModules: MediaModule[],
  checkLatest = 250
) => {
  const deleteMessage = (message: Message, debugTag: string) => {
    message.delete().catch((e) => {
      debugLog(`${debugTag} Failed to delete message:`, e);
    });
  }

  for await (const mediaModule of mediaModules) {
    const debugTag = `[${mediaModule.name}/backlog]`;
    const channel = client.channels.cache.get(mediaModule.submissionsChannelId);
    const guild = channel && !channel.isDMBased() ? client.guilds.cache.get(channel.guildId) : null;

    if (!mediaModule.deleteNonSubmissions) {
      debugLog(`[${debugTag}/backlog] Skipping backlog check, deleteNonSubmissions is disabled`);
      continue;
    }

    if (!channel || !guild) {
      console.warn(`${debugTag} Unable to find channel or guild`);
      continue;
    }

    if (!channel.isTextBased()) {
      console.warn(`${debugTag} Channel is not text-based`);
      continue;
    }

    debugLog(`[${debugTag}/backlog] Checking latest ${checkLatest} messages`);

    const messages = await channel.messages.fetch({ limit: checkLatest });

    for await (const message of messages.values()) {
      // Clean bot message
      if (message.author.bot) {
        message.delete().catch((e) => {
          debugLog(`${debugTag} Failed to delete message bot message:`, e);
        });
        continue;
      }

      // Validate media sources
      if (!await validateSubmissionMediaSources(message, mediaModule, () => {
        deleteMessage(message, debugTag);
      })) {
        continue; // Submission has invalid media source(s) and was deleted
      }
    }
  }
}