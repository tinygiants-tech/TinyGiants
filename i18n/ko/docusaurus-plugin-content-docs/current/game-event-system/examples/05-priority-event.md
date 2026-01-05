---
sidebar_label: '05 우선순위 이벤트'
sidebar_position: 6
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 05 우선순위 이벤트: 실행 순서의 중요성

<!-- <VideoGif src="/video/game-event-system/05-priority-event.mp4" /> -->

## 📋 개요

게임 로직에서 **순서는 매우 중요합니다**. 단일 이벤트에 여러 액션이 반응할 때, 그 실행 순서에 따라 결과가 극적으로 달라질 수 있습니다. 이 데모는 코드 변경 없이 에디터 설정만으로 일반 공격을 강력한 크리티컬 히트로 바꾸는 방법을 보여줍니다.

:::tip 💡 배울 내용
- 실행 순서가 게임플레이 로직에 미치는 영향
- 비헤이비어 창(Behavior Window)에서 리스너 우선순위를 설정하는 방법
- "버프 후 공격(Buff-Then-Attack)" 패턴의 실제 작동 방식
- 순서 의존적 로직 문제를 디버깅하는 방법

:::

---

## 🎬 데모 씬
```
Assets/TinyGiants/GameEventSystem/Demo/05_PriorityEvent/05_PriorityEvent.unity
```

### 씬 구성

**UI 레이어 (Canvas):**
- 🎮 **두 개의 공격 버튼** - 화면 하단에 위치
  - "Raise (Chaotic Hit)" ➔ `PriorityEventRaiser.FireChaoticSequence()` 호출 (잘못된 순서)
  - "Raise (Ordered Hit)" ➔ `PriorityEventRaiser.FireOrderedSequence()` 호출 (올바른 순서)

**게임 로직 레이어 (데모 스크립트):**
- 📤 **PriorityEventRaiser** - 발생기 스크립트가 포함된 게임 오브젝트
  - 터렛 조준 및 발사체 발사를 관리합니다.
  - `OnChaoticHit` 및 `OnOrderedHit` 두 이벤트에 대한 참조를 보유합니다.
  - 두 이벤트 모두 동일한 `GameEvent<GameObject, DamageInfo>` 타입을 사용합니다.

- 📥 **PriorityEventReceiver** - 수신기 스크립트가 포함된 게임 오브젝트
  - 각 이벤트에 바인딩된 두 개의 리스너 메서드를 가집니다:
    - **ActivateBuff**: 크리티컬 데미지 모드를 활성화합니다.
    - **ResolveHit**: 현재 버프 상태에 따라 데미지를 계산합니다.
  - 이 메서드들의 실행 순서가 전투 결과를 결정합니다.

**시각적 피드백 레이어 (데모 오브젝트):**
- 🎯 **SentryTurret** - 공격자
  - 버프가 활성화되면 회색에서 **황금색**으로 변합니다.
  - 활성화 시 파티클 오라 효과를 생성합니다.
- 🎯 **TargetDummy** - 타겟 더미(캡슐)
  - 물리적 노크백을 위한 리지드바디를 가집니다.
- 💥 **VFX 시스템** - 일반 히트와 크리티컬 히트에 따른 서로 다른 효과
  - 일반: 작은 연기 효과
  - 크리티컬: 거대한 폭발 + 카메라 흔들림
- 🏠 **Plane** - 바닥 지면

---

## 🎮 상호작용 방법

### 실험 설정

두 버튼 모두 동일한 물리 발사체를 발사하지만, **리스너 순서 설정이 서로 다른** 별개의 이벤트를 트리거합니다.

### 1단계: 플레이 모드 진입

유니티의 **Play** 버튼을 눌러 데모를 시작합니다.

### 2단계: 잘못된 순서 테스트 (Chaotic Hit)

**왼쪽의 "Raise (Chaotic Hit)" 클릭:**

