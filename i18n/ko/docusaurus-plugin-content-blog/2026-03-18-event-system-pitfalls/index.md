---
slug: api-best-practices
title: '출시 후 발견되는 이벤트 시스템의 함정: 메모리 누수, 데이터 오염, 재귀 트랩'
authors: [tinygiants]
tags: [ges, unity, scripting, best-practices, architecture]
description: "QA가 30분 동안 플레이해야 나타나는 버그들. 고아 델리게이트로 인한 메모리 누수, 세션 간 오염되는 데이터, 크래시하지 않는 무한 루프 — 그리고 이 모든 것을 방지하는 방법."
image: /img/home-page/game-event-system-preview.png
---

게임을 5분씩 테스트하고 있다. 잘 돌아간다. 그런데 QA가 리포트를 올린다: "30분 플레이 세션 동안 메모리 사용량이 꾸준히 증가합니다. 6개의 씬을 로드하면 프레임 레이트가 60에서 40으로 떨어집니다." 프로파일링해 본다. 12개여야 할 이벤트에 847개의 리스너가 등록되어 있다. 매 씬 로드마다 새로운 구독이 추가됐지만 이전 것은 제거되지 않았다. 오브젝트는 파괴됐지만, 델리게이트 참조가 살아남아 죽은 MonoBehaviour들을 메모리에 고정시키고 있어서 가비지 컬렉터가 건드릴 수 없다.

아니면 이런 것: "두 번째 Play Mode 세션에서 체력 값이 틀립니다. 첫 번째 실행은 정상입니다." Play를 누르고, 전투를 테스트하고, 멈춘다. 다시 Play. 플레이어가 100이 아닌 73 HP로 시작한다. 아무도 리셋하지 않아서 마지막 세션의 ScriptableObject 상태가 그대로 남아 있는 것이다.

혹은 고전적인 것: 게임이 3초 동안 멈추더니 Unity가 크래시한다. Event A의 리스너가 Event B를 Raise했다. Event B의 리스너가 Event A를 Raise했다. 스택 오버플로우. 하지만 때로는 크래시하지 않는다 — 그냥 멈춰서 아무런 에러도 표시하지 않은 채 CPU를 갈아먹는 무한 루프로 빠진다.

이것들은 가설이 아니다. 프로덕션 게임에서 출시된 걸 직접 본 버그들이다. 그리고 모두 같은 근본 원인을 갖고 있다: 개별적으로는 올바르게 보이지만 규모가 커지면 실패하는 이벤트 시스템 패턴.

<!-- truncate -->

## 이벤트 시스템의 7가지 대죄

해결책을 이야기하기 전에, 실패 모드를 분류해 보자. 모든 이벤트 시스템 — GES만이 아니라, Unity의 것만이 아니라, 어떤 언어의 모든 pub/sub 구현 — 이 이런 잠재적 함정을 가지고 있다. 출시되는 시스템과 그렇지 못한 시스템의 차이는 팀이 첫 QA 패스 전에 이것들을 알고 있느냐다.

### 대죄 1: 고아 구독

존재하는 이벤트 시스템 버그 중 가장 흔한 것. `Awake()`에서 구독하고, 해제를 잊어버린다. 오브젝트가 파괴되지만 델리게이트는 여전히 참조를 유지한다. 이벤트의 호출 목록이 해당 오브젝트를 가리키고 있어서 가비지 컬렉터가 MonoBehaviour를 수거할 수 없다.

```csharp
public class BadExample : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onDamage;

    private void Awake()
    {
        onDamage.AddListener(HandleDamage);
        // No corresponding RemoveListener anywhere
    }

    private void HandleDamage(int amount)
    {
        // This method will be called even after the object is "destroyed"
        // Unity marks it as destroyed, but the C# object is still alive
        // because the delegate reference prevents GC
        transform.position += Vector3.up; // MissingReferenceException
    }
}
```

교활한 부분: 첫 번째 씬에서는 잘 동작한다. 운이 좋으면 두 번째 씬에서도 동작한다. 누군가 20분 동안 플레이하면서 고아 델리게이트가 수백 개 쌓일 만큼 씬을 로드하기 전까지 메모리 누수는 보이지 않는다.

프로파일러에서는 매 씬 로드마다 관리 메모리가 꾸준히 증가하는 것을 볼 수 있다. 누수된 오브젝트는 MonoBehaviour만이 아니다 — 그 MonoBehaviour가 참조하는 모든 것: 텍스처, 메시, 머티리얼. 하나의 누수된 리스너가 수 메가바이트의 에셋을 고정시킬 수 있다.

