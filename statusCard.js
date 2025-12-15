import { createCanvas, loadImage } from 'canvas';
import { AttachmentBuilder } from 'discord.js';
import { getXPRequired } from './database.js';

const RANK_COLORS = {
  'E': '#808080',
  'D': '#90EE90',
  'C': '#9400D3',
  'B': '#FFD700',
  'A': '#C0C0C0',
  'S': '#DC143C',
  'N': '#FFD700'
};

const RANK_THEMES = {
  'E': { bg1: '#0a0a1a', bg2: '#1a1a3a', border: '#808080', glow: 'rgba(128, 128, 128, 0.3)' },
  'D': { bg1: '#0a1a0a', bg2: '#1a3a1a', border: '#90EE90', glow: 'rgba(144, 238, 144, 0.3)' },
  'C': { bg1: '#1a0a2a', bg2: '#2a1a4a', border: '#9400D3', glow: 'rgba(148, 0, 211, 0.4)' },
  'B': { bg1: '#1a1a0a', bg2: '#3a3a1a', border: '#FFD700', glow: 'rgba(255, 215, 0, 0.3)' },
  'A': { bg1: '#1a1a1a', bg2: '#3a3a3a', border: '#C0C0C0', glow: 'rgba(192, 192, 192, 0.4)' },
  'S': { bg1: '#2a0a0a', bg2: '#4a1a1a', border: '#DC143C', glow: 'rgba(220, 20, 60, 0.5)' },
  'N': { bg1: '#2a2a0a', bg2: '#4a4a1a', border: '#FFD700', glow: 'rgba(255, 215, 0, 0.6)' }
};

const RANK_GLOW = {
  'E': 'rgba(128, 128, 128, 0.3)',
  'D': 'rgba(144, 238, 144, 0.4)',
  'C': 'rgba(148, 0, 211, 0.4)',
  'B': 'rgba(255, 215, 0, 0.4)',
  'A': 'rgba(192, 192, 192, 0.5)',
  'S': 'rgba(220, 20, 60, 0.5)',
  'N': 'rgba(255, 215, 0, 0.6)'
};

const CLASS_INFO = {
  'Assassin': { color: '#FF4444', emoji: '⚔️', desc: 'Offensive specialist' },
  'Mage': { color: '#9944FF', emoji: '🔮', desc: 'Stealth support' },
  'Tank': { color: '#44AA44', emoji: '🛡️', desc: 'Frontline deployed' },
  'Spy': { color: '#4444FF', emoji: '🕵️', desc: 'Intel gatherer' }
};

export async function generateStatusCard(user, avatarURL, username) {
  const width = 600;
  const height = 380;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const theme = RANK_THEMES[user.rank];
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, theme.bg1);
  gradient.addColorStop(0.5, theme.bg2);
  gradient.addColorStop(1, theme.bg1);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 20;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.shadowBlur = 0;

  try {
    const avatar = await loadImage(avatarURL);
    const avatarSize = 100;
    const avatarX = 40;
    const avatarY = 40;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.strokeStyle = RANK_COLORS[user.rank];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (error) {
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(90, 90, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(username, 160, 70);

  ctx.font = '18px Arial';
  ctx.fillStyle = '#888888';
  ctx.fillText(`Hunter ID: ${user.id.slice(-8)}`, 160, 95);

  if (user.class) {
    const classInfo = CLASS_INFO[user.class];
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = classInfo.color;
    ctx.fillText(`${classInfo.emoji} ${user.class}`, 160, 120);
  }

  const statsY = 160;
  const leftCol = 40;
  const rightCol = 320;

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText('TITLE', leftCol, statsY);
  ctx.font = '20px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(user.title, leftCol, statsY + 25);

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText('JOB', rightCol, statsY);
  ctx.font = '20px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(user.job, rightCol, statsY + 25);

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText('LEVEL', leftCol, statsY + 60);
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = RANK_COLORS[user.rank];
  ctx.fillText(user.level.toString(), leftCol, statsY + 95);

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText('RANK', rightCol, statsY + 60);
  ctx.font = 'bold 48px Arial';
  ctx.shadowColor = RANK_GLOW[user.rank];
  ctx.shadowBlur = 15;
  ctx.fillStyle = RANK_COLORS[user.rank];
  ctx.fillText(user.rank, rightCol, statsY + 100);
  ctx.shadowBlur = 0;

  const barX = 40;
  const barY = 330;
  const barWidth = 520;
  const barHeight = 25;

  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const xpRequired = getXPRequired(user.level);
  const progress = user.xp / xpRequired;
  const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * progress, barY);
  progressGradient.addColorStop(0, RANK_COLORS[user.rank]);
  progressGradient.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = progressGradient;
  ctx.fillRect(barX, barY, barWidth * progress, barHeight);

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(`${user.xp} / ${xpRequired} XP`, barX + barWidth / 2, barY + 17);
  ctx.textAlign = 'left';

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'status-card.png' });
}

