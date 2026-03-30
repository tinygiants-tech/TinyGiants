---
slug: listener-strategies-deep-dive
title: '실행 순서 버그: "누가 먼저 응답하느냐"에 숨겨진 위험'
authors: [tinygiants]
tags: [ges, unity, scripting, advanced, best-practices]
description: "UI가 데이터 업데이트보다 먼저 갱신되면, 그건 실행 순서 버그입니다. C# 이벤트가 이 문제를 피할 수 없는 이유와 결정론적 리스너 파이프라인으로 해결하는 방법을 알아봅니다."
image: /img/home-page/game-event-system-preview.png
---

플레이어가 25 데미지를 받는다. 체력 시스템이 현재 HP에서 이를 차감한다. UI가 체력바를 갱신한다. 그런데 체력바에 75가 아니라 100이 표시된다. 20분 동안 코드를 들여다본 끝에 원인을 알게 된다: UI 리스너가 체력 시스템 리스너보다 먼저 실행된 것이다. UI는 이전 HP 값을 읽어서 렌더링했고, 그 후에야 체력 시스템이 값을 업데이트했다. 데이터가 올바르게 갱신됐을 때는 이미 프레임이 그려진 후였다.

이것이 바로 실행 순서 버그다. 이벤트 기반 아키텍처를 사용하는 게임을 출시해 본 적이 있다면, 자기도 모르게 이런 버그를 몇 개씩 함께 출시했을 가능성이 높다. 테스트할 때는 스크립트가 우연히 올바른 순서로 초기화되어 잘 동작하다가, 프로덕션에서 Unity가 다른 순서로 로딩하면서 깨지는 그런 종류의 버그다.

이건 드문 엣지 케이스가 아니다. 대부분의 이벤트 시스템이 가진 구조적 결함이다 — Unity의 `UnityEvent`와 표준 C# `event` 델리게이트를 포함해서. 왜 이런 일이 생기는지 이해하고 나면, 다시는 모른 척할 수 없게 된다.

<!-- truncate -->

## 등록 순서가 형편없는 실행 전략인 이유

일반적인 C# 이벤트 시스템에서 리스너는 등록된 순서대로 실행된다. 먼저 구독하면 먼저 호출된다. 합리적으로 들리지만, "등록 순서"가 실제로 무엇에 의존하는지 생각해 보면 이야기가 달라진다.

Unity에서 대부분의 구독은 `Awake()`나 `OnEnable()`에서 이루어진다. 이들의 실행 순서는 다음에 의존한다:

1. **Script Execution Order** — Project Settings에서 설정할 수 있지만, 30개 이상의 스크립트에 대해 실제로 이걸 설정하는 사람이 있을까?
2. **GameObject 생성 순서** — 씬 계층 구조의 위치에 따라 달라지며, 누군가 씬 뷰에서 오브젝트를 재배치하면 바뀐다.
3. **프리팹 인스턴스화 타이밍** — 런타임에 생성되는 오브젝트는 씬 오브젝트보다 나중에 구독한다.
4. **AddComponent 순서** — 동적으로 구성되는 오브젝트의 경우, 컴포넌트 순서가 라이프사이클 타이밍을 결정한다.

결국 리스너의 실행 순서는 씬 계층 구조, 인스턴스화 타이밍, 스크립트 실행 설정, 컴포넌트 순서에 의존한다. GameObject를 계층 구조에서 이동하면? 동작이 바뀔 수 있다. 프리팹을 한 프레임 늦게 인스턴스화하면? 실행 순서가 달라진다. 시스템을 프리팹 대신 AddComponent를 사용하도록 리팩토링하면? 모든 것이 뒤바뀐다.

"UI에 오래된 데이터가 표시되는" 버그가 흔한 이유가 바로 이것이다. 코드가 틀린 게 아니다 — 암묵적인 순서가 취약하고, 로직과 무관한 이유로 변하기 때문이다.

## 모두가 알지만 아무도 강제하지 않는 "데이터 먼저, 뷰 나중에" 문제