### 대죄 2: 세션 간 데이터 오염

Unity의 Play Mode에는 미묘한 함정이 있다. ScriptableObject 인스턴스는 Play Mode 세션 간에 메모리에 유지된다. 이벤트(ScriptableObject인)가 런타임 상태를 저장한다면 — 리스너 목록, 캐시된 값, 스케줄 핸들 — 플레이를 멈춘 후에도 그 상태가 유지된다.

Play를 누른다. 5개의 리스너를 구독한다. 멈춘다. 다시 Play를 누른다. 5개의 리스너가 ScriptableObject의 메모리에 여전히 "등록되어" 있다... 하지만 그것들을 소유했던 MonoBehaviour는 사라졌다. 이제 목록에 5개의 죽은 델리게이트와 새 세션의 5개 새 델리게이트가 있다. 10번 멈추고 플레이하면? 50개의 죽은 델리게이트.

이것은 다음으로 나타난다:
- 예상보다 더 많이 이벤트가 발동 (이전 세션의 유령 리스너)
- 첫 이벤트 Raise 시 `MissingReferenceException` (죽은 델리게이트가 호출 시도)
- 긴 개발 세션 동안 점차 저하되는 에디터 성능

static 필드의 경우 문제는 더 심각하다. static 필드는 특정 설정에서만 도메인 리로드를 넘어서 유지된다 ("Enter Play Mode Settings" 최적화가 활성화된 경우). 유지될 때, 모든 static 캐시, 레지스트리, 상태가 세션 간에 오염된다.

### 대죄 3: 재귀 Raise

Event A의 리스너가 Event B를 Raise한다. Event B의 리스너가 Event A를 Raise한다. 더 단순한 버전: Event A의 리스너가 Event A를 Raise한다. 스택 오버플로우.

```csharp
// Infinite recursion
private void HandleHealthChanged(int newHealth)
{
    // "I need to notify everyone that health changed"
    onHealthChanged.Raise(newHealth);
    // This calls HandleHealthChanged, which calls Raise, which calls...
}
```

직접적인 버전은 명백하다. 간접적인 버전은 발견하기 더 어렵다:

```
OnDamageDealt -> HandleDamage -> raises OnHealthChanged
OnHealthChanged -> HandleHealthCheck -> raises OnDamageDealt (reflected damage)
OnDamageDealt -> HandleDamage -> raises OnHealthChanged
... forever
```

두 개의 이벤트, 두 개의 리스너, 무한 순환. 항상 크래시하지는 않는다. 어떤 상태 조건(체력이 0에 도달하는 등)으로 인해 결국 순환이 끊기면, 특정 게임 상태에 의존하기 때문에 재현하기 어려운 수초간의 프리즈만 일으킬 수 있다.

### 대죄 4: 분실된 Schedule Handle

`RaiseRepeating()`을 `count: -1` (무한)로 호출하면서 핸들을 저장하지 않는다. 이벤트가 영원히 발동한다. 멈출 수 없다. 그것을 실행하는 코루틴에 대한 외부 참조가 없다. 그냥... 계속 실행된다.

```csharp
private void StartAmbientEffect()
{
    // "I'll cancel this later"
    // narrator: they did not cancel this later
    onAmbientPulse.RaiseRepeating(interval: 0.5f, count: -1);
}
```

핸들은 메서드에서 반환되고 즉시 버려진다. 이 메서드가 매 씬 로드마다 실행되면, 씬마다 무한 반복 이벤트가 하나씩 쌓인다. 10개의 씬 후에는, 각각 초당 2번 발동하는 10개의 겹치는 ambient pulse가 있다. 2개여야 할 것이 초당 20번의 이벤트 Raise다.

### 대죄 5: 람다 함정 (또다시)

리스너 전략 포스트에서 다뤘지만, 이벤트 시스템에서 가장 많이 보고되는 "버그"이기 때문에 여기에 다시 넣었다. 익명 델리게이트는 구독 해제할 수 없다.

```csharp
private void OnEnable()
{
    onDamage.AddListener((int amount) => health -= amount);
}

private void OnDisable()
{
    // This creates a NEW lambda. It doesn't match the one above.
    onDamage.RemoveListener((int amount) => health -= amount);
    // The original is still subscribed. Memory leak.
}
```

언어가 위험한 패턴을 자연스럽게 보이게 만든다. 안전한 패턴은 장황하게 보인다. 실패의 구덩이다.