export async function generateQuestCompleteCard(user, quest, avatarURL, username) {
  const width = 600;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const theme = RANK_THEMES[user.rank];
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, theme.bg1);
  gradient.addColorStop(0.5, theme.bg2);
  gradient.addColorStop(1, theme.bg1);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.font = 'bold 36px Arial';
  ctx.fillStyle = '#00FF00';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.fillText('QUEST COMPLETE!', width / 2, 60);
  ctx.shadowBlur = 0;

  try {
    const avatar = await loadImage(avatarURL);
    const avatarSize = 80;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, 130, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, width / 2 - avatarSize / 2, 90, avatarSize, avatarSize);
    ctx.restore();

    ctx.strokeStyle = RANK_COLORS[user.rank];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(width / 2, 130, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (error) {}

  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(username, width / 2, 200);

  ctx.font = '20px Arial';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText(`"${quest.title}"`, width / 2, 240);

  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = RANK_COLORS[quest.rank];
  ctx.fillText(`Rank ${quest.rank} Quest`, width / 2, 275);

  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(`+${quest.xpReward} XP`, width / 2, 320);
  ctx.shadowBlur = 0;

  const xpRequired = getXPRequired(user.level);
  ctx.font = '18px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`Level: ${user.level} | XP: ${user.xp}/${xpRequired} | Rank: ${user.rank}`, width / 2, 365);

  ctx.textAlign = 'left';

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'quest-complete.png' });
}

export async function generateClassSelectionCard() {
  const width = 600;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0a2a');
  gradient.addColorStop(0.5, '#1a1a4a');
  gradient.addColorStop(1, '#0a0a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#4444FF';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);
  ctx.shadowColor = 'rgba(68, 68, 255, 0.5)';
  ctx.shadowBlur = 20;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(68, 68, 255, 0.8)';
  ctx.shadowBlur = 15;
  ctx.fillText('CHOOSE YOUR CLASS', width / 2, 50);
  ctx.shadowBlur = 0;

  ctx.font = '16px Arial';
  ctx.fillStyle = '#888888';
  ctx.fillText('You have reached Level 10! Select your specialization.', width / 2, 80);

  const classes = [
    { name: 'Assassin', emoji: '⚔️', color: '#FF4444', desc: 'Offensive specialist - Strike hard and fast' },
    { name: 'Mage', emoji: '🔮', color: '#9944FF', desc: 'Stealth support - Aid from the shadows' },
    { name: 'Tank', emoji: '🛡️', color: '#44AA44', desc: 'Frontline - Deployed for direct tasks' },
    { name: 'Spy', emoji: '🕵️', color: '#4488FF', desc: 'Intel gatherer - Operate in enemy territory' }
  ];

  const cardWidth = 250;
  const cardHeight = 120;
  const startX = 50;
  const startY = 110;
  const gap = 20;

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    const x = startX + (i % 2) * (cardWidth + gap);
    const y = startY + Math.floor(i / 2) * (cardHeight + gap);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, cardWidth, cardHeight);
    
    ctx.strokeStyle = cls.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cardWidth, cardHeight);

    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = cls.color;
    ctx.textAlign = 'left';
    ctx.fillText(`${cls.emoji} ${cls.name}`, x + 15, y + 35);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#CCCCCC';
    const words = cls.desc.split(' ');
    let line = '';
    let lineY = y + 60;
    for (const word of words) {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > cardWidth - 30) {
        ctx.fillText(line, x + 15, lineY);
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x + 15, lineY);
  }

  ctx.textAlign = 'center';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#FFAA00';
  ctx.fillText('Click a button below to select your class', width / 2, 380);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'class-selection.png' });
}

