// src/game/quests.js
// Simple daily/session quest system.

import { getQuestState, setQuestState, addPlayerXP } from './storage';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const QUEST_TEMPLATES = [
  { type: 'clear_rows', title: (n) => `Clear ${n} rows`, desc: (n) => `Clear ${n} rows in any games.`, rewardXP: (n) => n * 12 },
  { type: 'tap_tiles', title: (n) => `Tap ${n} tiles`, desc: (n) => `Tap ${n} tiles across games.`, rewardXP: (n) => Math.max(10, Math.floor(n * 0.6)) },
  { type: 'clear_waves', title: (n) => `Clear ${n} waves`, desc: (n) => `Clear ${n} waves in a session.`, rewardXP: (n) => n * 40 },
  { type: 'use_freeze', title: (n) => `Use ${n} freezes`, desc: (n) => `Use Freeze powerups ${n} times.`, rewardXP: (n) => n * 20 },
];

function randRange(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function makeDailyQuests() {
  // pick 3 quests
  const picks = [];
  // ensure variety
  const types = ['clear_rows', 'tap_tiles', 'clear_waves', 'use_freeze'];
  while (picks.length < 3) {
    const t = types[picks.length % types.length];
    let target = 1;
    switch (t) {
      case 'clear_rows': target = randRange(3, 6); break;
      case 'tap_tiles': target = randRange(80, 180); break;
      case 'clear_waves': target = randRange(1, 3); break;
      case 'use_freeze': target = randRange(1, 2); break;
    }
    const tpl = QUEST_TEMPLATES.find((q) => q.type === t);
    picks.push({
      id: `${t}:${Date.now()}:${Math.random().toString(36).slice(2,6)}`,
      type: t,
      title: tpl.title(target),
      desc: tpl.desc(target),
      target,
      progress: 0,
      reward: { xp: tpl.rewardXP(target) },
      claimed: false,
      completed: false,
    });
  }
  return picks;
}

export async function initDailyQuestsIfNeeded() {
  const state = await getQuestState();
  const today = todayStr();
  if (!state || state.lastReset !== today) {
    const quests = makeDailyQuests();
    const next = { lastReset: today, quests };
    await setQuestState(next);
    return next;
  }
  return state;
}

export async function getActiveQuests() {
  const s = await initDailyQuestsIfNeeded();
  return s.quests;
}

export async function incrementProgress(kind, amount) {
  // kind corresponds to quest.type mapping
  const state = (await initDailyQuestsIfNeeded()) || { quests: [] };
  const changed = [];
  state.quests = state.quests.map((q) => {
    if (q.claimed || q.completed) return q;
    if ((q.type === 'tap_tiles' && kind === 'tap') ||
        (q.type === 'clear_rows' && kind === 'clear_rows') ||
        (q.type === 'clear_waves' && kind === 'clear_waves') ||
        (q.type === 'use_freeze' && kind === 'use_freeze')) {
      const np = Math.min(q.target, q.progress + amount);
      const completed = np >= q.target;
      if (completed) changed.push({ ...q, progress: np, completed: true });
      return { ...q, progress: np, completed };
    }
    return q;
  });
  await setQuestState(state);
  return changed; // array of newly completed quests
}

export async function claimQuest(id) {
  const state = await initDailyQuestsIfNeeded();
  const q = state.quests.find((x) => x.id === id);
  if (!q) return { ok: false, reason: 'not_found' };
  if (!q.completed) return { ok: false, reason: 'not_completed' };
  if (q.claimed) return { ok: false, reason: 'already_claimed' };

  // give reward (XP for now)
  if (q.reward && q.reward.xp) {
    await addPlayerXP(q.reward.xp);
  }
  q.claimed = true;
  await setQuestState(state);
  return { ok: true, reward: q.reward };
}