### 대죄 6: 핵폭탄 RemoveAllListeners

시스템 A가 서브시스템의 이벤트를 관리한다. 클린업 중에 자신의 등록을 정리하려고 `RemoveAllListeners()`를 호출한다. 문제는 `RemoveAllListeners()`가 시스템 B, C, D가 등록한 것까지 포함해서 모든 리스너를 제거한다는 것이다.

```csharp
// CombatSystem.cs
private void OnDisable()
{
    // "Clean up my listeners"
    onPlayerDamaged.RemoveAllListeners();  // OOPS: killed AudioManager's listener too
}
```

이제 AudioManager가 히트 사운드를 재생하지 않고, AnalyticsTracker가 데미지 이벤트 기록을 중단하고, AchievementSystem이 마일스톤 추적을 멈춘다. 한 시스템이 메스가 필요한 곳에 망치를 사용했기 때문이다.

이건 빠른 프로토타입이 프로덕션 코드가 될 때 특히 흔하다. `RemoveAllListeners()`는 개별 참조를 추적하는 것보다 작성이 빠르다. 시스템이 유일한 리스너일 때는 잘 동작한다. 다른 시스템이 같은 이벤트에 구독하기 시작하면 조용히 깨진다.

### 대죄 7: 비싼 Predicate

Conditional 리스너에는 이벤트가 발동할 때마다 평가되는 predicate가 있다. 이벤트가 초당 60회 발동하고 predicate가 Physics.OverlapSphere를 수행하면, conditional 리스너당 초당 60번의 구형 캐스트다.

```csharp
// 60 sphere casts per second, just for the condition check
onPositionUpdate.AddConditionalListener(
    HandleNearbyEnemies,
    () => Physics.OverlapSphere(transform.position, 10f, enemyLayer).Length > 0,
    priority: 50
);
```

프로파일러가 "조건 평가"에서 시간이 걸리는 것을 보여주고, 왜 이벤트 시스템이 느린지 궁금해한다. 이벤트 시스템은 문제없다. 저렴한 boolean 검사여야 할 델리게이트 안에서 predicate가 물리 시스템 전체의 작업을 하고 있는 것이다.

## 이를 방지하는 GES 패턴

이제 해결책을 이야기하자. 일부는 GES에 내장되어 있다. 나머지는 관례로 강제하는 패턴이다.

### 황금 규칙: OnEnable / OnDisable

이 전체 블로그 시리즈에서 하나만 기억한다면, 이것을 기억하라:

```csharp
private void OnEnable()
{
    myEvent.AddListener(HandleEvent);
}

private void OnDisable()
{
    myEvent.RemoveListener(HandleEvent);
}
```

`Awake` / `OnDestroy`가 아니다. `Start` / `OnApplicationQuit`도 아니다. `OnEnable` / `OnDisable`이다.

이 특정 쌍이 중요한 이유:

**OnEnable/OnDisable은 활성 상태를 추적한다.** GameObject를 비활성화하면? `OnDisable`이 발동하고, 리스너가 제거된다. 다시 활성화하면? `OnEnable`이 발동하고, 리스너가 다시 추가된다. 비활성화된 오브젝트는 이벤트를 수신하지 않는다 — 거의 항상 올바른 동작이다.

**Awake/OnDestroy는 한 번만 발동한다.** Awake에서 구독한 오브젝트를 비활성화했다가 다시 활성화하면? 비활성화된 동안에도 여전히 구독된 채로, 처리하면 안 되는 이벤트를 수신한다.

**Start는 타이밍 문제가 있다.** 다른 오브젝트가 자신의 Awake에서 이벤트를 Raise한다. Start에서 구독한 리스너는 그걸 놓친다. OnEnable이 라이프사이클에서 더 일찍 실행된다.

유일한 예외: `DontDestroyOnLoad` 오브젝트의 persistent 리스너. `OnEnable`에서 `AddPersistentListener`로 구독하고, `OnDestroy`에서 `RemovePersistentListener`로 제거한다 (OnDisable이 아니라, OnDisable은 활성 오브젝트의 씬 전환 중에 발동하기 때문이다).

```csharp
// Standard: scene-scoped listeners
private void OnEnable()
{
    myEvent.AddListener(HandleEvent);
    myEvent.AddPriorityListener(HandlePriority, 50);
}

private void OnDisable()
{
    myEvent.RemoveListener(HandleEvent);
    myEvent.RemovePriorityListener(HandlePriority);
}

// Exception: DontDestroyOnLoad persistent listeners
private void OnEnable()
{
    myEvent.AddPersistentListener(HandleEvent, 0);
}

private void OnDestroy()
{
    myEvent.RemovePersistentListener(HandleEvent);
}
```

