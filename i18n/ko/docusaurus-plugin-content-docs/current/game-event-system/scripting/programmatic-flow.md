---
sidebar_label: '프로그래밍 방식 플로우'
sidebar_position: 3
---

# 프로그래밍 방식 플로우

**비주얼 플로우 그래프**는 정적이고 디자인 타임 로직에 탁월하지만, 게임 개발에서는 종종 **런타임에 동적으로** 이벤트 관계를 구성해야 합니다.

**프로그래밍 방식 플로우 API**를 사용하면 C# 코드를 통해 트리거(Fan-out)와 체인(Sequences)을 완전히 구축할 수 있습니다. 이는 다음과 같은 경우에 필수적입니다:
*   **절차적 생성:** 런타임에 생성된 객체에 대한 이벤트 연결.
*   **동적 퀘스트:** 플레이어 선택에 기반한 로직 단계 생성.
*   **임시 상태 효과:** 만료되는 데미지 틱이나 버프 체인.

---

## ⚡ 핵심 개념: 트리거 vs. 체인

코딩하기 전에 내부 매니저(`GameEventTriggerManager`와 `GameEventChainManager`)가 처리하는 두 가지 플로우 타입의 차이점을 이해하는 것이 중요합니다.

| 기능                 | ⚡ 트리거 (Fan-Out)                    | 🔗 체인 (Sequence)                             |
| :------------------- | :------------------------------------- | :--------------------------------------------- |
| **실행 모드**        | **병렬** (Fire-and-Forget)             | **순차적** (Blocking)                          |
| **실패 처리**        | 독립적 (A가 실패해도 B는 여전히 실행) | 엄격함 (A가 실패하면 체인이 중지됨)            |
| **타이밍**           | 동기적 (`delay`가 사용되지 않는 한)    | 코루틴 기반 (`wait` 및 `duration` 지원)        |
| **순서**             | **우선순위**로 정렬됨                  | **추가 순서대로** 실행됨                       |
| **사용 사례**        | VFX, 업적, UI 업데이트                 | 컷씬, 튜토리얼, 턴 로직                        |

---

## 1. 트리거 (병렬 실행)

`AddTriggerEvent`를 사용하여 하나의 이벤트가 자동으로 다른 이벤트를 발동하도록 만듭니다. 등록된 모든 트리거는 소스 이벤트가 발동될 때 즉시(또는 각각의 개별 지연 후) 실행됩니다.

### 기본 사용법

`onPlayerDeath`가 발동되면 자동으로 `onPlayDeathSound`와 `onShowGameOverUI`를 발동합니다.
```csharp
[GameEventDropdown] public GameEvent onPlayerDeath;
[GameEventDropdown] public GameEvent onPlayDeathSound;
[GameEventDropdown] public GameEvent onShowGameOverUI;

void Awake()
{
    // 이것들은 사실상 동시에 발생합니다
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound);
    onPlayerDeath.AddTriggerEvent(onShowGameOverUI);
}
```

### 고급 구성 (우선순위 및 조건)

이벤트 자체를 수정하지 않고 연결에 로직을 주입할 수 있습니다.
```csharp
// 1. 높은 우선순위: 먼저 힐링
onPotionUsed.AddTriggerEvent(
    targetEvent: onRegenHealth,
    priority: 100 // 높은 숫자가 먼저 실행됨
);

// 2. 낮은 우선순위: 로직 시작 후 사운드 재생
onPotionUsed.AddTriggerEvent(
    targetEvent: onPlaySound,
    delay: 0.2f, // 선택적 지연
    priority: 10
);

// 3. 조건부: 그래픽 설정이 허용하는 경우에만 파티클 트리거
onPotionUsed.AddTriggerEvent(
    targetEvent: onParticleEffect,
    condition: () => GameSettings.EnableParticles
);
```

:::info 자동 인수 전달
기본적으로 (passArgument: true), 트리거는 소스에서 타겟으로 데이터를 전달하려고 시도합니다. 타입이 일치하면(예: int에서 int로) 자동으로 흐릅니다. 타입이 일치하지 않으면 **Transformer**가 필요합니다(아래 참조).
:::

