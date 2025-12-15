import { SlashCommandBuilder } from 'discord.js';
import { resetPlayer, getUser } from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('reset')
  .setDescription('Reset a player\'s progress (Host only)')
  .addUserOption(option =>
    option.setName('player')
      .setDescription('The player to reset')
      .setRequired(true));

export async function execute(interaction) {
  const hostId = process.env.HOST_ID;
  
  if (interaction.user.id !== hostId) {
    return interaction.reply({ 
      content: 'Only the Guild Master can use this command.', 
      ephemeral: true 
    });
  }

  const targetUser = interaction.options.getUser('player');
  
  if (!targetUser) {
    return interaction.reply({ 
      content: 'Please specify a valid player to reset.', 
      ephemeral: true 
    });
  }

  const existingUser = getUser(targetUser.id);
  if (!existingUser || (existingUser.level === 0 && existingUser.xp === 0 && !existingUser.accepted)) {
    return interaction.reply({ 
      content: `**${targetUser.username}** has no progress to reset.`, 
      ephemeral: true 
    });
  }

  const success = resetPlayer(targetUser.id);
  
  if (success) {
    return interaction.reply({ 
      content: `Successfully reset all progress for **${targetUser.username}**. They will need to accept becoming a player again.`, 
      ephemeral: true 
    });
  } else {
    return interaction.reply({ 
      content: `Failed to reset progress for **${targetUser.username}**.`, 
      ephemeral: true 
    });
  }
}
