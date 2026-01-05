---
sidebar_label: '13 런타임 API'
sidebar_position: 14
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 13 런타임 API: 코드 중심의 워크플로우 (Code-First Workflow)

<!-- <VideoGif src="/video/game-event-system/13-runtime-api.mp4" /> -->

## 📋 개요 (Overview)

이전 데모(01-11)에서는 인스펙터에서 리스너를 바인딩하고, 비헤이비어(Behavior) 윈도우에서 조건을 설정하며, 비주얼 도구로 플로우 그래프를 구축하는 **비주얼 워크플로우(Visual Workflow)**를 살펴보았습니다. 이 방식은 디자이너나 신속한 프로토타이핑에 적합합니다. 그러나 프로그래머는 복잡한 시스템이나 동적인 동작을 구현할 때, 또는 비주얼 도구의 제약을 벗어나고 싶을 때 **코드에서의 완전한 제어**를 선호하는 경우가 많습니다.

**데모 13은 중요한 아키텍처 원칙을 증명합니다.** 비주얼 워크플로우에서 보았던 모든 기능은 **완전하고 타입 안정성(Type-safe)이 보장된 C# API**를 제공합니다. 이 데모는 이전 11가지 시나리오를 다시 다루되, 인스펙터 바인딩과 그래프 설정을 모두 제거하고 이를 런타임 코드로 대체하는 방법을 보여줍니다.

:::tip 💡 학습 내용
- 프로그래밍 방식으로 리스너 등록/제거 (`AddListener`, `RemoveListener`)
- 동적 우선순위 제어 (`AddPriorityListener`)
- 런타임 조건부 리스너 등록 (`AddConditionalListener`)
- 스케줄링 API (`RaiseDelayed`, `RaiseRepeating`, `Cancel`)
- 코드로 플로우 그래프 구축 (`AddTriggerEvent`, `AddChainEvent`)
- 지속성(Persistent) 리스너 관리 (`AddPersistentListener`)
- 라이프사이클 관리 (`OnEnable`, `OnDisable`, 정리 패턴)

:::

---

## 🎬 데모 구조 (Demo Structure)
```
📁 Assets/TinyGiants/GameEventSystem/Demo/13_RuntimeAPI/
│
├── 📁 01_VoidEvent             ➔ 🔘 [ 코드 기반 보이드 이벤트 바인딩 ]
├── 📁 02_BasicTypesEvent       ➔ 🔢 [ 제네릭 이벤트 등록 ]
├── 📁 03_CustomTypeEvent       ➔ 💎 [ 사용자 정의 클래스 바인딩 ]
├── 📁 04_CustomSenderTypeEvent ➔ 👥 [ 이중 제네릭 리스너 ]
│
├── 📁 05_PriorityEvent         ➔ 🥇 [ 코드로 관리하는 우선순위 ]
├── 📁 06_ConditionalEvent      ➔ 🛡️ [ 프레디케이트 기반 필터링 ]
├── 📁 07_DelayedEvent          ➔ ⏱️ [ 스케줄링 및 취소 ]
├── 📁 08_RepeatingEvent        ➔ 🔄 [ 루프 관리 및 콜백 ]
│
├── 📁 09_PersistentEvent       ➔ 🛡️ [ 씬 교차 리스너 생존 ]
├── 📁 10_TriggerEvent          ➔ 🕸️ [ 병렬 그래프 구축 ]
└── 📁 11_ChainEvent            ➔ ⛓️ [ 순차적 파이프라인 구축 ]
```

**01-11과의 핵심 차이점:**
- **씬 구성:** 동일함 (터렛, 타겟, UI 버튼 모두 동일)
- **비주얼 설정:** ❌ 모두 제거됨 (비헤이비어 윈도우 설정 및 플로우 그래프 없음)
- **코드 구현:** 모든 로직이 `OnEnable`/`OnDisable` 및 라이프사이클 메서드로 이동됨

---

## 🔄 비주얼 vs 코드 패러다임 전환

| 기능 | 비주얼 워크플로우 (01-11) | 코드 워크플로우 (데모 13) |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------ |
| **리스너 바인딩** | 비헤이비어 윈도우에서 드래그 앤 드롭 | `OnEnable`에서 `event.AddListener(Method)` 호출 |
| **조건부 로직** | 인스펙터의 조건 트리(Condition Tree) | `event.AddConditionalListener(Method, Predicate)` |
| **실행 우선순위** | 비헤이비어 윈도우에서 순서 변경 | `event.AddPriorityListener(Method, priority)` |
| **지연/반복** | 비헤이비어 윈도우의 지연 노드 | `event.RaiseDelayed(seconds)`, `event.RaiseRepeating(interval, count)` |
| **플로우 그래프** | 플로우 그래프 윈도우의 시각적 연결 | `event.AddTriggerEvent(target, ...)`, `event.AddChainEvent(target, ...)` |
| **정리(Cleanup)** | 게임 오브젝트 파괴 시 자동 처리 | `OnDisable`/`OnDestroy`에서 **수동으로 처리** |

