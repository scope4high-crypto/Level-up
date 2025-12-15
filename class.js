import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUser } from '../database.js';
import { generateClassSelectionCard } from '../statusCard.js';

export const data = new SlashCommandBuilder()
  .setName('class')
  .setDescription('Choose your class (requires Level 10)');

export async function execute(interaction) {
  const user = getUser(interaction.user.id);

  if (user.level < 10) {
    return interaction.reply({ 
      content: `You must be Level 10 to select a class! You are currently Level ${user.level}.`, 
      ephemeral: true 
    });
  }

  if (user.class) {
    return interaction.reply({ 
      content: `You have already selected your class: **${user.class}**. Class selection is permanent.`, 
      ephemeral: true 
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
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

    await interaction.editReply({ 
      content: 'Choose your class wisely - this is a permanent decision!',
      files: [attachment], 
      components: [row] 
    });
  } catch (error) {
    console.error('Error generating class selection:', error);
    await interaction.editReply('Failed to generate class selection. Please try again.');
  }
}
