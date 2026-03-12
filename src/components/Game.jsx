// src/components/Game.jsx
// Core gameplay component. Owns all game state and logic.
// New features: pause, danger-overtime, efficiency bonus, achievement tracking,
// colorblind mode, RAINBOW dominant-color fix, enriched stats tracking.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, ScrollView, PanResponder, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import GameHeader from "./GameHeader";
import GameBoard from "./GameBoard";
import ScorePopup from "./ScorePopup";
import PowerupToast from "./PowerupToast";
import PauseMenu from "./PauseMenu";
import DangerOvertime from "./DangerOvertime";
import AchievementToast from "./AchievementToast";

import {
  TOTAL_ROWS,
  CLICKS_PER_NEW_ROW,
  POINTS_PER_CLICK,
  POINTS_PER_ROW,
  SIDES,
  ACHIEVEMENTS,
} from "../game/constants";
import {
  makeInitialGrid,
  makeRowSides,
  compactGrid,
  randomColor,
  isSpecial,
  setColorblindMode,
  getActiveColors,
} from "../game/gridHelpers";
import SoundManager from "../game/SoundManager";
import AdManager from "../game/AdManager";
import {
  unlockAchievement,
  incrementBombs,
  getColorblindMode,
  setColorblindModePref,
  getAdsRemoved,
} from "../game/storage";
import { shared, palette } from "../theme";

// How many empty slots remain before danger pulse kicks in
const DANGER_THRESHOLD = 4;
// Overtime seconds when board would overflow
const OVERTIME_SECONDS = 5;