:::warning ⚠️ 중요한 라이프사이클 규칙

**수동 등록 = 수동 정리**. `OnEnable`에서 호출한 모든 `AddListener`는 반드시 `OnDisable`에서 대응하는 `RemoveListener`를 호출해야 합니다. 정리를 소홀히 하면 다음과 같은 문제가 발생합니다:

- 메모리 누수 (Memory leaks)
- 중복된 리스너 실행
- 이미 파괴된 오브젝트에서 리스너 실행 (NullReferenceException 발생)

:::

---

## 📚 API 시나리오

### 01 Void Event: 기본 등록

**비주얼 → 코드 변환:**
- ❌ 인스펙터: `OnEventReceived`를 비헤이비어 윈도우에 드래그
- ✅ 코드: `OnEnable`에서 `AddListener` 호출

**RuntimeAPI_VoidEventRaiser.cs:**
```csharp
using TinyGiants.GameEventSystem.Runtime;

public class RuntimeAPI_VoidEventRaiser : MonoBehaviour
{
    [GameEventDropdown] 
    public GameEvent voidEvent;  // ← 여전히 에셋 참조를 사용함

    public void RaiseBasicEvent()
    {
        if (voidEvent) voidEvent.Raise();  // ← 비주얼 워크플로우와 동일함
    }
}
```

**RuntimeAPI_VoidEventReceiver.cs:**
```csharp
using TinyGiants.GameEventSystem.Runtime;

public class RuntimeAPI_VoidEventReceiver : MonoBehaviour
{
    [GameEventDropdown] 
    public GameEvent voidEvent;

    [SerializeField] private Rigidbody targetRigidbody;

    // ✅ 등록: 활성화될 때
    private void OnEnable()
    {
        voidEvent.AddListener(OnEventReceived);  // ← 인스펙터 바인딩을 대체함
    }

    // ✅ 정리: 비활성화될 때
    private void OnDisable()
    {
        voidEvent.RemoveListener(OnEventReceived);  // ← 정리 작업 필수
    }
    
    // 리스너 메서드 (비주얼 워크플로우와 동일)
    public void OnEventReceived()
    {
        // 물리 작용 적용...
        targetRigidbody.AddForce(Vector3.up * 5f, ForceMode.Impulse);
    }
}
```

**주요 포인트:**
- 🎯 **이벤트 에셋:** 여전히 `[GameEventDropdown]`을 통해 참조합니다.
- 🔗 **등록:** `OnEnable`에서 `AddListener(메서드명)`을 호출합니다.
- 🧹 **정리:** `OnDisable`에서 `RemoveListener(메서드명)`을 호출합니다.
- ⚡ **시그니처:** 메서드 시그니처가 이벤트 타입과 일치해야 합니다 (GameEvent의 경우 `void`).

---

### 02 Basic Types: 제네릭 등록

**데모 내용:** 제네릭 이벤트에 대한 타입 추론

**RuntimeAPI_BasicTypesEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<string> messageEvent;
[GameEventDropdown] public GameEvent<Vector3> movementEvent;
[GameEventDropdown] public GameEvent<GameObject> spawnEvent;
[GameEventDropdown] public GameEvent<Material> changeMaterialEvent;

public void RaiseString()
{
    messageEvent.Raise("Hello World");  // ← 이벤트로부터 타입 추론
}

public void RaiseVector3()
{
    movementEvent.Raise(new Vector3(0, 2, 0));
}
```

**RuntimeAPI_BasicTypesEventReceiver.cs:**
```csharp
private void OnEnable()
{
    // 컴파일러가 메서드 시그니처로부터 <string>, <Vector3> 등을 추론함
    messageEvent.AddListener(OnMessageReceived);     // void(string)
    movementEvent.AddListener(OnMoveReceived);       // void(Vector3)
    spawnEvent.AddListener(OnSpawnReceived);         // void(GameObject)
    changeMaterialEvent.AddListener(OnMaterialReceived);  // void(Material)
}

private void OnDisable()
{
    messageEvent.RemoveListener(OnMessageReceived);
    movementEvent.RemoveListener(OnMoveReceived);
    spawnEvent.RemoveListener(OnSpawnReceived);
    changeMaterialEvent.RemoveListener(OnMaterialReceived);
}

