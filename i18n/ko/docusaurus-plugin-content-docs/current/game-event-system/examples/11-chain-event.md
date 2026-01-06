---
sidebar_label: '11 체인 이벤트'
sidebar_position: 12
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 11 체인 이벤트: 순차 실행 파이프라인

<VideoGif src="/video/game-event-system/example/11-chain-event.mp4" />

## 📋 개요

트리거 이벤트가 조건부 필터링과 함께 **병렬로** 실행되는 반면, 체인 이벤트는 **엄격한 순차 순서**로 실행됩니다—생산 파이프라인처럼 한 번에 한 단계씩. 체인의 어떤 노드가 조건 실패, 지연 또는 오류를 만나면 전체 시퀀스가 일시 중지되거나 종료됩니다. 이것은 컷씬, 무기 발사 시퀀스, 튜토리얼 단계 또는 순서가 중요한 모든 워크플로우에 완벽합니다.

:::tip 💡 배울 내용
- 체인(순차) 실행과 트리거(병렬) 실행의 차이점
- 검증 게이트로 조건 노드를 사용하는 방법
- 시퀀스에서 시간 지연을 위한 지연 노드
- 비동기 작업을 위한 완료 대기
- 조건 실패 시 조기 종료 패턴

:::

---

## 🎬 데모 씬
```
Assets/TinyGiants/GameEventSystem/Demo/11_ChainEvent/11_ChainEvent.unity
```

### 씬 구성

**시각적 요소:**
- 🔴 **Turret_A (왼쪽)** - 빨간색 발사기
- 🔵 **Turret_B (오른쪽)** - 파란색 발사기
- 🎯 **TargetDummy** - 중앙 캡슐 타겟
- 📺 **HoloDisplay** - 상태 표시 패널
  - 안전 장치가 꺼져 있을 때 "SAFELOCK READY" 표시
  - 안전 장치가 켜져 있을 때 "SAFELOCK ACTIVED" 표시

**UI 레이어 (Canvas):**
- 🎮 **세 개의 버튼** - 화면 하단
  - "Launch A" → `ChainEventRaiser.RequestLaunchA()` 트리거
  - "Launch B" → `ChainEventRaiser.RequestLaunchB()` 트리거
  - "Toggle SafeLock" (주황색) → `ChainEventReceiver.ToggleSafetyLock()` 트리거

**게임 로직 레이어:**
- 📤 **ChainEventRaiser** - 시퀀스 시작자
  - **하나**의 진입점만 참조: `0_StartSequence`
  - 다운스트림 파이프라인 단계에 대한 지식 없음
  
- 📥 **ChainEventReceiver** - 단계 실행자
  - 각 파이프라인 단계를 위한 5개의 메서드 포함
  - 조건 검증을 위한 `IsSafetyCheckPassed` 속성 노출
  - `isSafetyLockDisengaged` 플래그 포함(토글 가능)

---

## 🎮 상호작용 방법

### 5단계 발사 프로토콜

하나의 루트 이벤트(`0_StartSequence`)가 검증, 지연 및 비동기 대기가 있는 순차 파이프라인을 트리거합니다.

---

### 1단계: 플레이 모드 진입

Unity에서 **Play** 버튼을 누릅니다.

**초기 상태:**
- 안전 잠금: **해제됨** (기본값)
- HoloDisplay: "SAFELOCK READY"
- 두 포탑 모두 대기 중

---

### 2단계: 성공적인 발사 테스트 (안전 장치 꺼짐)

**현재 상태 확인:**
- HoloDisplay가 "SAFELOCK READY"를 표시하는지 확인
- 그렇지 않으면 "Toggle SafeLock"을 클릭하여 안전 장치를 **끔**

**"Launch A" 클릭:**

**순차 실행:**

**[단계 1: 시스템 확인]** - 즉시
- 🔍 조건 노드가 `ChainEventReceiver.IsSafetyCheckPassed` 속성 평가
- 속성이 `isSafetyLockDisengaged` 플래그 확인
- 결과: **TRUE** ✅
- 콘솔: `[Chain Step 1] Turret_A Checking...`
- **체인이 단계 2로 진행**

