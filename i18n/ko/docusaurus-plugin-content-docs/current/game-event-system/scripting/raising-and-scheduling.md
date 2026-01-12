---
sidebar_label: '발동 및 스케줄링'
sidebar_position: 1
---

# 발동 및 스케줄링

Game Event System의 핵심은 신호를 전송하는 것입니다. Inspector가 시각적 바인딩을 처리하는 반면, **Runtime API**는 프로그래머에게 이러한 신호가 *언제* 그리고 *어떻게* 발동되는지에 대한 정밀한 제어를 제공합니다.

이 가이드에서는 즉시 실행, 시간 기반 스케줄링 및 대기 중인 이벤트의 취소에 대해 다룹니다.

---

## 🚀 즉시 실행 (`Raise`)

`Raise()` 메서드는 이벤트를 발동하는 표준 방법입니다. 현재 프레임에서 모든 리스너(Inspector, Code, Flow Graph)를 동기적으로 실행합니다.

### 1. Void 이벤트
인수가 없는 이벤트입니다.
```csharp
[GameEventDropdown] public GameEvent onPlayerJump;

void Update()
{
    if (Input.GetButtonDown("Jump"))
    {
        // 즉시 발동
        onPlayerJump.Raise();
    }
}
```

### 2. 단일 인수 이벤트

특정 데이터 페이로드(T)를 전달하는 이벤트입니다.
```csharp
[GameEventDropdown] public SingleGameEvent onHealthChanged;

public void TakeDamage(float damage)
{
    currentHealth -= damage;
    
    // 타입 안전 호출
    onHealthChanged.Raise(currentHealth);
}
```

### 3. Sender + Argument 이벤트

이벤트의 **출처**(TSender)를 검증하고 데이터(TArgs)를 전달하는 이벤트입니다.
```csharp
// 타입 정의: Sender는 GameObject, Arg는 DamageInfo
[GameEventDropdown] public GameObjectDamageInfoGameEvent onActorDamaged;

public void Hit()
{
    var info = new DamageInfo { amount = 50, type = DamageType.Fire };
    
    // 'this.gameObject'를 sender로 전달
    onActorDamaged.Raise(this.gameObject, info);
}
```