public void OnMessageReceived(string msg) { /* ... */ }
public void OnMoveReceived(Vector3 pos) { /* ... */ }
public void OnSpawnReceived(GameObject prefab) { /* ... */ }
public void OnMaterialReceived(Material mat) { /* ... */ }
```

**주요 포인트:**
- ✅ **타입 안정성:** 컴파일러가 시그니처 일치 여부를 강제합니다.
- ✅ **자동 추론:** 수동으로 타입을 지정할 필요가 없습니다.
- ⚠️ **불일치 오류:** `void(int)`는 `GameEvent<string>`에 바인딩할 수 없습니다.

---

### 03 Custom Type: 복합 데이터 바인딩

**데모 내용:** 자동 생성된 제네릭 클래스 활용

**RuntimeAPI_CustomTypeEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<DamageInfo> physicalDamageEvent;
[GameEventDropdown] public GameEvent<DamageInfo> fireDamageEvent;
[GameEventDropdown] public GameEvent<DamageInfo> criticalStrikeEvent;

public void DealPhysicalDamage()
{
    DamageInfo info = new DamageInfo(10f, false, DamageType.Physical, hitPoint, "Player01");
    physicalDamageEvent.Raise(info);  // ← 사용자 정의 클래스를 인자로 전달
}
```

**RuntimeAPI_CustomTypeEventReceiver.cs:**
```csharp
private void OnEnable()
{
    // 동일한 핸들러에 여러 이벤트를 바인딩할 수 있음
    physicalDamageEvent.AddListener(OnDamageReceived);
    fireDamageEvent.AddListener(OnDamageReceived);
    criticalStrikeEvent.AddListener(OnDamageReceived);
}

private void OnDisable()
{
    physicalDamageEvent.RemoveListener(OnDamageReceived);
    fireDamageEvent.RemoveListener(OnDamageReceived);
    criticalStrikeEvent.RemoveListener(OnDamageReceived);
}

public void OnDamageReceived(DamageInfo info)
{
    // 사용자 정의 클래스 필드 파싱
    float damage = info.amount;
    DamageType type = info.type;
    bool isCrit = info.isCritical;
    
    // 데이터 기반 로직 실행...
}
```

**주요 포인트:**
- 📦 **자동 생성:** 플러그인이 `GameEvent<DamageInfo>` 클래스를 자동으로 생성합니다.
- 🔗 **다중 바인딩:** 하나의 메서드로 여러 이벤트를 리스닝할 수 있습니다.
- ⚡ **데이터 접근:** 사용자 정의 클래스의 프로퍼티에 자유롭게 접근 가능합니다.

---

### 04 Custom Sender: 이중 제네릭 리스너

**데모 내용:** 이벤트 소스의 컨텍스트 접근

**RuntimeAPI_CustomSenderTypeEventRaiser.cs:**
```csharp
// 물리적 송신자: GameObject
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> turretEvent;

// 논리적 송신자: 사용자 정의 클래스
[GameEventDropdown] public GameEvent<PlayerStats, DamageInfo> systemEvent;

public void RaiseTurretDamage()
{
    DamageInfo info = new DamageInfo(15f, false, DamageType.Physical, hitPoint, "Turret");
    turretEvent.Raise(this.gameObject, info);  // ← 송신자를 첫 번째 인자로 전달
}

public void RaiseSystemDamage()
{
    PlayerStats admin = new PlayerStats("DragonSlayer_99", 99, 1);
    DamageInfo info = new DamageInfo(50f, true, DamageType.Void, hitPoint, "Admin");
    systemEvent.Raise(admin, info);  // ← 사용자 정의 클래스를 송신자로 전달
}
```

**RuntimeAPI_CustomSenderTypeEventReceiver.cs:**
```csharp
private void OnEnable()
{
    turretEvent.AddListener(OnTurretAttackReceived);      // (GameObject, DamageInfo)
    systemEvent.AddListener(OnSystemAttackReceived);      // (PlayerStats, DamageInfo)
}

private void OnDisable()
{
    turretEvent.RemoveListener(OnTurretAttackReceived);
    systemEvent.RemoveListener(OnSystemAttackReceived);
}

// 시그니처: void(GameObject, DamageInfo)
public void OnTurretAttackReceived(GameObject sender, DamageInfo args)
{
    Vector3 attackerPos = sender.transform.position;  // ← 송신자 GameObject에 접근
    // 물리 공격자에 반응...
}

// 시그니처: void(PlayerStats, DamageInfo)
public void OnSystemAttackReceived(PlayerStats sender, DamageInfo args)
{
    string attackerName = sender.playerName;  // ← 송신자 데이터에 접근
    int factionId = sender.factionId;
    // 논리적 공격자에 반응...
}
```

**주요 포인트:**
- 🎯 **컨텍스트 인식:** 리스너가 이벤트를 트리거한 주체(WHO)가 누구인지 알 수 있습니다.
- 🔀 **유연한 송신자:** GameObject 또는 사용자 정의 클래스 모두 가능합니다.
- ⚡ **시그니처 일치:** 메서드 파라미터는 반드시 이벤트의 제네릭과 일치해야 합니다.

---

### 05 Priority: 실행 순서 제어

