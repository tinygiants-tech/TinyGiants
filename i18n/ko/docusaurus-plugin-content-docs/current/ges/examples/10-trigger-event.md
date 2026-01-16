---
sidebar_label: '10 트리거 이벤트'
sidebar_position: 11
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 10 트리거 이벤트: 병렬 이벤트 디스패치

<VideoGif src="/video/game-event-system/example/10-trigger-event.mp4" />

## 📋 개요

복잡한 게임에서 하나의 액션(예: "공격 명령")은 종종 여러 독립적인 시스템을 트리거해야 합니다: 전투 로직, 사운드 효과, UI 업데이트, 업적, 분석 등. 이것을 코드로 구현하면 수십 줄의 비대한 함수가 됩니다. **플로우 그래프**는 이것을 **병렬 디스패치**로 시각화합니다—하나의 루트 이벤트가 여러 조건부 분기로 펼쳐지며, 각각 자체 우선순위와 필터링 로직을 가집니다.

:::tip 💡 배울 내용
- 시각적 이벤트 라우팅을 위한 플로우 그래프 사용 방법
- 병렬 실행 vs 순차적 우선순위 순서
- 노드 조건을 사용한 조건부 분기
- 트리거 노드에서의 타입 변환 및 인수 필터링
- 트리거 이벤트와 체인 이벤트의 차이점

:::

---

## 🎬 데모 씬
```
Assets/TinyGiants/GameEventSystem/Demo/10_TriggerEvent/10_TriggerEvent.unity
```

### 씬 구성

**시각적 요소:**
- 🔴 **Turret_A (왼쪽)** - 빨간색 "스마트" 포탑
  - 우선순위 순서: Buff (100) → Fire (50)
  - 결과: **크리티컬 히트**
  
- 🔵 **Turret_B (오른쪽)** - 파란색 "결함" 포탑
  - 우선순위 순서: Fire (100) → Buff (30)
  - 결과: **약한 히트** (버프가 너무 늦게 도착)

- 🎯 **TargetDummy** - 중앙 캡슐 타겟
  - 두 포탑으로부터 데미지를 받음
  - 물리 반응을 위한 Rigidbody 보유

- 📺 **HoloDisplay** - 정보 패널
  - 데미지 데이터 로그 표시
  - 기본적으로 "SYSTEM READY" 표시
  - 트리거될 때 데미지 정보로 업데이트

- 🚨 **AlarmVignette** - 전체 화면 빨간색 오버레이
  - 글로벌 알람이 트리거될 때 플래시
  - 포탑별 분기와 독립적

**UI 레이어 (Canvas):**
- 🎮 **두 개의 명령 버튼** - 화면 하단
  - "Command A" → `TriggerEventRaiser.CommandTurretA()` 트리거
  - "Command B" → `TriggerEventRaiser.CommandTurretB()` 트리거

**게임 로직 레이어:**
- 📤 **TriggerEventRaiser** - 명령 발급자
  - **하나**의 루트 이벤트만 참조: `onCommand`
  - 다운스트림 이벤트에 대해 완전히 무지
  - 궁극적인 디커플링 시연

- 📥 **TriggerEventReceiver** - 액션 실행자
  - 5개의 독립적인 액션 메서드 포함
  - 플로우 그래프가 언제 어떤 메서드를 실행할지 조율
  - 메서드는 다양한 시그니처를 가짐 (void, 단일 인수, 이중 인수)

---

## 🎮 상호작용 방법

### 병렬 디스패치 실험

하나의 루트 이벤트(`onCommand`)가 조건과 우선순위에 따라 여러 병렬 분기로 분할됩니다.

---

### 1단계: 플레이 모드 진입

Unity에서 **Play** 버튼을 누릅니다.

**초기 상태:**
- 두 포탑이 대기 중(느린 회전 스윕)
- HoloDisplay가 "SYSTEM READY" 표시
- 알람 비네트 표시되지 않음

---

### 2단계: 스마트 포탑 테스트 (올바른 우선순위)

**"Command A" 클릭:**

**발생하는 일:**
1. 🎯 빨간 포탑이 타겟을 향해 회전(빠른 추적)
2. 🚀 발사체가 발사되어 이동
3. 💥 **충돌 시** - sender로 `Turret_A`와 함께 루트 이벤트 발동

