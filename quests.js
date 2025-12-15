import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createQuest, getAllQuests, getQuest, savePendingReview, getUser, canAcceptQuest, acceptQuest, saveQuestSubmission } from '../database.js';

const RANK_COLORS = {
  'E': 0x808080,
  'D': 0x90EE90,
  'C': 0x9400D3,
  'B': 0xFFD700,
  'A': 0xC0C0C0,
  'S': 0xDC143C,
  'N': 0xFFD700
};

const RANK_EMOJIS = {
  'E': '⚪',
  'D': '🟢',
  'C': '🟣',
  'B': '🟡',
  'A': '⚪',
  'S': '🔴',
  'N': '🥇'
};

export const data = new SlashCommandBuilder()
  .setName('quests')
  .setDescription('View available quests or create new ones (host only)')
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('View all available quests'))
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new quest (host only)'))
  .addSubcommand(sub =>
    sub.setName('accept')
      .setDescription('Accept a quest')
      .addStringOption(option =>
        option.setName('quest_id')
          .setDescription('The ID of the quest to accept')
          .setRequired(true)));

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'list') {
    await listQuests(interaction);
  } else if (subcommand === 'create') {
    await createQuestModal(interaction);
  } else if (subcommand === 'accept') {
    await handleAcceptQuest(interaction);
  }
}