**[단계 2: 충전]** - 1.0초 지연
- ⏱️ 지연 노드가 **1.0초** 동안 실행 일시 중지
- VFX: 포탑에 충전 파티클 효과 생성
- 콘솔: `[Chain Step 2] Turret_A Charging...`
- 그래프가 계속하기 전에 정확히 1.0초 대기
- **지연 후, 체인이 단계 3으로 진행**

**[단계 3: 발사]** - 즉시
- 🚀 발사체가 인스턴스화되어 타겟을 향해 발사됨
- 포탑에서 총구 플래시 VFX
- 콘솔: `[Chain Step 3] Turret_A FIRED payload: 500`
- 발사체가 타겟으로 이동
- **체인이 즉시 단계 4로 진행**

**[단계 4: 냉각]** - 완료 대기
- 💨 Steam VFX 파티클 시스템 생성
- 🕐 **대기 노드** - 그래프가 VFX가 완료될 때까지 일시 중지(2.0초)
- 콘솔: `[Chain Step 4] Turret_A Cooldowning.`
- 지연(고정 시간)과 달리 실제 VFX 완료를 대기
- **스팀이 끝난 후, 체인이 단계 5로 진행**

**[단계 5: 보관]** - 즉시 (인수 차단됨)
- 📝 최종 로깅 단계
- 그래프에서 **PassArgument = FALSE** → 기본/null 값 수신
- 콘솔: `[Chain Step 5] Archived. Data Status: CLEAN`
- 다음 사용을 위해 포탑 잠금 해제
- **체인이 성공적으로 완료됨 ✅**

**타임라인:**
```
0.0s  → 단계 1: 시스템 확인 (즉시)
0.0s  → 단계 2: 충전 시작
1.0s  → 단계 3: 발사 (충전 지연 후)
1.0s  → 단계 4: 냉각 시작
3.0s  → 단계 5: 보관 (스팀 VFX ~2초 후)
3.0s  → 시퀀스 완료
```

**결과:** ✅ 전체 5단계 발사 시퀀스가 성공적으로 실행됨.

---

### 3단계: 실패한 발사 테스트 (안전 장치 켜짐)

**"Toggle SafeLock" 클릭:**
- 안전 플래그 변경: `isSafetyLockDisengaged = false`
- HoloDisplay 업데이트: "SAFELOCK ACTIVED"
- UI 버튼 색상이 주황색으로 변경(시각적 경고)
- 콘솔: `[Chain Settings] Safety Lock Disengaged: False`

**"Launch B" 클릭:**

**순차 실행:**

**[단계 1: 시스템 확인]** - **실패** ❌
- 🔍 조건 노드가 `ChainEventReceiver.IsSafetyCheckPassed` 평가
- 속성이 `isSafetyLockDisengaged` 확인 → **FALSE** 발견
- 속성이 실패 피드백 실행:
  - 🚨 빨간 알람 비네트가 3회 플래시
  - 알람 사운드 재생
  - 콘솔: `[Chain Blocked] Safety Check Failed. Sequence stopped immediately.`
- 조건이 **FALSE** 반환
- **🛑 체인이 여기서 종료됨**

**[단계 2-5]** - **절대 실행되지 않음**
- ❌ 충전 VFX 없음
- ❌ 발사체 발사되지 않음
- ❌ 스팀 냉각 없음
- ❌ 보관 로그 없음

**결과:** ❌ 게이트에서 발사 중단됨. 단계 2-5가 절대 실행되지 않음.

:::danger 🔴 중요한 체인 동작

체인 노드의 조건이 실패할 때:

1. **즉시 종료** - 해당 노드에서 실행 중지
2. **다운스트림 실행 없음** - 후속 노드가 절대 실행되지 않음
3. **부분 완료 없음** - 전부 아니면 전무 동작
4. **조기 정리** - 리소스가 즉시 잠금 해제됨

이것은 실패한 조건이 개별 분기를 건너뛰는 동안 다른 분기는 계속되는 트리거 이벤트와 근본적으로 다릅니다.

:::

---

## 🏗️ 씬 아키텍처

