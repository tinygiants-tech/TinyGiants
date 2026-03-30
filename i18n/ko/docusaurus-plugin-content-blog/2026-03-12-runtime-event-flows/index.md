---
slug: programmatic-flow-api
title: '런타임 이벤트 플로우 구축: 비주얼 에디터로는 부족할 때'
authors: [tinygiants]
tags: [ges, unity, scripting, flow-graph, advanced]
description: "절차적 던전, 동적 AI, 모드 지원 — 일부 이벤트 플로우는 에디트 타임에 설계할 수 없습니다. 코드만으로 이벤트 그래프를 구축하고, 혼합하고, 해체하는 방법을 알아봅니다."
image: /img/home-page/game-event-system-preview.png
---

절차적 던전 생성기가 방금 압력판 세 개와 가시 함정이 있는 방을 만들었다. 다음 방에는 잠긴 문에 연결된 레버 퍼즐이 있다. 그다음 방은 보스의 체력 페이즈에 따라 환경 위험이 활성화되는 보스 아레나다. 이런 이벤트 관계들은 에디트 타임에 존재하지 않았다. 던전 레이아웃은 플레이어가 30초 전에 입력한 시드에 의해 결정됐다.

이벤트를 어떻게 연결할 것인가?

전통적인 방식으로는 거대한 switch 문을 작성한다. 각 방 타입마다 이벤트 핸들러를 수동으로 구독하고 해제한다. 각 AI 난이도마다 다른 공격 패턴을 수동으로 체인한다. 각 모드 제작 콘텐츠마다 설정 파일을 수동으로 파싱해서 이벤트 연결로 번역한다. "수동"이 문제다 — 런타임에 토폴로지가 변할 때마다 이벤트 와이어링 로직을 재구현하고 있는 것이다.

비주얼 노드 에디터는 디자인 타임에 알려진 플로우에는 환상적이다. 하지만 게임이 실행될 때까지 존재하지 않는 플로우는 근본적으로 처리할 수 없다. 그리고 점점 더, 가장 흥미로운 게임 시스템들이 바로 이벤트 그래프가 동적인 시스템들이다.

<!-- truncate -->

## 절차적 콘텐츠 문제

구체적으로 살펴보자. 로그라이크를 만들고 있다. 매 런마다 방 템플릿 풀에서 15-25개의 방을 생성한다. 각 템플릿은 방에 있는 상호작용 오브젝트를 정의한다 — 압력판, 레버, 문, 함정, 보물 상자, 적 스포너. 하지만 이 오브젝트들 간의 *연결*은 생성기가 만들어내는 특정 레이아웃에 의존한다.

방 템플릿 A에는 압력판과 가시 함정이 있다. 한 런에서는 압력판이 1초 딜레이로 가시를 발동시킨다. 다른 런에서는 (다른 난이도) 같은 템플릿이 딜레이 없이 즉시 가시를 발동시키되 0.5초 전에 경고음을 추가한다. 템플릿은 같다; 이벤트 와이어링이 다르다.

팀들은 보통 이걸 어떻게 처리할까?

### If-Else 접근법

```csharp
public void WireRoom(Room room, DifficultySettings difficulty)
{
    if (room.HasPressurePlate && room.HasSpikeTrap)
    {
        if (difficulty.level == Difficulty.Easy)
        {
            room.pressurePlate.onActivated += () =>
            {
                PlayWarningSound();
                StartCoroutine(DelayedSpikes(room.spikeTrap, 1.5f));
            };
        }
        else if (difficulty.level == Difficulty.Hard)
        {
            room.pressurePlate.onActivated += () =>
            {
                room.spikeTrap.Activate();
            };
        }
    }

    if (room.HasLever && room.HasDoor)
    {
        room.lever.onPulled += () => room.door.Open();

        if (difficulty.level == Difficulty.Hard)
        {
            room.lever.onPulled += () =>
            {
                StartCoroutine(ResetLever(room.lever, 5f));
            };
        }
    }

    // ... 200 more lines for other combinations
}
```