**발생하는 일:**
1. 🎯 터렛이 조준하고 발사체를 발사합니다.
2. 💥 발사체가 타겟에 명중합니다.
3. 🔴 **문제 발생:** 데미지 계산이 **먼저** 이루어집니다 (ResolveHit 실행).
   - 결과: `-10`의 약한 데미지 (회색 텍스트)
   - 효과: 작은 연기 VFX
4. ✨ 버프 활성화가 **나중에** 이루어집니다 (ActivateBuff 실행).
   - 터렛이 황금색으로 변하며 파티클 오라가 나타납니다.
   - **이미 늦었습니다!** 데미지 계산은 이미 끝난 상태입니다.

**콘솔 출력:**
```
[Receiver] (B) RESOLVE: No buff detected. Weak hit. (Check Priority Order!)
[Receiver] (A) BUFF ACTIVATED! Systems at 300% power.
```

**결과:** ❌ 데미지 계산 시점에 버프가 활성화되지 않았으므로 일반 히트가 발생합니다.

---

### 3단계: 올바른 순서 테스트 (Ordered Hit)

**우측의 "Raise (Ordered Hit)" 클릭:**

**발생하는 일:**
1. 🎯 터렛이 조준하고 발사체를 발사합니다.
2. 💥 발사체가 타겟에 명중합니다.
3. ✨ **정상 작동:** 버프 활성화가 **먼저** 이루어집니다 (ActivateBuff 실행).
   - 터렛이 황금색으로 변하며 파티클 오라가 나타납니다.
   - 내부 `_isBuffActive` 플래그가 `true`로 설정됩니다.
4. 🔴 데미지 계산이 **두 번째**로 이루어집니다 (ResolveHit 실행).
   - 버프 플래그를 확인합니다: **활성화됨(ACTIVE)!**
   - 결과: `CRIT! -50` (주황색 텍스트, 5배 데미지 배율)
   - 효과: 거대한 폭발 VFX + 카메라 흔들림

**콘솔 출력:**
```
[Receiver] (A) BUFF ACTIVATED! Systems at 300% power.
[Receiver] (B) RESOLVE: Buff detected! CRITICAL EXPLOSION.
```

**결과:** ✅ 데미지 계산 시점에 버프가 활성화되어 있었으므로 크리티컬 히트가 발생합니다.

---

## 🏗️ 씬 아키텍처

### "버프 후 공격" 문제

이는 게임 개발에서 흔히 발생하는 패턴입니다:
```
⚡ 이벤트 발생: OnHit
│
├─ 🥇 1순위 액션: [우선순위 10]
│  └─ 🛡️ ActivateBuff() ➔ `_isBuffActive = true` 설정 🟢
│
└─ 🥈 2순위 액션: [우선순위 5]
   └─ ⚔️ ResolveHit()  ➔ If (_isBuffActive) ? 💥 CRIT : 🛡️ NORMAL
│
🎯 결과: 크리티컬 히트 (업데이트된 상태를 기반으로 로직 해결)
```

**과제:**
만약 `ResolveHit`이 `ActivateBuff`보다 먼저 실행되면, 동일한 이벤트에 버프가 "연결"되어 있음에도 불구하고 플래그가 아직 설정되지 않아 일반 데미지가 발생하게 됩니다.

---

### 이벤트 정의 (Event Definitions)

두 이벤트는 동일한 타입을 사용하지만 비헤이비어 설정이 다릅니다:

![Game Event Editor](/img/game-event-system/examples/05-priority-event/demo-05-editor.png)

| 이벤트 이름 | 타입 | 리스너 순서 |
| -------------- | ----------------------------------- | ------------------------------------- |
| `OnChaoticHit` | `GameEvent<GameObject, DamageInfo>` | ❌ ResolveHit → ActivateBuff (잘못됨) |
| `OnOrderedHit` | `GameEvent<GameObject, DamageInfo>` | ✅ ActivateBuff → ResolveHit (올바름) |

:::note 🔧 동일한 타입, 다른 순서

두 이벤트 모두 `GameEvent<GameObject, DamageInfo>` 타입입니다. 유일한 차이점은 [비헤이비어 창](../visual-workflow/game-event-behavior.md)에서 설정된 **리스너 실행 순서**입니다.

