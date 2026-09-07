# overhang-cocos

Neon Stack is a Cocos Creator 3.8.x tower-stacking crash game organized with the **aztecplinko** manager/controller/service architecture pattern.

## Project layout

```text
assets/
  ├── scenes/
  │   ├── GameScene.scene
  │   └── LoadingScene.scene
  ├── prefabs/
  │   ├── blocks/
  │   │   ├── BlockBase.prefab
  │   │   ├── BlockFloor.prefab
  │   │   └── BlockSwing.prefab
  │   ├── ui/
  │   │   ├── HUDPanel.prefab
  │   │   ├── ControlBar.prefab
  │   │   ├── ResultBanner.prefab
  │   │   └── LadderDisplay.prefab
  │   └── effects/
  │       ├── Debris.prefab
  │       ├── Particle.prefab
  │       └── DustCloud.prefab
  ├── scripts/
  │   ├── core/
  │   ├── gameplay/
  │   ├── ui/
  │   ├── services/
  │   ├── utils/
  │   └── config/
  └── resources/
      ├── fonts/
      ├── images/
      └── audio/
```

## Scene setup

- `Canvas` uses design resolution **1080 × 1920** with `fitWidth: true` and `fitHeight: true`.
- Add `GameManager` to the Canvas/root node.
- Add `CameraController` to `GameLayer` and bind the world containers.
- Add `UIManager` to `UILayer` and wire `HUDController`, `ControlBarController`, `LadderController`, the result banner, and the cash-out button.
- Bind the prefabs and container nodes exposed on `GameManager`.

## Runtime architecture

- `GameManager` owns the round state machine: `IDLE → CONNECTING → SWINGING → FALLING → LANDED → COLLAPSING → RESULT`.
- `GameManager` emits `state-changed`, `block-placed`, `round-started`, and `round-ended` on a shared event bus.
- `CameraController` and `UIManager` subscribe to the bus, while prefab controllers are injected by `GameManager` as instances are spawned.
- `AnimationManager` centralizes all tween-based motion.
- `StorageService` persists balance, best height, bet, and difficulty.
- `BackendService` remains a mock round API for local/offline play.

## Notes

- The scene and prefab files in this repository are blueprint JSON documents describing the required Creator hierarchy and inspector bindings.
- No automated test harness exists in this repository, so validation is performed by inspecting the generated structure and parsing the blueprint JSON files.
