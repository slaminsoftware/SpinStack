// src/SpinStackApp.jsx
// Root application component.
// Manages which screen is visible (tutorial → start → game → end).

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LEVELS } from './game/constants';
import { palette } from './theme';
import { getTutorialComplete, setTutorialComplete } from './game/storage';
import IAPManager    from './game/IAPManager';
import StartScreen   from './components/StartScreen';
import EndScreen     from './components/EndScreen';
import TutorialScreen from './components/TutorialScreen';
import Game          from './components/Game';

export default function SpinStackApp() {
  const [screen,        setScreen]        = useState('loading');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [levelConfig,   setLevelConfig]   = useState(LEVELS[0]);
  const [wave,          setWave]          = useState(1);
  const [gameResult,    setGameResult]    = useState(null);
  const [finalScore,    setFinalScore]    = useState(0);
  const [sessionStats,  setSessionStats]  = useState(null);

  useEffect(() => {
    // Initialise RevenueCat as early as possible so the price is ready by the
    // time the player reaches the End Screen. init() is a no-op if called again.
    IAPManager.init().catch(() => {});

    getTutorialComplete().then(done => {
      setScreen(done ? 'start' : 'tutorial');
    });
  }, []);

  // Build a config for the current wave — each wave adds 1 extra start row
  const buildConfig = useCallback((levelIdx, waveNum) => {
    const base = LEVELS[levelIdx];
    return { ...base, startRows: base.startRows + (waveNum - 1) };
  }, []);

  const handleGameEnd = useCallback((didWin, score, stats) => {
    setFinalScore(score);
    setSessionStats(stats);
    if (didWin) {
      setGameResult('win');
      // Advance to next wave — same difficulty, one more starting row
      setWave(w => {
        const nextWave = w + 1;
        setLevelConfig(buildConfig(selectedLevel, nextWave));
        return nextWave;
      });
      setScreen('game');
    } else {
      setGameResult('lose');
      setScreen('end');
    }
  }, [selectedLevel, buildConfig]);

  const handleStart = useCallback(() => {
    const startWave = 1;
    setWave(startWave);
    setLevelConfig(buildConfig(selectedLevel, startWave));
    setScreen('game');
  }, [selectedLevel, buildConfig]);

  const handleTutorialComplete = useCallback(async () => {
    await setTutorialComplete();
    setScreen('start');
  }, []);

  if (screen === 'loading') return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      {screen === 'tutorial' && (
        <TutorialScreen onComplete={handleTutorialComplete} />
      )}

      {screen === 'start' && (
        <StartScreen
          levels={LEVELS}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onStart={handleStart}
          onTutorial={() => setScreen('tutorial')}
        />
      )}

      {screen === 'game' && (
        <Game
          key={`${selectedLevel}-${wave}`}
          levelConfig={levelConfig}
          selectedLevelIndex={selectedLevel}
          wave={wave}
          onGameEnd={handleGameEnd}
        />
      )}

      {screen === 'end' && (
        <EndScreen
          didWin={gameResult === 'win'}
          score={finalScore}
          sessionStats={sessionStats}
          selectedLevelIndex={selectedLevel}
          wave={wave}
          onRestart={handleStart}
          onMenu={() => setScreen('start')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
});

