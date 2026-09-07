# overhang-cocos

Neon Stack game - Cocos Creator implementation of the crash tower stacking game.

## Included project files

- Scene blueprint: `/home/runner/work/overhang-cocos/overhang-cocos/assets/scenes/GameScene.scene`
- Prefab specs:
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/prefabs/Block.prefab`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/prefabs/Swing.prefab`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/prefabs/Debris.prefab`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/prefabs/Particle.prefab`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/prefabs/ResultBanner.prefab`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/prefabs/ControlBar.prefab`
- Scripts:
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/scripts/GameManager.ts`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/scripts/CameraController.ts`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/scripts/PhysicsSimulator.ts`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/scripts/UIManager.ts`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/scripts/BackendService.ts`
  - `/home/runner/work/overhang-cocos/overhang-cocos/assets/scripts/GameConstants.ts`

## Node setup instructions (Cocos Creator)

1. Create/open a Cocos Creator 3.x project and copy the `assets` folder from this repository.
2. Set design resolution to **1080x1920 portrait** on Canvas:
   - Fit Width: `true`
   - Fit Height: `true`
   - Policy: fixed portrait aspect behavior (matching `GameScene.scene`).
3. Build the `GameScene` hierarchy:
   - `Canvas`
     - `GameLayer` (world/tower, camera target container)
     - `UILayer` (overlay UI)
4. Add components:
   - `GameManager` on `Canvas`
   - `CameraController` on `Canvas` and bind `GameLayer`
   - `PhysicsSimulator` on `Canvas`
   - `BackendService` on `Canvas`
   - `UIManager` on `UILayer` and bind HUD/multiplier/payout/toast/result/cashout/control nodes
5. Create prefab nodes using the provided prefab specs:
   - `Block`: 150x150 sprite, base/floor colors, box collision shape
   - `Swing`: 150x150 block + rope child (`ROPE_LENGTH_PX=200`)
   - `Debris`: small sprite chunks with velocity, spin, lifetime
   - `Particle`: small neon sprite with velocity/fade
   - `ResultBanner`: top-center win/loss label with fade/scale animation
   - `ControlBar`: bottom bar with Bet/Difficulty steppers and Start button
6. In `GameManager`, bind all prefabs and service/controller references in the Inspector.
7. Wire UI button events:
   - Start button → `GameManager.startRound`
   - Cash out button → `GameManager.cashOut`
   - Drop action (tap/click gameplay input) → `GameManager.tryDrop`

## Gameplay behavior implemented

- State machine: `START → CONNECTING → SWINGING → FALLING → LANDED → RESULT`
- Pendulum swing with intro ease-down animation
- Gravity fall with fixed release X
- Landing squash spring (`0.8 → 1.0`, ease-out-back)
- Camera framing/lerp using `CAM_LERP` and `CAM_LERP_RESET`
- Mock backend round generation by difficulty
- Multiplier progression and pulse
- Cash out flow and result banner (non-blocking style)
- Loss demolition pass (top-down block pop with debris)
- Debris and particle spawn effects
- LocalStorage keys:
  - `neonstack_balance`
  - `neonstack_best`