async function listQuests(interaction) {
  const quests = getAllQuests();

  if (quests.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Quest Board')
      .setDescription('No quests available at the moment. Check back later!')
      .setColor(0x333333);
    return interaction.reply({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setTitle('📜 Quest Board')
    .setDescription('Available quests from the Hunter Association')
    .setColor(0x1a1a3a)
    .setFooter({ text: 'Use /quests accept <quest_id> to accept a quest' });

  for (const quest of quests.slice(0, 10)) {
    let fieldValue = `${quest.description}\n**XP Reward:** ${quest.xpReward} | **ID:** \`${quest.id}\``;
    
    if (quest.expiresAt) {
      const expiresDate = new Date(quest.expiresAt);
      fieldValue += `\n**Expires:** <t:${Math.floor(expiresDate.getTime() / 1000)}:R>`;
    }
    
    if (quest.maxParticipants) {
      fieldValue += `\n**Slots:** ${quest.acceptedBy.length}/${quest.maxParticipants}`;
    }
    
    embed.addFields({
      name: `${RANK_EMOJIS[quest.rank]} [${quest.rank}] ${quest.title}`,
      value: fieldValue,
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function createQuestModal(interaction) {
  const hostId = process.env.HOST_ID;
  
  if (interaction.user.id !== hostId) {
    return interaction.reply({ 
      content: 'Only the Guild Master can create quests!', 
      ephemeral: true 
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('quest_create_modal')
    .setTitle('Create New Quest');

  const titleInput = new TextInputBuilder()
    .setCustomId('quest_title')
    .setLabel('Quest Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter quest title')
    .setRequired(true)
    .setMaxLength(100);

  const descInput = new TextInputBuilder()
    .setCustomId('quest_description')
    .setLabel('Quest Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe the quest objectives')
    .setRequired(true)
    .setMaxLength(500);

  const rankInput = new TextInputBuilder()
    .setCustomId('quest_rank')
    .setLabel('Difficulty Rank (E, D, C, B, A, S)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('E')
    .setRequired(true)
    .setMaxLength(1);

  const xpInput = new TextInputBuilder()
    .setCustomId('quest_xp')
    .setLabel('XP Reward')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('100')
    .setRequired(true)
    .setMaxLength(5);

  const optionsInput = new TextInputBuilder()
    .setCustomId('quest_options')
    .setLabel('Duration(hrs),MaxParticipants (optional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('24,5 or leave empty for unlimited')
    .setRequired(false)
    .setMaxLength(20);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(rankInput),
    new ActionRowBuilder().addComponents(xpInput),
    new ActionRowBuilder().addComponents(optionsInput)
  );

  await interaction.showModal(modal);
}

async function handleAcceptQuest(interaction) {
  const questId = interaction.options.getString('quest_id');
  const quest = getQuest(questId);

  if (!quest || !quest.active) {
    return interaction.reply({ 
      content: 'Quest not found or no longer available!', 
      ephemeral: true 
    });
  }

  const canAccept = canAcceptQuest(questId, interaction.user.id);
  if (!canAccept.can) {
    return interaction.reply({ 
      content: canAccept.reason, 
      ephemeral: true 
    });
  }

  acceptQuest(questId, interaction.user.id);

  const submissionId = `${interaction.user.id}_${questId}_${Date.now()}`;
  saveQuestSubmission(submissionId, {
    userId: interaction.user.id,
    username: interaction.user.username,
    questId: quest.id,
    questTitle: quest.title,
    questRank: quest.rank,
    questXP: quest.xpReward,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    status: 'pending_submission',
    timestamp: Date.now()
  });

  try {
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Quest Accepted!')
      .setDescription(`You have accepted **${quest.title}**!`)
      .setColor(RANK_COLORS[quest.rank])
      .addFields(
        { name: 'Rank', value: `${RANK_EMOJIS[quest.rank]} ${quest.rank}`, inline: true },
        { name: 'XP Reward', value: quest.xpReward.toString(), inline: true },
        { name: 'Instructions', value: 'Please submit your work below by clicking the button. You can submit text, images, or both as proof of completion.' }
      );

    if (quest.expiresAt) {
      const expiresDate = new Date(quest.expiresAt);
      embed.addFields({ name: 'Deadline', value: `<t:${Math.floor(expiresDate.getTime() / 1000)}:R>`, inline: true });
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`submit_quest_${submissionId}`)
          .setLabel('Submit Work')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝')
      );

    await interaction.user.send({ embeds: [embed], components: [row] });

    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚔️ Quest Accepted!')
      .setDescription(`Check your DMs to submit your work for **${quest.title}**!`)
      .setColor(RANK_COLORS[quest.rank]);

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

  } catch (error) {
    console.error('Error sending DM:', error);
    await interaction.reply({ 
      content: 'Failed to send you a DM. Please enable DMs from server members.', 
      ephemeral: true 
    });
  }
}

export async function handleQuestModal(interaction) {
  const title = interaction.fields.getTextInputValue('quest_title');
  const description = interaction.fields.getTextInputValue('quest_description');
  const rank = interaction.fields.getTextInputValue('quest_rank').toUpperCase();
  const xpReward = parseInt(interaction.fields.getTextInputValue('quest_xp'));
  const optionsRaw = interaction.fields.getTextInputValue('quest_options') || '';

  if (!['E', 'D', 'C', 'B', 'A', 'S'].includes(rank)) {
    return interaction.reply({ 
      content: 'Invalid rank! Please use E, D, C, B, A, or S.', 
      ephemeral: true 
    });
  }

  if (isNaN(xpReward) || xpReward <= 0) {
    return interaction.reply({ 
      content: 'Invalid XP reward! Please enter a positive number.', 
      ephemeral: true 
    });
  }

  let duration = null;
  let maxParticipants = null;

  if (optionsRaw.trim()) {
    const parts = optionsRaw.split(',').map(p => p.trim());
    if (parts[0] && !isNaN(parseInt(parts[0]))) {
      duration = parseInt(parts[0]);
    }
    if (parts[1] && !isNaN(parseInt(parts[1]))) {
      maxParticipants = parseInt(parts[1]);
    }
  }

  const quest = createQuest({
    title,
    description,
    rank,
    xpReward,
    duration,
    maxParticipants,
    createdBy: interaction.user.id
  });

  const embed = new EmbedBuilder()
    .setTitle('📢 New Quest Available!')
    .setDescription('A new quest has been posted to the Quest Board!')
    .setColor(RANK_COLORS[rank])
    .addFields(
      { name: `${RANK_EMOJIS[rank]} ${title}`, value: description },
      { name: 'Difficulty', value: `Rank ${rank}`, inline: true },
      { name: 'XP Reward', value: xpReward.toString(), inline: true },
      { name: 'Quest ID', value: `\`${quest.id}\``, inline: true }
    )
    .setFooter({ text: 'Use /quests accept <quest_id> to accept this quest!' })
    .setTimestamp();

  if (duration) {
    const expiresDate = new Date(quest.expiresAt);
    embed.addFields({ name: 'Duration', value: `${duration} hours (expires <t:${Math.floor(expiresDate.getTime() / 1000)}:R>)`, inline: true });
  }

  if (maxParticipants) {
    embed.addFields({ name: 'Max Participants', value: maxParticipants.toString(), inline: true });
  }

  await interaction.reply({ embeds: [embed] });
}
