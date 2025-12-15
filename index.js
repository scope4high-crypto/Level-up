import { Client, GatewayIntentBits, Collection, Events, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { config } from 'dotenv';
import * as statusCommand from './commands/status.js';
import * as questsCommand from './commands/quests.js';
import * as classCommand from './commands/class.js';
import * as resetCommand from './commands/reset.js';
import { handleQuestModal } from './commands/quests.js';
import { addXP, getUser, getPendingReviews, removePendingReview, getQuest, setUserClass, canSelectClass, getQuestSubmission, saveQuestSubmission, removeQuestSubmission, savePendingReview, completeQuestForUser, isPlayerAccepted, acceptPlayer } from './database.js';
import { generateQuestCompleteCard, generateClassSelectionCard, generateClassConfirmCard, generateClassSelectedCard, generatePlayerAcceptCard, generateLevel10Card } from './statusCard.js';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
client.commands.set(statusCommand.data.name, statusCommand);
client.commands.set(questsCommand.data.name, questsCommand);
client.commands.set(classCommand.data.name, classCommand);
client.commands.set(resetCommand.data.name, resetCommand);

const commands = [
  statusCommand.data.toJSON(),
  questsCommand.data.toJSON(),
  classCommand.data.toJSON(),
  resetCommand.data.toJSON()
];

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}!`);
  console.log(`Bot is in ${c.guilds.cache.size} servers`);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(c.user.id),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (interaction.commandName !== 'reset' && !isPlayerAccepted(interaction.user.id)) {
        await sendPlayerAcceptPrompt(interaction);
        return;
      }

      await command.execute(interaction);
      
      if (interaction.commandName === 'status') {
        if (canSelectClass(interaction.user.id)) {
          await sendClassSelection(interaction.user);
        }
      }
    } catch (error) {
      console.error('Error executing command:', error);
      const reply = { content: 'There was an error executing this command!', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  } else if (interaction.isModalSubmit()) {
    await handleModalSubmit(interaction);
  } else if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  }
});

async function sendPlayerAcceptPrompt(interaction) {
  try {
    const attachment = await generatePlayerAcceptCard();
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`player_accept_${interaction.user.id}`)
          .setLabel('Yes, I Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`player_decline_${interaction.user.id}`)
          .setLabel('No')
          .setStyle(ButtonStyle.Danger)
      );

    await interaction.reply({ 
      files: [attachment], 
      components: [row],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error sending player accept prompt:', error);
    await interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
  }
}

async function sendClassSelection(user) {
  try {
    const attachment = await generateClassSelectionCard();
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`class_select_Assassin_${user.id}`)
          .setLabel('Assassin')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⚔️'),
        new ButtonBuilder()
          .setCustomId(`class_select_Mage_${user.id}`)
          .setLabel('Mage')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔮'),
        new ButtonBuilder()
          .setCustomId(`class_select_Tank_${user.id}`)
          .setLabel('Tank')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🛡️'),
        new ButtonBuilder()
          .setCustomId(`class_select_Spy_${user.id}`)
          .setLabel('Spy')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🕵️')
      );

    await user.send({ 
      content: `You've reached Level 10! Choose your class:`,
      files: [attachment], 
      components: [row] 
    });
  } catch (error) {
    console.error('Error sending class selection DM:', error);
  }
}

async function handleModalSubmit(interaction) {
  if (interaction.customId === 'quest_create_modal') {
    await handleQuestModal(interaction);
  } else if (interaction.customId.startsWith('quest_submission_modal_')) {
    await handleQuestSubmissionModal(interaction);
  }
}