export default function Game({
  onGameEnd,
  levelConfig,
  selectedLevelIndex,
  wave = 1,
}) {
  const clicksPerRow = levelConfig?.clicksPerRow ?? CLICKS_PER_NEW_ROW;
  const spawnChance = levelConfig?.specialChance ?? 0.06;

  // ── State ──────────────────────────────────────────────────────────────────
  const [grid, setGrid] = useState(() => makeInitialGrid(levelConfig));
  const [currentSide, setCurrentSide] = useState(0);
  const [removingRows, setRemovingRows] = useState(new Set());
  // Mirror removingRows in a ref so handleBrickPress always reads the current
  // set without needing it as a useCallback dependency (Sets are mutated in
  // place so React does not detect changes, causing stale closures).
  const removingRowsRef = useRef(new Set());
  const [flashRows, setFlashRows] = useState(new Set());
  const [clickCount, setClickCount] = useState(0);
  const [score, setScore] = useState(0);
  const [freezeBonus, setFreezeBonus] = useState(0);
  const [popups, setPopups] = useState([]);
  const [lastPowerup, setLastPowerup] = useState(null);
  const [rotating, setRotating] = useState(false);
  const [rotateFlash, setRotateFlash] = useState(false);
  const [newRowIndex, setNewRowIndex] = useState(null);

  // New state
  const [paused, setPaused] = useState(false);
  const [colorblind, setColorblind] = useState(false);
  const [overtimeActive, setOvertimeActive] = useState(false);
  const [overtimeSeconds, setOvertimeSeconds] = useState(OVERTIME_SECONDS);
  const [lastAchievement, setLastAchievement] = useState(null);
  const [rewardedReady, setRewardedReady] = useState(false);

  const adsRemovedRef = useRef(false);

  // Session stats for achievements
  const rowsClearedRef = useRef(0);
  const lastRowClearTime = useRef(0);
  const freezeUsedRef = useRef(0);
  const rowTapCountRef = useRef({}); // rowIdx → tap count since last clear

  const processingRef = useRef(false);
  const endCalledRef = useRef(false);
  const scoreRef = useRef(0);
  const popupId = useRef(0);
  const rotatingRef = useRef(false);
  const overtimeRef = useRef(false);
  const overtimeTimer = useRef(null);

  const activeCount = grid.filter((r) => r !== null).length;
  const emptySlots = TOTAL_ROWS - activeCount;
  const clicksUntilNew =
    clicksPerRow - ((clickCount + freezeBonus) % clicksPerRow);

  const dangerUrgency =
    emptySlots <= DANGER_THRESHOLD ? 1 - emptySlots / DANGER_THRESHOLD : 0;

  // ── Load colorblind preference ─────────────────────────────────────────────
  useEffect(() => {
    getColorblindMode().then((enabled) => {
      setColorblind(enabled);
      setColorblindMode(enabled);
    });
  }, []);

  const handleToggleColorblind = useCallback(async () => {
    const next = !colorblind;
    setColorblind(next);
    setColorblindMode(next);
    await setColorblindModePref(next);
    // Rebuild grid with new colors (reset brick colors)
    setGrid((prev) =>
      prev.map((row) => {
        if (!row) return null;
        return {
          sides: row.sides.map((side) =>
            side.map((cell) => (isSpecial(cell) ? cell : randomColor())),
          ),
        };
      }),
    );
  }, [colorblind]);

  // ── Sound + Ad init / teardown ─────────────────────────────────────────────
  useEffect(() => {
    SoundManager.init();
    SoundManager.startMusic();

    let poll = null;

    // Await adsRemoved BEFORE initialising AdManager so there is no race
    // where a fast game-over shows an interstitial to a paying user.
    getAdsRemoved().then((removed) => {
      adsRemovedRef.current = removed;
      // Don't load any ads at all for users who have paid.
      if (removed) return;
      AdManager.init().then(() =>
        setRewardedReady(AdManager.isRewardedReady()),
      );
      // Poll rewarded readiness every 3s so button enables as soon as ad loads
      poll = setInterval(
        () => setRewardedReady(AdManager.isRewardedReady()),
        3000,
      );
    });

    return () => {
      if (poll) clearInterval(poll);
      clearInterval(overtimeTimer.current);
      SoundManager.stopDangerPulse();
      SoundManager.stopMusic();
      SoundManager.dispose();
    };
  }, []);

  // ── Danger pulse sound ─────────────────────────────────────────────────────
  useEffect(() => {
    if (paused) return;
    if (dangerUrgency > 0) {
      SoundManager.startDangerPulse(dangerUrgency);
    } else {
      SoundManager.stopDangerPulse();
    }
    SoundManager.setMusicTense(dangerUrgency > 0.3);
  }, [Math.round(dangerUrgency * 10), paused]);

  // ── Achievement helper ─────────────────────────────────────────────────────
  const triggerAchievement = useCallback(async (id) => {
    const isNew = await unlockAchievement(id);
    if (isNew) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        setLastAchievement(def);
        setTimeout(() => setLastAchievement(null), 3200);
      }
    }
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addScore = useCallback((pts, label = null, position = null) => {
    setScore((s) => {
      const n = s + pts;
      scoreRef.current = n;
      return n;
    });
    const id = ++popupId.current;
    const text = label ? `${label} +${pts}` : `+${pts}`;
    setPopups((prev) => [...prev, { id, text, position }]);
    setTimeout(
      () => setPopups((prev) => prev.filter((p) => p.id !== id)),
      1000,
    );
  }, []);

  // ── Rewarded ad → free power-up ────────────────────────────────────────────
  const handleWatchAd = useCallback(async () => {
    if (paused || endCalledRef.current) return;
    setPaused(true);
    SoundManager.stopDangerPulse();
    const earned = await AdManager.showRewarded();
    setRewardedReady(AdManager.isRewardedReady());
    setPaused(false);
    if (!earned) return;
    // Give the player a free Freeze as the reward
    setLastPowerup("❄️ FREE FREEZE EARNED!");
    SoundManager.play("specialFreeze");
    setFreezeBonus((b) => b + clicksPerRow);
    addScore(POINTS_PER_CLICK * 2);
  }, [paused, clicksPerRow, addScore]);

  const finish = useCallback(
    (didWin) => {
      if (!endCalledRef.current) {
        endCalledRef.current = true;
        clearInterval(overtimeTimer.current);
        setOvertimeActive(false);
        overtimeRef.current = false;
        SoundManager.stopDangerPulse();
        SoundManager.stopMusic();
        SoundManager.play(didWin ? "win" : "gameOver");
        const proceed = () =>
          onGameEnd(didWin, scoreRef.current, {
            rowsCleared: rowsClearedRef.current,
            levelIndex: selectedLevelIndex,
          });
        if (!adsRemovedRef.current) {
          // Show interstitial after every level (win or loss), then navigate
          setTimeout(async () => {
            await AdManager.showInterstitial();
            proceed();
          }, 400);
        } else {
          setTimeout(proceed, 400);
        }
      }
    },
    [onGameEnd, selectedLevelIndex],
  );

  // ── Overtime logic ─────────────────────────────────────────────────────────
  const startOvertime = useCallback(() => {
    if (overtimeRef.current || endCalledRef.current) return;
    overtimeRef.current = true;
    setOvertimeActive(true);
    setOvertimeSeconds(OVERTIME_SECONDS);
    let remaining = OVERTIME_SECONDS;
    overtimeTimer.current = setInterval(() => {
      remaining -= 1;
      setOvertimeSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(overtimeTimer.current);
        if (overtimeRef.current) finish(false);
      }
    }, 1000);
  }, [finish]);

  const cancelOvertime = useCallback(() => {
    if (!overtimeRef.current) return;
    overtimeRef.current = false;
    setOvertimeActive(false);
    clearInterval(overtimeTimer.current);
  }, []);

  // ── Row clear ─────────────────────────────────────────────────────────────
  const clearRows = useCallback(
    (rowIndices, extraScore) => {
      processingRef.current = true;
      setFlashRows(new Set(rowIndices));
      setRemovingRows((prev) => {
        const next = new Set([...prev, ...rowIndices]);
        removingRowsRef.current = next;
        return next;
      });

      // Efficiency bonus: check tap count for each row
      rowIndices.forEach((ri) => {
        const taps = rowTapCountRef.current[ri] ?? 999;
        if (taps <= 3) {
          addScore(POINTS_PER_ROW, "🎯EFFICIENT");
          triggerAchievement("efficient");
        } else if (taps <= 6) {
          addScore(Math.floor(POINTS_PER_ROW * 0.5), "⚡QUICK");
        }
        delete rowTapCountRef.current[ri];
      });

      if (extraScore > 0) addScore(extraScore);
      SoundManager.play("rowClear", rowIndices.length);

      // Chain-reaction achievement: two clears within 1 second
      const now = Date.now();
      if (now - lastRowClearTime.current < 1000) {
        triggerAchievement("chain_reaction");
      }
      lastRowClearTime.current = now;

      // Increment rows-cleared and check clean_sweep achievement
      rowsClearedRef.current += rowIndices.length;
      if (rowsClearedRef.current >= 3) triggerAchievement("clean_sweep");

      setTimeout(() => {
        setFlashRows(new Set());
        setGrid((prev) => {
          const next = compactGrid(
            prev.map((row, i) => (rowIndices.includes(i) ? null : row)),
          );
          const isWin = next.filter((r) => r !== null).length === 0;
          if (isWin) {
            setLastPowerup(`🎉 WAVE ${wave} CLEARED!`);
            setTimeout(() => finish(true), 800);
          }
          return next;
        });
        setNewRowIndex(null);
        setRemovingRows(new Set());
        removingRowsRef.current = new Set();
        processingRef.current = false;
        // If overtime was active, a row was cleared — cancel overtime!
        cancelOvertime();
      }, 600);
    },
    [addScore, finish, triggerAchievement, cancelOvertime],
  );

  // ── "Almost there" detection ───────────────────────────────────────────────
  useEffect(() => {
    if (endCalledRef.current || removingRows.size > 0) return;
    // Only check the currently-visible side so the sound fires once per
    // relevant change, not once per side (up to 4× per grid update).
    grid.forEach((row) => {
      if (!row) return;
      const side = row.sides[currentSide];
      const plains = side.filter((c) => !isSpecial(c));
      if (plains.length < 2) return;
      const colorCounts = {};
      plains.forEach((c) => {
        colorCounts[c] = (colorCounts[c] ?? 0) + 1;
      });
      const maxCount = Math.max(...Object.values(colorCounts));
      if (maxCount === plains.length - 1 && plains.length === side.length) {
        SoundManager.play("almostMatch");
      }
    });
  }, [grid, currentSide]);

  // ── Rotation ───────────────────────────────────────────────────────────────
  const rotateSide = useCallback(
    (direction) => {
      if (rotatingRef.current || paused) return;
      rotatingRef.current = true;
      setRotating(true);
      setRotateFlash(true);
      SoundManager.play("rotate");

      if (direction === "left" || direction === "right") {
        setCurrentSide((prev) =>
          direction === "left"
            ? (prev + 1) % SIDES
            : (prev + SIDES - 1) % SIDES,
        );
      }

      if (direction === "up" || direction === "down") {
        setGrid((prev) =>
          prev.map((row) => {
            if (!row) return null;
            const [s0, s1, s2, s3] = row.sides;
            return { sides: [s2, s1, s0, s3] };
          }),
        );
      }

      setTimeout(() => {
        rotatingRef.current = false;
        setRotating(false);
        setRotateFlash(false);
      }, 300);
    },
    [paused],
  );

  // ── PanResponder for swipe detection ──────────────────────────────────────
  // Keep a ref to rotateSide so the panResponder (created once) always calls
  // the latest version, which has the correct `paused` state captured.
  const rotateSideRef = useRef(rotateSide);
  useEffect(() => {
    rotateSideRef.current = rotateSide;
  }, [rotateSide]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        // Only claim the gesture when there is a clear directional swipe.
        // Using a higher threshold and NOT using Capture mode means short taps
        // pass through to TouchableOpacity bricks uninterrupted.
        const dx = Math.abs(g.dx),
          dy = Math.abs(g.dy);
        return (dx > dy ? dx : dy) > 15;
      },
      onPanResponderRelease: (_, g) => {
        const absDx = Math.abs(g.dx),
          absDy = Math.abs(g.dy);
        const THRESH = 40;
        if (absDx > absDy && absDx > THRESH)
          rotateSideRef.current(g.dx > 0 ? "right" : "left");
        else if (absDy > absDx && absDy > THRESH)
          rotateSideRef.current(g.dy > 0 ? "down" : "up");
      },
    }),
  ).current;

  // ── Brick tap handler ──────────────────────────────────────────────────────
  const handleBrickPress = useCallback(
    (rowIdx, colIdx, event) => {
      if (!grid[rowIdx]) return;
      if (
        removingRowsRef.current.has(rowIdx) ||
        processingRef.current ||
        endCalledRef.current ||
        paused
      )
        return;
      // Clear the new-row marker immediately so the entrance animation cannot
      // be re-triggered by the grid re-render that follows this tap.
      setNewRowIndex(null);

      const cell = grid[rowIdx].sides[currentSide][colIdx];

      // Capture screen position of the tap so the score popup floats above
      // the brick that was pressed. pageX/pageY give absolute screen coords.
      const tapPos = event?.nativeEvent
        ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
        : null;

      // Track tap count per row for efficiency bonus
      rowTapCountRef.current[rowIdx] =
        (rowTapCountRef.current[rowIdx] ?? 0) + 1;

      if (isSpecial(cell)) {
        switch (cell.type) {
          case "BOMB":
            setLastPowerup("💣 ROW DESTROYED!");
            SoundManager.play("specialBomb");
            clearRows([rowIdx], POINTS_PER_ROW);
            // Track bomb achievement
            incrementBombs().then((total) => {
              if (total >= 5) triggerAchievement("demolition_expert");
            });
            break;

          case "LIGHTNING": {
            let target = -1;
            for (let r = rowIdx + 1; r < TOTAL_ROWS; r++) {
              if (grid[r] !== null) {
                target = r;
                break;
              }
            }
            if (target === -1) {
              // No row below — power-up fizzles, just replace the brick
              setLastPowerup("⚡ NO TARGET!");
              SoundManager.play("specialLightning");
              setGrid((prev) =>
                prev.map((row, r) => {
                  if (r !== rowIdx || !row) return row;
                  const newSides = row.sides.map((side, si) =>
                    si === currentSide
                      ? side.map((c, ci) => (ci === colIdx ? randomColor() : c))
                      : side,
                  );
                  return { sides: newSides };
                }),
              );
              setClickCount((p) => p + 1);
              break;
            }
            setLastPowerup("⚡ ROW ZAPPED!");
            SoundManager.play("specialLightning");
            setGrid((prev) =>
              prev.map((row, r) => {
                if (r !== rowIdx || !row) return row;
                const newSides = row.sides.map((side, si) =>
                  si === currentSide
                    ? side.map((c, ci) => (ci === colIdx ? randomColor() : c))
                    : side,
                );
                return { sides: newSides };
              }),
            );
            clearRows([target], POINTS_PER_ROW);
            // Increment clickCount so a successful zap advances the row-spawn
            // counter consistently with the fizzle (no-target) path above.
            setClickCount((p) => p + 1);
            break;
          }

          case "RAINBOW": {
            // FIXED: Use dominant color in the row instead of random
            const side = grid[rowIdx].sides[currentSide];
            const plains = side.filter((c) => !isSpecial(c));
            const counts = {};
            plains.forEach((c) => {
              counts[c] = (counts[c] ?? 0) + 1;
            });
            const dominantColor =
              plains.length > 0
                ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
                : randomColor();

            // full_spectrum: check if all active colors were present BEFORE painting
            const activeC = getActiveColors();
            const uniqueColors = new Set(plains);
            if (uniqueColors.size >= activeC.length)
              triggerAchievement("full_spectrum");

            setLastPowerup("🌈 ROW PAINTED!");
            SoundManager.play("specialRainbow");
            addScore(POINTS_PER_CLICK, null, tapPos);
            setGrid((prev) =>
              prev.map((row, r) => {
                if (r !== rowIdx || !row) return row;
                const newSides = row.sides.map((side, si) =>
                  si === currentSide ? side.map(() => dominantColor) : side,
                );
                return { sides: newSides };
              }),
            );
            break;
          }

          case "STAR":
            setLastPowerup("⭐ +500 BONUS!");
            SoundManager.play("specialStar");
            addScore(500);
            setGrid((prev) =>
              prev.map((row, r) => {
                if (r !== rowIdx || !row) return row;
                const newSides = row.sides.map((side, si) =>
                  si === currentSide
                    ? side.map((c, ci) => (ci === colIdx ? randomColor() : c))
                    : side,
                );
                return { sides: newSides };
              }),
            );
            // Do NOT increment clickCount — a Star bonus brick should not
            // advance the row-spawn counter.
            break;

          case "FREEZE":
            setLastPowerup("❄️ NEXT ROW DELAYED!");
            SoundManager.play("specialFreeze");
            freezeUsedRef.current += 1;
            if (freezeUsedRef.current >= 3) triggerAchievement("chill_out");
            // Do NOT increment clickCount here — the freeze adds to freezeBonus
            // instead, which pushes the row-spawn threshold forward without
            // accidentally triggering a spawn on the same tick as the bonus.
            setFreezeBonus((b) => b + clicksPerRow);
            addScore(POINTS_PER_CLICK * 2, null, tapPos);
            setGrid((prev) =>
              prev.map((row, r) => {
                if (r !== rowIdx || !row) return row;
                const newSides = row.sides.map((side, si) =>
                  si === currentSide
                    ? side.map((c, ci) => (ci === colIdx ? randomColor() : c))
                    : side,
                );
                return { sides: newSides };
              }),
            );
            break;

          default:
            break;
        }
        return;
      }

      // Normal tap
      SoundManager.play("brickTap", cell);
      addScore(POINTS_PER_CLICK, null, tapPos);
      setGrid((prev) =>
        prev.map((row, r) => {
          if (r !== rowIdx || !row) return row;
          const newSides = row.sides.map((side, si) =>
            si === currentSide
              ? side.map((c, ci) => (ci === colIdx ? randomColor() : c))
              : side,
          );
          return { sides: newSides };
        }),
      );
      setClickCount((p) => p + 1);
    },
    [
      grid,
      currentSide,
      addScore,
      clearRows,
      clicksPerRow,
      paused,
      triggerAchievement,
    ],
  );

  // ── Match detection (with full-spectrum achievement) ───────────────────────
  useEffect(() => {
    if (endCalledRef.current || processingRef.current) return;
    const matched = [];
    grid.forEach((row, i) => {
      if (!row || removingRows.has(i)) return;
      for (let s = 0; s < SIDES; s++) {
        const side = row.sides[s];
        const allPlain = side.every((c) => !isSpecial(c));
        if (allPlain && side.every((c) => c === side[0])) {
          matched.push(i);
          break;
        }
      }
    });
    if (matched.length === 0) return;
    clearRows(matched, matched.length * POINTS_PER_ROW);
  }, [grid, clearRows]);

  // ── New-row spawner ────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      clickCount === 0 ||
      endCalledRef.current ||
      processingRef.current ||
      paused
    )
      return;
    const adjusted = clickCount + freezeBonus;
    if (adjusted % clicksPerRow !== 0) return;

    SoundManager.play("newRow");

    // Compute the new grid outside setGrid so we can call sibling setters
    // safely. Calling setState inside a setState updater is not allowed —
    // it caused setNewRowIndex (and its cleanup timeout) to fire at
    // unpredictable times, including after level-win, breaking the ad flow.
    setGrid((prev) => {
      const active = prev.filter((r) => r !== null);
      const newRow = { sides: makeRowSides(spawnChance) };
      const next = [...active, newRow];

      if (next.length >= TOTAL_ROWS) {
        if (!overtimeRef.current) setTimeout(() => startOvertime(), 0);
        return prev;
      }

      const compacted = compactGrid([
        ...next,
        ...Array(TOTAL_ROWS - next.length).fill(null),
      ]);
      const lastActiveIdx = compacted.reduce(
        (acc, r, i) => (r !== null ? i : acc),
        -1,
      );

      // Schedule sibling state updates after the current render cycle
      setTimeout(() => {
        setNewRowIndex(lastActiveIdx);
        // Clear after entrance animation so tap re-renders don't re-trigger bounce
        setTimeout(() => setNewRowIndex(null), 600);
      }, 0);

      return compacted;
    });
  }, [clickCount, freezeBonus, paused]);

  // ── Power-up toast dismissal ───────────────────────────────────────────────
  useEffect(() => {
    if (!lastPowerup) return;
    const t = setTimeout(() => setLastPowerup(null), 2000);
    return () => clearTimeout(t);
  }, [lastPowerup]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" />

      <ScorePopup popups={popups} />

      <PowerupToast message={lastPowerup} />

      <AchievementToast achievement={lastAchievement} />

      <ScrollView
        contentContainerStyle={shared.gameScreen}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        {...panResponder.panHandlers}
      >
        <GameHeader
          score={score}
          activeCount={activeCount}
          clicksUntilNew={clicksUntilNew}
          currentSide={currentSide}
          onRotate={rotateSide}
          onPause={() => setPaused(true)}
          onWatchAd={handleWatchAd}
          rewardedReady={rewardedReady && !adsRemovedRef.current}
          wave={wave}
        />

        <GameBoard
          grid={grid}
          currentSide={currentSide}
          removingRows={removingRows}
          flashRows={flashRows}
          onBrickClick={handleBrickPress}
          rotateFlash={rotateFlash}
          newRowIndex={newRowIndex}
          dangerUrgency={dangerUrgency}
          emptySlots={emptySlots}
        />

        <View style={shared.swipeHints}>
          <Text style={shared.swipeHintText}>◀ swipe to rotate ▶</Text>
          <Text style={shared.swipeHintText}>↕ swipe to flip</Text>
        </View>
      </ScrollView>

      <DangerOvertime active={overtimeActive} secondsLeft={overtimeSeconds} />

      <PauseMenu
        visible={paused}
        onResume={() => setPaused(false)}
        onMenu={() => {
          setPaused(false);
          finish(false);
        }}
        colorblindMode={colorblind}
        onToggleColorblind={handleToggleColorblind}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
});