모든 게임 개발자는 원칙을 안다: 먼저 데이터를 업데이트하고, 그다음 렌더링하라. Model before View. 상태 변경 후 화면 갱신. 컴퓨터 과학 기초다.

하지만 C# 이벤트로 이걸 어떻게 강제할 수 있을까?

```csharp
// In HealthSystem.cs
private void OnEnable()
{
    onPlayerDamaged += ApplyDamage; // mutates HP
}

// In HealthBarUI.cs
private void OnEnable()
{
    onPlayerDamaged += RefreshHealthBar; // reads HP
}
```

어느 것이 먼저 실행될까? `OnEnable()`이 먼저 발동하는 쪽이다. 어느 `OnEnable()`이 먼저 발동할까? Script Execution Order에 따라 다르다. 보장할 수 있을까? 어느 정도는 — Project Settings에서 설정할 수 있다. 두 개의 스크립트에 대해서는. 그런데 15개의 시스템이 같은 이벤트를 리스닝하고 있다면?

Script Execution Order는 확장성이 없다. 새 시스템을 추가할 때마다 깨지는 상대적 순서의 악몽 같은 매트릭스가 된다. 그리고 이것은 `Awake`/`OnEnable`/`Start` 순서에만 영향을 미치지, 실제 델리게이트 호출 순서(`+=` 호출 시퀀스에 의존)에는 영향을 미치지 않는다.

일반적인 C# 이벤트로는 이걸 강제할 수 없다. 그냥 기도하는 수밖에 없다.

## 조건부 실행: 아무도 이야기하지 않는 성능 문제

좀 더 미묘한 문제가 있다. 매 `FixedUpdate`마다 발생하는 물리 관련 이벤트가 있다고 하자. `onCollisionDetected`나 `onPositionUpdated` 같은 것. 초당 50회 발생한다.

8개의 시스템이 이 이벤트를 리스닝하고 있다. 하지만 대부분은 특정 조건에서만 관심이 있다:
- 데미지 시스템은 충돌이 적 관련일 때만 처리한다.
- 사운드 시스템은 충격력이 임계값을 초과할 때만 처리한다.
- 파티클 시스템은 특정 재질 타입일 때만 처리한다.
- AI 시스템은 플레이어가 관련될 때만 처리한다.

표준 C# 이벤트에서는 8개의 리스너가 매번 모두 실행된다. 각각 내부에서 조건을 확인하고 해당하지 않으면 빠져나온다. 그건 초당 50회, 8번의 메서드 호출, 8번의 조건 검사, 8번의 잠재적 캐시 미스다. 단일 이벤트에 대해서.

```csharp
private void HandleCollision(CollisionData data)
{
    if (!data.InvolvesEnemy()) return; // most calls bail here

    // Actual work that rarely runs
    ApplyDamage(data);
}
```

검사 자체는 저렴하다. 하지만 "저렴한 것 x 초당 400회 x 리스너 8개"가 쌓이면, 특히 모바일에서는 무시할 수 없다. 함수에 진입해서 조건을 확인하고 즉시 반환하는 이 패턴은 설계상 낭비다. 아무것도 하지 않기 위해 함수 호출 오버헤드를 지불하는 것이다.

진짜 원하는 건 "이 조건이 참이 아니면 아예 호출하지 마라"는 것이다. Post-filter가 아닌 Pre-filter.

## 크로스씬 영속성: AudioManager 문제

모든 Unity 프로젝트에는 AudioManager가 있다. `DontDestroyOnLoad` 오브젝트에 존재한다. 모든 씬의 이벤트에 반응하여 사운드를 재생해야 한다. 히트 사운드, 사망 사운드, 아이템 획득 사운드 — 모두 게임플레이 이벤트로 트리거된다.

표준 C# 이벤트에서는 이것이 문제가 된다. 새로운 씬을 로드할 때:

1. 모든 씬 오브젝트가 파괴되고, 이벤트 구독도 함께 사라진다.
2. 새로운 씬 오브젝트가 새로운 이벤트 인스턴스로 생성된다.
3. AudioManager의 구독은 이전 이벤트 인스턴스에 있었다. 사라졌다.

따라서 AudioManager는 매 씬 로드 후에 이벤트에 재구독해야 한다. 모든 씬의 모든 이벤트를 알아야 한다. 모든 것에 대한 참조를 가진 God 오브젝트가 되어버린다.

아니면 static 이벤트를 사용하는데, 그러면 다른 문제가 생긴다: AudioManager는 언제 구독하나? `Awake()`에서 구독하면, 모든 이벤트가 이미 존재하나? 아직 로드되지 않은 ScriptableObject에 정의된 이벤트는? 씬별 이벤트 인스턴스는 — 같은 아이덴티티로 재생성되나?

흔한 우회책들 — static 이벤트 버스, 서비스 로케이터, 등록 API가 있는 싱글톤 매니저 — 모두 동작하지만 아키텍처적 무게를 더한다. AudioManager가 씬 관리에 대해 알 필요는 없어야 한다. 그냥 "이 이벤트를 듣고 싶다, 어떤 씬에 있든 영원히"라고 말할 수 있어야 한다.

## 람다 함정: C#의 조용한 메모리 누수

이건 경험 많은 C# 개발자도 당한다.

```csharp
private void OnEnable()
{
    onDamage += (int amount) => currentHealth -= amount;
}

private void OnDisable()
{
    // How do you unsubscribe? You CAN'T.
    onDamage -= (int amount) => currentHealth -= amount;
    // This creates a NEW delegate. It doesn't match the original.
}
```

모든 람다 표현식은 새로운 델리게이트 인스턴스를 생성한다. 코드가 글자 하나 안 틀리고 동일하더라도, `RemoveListener`는 매칭할 수 없다 — 메모리상 다른 오브젝트이기 때문이다. 원래 델리게이트는 여전히 구독된 채로, MonoBehaviour에 대한 참조를 유지하고 있으며, GC는 둘 다 수거할 수 없다.

10개의 시스템에서 5개의 씬에 걸쳐 이렇게 하면, 20-30분 플레이 후에야 나타나는 느린 메모리 누수가 생긴다. QA가 일관되게 재현할 수 없는 종류의 누수 — 몇 개의 씬이 어떤 순서로 로드됐느냐에 따라 달라지기 때문이다.

해결법은 알면 당연한 것이다 — 델리게이트를 캐시하거나 메서드 참조를 사용하는 것. 하지만 언어가 위험한 버전을 자연스럽게 보이게 하고 안전한 버전을 장황하게 보이게 만든다. 성공의 구덩이가 아니라 실패의 구덩이다.

## 리스너 시스템에서 진정으로 원하는 것

한 걸음 물러서서 요구사항을 정리해 보자:

1. **결정론적 순서**: 데이터 로직이 뷰 로직보다 항상 먼저 실행된다. 등록 타이밍과 무관하게.
2. **조건부 필터링**: 관심 없는 리스너는 호출하지 않는다. Post-filter가 아닌 Pre-filter.
3. **크로스씬 생존**: 일부 리스너는 재구독 없이 씬 로드를 넘어서 유지되어야 한다.
4. **깔끔한 라이프사이클**: 구독, 해제, 댕글링 참조 없음, 조용한 누수 없음.
5. **조합 가능성**: 같은 이벤트에서 서로 다른 리스너 전략을 충돌 없이 혼합할 수 있어야 한다.

표준 C# 이벤트는 주의하면 #4를 제공하고, 나머지는 전혀 제공하지 않는다. UnityEvent는 인스펙터 지원과 함께 #4를 제공하지만, 역시 나머지는 없다. 이것이 GES의 리스너 시스템이 채우는 공백이다.

## GES의 네 가지 리스너 타입