:::

---

### 비헤이비어 설정 비교

결정적인 차이는 **비헤이비어 창** 설정에 있습니다.

#### ❌ 잘못된 순서 (OnChaoticHit)

![Chaotic Behavior](/img/game-event-system/examples/05-priority-event/demo-05-behavior-chaotic.png)

**실행 시퀀스:**
1. `ResolveHit` (상단 위치 - 먼저 실행)
2. `ActivateBuff` (하단 위치 - 나중에 실행)

**결과:** 버프 적용 전 데미지 계산 = 일반 히트

#### ✅ 올바른 순서 (OnOrderedHit)

![Ordered Behavior](/img/game-event-system/examples/05-priority-event/demo-05-behavior-ordered.png)

**실행 시퀀스:**
1. `ActivateBuff` (상단 위치 - 먼저 실행)
2. `ResolveHit` (하단 위치 - 나중에 실행)

**결과:** 데미지 계산 전 버프 적용 = 크리티컬 히트

:::tip 🎯 드래그 앤 드롭으로 순서 변경

비헤이비어 창에서 각 리스너 왼쪽의 **핸들**(`≡`)을 드래그하여 실행 순서를 변경할 수 있습니다. 이는 코드 수정 없이 게임플레이 로직을 수정하는 시각적인 방법입니다!

:::

---

### 송신자 설정 (PriorityEventRaiser)

하이어라키에서 **PriorityEventRaiser** 게임 오브젝트를 선택하십시오:

![PriorityEventRaiser Inspector](/img/game-event-system/examples/05-priority-event/demo-05-inspector.png)

**이벤트 채널:**
- `Ordered Hit Event`: `OnOrderedHit` (올바르게 설정됨)
  - 툴팁: "Apply Buff → Then Fire"
- `Chaotic Hit Event`: `OnChaoticHit` (잘못 설정됨)
  - 툴팁: "Fire → Then Apply Buff (Too late!)"

**설정:**
- `Turret Head`: 조준을 위한 Transform
- `Turret Muzzle Position`: 발사체 생성 위치
- `Projectile Prefab`: 발사체 시각 효과
- `Muzzle Flash VFX`: 발사 시 파티클 시스템
- `Hit Target`: 타겟 더미 Transform

---

### 수신자 설정 (PriorityEventReceiver)

하이어라키에서 **PriorityEventReceiver** 게임 오브젝트를 선택하십시오:

![PriorityEventReceiver Inspector](/img/game-event-system/examples/05-priority-event/demo-05-receiver.png)

**시각적 설정:**
- `Turret Root`: SentryTurret (Transform)
- `Turret Renderers`: 렌더러 배열 (터렛 바디)
- `Normal Mat`: 회색 마텔리얼 (기본 상태)
- `Buffed Mat`: 황금색 마테리얼 (버프 상태)
- `Buff Aura Prefab`: 버프 시각화를 위한 시안색 파티클 효과

**VFX 설정:**
- `Hit Normal VFX`: 작은 연기 파티클 시스템
- `Hit Crit VFX`: 거대한 폭발 파티클 시스템
- `Floating Text Prefab`: 데미지 숫자 표시기

**대상 참조:**
- `Hit Target`: 타겟 더미 Transform
- `Target Rigidbody`: 노크백을 위한 리지드바디

---

## 💻 코드 분석

