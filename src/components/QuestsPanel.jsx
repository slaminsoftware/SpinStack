// src/components/QuestsPanel.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { shared, palette } from '../theme';
import { getActiveQuests, claimQuest, initDailyQuestsIfNeeded } from '../game/quests';

export default function QuestsPanel({ onClaimed }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    initDailyQuestsIfNeeded().then(() => getActiveQuests()).then((q) => {
      if (!mounted) return;
      setQuests(q || []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const handleClaim = async (id) => {
    const res = await claimQuest(id);
    if (res.ok) {
      setQuests((s) => s.map((q) => (q.id === id ? { ...q, claimed: true } : q)));
      if (onClaimed) onClaimed(res.reward);
    }
  };

  if (loading) return null;

  return (
    <View style={[shared.card, styles.panel]}>
      <Text style={shared.sectionTitle}>DAILY QUESTS</Text>
      {quests.map((q) => (
        <View key={q.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{q.title}</Text>
            <Text style={styles.desc}>{q.desc}</Text>
            <Text style={styles.progress}>{q.progress}/{q.target} — {q.completed ? 'Ready' : 'In progress'}</Text>
          </View>
          <View style={styles.actions}>
            {!q.completed && <Text style={styles.locked}>Locked</Text>}
            {q.completed && !q.claimed && (
              <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim(q.id)}>
                <Text style={styles.claimText}>CLAIM</Text>
              </TouchableOpacity>
            )}
            {q.claimed && <Text style={styles.claimed}>CLAIMED</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#202040' },
  title: { color: palette.textPrimary, fontWeight: '800' },
  desc: { color: palette.textMuted, fontSize: 12, marginTop: 4 },
  progress: { color: '#a0a0ff', fontSize: 12, marginTop: 4 },
  actions: { marginLeft: 12, alignItems: 'center' },
  claimBtn: { backgroundColor: '#ffd700', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  claimText: { fontWeight: '900', color: '#1a1a3e' },
  locked: { color: palette.textMuted },
  claimed: { color: '#39c939', fontWeight: '800' },
});