**병렬 실행 분기:**

**분기 1: Turret A 전용 (조건부):**
- ✅ **onActiveBuff** (우선순위 100)
  - 조건: `sender.name.Contains("Turret_A")` → **TRUE**
  - 가장 높은 우선순위로 인해 첫 번째로 실행
  - 포탑이 **금색**으로 변하고, 버프 오라 생성
  - `_isBuffedA = true` 설정
  - 콘솔: `[Receiver] (A) SYSTEM OVERCHARGE: Buff Activated for Turret_A.`
  
- ✅ **onTurretFire** (우선순위 50)
  - 조건: `sender.name.Contains("Turret_A")` → **TRUE**
  - 두 번째로 실행 (Buff보다 낮은 우선순위)
  - `_isBuffedA` 확인 → TRUE 발견
  - 결과: **CRIT! -500** 데미지
  - 주황색 떠다니는 텍스트, 폭발 VFX, 카메라 흔들림
  - 콘솔: `[Receiver] (B) TURRET HIT: Critical Strike! (500 dmg)`

**분기 2: 글로벌 (무조건부):**
- ✅ **onHoloData** (우선순위 1초 지연)
  - 조건 없음 → 항상 실행
  - 타입 변환: `GameObject` sender 제거, `DamageInfo`만 전달
  - HoloDisplay 업데이트: "Damage DATA Type: Physical, Target: 100"
  - 콘솔: `[Receiver] (C) HOLO DATA: Recorded 100 damage packet.`
  
- ✅ **onGlobalAlarm** (우선순위 즉시, void)
  - 조건 없음 → 항상 실행
  - 타입 변환: 모든 인수 제거
  - 화면이 빨간색으로 3회 플래시
  - 알람 사운드 재생
  - 콘솔: `[Receiver] (D) ALARM: HQ UNDER ATTACK! EMERGENCY PROTOCOL!`
  
- ✅ **onSecretFire** (우선순위 1초 지연, 인수 차단)
  - 조건 없음 → 항상 실행
  - **PassArgument = false** → 기본/null 값 수신
  - 콘솔: `[Receiver] (E) SECURE LOG: Data transmission blocked by Graph.`

**결과:** ✅ 스마트 포탑이 크리티컬 히트 달성, 데미지 계산 전에 버프가 적용되었기 때문

---

### 3단계: 결함 포탑 테스트 (잘못된 우선순위)

**"Command B" 클릭:**

**발생하는 일:**
1. 🎯 파란 포탑이 타겟을 향해 회전
2. 🚀 발사체가 발사되어 이동
3. 💥 **충돌 시** - sender로 `Turret_B`와 함께 루트 이벤트 발동

**병렬 실행 분기:**

**분기 1: Turret B 전용 (조건부):**
- ❌ **onActiveBuff** (Turret A 조건)
  - 조건: `sender.name.Contains("Turret_A")` → **FALSE**
  - **실행되지 않음** - 조건에 의해 필터링됨

- ✅ **onTurretFire** (우선순위 100) - *Turret A와 다른 노드*
  - 조건: `sender.name.Contains("Turret_B")` → **TRUE**
  - 첫 번째로 실행 (Turret B 분기에서 가장 높은 우선순위)
  - `_isBuffedB` 확인 → **FALSE** 발견 (버프가 아직 실행되지 않음)
  - 결과: **-100** 일반 데미지
  - 회색 떠다니는 텍스트, 작은 폭발
  - 콘솔: `[Receiver] (B) TURRET HIT: Normal Hit. (100 dmg)`

- ✅ **onActiveBuff** (우선순위 30) - *Turret A와 다른 노드*
  - 조건: `sender.name.Contains("Turret_B")` → **TRUE**
  - 두 번째로 실행 (낮은 우선순위)
  - 포탑이 **금색**으로 변하고, 버프 오라 생성
  - `_isBuffedB = true` 설정 **너무 늦음!**
  - 콘솔: `[Receiver] (A) SYSTEM OVERCHARGE: Buff Activated for Turret_B.`

**분기 2: 글로벌 (무조건부):**
- 동일한 3개의 글로벌 노드 실행 (onHoloData, onGlobalAlarm, onSecretFire)
- 어느 포탑이 발사했는지와 독립적