작은 게임에서는 동작한다. 30개의 방 템플릿과 4개의 난이도 레벨이 있는 로그라이크라면, 수백 줄의 조건부 와이어링 코드를 보게 된다. 새로운 방 템플릿을 추가하면 이 메서드를 업데이트해야 한다. 새로운 상호작용 오브젝트 타입을 추가하면 또 업데이트해야 한다. 그리고 람다 구독? 방이 파괴될 때 깔끔하게 해제할 수 없다. 메모리 누수가 설계에 내장되어 있다.

### 데이터 기반 접근법 (더 낫지만, 여전히 고통스러운)

일부 팀은 데이터 기반 모델로 전환한다 — 연결을 정의하는 JSON이나 ScriptableObject 설정:

```json
{
    "room_type": "trap_room",
    "connections": [
        {
            "source": "pressure_plate",
            "target": "spike_trap",
            "delay": 1.0,
            "condition": "player_in_range"
        }
    ]
}
```

아키텍처적으로는 더 깔끔하지만, 이제 커스텀 파서, 커스텀 연결 관리자, 커스텀 조건 평가, 커스텀 라이프사이클 관리가 필요하다. 이벤트 시스템 위에 미니 이벤트 시스템을 만들고 있는 것이다. 그리고 게임의 정적 부분에 사용하는 비주얼 에디터와도 통합되지 않는다.

### 이상적인 모습

실제로 원하는 것은 비주얼 이벤트 에디터와 같은 기능 — 트리거, 체인, 조건, 딜레이, 인자 전달 — 을 코드에서 접근할 수 있는 것이다. 프로그래밍 방식으로 플로우를 구축하고, 비주얼 플로우와 혼합하고, 끝나면 해체한다. 같은 파이프라인, 같은 실행 보장, 다른 인터페이스.

## AI 행동 문제

절차적 레벨만 유스 케이스가 아니다. AI 행동은 근본적으로 동적이다.

이지 모드 적: 2초간 공격 텔레그래프, 타격, 3초 대기, 반복. 이벤트 체인은 단순하고 예측 가능하다.

하드 모드 적: 0.5초 텔레그래프, 공격이 콤보로 연결되고, 콤보 피니셔가 환경 위험을 트리거하며, 정확한 콤보 시퀀스는 플레이어의 위치와 남은 체력에 따라 달라진다. 이벤트 체인은 복잡하고 조우마다 다르다.

보스전은 더 심하다. 페이즈 1: 단순한 공격 패턴. 페이즈 2: 새로운 공격 해금, 기존 패턴 가속. 페이즈 3: 광역 위험으로 연결되는 필사적 기술. 각 페이즈 전환이 전체 공격 이벤트 그래프를 재구성한다.

각 페이즈를 별도 메서드에 하드코딩할 수도 있지만, 이벤트 간의 연결 — "공격이 명중하면, 0.2초 후 화면 흔들림 트리거, 체력 30% 미만이면 1초 후 광역 데미지 트리거" — 은 이벤트 플로우 시스템이 처리해야 하는 정확히 그런 종류의 것이다. 문제는 플로우 토폴로지가 런타임에 변한다는 것이다.

## 모드 지원 문제

이건 점점 더 중요해지고 있다. 게임이 모드를 지원한다면, 플레이어는 커스텀 콘텐츠에 대한 이벤트 관계를 정의해야 한다. 모더가 새로운 함정 타입을 만든다. 기존 게임 이벤트에 연결해야 한다 — "플레이어가 트리거 존에 들어오면, 커스텀 애니메이션 재생, 애니메이션 완료 후 데미지 적용" 같은 것.

비주얼 에디터를 사용할 수 없다 (개발 도구이지 플레이어 도구가 아니다). 같은 기능을 제공하는 코드나 설정 인터페이스가 필요하다. 이벤트 시스템의 기능이 GUI 뒤에 잠겨 있으면, 모더는 잠겨 있는 것이다.

## GES의 프로그래밍 방식 Flow API

GES 비주얼 Node Editor에서 사용할 수 있는 모든 기능에는 대응하는 코드 API가 있다. 완전한 1:1 대응. 비주얼 에디터는 직접 호출할 수 있는 같은 메서드들의 GUI 래퍼다. 비주얼 에디터에서 배운 것이 그대로 코드로 번역되고, 그 반대도 마찬가지다.

### 트리거 구축: 병렬 팬아웃

트리거 이벤트란: Event A가 발생하면, Event B도 (동시에) 발생한다. 전체 API는 다음과 같다:

```csharp
[GameEventDropdown, SerializeField] private SingleGameEvent onDoorOpened;
[GameEventDropdown, SerializeField] private SingleGameEvent onLightsOn;
[GameEventDropdown, SerializeField] private SingleGameEvent onAlarmDisabled;

private void SetupRoom()
{
    // When door opens, lights and alarm react simultaneously
    TriggerHandle h1 = onDoorOpened.AddTriggerEvent(targetEvent: onLightsOn);
    TriggerHandle h2 = onDoorOpened.AddTriggerEvent(targetEvent: onAlarmDisabled);
}
```

전체 시그니처는 비주얼 에디터의 모든 옵션을 제공한다:

```csharp
TriggerHandle handle = sourceEvent.AddTriggerEvent(
    targetEvent: targetEvent,
    delay: 0f,                          // seconds before target fires
    condition: () => isNightTime,       // predicate gate
    passArgument: true,                 // forward source args to target
    argumentTransformer: null,          // transform args between types
    priority: 0                         // ordering among triggers
);
```

**delay** — 소스가 발동한 후 타겟이 발동하기까지 대기하는 시간. 0이면 같은 프레임.

```csharp
// Door opens, lights flicker on 0.5s later
onDoorOpened.AddTriggerEvent(
    targetEvent: onLightsOn,
    delay: 0.5f
);
```

**condition** — 설정 시가 아닌 Raise 시에 평가되는 조건. 무조건이면 null을 전달.

```csharp
// Only trigger lights if it's nighttime
onDoorOpened.AddTriggerEvent(
    targetEvent: onLightsOn,
    condition: () => TimeOfDayManager.IsNight
);
```

**passArgument** — 소스 이벤트의 데이터를 타겟에 전달. 타입 호환성이 중요하다.

```csharp
// Source raises with damage amount, target receives the same
onPlayerHit.AddTriggerEvent(
    targetEvent: onDamageNumberSpawn,
    passArgument: true
);
```

**argumentTransformer** — 소스와 타겟의 타입이 다르거나 값을 변환해야 할 때.

```csharp
// Source sends int damage, target expects float for UI scaling
onPlayerHit.AddTriggerEvent(
    targetEvent: onDamageScale,
    passArgument: true,
    argumentTransformer: (object arg) => (float)(int)arg / 100f
);
```

반환된 `TriggerHandle`은 나중에 정리할 때 사용하는 참조다:

```csharp
// Store the handle
TriggerHandle handle = sourceEvent.AddTriggerEvent(targetEvent: targetEvent);

// Later: remove this specific connection
sourceEvent.RemoveTriggerEvent(handle);
```