------

## 2. 체인 (순차 실행)

`AddChainEvent`를 사용하여 단일 이벤트에 엄격하게 순서가 정해진 실행 목록을 구축합니다.

### 시퀀스 로직 (큐)

**동일한 소스 이벤트**에 여러 체인 노드를 추가하면 **큐**를 형성합니다. 시스템은 이전 노드의 `duration`이 완료될 때까지 기다린 후 다음 노드를 시작하여 하나씩 실행합니다.

이를 통해 B를 C에 직접 연결하지 않고도 소스 이벤트가 완전히 관리하는 복잡한 타임라인(A → 대기 → B → 대기 → C)을 조율할 수 있습니다.
```csharp
[GameEventDropdown] public GameEvent onTurnStart;
[GameEventDropdown] public GameEvent onDrawCard;
[GameEventDropdown] public GameEvent onRefreshMana;

void Awake()
{
    // --- "턴 시작" 타임라인 ---
    
    // 단계 1: 카드 뽑기
    // 'duration' 설정은: "이것을 실행한 다음, 목록의 다음 항목을 처리하기 전에 0.5초 대기"를 의미합니다.
    onTurnStart.AddChainEvent(onDrawCard, duration: 0.5f);
    
    // 단계 2: 마나 새로고침
    // 이것은 단계 1이 완료된 후(그리고 0.5초 지속 시간이 경과한 후) 자동으로 실행됩니다.
    onTurnStart.AddChainEvent(onRefreshMana);
    
    // 참고: 둘 다 'onTurnStart'에 연결합니다.
    // 단계 2를 'onDrawCard'에 연결하지 않습니다. 왜냐하면 
    // 주문에서 카드를 뽑는 것이 실수로 마나 새로고침을 트리거하는 것을 원하지 않기 때문입니다.
}
```

### 비동기 대기 (waitForCompletion)

이벤트 리스너가 코루틴이나 비동기 작업을 시작하는 경우, 체인이 이를 기다리도록 강제할 수 있습니다.
```csharp
// 체인은 'onPlayCutscene'의 모든 리스너가 
// 작업을 완료할 때까지 여기서 일시 중지됩니다(yield return null).
onLevelEnd.AddChainEvent(onPlayCutscene, waitForCompletion: true);

// 이것은 컷씬이 완전히 처리된 후에만 실행됩니다
onLevelEnd.AddChainEvent(onLoadNextLevel);
```

:::warning 체인 중단
조건이 false를 반환하거나 체인 노드에서 예외가 발생하면 **전체 후속 체인이 중단됩니다**. 이는 조건부 로직에 유용합니다(예: "적이 막으면 콤보 공격 중지").
:::

------

## 🔄 데이터 플로우 및 Transformer

프로그래밍 방식 플로우의 가장 강력한 기능은 **인수 변환**입니다. 이를 통해 호환되지 않는 타입의 이벤트를 연결하거나 복잡한 객체에서 특정 데이터를 추출할 수 있습니다.

### 1. 복잡한 것에서 Void로 (필터)

특정 데이터에만 기반하여 일반 이벤트를 트리거합니다.
```csharp
// 소스: 데미지 이벤트 (float amount)
// 타겟: 크리티컬 히트 이벤트 (Void)
onDamageTaken.AddTriggerEvent(
    targetEvent: onCriticalHitEffect,
    condition: (amount) => amount > 50f, // 데미지 > 50인 경우에만
    passArgument: false // 타겟이 void이므로 float를 전달하지 않음
);
```

### 2. 간단한 변환 (타입 캐스팅)

복잡한 객체 이벤트를 단순한 원시 타입 이벤트로 매핑합니다.

- **소스:** `GameEvent<Enemy> (OnEnemyKilled)`
- **타겟:** `GameEvent<int> (OnAddXP)`
```csharp
[GameEventDropdown] public GameEvent<Enemy> onEnemyKilled;
[GameEventDropdown] public GameEvent<int> onAddXP;

void Awake()
{
    // Enemy 객체에서 'xpValue'를 추출하여 int 이벤트로 전달합니다
    onEnemyKilled.AddTriggerEvent(
        targetEvent: onAddXP,
        passArgument: true,
        argumentTransformer: (enemy) => enemy.xpValue 
    );
}
```