**비주얼 → 코드 변환:**
- ❌ 인스펙터: 비헤이비어 윈도우에서 리스너 순서 드래그
- ✅ 코드: `priority` 파라미터 지정 (값이 높을수록 먼저 실행)

**RuntimeAPI_PriorityEventReceiver.cs:**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> orderedHitEvent;
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> chaoticHitEvent;

private void OnEnable()
{
    // ✅ 정렬됨: 높은 우선순위가 먼저 실행됨
    orderedHitEvent.AddPriorityListener(ActivateBuff, priority: 100);  // 1순위 실행
    orderedHitEvent.AddPriorityListener(ResolveHit, priority: 50);     // 2순위 실행
    
    // ❌ 무질서: 의도적으로 잘못된 순서 지정
    chaoticHitEvent.AddPriorityListener(ResolveHit, priority: 80);     // 1순위 (너무 빠름!)
    chaoticHitEvent.AddPriorityListener(ActivateBuff, priority: 40);   // 2순위 (너무 늦음!)
}

private void OnDisable()
{
    // 우선순위 리스너는 전용 제거 메서드를 사용해야 함
    orderedHitEvent.RemovePriorityListener(ActivateBuff);
    orderedHitEvent.RemovePriorityListener(ResolveHit);
    
    chaoticHitEvent.RemovePriorityListener(ResolveHit);
    chaoticHitEvent.RemovePriorityListener(ActivateBuff);
}

public void ActivateBuff(GameObject sender, DamageInfo args)
{
    _isBuffActive = true;  // ← ResolveHit 보다 먼저 실행되어야 함
}

public void ResolveHit(GameObject sender, DamageInfo args)
{
    float damage = _isBuffActive ? args.amount * 5f : args.amount;  // ← 버프 상태 확인
}
```

**주요 포인트:**
- 🔢 **우선순위 값:** 숫자가 클수록 실행 순서가 빠릅니다.
- ⚠️ **순서의 중요성:** `ActivateBuff(100) → ResolveHit(50)`는 치명타(Crit)를 발생시킵니다.
- ❌ **잘못된 순서:** `ResolveHit(80) → ActivateBuff(40)`는 일반 데미지를 줍니다.
- 🧹 **정리:** `RemovePriorityListener`를 사용하십시오 (`RemoveListener` 아님).

---

### 06 Conditional: 프레디케이트 기반 필터링

**비주얼 → 코드 변환:**
- ❌ 인스펙터: 비헤이비어 윈도우의 시각적 조건 트리
- ✅ 코드: `AddConditionalListener`에 전달되는 프레디케이트(Predicate) 함수

**RuntimeAPI_ConditionalEventReceiver.cs:**
```csharp
[GameEventDropdown] public GameEvent<AccessCard> requestAccessEvent;

private void OnEnable()
{
    // 조건 함수와 함께 등록
    // CanOpen이 true를 반환할 때만 OpenVault가 호출됨
    requestAccessEvent.AddConditionalListener(OpenVault, CanOpen);
}

private void OnDisable()
{
    requestAccessEvent.RemoveConditionalListener(OpenVault);
}

// ✅ 조건 함수 (프레디케이트)
// 시각적 조건 트리를 대체함
public bool CanOpen(AccessCard card)
{
    return securityGrid.IsPowerOn && (
        card.securityLevel >= 4 || 
        departments.Contains(card.department) ||
        (card.securityLevel >= 1 && Random.Range(0, 100) > 70)
    );
}

// ✅ 액션 (조건이 통과될 때만 실행됨)
public void OpenVault(AccessCard card)
{
    // 모든 조건이 충족되었다고 가정함
    Debug.Log($"ACCESS GRANTED to {card.holderName}");
    StartCoroutine(OpenDoorSequence());
}
```

**주요 포인트:**
- ✅ **프레디케이트 함수:** `bool`을 반환하며 이벤트 인자를 파라미터로 받습니다.
- 🔒 **게이트 키퍼:** 프레디케이트가 `true`를 반환할 때만 액션이 실행됩니다.
- 🧹 **정리:** `RemoveConditionalListener`를 사용하십시오.
- ⚡ **평가 시점:** 프레디케이트는 액션 메서드 실행 직전에 평가됩니다.

---

### 07 Delayed: 스케줄링 및 취소

**비주얼 → 코드 변환:**
- ❌ 비헤이비어: 인스펙터에서 "Action Delay = 5.0s" 설정
- ✅ 코드: `ScheduleHandle`을 반환하는 `event.RaiseDelayed(5f)` 호출

**RuntimeAPI_DelayedEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent explodeEvent;

private ScheduleHandle _handle;  // ← 예약된 태스크 추적용

public void ArmBomb()
{
    // 5초 후에 이벤트 예약
    _handle = explodeEvent.RaiseDelayed(5f);  // ← 핸들 반환
    
    Debug.Log("폭탄이 가동되었습니다! 해체까지 5초...");
}

public void CutRedWire() => ProcessCut("Red");
public void CutGreenWire() => ProcessCut("Green");

private void ProcessCut(string color)
{
    if (color == _safeWireColor)
    {
        // 예약된 폭발 이벤트 취소
        explodeEvent.CancelDelayed(_handle);  // ← 핸들을 사용하여 취소
        Debug.Log("해체 성공! 이벤트가 취소되었습니다.");
    }
    else
    {
        Debug.LogWarning("잘못된 선입니다! 시계는 계속 돌아갑니다...");
    }
}
```

