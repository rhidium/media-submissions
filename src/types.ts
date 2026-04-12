import { ThreadAutoArchiveDuration } from 'discord.js';

export type ThreadConfig = {
  enabled: boolean;
  /**
   * The name of the thread, the following placeholders are available:
   * 
   * - `{name}`: The name of the media module
   * - `{date}`: The date of the submission
   * - `{time}`: The time of the submission
   * - `{author}`: The author of the submission
   * - `{id}`: The ID of the submission
   * - `{channel}`: The channel of the submission
   * - `{link}`: The link to the submission
   * - `{upvotes}`: The upvotes of the submission
   * - `{downvotes}`: The downvotes of the submission
   */
  name: string;
  autoArchiveDuration: ThreadAutoArchiveDuration | null;
  /** The rate limit per user (slowmode) for the thread in seconds */
  rateLimitPerUser: number | null;
};

export type AppConfig = {
  // /**
  //  * The Discord client information
  //  * @see https://discord.com/developers/applications
  //  */
  // client: {
  //   id: string;
  //   token: string;
  // };
  /**
   * The media modules to use
   */
  mediaModules: MediaModule[];
};

export type MediaType = 'image' | 'video' | 'either';

export type MediaSource = {
  name: string;
  validationURLs: (string | 'attachment')[];
}

export type MediaModule = {
  /**
   * The unique identifier of this media module - changing this
   * will cause the module to be treated as a new module
   * and not retain any previous data
   */
  id: string;
  /** The name of this media module */
  name: string;
  /** The type of media this module supports */
  type: MediaType;
  /** The channel ID to listen for submissions in */
  submissionsChannelId: string;
  /** The channel ID to send submissions to */
  submissionsOutputChannelId: string;
  /**
   * The cron schedule for when to output submissions
   * @see https://crontab.guru/
   */
  cronOutputSubmission: string;
  /**
   * The timezone for the cron schedule, e.g. 'America/New_York'
   * @see https://momentjs.com/timezone/
   */
  cronTimezone: string;
  /** The emojis to indicate upvote and downvote */
  votingEmojis: {
    upvote: string;
    downvote: string;
  };
  /** Should non-submission messages, like user feedback, be deleted? */
  deleteNonSubmissions: boolean;
  /**
   * Allowed media sources
   * @see src/media-sources.ts
   */
  allowedSources: MediaSource[];
  /** The amount of seconds a user should be on cooldown before submitting again */
  submissionCooldown: number | null;
  /** Quantities for submissions */
  quantities: {
    /** The maximum amount of submissions allowed */
    maxSubmissions: number | null;
    /** The maximum amount of submissions allowed per user */
    maxSubmissionsPerUser: number | null;
    /** The maximum amount of attachments allowed per submission */
    attachmentsPerSubmission: number | null;
  }
  /** Should a public thread be created for organized feedback? */
  submissionThread: ThreadConfig;
  /** Should a public thread be created for the winning submission? */
  winningSubmissionThread: ThreadConfig;
  /** Should other reactions be automatically removed on submissions? */
  blockOtherReactions: boolean;
};