GES는 각각 특정 아키텍처적 니즈를 위해 설계된 네 가지 리스너 전략을 제공한다. 결정론적인 6-레이어 파이프라인에서 실행되므로, 순서를 항상 알 수 있다.

### 레이어 1: Basic 리스너 (FIFO)

기본값이다. 구독하고, 콜백 받고, 끝.

```csharp
[GameEventDropdown, SerializeField] private Int32GameEvent onPlayerDamaged;

private void OnEnable()
{
    onPlayerDamaged.AddListener(HandleDamage);
}

private void OnDisable()
{
    onPlayerDamaged.RemoveListener(HandleDamage);
}

private void HandleDamage(int amount)
{
    currentHealth -= amount;
}
```

Basic 리스너는 FIFO 순서로 실행된다 — 먼저 구독한 것이 먼저 호출된다. 순서가 정말 상관없을 때 사용한다. 같은 이벤트에 대한 독립적인 반응: 히트 플래시, 고통 사운드, 카메라 흔들림. 서로의 상태를 읽지 않으므로 상대적 순서가 중요하지 않다.

### 레이어 2: Priority 리스너 (명시적 순서)

실행 순서 문제를 해결하는 곳이다. Priority 리스너는 어떤 리스너가 먼저 실행될지 정확히 선언할 수 있게 한다.

```csharp
// Higher number = runs first
onPlayerDamaged.AddPriorityListener(ApplyDamageReduction, priority: 100);
onPlayerDamaged.AddPriorityListener(UpdateHealthData, priority: 50);
onPlayerDamaged.AddPriorityListener(RefreshHealthUI, priority: 25);
onPlayerDamaged.AddPriorityListener(PlayHitSound, priority: 10);
onPlayerDamaged.AddPriorityListener(LogDamageAnalytics, priority: 0);
```

`ApplyDamageReduction`은 항상 먼저 실행된다 (priority 100). 항상. 어떤 스크립트가 먼저 로드됐는지, 어떤 GameObject가 먼저 생성됐는지, 씬 계층 구조가 어떤 순서인지와 무관하게. 그다음 `UpdateHealthData` (50). 그다음 `RefreshHealthUI` (25). UI는 항상 감소 후, 변경 후의 HP 값을 본다.

![Priority Behavior Ordered](/img/game-event-system/examples/05-priority-event/demo-05-behavior-ordered.png)

명시적 순서가 없으면 어떻게 되는지 비교해 보자 — 초기화 타이밍에 따라 달라지는 혼란스러운 실행:

![Priority Behavior Chaotic](/img/game-event-system/examples/05-priority-event/demo-05-behavior-chaotic.png)

#### 확장 가능한 Priority 컨벤션

팀 전체에서 사용하는 priority 상수를 정의하는 것이 매우 유용하다:

```csharp
public static class EventPriority
{
    public const int CRITICAL    = 200;  // Validation, security, sanity checks
    public const int HIGH        = 100;  // State mutations, data changes
    public const int NORMAL      = 50;   // Game logic, behavior reactions
    public const int LOW         = 25;   // UI updates, visual effects
    public const int BACKGROUND  = 10;   // Audio, particles, non-critical feedback
    public const int CLEANUP     = 0;    // Logging, analytics, telemetry
}
```

```csharp
onPlayerDamaged.AddPriorityListener(ValidateInput, EventPriority.CRITICAL);
onPlayerDamaged.AddPriorityListener(ApplyDamage, EventPriority.HIGH);
onPlayerDamaged.AddPriorityListener(CheckDeathCondition, EventPriority.NORMAL);
onPlayerDamaged.AddPriorityListener(UpdateHealthBar, EventPriority.LOW);
onPlayerDamaged.AddPriorityListener(PlayHitSound, EventPriority.BACKGROUND);
onPlayerDamaged.AddPriorityListener(TrackDamageMetrics, EventPriority.CLEANUP);
```

새로운 시스템이 같은 이벤트를 리스닝해야 할 때, 적절한 티어를 선택해서 넣으면 된다. 다른 모든 리스너의 등록 순서를 감사할 필요가 없다. Script Execution Order 춤도 필요 없다. 그냥 티어를 선택하면 된다.