### 📤 PriorityEventRaiser.cs (이벤트 송신자)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class PriorityEventRaiser : MonoBehaviour
{
    [Header("이벤트 채널")]
    [Tooltip("에디터 설정: 버프 적용 -> 그 후 발사")]
    [GameEventDropdown] public GameEvent<GameObject, DamageInfo> orderedHitEvent;

    [Tooltip("에디터 설정: 발사 -> 그 후 버프 적용 (너무 늦음!)")]
    [GameEventDropdown] public GameEvent<GameObject, DamageInfo> chaoticHitEvent;

    private GameEvent<GameObject, DamageInfo> _pendingEvent;

    /// <summary>
    /// 버튼 A: "Ordered" 이벤트를 트리거하는 공격 시퀀스를 시작합니다.
    /// </summary>
    public void FireOrderedSequence()
    {
        if (orderedHitEvent == null) return;
        _pendingEvent = orderedHitEvent;
        _isAttacking = true;
        Debug.Log("[Sender] 정렬된(ORDERED) 공격 시퀀스 시작...");
    }

    /// <summary>
    /// 버튼 B: "Chaotic" 이벤트를 트리거하는 공격 시퀀스를 시작합니다.
    /// </summary>
    public void FireChaoticSequence()
    {
        if (chaoticHitEvent == null) return;
        _pendingEvent = chaoticHitEvent;
        _isAttacking = true;
        Debug.Log("[Sender] 혼란스러운(CHAOTIC) 공격 시퀀스 시작...");
    }

    private void FireProjectile()
    {
        // ... 발사체 생성 로직 ...
        
        shell.Initialize(hitTarget.position, 15f, () => 
        {
            DamageInfo info = new DamageInfo(10f, false, DamageType.Physical, 
                                            hitTarget.position, "Sentry Turret");
            
            // 대기 중인 이벤트(Ordered 또는 Chaotic)를 발생시킵니다.
            if(_pendingEvent != null) 
                _pendingEvent.Raise(this.gameObject, info);
            
            Debug.Log($"[Sender] 명중! 이벤트 '{_pendingEvent?.name}' 발생.");
        });
    }
}
```

**핵심 포인트:**
- 🎯 **동일한 송신자 코드** - 두 이벤트 모두 동일한 발생(Raise) 로직을 사용합니다.
- 📦 **이벤트 선택** - `_pendingEvent` 변수가 어떤 이벤트를 발생시킬지 결정합니다.
- 🔇 **순서 무관성** - 송신자는 리스너의 실행 순서에 대해 알지 못합니다.

---

### 📥 PriorityEventReceiver.cs (이벤트 리스너)
```csharp
using UnityEngine;
using System.Collections;

public class PriorityEventReceiver : MonoBehaviour
{
    [SerializeField] private Renderer[] turretRenderers;
    [SerializeField] private Material buffedMat;
    [SerializeField] private ParticleSystem buffAuraPrefab;
    
    private bool _isBuffActive; // 핵심 상태 플래그

    /// <summary>
    /// [리스너 메서드 A]
    /// 버프 상태와 시각 효과를 활성화합니다.
    /// 
    /// 우선순위의 영향:
    /// - ResolveHit 보다 위에 설정된 경우: 데미지 계산 전 버프 적용 → 크리티컬 히트
    /// - ResolveHit 보다 아래에 설정된 경우: 데미지 계산 후 버프 적용 → 일반 히트
    /// </summary>
    public void ActivateBuff(GameObject sender, DamageInfo args)
    {
        _isBuffActive = true; // <-- 핵심 상태 변경 지점
        
        // 시각적 피드백: 황금색 마테리얼 + 파티클 오라
        foreach (var r in turretRenderers) 
            if(r) r.material = buffedMat;

        if (buffAuraPrefab != null)
        {
            _activeBuffEffect = Instantiate(buffAuraPrefab, turretRoot.position, 
                                           Quaternion.identity);
            _activeBuffEffect.transform.SetParent(turretRoot);
            _activeBuffEffect.Play();
        }

        Debug.Log("<color=cyan>[Receiver] (A) 버프 활성화! 시스템 출력 300%.</color>");
    }
    