async function handleQuestSubmissionModal(interaction) {
  const submissionId = interaction.customId.replace('quest_submission_modal_', '');
  const submission = getQuestSubmission(submissionId);
  
  if (!submission) {
    return interaction.reply({ content: 'Submission not found or expired.', ephemeral: true });
  }

  const textSubmission = interaction.fields.getTextInputValue('submission_text');
  const imageUrl = interaction.fields.getTextInputValue('submission_image') || null;

  submission.textSubmission = textSubmission;
  submission.imageUrl = imageUrl;
  submission.status = 'pending_review';
  submission.submittedAt = Date.now();
  saveQuestSubmission(submissionId, submission);

  const hostId = process.env.HOST_ID;
  if (!hostId) {
    return interaction.reply({ content: 'Guild Master not configured.', ephemeral: true });
  }

  try {
    const host = await client.users.fetch(hostId);
    const quest = getQuest(submission.questId);

    const embed = new EmbedBuilder()
      .setTitle('🎯 Quest Submission Review')
      .setDescription(`**${submission.username}** has submitted work for a quest!`)
      .setColor(0x1a1a3a)
      .addFields(
        { name: 'Quest', value: quest ? quest.title : submission.questTitle, inline: true },
        { name: 'Rank', value: submission.questRank, inline: true },
        { name: 'XP Reward', value: submission.questXP.toString(), inline: true },
        { name: 'Submission', value: textSubmission.substring(0, 1000) }
      )
      .setTimestamp();

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`approve_submission_${submissionId}`)
          .setLabel('Quest Completed')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`reject_submission_${submissionId}`)
          .setLabel('Reject')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );

    await host.send({ embeds: [embed], components: [row] });

    await interaction.reply({ 
      content: 'Your submission has been sent to the Guild Master for review!', 
      ephemeral: true 
    });
  } catch (error) {
    console.error('Error sending submission to host:', error);
    await interaction.reply({ 
      content: 'Failed to send submission. Please try again.', 
      ephemeral: true 
    });
  }
}

async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  if (customId.startsWith('player_accept_')) {
    await handlePlayerAccept(interaction);
  } else if (customId.startsWith('player_decline_')) {
    await handlePlayerDecline(interaction);
  } else if (customId.startsWith('submit_quest_')) {
    await handleSubmitQuestButton(interaction);
  } else if (customId.startsWith('approve_submission_')) {
    await handleApproveSubmission(interaction);
  } else if (customId.startsWith('reject_submission_')) {
    await handleRejectSubmission(interaction);
  } else if (customId.startsWith('class_select_')) {
    await handleClassSelect(interaction);
  } else if (customId.startsWith('class_confirm_')) {
    await handleClassConfirm(interaction);
  } else if (customId.startsWith('class_cancel')) {
    await handleClassCancel(interaction);
  } else if (customId.startsWith('approve_quest_')) {
    await handleLegacyApprove(interaction);
  } else if (customId.startsWith('reject_quest_')) {
    await handleLegacyReject(interaction);
  }
}

async function handlePlayerAccept(interaction) {
  const targetUserId = interaction.customId.replace('player_accept_', '');
  
  if (interaction.user.id !== targetUserId) {
    return interaction.reply({ content: 'This is not for you!', ephemeral: true });
  }

  acceptPlayer(interaction.user.id);
  
  const embed = new EmbedBuilder()
    .setTitle('[SYSTEM]')
    .setDescription('**PLAYER REGISTRATION COMPLETE**\n\nWelcome, Hunter. You have been registered in the system.\n\nYou may now access all features and begin your journey.')
    .setColor(0x00FF00)
    .setFooter({ text: 'Use /status to view your profile' });

  await interaction.update({ 
    embeds: [embed], 
    files: [],
    components: [] 
  });
}

