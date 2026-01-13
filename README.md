# 🖼️ media-submissions

Media Submissions is a Discord bot that allows you to configure fully automatic, and user-driven, media of the week/month channels.

> ⚠️ **IMPORTANT:** This project is being recreated using the Rhidium framework. While it is perfectly usable in it's current state, the next major update will bring significant improvements and optimizations.

> This project was funded and open-sourced by [DayZ The Lab](https://dayzthelab.com).

## ❔ How does it work?

You can specify which channels users should upload their media in, whether it's of the `image`, `video` or `either` type, and when a winner should be chosen.

When a user uploads a message **with** the specified media in the channel, the `👍` and `👎` emojis will be added to the message, allowing the community to cast their votes. Any message that does **not** have the specified media attached will be deleted, keeping the submission channels clean of any (potentially unwanted) user feedback. The message with the most up-votes will be chosen as the winner at the specified datetime.

## 💬 Direct Messaging

To keep the submission channels clean of any unwanted bot interactions/feedback, the app tries to communicate actions -- like a submissions being denied -- through user DMs, which the user can disable/prevent. This is why you should ask your (participating) users to create/initialize a DM with the bot beforehand, or accept DMs from your server altogether. This could be avoided if we had opted to use Application Commands, but this would have been more inconvenient for anyone trying to submit media as multiple additional steps are required.

## 🛠️ Configuration

Every aspect of this app and it's functionality is configurable, including:

- The media type: `image`, `video` or `either`
- The time frame: How long do submissions run/when is a winner chosen?
- The emojis used to cast votes: `👍` and `👎` by default
- Submission and forwarding channels
  - In which channel should users post their media?
  - In which channel should the winning submissions be posted?
- Submission validation: You can allow user feedback in submission channels
- Media sources: `discord`, `imgur`, `medal` and `youtube` by default
- The submission cooldown - separate from channel slow-mode
- Submission quantity: Should only 1 media attachment be allowed, or a gallery/collection of multiple entries?
- Discussion Threads: Should a public thread be attached to submissions (and the winning submission) to allow organized feedback?
- Block Other Emojis: Should other, non-voting, emojis be automatically removed from submissions?

## 🙋 Intents

This application uses the following Discord Gateway Intents:

- `Guilds`: Required to receive guild message events, and populate channel information.
- `GuildMessages`: Required to receive guild message events, as this is the source of submissions.
- `MessageContent`: This is a **Privileged Intent**, and is required to determine if a message has *either* allowed media sources in it's attachments or message content through `validationURLs`.
- `GuildMessageReactions`: Required to remove non-vote reactions from submissions, configurable - and can be omitted when not blocking other reactions.

> ⚠️ **Note:** The `Message Content` intent is required, you have to enable it in the Discord Developer Portal, please view [our guide](https://wiki.mirasaki.dev/docs/discord-create-application#intents) if you need more information.

Feel free to analyze the [source code](./src) if you have (data) security concerns, the intents are utilized in the following files:

- `./src/message-create.ts`
- `./src/message-delete.ts`
- `./src/message-update.ts`

## 📥 Installation

There are multiple ways of hosting this app. Our team recommends hosting production apps with [Docker Desktop](https://www.docker.com/products/docker-desktop/), as Docker standardizes environments across different machines, and is by far the quickest & easiest to set-up.

### 📦 Docker (preferred)

1. Download and install [Docker](https://www.docker.com/products/docker-desktop/)
2. Download and extract the [source code](https://github.com/Mirasaki-Development/media-submissions/releases)
3. Create the configuration files: (**Choose ONE**)

    ```bash
    # Unix/Linux
    cp .env.example .env && cp config.example.ts config.ts
    # Windows
    copy .env.example .env && copy config.example.ts config.ts
    # Powershell
    Copy-Item .env.example .env; Copy-Item config.example.ts config.ts
    ```

4. Provide your environmental variables in the `.env` file
5. Provide your app configuration in the `config.ts` file
6. Bring the application online in the background: `docker compose up -d`

### 🖥️ Node.js (alternative)

1. Download and install [NodeJS](https://nodejs.org/en/download/prebuilt-installer/current)
2. Download and extract the [source code](https://github.com/Mirasaki-Development/media-submissions/releases)
3. Open a command prompt in the project root (the directory with `src`, and `package.json` inside)
4. Setup the project and it's dependencies: `npm run setup`
5. Provide your environmental variables in the `.env` file
6. Provide your app configuration in the `config.ts` file
7. Build the application: `npm run build`
8. Bring the application online: `npm run start`