같은 priority를 가진 리스너는 해당 티어 내에서 FIFO 순서로 실행된다 — 올바른 폴백이다. 한 티어 내에서 순서가 중요하지 않아야 하기 때문이다. 중요하다면, 다른 priority를 부여하면 된다.

### 레이어 3: Conditional 리스너 (사전 필터 실행)

Conditional 리스너는 조건 게이트를 추가한다. 이벤트가 발생하는 시점에 조건이 참일 때만 리스너가 동작한다.

```csharp
// Only react to damage when the shield is down
onPlayerDamaged.AddConditionalListener(
    call: HandleDamage,
    condition: () => !isShielded,
    priority: 50
);
```

조건은 리스너 로직이 실행되기 전에 평가된다. false를 반환하면 리스너가 완전히 건너뛰어진다 — 메서드 호출 없이, 조건 평가 비용만 들 뿐이다.

타입이 있는 이벤트의 경우, 조건에서 인자를 검사할 수 있다:

```csharp
// Only react to critical hits (damage > 50)
onPlayerDamaged.AddConditionalListener(
    call: HandleCriticalHit,
    condition: (int damage) => damage > 50,
    priority: 75
);
```

Sender 이벤트의 경우, 양쪽 모두 검사할 수 있다:

```csharp
// Only react to damage from bosses
onDamageFromSource.AddConditionalListener(
    call: HandleBossDamage,
    condition: (GameObject sender, int damage) => sender.CompareTag("Boss"),
    priority: 75
);
```

이것이 고빈도 이벤트 문제를 해결한다. 8개의 리스너가 초당 50회 실행되면서 대부분 일찍 빠져나오는 대신, 조건이 충족된 리스너만 실제로 실행된다. 나머지는 조건 레벨에서 건너뛰어진다 — 전체 메서드 호출보다 훨씬 저렴하다.

Conditional 리스너도 priority로 정렬되므로, 단일 구독에서 필터링과 순서 지정을 동시에 얻을 수 있다. 실드 검사는 priority 100, 아머 감소는 priority 50, 각각의 기준에 대한 조건부로.

### 레이어 4: Persistent 리스너 (크로스씬 생존)

Persistent 리스너는 `SceneManager.LoadScene()` 호출을 넘어서 생존한다. 재구독 없이 씬 전환을 거쳐도 이벤트를 계속 수신한다.

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayerDamaged;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemyDied;
    [GameEventDropdown, SerializeField] private SingleGameEvent onItemPickedUp;

    private void OnEnable()
    {
        onPlayerDamaged.AddPersistentListener(PlayHitSound, priority: 10);
        onEnemyDied.AddPersistentListener(PlayDeathSound, priority: 10);
        onItemPickedUp.AddPersistentListener(PlayPickupSound, priority: 10);
    }

    private void OnDestroy()
    {
        onPlayerDamaged.RemovePersistentListener(PlayHitSound);
        onEnemyDied.RemovePersistentListener(PlayDeathSound);
        onItemPickedUp.RemovePersistentListener(PlayPickupSound);
    }

    private void PlayHitSound() { /* ... */ }
    private void PlayDeathSound() { /* ... */ }
    private void PlayPickupSound() { /* ... */ }
}
```

![Persistent Behavior](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

AudioManager는 한 번 구독하면 끝이다. 씬 로드 후 재구독 없음. 어떤 이벤트가 어떤 씬에 존재하는지 추적할 필요 없음. God 오브젝트 패턴 없음.

이것은 Analytics, SaveSystem, AchievementTracker — 전체 세션 동안 존재하면서 모든 씬의 이벤트를 들어야 하는 모든 것에 동일하게 잘 동작한다.

![Persistent Scene Setup](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

#### 중요: 수동 제거 필수

Persistent 리스너는 씬 언로드 시 자동으로 제거되지 않는다. 그것이 핵심이다. 하지만 이는 소유 오브젝트가 파괴될 때 반드시 수동으로 제거해야 한다는 뜻이다. 그렇지 않으면 댕글링 델리게이트가 생긴다.

항상 persistent 리스너를 `OnDestroy()`에서 제거하라, `OnDisable()`이 아니라. `DontDestroyOnLoad` 오브젝트의 경우 `OnDisable()`은 씬 전환 중에 발동하는데, 그건 너무 이르다.

```csharp
// WRONG: fires during scene transition for DontDestroyOnLoad objects
private void OnDisable()
{
    onEvent.RemovePersistentListener(MyHandler);
}