async function handlePlayerDecline(interaction) {
  const targetUserId = interaction.customId.replace('player_decline_', '');
  
  if (interaction.user.id !== targetUserId) {
    return interaction.reply({ content: 'This is not for you!', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle('[SYSTEM]')
    .setDescription('**REGISTRATION DECLINED**\n\nYou have chosen not to become a Player.\n\nYou may register at any time by using any command.')
    .setColor(0xFF4444);

  await interaction.update({ 
    embeds: [embed], 
    files: [],
    components: [] 
  });
}

async function handleSubmitQuestButton(interaction) {
  const submissionId = interaction.customId.replace('submit_quest_', '');
  const submission = getQuestSubmission(submissionId);

  if (!submission) {
    return interaction.reply({ content: 'This quest submission has expired.', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`quest_submission_modal_${submissionId}`)
    .setTitle('Submit Quest Work');

  const textInput = new TextInputBuilder()
    .setCustomId('submission_text')
    .setLabel('Describe your work / proof of completion')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Explain what you did to complete this quest...')
    .setRequired(true)
    .setMaxLength(2000);

  const imageInput = new TextInputBuilder()
    .setCustomId('submission_image')
    .setLabel('Image URL (optional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://example.com/image.png')
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(textInput),
    new ActionRowBuilder().addComponents(imageInput)
  );

  await interaction.showModal(modal);
}

async function handleApproveSubmission(interaction) {
  const submissionId = interaction.customId.replace('approve_submission_', '');
  const submission = getQuestSubmission(submissionId);

  if (!submission) {
    return interaction.reply({ content: 'Submission not found.', ephemeral: true });
  }

  const quest = getQuest(submission.questId) || { 
    title: submission.questTitle, 
    rank: submission.questRank, 
    xpReward: submission.questXP 
  };

  const updatedUser = addXP(submission.userId, quest.xpReward);
  completeQuestForUser(submission.questId, submission.userId);
  removeQuestSubmission(submissionId);

  await interaction.update({
    content: `Quest approved for ${submission.username}! They received ${quest.xpReward} XP.`,
    embeds: [],
    components: []
  });

  try {
    const targetUser = await client.users.fetch(submission.userId);
    const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
    
    const attachment = await generateQuestCompleteCard(updatedUser, quest, avatarURL, submission.username);

    const guild = await client.guilds.fetch(submission.guildId);
    const channel = await guild.channels.fetch(submission.channelId);

    await channel.send({
      content: `<@${submission.userId}>`,
      files: [attachment]
    });

    if (canSelectClass(submission.userId)) {
      const level10Card = await generateLevel10Card(submission.username);
      await channel.send({
        content: `<@${submission.userId}>`,
        files: [level10Card]
      });

      const classCard = await generateClassSelectionCard();
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`class_select_Assassin_${submission.userId}`)
            .setLabel('Assassin')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚔️'),
          new ButtonBuilder()
            .setCustomId(`class_select_Mage_${submission.userId}`)
            .setLabel('Mage')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔮'),
          new ButtonBuilder()
            .setCustomId(`class_select_Tank_${submission.userId}`)
            .setLabel('Tank')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🛡️'),
          new ButtonBuilder()
            .setCustomId(`class_select_Spy_${submission.userId}`)
            .setLabel('Spy')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🕵️')
        );

      await targetUser.send({ 
        content: 'You have unlocked class selection! Choose your specialization:',
        files: [classCard], 
        components: [row] 
      });
    }
  } catch (error) {
    console.error('Error sending completion notification:', error);
  }
}

async function handleRejectSubmission(interaction) {
  const submissionId = interaction.customId.replace('reject_submission_', '');
  const submission = getQuestSubmission(submissionId);

  if (!submission) {
    return interaction.reply({ content: 'Submission not found.', ephemeral: true });
  }

  removeQuestSubmission(submissionId);

  await interaction.update({
    content: `Quest submission rejected for ${submission.username}.`,
    embeds: [],
    components: []
  });

  try {
    const targetUser = await client.users.fetch(submission.userId);
    const embed = new EmbedBuilder()
      .setTitle('❌ Quest Not Approved')
      .setDescription('The Guild Master has determined that the quest requirements were not fully met. Please try again.')
      .setColor(0xFF0000);

    await targetUser.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending rejection notification:', error);
  }
}

async function handleClassSelect(interaction) {
  const parts = interaction.customId.replace('class_select_', '').split('_');
  const className = parts[0];
  const targetUserId = parts[1] || interaction.user.id;

  if (interaction.user.id !== targetUserId) {
    return interaction.reply({ content: 'This class selection is not for you!', ephemeral: true });
  }

  const user = getUser(interaction.user.id);

  if (user.class) {
    return interaction.reply({ content: 'You have already selected a class!', ephemeral: true });
  }

  if (user.level < 10) {
    return interaction.reply({ content: 'You must be Level 10 to select a class!', ephemeral: true });
  }

  const attachment = await generateClassConfirmCard(className);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`class_confirm_${className}_${interaction.user.id}`)
        .setLabel('Yes, Confirm')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`class_cancel_${interaction.user.id}`)
        .setLabel('No, Go Back')
        .setStyle(ButtonStyle.Danger)
    );

  await interaction.update({ files: [attachment], components: [row] });
}