:::warning 자동 스케줄링 로직
특정 이벤트 에셋의 Inspector에서 **Action Delay** 또는 **Repeat** 설정을 구성한 경우, Raise() 호출 시 자동으로 해당 설정이 적용됩니다(예: 실제 발동 전 2초 대기).
아래의 [Inspector 통합](#-inspector-통합)을 참조하세요.
:::

------

## ⏱️ 지연 실행 (RaiseDelayed)

때로는 코루틴을 사용하지 않고 미래의 특정 시점에 이벤트를 예약하고 싶을 수 있습니다. 시스템은 내장 스케줄러를 제공합니다.

모든 스케줄링 메서드는 `ScheduleHandle`을 반환하며, 이벤트가 발동되기 전에 취소해야 하는 경우 이것이 중요합니다.
```csharp
[GameEventDropdown] public GameEvent onBombExplode;

public void PlantBomb()
{
    Debug.Log("폭탄 설치됨...");
    
    // 5.0초 후 이벤트 발동
    ScheduleHandle handle = onBombExplode.RaiseDelayed(5.0f);
}
```

### 지연과 함께 인수 전달

API는 지연 호출에 대한 제네릭을 완벽하게 지원합니다.
```csharp
// 1.5초 대기 후 float 값 '100f' 전송
onScoreAdded.RaiseDelayed(100f, 1.5f);

// 0.5초 대기 후 Sender와 Args 전달
onItemPickup.RaiseDelayed(this, itemData, 0.5f);
```

------

## 🔄 반복 실행 (RaiseRepeating)

이것을 사용하여 이벤트 시스템 내에서 완전히 루프, 타이머 또는 폴링 메커니즘을 생성할 수 있습니다.

| 매개변수    | 설명                                      |
| ----------- | ----------------------------------------- |
| interval    | 각 발동 사이의 시간(초).                  |
| repeatCount | 몇 번 발동할 것인가? **무한**은 -1로 설정. |

### 예시: 중독 효과

1초마다 플레이어에게 5회 동안 데미지를 줍니다.
```csharp
[GameEventDropdown] public Int32GameEvent onTakeDamage;

private void ApplyPoison()
{
    // 즉시 발동(선택 사항) 후 1초마다 5회 반복
    // 참고: RaiseRepeating은 기본적으로 첫 번째 발동 전에 interval을 대기합니다
    onTakeDamage.RaiseRepeating(10, interval: 1.0f, repeatCount: 5);
}
```

### 예시: 레이더 스캔 (무한)

2초마다 영구적으로 레이더 이벤트를 발동합니다.
```csharp
private ScheduleHandle _radarHandle;

void Start()
{
    // -1은 취소될 때까지 영원히 실행됨을 의미
    _radarHandle = onRadarPing.RaiseRepeating(2.0f, repeatCount: -1);
}
```

------

## 🔔 모니터링 및 생명주기 콜백

`ScheduleHandle`은 단순히 취소를 위한 것이 아닙니다. 예약된 작업의 상태를 모니터링할 수 있는 세 가지 내장 콜백을 제공하며, 이는 UI 진행 표시줄 업데이트, 후속 로직 트리거 또는 리소스 정리에 필수적입니다.
```csharp
[GameEventDropdown] public GameEvent onStatusUpdate;

private void StartTrackedLoop()
{
    // 1초마다 5회 반복하는 작업 시작
    ScheduleHandle handle = onStatusUpdate.RaiseRepeating(interval: 1.0f, repeatCount: 5);

    // 1. 각 틱(Step)마다 트리거됨
    handle.OnStep += (remainingCount) => 
    {
        Debug.Log($"[Schedule] 실행 단계! 남은 사이클: {remainingCount}");
    };

    // 2. 작업이 자연스럽게 완료될 때 트리거됨
    handle.OnCompleted += () => 
    {
        Debug.Log("[Schedule] 작업이 성공적으로 완료되었습니다.");
    };

    // 3. 작업이 코드를 통해 수동으로 중지될 때 트리거됨
    handle.OnCancelled += () => 
    {
        Debug.Log("[Schedule] 작업이 사용자에 의해 취소되었습니다.");
    };
}
```

### 콜백 정의

| 콜백            | 호출 시점                                                    | 일반적인 사용 사례                                   |
| --------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| **OnStep**      | 각 이벤트 실행 직후에 발동됨. 남은 repeatCount를 전달.       | 카운트다운 타이머 또는 "진행 상황" UI 업데이트.      |
| **OnCompleted** | 작업이 repeatCount에 도달하여 자연스럽게 완료될 때 발동됨.   | "쿨다운 종료" 또는 "콤보 종료" 로직 트리거.          |
| **OnCancelled** | CancelDelayed 또는 CancelRepeating이 호출될 때 특별히 발동됨. | 관련 VFX/SFX 중지 또는 캐릭터 상태 재설정.           |

:::tip Handle 해제
이러한 콜백을 수동으로 구독 해제할 필요가 없습니다. ScheduleHandle은 작업이 종료 상태(Completed 또는 Cancelled)에 도달하면 내부 스케줄러에 의해 자동으로 정리됩니다.
:::

------

## 🛑 취소

대기 중인 이벤트를 중지하는 것은 시작하는 것만큼 중요합니다. 이벤트가 시작된 방식에 따라 두 가지 뚜렷한 취소 방법이 있습니다.

### 1. 수동 스케줄 취소
`RaiseDelayed` 또는 `RaiseRepeating`을 사용한 경우 **ScheduleHandle**을 받았습니다. 해당 특정 작업을 중지하려면 이 핸들을 사용해야 합니다.

#### 지연 호출 취소
```csharp
public void DefuseBomb()
{
    // 대기 중인 지연 실행 중지
    if (_bombHandle != null)
    {
        // 성공적으로 취소되면 true 반환
        bool success = onBombExplode.CancelDelayed(_bombHandle); 
    }
}
```

#### 반복 루프 취소
```csharp
public void StopRadar()
{
    // 수동 루프 중지
    if (_radarHandle != null)
    {
        onRadarPing.CancelRepeating(_radarHandle);
    }
}
```

### 2. 자동(Inspector) 스케줄 취소

이벤트가 **Inspector 구성**(Behavior Window) 때문에 루프하거나 지연되고 있는 경우, 매개변수 없는 Cancel() 메서드를 사용하세요.

- **대상**: 이 이벤트 에셋에서 **활성** 자동 시퀀스(Delay 또는 Loop)를 중지합니다.
- **안전성**: Raise()는 중복되는 루프를 방지하기 위해 새로운 자동 시퀀스를 시작하기 전에 내부적으로 Cancel()을 자동으로 호출합니다.
```csharp
// 이전 .Raise() 호출에 의해 트리거된 현재 실행 중인
// "Action Delay" 또는 "Repeat" 로직을 중지합니다
onEvent.Cancel();
```

:::danger 중요한 구분
**Cancel()은 리스너를 제거하지 않습니다.**

- **Cancel()**: 시간 기반 실행(대기 중인 타이머/루프)을 중지합니다. 이벤트는 발동되지 않은 것처럼 동작합니다.
- **RemoveAllListeners()**: 모든 스크립트의 구독을 해제하여 향후 이벤트를 더 이상 받지 않도록 합니다.
  :::

------

## 🔌 Inspector 통합

코드가 **시각적 동작 구성**과 어떻게 상호작용하는지 이해하는 것이 중요합니다.

코드에서 Raise()를 호출하면 시스템은 [Game Event Behavior Window](../visual-workflow/game-event-behavior.md)에 정의된 **스케줄 구성**을 확인합니다:

1. **코드**: myEvent.Raise() 호출됨.
2. **시스템 확인**: 이 이벤트가 Inspector에서 Action Delay > 0을 가지고 있는가?
   - **예**: 시스템이 암시적으로 이것을 RaiseDelayed로 변환합니다.
   - **아니오**: 즉시 발동됩니다.
3. **시스템 확인**: 이 이벤트가 Repeat Interval > 0을 가지고 있는가?
   - **예**: 시스템이 자동으로 루프를 시작합니다.

:::tip 모범 사례
**순수한 코드 제어**를 원한다면 Inspector의 Schedule 설정을 0으로 두세요.
**디자이너가 타이밍을 조정**하도록 하려면 Raise()를 사용하고 Inspector가 지연을 제어하도록 하세요.
:::

------

## 🔇 시각 효과 음소거 (SetInspectorListenersActive)

복잡한 시스템에서는 종종 **게임 로직**(데이터)과 **게임 느낌**(비주얼/사운드)을 분리하고 싶을 수 있습니다.

SetInspectorListenersActive(false)를 사용하여 "로직/코드" 레이어는 실행하면서 "비주얼/씬" 레이어를 음소거할 수 있습니다.

### 사용 사례: 빨리 감기 또는 로딩

저장 파일을 로드한다고 상상해 보세요. 인벤토리를 채우기 위해 OnItemAdded를 100번 발동해야 하지만, 100개의 사운드 효과를 재생하거나 100개의 UI 팝업을 생성하고 싶지 **않습니다**.
```csharp
public void LoadSaveData(List<Item> items)
{
    // 1. "화려한" 것들 음소거(Inspector 바인딩)
    onItemAdded.SetInspectorListenersActive(false);

    // 2. 로직 처리(데이터 리스너는 여전히 실행됨!)
    foreach(var item in items)
    {
        // 이것은 백엔드 인벤토리 데이터를 업데이트합니다
        // 하지만 에디터에서 구성된 UI/사운드는 건너뜁니다
        onItemAdded.Raise(item); 
    }

    // 3. 시각 효과 다시 활성화
    onItemAdded.SetInspectorListenersActive(true);
    
    // 4. UI 한 번에 새로고침
    onInventoryUpdated.Raise();
}
```

------

## 📜 API 요약

| 메서드 시그니처                                              | 반환             | 설명                                                         |
| :----------------------------------------------------------- | :--------------- | :----------------------------------------------------------- |
| **즉시 실행**                                                |                  |                                                              |
| `Raise()`                                                    | `void`           | Void 이벤트를 즉시 발동합니다.                               |
| `Raise(T argument)`                                          | `void`           | 단일 인수 이벤트를 즉시 발동합니다.                          |
| `Raise(TSender sender, TArgs args)`                          | `void`           | Sender+Argument 이벤트를 즉시 발동합니다.                    |
| **지연 실행**                                                |                  |                                                              |
| `RaiseDelayed(float delay)`                                  | `ScheduleHandle` | `delay`초 후 Void 이벤트 발동을 예약합니다.                  |
| `RaiseDelayed(T arg, float delay)`                           | `ScheduleHandle` | `delay`초 후 타입 이벤트 발동을 예약합니다.                  |
| `RaiseDelayed(TSender s, TArgs a, float delay)`              | `ScheduleHandle` | `delay`초 후 Sender 이벤트 발동을 예약합니다.                |
| **반복 실행**                                                |                  |                                                              |
| `RaiseRepeating(float interval, int count)`                  | `ScheduleHandle` | 반복 루프를 시작합니다. 무한은 `count`를 -1로 설정합니다.    |
| `RaiseRepeating(T arg, float interval, int count)`           | `ScheduleHandle` | 타입 반복 루프를 시작합니다.                                 |
| `RaiseRepeating(TSender s, TArgs a, float interval, int count)` | `ScheduleHandle` | Sender 반복 루프를 시작합니다.                               |
| **취소 및 제어**                                             |                  |                                                              |
| `Cancel()`                                                   | `void`           | 이 이벤트에 대한 **Inspector 구성** 자동 루프/지연을 중지합니다. |
| `CancelDelayed(ScheduleHandle handle)`                       | `bool`           | 특정 수동 지연 작업을 취소합니다. 성공하면 true를 반환합니다. |
| `CancelRepeating(ScheduleHandle handle)`                     | `bool`           | 특정 수동 반복 작업을 취소합니다. 성공하면 true를 반환합니다. |
| `SetInspectorListenersActive(bool isActive)`                 | `void`           | 런타임에 씬 기반 `UnityEvent` 리스너를 음소거하거나 음소거 해제합니다. |