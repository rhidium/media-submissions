import { PrismaClient } from '@prisma/client';
import { CronExpressionParser } from 'cron-parser';
import { appConfig } from '../config';

export const prisma = new PrismaClient();

export const getCurrentStartEnd = (cronExpression: string, cronTimezone: string) => {
  const now = new Date();
  const currentPeriodStartExpression = CronExpressionParser.parse(cronExpression, {
    currentDate: now,
    tz: cronTimezone,
  });
  const currentPeriodEndExpression = CronExpressionParser.parse(cronExpression, {
    currentDate: now,
    tz: cronTimezone,
  });

  const currStart = currentPeriodStartExpression.prev().toDate();
  const currEnd = currentPeriodEndExpression.next().toDate();

  return {
    currStart,
    currEnd,
  };
}


export const getUserSubmissions = async (
  mediaModuleId: string,
  userId: string,
  channelId: string,
  guildId: string,
) => {
  const mediaModule = appConfig.mediaModules.find((module) => module.id === mediaModuleId);
  if (!mediaModule) {
    return [];
  }

  const { currStart, currEnd } = getCurrentStartEnd(
    mediaModule.cronOutputSubmission,
    mediaModule.cronTimezone
  );

  return prisma.submission.findMany({
    where: {
      mediaModuleId,
      userId,
      channelId,
      guildId,
      createdAt: {
        gte: currStart,
        lt: currEnd,
      }
    },
  });
}

export const countSubmissions = async (
  mediaModuleId: string,
  channelId: string,
  guildId: string,
) => {
  const mediaModule = appConfig.mediaModules.find((module) => module.id === mediaModuleId);
  if (!mediaModule) {
    return 0;
  }

  const { currStart, currEnd } = getCurrentStartEnd(
    mediaModule.cronOutputSubmission,
    mediaModule.cronTimezone
  );

  return prisma.submission.count({
    where: {
      mediaModuleId,
      channelId,
      guildId,
      createdAt: {
        gte: currStart,
        lt: currEnd,
      }
    },
  });
}