// RIGHT: fires when the object is actually destroyed
private void OnDestroy()
{
    onEvent.RemovePersistentListener(MyHandler);
}
```

#### RemoveAllListeners()는 의도적으로 제한된다

`RemoveAllListeners()`를 호출하면 Basic, Priority, Conditional 리스너를 제거한다. Persistent 리스너는 건드리지 않는다.

이것은 의도된 설계다. `RemoveAllListeners()`는 클린업 작업이다 — 씬 전환, 시스템 리셋, 테스트 정리. Persistent 리스너는 씬 범위 클린업에서 명시적으로 제외된다. 제거하려면 각각에 대해 `RemovePersistentListener()`를 개별적으로 호출해야 한다. 의도적 결정을 위한 의도적 마찰이다.

## 6-레이어 실행 파이프라인

GES 이벤트에서 `Raise()`가 호출되면, 모든 리스너가 6개의 레이어에 걸쳐 엄격하고 결정론적인 순서로 실행된다:

1. **Basic 리스너** — FIFO 순서
2. **Priority 리스너** — 높은 priority 숫자가 먼저
3. **Conditional 리스너** — 조건 필터 후 priority 정렬
4. **Persistent 리스너** — 크로스씬, priority 포함
5. **Trigger 이벤트** — 다른 이벤트로의 병렬 팬아웃
6. **Chain 이벤트** — 순차적 블로킹 실행

레이어 1은 항상 레이어 2보다 먼저 실행된다. 레이어 2는 레이어 3보다 먼저. 항상. 각 레이어 내에서는 내부 순서 규칙이 적용된다. 이 결정론이 "왜 UI가 데이터보다 먼저 업데이트됐지" 류의 버그를 제거한다.

실제로 단일 이벤트가 여러 리스너 타입을 동시에 사용하는 경우가 많다:

```csharp
// Data layer: priority listener, runs first
onPlayerDamaged.AddPriorityListener(ApplyDamage, EventPriority.HIGH);

// UI layer: basic listeners, order among them doesn't matter
onPlayerDamaged.AddListener(UpdateHealthBar);
onPlayerDamaged.AddListener(FlashDamageIndicator);

// Analytics: persistent, survives scene transitions
onPlayerDamaged.AddPersistentListener(TrackDamage, EventPriority.CLEANUP);

// Special case: conditional, only during boss fights
onPlayerDamaged.AddConditionalListener(
    ApplyBossModifier,
    () => isBossFight,
    EventPriority.CRITICAL
);
```

파이프라인은 등록 시점과 무관하게 이들이 올바른 순서로 실행되도록 보장한다: Conditional (CRITICAL) -> Priority (HIGH) -> Basic (FIFO) -> Persistent (CLEANUP) -> Triggers -> Chains.

![Monitor Listeners](/img/game-event-system/tools/runtime-monitor/monitor-listeners.png)

Runtime Monitor의 Listeners 탭은 각 이벤트에 대한 모든 활성 구독을 타입별로 보여준다. 리스너 구성이 올바른지 확인할 때 매우 유용하다.

## 람다 함정: 해결됨

C# 이벤트에서의 람다 문제를 기억하는가? GES도 같은 제약이 있다 — 델리게이트는 제거를 위해 참조 가능해야 한다. 하지만 패턴은 명확하다:

```csharp
// BROKEN: can't remove this
onDamage.AddListener((int amount) => health -= amount);

