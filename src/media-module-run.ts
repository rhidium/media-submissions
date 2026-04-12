import { CronJob } from 'cron';
import { stripIndents } from 'common-tags';
import { Client, Message } from 'discord.js';

import { prisma } from './prisma';
import { debugLog } from './logger';
import { MediaModule } from './types';
import { buildPlaceholders, replacePlaceholders } from './placeholders';

export const initMediaModule = async (
  client: Client<true>,
  mediaModule: MediaModule,
): Promise<void> => {
  const {
    id,
    name,
    submissionsChannelId,
    submissionsOutputChannelId,
    cronOutputSubmission,
    cronTimezone,
    votingEmojis,
  } = mediaModule;
  const debugTag = `[${name}/run]`;

  const jobRun = async () => {
    const now = new Date();
    debugLog(`${debugTag} Running job at ${now.toISOString()}`);

    const nextDate = job.nextDate().toJSDate()
    const offset = nextDate.getTime() - now.getTime();
    const prevDate = new Date(now.getTime() - offset);
    debugLog(`${debugTag} Fetching submissions from ${prevDate.toISOString()} to ${now.toISOString()}`);

    const submissionsChannel = await client.channels.fetch(submissionsChannelId).catch(() => null);
    if (!submissionsChannel) {
      debugLog(`${debugTag} Submissions channel not found`);
      return;
    }
    if (!submissionsChannel.isTextBased()) {
      debugLog(`${debugTag} Submissions channel not text based`);
      return;
    }

    const outputChannel = await client.channels.fetch(submissionsOutputChannelId).catch(() => null);
    if (!outputChannel) {
      debugLog(`${debugTag} Output channel not found`);
      return;
    }
    if (!outputChannel.isTextBased()) {
      debugLog(`${debugTag} Output channel not text based`);
      return;
    }
    if (outputChannel.isDMBased()) {
      debugLog(`${debugTag} Output channel not in guild`);
      return;
    }

    const data = await prisma.submission.findMany({
      where: {
        mediaModuleId: id,
        createdAt: {
          gte: prevDate,
          lt: now,
        },
      },
    });
    const dataIdMap = data.map((submission) => submission.id);

    debugLog(`${debugTag} Found ${data.length} submissions, resolving submission messages (this can take a long time)...`);

    const messages = await Promise.all(data.map(async (submission) => {
      const message = await submissionsChannel.messages.fetch(submission.messageId).catch(() => null);
      if (!message) {
        debugLog(`${debugTag} Submission message not found: ${submission.messageId}`);
        return null;
      }
      return message;
    }))
    const validMessages = messages.filter((message) => message !== null) as Message<boolean>[]

    debugLog(`${debugTag} Found ${validMessages.length} valid submission messages`);
    if (validMessages.length === 0) {
      debugLog(`${debugTag} No valid messages to output`);
      return;
    }

    const findWinner = (
      messages: Message<boolean>[],
      ignoreIds: string[] = [],
    ) => {
      const validMessages = messages.filter((message) => !ignoreIds.includes(message.id));
      if (validMessages.length === 0) {
        return null;
      }
      return validMessages.reduce((a, b) => {
        const aVotes = a.reactions.cache.get(votingEmojis.upvote)?.count ?? 0;
        const bVotes = b.reactions.cache.get(votingEmojis.upvote)?.count ?? 0;
        return aVotes > bVotes ? a : b;
      }, validMessages[0]);
    }

    const winner = findWinner(validMessages);
    if (!winner) {
      debugLog(`${debugTag} No winner found, submissions are empty`);
      return;
    }

    if (!winner.inGuild()) {
      debugLog(`${debugTag} Winner message is not in guild, aborting...`);
      return;
    }

    const winnerSubmission = data.find((submission) => submission.messageId === winner.id);
    if (!winnerSubmission) {
      throw new Error('Unresolved winner submission, please create a GitHub issue');
    }

    const placeholders = await buildPlaceholders(
      mediaModule,
      winnerSubmission,
      new Date(winner.createdTimestamp),
      winner,
    );

    if (!placeholders) {
      debugLog(`${debugTag} Failed to build placeholders - this most likely means the message couldn't be resolved, aborting...`);
      return;
    }

    debugLog(`${debugTag} Found winning message: ${winner.id} with submission ${winnerSubmission.id}`);

    const outputMessage = await outputChannel.send({
      content: stripIndents`
        ## ${name} Winner
        👑 **Winner:** ${winner.author} - [Jump to original](<${winner.url}>)
        🆙 **Votes:** ${winner.reactions.cache.get(votingEmojis.upvote)?.count ?? 0}
        📥 **Submissions:** ${validMessages.length}
        🗳️ **Total Votes:** ${validMessages.reduce((acc, message) => acc + (message.reactions.cache.get(votingEmojis.upvote)?.count ?? 0), 0)}
        ${winner.attachments.size > 0
            ? `\n\n${winner.attachments.map((attachment) => attachment.url).join('\n')}`
            : `\n\n**Content:** ${winner.content}`}
      `,
    });

    if (mediaModule.winningSubmissionThread.enabled) {
      await outputMessage.startThread({
        name: replacePlaceholders(
          mediaModule.winningSubmissionThread.name,
          placeholders,
        ),
        autoArchiveDuration: mediaModule.winningSubmissionThread.autoArchiveDuration ?? undefined,
        rateLimitPerUser: mediaModule.winningSubmissionThread.rateLimitPerUser ?? undefined,
      });
    }

    await prisma.submission.update({
      where: {
        id: winnerSubmission.id,
      },
      data: {
        processed: true,
        processedAt: new Date(),
        processedMessageId: outputMessage.id,
        processedMessageChannelId: outputChannel.id,
      },
    });

    debugLog(`${debugTag} Winner submission processed: ${winnerSubmission.id}`);
    
    debugLog(`${debugTag} Cleaning up other submissions...`);
    const deleted = await prisma.submission.deleteMany({
      where: {
        mediaModuleId: id,
        id: {
          in: dataIdMap,
          not: winnerSubmission.id,
        },
      },
    });
    debugLog(`${debugTag} Cleaned up ${deleted.count} submissions`);
  }

  const onJobComplete = () => {
    debugLog(`${debugTag} Job completed, next run at ${job.nextDate()}`);
  }

  const job = new CronJob(
    cronOutputSubmission,
    jobRun,
    onJobComplete,
    false,
    cronTimezone,
  );

  job.start();
  debugLog(`${debugTag} Job created, initial run at ${job.nextDate()} (${cronOutputSubmission}, ${cronTimezone})`);
}