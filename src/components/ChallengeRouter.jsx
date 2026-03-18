// src/components/ChallengeRouter.jsx
// Rotates through challenges in order (1→2→3→repeat), no random selection.

import React, { useRef } from 'react';
import BlindDropChallenge from './BlindDropChallenge';
import ColorGauntletChallenge from './ColorGauntletChallenge';
import SequenceDropChallenge from './SequenceDropChallenge';

const CHALLENGES = [
  BlindDropChallenge,
  ColorGauntletChallenge,
  SequenceDropChallenge,
];

// Module-level counter so the sequence persists across re-mounts
let challengeIndex = 0;

export default function ChallengeRouter({ wave, onComplete }) {
  // Freeze the choice for the lifetime of this mount
  const indexRef = useRef(null);
  if (indexRef.current === null) {
    indexRef.current = challengeIndex % CHALLENGES.length;
    challengeIndex += 1;
  }

  const Challenge = CHALLENGES[indexRef.current];
  return <Challenge wave={wave} onComplete={onComplete} />;
}