// CORRECT: method reference, always stable
onDamage.AddListener(HandleDamage);
private void HandleDamage(int amount) => health -= amount;

// ALSO CORRECT: cached delegate
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

메서드 참조가 가장 안전한 패턴이다. `HandleDamage`는 같은 인스턴스에서 항상 같은 델리게이트를 참조한다. 람다가 필요한 특별한 이유가 없다면 모든 리스너 구독에 이것을 사용하라.

## 실전 패턴: Priority 티어를 활용한 MVC

MVC에 깔끔하게 매핑되고 이벤트 시스템 자체로 이를 강제하는 패턴이다:

```csharp
public static class EventPriority
{
    public const int VALIDATION  = 200;  // Reject bad data
    public const int MODEL       = 100;  // Mutate state
    public const int CONTROLLER  = 50;   // React to state changes
    public const int VIEW        = 25;   // Update visuals
    public const int SIDE_EFFECT = 10;   // Audio, analytics
}
```

```csharp
// Model
onItemPurchased.AddPriorityListener(DeductCurrency, EventPriority.MODEL);
onItemPurchased.AddPriorityListener(AddToInventory, EventPriority.MODEL);

// Controller
onItemPurchased.AddPriorityListener(CheckForAchievements, EventPriority.CONTROLLER);
onItemPurchased.AddPriorityListener(TriggerTutorialHint, EventPriority.CONTROLLER);

// View
onItemPurchased.AddPriorityListener(RefreshShopUI, EventPriority.VIEW);
onItemPurchased.AddPriorityListener(PlayPurchaseAnimation, EventPriority.VIEW);

// Side effects
onItemPurchased.AddPriorityListener(PlayCashRegisterSound, EventPriority.SIDE_EFFECT);
onItemPurchased.AddPersistentListener(LogPurchaseAnalytics, EventPriority.SIDE_EFFECT);
```

데이터 검증이 먼저. 상태 변경이 두 번째. 게임 로직이 세 번째. UI는 항상 최종 상태를 본다. 부수 효과가 마지막. 이 순서는 파이프라인에 의해 강제되며, 스크립트가 올바른 순서로 초기화되기를 바라는 것이 아니다.

Model 리스너들은 priority 100을 공유하므로 해당 티어 내에서 FIFO 순서로 실행된다. 괜찮다 — `DeductCurrency`와 `AddToInventory`는 Controller 레이어가 반응하기 전에 둘 다 완료되어야 하는 독립적인 연산이다. 서로 간에 타이밍 의존성이 없다.

## 올바른 전략 선택하기

| 질문 | 답변 | 사용 |
|------|------|------|
| 실행 순서가 중요한가? | 아니오 | `AddListener` (Basic) |
| 실행 순서가 중요한가? | 예 | `AddPriorityListener` |
| 이 리스너가 때때로 건너뛰어야 하나? | 예 | `AddConditionalListener` |
| 이 리스너가 씬 로드를 넘어서 생존해야 하나? | 예 | `AddPersistentListener` |
| 필터링과 순서 지정이 동시에 필요한가? | 예 | `AddConditionalListener` + priority |
| 크로스씬이면서 순서도 필요한가? | 예 | `AddPersistentListener` + priority |

결정은 보통 컨텍스트에서 명확하다. 독립적인 시각적 반응? Basic. 데이터 먼저 뷰 나중에? Priority. 고빈도 필터링? Conditional. 세션 수명 서비스? Persistent.

대부분의 프로젝트에서 대부분의 이벤트는 혼합해서 사용한다. 6-레이어 파이프라인이 상호작용 효과를 생각할 필요 없이 모든 것이 잘 어울리도록 해준다. 실행 순서는 구조적이지, 우연적이지 않다.

다음에 UI에서 오래된 데이터를 보면, 리스너 priority를 확인하라. 수정은 보통 한 줄이면 된다.

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