**주요 포인트:**
- ⏱️ **스케줄링:** `RaiseDelayed(초)`는 이벤트를 큐에 등록합니다.
- 📍 **핸들:** 나중에 취소할 수 있도록 반환 값을 저장합니다.
- 🛑 **취소:** `CancelDelayed(핸들)`은 큐에서 이벤트를 제거합니다.
- ⚠️ **타이밍:** 취소되지 않으면 지연 시간 이후에 이벤트가 실행됩니다.

---

### 08 Repeating: 루프 관리 및 콜백

**비주얼 → 코드 변환:**
- ❌ 비헤이비어: 인스펙터에서 "Repeat Interval = 1.0s, Repeat Count = 5" 설정
- ✅ 코드: 콜백을 포함한 `event.RaiseRepeating(interval, count)` 호출

**RuntimeAPI_RepeatingEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent finitePulseEvent;

private ScheduleHandle _handle;

public void ActivateBeacon()
{
    // 루프 시작: 1초 간격, 5회
    _handle = finitePulseEvent.RaiseRepeating(interval: 1.0f, count: 5);
    
    // ✅ 훅(HOOK): 매 반복마다 트리거됨
    _handle.OnStep += (currentCount) => 
    {
        Debug.Log($"펄스 #{currentCount} 방출됨");
    };
    
    // ✅ 훅: 루프가 정상적으로 종료될 때 트리거됨
    _handle.OnCompleted += () => 
    {
        Debug.Log("비컨 시퀀스 완료");
        UpdateUI("IDLE");
    };
    
    // ✅ 훅: 수동으로 취소되었을 때 트리거됨
    _handle.OnCancelled += () => 
    {
        Debug.Log("비컨 중단됨");
        UpdateUI("ABORTED");
    };
}

public void StopSignal()
{
    if (_handle != null)
    {
        finitePulseEvent.CancelRepeating(_handle);  // ← 루프 중지
    }
}
```

**주요 포인트:**
- 🔁 **유한 루프:** `RaiseRepeating(1.0f, 5)` = 1초 간격으로 5회 실행
- ∞ **무한 루프:** `RaiseRepeating(1.0f, -1)` = 취소될 때까지 무한 실행
- 📡 **콜백:** `OnStep`, `OnCompleted`, `OnCancelled` 이벤트 활용 가능
- 🛑 **수동 중지:** 무한 루프의 경우 `CancelRepeating(핸들)` 필수

---

### 09 Persistent: 씬 교차 리스너 생존

**비주얼 → 코드 변환:**
- ❌ 인스펙터: 비헤이비어 윈도우에서 "Persistent Event" 체크
- ✅ 코드: `Awake`에서 `AddPersistentListener` 호출 + `DontDestroyOnLoad`

**RuntimeAPI_PersistentEventReceiver.cs:**
```csharp
[GameEventDropdown] public GameEvent fireAEvent;  // 지속성 이벤트
[GameEventDropdown] public GameEvent fireBEvent;  // 일반 이벤트

private void Awake()
{
    DontDestroyOnLoad(gameObject);  // ← 씬 로드 시 생존
    
    // ✅ 지속성 리스너 (씬 리로드 후에도 생존)
    fireAEvent.AddPersistentListener(OnFireCommandA);
}

private void OnDestroy()
{
    // 지속성 리스너는 반드시 수동으로 제거해야 함
    fireAEvent.RemovePersistentListener(OnFireCommandA);
}

private void OnEnable()
{
    // ❌ 일반 리스너 (씬과 함께 소멸)
    fireBEvent.AddListener(OnFireCommandB);
}

private void OnDisable()
{
    fireBEvent.RemoveListener(OnFireCommandB);
}

public void OnFireCommandA() 
{ 
    Debug.Log("지속성 리스너가 씬 리로드 후에도 생존했습니다."); 
}