export async function generateClassConfirmCard(className) {
  const width = 500;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0a2a');
  gradient.addColorStop(0.5, '#1a1a4a');
  gradient.addColorStop(1, '#0a0a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#FFAA00';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#FFAA00';
  ctx.textAlign = 'center';
  ctx.fillText('CONFIRM YOUR CHOICE', width / 2, 50);

  const classInfo = CLASS_INFO[className];
  ctx.font = 'bold 36px Arial';
  ctx.fillStyle = classInfo.color;
  ctx.shadowColor = classInfo.color;
  ctx.shadowBlur = 15;
  ctx.fillText(`${classInfo.emoji} ${className}`, width / 2, 110);
  ctx.shadowBlur = 0;

  ctx.font = '18px Arial';
  ctx.fillStyle = '#FF6666';
  ctx.fillText('WARNING: This choice is PERMANENT!', width / 2, 160);

  ctx.font = '16px Arial';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText('You cannot change your class later.', width / 2, 190);

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Are you sure?', width / 2, 225);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'class-confirm.png' });
}

export async function generateClassSelectedCard(className, avatarURL, username) {
  const width = 500;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const classInfo = CLASS_INFO[className];
  
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0a2a');
  gradient.addColorStop(0.5, '#1a1a4a');
  gradient.addColorStop(1, '#0a0a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = classInfo.color;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);
  ctx.shadowColor = classInfo.color;
  ctx.shadowBlur = 20;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#00FF00';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
  ctx.shadowBlur = 15;
  ctx.fillText('CLASS ASSIGNED!', width / 2, 50);
  ctx.shadowBlur = 0;

  try {
    const avatar = await loadImage(avatarURL);
    const avatarSize = 70;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, 110, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, width / 2 - avatarSize / 2, 75, avatarSize, avatarSize);
    ctx.restore();
  } catch (error) {}

  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(username, width / 2, 175);

  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = classInfo.color;
  ctx.shadowColor = classInfo.color;
  ctx.shadowBlur = 15;
  ctx.fillText(`${classInfo.emoji} ${className}`, width / 2, 220);
  ctx.shadowBlur = 0;

  ctx.font = '16px Arial';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText(classInfo.desc, width / 2, 260);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'class-selected.png' });
}

export async function generatePlayerAcceptCard() {
  const width = 500;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0a2a');
  gradient.addColorStop(0.5, '#1a1a4a');
  gradient.addColorStop(1, '#0a0a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#4488FF';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);
  ctx.shadowColor = 'rgba(68, 136, 255, 0.6)';
  ctx.shadowBlur = 20;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#4488FF';
  ctx.textAlign = 'center';
  ctx.fillText('[SYSTEM]', width / 2, 40);

  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(68, 136, 255, 0.8)';
  ctx.shadowBlur = 15;
  ctx.fillText('PLAYER REGISTRATION', width / 2, 80);
  ctx.shadowBlur = 0;

  ctx.font = '18px Arial';
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText('A new hunter has been detected.', width / 2, 130);

  ctx.font = 'bold 22px Arial';
  ctx.fillStyle = '#FFAA00';
  ctx.shadowColor = 'rgba(255, 170, 0, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText('Do you accept to become a Player?', width / 2, 180);
  ctx.shadowBlur = 0;

  ctx.font = '14px Arial';
  ctx.fillStyle = '#888888';
  ctx.fillText('This decision will unlock all system features.', width / 2, 220);

  ctx.font = '12px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText('Choose wisely, Hunter.', width / 2, 260);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'player-accept.png' });
}

export async function generateLevel10Card(username) {
  const width = 500;
  const height = 320;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a0a2a');
  gradient.addColorStop(0.5, '#2a1a4a');
  gradient.addColorStop(1, '#1a0a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#9944FF';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);
  ctx.shadowColor = 'rgba(153, 68, 255, 0.6)';
  ctx.shadowBlur = 25;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#9944FF';
  ctx.textAlign = 'center';
  ctx.fillText('[SYSTEM NOTIFICATION]', width / 2, 40);

  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillText('LEVEL 10 ACHIEVED!', width / 2, 90);
  ctx.shadowBlur = 0;

  ctx.font = '18px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`Congratulations, ${username}!`, width / 2, 135);

  ctx.font = '16px Arial';
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText('You have proven your worth as a hunter.', width / 2, 170);

  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#00FF88';
  ctx.shadowColor = 'rgba(0, 255, 136, 0.6)';
  ctx.shadowBlur = 15;
  ctx.fillText('CLASS SELECTION UNLOCKED', width / 2, 215);
  ctx.shadowBlur = 0;

  ctx.font = '15px Arial';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText('You are now eligible to choose your specialization.', width / 2, 250);

  ctx.font = '14px Arial';
  ctx.fillStyle = '#FFAA00';
  ctx.fillText('Use /class to select your path.', width / 2, 285);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'level-10.png' });
}
