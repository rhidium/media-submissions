import { Client, Collection, GuildChannel, GuildTextBasedChannel, Message } from "discord.js";
import { MediaModule } from "./types";
import { honorSubmissionQuantityLimits, validateSubmissionMediaSources } from "./message-create";
import { debugLog } from "./logger";
import { getCurrentStartEnd, prisma } from "./prisma";
import { buildPlaceholders, replacePlaceholders } from "./placeholders";

export const initBacklog = async (
  client: Client<true>,
  mediaModules: MediaModule[],
) => {
  const deleteMessage = (message: Message, debugTag: string) => {
    message.delete().catch((e) => {
      debugLog(`${debugTag} Failed to delete message:`, e);
    });
  }

  for await (const mediaModule of mediaModules) {
    const {
      submissionCooldown,
      deleteNonSubmissions,
      quantities,
      votingEmojis,
      submissionThread,
    } = mediaModule;
    const debugTag = `[${mediaModule.name}/backlog]`;
    const channel = client.channels.cache.get(mediaModule.submissionsChannelId);
    const guild = channel && !channel.isDMBased() ? client.guilds.cache.get(channel.guildId) : null;

    if (!channel || !guild) {
      console.warn(`${debugTag} Unable to find channel or guild`);
      continue;
    }

    if (channel.isDMBased()) {
      console.warn(`${debugTag} Channel is DM-based`);
      continue;
    }

    if (!channel.isTextBased()) {
      console.warn(`${debugTag} Channel is not text-based`);
      continue;
    }

    if (channel.isThread()) {
      console.warn(`${debugTag} Channel is a thread`);
      continue;
    }

    debugLog(`[${debugTag}/backlog] Fetching backlog submissions...`);

    const { currStart: currentPeriodStart } = getCurrentStartEnd(
      mediaModule.cronOutputSubmission,
      mediaModule.cronTimezone,
    );

    debugLog(`${debugTag} Calculated period start: ${currentPeriodStart.toISOString()}`);

    const chunkFetchMessages = async (channel: GuildTextBasedChannel, periodStart: Date) => {
      const messages: Message<true>[] = [];
      let lastId: string | undefined = undefined;
      let reachedPeriodBoundary = false;

      while (true) {
        const fetchNow = 100; // Max allowed by Discord API

        const fetchedMessages: Collection<string, Message<true>>
          = await channel.messages.fetch({
            limit: fetchNow,
            before: lastId ?? undefined,
          });

        if (fetchedMessages.size === 0) {
          break;
        }

        lastId = fetchedMessages.lastKey();

        for (const fetchedMessage of fetchedMessages.values()) {
          if (fetchedMessage.createdAt.getTime() < periodStart.getTime()) {
            reachedPeriodBoundary = true;
            continue;
          }

          messages.push(fetchedMessage);
        }

        if (reachedPeriodBoundary) {
          break;
        }
      }
      
      return messages;
    }

    const messages = await chunkFetchMessages(channel, currentPeriodStart);

    for await (const message of messages.values()) {
      const author = message.author;

      // Clean bot message
      if (author.bot) {
        message.delete().catch((e) => {
          debugLog(`${debugTag} Failed to delete message bot message:`, e);
        });
        continue;
      }

      // Validate media sources
      if (!await validateSubmissionMediaSources(message, mediaModule, () => {
        if (deleteNonSubmissions) {
          deleteMessage(message, debugTag);
        }
      })) {
        continue; // Submission has invalid media source(s) and was deleted
      } else {
        // Create submissions for message if not created yet
        const existingSubmission = await prisma.submission.findFirst({
          where: {
            messageId: message.id,
            channelId: message.channel.id,
            mediaModuleId: mediaModule.id
          }
        });

        if (existingSubmission) {
          debugLog(`${debugTag} Submission already exists for message ID: ${message.id}`);
          continue;
        }

        // Make sure we don't exceed submission quantity limits
        await honorSubmissionQuantityLimits(
          mediaModule,
          message,
          quantities,
          submissionCooldown,
          () => {
            if (deleteNonSubmissions) {
              deleteMessage(message, debugTag);
            }
          },
          debugTag,
        );

        // Everything is okay, let's do the thing =)
        const [ submission ] = await Promise.all([
          prisma.submission.create({
            data: {
              mediaModuleId: mediaModule.id,
              userId: author.id,
              guildId: guild.id,
              messageId: message.id,
              channelId: channel.id,
              processed: false,
              processedAt: null,
              cooldownExpiresAt: submissionCooldown ? new Date(Date.now() + submissionCooldown * 1000) : null,
            },
          }),
          message.react(votingEmojis.upvote).then(() => message.react(votingEmojis.downvote)).catch((e) => {
            debugLog(`${debugTag} Failed to react to message:`, e);
          }),
        ])
      
        if (submissionThread.enabled) {
          const placeholders = await buildPlaceholders(
            mediaModule,
            submission,
            submission.createdAt,
            message,
          );
          if (!placeholders) {
            debugLog(`${debugTag} Failed to build placeholders - this most likely means the message couldn't be resolved, aborting...`);
            continue;
          }
          if (channel.isVoiceBased()) {
            debugLog(`${debugTag} Channel is voice-based, skipping thread creation`);
            continue;
          }
          await channel.threads.create({
            name: replacePlaceholders(submissionThread.name, placeholders),
            autoArchiveDuration: submissionThread.autoArchiveDuration ?? undefined,
            startMessage: message,
            reason: 'Submission feedback thread for organized discussion/feedback.',
            rateLimitPerUser: submissionThread.rateLimitPerUser ?? undefined,
          }).catch((e) => {
            debugLog(`${debugTag} Failed to create submission thread:`, e);
          })
        }
      }
    }
  }
}