    /// <summary>
    /// [리스너 메서드 B]
    /// 현재 버프 상태를 기반으로 데미지를 계산하고 VFX를 생성합니다.
    /// 
    /// 로직: 실행되는 "정확한 순간"의 _isBuffActive 상태를 확인합니다.
    /// 올바른 동작을 위해 ActivateBuff가 이 메서드보다 먼저 실행되어야 합니다.
    /// </summary>
    public void ResolveHit(GameObject sender, DamageInfo args)
    {
        float finalDamage = args.amount;
        bool isCrit = false;
        ParticleSystem vfxToPlay;

        // 실행되는 바로 이 순간의 플래그를 확인합니다.
        if (_isBuffActive)
        {
            // 크리티컬 경로
            finalDamage *= 5f; // 5배 데미지 배율
            isCrit = true;
            vfxToPlay = hitCritVFX;
            
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
            Debug.Log("<color=green>[Receiver] (B) RESOLVE: 버프 감지! 크리티컬 폭발.</color>");
        }
        else
        {
            // 일반 경로
            vfxToPlay = hitNormalVFX;
            Debug.Log("<color=red>[Receiver] (B) RESOLVE: 버프 없음. 일반 히트. (우선순위 확인 필요!)</color>");
        }

        // 적절한 VFX 생성
        if (vfxToPlay != null)
        {
            var vfx = Instantiate(vfxToPlay, args.hitPoint, Quaternion.identity);
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        // 물리 및 UI 피드백 적용
        ApplyPhysicsKnockback(args, isCrit);
        ShowFloatingText(finalDamage, isCrit, hitTarget.position);
        
        StartCoroutine(ResetRoutine());
    }
    
    private IEnumerator ResetRoutine()
    {
        yield return new WaitForSeconds(1.5f);
        _isBuffActive = false; // 다음 공격을 위해 리셋
        // ... 비주얼 리셋 ...
    }
}
```

**핵심 포인트:**
- 🎯 **상태 의존성** - `ResolveHit`의 동작은 전적으로 `_isBuffActive` 플래그에 의존합니다.
- ⏱️ **타이밍의 중요성** - 데미지 계산 전에 플래그가 설정되어야 합니다.
- 🔀 **순서 의존적 로직** - 동일한 코드라도 실행 순서에 따라 결과가 달라집니다.
- 🎨 **시각적 피드백** - 각 경로에 따라 서로 다른 VFX, 텍스트 크기 및 효과를 제공합니다.

---

## 🔑 핵심 요약

| 개념 | 구현 방식 |
| -------------------------- | ------------------------------------------------------------ |
| 🎯 **실행 순서** | 리스너 순서가 게임플레이 로직에 직접적인 영향을 미침 |
| 🎨 **시각적 설정** | 코드 변경 없이 비헤이비어 창에서 드래그 앤 드롭으로 설정 가능 |
| 🔀 **상태 관리** | 리스너가 공유 상태를 수정할 때 실행 순서가 매우 중요함 |
| 🐛 **디버그 패턴** | 콘솔 로그를 통해 순서 관련 버그를 쉽게 식별 가능 |
| 🔄 **게임플레이 설계** | 순서 제어를 통해 콤보 시스템, 버프 중첩 등을 구현 가능 |

:::note 🧠 디자인 인사이트

실행 순서는 다음의 경우에 매우 중요합니다:

- **버프 시스템** - 효과를 계산하기 전에 수정 사항을 먼저 적용해야 함
- **콤보 체인** - 다음 액션을 트리거하기 전에 조건을 먼저 검증해야 함
- **쉴드 메커니즘** - 데미지를 적용하기 전에 흡수량을 먼저 확인해야 함
- **트리거 시퀀스** - 의존적인 로직을 실행하기 전에 전제 조건이 충족되었는지 확인해야 함

로직이 의도한 대로 작동하는지 확인하기 위해 항상 두 가지 순서를 모두 테스트해 보십시오!

:::

---

## 🎯 다음 단계는?

실행 순서를 마스터했습니다. 이제 이벤트를 더 똑똑하게 만드는 **조건부 이벤트 트리거링**을 살펴보겠습니다.

**다음 장**: **[06 조건부 이벤트](./06-conditional-event.md)**에서 조건부 로직에 대해 배워보세요.

---

## 📚 관련 문서

- **[게임 이벤트 비헤이비어](../visual-workflow/game-event-behavior.md)** - 리스너 설정에 대한 상세 가이드
- **[베스트 프랙티스](../scripting/best-practices.md)** - 순서 의존적 로직을 위한 패턴
- **[리스닝 전략](../scripting/listening-strategies.md)** - 고급 콜백 패턴