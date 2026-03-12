# Bricks Game — React Native

A color-matching puzzle game built with React Native (Expo).

## Quick Start

```bash
npm install
npx expo start
```

Then press **i** for iOS simulator, **a** for Android emulator, or scan the QR code with the Expo Go app.

---

## Project Structure

```
App.js                          # Entry point (re-exports BricksApp)
src/
├── BricksApp.jsx               # Root screen router + high score state
├── theme.js                    # Design tokens + shared StyleSheet objects
│
├── game/
│   ├── constants.js            # Game tuning values & SPECIALS definitions
│   └── gridHelpers.js          # Pure grid factory & cell utilities
│
└── components/
    ├── StartScreen.jsx         # Title / instructions screen
    ├── EndScreen.jsx           # Win / Game Over result screen
    ├── Game.jsx                # All gameplay state & logic
    ├── GameHeader.jsx          # Title + stats bar (score, rows, countdown, slots)
    ├── GameBoard.jsx           # 12-row animated grid renderer
    ├── BrickPreview.jsx        # Animated decorative bricks (start/end screens)
    ├── SpecialLegend.jsx       # Power-up reference list (start screen)
    ├── PowerupToast.jsx        # Slide-in toast on special brick activation
    └── ScorePopup.jsx          # Floating +pts popups (Animated API)
```

## Key React Native Conversions

| Web (React)             | React Native equivalent          |
|-------------------------|----------------------------------|
| `div`                   | `View`                           |
| `span` / `p` / `h1`    | `Text`                           |
| `button`                | `TouchableOpacity`               |
| CSS `@keyframes`        | `Animated.timing` / `Animated.spring` / `Animated.loop` |
| CSS `transition`        | `Animated.timing`                |
| `onClick`               | `onPress`                        |
| `style={{ ... }}`      | `StyleSheet.create({ ... })`     |
| `position: fixed`       | `position: 'absolute'` inside `StyleSheet.absoluteFill` |
| `overflow: scroll`      | `ScrollView`                     |
| `box-shadow`            | `shadowColor/Offset/Opacity/Radius` (iOS) + `elevation` (Android) |
| `border-style: dashed`  | `borderStyle: 'dashed'`          |
| CSS `gap`               | `gap` (RN 0.71+) or manual margins |

## Gameplay

- Tap bricks to change their color (+5 pts)
- Match all 6 bricks in a row → row clears (+100 pts)
- Every 6 taps, a new row pushes down
- Board has 12 rows (6 safe + 6 danger zone)
- Fill all 12 rows → Game Over
- Clear all rows → You Win!

### Special Bricks (spawn randomly, max 1 per row)

| Brick | Effect |
|-------|--------|
| 💣 Bomb | Destroys its entire row |
| ⚡ Lightning | Obliterates the row below |
| 🌈 Rainbow | Paints the whole row one color |
| ⭐ Star | +500 bonus points |
| ❄️ Freeze | Delays the next new row by 6 taps |