async function handleClassConfirm(interaction) {
  const parts = interaction.customId.replace('class_confirm_', '').split('_');
  const className = parts[0];
  const targetUserId = parts[1] || interaction.user.id;

  if (interaction.user.id !== targetUserId) {
    return interaction.reply({ content: 'This confirmation is not for you!', ephemeral: true });
  }

  const user = getUser(interaction.user.id);

  if (user.class) {
    return interaction.reply({ content: 'You have already selected a class!', ephemeral: true });
  }

  setUserClass(interaction.user.id, className);

  const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
  const attachment = await generateClassSelectedCard(className, avatarURL, interaction.user.username);

  await interaction.update({ 
    content: null,
    files: [attachment], 
    components: [] 
  });
}

async function handleClassCancel(interaction) {
  const targetUserId = interaction.customId.includes('_') 
    ? interaction.customId.split('_').pop() 
    : interaction.user.id;

  if (interaction.user.id !== targetUserId) {
    return interaction.reply({ content: 'This is not for you!', ephemeral: true });
  }

  const attachment = await generateClassSelectionCard();
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`class_select_Assassin_${interaction.user.id}`)
        .setLabel('Assassin')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⚔️'),
      new ButtonBuilder()
        .setCustomId(`class_select_Mage_${interaction.user.id}`)
        .setLabel('Mage')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔮'),
      new ButtonBuilder()
        .setCustomId(`class_select_Tank_${interaction.user.id}`)
        .setLabel('Tank')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🛡️'),
      new ButtonBuilder()
        .setCustomId(`class_select_Spy_${interaction.user.id}`)
        .setLabel('Spy')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🕵️')
    );

  await interaction.update({ files: [attachment], components: [row] });
}

async function handleLegacyApprove(interaction) {
  const reviewId = interaction.customId.replace('approve_quest_', '');
  const reviews = getPendingReviews();
  const review = reviews[reviewId];

  if (!review) {
    return interaction.reply({ content: 'This review is no longer valid.', ephemeral: true });
  }

  const quest = getQuest(review.questId);
  if (!quest) {
    return interaction.reply({ content: 'Quest not found.', ephemeral: true });
  }

  const updatedUser = addXP(review.userId, quest.xpReward);
  removePendingReview(reviewId);

  await interaction.update({
    content: `Quest approved for ${review.username}! They received ${quest.xpReward} XP.`,
    embeds: [],
    components: []
  });

  try {
    const targetUser = await client.users.fetch(review.userId);
    const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
    
    const attachment = await generateQuestCompleteCard(updatedUser, quest, avatarURL, review.username);

    const guild = await client.guilds.fetch(review.guildId);
    const channel = await guild.channels.fetch(review.channelId);

    await channel.send({
      content: `<@${review.userId}>`,
      files: [attachment]
    });
  } catch (error) {
    console.error('Error sending completion notification:', error);
  }
}

async function handleLegacyReject(interaction) {
  const reviewId = interaction.customId.replace('reject_quest_', '');
  const reviews = getPendingReviews();
  const review = reviews[reviewId];

  if (!review) {
    return interaction.reply({ content: 'This review is no longer valid.', ephemeral: true });
  }

  removePendingReview(reviewId);

  await interaction.update({
    content: `Quest rejected for ${review.username}.`,
    embeds: [],
    components: []
  });

  try {
    const targetUser = await client.users.fetch(review.userId);
    const embed = new EmbedBuilder()
      .setTitle('❌ Quest Not Approved')
      .setDescription('The Guild Master has determined that the quest requirements were not fully met.')
      .setColor(0xFF0000);

    await targetUser.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending rejection notification:', error);
  }
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN environment variable is not set!');
  console.log('Please set your Discord bot token in the Secrets tab.');
  process.exit(1);
}

client.login(token);
