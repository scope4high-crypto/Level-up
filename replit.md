# Solo Leveling Discord Bot

## Overview
A Discord bot inspired by Solo Leveling featuring a quest and progression system. Users can complete quests assigned by the host to earn XP, level up, and increase their hunter rank.

## Features
- **Player Registration**: New users must accept to become a Player before using commands (system-themed prompt)
- **Quest System**: Host can create quests with difficulty ranks (E, D, C, B, A, S), XP rewards, duration limits, and participant limits
- **Quest Submission**: Users submit work via DM (text/image) for host review
- **Level Progression**: Users earn XP with scaling requirements (+200 XP per level)
- **Level 10 Notification**: System-themed image notification when users reach level 10
- **Rank System**: Ranks progress E → D → C → B → A → S → N based on level
- **Class System**: At level 10, users can choose a permanent class via /class command (Assassin, Mage, Tank, Spy)
- **Status Cards**: Dynamic themed images showing user stats based on rank
- **Quest Approval**: Host receives DM to approve/reject quest completions
- **Player Reset**: Host can reset any player's progress

## Commands
- `/status` - View your hunter status card with level, rank, class, XP progress
- `/class` - Choose your class (requires Level 10, one-time selection)
- `/quests list` - View all available quests with expiry times and slot counts
- `/quests create` - Create a new quest (host only) with optional duration and max participants
- `/quests accept <quest_id>` - Accept a quest and receive DM to submit work
- `/reset <player>` - Reset a player's progress (host only)

## Project Structure
```
src/
├── index.js          # Main bot entry point with button handlers
├── database.js       # JSON file-based data storage with XP scaling
├── statusCard.js     # Canvas image generation with rank themes
└── commands/
    ├── status.js     # /status command
    ├── quests.js     # /quests command with subcommands
    ├── class.js      # /class command for class selection
    └── reset.js      # /reset command (host only)
data/
├── users.json        # User progression data
├── quests.json       # Active quests
├── pending_reviews.json  # Legacy pending approvals
└── quest_submissions.json  # Quest work submissions
```

## Environment Variables
- `DISCORD_TOKEN` - Discord bot token (required)
- `HOST_ID` - Discord user ID of the bot host/guild master (required)

## Rank Thresholds & Themes
- E: Level 0+ (Gray theme)
- D: Level 10+ (Light Green theme)
- C: Level 25+ (Violet theme)
- B: Level 35+ (Yellow/Gold theme)
- A: Level 50+ (Silver theme)
- S: Level 75+ (Crimson Red theme)
- N: Level 100+ (Gold theme)

## XP Scaling
- Level 0→1: 1000 XP required
- Level 1→2: 1200 XP required
- Level 2→3: 1400 XP required
- Formula: 1000 + (current_level * 200)

## Classes (Available at Level 10)
- **Assassin**: Offensive specialist - Strike hard and fast
- **Mage**: Stealth support - Aid from the shadows
- **Tank**: Frontline deployed - Direct task deployment
- **Spy**: Intel gatherer - Operate in enemy territory