### Auto Static Reset: GES의 내장 데이터 오염 방지

GES는 Auto Static Reset 메커니즘으로 ScriptableObject 영속성 문제를 처리한다. 에디터에서 Play Mode를 종료하면 GES가 자동으로 초기화한다:

- 모든 static 이벤트 캐시
- 모든 리스너 등록
- 모든 스케줄된 이벤트 핸들
- 런타임에 생성된 모든 트리거 및 체인 연결

Play를 누를 때마다 이벤트가 깨끗한 상태에서 시작한다. 수동 리셋 메서드 없음. `[RuntimeInitializeOnLoadMethod]` 핵 없음. 이벤트 에셋 자체(이름, 타입, 인스펙터 설정)는 디자인 타임 데이터이므로 유지된다. 런타임 상태(리스너, 스케줄, 플로우 연결)는 플레이 타임 데이터이므로 초기화된다.

이 분리는 의도적이다. 디자인 타임 데이터는 세션 간에 유지되어야 한다 — 테스트할 때마다 이벤트를 재설정하고 싶지 않다. 런타임 데이터는 유지되면 안 된다 — 이전 세션의 유령 리스너를 원하지 않는다.

이벤트 서브클래스에 커스텀 상태를 저장하고 있다면(자체 프로퍼티나 필드), 그 리셋은 직접 처리해야 한다. Auto-reset은 GES의 내부 상태를 커버하며, 확장은 커버하지 않는다. 자체 static에는 `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]`을 사용하라.

### 재귀 가드 패턴

GES는 재귀 순환을 자동으로 끊지 않는다. 때때로 재진입 Raise가 의도적인 경우가 있기 때문이다(드물지만 존재한다). 대신 가드 플래그를 사용하라:

```csharp
private bool _isProcessingHealth;

private void HandleHealthChange(int newHealth)
{
    if (_isProcessingHealth) return;
    _isProcessingHealth = true;

    try
    {
        // Process health logic...

        // Safe: won't recurse because of the guard
        onHealthChanged.Raise(newHealth);
    }
    finally
    {
        _isProcessingHealth = false;
    }
}
```

`try/finally`가 핵심이다. 없으면, 처리 로직에서 예외가 발생했을 때 `_isProcessingHealth`가 true로 영구히 고착된다. 핸들러가 세션 나머지 동안 다시는 발동하지 않게 된다.

간접 순환 (A가 B를 Raise하고 B가 A를 Raise)의 경우, 양쪽 핸들러를 가드하거나 순환이 피드백하지 않는 별도 이벤트를 사용하도록 구조를 변경하라:

```
// Before (cycles):
OnDamage -> HandleDamage -> raises OnHealthChanged
OnHealthChanged -> HandleHealth -> raises OnDamage (reflected)

// After (no cycle):
OnDamage -> HandleDamage -> raises OnHealthChanged
OnHealthChanged -> HandleHealth -> raises OnReflectedDamage (separate event)
OnReflectedDamage -> HandleReflected -> does NOT raise OnHealthChanged
```

Runtime Monitor의 Warnings 탭은 이미 처리 중인 이벤트가 다시 Raise될 때 플래그를 표시한다. 테스트 중에 재귀 경고를 보면, 가드가 필요한 순환이 있는 것이다.

![Monitor Warnings](/img/game-event-system/tools/runtime-monitor/monitor-warnings.png)

### 핸들 관리: 항상 저장하고, 항상 취소하라

모든 `RaiseDelayed()`와 `RaiseRepeating()`은 ScheduleHandle을 반환한다. 항상 저장하라. 항상 OnDisable에서 취소하라.

```csharp
// ANTI-PATTERN: handle lost forever
private void StartPoison()
{
    onPoisonTick.RaiseRepeating(10, interval: 1f, count: -1);
    // Can never cancel this. Runs until application quits.
}

// CORRECT: stored and managed
private ScheduleHandle _poisonHandle;

private void StartPoison()
{
    _poisonHandle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: -1);
}

private void CurePoison()
{
    if (_poisonHandle.IsActive)
        _poisonHandle.Cancel();
}

private void OnDisable()
{
    if (_poisonHandle.IsActive)
        _poisonHandle.Cancel();
}
```

