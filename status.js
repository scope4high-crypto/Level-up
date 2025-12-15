import { SlashCommandBuilder } from 'discord.js';
import { getUser } from '../database.js';
import { generateStatusCard } from '../statusCard.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('View your hunter status card');

export async function execute(interaction) {
  await interaction.deferReply();

  const user = getUser(interaction.user.id);
  const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
  const username = interaction.user.username;

  try {
    const attachment = await generateStatusCard(user, avatarURL, username);
    await interaction.editReply({ files: [attachment] });
  } catch (error) {
    console.error('Error generating status card:', error);
    await interaction.editReply('Failed to generate status card. Please try again.');
  }
}