public void OnFireCommandB() 
{ 
    Debug.Log("일반 리스너 (리로드 후 연결 끊김)"); 
}
```

**주요 포인트:**
- 🧬 **싱글톤 패턴:** `DontDestroyOnLoad`와 지속성 리스너의 조합
- ✅ **리로드 생존:** `AddPersistentListener`는 전역 레지스트리에 바인딩됩니다.
- ❌ **일반 소멸:** `AddListener` 바인딩은 씬과 함께 파괴됩니다.
- 🧹 **정리:** 지속성은 `OnDestroy`에서, 일반은 `OnDisable`에서 정리합니다.

---

### 10 Trigger Event: 코드로 병렬 그래프 구축

**비주얼 → 코드 변환:**
- ❌ 플로우 그래프: 시각적 노드 및 연결
- ✅ 코드: `OnEnable`에서 `AddTriggerEvent(target, ...)` 호출

**RuntimeAPI_TriggerEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onCommand;      // 루트
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onActiveBuff;   // 분기 A
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onTurretFire;   // 분기 B
[GameEventDropdown] public GameEvent<DamageInfo> onHoloData;                 // 분기 C (타입 변환)
[GameEventDropdown] public GameEvent onGlobalAlarm;                          // 분기 D (보이드)

private TriggerHandle _buffAHandle;
private TriggerHandle _fireAHandle;
private TriggerHandle _holoHandle;
private TriggerHandle _alarmHandle;

private void OnEnable()
{
    // ✅ 코드로 병렬 그래프 구축
    
    // 분기 A: 버프 (우선순위 100, 조건부)
    _buffAHandle = onCommand.AddTriggerEvent(
        targetEvent: onActiveBuff,
        delay: 0f,
        condition: (sender, args) => sender == turretA,  // ← 터렛 A만 해당
        passArgument: true,
        priority: 100  // ← 높은 우선순위
    );
    
    // 분기 B: 발사 (우선순위 50, 조건부)
    _fireAHandle = onCommand.AddTriggerEvent(
        targetEvent: onTurretFire,
        delay: 0f,
        condition: (sender, args) => sender == turretA,
        passArgument: true,
        priority: 50  // ← 낮은 우선순위 (버프 후 실행)
    );
    
    // 분기 C: 홀로 데이터 (타입 변환, 지연)
    _holoHandle = onCommand.AddTriggerEvent(
        targetEvent: onHoloData,  // ← GameEvent<DamageInfo> (송신자 없음)
        delay: 1f,  // ← 1초 지연
        passArgument: true
    );
    
    // 분기 D: 글로벌 알람 (보이드 변환)
    _alarmHandle = onCommand.AddTriggerEvent(
        targetEvent: onGlobalAlarm  // ← GameEvent (인자 없음)
    );
    
    // ✅ 훅: 트리거가 실행될 때의 콜백
    _buffAHandle.OnTriggered += () => Debug.Log("코드로 구축된 그래프에 의해 버프 트리거됨");
}

private void OnDisable()
{
    // ✅ 정리: 동적 트리거에는 필수 작업
    onCommand.RemoveTriggerEvent(_buffAHandle);
    onCommand.RemoveTriggerEvent(_fireAHandle);
    onCommand.RemoveTriggerEvent(_holoHandle);
    onCommand.RemoveTriggerEvent(_alarmHandle);
}
```

**그래프 시각화 (코드 정의):**
```
📡 루트: onCommand.Raise(sender, info)
│
├─ 🔱 [ 분기: Unit A ] ➔ 🛡️ 조건: `Sender == Turret_A`
│  ├─ 💎 [Prio: 100] ➔ 🛡️ onActiveBuff()      ✅ 고우선순위 동기화
│  └─ ⚡ [Prio: 50 ] ➔ 🔥 onTurretFire()      ✅ 순차적 액션
│
├─ 🔱 [ 분기: Analytics ] ➔ 🔢 시그니처: `<DamageInfo>`
│  └─ ⏱️ [ Delay: 1.0s ] ➔ 📽️ onHoloData()    ✅ 지연된 데이터 중계
│
└─ 🔱 [ 분기: Global ] ➔ 🔘 시그니처: `<void>`
   └─ 🚀 [ 즉시 ] ➔ 🚨 onGlobalAlarm()        ✅ 즉각적인 신호
```

**주요 포인트:**
- 🌳 **병렬 실행:** 모든 분기가 동시에 평가됩니다.
- 🔢 **우선순위:** 조건을 통과한 분기들 사이의 실행 순서를 제어합니다.
- ✅ **조건:** 프레디케이트 함수를 통해 송신자/인자를 필터링합니다.
- 🔄 **타입 변환:** 자동으로 인자를 맞춰서 전달합니다.
- 📡 **콜백:** 핸들당 `OnTriggered` 이벤트 제공
- 🧹 **정리:** `RemoveTriggerEvent(핸들)` 작업이 반드시 필요합니다.

---

### 11 Chain Event: 코드로 순차적 파이프라인 구축

**비주얼 → 코드 변환:**
- ❌ 플로우 그래프: 선형 노드 시퀀스
- ✅ 코드: `OnEnable`에서 `AddChainEvent(target, ...)` 호출