![Trigger Flow Graph](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

### 체인 구축: 순차적 블로킹 실행

체인 이벤트란: Event A가 발동하고, 딜레이 후 Event B가 발동하며, Event B의 리스너가 완료된 후 Event C가 발동한다. 순차적이고 순서가 있으며 타이밍 제어가 가능하다.

```csharp
ChainHandle handle = sourceEvent.AddChainEvent(
    targetEvent: targetEvent,
    delay: 1f,                    // gap before this step fires
    duration: 2f,                 // how long this step is "active"
    condition: null,              // predicate gate
    passArgument: true,           // forward args
    argumentTransformer: null,    // transform args
    waitForCompletion: false      // block until listeners finish?
);
```

체인 전용 파라미터:

**delay** — 소스 발동과 이 체인 단계 실행 사이의 간격.

**duration** — 이 단계가 "활성"으로 간주되는 시간. 여러 체인이 시퀀스로 연결될 때 전체 플로우 타이밍에 영향을 준다.

**waitForCompletion** — true일 때, 체인 시스템은 타겟 이벤트의 모든 리스너가 완료될 때까지 대기한 후 후속 단계로 진행한다. 이것이 "블로킹" 부분이다.

```csharp
// Boss sequence: play animation (wait for it), then spawn enemies
onBossPhaseStart.AddChainEvent(
    targetEvent: onPlayBossAnimation,
    delay: 0f,
    duration: 3f,
    waitForCompletion: true
);

onPlayBossAnimation.AddChainEvent(
    targetEvent: onSpawnAdds,
    delay: 0.5f,
    duration: 0f,
    waitForCompletion: false
);
```

![Chain Flow Graph](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

### 비주얼과 프로그래밍 방식 플로우의 혼합

여기서 아키텍처가 진정한 가치를 발휘한다. 기본 플로우 그래프는 비주얼하게 설계한다 — 디자인 타임에 알려진 정적 연결들. 그 위에 런타임에서 동적 연결을 레이어링한다. 모두 같은 파이프라인을 통해 실행된다.

```csharp
public class DifficultyFlowManager : MonoBehaviour
{
    [Header("Base Events (connected visually in editor)")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemySpawned;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemyAttackWindup;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemyAttackStrike;

    [Header("Hard Mode Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onComboFollowUp;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnvironmentHazard;

    private List<TriggerHandle> _hardModeHandles = new List<TriggerHandle>();

    public void EnableHardMode()
    {
        _hardModeHandles.Add(onEnemyAttackStrike.AddTriggerEvent(
            targetEvent: onComboFollowUp,
            delay: 0.3f,
            condition: () => Random.value > 0.5f
        ));

        _hardModeHandles.Add(onComboFollowUp.AddTriggerEvent(
            targetEvent: onEnvironmentHazard,
            delay: 0.1f
        ));
    }

    public void DisableHardMode()
    {
        foreach (var handle in _hardModeHandles)
            handle.Source.RemoveTriggerEvent(handle);
        _hardModeHandles.Clear();
    }
}
```

비주얼 에디터 연결은 항상 존재한다 — 에셋에 구워져 있다. 프로그래밍 방식의 연결은 그 위에 레이어링되며 비주얼 그래프에 영향을 주지 않고 추가하거나 제거할 수 있다. "설계된 동작"과 "동적 동작"이 깔끔하게 분리된다.

## 핸들 기반 클린업 패턴

복잡한 동적 플로우를 구축하면 핸들이 쌓인다. 깔끔하게 관리하는 것이 누수된 연결을 방지하는 데 필수적이다. 프로덕션에서 검증된 패턴들이다.

### 패턴 1: List 컬렉션

하나의 단위로 추가/제거되는 연결 세트:

```csharp
private List<TriggerHandle> _triggerHandles = new List<TriggerHandle>();
private List<ChainHandle> _chainHandles = new List<ChainHandle>();

private void BuildFlow()
{
    _triggerHandles.Add(eventA.AddTriggerEvent(targetEvent: eventB));
    _triggerHandles.Add(eventA.AddTriggerEvent(targetEvent: eventC));
    _chainHandles.Add(eventB.AddChainEvent(targetEvent: eventD, delay: 1f));
}

private void TearDownFlow()
{
    foreach (var h in _triggerHandles)
        h.Source.RemoveTriggerEvent(h);
    foreach (var h in _chainHandles)
        h.Source.RemoveChainEvent(h);

    _triggerHandles.Clear();
    _chainHandles.Clear();
}
```

### 패턴 2: Flow Context 오브젝트

구조화된 라이프사이클 관리가 필요한 복잡한 플로우:

```csharp
public class EventFlowContext : System.IDisposable
{
    private List<TriggerHandle> _triggers = new List<TriggerHandle>();
    private List<ChainHandle> _chains = new List<ChainHandle>();

    public void AddTrigger(TriggerHandle handle) => _triggers.Add(handle);
    public void AddChain(ChainHandle handle) => _chains.Add(handle);

    public void Dispose()
    {
        foreach (var h in _triggers)
            h.Source.RemoveTriggerEvent(h);
        foreach (var h in _chains)
            h.Source.RemoveChainEvent(h);
        _triggers.Clear();
        _chains.Clear();
    }
}
```

```csharp
private EventFlowContext _currentPhaseFlow;

private void SetupBossPhase(int phase)
{
    _currentPhaseFlow?.Dispose();
    _currentPhaseFlow = new EventFlowContext();

    switch (phase)
    {
        case 1:
            _currentPhaseFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onShieldPulse, delay: 0.5f));
            break;
        case 2:
            _currentPhaseFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onRageSwipe,
                condition: () => bossHealth < 0.5f));
            _currentPhaseFlow.AddChain(onRageSwipe.AddChainEvent(
                targetEvent: onSummonAdds, delay: 2f));
            break;
        case 3:
            _currentPhaseFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onDesperationBlast));
            _currentPhaseFlow.AddTrigger(onDesperationBlast.AddTriggerEvent(
                targetEvent: onScreenFlash));
            _currentPhaseFlow.AddChain(onDesperationBlast.AddChainEvent(
                targetEvent: onAreaDamage, delay: 1f, waitForCompletion: true));
            break;
    }
}

private void OnDestroy()
{
    _currentPhaseFlow?.Dispose();
}
```

각 보스 페이즈 전환이 이전 플로우를 Dispose하고 새 것을 구축한다. 누수된 연결 없음. 페이즈 3 동안 페이즈 1의 오래된 이벤트 와이어링이 남아있는 일 없음.

## 완전한 예제: 절차적 던전 이벤트 와이어링

처음에 언급한 로그라이크 던전 시스템을 구축해 보자. 각 방 타입은 완전히 런타임에 결정되는 자체 이벤트 와이어링을 갖는다.

```csharp
public class DungeonRoom
{
    public RoomType Type;
    public SingleGameEvent OnPlayerEntered;
    public SingleGameEvent OnPlayerExited;
    public SingleGameEvent OnRoomCleared;
    public Int32GameEvent OnDamageInRoom;
    public List<SingleGameEvent> RoomSpecificEvents;
}

public class DungeonEventWiring : MonoBehaviour
{
    [Header("Shared Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onDungeonStarted;
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayerDied;
    [GameEventDropdown, SerializeField] private Int32GameEvent onPlayerDamaged;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBossDefeated;

    [Header("Effect Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayTrapSound;
    [GameEventDropdown, SerializeField] private SingleGameEvent onSpawnTreasureParticles;
    [GameEventDropdown, SerializeField] private SingleGameEvent onStartBossMusic;
    [GameEventDropdown, SerializeField] private SingleGameEvent onStopBossMusic;
    [GameEventDropdown, SerializeField] private SingleGameEvent onScreenShake;

    private Dictionary<DungeonRoom, EventFlowContext> _roomFlows
        = new Dictionary<DungeonRoom, EventFlowContext>();

    public void WireRoom(DungeonRoom room)
    {
        var flow = new EventFlowContext();

        switch (room.Type)
        {
            case RoomType.Trap:
                WireTrapRoom(room, flow);
                break;
            case RoomType.Treasure:
                WireTreasureRoom(room, flow);
                break;
            case RoomType.Boss:
                WireBossRoom(room, flow);
                break;
            case RoomType.Safe:
                break;
        }

        _roomFlows[room] = flow;
    }

    private void WireTrapRoom(DungeonRoom room, EventFlowContext flow)
    {
        // Player enters -> traps fire after 1 second (if room not cleared)
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: room.OnDamageInRoom,
            delay: 1f,
            condition: () => !room.OnRoomCleared.HasFired()
        ));

        // Room damage -> screen shake + trap sound
        flow.AddTrigger(room.OnDamageInRoom.AddTriggerEvent(
            targetEvent: onScreenShake
        ));
        flow.AddTrigger(room.OnDamageInRoom.AddTriggerEvent(
            targetEvent: onPlayTrapSound,
            delay: 0.1f
        ));

        // Forward room damage to player damage system
        flow.AddTrigger(room.OnDamageInRoom.AddTriggerEvent(
            targetEvent: onPlayerDamaged,
            passArgument: true
        ));
    }

    private void WireTreasureRoom(DungeonRoom room, EventFlowContext flow)
    {
        // Player enters -> sparkle particles
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: onSpawnTreasureParticles
        ));

        // Chain: enter -> wait 2s -> room cleared
        flow.AddChain(room.OnPlayerEntered.AddChainEvent(
            targetEvent: room.OnRoomCleared,
            delay: 2f
        ));
    }

    private void WireBossRoom(DungeonRoom room, EventFlowContext flow)
    {
        // Enter -> boss music
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: onStartBossMusic
        ));

        // Boss defeated -> chain: stop music -> shake -> room cleared
        flow.AddChain(onBossDefeated.AddChainEvent(
            targetEvent: onStopBossMusic,
            delay: 0.5f,
            waitForCompletion: true
        ));
        flow.AddChain(onStopBossMusic.AddChainEvent(
            targetEvent: onScreenShake,
            delay: 0.2f
        ));
        flow.AddChain(onScreenShake.AddChainEvent(
            targetEvent: room.OnRoomCleared,
            delay: 1f
        ));

        // Safety net: exiting boss room stops music
        flow.AddTrigger(room.OnPlayerExited.AddTriggerEvent(
            targetEvent: onStopBossMusic
        ));
    }

    public void UnwireRoom(DungeonRoom room)
    {
        if (_roomFlows.TryGetValue(room, out var flow))
        {
            flow.Dispose();
            _roomFlows.Remove(room);
        }
    }

    public void UnwireAllRooms()
    {
        foreach (var flow in _roomFlows.Values)
            flow.Dispose();
        _roomFlows.Clear();
    }

    private void OnDestroy()
    {
        UnwireAllRooms();
    }
}
```

![Monitor Automation Tree](/img/game-event-system/tools/runtime-monitor/monitor-automation-tree.png)

이것이 무엇을 제공하는지 보라. 절차적 생성기가 방을 만들고 `WireRoom()`을 호출한다. 각 방은 필요한 이벤트 연결을 정확히 받는다. 방이 언로드되거나 런이 종료되면, `UnwireRoom()`이나 `UnwireAllRooms()`가 모든 것을 정리한다. 누수된 델리게이트 없음, 고아가 된 연결 없음, 어디에 어떤 람다가 구독됐는지 수동 추적 없음.

그리고 방 전용 이벤트(`OnPlayerEntered`, `OnDamageInRoom`)가 전역 공유 이벤트(`onPlayerDamaged`, `onScreenShake`)와 공존한다. 로컬 스코프와 글로벌 스코프가 동적으로 연결되고, 같은 핸들 기반 클린업 패턴으로 관리된다.

## 조건을 가볍게 유지하라

동적 플로우를 조건과 함께 구축할 때 중요한 주의사항 하나. 조건 predicate는 설정 시가 아니라 소스 이벤트가 발동할 때마다 실행된다. 고빈도 이벤트에서는 predicate의 비용이 중요하다.

```csharp
// GOOD: simple field comparison, near-zero cost
condition: () => isAlive && currentPhase == BossPhase.Rage

// BAD: allocation inside predicate, runs every event firing
condition: () => GetAllEnemies().Where(e => e.IsAlive).Count() > 5

// BETTER: cache the result, check the cache
condition: () => aliveEnemyCount > 5
```

절차적 던전 와이어링에서는 이것이 거의 문제되지 않는다 — 방 이벤트가 초당 60회 발동하지는 않으니까. 하지만 물리나 이동 이벤트에 대한 동적 플로우를 구축한다면, predicate를 단순한 필드 읽기로 유지하라.

## 비주얼 vs 프로그래밍 방식: 언제 무엇을

**비주얼 에디터** 사용 시:
- 디자인 타임에 플로우가 알려져 있을 때
- 디자이너가 읽고 수정해야 할 때
- 리컴파일 없이 빠른 이터레이션이 필요할 때
- 빌드 간 연결이 안정적일 때

**프로그래밍 방식 API** 사용 시:
- 플로우가 런타임 상태에 의존할 때
- 절차적 생성이 그래프를 결정할 때
- AI 시스템이 동적으로 동작을 구성할 때
- 다른 코드 시스템과 긴밀한 통합이 필요할 때
- 플로우가 일시적일 때 — 게임플레이 중에 생성되고 파괴되는

**둘 다 혼합** 시:
- 안정적인 기반(비주얼)에 동적 확장(코드)이 있을 때
- 일부 연결은 디자이너용, 나머지는 프로그래머용일 때
- 정적 부분은 비주얼 명확성, 동적 부분은 코드 유연성이 필요할 때

프로그래밍 방식 API는 비주얼 에디터의 대체가 아니다. 같은 시스템의 나머지 반쪽이다. 함께하면, "디자이너가 에디터에서 와이어를 드래그"하는 것부터 "AI 디렉터가 플레이어 스킬 분석을 기반으로 런타임에 전체 공격 그래프를 재구성"하는 것까지 전체 스펙트럼을 커버한다.

같은 파이프라인. 같은 실행 보장. 같은 핸들 기반 라이프사이클. 그래프를 구축하는 방법만 다를 뿐이다.

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