### 3. Sender 및 Argument 변환

`GameEvent<TSender, TArgs>`의 경우, transformer는 두 매개변수를 모두 받습니다.
```csharp
// 소스: 플레이어가 아이템 획득 (Sender: Player, Args: ItemData)
// 타겟: 알림 (string)
onItemPickup.AddTriggerEvent(
    targetEvent: onShowNotification,
    passArgument: true,
    argumentTransformer: (player, item) => $"{player.Name}이(가) {item.Rarity} 아이템을 발견했습니다!"
);
```

------

## 🧹 생명주기 관리

표준 리스너(AddListener)와 달리 동적 트리거와 체인은 **Handle**을 반환합니다. 특히 객체를 풀링할 때 메모리 누수나 원치 않는 로직 지속을 방지하기 위해 이러한 핸들을 관리해야 합니다.

### Handle 사용
```csharp
private TriggerHandle _triggerHandle;

void OnEnable()
{
    // 핸들 저장
    _triggerHandle = onDoorOpen.AddTriggerEvent(onLightOn);
}

void OnDisable()
{
    // 핸들을 사용하여 이 특정 링크만 제거
    if (_triggerHandle != null)
    {
        onDoorOpen.RemoveTriggerEvent(_triggerHandle);
        _triggerHandle = null;
    }
}
```

### 대량 정리

객체가 파괴되거나 풀에 반환되는 경우, 이벤트와 관련된 모든 동적 로직을 지울 수 있습니다.
```csharp
void OnDestroy()
{
    // 이 이벤트를 타겟으로 하는 모든 동적 트리거를 제거합니다
    myEvent.RemoveAllTriggerEvents();
    
    // 이 이벤트를 타겟으로 하는 모든 동적 체인을 제거합니다
    myEvent.RemoveAllChainEvents();
}
```

## 📜 API 요약

| 메서드 시그니처                                              | 반환            | 설명                                 |
| ------------------------------------------------------------ | --------------- | ------------------------------------ |
| **트리거 등록**                                              |                 | *병렬 / Fire-and-Forget*             |
| `AddTriggerEvent(GameEventBase target, float delay, Func<bool> condition, int priority)` | `TriggerHandle` | Void 이벤트에 트리거를 추가합니다.   |
| `AddTriggerEvent(GameEventBase target, float delay, Func<T, bool> condition, bool passArg, Func<T, object> transformer, int priority)` | `TriggerHandle` | 타입 이벤트에 트리거를 추가합니다.   |
| `AddTriggerEvent(GameEventBase target, float delay, Func<TSender, TArgs, bool> condition, bool passArg, Func<TSender, TArgs, object> transformer, int priority)` | `TriggerHandle` | Sender 이벤트에 트리거를 추가합니다. |
| **체인 등록**                                                |                 | *순차적 / Blocking*                  |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<bool> condition, bool wait)` | `ChainHandle`   | Void 이벤트에 체인 단계를 추가합니다.|
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<T, bool> condition, bool passArg, Func<T, object> transformer, bool wait)` | `ChainHandle`   | 타입 이벤트에 체인 단계를 추가합니다.|
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<TSender, TArgs, bool> condition, bool passArg, Func<TSender, TArgs, object> transformer, bool wait)` | `ChainHandle`   | Sender 이벤트에 체인 단계를 추가합니다.|
| **정리**                                                     |                 | *제거*                               |
| `RemoveTriggerEvent(TriggerHandle handle)`                   | `void`          | 특정 트리거 노드를 제거합니다.       |
| `RemoveChainEvent(ChainHandle handle)`                       | `void`          | 특정 체인 노드를 제거합니다.         |
| `RemoveAllTriggerEvents()`                                   | `void`          | 모든 동적 트리거를 지웁니다.         |
| `RemoveAllChainEvents()`                                     | `void`          | 모든 동적 체인을 지웁니다.           |