동시에 여러 스케줄이 있는 경우:

```csharp
private List<ScheduleHandle> _activeSchedules = new List<ScheduleHandle>();

private void ScheduleSomething()
{
    var handle = onEvent.RaiseDelayed(2f);
    _activeSchedules.Add(handle);
}

private void CancelAll()
{
    foreach (var handle in _activeSchedules)
    {
        if (handle.IsActive) handle.Cancel();
    }
    _activeSchedules.Clear();
}

private void OnDisable() => CancelAll();
```

### SetInspectorListenersActive: 일괄 뮤트

GES 이벤트는 Behavior Window에서 비주얼하게 설정된 리스너를 가질 수 있다. 코드 리스너와 함께 발동한다. 일괄 작업 중 — 100개 아이템 로딩, 대량 데이터 처리, 상태 리셋 — 파티클, 사운드, UI 애니메이션을 트리거하는 비주얼 리스너는 감당이 안 된다.

```csharp
myEvent.SetInspectorListenersActive(false);
try
{
    for (int i = 0; i < 100; i++)
    {
        myEvent.Raise(processedItems[i]);
    }
}
finally
{
    myEvent.SetInspectorListenersActive(true);
}

// Final raise with visual feedback
myEvent.Raise(summary);
```

코드 리스너는 정상적으로 발동한다. 인스펙터에서 설정된 비주얼 응답만 뮤트된다. `try/finally`로 일괄 처리가 예외를 던져도 재활성화를 보장한다.

### 정밀 제거: 클린업에 RemoveAllListeners를 절대 사용하지 마라

각 컴포넌트는 자신의 리스너만 제거해야 한다:

```csharp
// BAD: destroys everyone's subscriptions
private void OnDisable()
{
    myEvent.RemoveAllListeners();
}

// GOOD: removes only what you own
private void OnDisable()
{
    myEvent.RemoveListener(MyHandler);
    myEvent.RemovePriorityListener(MyOtherHandler);
}
```

`RemoveAllListeners()`는 전역 상태 리셋에만 적절하다 — 완전히 새로운 게임 세션 로딩, 테스트 후 리셋. Basic, Priority, Conditional 리스너를 제거하지만 Persistent 리스너는 의도적으로 남겨둔다 (클린업에서 명시적으로 제외됐기 때문이다).

### 델리게이트를 캐시하라

메서드 참조가 리스너에 항상 가장 안전한 패턴이다:

```csharp
// BROKEN: anonymous lambda, can never be removed
onDamage.AddListener((int amount) => health -= amount);

// CORRECT: method reference, stable identity
onDamage.AddListener(HandleDamage);
private void HandleDamage(int amount) => health -= amount;

// ALSO CORRECT: cached delegate for when you need closures
private System.Action<int> _handler;
private void OnEnable()
{
    _handler = (amount) => health -= amount;
    onDamage.AddListener(_handler);
}
private void OnDisable()
{
    onDamage.RemoveListener(_handler);
}
```

이것은 모든 리스너 타입에 적용된다. 제거할 계획인 리스너는 안정적인 델리게이트 참조가 필요하다.

### Predicate를 저렴하게 유지하라

Conditional 리스너의 predicate는 계산이 아닌 필드 읽기여야 한다:

```csharp
// BAD: physics query every time the event fires
onPositionUpdate.AddConditionalListener(
    HandleNearby,
    () => Physics.OverlapSphere(transform.position, 10f).Length > 0,
    priority: 50
);

// GOOD: update the cache periodically, read it cheaply
private bool _hasNearbyEnemies;

private void FixedUpdate()
{
    _hasNearbyEnemies = Physics.OverlapSphere(
        transform.position, 10f, enemyLayer).Length > 0;
}

onPositionUpdate.AddConditionalListener(
    HandleNearby,
    () => _hasNearbyEnemies,
    priority: 50
);
```

FixedUpdate당 물리 쿼리 한 번 vs 이벤트 발동당 한 번. 프레임당 여러 번 발동하는 이벤트에서, 이것은 부드러운 게임플레이와 끊기는 게임플레이의 차이다.

## 아키텍처 패턴: 서비스 이벤트 인터페이스

대규모 프로젝트에서는 각 서브시스템의 이벤트 와이어링을 전용 인터페이스 클래스에 중앙화하라:

```csharp
public class CombatEventInterface : MonoBehaviour
{
    [Header("Outgoing Events")]
    [GameEventDropdown, SerializeField] private Int32GameEvent onDamageDealt;
    [GameEventDropdown, SerializeField] private SingleGameEvent onCombatStarted;
    [GameEventDropdown, SerializeField] private SingleGameEvent onCombatEnded;

    [Header("Incoming Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayerDied;
    [GameEventDropdown, SerializeField] private Int32GameEvent onHealReceived;

    private CombatSystem _combat;

    private void OnEnable()
    {
        _combat = GetComponent<CombatSystem>();
        onPlayerDied.AddPriorityListener(_combat.HandlePlayerDeath, 100);
        onHealReceived.AddPriorityListener(_combat.HandleHeal, 100);
    }

    private void OnDisable()
    {
        onPlayerDied.RemovePriorityListener(_combat.HandlePlayerDeath);
        onHealReceived.RemovePriorityListener(_combat.HandleHeal);
    }

    public void NotifyDamageDealt(int amount) => onDamageDealt.Raise(amount);
    public void NotifyCombatStarted() => onCombatStarted.Raise();
    public void NotifyCombatEnded() => onCombatEnded.Raise();
}
```

CombatSystem 자체는 GES에 대해 아무것도 모른다. CombatEventInterface의 메서드를 호출한다. 이렇게 하면 전투 시스템을 이벤트 없이 테스트할 수 있고, 이벤트 와이어링을 단일 파일에서 감사할 수 있다. 문제가 생기면, 전투 시스템이 건드리는 모든 이벤트를 하나의 클래스에서 확인할 수 있다.

## 출시 전 체크리스트

이벤트 아키텍처가 프로덕션 준비가 됐다고 판단하기 전에 이것들을 점검하라:

1. 모든 `AddListener`에 반대 라이프사이클 메서드의 대응하는 `RemoveListener`가 있다
2. 모든 `AddPersistentListener`에 `OnDestroy`의 `RemovePersistentListener`가 있다
3. 모든 `RaiseDelayed` / `RaiseRepeating` 핸들이 저장되고 `OnDisable`에서 취소된다
4. 제거가 필요한 리스너에 람다를 사용하지 않는다 (델리게이트 캐싱이나 메서드 참조만)
5. 가드 플래그 없는 재귀 이벤트 패턴이 없다
6. `RemoveAllListeners()`는 전역 리셋에만 사용하고, 컴포넌트별 클린업에는 사용하지 않는다
7. Conditional predicate가 저렴하다 (필드 읽기, 계산이 아닌)
8. 고빈도 이벤트의 리스너 수가 최소한이다
9. 일괄 작업 중에 인스펙터 리스너가 뮤트된다
10. Runtime Monitor가 전체 플레이스루 동안 경고를 표시하지 않는다

이 10가지 점검이 이벤트 시스템 버그의 95%를 플레이어에게 도달하기 전에 잡아줄 것이다. 나머지 5%는 게임 코드의 로직 버그이지 이벤트 시스템 이슈가 아니다 — 그리고 Runtime Monitor가 그것도 찾는 데 도움을 줄 것이다.

이 모든 것의 패턴은 동일하다: 이벤트 시스템은 것들을 디커플링하기 때문에 강력하다. 하지만 디커플링은 커플링이 명확하게 만들어주었을 실수를 컴파일러가 잡아줄 수 없다는 뜻이다. 스스로 규율을 강제하거나 — 아니면 대신 강제해주는 시스템을 사용해야 한다.

---

🚀 글로벌 개발자 서비스

**🇨🇳 중국 개발자 커뮤니티**
- 🛒 [Unity 중국 에셋 스토어](https://tinygiants.tech/ges/cn)
- 🎥 [Bilibili 동영상 튜토리얼](https://tinygiants.tech/bilibili)
- 📘 [기술 문서](https://tinygiants.tech/docs/ges)
- 💬 QQ 그룹 (1071507578)

**🌐 글로벌 개발자 커뮤니티**
- 🛒 [Unity Global Asset Store](https://tinygiants.tech/ges)
- 💬 [Discord 커뮤니티](https://tinygiants.tech/discord)
- 🎥 [YouTube 채널](https://tinygiants.tech/youtube)
- 🎮 [Unity 포럼](https://tinygiants.tech/forum/ges)
- 🐙 [GitHub](https://github.com/tinygiants-tech/TinyGiants)

**📧 지원**
- 🌐 [TinyGiants Studio](https://tinygiants.tech)
- ✉️ [지원 이메일](mailto:support@tinygiants.tech)