**결과:** ❌ 결함 포탑이 일반 히트 획득, 버프가 적용되기 전에 데미지가 계산되었기 때문

:::note 🔑 핵심 관찰

두 포탑 모두 동일한 루트 이벤트(`onCommand`)를 트리거하지만:

- **조건부 노드**가 sender 이름으로 필터링
- 각 분기 내 **우선순위 순서**가 결과 결정
- **글로벌 노드**는 sender와 관계없이 실행
- 모든 분기가 **병렬로** 평가됨 (동일 프레임)

:::

---

## 🏗️ 씬 아키텍처

### 병렬 vs 순차 실행

**전통적인 순차 코드:**
```csharp
void OnAttackCommand(GameObject sender, DamageInfo info)
{
    if (sender.name == "Turret_A") ActivateBuff(sender, info);
    TurretHit(sender, info);
    if (sender.name == "Turret_A") ActivateBuff(sender, info); // 잘못된 순서!
    HoloDamageData(info);
    GlobalAlarm();
    LogSecretAccess(sender, info);
}
```

**플로우 그래프 병렬 디스패치:**
```
📡 루트: onCommand.Raise(sender, info)
│
├─ 🔱 [ 조건부 분기: Turret A ] ➔ 🛡️ 가드: `Sender == "Turret_A"`
│  ├─ 💎 [우선순위: 100] ➔ onActiveBuff()   ✅ 1번째 실행
│  └─ ⚡ [우선순위: 50 ] ➔ onTurretFire()   ✅ 2번째 실행
│
├─ 🔱 [ 조건부 분기: Turret B ] ➔ 🛡️ 가드: `Sender == "Turret_B"`
│  ├─ ⚡ [우선순위: 100] ➔ onTurretFire()   ✅ 1번째 실행
│  └─ 💎 [우선순위: 30 ] ➔ onActiveBuff()   ✅ 2번째 실행
│
└─ 🌍 [ 글로벌 분기: 항상 실행 ]   ➔ 🟢 가드: `없음 (항상 통과)`
   ├─ 📽️ onHoloData       ⏱️ 지연: 1.0s | 🔢 단일 인수
   ├─ 🚨 onGlobalAlarm    ⚡ 즉시       | 🔘 Void (신호만)
   └─ 🕵️ onSecretFire     ⏱️ 지연: 1.0s | 🛡️ 차단된 인수
```

**실행 동작:**
- 모든 분기가 동시에 평가됨 (병렬)
- 조건이 어떤 노드를 실행할지 필터링
- 우선순위가 통과한 분기 내 순서 결정
- 타입 변환이 노드별로 자동으로 발생

---

### 이벤트 정의

![Game Event Editor](/img/game-event-system/examples/10-trigger-event/demo-10-editor.png)

| 이벤트 이름     | 타입                                | 역할     | 색상  |
| --------------- | ----------------------------------- | -------- | ----- |
| `onCommand`     | `GameObjectDamageInfoGameEvent` | **루트** | 금색  |
| `onActiveBuff`  | `GameObjectDamageInfoGameEvent` | 트리거   | 녹색  |
| `onTurretFire`  | `GameObjectDamageInfoGameEvent` | 트리거   | 녹색  |
| `onHoloData`    | `DamageInfoGameEvent`             | 트리거   | 녹색  |
| `onGlobalAlarm` | `GameEvent` (void)                  | 트리거   | 녹색  |
| `onSecretFire`  | `GameObjectDamageInfoGameEvent` | 트리거   | 녹색  |

**핵심 인사이트:**
- **루트 이벤트** (금색): 코드에 의해 직접 발동되는 유일한 것
- **트리거 이벤트** (녹색): 플로우 그래프에 의해 자동으로 트리거됨
- 코드는 `onCommand`만 알고 있음—다운스트림 로직과 완전히 디커플링됨

---

### 플로우 그래프 구성

Game Event Editor에서 **"Flow Graph"** 버튼을 클릭하여 시각적 그래프를 엽니다:

![Flow Graph Overview](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

**그래프 구조:**

**루트 노드 (왼쪽, 빨강):**
- `onCommand <GameObject, DamageInfo>`
- 전체 그래프의 진입점
- 코드에 의해 발동되는 단일 노드

**Turret A 분기 (오른쪽 상단, 녹색):**
- `onActiveBuff` (우선순위: ★100, 조건: Turret_A, 전달: ✓)
  - 분기에서 가장 높은 우선순위
  - sender가 Turret_A인 경우에만 실행
- `onTurretFire` (우선순위: ★50, 조건: Turret_A, 전달: ✓)
  - 두 번째 우선순위
  - sender가 Turret_A인 경우에만 실행

**Turret B 분기 (오른쪽 중간, 녹색):**
- `onTurretFire` (우선순위: ★100, 조건: Turret_B, 전달: ✓)
  - 분기에서 가장 높은 우선순위
  - sender가 Turret_B인 경우에만 실행
- `onActiveBuff` (우선순위: ★30, 조건: Turret_B, 전달: ✓)
  - 낮은 우선순위 (Fire 후 실행!)
  - sender가 Turret_B인 경우에만 실행

**글로벌 분기 (오른쪽 하단, 노란색/녹색):**
- `onHoloData` (지연: ⏱️1s, 전달: 🔴 단일 인수만)
  - 타입 변환: `<GameObject, DamageInfo>` → `<DamageInfo>`
  - 노란 선은 타입 호환성 경고를 나타냄
- `onGlobalAlarm` (전달: ⭕ Void)
  - 타입 변환: `<GameObject, DamageInfo>` → `(void)`
  - 모든 인수 제거
- `onSecretFire` (지연: ⏱️1s, 전달: 🔒 정적/차단됨)
  - PassArgument = false
  - 기본/null 값 수신

**범례:**
- 🟢 **녹색 선:** 타입 일치 (호환 가능)
- 🟡 **노란 선:** 타입 변환 (데이터 손실이 있지만 호환 가능)
- 🔴 **빨간 선:** 타입 호환 불가 (연결되지 않음)

:::tip 🎨 비주얼 그래프 이점

플로우 그래프는 다음에 대한 즉각적인 시각적 이해를 제공합니다:

- 어떤 이벤트가 어떤 다운스트림 이벤트를 트리거하는지
- 분기 내 실행 우선순위
- 타입 변환 및 인수 전달
- 조건부 라우팅 로직
- 병렬 실행 구조

:::

---

### Sender 설정 (TriggerEventRaiser)

**TriggerEventRaiser** GameObject를 선택하세요:

![TriggerEventRaiser Inspector](/img/game-event-system/examples/10-trigger-event/demo-10-inspector.png)

**게임 이벤트:**
- `Command Event`: `onCommand`
  - 툴팁: "전체 그래프를 트리거하는 하나의 이벤트"
  - 타입: `GameObjectDamageInfoGameEvent`

**Turret A (스마트):**
- `Turret A`: Turret_A (GameObject)
- `Turret Head A`: Head (Transform)
- `Turret Muzzle A`: MuzzlePoint (Transform)

**Turret B (급한):**
- `Turret B`: Turret_B (GameObject)
- `Turret Head B`: Head (Transform)
- `Turret Muzzle B`: MuzzlePoint (Transform)

**공유 리소스:**
- `Projectile Prefab`, `Muzzle Flash VFX`, `Hit Target`

**중요한 관찰:**
스크립트는 **하나**의 이벤트만 참조합니다. 5개의 다운스트림 이벤트에 대한 **지식이 없습니다**. 이것이 궁극적인 디커플링입니다—플로우 그래프가 모든 라우팅 로직을 처리합니다.

---

### Receiver 설정 (TriggerEventReceiver)

**TriggerEventReceiver** GameObject를 선택하세요:

![TriggerEventReceiver Inspector](/img/game-event-system/examples/10-trigger-event/demo-10-receiver.png)

**타겟 참조:**
- `Target Dummy`, `Target Rigidbody`

**비주얼 리소스:**
- `Buff VFX Prefab`: TurretBuffAura (Particle System)
- `Hit Normal VFX`, `Hit Crit VFX`, `Floating Text Prefab`

**알람 VFX:**
- `Alarm Screen Group`: AlarmVignette (Canvas Group)
- `Holo Text`: LogText (Text Mesh Pro)

**포탑 구성:**
- **Turret A:** Renderers 배열, Normal material
- **Turret B:** Renderers 배열, Normal material
- **공유:** Buffed material (금색)

---

## 💻 코드 분석

### 📤 TriggerEventRaiser.cs (Sender)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class TriggerEventRaiser : MonoBehaviour
{
    [Header("Game Event")]
    [Tooltip("전체 그래프를 트리거하는 하나의 이벤트.")]
    [GameEventDropdown]
    public GameObjectDamageInfoGameEvent commandEvent;

    [Header("Turret A (스마트)")] 
    public GameObject turretA;
    // ... 포탑 참조 ...

    private bool _isAttackingA;
    private bool _isAttackingB;

    /// <summary>
    /// 버튼 A: Turret A에게 공격 신호.
    /// 루트 이벤트를 발동하는 것으로 정점에 이르는 조준 시퀀스를 시작합니다.
    /// </summary>
    public void CommandTurretA()
    {
        if (commandEvent == null || turretA == null) return;
        _isAttackingA = true; // 회전/발사 시퀀스 시작
    }

    /// <summary>
    /// 버튼 B: Turret B에게 공격 신호.
    /// </summary>
    public void CommandTurretB()
    {
        if (commandEvent == null || turretB == null) return;
        _isAttackingB = true;
    }

    private void FireProjectile(GameObject senderTurret, Transform muzzle)
    {
        // 총구 플래시 생성, 발사체 발사...
        
        var shell = Instantiate(projectilePrefab, muzzle.position, muzzle.rotation);
        shell.Initialize(hitTarget.position, 20f, () =>
        {
            Vector3 hitPos = hitTarget.position;
            DamageInfo info = new DamageInfo(100f, false, DamageType.Physical, 
                                            hitPos, "Commander");

            // 중요: 하나의 루트 이벤트 발동
            // 플로우 그래프가 나머지 모든 것을 결정합니다:
            // - 어떤 다운스트림 이벤트가 트리거되는지
            // - 어떤 우선순위 순서로
            // - 어떤 인수와 함께
            commandEvent.Raise(senderTurret, info);

            Debug.Log($"[Sender] Impact confirmed from {senderTurret.name}. " +
                     "Event Raised.");
        });
    }
}
```

**핵심 포인트:**
- 🎯 **단일 이벤트 참조** - 루트 이벤트만 알고 있음
- 🔇 **제로 다운스트림 지식** - 5개의 트리거 이벤트에 대한 아이디어 없음
- 📡 **간단한 API** - 단지 `.Raise(sender, data)`
- 🏗️ **최대 디커플링** - 플로우 그래프가 모든 라우팅 처리

---

### 📥 TriggerEventReceiver.cs (Listener)
```csharp
using UnityEngine;
using System.Collections;

public class TriggerEventReceiver : MonoBehaviour
{
    private bool _isBuffedA;
    private bool _isBuffedB;

    /// <summary>
    /// [액션 A] 버프 활성화
    /// 플로우 그래프의 트리거 노드에 바인딩됨 (Turret A와 B에 대한 별도 노드).
    /// 
    /// 우선순위 영향:
    /// - Turret A: 우선순위 100 → 데미지 전에 실행 (올바름)
    /// - Turret B: 우선순위 30 → 데미지 후에 실행 (잘못됨!)
    /// </summary>
    public void ActivateBuff(GameObject sender, DamageInfo args)
    {
        if (sender == null) return;
        bool isA = sender.name.Contains("Turret_A");

        // 중요한 플래그 설정
        if (isA) _isBuffedA = true;
        else _isBuffedB = true;

        // 시각적 피드백: 금색 머티리얼 + 파티클 오라
        Renderer[] targetRenderers = isA ? renderersA : renderersB;
        foreach (var r in targetRenderers)
            if (r) r.material = mat_Buffed;

        if (buffVFXPrefab)
        {
            var vfx = Instantiate(buffVFXPrefab, sender.transform.position, 
                                 Quaternion.identity);
            vfx.transform.SetParent(sender.transform);
            vfx.Play();
            
            if (isA) _auraA = vfx;
            else _auraB = vfx;
        }

        Debug.Log($"[Receiver] (A) SYSTEM OVERCHARGE: Buff Activated for {sender.name}.");
    }

    /// <summary>
    /// [액션 B] 포탑 히트
    /// 플로우 그래프의 트리거 노드에 바인딩됨 (Turret A와 B에 대한 별도 노드).
    /// 
    /// 실행 순간에 버프 상태를 확인합니다.
    /// 우선순위가 버프가 아직 활성화되었는지 결정합니다.
    /// </summary>
    public void TurretHit(GameObject sender, DamageInfo args)
    {
        if (sender == null) return;

        // 현재 버프가 활성화되어 있는지 확인
        bool isBuffed = sender.name.Contains("Turret_A") ? _isBuffedA : _isBuffedB;

        float finalDamage = args.amount;
        bool isCrit = false;
        ParticleSystem vfxToPlay;

        if (isBuffed)
        {
            // 크리티컬 경로: 버프가 활성화되어 있었음
            finalDamage *= 5f; // 500 데미지
            isCrit = true;
            vfxToPlay = hitCritVFX;
            
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
            Debug.Log($"[Receiver] (B) TURRET HIT: Critical Strike! ({finalDamage} dmg)");
        }
        else
        {
            // 일반 경로: 버프가 아직 활성화되지 않았음
            vfxToPlay = hitNormalVFX;
            Debug.Log($"[Receiver] (B) TURRET HIT: Normal Hit. ({finalDamage} dmg)");
        }

        // VFX 생성, 물리 적용, 떠다니는 텍스트 표시...
        StartCoroutine(ResetRoutine(sender, isBuffed));
    }

    /// <summary>
    /// [액션 C] 홀로 데미지 데이터
    /// 타입 변환이 있는 트리거 노드에 바인딩됨.
    /// 
    /// 그래프 구성:
    /// - 입력: GameObjectDamageInfoGameEvent
    /// - 출력: DamageInfoGameEvent
    /// - 결과: Sender가 제거되고, 데이터만 전달됨
    /// </summary>
    public void HoloDamageData(DamageInfo info)
    {
        if (holoText)
        {
            holoText.text = $"Damage DATA\nType: {info.type}, Target: {info.amount}";
        }

        Debug.Log($"[Receiver] (C) HOLO DATA: Recorded {info.amount} damage packet.");
        StartCoroutine(ClearLogRoutine());
    }

    /// <summary>
    /// [액션 D] 글로벌 알람
    /// VOID로의 타입 변환이 있는 트리거 노드에 바인딩됨.
    /// 
    /// 그래프 구성:
    /// - 입력: GameObjectDamageInfoGameEvent
    /// - 출력: GameEvent (void)
    /// - 결과: 모든 인수 제거됨
    /// </summary>
    public void GlobalAlarm()
    {
        Debug.Log("[Receiver] (D) ALARM: HQ UNDER ATTACK! EMERGENCY PROTOCOL!");

        StopCoroutine(nameof(AlarmRoutine));
        if (alarmScreenGroup) StartCoroutine(AlarmRoutine());
    }

    /// <summary>
    /// [액션 E] 비밀 로그
    /// PassArgument = FALSE인 트리거 노드에 바인딩됨.
    /// 
    /// 인수 차단 시연:
    /// 루트 이벤트에 데이터가 있어도 이 노드는 기본/null 값을 받습니다.
    /// 보안, 디버깅 또는 데이터 격리에 유용합니다.
    /// </summary>
    public void LogSecretAccess(GameObject sender, DamageInfo data)
    {
        bool isBlocked = (data == null || (data.amount == 0 && data.attacker == null));

        if (isBlocked)
            Debug.Log("<color=lime>[Receiver] (E) SECURE LOG: " +
                     "Data transmission blocked by Graph.</color>");
        else
            Debug.Log("<color=red>[Receiver] (E) SECURE LOG: " +
                     "Data LEAKED! ({data.amount})</color>");
    }

    private IEnumerator AlarmRoutine()
    {
        int flashes = 3;
        float flashDuration = 0.5f;

        for (int i = 0; i < flashes; i++)
        {
            if (alarmClip) _audioSource.PlayOneShot(alarmClip);

            // 사인파 알파 애니메이션
            float t = 0f;
            while (t < flashDuration)
            {
                t += Time.deltaTime;
                float alpha = Mathf.Sin((t / flashDuration) * Mathf.PI);
                alarmScreenGroup.alpha = alpha * 0.8f;
                yield return null;
            }

            alarmScreenGroup.alpha = 0f;
            yield return new WaitForSeconds(0.1f);
        }
    }
}
```

**핵심 포인트:**
- 🎯 **5개의 독립적인 메서드** - 각각 하나의 액션 처리
- 🔀 **다양한 시그니처** - void, 단일 인수, 이중 인수
- 📊 **상태 의존성** - `TurretHit`이 `_isBuffedA/B` 플래그 읽음
- ⏱️ **우선순위 중요** - 순서가 버프 활성화 여부 결정
- 🎨 **타입 불가지론** - 메서드가 타입 변환에 대해 모름

---

## 🔑 핵심 요점

| 개념                      | 구현                                            |
| ------------------------- | ----------------------------------------------- |
| 🌳 **플로우 그래프**       | 비대한 코드를 대체하는 시각적 병렬 디스패치     |
| 🎯 **트리거 노드**         | 자동으로 발동되는 다운스트림 이벤트             |
| 📋 **조건부 라우팅**       | 노드 조건이 실행을 필터링                       |
| ⏱️ **우선순위 순서**       | 분기 내 실행 시퀀스 제어                        |
| 🔀 **타입 변환**           | 노드별 자동 인수 적응                           |
| 🔒 **인수 차단**           | PassArgument 플래그가 데이터 전송 제어          |
| 📡 **병렬 실행**           | 모든 분기가 동시에 평가됨                       |

:::note 🎓 설계 인사이트

트리거 이벤트는 다음에 완벽합니다:

- **Fan-Out 아키텍처** - 하나의 액션이 많은 시스템을 트리거
- **조건부 라우팅** - sender/데이터에 기반한 다양한 로직 경로
- **우선순위 관리** - 실행 순서를 시각적으로 제어
- **타입 적응** - 호환되지 않는 이벤트 시그니처 연결
- **디커플링** - sender가 다운스트림 복잡성을 인식하지 못함

**트리거 vs 체인 이벤트:**
- **트리거 (병렬):** 모든 노드가 동시에 평가되며, 조건에 의해 필터링됨
- **체인 (순차):** 노드가 엄격한 선형 순서로 하나씩 실행됨

조건을 가진 병렬 분기가 필요할 때(예: 다양한 공격자에 반응하는 전투 시스템) **트리거**를 사용하세요. 보장된 순차 순서가 필요할 때(예: 튜토리얼 단계, 컷씬 시퀀스) **체인**을 사용하세요.

:::

:::warning ⚠️ 우선순위 주의사항

1. **동일한 우선순위:** 여러 노드가 동일한 우선순위를 가지면 실행 순서가 정의되지 않음
2. **분기 간 우선순위:** 우선순위는 동일한 조건부 분기 내에서만 중요함
3. **지연 상호작용:** 지연된 노드는 우선순위와 관계없이 지연되지 않은 노드 후에 실행될 수 있음
4. **상태 변경:** 상태 변경에 주의—이후 노드가 이전 변경을 봄

:::

---

## 🎯 다음 단계

병렬 트리거 이벤트를 마스터했습니다. 이제 보장된 순차 실행을 위한 **체인 이벤트**를 탐색해 봅시다.

**다음 챕터**: **[11 Chain Event](./11-chain-event.md)**에서 순차 체인에 대해 배우기

---

## 📚 관련 문서

- **[Flow Graph Editor](../flow-graph/game-event-node-editor.md)** - 노드 플로우 그래프 편집
- **[Node & Connector](../flow-graph/game-event-node-connector.md)** - 그래프의 시각적 언어 이해
- **[Node Behavior](../flow-graph/game-event-node-behavior.md)** - 노드 구성 및 조건
- **[Advanced Logic Patterns](../flow-graph/advanced-logic-patterns.md)** - 시스템이 트리거 vs 체인을 실행하는 방법
- **[Programmatic Flow](../scripting/programmatic-flow.md)** - FlowGraph API를 통한 프로세스 제어 구현 방법
- **[Best Practices](../scripting/best-practices.md)** - 복잡한 시스템을 위한 아키텍처 패턴