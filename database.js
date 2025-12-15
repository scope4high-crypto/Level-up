import fs from 'fs';
import path from 'path';

const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const QUESTS_FILE = path.join(DATA_DIR, 'quests.json');
const PENDING_REVIEWS_FILE = path.join(DATA_DIR, 'pending_reviews.json');
const QUEST_SUBMISSIONS_FILE = path.join(DATA_DIR, 'quest_submissions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadData(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading ${file}:`, error);
  }
  return {};
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const users = loadData(USERS_FILE);
const quests = loadData(QUESTS_FILE);
const pendingReviews = loadData(PENDING_REVIEWS_FILE);
const questSubmissions = loadData(QUEST_SUBMISSIONS_FILE);

export function getUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      title: 'None',
      job: 'Not Assigned',
      class: null,
      level: 0,
      xp: 0,
      rank: 'E',
      questsCompleted: 0,
      activeQuests: [],
      accepted: false
    };
    saveUsers();
  }
  return users[userId];
}

export function isPlayerAccepted(userId) {
  const user = getUser(userId);
  return user.accepted === true;
}

export function acceptPlayer(userId) {
  const user = getUser(userId);
  user.accepted = true;
  saveUsers();
  return user;
}

export function resetPlayer(userId) {
  if (users[userId]) {
    users[userId] = {
      id: userId,
      title: 'None',
      job: 'Not Assigned',
      class: null,
      level: 0,
      xp: 0,
      rank: 'E',
      questsCompleted: 0,
      activeQuests: [],
      accepted: false
    };
    saveUsers();
    return true;
  }
  return false;
}

export function updateUser(userId, updates) {
  const user = getUser(userId);
  Object.assign(user, updates);
  saveUsers();
  return user;
}

export function getXPRequired(level) {
  return 1000 + (level * 200);
}

export function addXP(userId, amount) {
  const user = getUser(userId);
  user.xp += amount;
  
  let xpRequired = getXPRequired(user.level);
  while (user.xp >= xpRequired) {
    user.xp -= xpRequired;
    user.level += 1;
    xpRequired = getXPRequired(user.level);
    updateRank(user);
  }
  
  user.questsCompleted += 1;
  saveUsers();
  return user;
}

function updateRank(user) {
  const rankThresholds = [
    { rank: 'N', level: 100 },
    { rank: 'S', level: 75 },
    { rank: 'A', level: 50 },
    { rank: 'B', level: 35 },
    { rank: 'C', level: 25 },
    { rank: 'D', level: 10 },
    { rank: 'E', level: 0 }
  ];
  
  for (const threshold of rankThresholds) {
    if (user.level >= threshold.level) {
      user.rank = threshold.rank;
      break;
    }
  }
}

export function setUserClass(userId, className) {
  const user = getUser(userId);
  user.class = className;
  saveUsers();
  return user;
}

export function canSelectClass(userId) {
  const user = getUser(userId);
  return user.level >= 10 && user.class === null;
}

function saveUsers() {
  saveData(USERS_FILE, users);
}

export function createQuest(quest) {
  const id = Date.now().toString();
  quests[id] = {
    id,
    ...quest,
    createdAt: new Date().toISOString(),
    expiresAt: quest.duration ? new Date(Date.now() + quest.duration * 60 * 60 * 1000).toISOString() : null,
    acceptedBy: [],
    active: true
  };
  saveQuests();
  return quests[id];
}

export function getQuest(questId) {
  return quests[questId];
}

export function getAllQuests() {
  const now = new Date();
  return Object.values(quests).filter(q => {
    if (!q.active) return false;
    if (q.expiresAt && new Date(q.expiresAt) < now) {
      q.active = false;
      saveQuests();
      return false;
    }
    return true;
  });
}

export function canAcceptQuest(questId, userId) {
  const quest = getQuest(questId);
  if (!quest || !quest.active) return { can: false, reason: 'Quest not found or inactive' };
  
  if (quest.expiresAt && new Date(quest.expiresAt) < new Date()) {
    return { can: false, reason: 'Quest has expired' };
  }
  
  if (quest.acceptedBy.includes(userId)) {
    return { can: false, reason: 'You have already accepted this quest' };
  }
  
  if (quest.maxParticipants && quest.acceptedBy.length >= quest.maxParticipants) {
    return { can: false, reason: 'Quest has reached maximum participants' };
  }
  
  return { can: true };
}

export function acceptQuest(questId, userId) {
  const quest = getQuest(questId);
  if (quest && !quest.acceptedBy.includes(userId)) {
    quest.acceptedBy.push(userId);
    saveQuests();
  }
  
  const user = getUser(userId);
  if (!user.activeQuests) {
    user.activeQuests = [];
  }
  if (!user.activeQuests.includes(questId)) {
    user.activeQuests.push(questId);
    saveUsers();
  }
  
  return quest;
}

export function completeQuestForUser(questId, userId) {
  const user = getUser(userId);
  if (!user.activeQuests) {
    user.activeQuests = [];
  }
  user.activeQuests = user.activeQuests.filter(q => q !== questId);
  saveUsers();
}

export function deactivateQuest(questId) {
  if (quests[questId]) {
    quests[questId].active = false;
    saveQuests();
  }
}

function saveQuests() {
  saveData(QUESTS_FILE, quests);
}

export function getPendingReviews() {
  return pendingReviews;
}

export function savePendingReview(reviewId, data) {
  pendingReviews[reviewId] = data;
  saveData(PENDING_REVIEWS_FILE, pendingReviews);
}

export function removePendingReview(reviewId) {
  delete pendingReviews[reviewId];
  saveData(PENDING_REVIEWS_FILE, pendingReviews);
}

export function getQuestSubmissions() {
  return questSubmissions;
}

export function saveQuestSubmission(submissionId, data) {
  questSubmissions[submissionId] = data;
  saveData(QUEST_SUBMISSIONS_FILE, questSubmissions);
}

export function getQuestSubmission(submissionId) {
  return questSubmissions[submissionId];
}

export function removeQuestSubmission(submissionId) {
  delete questSubmissions[submissionId];
  saveData(QUEST_SUBMISSIONS_FILE, questSubmissions);
}