**RuntimeAPI_ChainEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnStartSequenceEvent;  // 루트
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnSystemCheckEvent;    // 1단계
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnChargeEvent;         // 2단계
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnFireEvent;           // 3단계
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnCoolDownEvent;       // 4단계
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnArchiveEvent;        // 5단계

private ChainHandle _checkHandle;
private ChainHandle _chargeHandle;
private ChainHandle _fireHandle;
private ChainHandle _cooldownHandle;
private ChainHandle _archiveHandle;

private void OnEnable()
{
    // ✅ 코드로 순차적 체인 구축
    
    // 1단계: 시스템 체크 (조건부 게이트)
    _checkHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnSystemCheckEvent,
        delay: 0f,
        duration: 0f,
        condition: (sender, args) => chainEventReceiver.IsSafetyCheckPassed,  // ← 게이트
        passArgument: true,
        waitForCompletion: false
    );
    
    // 2단계: 충전 (1초 지속 시간)
    _chargeHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnChargeEvent,
        delay: 0f,
        duration: 1f,  // ← 체인이 여기서 1초간 머무름
        passArgument: true
    );
    
    // 3단계: 발사 (즉시)
    _fireHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnFireEvent,
        passArgument: true
    );
    
    // 4단계: 쿨다운 (0.5초 지연 + 1초 지속 + 완료 대기)
    _cooldownHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnCoolDownEvent,
        delay: 0.5f,  // ← 사전 지연
        duration: 1f,  // ← 액션 후 지속 시간
        passArgument: true,
        waitForCompletion: true  // ← 리시버의 코루틴 종료를 대기함
    );
    
    // 5단계: 아카이브 (인자 차단)
    _archiveHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnArchiveEvent,
        passArgument: false  // ← 하위 단계는 null/기본값을 받음
    );
}

private void OnDisable()
{
    // ✅ 정리: 동적 체인에는 필수 작업
    OnStartSequenceEvent.RemoveChainEvent(_checkHandle);
    OnStartSequenceEvent.RemoveChainEvent(_chargeHandle);
    OnStartSequenceEvent.RemoveChainEvent(_fireHandle);
    OnStartSequenceEvent.RemoveChainEvent(_cooldownHandle);
    OnStartSequenceEvent.RemoveChainEvent(_archiveHandle);
    
    // 대안: OnStartSequenceEvent.RemoveAllChainEvents();
}
```

**파이프라인 시각화 (코드 정의):**
```
🚀 [ ROOT ] OnStartSequenceEvent
│
├─ 🛡️ [ GUARD ] ➔ 보안 체크
│  └─► ⚙️ OnSystemCheckEvent             ✅ 조건 통과됨
│
├─ ⏱️ [ FLOOR ] ➔ 지속 시간: 1.0s
│  └─► ⚡ OnChargeEvent                  ✅ 최소 페이싱 유지
│
├─ 🚀 [ INSTANT ] ➔ 즉각적 트리거
│  └─► 🔥 OnFireEvent                    ✅ 실행됨
│
├─ ⌛ [ ASYNC ] ➔ 지연: 0.5s | 지속: 1.0s | 대기: ON
│  └─► ❄️ OnCoolDownEvent                ✅ 비동기 회복 완료
│
└─ 🧹 [ FILTER ] ➔ 인자 차단
   └─► 💾 OnArchiveEvent                 ✅ 데이터 정제 및 저장