### 체인 vs 트리거: 근본적인 차이

**트리거 이벤트 (병렬):**
```
⚡ 루트 이벤트: OnInteraction
│
├─ 🔱 분기 A: [ 🛡️ 가드: `HasKey == true` ]
│  └─ 🚀 액션: OpenDoor() ➔ ✅ 조건 통과: 실행 중...
│
├─ 🔱 분기 B: [ 🛡️ 가드: `PlayerLevel >= 10` ]
│  └─ 🚀 액션: GrantBonusXP() ➔ ❌ 조건 실패: 분기 건너뜀
│
└─ 🔱 분기 C: [ 🛡️ 가드: `Always True` ]
   └─ 🚀 액션: PlaySound("Click") ➔ ✅ 조건 통과: 실행 중...
│
📊 요약: 2개 경로 실행됨 | 1개 경로 건너뜀 | ⚡ 타이밍: 동시
```

**체인 이벤트 (순차):**
```
🏆 시작: 루트 이벤트
│
├─ 1️⃣ [ 단계 1 ] ➔ 🛡️ 가드: `조건 A`
│  └─ ⏳ 상태: 완료 대기... ✅ 성공
│
├─ 2️⃣ [ 단계 2 ] ➔ 🛡️ 가드: `조건 B`
│  └─ ⏳ 상태: 완료 대기... ✅ 성공
│
├─ 3️⃣ [ 단계 3 ] ➔ 🛡️ 가드: `조건 C`
│  └─ ⏳ 상태: 완료 대기... ❌ 실패!
│
└─ 🛑 [ 종료됨 ] ➔ 로직 체인 중단
   └─ ⏭️ 단계 4: [ 건너뜀 ]
│
📊 최종 결과: 단계 3에서 중단됨 | ⏳ 모드: 엄격한 차단
```

**각각 사용 시기:**

| 패턴              | 체인 사용                          | 트리거 사용          |
| ----------------- | ---------------------------------- | -------------------- |
| **컷씬**          | ✅ 순차적 샷                        | ❌ 순서가 틀린 단계  |
| **전투 시스템**   | ❌ 엄격한 순서 불필요               | ✅ 병렬 시스템       |
| **튜토리얼**      | ✅ 단계 2 전에 단계 1 완료해야 함  | ❌ 단계가 겹칠 수 있음 |
| **무기 충전**     | ✅ 충전 → 발사 → 냉각              | ❌ 순서가 중요       |
| **업적**          | ❌ 독립적인 확인                    | ✅ 여러 트리거       |

---

### 이벤트 정의

![Game Event Editor](/img/game-event-system/examples/11-chain-event/demo-11-editor.png)

| 이벤트 이름       | 타입                                | 역할              | 단계  |
| ----------------- | ----------------------------------- | ----------------- | ----- |
| `0_StartSequence` | `GameEvent<GameObject, DamageInfo>` | **루트** (금색)   | 진입  |
| `1_SystemCheck`   | `GameEvent<GameObject, DamageInfo>` | **체인** (녹색)   | 1     |
| `2_Charge`        | `GameEvent<GameObject, DamageInfo>` | **체인** (녹색)   | 2     |
| `3_Fire`          | `GameEvent<GameObject, DamageInfo>` | **체인** (녹색)   | 3     |
| `4_CoolDown`      | `GameEvent<GameObject, DamageInfo>` | **체인** (녹색)   | 4     |
| `5_Archive`       | `GameEvent<GameObject, DamageInfo>` | **체인** (녹색)   | 5     |

**핵심 인사이트:**
- **루트**가 체인을 발동
- **체인 노드**가 순차적으로 자동 트리거됨
- 코드는 루트에서 `.Raise()`만 호출—그래프가 나머지 처리

---

### 플로우 그래프 구성

**"Flow Graph"** 버튼을 클릭하여 순차 파이프라인을 시각화합니다:

![Flow Graph Overview](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

**그래프 구조 (왼쪽에서 오른쪽):**

**노드 1: 0_StartSequence (루트, 빨강)**
- 코드에 의해 발동되는 진입점
- 타입: `GameEvent<GameObject, DamageInfo>`
- 첫 번째 체인 노드에 연결

**노드 2: 1_SystemCheck (체인, 녹색)**
- ✅ **조건 노드** - 게이트 키퍼
- **조건:** `ChainEventReceiver.IsSafetyCheckPassed == true`
  - 런타임에 씬 객체 속성 평가
  - false이면 → **체인이 즉시 중단됨**
- **액션:** `ChainEventReceiver.OnSystemCheck(sender, args)`
- 녹색 체크마크 아이콘은 조건이 활성화되었음을 나타냄
- PassArgument: ✓ 전달 (전체 데이터 전달됨)

**노드 3: 2_Charge (체인, 녹색)**
- ⏱️ **지연 노드** - 시간 지연 일시 중지
- **지연:** `1.0`초 (⏱️ 1s 아이콘으로 표시됨)
- **액션:** `ChainEventReceiver.OnStartCharging(sender, args)`
- 그래프가 정확히 1초 동안 여기서 정지
- PassArgument: ✓ 전달

**노드 4: 3_Fire (체인, 녹색)**
- 🎯 **액션 노드** - 표준 실행
- **액션:** `ChainEventReceiver.OnFireWeapon(sender, args)`
- 지연 없음, 조건 없음
- 이전 단계 후 즉시 실행
- PassArgument: ✓ 전달

**노드 5: 4_CoolDown (체인, 녹색)**
- 🕐 **대기 노드** - 비동기 완료
- **지연:** `0.5초` (최소 대기)
- **WaitForCompletion:** ✓ 체크됨 (⏱️ 1s 아이콘으로 표시됨)
  - 그래프가 receiver 코루틴이 끝날 때까지 대기
  - 고정 타이머가 아님—실제 완료 신호 대기
- **액션:** `ChainEventReceiver.OnCoolDown(sender, args)`
- PassArgument: ✓ 전달

**노드 6: 5_Archive (체인, 녹색)**
- 🔒 **필터 노드** - 데이터 살균
- **액션:** `ChainEventReceiver.OnSequenceArchived(sender, args)`
- **PassArgument:** 🔴 정적 (인수 차단됨)
  - 이전 노드가 전체 데이터를 전달했어도
  - 이 노드는 기본/null 값 수신
  - 체인 끝에서 데이터 방화벽 시연
- 최종 단계—다운스트림 노드 없음

**연결선:**
- 🟢 **녹색 "CHAIN" 선** - 순차 플로우
  - 각 출력 포트가 다음 입력 포트에 연결
  - 선형 토폴로지—분기 없음
  - 실행이 왼쪽에서 오른쪽으로 선을 따름

**범례:**
- 🔴 **루트 노드** - 진입점 (코드에 의해 발동됨)
- 🟢 **체인 노드** - 시퀀스에서 자동 트리거됨
- ✅ **체크마크 아이콘** - 조건이 활성화됨
- ⏱️ **시계 아이콘** - 지연 또는 대기가 구성됨
- 🔒 **정적 아이콘** - 인수가 차단됨

:::tip 🎨 비주얼 파이프라인 이점

체인 그래프는 다음에 대한 즉각적인 이해를 제공합니다:

- **순차 순서** - 왼쪽에서 오른쪽 플로우가 정확한 실행 순서 표시
- **검증 게이트** - 조건 노드가 체크포인트 역할
- **타이밍 제어** - 지연/대기 아이콘이 일시 중지 지점 표시
- **데이터 플로우** - PassArgument 토글이 데이터가 필터링되는 위치 표시
- **실패 지점** - 조건 노드가 체인이 중단될 수 있는 위치 표시

이것은 중첩된 `yield return` 문이 있는 코루틴을 읽는 것보다 무한히 깔끔합니다!

:::

---

### Sender 설정 (ChainEventRaiser)

**ChainEventRaiser** GameObject를 선택하세요:

![ChainEventRaiser Inspector](/img/game-event-system/examples/11-chain-event/demo-11-inspector.png)

**체인 진입점:**
- `Sequence Start Event`: `0_StartSequence`
  - 툴팁: "체인 그래프의 시작 노드"
  - 루트만 참조—다운스트림은 그래프가 처리

**포탑:**
- **Turret A:** Turret_A (GameObject), Head A (Transform)
- **Turret B:** Turret_B (GameObject), Head B (Transform)

**타겟팅:**
- `Hit Target`: TargetDummy (Transform)

**중요한 관찰:**
트리거 데모와 마찬가지로 sender는 **하나**의 이벤트만 알고 있습니다. 5단계 파이프라인은 그래프로 완전히 추상화되었습니다.

---

### Receiver 설정 (ChainEventReceiver)

**ChainEventReceiver** GameObject를 선택하세요:

![ChainEventReceiver Inspector](/img/game-event-system/examples/11-chain-event/demo-11-receiver.png)

**씬 참조:**
- `Chain Event Raiser`: ChainEventRaiser (잠금 해제 콜백용)
- `Holo Text`: LogText (TextMeshPro) - 잠금 상태 표시

**타겟 참조:**
- `Target Dummy`, `Target Rigidbody`

**VFX & 발사체:**
- `Projectile Prefab`: Projectile (TurretProjectile)
- `Charge VFX`: TurretBuffAura (Particle System) - 단계 2
- `Fire VFX`: MuzzleFlashVFX (Particle System) - 단계 3
- `Steam VFX`: SteamVFX (Particle System) - 단계 4
- `Hit Normal/Crit VFX`, `Floating Text Prefab`

**오디오:**
- `Hit Clip`, `UI Clip`, `Alarm Clip`

**화면:**
- `Screen Group`: AlarmVignette (CanvasGroup) - 실패 시 빨간색 플래시

**시뮬레이션 설정:**
- ✅ `Is Safety Lock Disengaged`: TRUE (기본값)
  - 단계 1 조건이 통과하는지 제어
  - "Toggle SafeLock" 버튼으로 토글 가능

---

## 💻 코드 분석

### 📤 ChainEventRaiser.cs (Sender)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class ChainEventRaiser : MonoBehaviour
{
    [Header("Chain Entry Point")]
    [Tooltip("체인 그래프의 시작 노드.")]
    [GameEventDropdown]
    public GameEvent<GameObject, DamageInfo> sequenceStartEvent;

    [Header("Turrets")] 
    public GameObject turretA;
    public GameObject turretB;
    // ... head transforms ...

    private bool _isBusyA;
    private bool _isBusyB;

    /// <summary>
    /// UI 버튼 A: Turret A의 발사 요청.
    /// 
    /// 중요: 루트 이벤트만 발동합니다.
    /// 체인 그래프가 자동으로 5개의 다운스트림 단계를 모두 조율합니다.
    /// </summary>
    public void RequestLaunchA()
    {
        if (sequenceStartEvent == null) return;

        Debug.Log("<color=cyan>[Raiser] Requesting Launch Protocol A...</color>");
        _isBusyA = true;

        // 데이터 페이로드 구축
        DamageInfo info = new DamageInfo(500f, true, DamageType.Physical, 
                                        hitTarget.position, "Commander");
        
        // 마법: 단일 .Raise()가 전체 5단계 체인 시작
        // 그래프가 자동으로 실행:
        // 1. 시스템 확인 (조건 포함)
        // 2. 충전 (1초 지연 포함)
        // 3. 발사 (즉시)
        // 4. 냉각 (완료 대기 포함)
        // 5. 보관 (차단된 인수 포함)
        sequenceStartEvent.Raise(turretA, info);
    }

    /// <summary>
    /// UI 버튼 B: Turret B의 발사 요청.
    /// 동일한 로직, 다른 포탑.
    /// </summary>
    public void RequestLaunchB()
    {
        if (sequenceStartEvent == null) return;

        Debug.Log("<color=orange>[Raiser] Requesting Launch Protocol B...</color>");
        _isBusyB = true;

        DamageInfo info = new DamageInfo(200f, false, DamageType.Physical, 
                                        hitTarget.position, "Commander");
        sequenceStartEvent.Raise(turretB, info);
    }

    // 시퀀스가 완료되거나 실패할 때 receiver가 호출하는 잠금 해제 메서드
    public void UnlockTurretA() => _isBusyA = false;
    public void UnlockTurretB() => _isBusyB = false;
}
```

**핵심 포인트:**
- 🎯 **단일 이벤트 참조** - 루트 이벤트만 알고 있음
- 📡 **제로 파이프라인 지식** - 5단계에 대한 아이디어 없음
- 🔓 **잠금 해제 콜백** - Receiver가 완료/실패 신호
- 🎬 **최대 디커플링** - 모든 시퀀스 로직이 그래프에 있음

---

### 📥 ChainEventReceiver.cs (Listener)
```csharp
using UnityEngine;
using System.Collections;

public class ChainEventReceiver : MonoBehaviour
{
    [Header("Simulation Settings")]
    [Tooltip("TRUE이면 확인 통과. FALSE이면 단계 1에서 체인 중단.")]
    public bool isSafetyLockDisengaged = true;

    /// <summary>
    /// '1_SystemCheck' 노드 조건에 의해 액세스되는 속성.
    /// 
    /// 그래프 구성: 씬 객체 → 속성 → IsSafetyCheckPassed
    /// 
    /// 중요: 이것은 노드 액션이 실행되기 전에 평가됩니다.
    /// 이것이 false를 반환하면 체인이 즉시 종료됩니다.
    /// </summary>
    public bool IsSafetyCheckPassed
    {
        get
        {
            bool result = true;

            if (!isSafetyLockDisengaged)
            {
                // 실패 경로: 안전 잠금이 작동 중
                result = false;
                
                Debug.LogWarning(
                    "<color=red>[Chain Blocked] Safety Check Failed. " +
                    "Sequence stopped immediately.</color>");
                
                // 실패에 대한 시각적 피드백
                StopCoroutine(nameof(ScreenRoutine));
                if (screenGroup) StartCoroutine(ScreenRoutine());
            }

            return result;
        }
    }

    /// <summary>
    /// 안전 잠금 상태를 토글합니다. 이것을 UI 버튼에 바인딩하세요.
    /// </summary>
    public void ToggleSafetyLock()
    {
        if (UIClip) _audioSource.PlayOneShot(UIClip);
        
        isSafetyLockDisengaged = !isSafetyLockDisengaged;
        
        // UI 업데이트
        string text = isSafetyLockDisengaged ? "SAFELOCK READY" : "SAFELOCK ACTIVED";
        if (holoText) holoText.text = text;

        Debug.Log($"[Chain Settings] Safety Lock Disengaged: {isSafetyLockDisengaged}");
    }

    /// <summary>
    /// [체인 단계 1] 시스템 확인
    /// '1_SystemCheck' 체인 노드에 바인딩됨.
    /// 
    /// 참고: 이 액션은 조건이 통과한 후에 실행됩니다.
    /// 조건이 실패하면 이 메서드는 절대 실행되지 않습니다.
    /// </summary>
    public void OnSystemCheck(GameObject sender, DamageInfo args)
    {
        bool isA = sender != null && sender.name.Contains("Turret_A");
        
        // 여기에 도달하면 조건이 통과됨
        // 하지만 여전히 잠재적인 엣지 케이스 처리
        if (!IsSafetyCheckPassed)
        {
            // 시퀀스 실패로 포탑 잠금 해제
            if (isA) chainEventRaiser.UnlockTurretA();
            else chainEventRaiser.UnlockTurretB();
        }

        Debug.Log($"[Chain Step 1] {sender.name} Checking...");
    }

    /// <summary>
    /// [체인 단계 2] 충전
    /// 1.0초 지연이 있는 '2_Charge' 체인 노드에 바인딩됨.
    /// 
    /// 그래프가 이 메서드를 호출하기 전에 1초 동안 일시 중지합니다.
    /// 이것이 실행될 때 1.0초가 이미 경과했습니다.
    /// </summary>
    public void OnStartCharging(GameObject sender, DamageInfo args)
    {
        if (chargeVFX)
        {
            var vfx = Instantiate(chargeVFX, sender.transform.position + Vector3.up * 1.5f, 
                                 Quaternion.identity);
            vfx.transform.SetParent(sender.transform);
            vfx.Play();
            Destroy(vfx.gameObject, 1.2f);
        }

        Debug.Log($"[Chain Step 2] {sender.name} Charging...");
    }

    /// <summary>
    /// [체인 단계 3] 발사
    /// '3_Fire' 체인 노드에 바인딩됨.
    /// 
    /// 발사체를 생성하고 타겟을 향해 발사합니다.
    /// 이것은 단계 2가 완료된 직후 실행됩니다.
    /// </summary>
    public void OnFireWeapon(GameObject sender, DamageInfo args)
    {
        // 총구 플래시 생성
        if (fireVFX)
        {
            Vector3 spawnPos = sender.transform.position + 
                             sender.transform.forward * 1.5f + Vector3.up * 1.5f;
            var vfx = Instantiate(fireVFX, spawnPos, sender.transform.rotation);
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        // 발사체 발사
        if (projectilePrefab != null)
        {
            var muzzlePos = sender.transform.Find("Head/Barrel/MuzzlePoint");
            var shell = Instantiate(projectilePrefab, muzzlePos.position, 
                                   sender.transform.rotation);

            shell.Initialize(args.hitPoint, 20f, () =>
            {
                // 충돌 콜백
                if (hitClip) _audioSource.PlayOneShot(hitClip);
                
                // 히트 VFX, 떠다니는 텍스트 생성, 물리 적용...
                ParticleSystem vfxToPlay = args.isCritical ? hitCritVFX : hitNormalVFX;
                
                if (args.isCritical)
                    StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
                
                // ... (VFX, 물리, 텍스트 로직) ...
            });
        }

        Debug.Log($"[Chain Step 3] {sender.name} FIRED payload: {args.amount}");
    }

    /// <summary>
    /// [체인 단계 4] 냉각
    /// WaitForCompletion이 있는 '4_CoolDown' 체인 노드에 바인딩됨.
    /// 
    /// 그래프가 단계 5로 진행하기 전에 이 코루틴이 끝날 때까지 대기합니다.
    /// 지연(고정 시간)과 달리 실제 작업 완료를 대기합니다.
    /// </summary>
    public void OnCoolDown(GameObject sender, DamageInfo args)
    {
        if (steamVFX)
        {
            var vfx = Instantiate(steamVFX, sender.transform.position + Vector3.up, 
                                 Quaternion.Euler(-90, 0, 0));
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        Debug.Log($"[Chain Step 4] {sender.name} Cooldowning.");
    }

    /// <summary>
    /// [체인 단계 5] 보관
    /// PassArgument = FALSE인 '5_Archive' 체인 노드에 바인딩됨.
    /// 
    /// 중요: 이전 단계가 전체 DamageInfo를 전달했어도
    /// 이 노드는 그래프 구성으로 인해 기본/NULL 값을 받습니다.
    /// 
    /// 데이터 방화벽 시연—체인 끝에서 민감한 데이터를 살균할 수 있습니다.
    /// </summary>
    public void OnSequenceArchived(GameObject sender, DamageInfo args)
    {
        bool isA = sender != null && sender.name.Contains("Turret_A");

        // 다음 사용을 위해 포탑 잠금 해제
        if (isA) chainEventRaiser.UnlockTurretA();
        else chainEventRaiser.UnlockTurretB();

        // 데이터가 성공적으로 차단되었는지 확인
        bool isClean = (args == null || args.amount == 0);
        string logMsg = isClean ? "<color=cyan>CLEAN</color>" : "<color=red>LEAKED</color>";

        Debug.Log($"[Chain Step 5] Archived. Data Status: {logMsg}");
    }

    private IEnumerator ScreenRoutine()
    {
        // 빨간 알람 비네트 플래시 애니메이션
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
                screenGroup.alpha = alpha * 0.8f;
                yield return null;
            }

            screenGroup.alpha = 0f;
            yield return new WaitForSeconds(0.1f);
        }
    }
}
```

**핵심 포인트:**
- 🎯 **5개의 독립적인 메서드** - 각각 하나의 파이프라인 단계 처리
- ✅ **조건을 위한 속성** - 그래프에 의해 평가되는 `IsSafetyCheckPassed`
- ⏱️ **타이밍 불가지론** - 메서드가 지연에 대해 모름
- 🔒 **데이터 방화벽** - 단계 5가 살균된 데이터 수신
- 🎬 **완료 콜백** - 성공/실패 시 포탑 잠금 해제

---

## 🔑 핵심 요점

| 개념                       | 구현                                      |
| -------------------------- | ----------------------------------------- |
| 🔗 **순차 실행**            | 노드가 엄격한 순서로 하나씩 실행됨        |
| ✅ **검증 게이트**          | 조건 노드가 실패 시 체인 종료             |
| ⏱️ **지연 노드**            | 단계 간 고정 시간 일시 중지               |
| 🕐 **대기 노드**            | 비동기 완료 대기(고정 시간 아님)          |
| 🔒 **데이터 필터링**        | PassArgument가 노드별 데이터 플로우 제어  |
| 🛑 **조기 종료**            | 실패한 조건이 전체 체인 중지              |
| 🎯 **전부 아니면 전무**     | 체인이 완전히 완료되거나 조기 종료됨      |

:::note 🎓 설계 인사이트

체인 이벤트는 다음에 완벽합니다:

- **컷씬** - 샷 1 → 샷 2 → 샷 3 정확한 순서로
- **무기 시퀀스** - 충전 → 발사 → 냉각 → 재장전
- **튜토리얼 단계** - N+1 단계 전에 N 단계를 완료해야 함
- **제작 레시피** - 순차적인 재료 추가
- **보스 단계** - 검증이 있는 단계 전환
- **주문 시전** - 채널링 → 시전 → 효과 → 회복

**체인 vs 코루틴:**
다음을 작성하는 대신:
```csharp
IEnumerator LaunchSequence()
{
    if (!SafetyCheck()) yield break;
    Charge();
    yield return new WaitForSeconds(1.0f);
    Fire();
    yield return StartCoroutine(CoolDown());
    Archive();
}
```

다음과 같은 체인 그래프를 사용하세요:
- 타이밍이 디자이너에 의해 **표시**되고 **편집 가능**
- 조건이 숨겨진 `if` 문이 아닌 **시각적 체크포인트**
- 비동기 대기가 하드코딩되지 않고 **구성 가능**
- 전체 파이프라인이 그래프 시각화를 통해 **디버깅 가능**

:::

:::warning ⚠️ 체인 주의사항

1. **차단 동작:** 단계 3에 버그가 있어 절대 완료되지 않으면 단계 4-5가 절대 실행되지 않음
2. **조건 타이밍:** 조건이 노드 액션 전에 평가됨—액션의 부작용을 사용할 수 없음
3. **병렬 분기 없음:** 단계 2A와 단계 2B를 동시에 실행할 수 없음 (그것에 트리거 사용)
4. **지연 누적:** 여러 지연이 합산됨—각각 1초인 3개 노드 = 총 3초 대기
5. **조기 종료 정리:** 항상 조건 실패 경로에서 리소스 잠금 해제

:::

---

## 🎯 다음 단계

순차 체인 실행을 마스터했습니다. 예제 시리즈는 더 고급 패턴으로 계속됩니다.

**다음 챕터**: **[12 Multi Database](./12-multi-database.md)**에서 고급 데모 계속 탐색하기

---

## 📚 관련 문서

- **[Flow Graph Editor](../flow-graph/game-event-node-editor.md)** - 노드 플로우 그래프 편집
- **[Node & Connector](../flow-graph/game-event-node-connector.md)** - 그래프의 시각적 언어 이해
- **[Node Behavior](../flow-graph/game-event-node-behavior.md)** - 노드 구성 및 조건
- **[Advanced Logic Patterns](../flow-graph/advanced-logic-patterns.md)** - 시스템이 트리거 vs 체인을 실행하는 방법
- **[Programmatic Flow](../scripting/programmatic-flow.md)** - FlowGraph API를 통한 프로세스 제어 구현 방법
- **[Best Practices](../scripting/best-practices.md)** - 복잡한 시스템을 위한 아키텍처 패턴