```

**주요 포인트:**
- 🔗 **순차 실행:** 단계들이 병렬이 아닌 하나씩 차례로 실행됩니다.
- ✅ **조건 게이트:** 조건을 실패하면 전체 체인이 즉시 종료됩니다.
- ⏱️ **지속 시간(Duration):** 체인이 지정된 시간 동안 해당 단계에 머무릅니다.
- 🕐 **완료 대기(Wait For Completion):** 리시버의 비동기 작업(코루틴)이 끝날 때까지 대기합니다.
- 🔒 **인자 차단:** `passArgument: false`로 설정하면 하위에 기본값만 전송합니다.
- 🧹 **정리:** `RemoveChainEvent(핸들)` 또는 `RemoveAllChainEvents()`가 필수적입니다.

---

## 🔑 API 참조 요약

### 리스너 등록 (Listener Registration)

| 메서드 | 용도 | 정리 메서드 |
| ------------------------------------------- | ------------------------- | ----------------------------------- |
| `AddListener(method)`                       | 표준 바인딩 | `RemoveListener(method)`            |
| `AddPriorityListener(method, priority)`     | 실행 순서 제어 | `RemovePriorityListener(method)`    |
| `AddConditionalListener(method, predicate)` | 프레디케이트 기반 필터링 | `RemoveConditionalListener(method)` |
| `AddPersistentListener(method)`             | 씬 교차 생존 | `RemovePersistentListener(method)`  |

### 이벤트 발생 (Event Raising)

| 메서드 | 용도 | 반환값 |
| --------------------------------- | -------------------- | ---------------- |
| `Raise()`                         | 즉시 실행 | `void`           |
| `Raise(arg)`                      | 단일 인자 포함 | `void`           |
| `Raise(sender, arg)`              | 송신자 컨텍스트 포함 | `void`           |
| `RaiseDelayed(seconds)`           | 예약 실행 | `ScheduleHandle` |
| `RaiseRepeating(interval, count)` | 루프 실행 | `ScheduleHandle` |

### 스케줄 관리 (Schedule Management)

| 메서드 | 용도 |
| ------------------------- | -------------------------- |
| `CancelDelayed(handle)`   | 대기 중인 지연 이벤트 중지 |
| `CancelRepeating(handle)` | 활성 루프 중지 |
| `handle.OnStep`           | 루프 반복 시 콜백 |
| `handle.OnCompleted`      | 루프 완료 시 콜백 |
| `handle.OnCancelled`      | 취소 시 콜백 |

### 플로우 그래프 구축 (Flow Graph Construction)

| 메서드 | 용도 | 반환값 |
| ------------------------------ | --------------- | --------------- |
| `AddTriggerEvent(target, ...)` | 병렬 분기 생성 | `TriggerHandle` |
| `RemoveTriggerEvent(handle)`   | 분기 제거 | `void`           |
| `AddChainEvent(target, ...)`   | 순차 단계 생성 | `ChainHandle`   |
| `RemoveChainEvent(handle)`     | 단계 제거 | `void`           |
| `RemoveAllChainEvents()`       | 모든 단계 제거 | `void`           |

---

## ⚠️ 핵심 베스트 프랙티스

### ✅ 권장 사항 (DO)
```csharp
private void OnEnable()
{
    myEvent.AddListener(OnReceived);  // ← 등록
}

private void OnDisable()
{
    myEvent.RemoveListener(OnReceived);  // ← 반드시 정리!
}
```

### ❌ 금지 사항 (DON'T)
```csharp
private void Start()
{
    myEvent.AddListener(OnReceived);  // ← Start에서 등록...
}
// ❌ OnDisable 정리가 없음 → 메모리 누수 발생
```

### 핸들 관리 (Handle Management)
```csharp
private ScheduleHandle _handle;

public void StartLoop()
{
    _handle = myEvent.RaiseRepeating(1f, -1);
}

public void StopLoop()
{
    if (_handle != null) myEvent.CancelRepeating(_handle);  // ← 저장된 핸들 사용
}
```

### 라이프사이클 패턴

| 라이프사이클 메서드 | 사용 용도 |
| ---------------- | ------------------------------------------ |
| `Awake`          | 지속성 리스너 등록 + `DontDestroyOnLoad` |
| `OnEnable`       | 표준 리스너, 트리거, 체인 등록 |
| `OnDisable`      | 표준 리스너 제거 |
| `OnDestroy`      | 지속성 리스너 제거 |

---

## 🎯 코드 vs 비주얼 워크플로우 선택 기준

### 비주얼 워크플로우를 선택할 때:
- ✅ 디자이너가 직접 제어해야 하는 경우
- ✅ 신속한 반복 작업(Iteration)이 우선인 경우
- ✅ 로직이 상대적으로 고정적인 경우
- ✅ 시각적 디버깅이 유리한 경우
- ✅ 여러 직군 간의 협업이 필요한 경우

### 코드 워크플로우를 선택할 때:
- ✅ 로직이 매우 동적인 경우 (런타임 그래프 구축)
- ✅ 복잡한 C# 코드가 필요한 조건문
- ✅ 기존 코드 시스템과의 연동이 필요한 경우
- ✅ 고급 스케줄링 패턴이 필요한 경우
- ✅ 프로그래밍 방식의 리스너 관리
- ✅ 로직의 버전 관리 (에셋 변경보다 코드 차이점이 더 명확함)

### 하이브리드 접근법:

- 🎨 **비주얼:** 이벤트 정의, 간단한 바인딩
- 💻 **코드:** 복잡한 조건, 동적 그래프, 런타임 스케줄링
- **예시:** 이벤트는 비주얼로 정의하되, 절차적 시스템을 위해 트리거/체인 그래프는 코드로 구축

---

## 📚 관련 문서

- **[이벤트 발생 및 스케줄링](../scripting/raising-and-scheduling.md)** - 전체 스케줄링 API 가이드
- **[리스닝 전략](../scripting/listening-strategies.md)** - 리스너 패턴 및 베스트 프랙티스
- **[프로그래밍 방식의 흐름 제어](../scripting/programmatic-flow.md)** - 코드를 통한 트리거/체인 그래프 구축
- **[베스트 프랙티스](../scripting/best-practices.md)** - 코드 패턴 및 안티 패턴
- **[API 참조](../scripting/api-reference.md)** - 전체 메서드 시그니처
```