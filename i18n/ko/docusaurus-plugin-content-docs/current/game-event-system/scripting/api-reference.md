---
sidebar_label: 'API 레퍼런스'

sidebar_position: 5
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

# API 레퍼런스

GameEvent 시스템에 대한 완전한 API 레퍼런스 문서입니다. 모든 이벤트 타입은 이벤트 기반 아키텍처를 위한 포괄적인 기능을 갖춘 엄격한 타입 안전 인터페이스를 구현합니다.

:::info 네임스페이스

모든 클래스와 인터페이스는 `TinyGiants.GameEventSystem.Runtime` 네임스페이스에 위치합니다.

:::
```csharp
using TinyGiants.GameEventSystem.Runtime;
```

------

## 이벤트 타입 개요

GameEvent 시스템은 세 가지 이벤트 타입 변형을 제공합니다

| 타입                            | 설명                                        |
| ------------------------------- | ------------------------------------------- |
| **`GameEvent`**                 | 간단한 알림을 위한 매개변수 없는 이벤트     |
| **`GameEvent<T>`**              | 타입이 지정된 데이터를 전달하는 단일 인수 이벤트 |
| **`GameEvent<TSender, TArgs>`** | sender를 인식하는 통신을 위한 이중 인수 이벤트 |

아래의 모든 메서드는 적절한 매개변수 변형과 함께 이러한 타입 전체에서 사용할 수 있습니다.

------

## 🚀 이벤트 발동 및 취소

<details>
<summary>Raise()</summary>

이벤트를 즉시 트리거하여 등록된 모든 리스너를 실행 순서대로 호출합니다.

**실행 순서**: 기본 → 우선순위 → 조건부 → 영구 → 트리거 → 체인

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void Raise();
```

**예시:**
```csharp
myEvent.Raise();
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void Raise(T argument);
```

**매개변수:**

| 이름       | 타입 | 설명                              |
| ---------- | ---- | --------------------------------- |
| `argument` | `T`  | 모든 리스너에게 전달할 데이터 페이로드 |

**예시:**
```csharp
// float 값으로 발동
healthEvent.Raise(50.5f);

// 커스텀 타입으로 발동
scoreEvent.Raise(new ScoreData { points = 100, combo = 5 });
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void Raise(TSender sender, TArgs args);
```

**매개변수:**

| 이름     | 타입      | 설명                           |
| -------- | --------- | ------------------------------ |
| `sender` | `TSender` | 이벤트를 트리거하는 소스 객체  |
| `args`   | `TArgs`   | 리스너에게 전달할 데이터 페이로드 |

**예시:**
```csharp
// GameObject sender와 데미지 데이터로 발동
damageEvent.Raise(this.gameObject, new DamageInfo(10));

// 플레이어 sender로 발동
playerEvent.Raise(playerInstance, new PlayerAction { type = "Jump" });
```

</TabItem> </Tabs>

</details>

<details>
<summary>Cancel()</summary>

이 이벤트 에셋에 대한 활성 Inspector 구성 예약 실행(지연 또는 반복)을 중지합니다.
```csharp
void Cancel();
```

**예시:**
```csharp
// Inspector에서 구성된 자동 반복 중지
myEvent.Cancel();
```

:::warning 범위 제한

이것은 Inspector의 "스케줄 구성"에 의해 시작된 스케줄**만** 취소합니다. `RaiseDelayed()` 또는 `RaiseRepeating()`을 통해 생성된 수동 스케줄은 취소하지 **않습니다**. 그것들에는 `CancelDelayed(handle)` 또는 `CancelRepeating(handle)`을 사용하세요.

:::

</details>

## ⏱️ 시간 기반 스케줄링

<details>
<summary>RaiseDelayed()</summary>

지정된 지연 후 한 번 발동하도록 이벤트를 예약합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
ScheduleHandle RaiseDelayed(float delay);
```

**매개변수:**

| 이름    | 타입    | 설명                                 |
| ------- | ------- | ------------------------------------ |
| `delay` | `float` | 이벤트를 발동하기 전 대기할 시간(초) |

**반환:** `ScheduleHandle` - 취소를 위한 핸들

**예시:**
```csharp
// 5초 후 발동
ScheduleHandle handle = myEvent.RaiseDelayed(5f);

// 필요시 취소
myEvent.CancelDelayed(handle);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
ScheduleHandle RaiseDelayed(T argument, float delay);
```

**매개변수:**

| 이름       | 타입    | 설명                                 |
| ---------- | ------- | ------------------------------------ |
| `argument` | `T`     | 이벤트 실행 시 전달할 데이터         |
| `delay`    | `float` | 이벤트를 발동하기 전 대기할 시간(초) |

**반환:** `ScheduleHandle` - 취소를 위한 핸들

**예시:**
```csharp
// 3초 후 적 생성
ScheduleHandle handle = spawnEvent.RaiseDelayed(enemyType, 3f);

// 생성 취소
spawnEvent.CancelDelayed(handle);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
ScheduleHandle RaiseDelayed(TSender sender, TArgs args, float delay);
```

**매개변수:**

| 이름     | 타입      | 설명                                 |
| -------- | --------- | ------------------------------------ |
| `sender` | `TSender` | 이벤트 실행 시 전달할 sender         |
| `args`   | `TArgs`   | 이벤트 실행 시 전달할 데이터         |
| `delay`  | `float`   | 이벤트를 발동하기 전 대기할 시간(초) |

**반환:** `ScheduleHandle` - 취소를 위한 핸들

**예시:**
```csharp
// 지연된 데미지 적용
ScheduleHandle handle = damageEvent.RaiseDelayed(
    attackerObject, 
    new DamageInfo(25), 
    2f
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RaiseRepeating()</summary>

고정된 간격으로 반복적으로 발동하도록 이벤트를 예약합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
ScheduleHandle RaiseRepeating(float interval, int repeatCount = -1);
```

**매개변수:**

| 이름          | 타입    | 설명                                                 |
| ------------- | ------- | ---------------------------------------------------- |
| `interval`    | `float` | 각 실행 사이의 시간(초)                              |
| `repeatCount` | `int`   | 반복 횟수. 무한은 `-1` 사용 (기본값: `-1`)          |

**반환:** `ScheduleHandle` - 취소를 위한 핸들

**예시:**
```csharp
// 10회 반복
ScheduleHandle handle = tickEvent.RaiseRepeating(1f, repeatCount: 10);

// 영원히 반복 (무한 루프)
ScheduleHandle infinite = pulseEvent.RaiseRepeating(0.5f);

// 무한 루프 중지
pulseEvent.CancelRepeating(infinite);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
ScheduleHandle RaiseRepeating(T argument, float interval, int repeatCount = -1);
```

**매개변수:**

| 이름          | 타입    | 설명                                        |
| ------------- | ------- | ------------------------------------------- |
| `argument`    | `T`     | 각 실행마다 전달할 데이터                   |
| `interval`    | `float` | 각 실행 사이의 시간(초)                     |
| `repeatCount` | `int`   | 반복 횟수. 무한은 `-1` 사용 (기본값: `-1`) |

**반환:** `ScheduleHandle` - 취소를 위한 핸들

**예시:**
```csharp
// 1초마다 데미지를 5회 줌
ScheduleHandle poison = damageEvent.RaiseRepeating(5, 1f, repeatCount: 5);

// 30초마다 무한히 웨이브 생성
ScheduleHandle waves = waveEvent.RaiseRepeating(waveData, 30f);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
ScheduleHandle RaiseRepeating(TSender sender, TArgs args, float interval, int repeatCount = -1);
```

**매개변수:**

| 이름          | 타입      | 설명                                        |
| ------------- | --------- | ------------------------------------------- |
| `sender`      | `TSender` | 각 실행마다 전달할 sender                   |
| `args`        | `TArgs`   | 각 실행마다 전달할 데이터                   |
| `interval`    | `float`   | 각 실행 사이의 시간(초)                     |
| `repeatCount` | `int`     | 반복 횟수. 무한은 `-1` 사용 (기본값: `-1`) |

**반환:** `ScheduleHandle` - 취소를 위한 핸들

**예시:**
```csharp
// 2초마다 체력 재생, 10회
ScheduleHandle regen = healEvent.RaiseRepeating(
    playerObject,
    new HealInfo(5),
    2f,
    repeatCount: 10
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>CancelDelayed()</summary>

`RaiseDelayed()`로 생성된 특정 지연 이벤트를 취소합니다.
```csharp
bool CancelDelayed(ScheduleHandle handle);
```

**매개변수:**

| 이름     | 타입             | 설명                            |
| -------- | ---------------- | ------------------------------- |
| `handle` | `ScheduleHandle` | `RaiseDelayed()`가 반환한 핸들  |

**반환:** `bool` - 성공적으로 취소되면 `true`, 이미 실행되었거나 유효하지 않으면 `false`

**예시:**
```csharp
ScheduleHandle handle = explosionEvent.RaiseDelayed(5f);

// 폭발이 발생하기 전에 취소
if (explosionEvent.CancelDelayed(handle))
{
    Debug.Log("폭발이 해제되었습니다!");
}
```

</details>

<details>
<summary>CancelRepeating()</summary>

`RaiseRepeating()`으로 생성된 특정 반복 이벤트를 취소합니다.
```csharp
bool CancelRepeating(ScheduleHandle handle);
```

**매개변수:**

| 이름     | 타입             | 설명                              |
| -------- | ---------------- | --------------------------------- |
| `handle` | `ScheduleHandle` | `RaiseRepeating()`이 반환한 핸들  |

**반환:** `bool` - 성공적으로 취소되면 `true`, 이미 완료되었거나 유효하지 않으면 `false`

**예시:**
```csharp
ScheduleHandle handle = tickEvent.RaiseRepeating(1f);

// 반복 중지
if (tickEvent.CancelRepeating(handle))
{
    Debug.Log("타이머가 중지되었습니다!");
}
```

</details>

## 🎧 리스너 관리

<details>
<summary>AddListener()</summary>

표준 실행 우선순위로 기본 리스너를 등록합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddListener(UnityAction call);
```

**매개변수:**

| 이름   | 타입          | 설명                     |
| ------ | ------------- | ------------------------ |
| `call` | `UnityAction` | 매개변수가 없는 콜백 메서드 |

**예시:**
```csharp
myEvent.AddListener(OnEventTriggered);

void OnEventTriggered()
{
    Debug.Log("이벤트가 발동되었습니다!");
}
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddListener(UnityAction<T> call);
```

**매개변수:**

| 이름   | 타입             | 설명                        |
| ------ | ---------------- | --------------------------- |
| `call` | `UnityAction<T>` | 타입 인수를 받는 콜백 메서드 |

**예시:**
```csharp
scoreEvent.AddListener(OnScoreChanged);

void OnScoreChanged(int newScore)
{
    Debug.Log($"점수: {newScore}");
}
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddListener(UnityAction<TSender, TArgs> call);
```

**매개변수:**

| 이름   | 타입                          | 설명                           |
| ------ | ----------------------------- | ------------------------------ |
| `call` | `UnityAction<TSender, TArgs>` | sender와 arguments를 받는 콜백 |

**예시:**
```csharp
damageEvent.AddListener(OnDamageDealt);

void OnDamageDealt(GameObject attacker, DamageInfo info)
{
    Debug.Log($"{attacker.name}이(가) {info.amount} 데미지를 주었습니다");
}
```

</TabItem> </Tabs>

:::tip 중복 방지

리스너가 이미 존재하면 중복을 방지하기 위해 제거되고 다시 추가됩니다.

:::

</details>

<details>
<summary>RemoveListener()</summary>

이벤트에서 기본 리스너의 등록을 해제합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemoveListener(UnityAction call);
```

**매개변수:**

| 이름   | 타입          | 설명                     |
| ------ | ------------- | ------------------------ |
| `call` | `UnityAction` | 매개변수가 없는 콜백 메서드 |

**예시:**
```csharp
myEvent.RemoveListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemoveListener(UnityAction<T> call);
```

**매개변수:**

| 이름   | 타입             | 설명                        |
| ------ | ---------------- | --------------------------- |
| `call` | `UnityAction<T>` | 타입 인수를 받는 콜백 메서드 |

**예시:**
```csharp
scoreEvent.RemoveListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemoveListener(UnityAction<TSender, TArgs> call);
```

**매개변수:**

| 이름   | 타입                          | 설명                           |
| ------ | ----------------------------- | ------------------------------ |
| `call` | `UnityAction<TSender, TArgs>` | sender와 arguments를 받는 콜백 |

**예시:**
```csharp
damageEvent.RemoveListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemoveAllListeners()</summary>

이벤트에서 모든 기본, 우선순위 및 조건부 리스너를 지웁니다.
```csharp
void RemoveAllListeners();
```

**예시:**
```csharp
// 모든 리스너 정리
myEvent.RemoveAllListeners();
```

:::warning 범위

안전상의 이유로 영구 리스너나 트리거/체인 이벤트는 제거하지 **않습니다**.

:::

</details>

<details>
<summary>AddPriorityListener()</summary>

명시적 실행 우선순위로 리스너를 등록합니다. 높은 우선순위 값이 먼저 실행됩니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddPriorityListener(UnityAction call, int priority);
```

**매개변수:**

| 이름       | 타입          | 설명                                            |
| ---------- | ------------- | ----------------------------------------------- |
| `call`     | `UnityAction` | 콜백 메서드                                     |
| `priority` | `int`         | 실행 우선순위 (높을수록 = 먼저, 기본값: 0)      |

**예시:**
```csharp
myEvent.AddPriorityListener(CriticalHandler, 100);
myEvent.AddPriorityListener(NormalHandler, 50);
myEvent.AddPriorityListener(LowPriorityHandler, 10);
// 실행 순서: CriticalHandler → NormalHandler → LowPriorityHandler
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddPriorityListener(UnityAction<T> call, int priority);
```

**매개변수:**

| 이름       | 타입             | 설명                                       |
| ---------- | ---------------- | ------------------------------------------ |
| `call`     | `UnityAction<T>` | 콜백 메서드                                |
| `priority` | `int`            | 실행 우선순위 (높을수록 = 먼저, 기본값: 0) |

**예시:**
```csharp
healthEvent.AddPriorityListener(UpdateUI, 100);
healthEvent.AddPriorityListener(PlaySound, 50);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddPriorityListener(UnityAction<TSender, TArgs> call, int priority);
```

**매개변수:**

| 이름       | 타입                          | 설명                                       |
| ---------- | ----------------------------- | ------------------------------------------ |
| `call`     | `UnityAction<TSender, TArgs>` | 콜백 메서드                                |
| `priority` | `int`                         | 실행 우선순위 (높을수록 = 먼저, 기본값: 0) |

**예시:**
```csharp
attackEvent.AddPriorityListener(ProcessCombat, 100);
attackEvent.AddPriorityListener(ShowVFX, 50);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemovePriorityListener()</summary>

우선순위 리스너의 등록을 해제합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemovePriorityListener(UnityAction call);
```

**매개변수:**

| 이름   | 타입          | 설명                     |
| ------ | ------------- | ------------------------ |
| `call` | `UnityAction` | 매개변수가 없는 콜백 메서드 |

**예시:**
```csharp
myEvent.RemovePriorityListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemovePriorityListener(UnityAction<T> call);
```

**매개변수:**

| 이름   | 타입             | 설명                        |
| ------ | ---------------- | --------------------------- |
| `call` | `UnityAction<T>` | 타입 인수를 받는 콜백 메서드 |

**예시:**
```csharp
scoreEvent.RemovePriorityListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemovePriorityListener(UnityAction<TSender, TArgs> call);
```

**매개변수:**

| 이름   | 타입                          | 설명                           |
| ------ | ----------------------------- | ------------------------------ |
| `call` | `UnityAction<TSender, TArgs>` | sender와 arguments를 받는 콜백 |

**예시:**
```csharp
damageEvent.RemovePriorityListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>AddConditionalListener()</summary>

조건이 true로 평가될 때만 실행되는 리스너를 등록합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddConditionalListener(UnityAction call, Func<bool> condition, int priority = 0);
```

**매개변수:**

| 이름        | 타입          | 설명                                   |
| ----------- | ------------- | -------------------------------------- |
| `call`      | `UnityAction` | 콜백 메서드                            |
| `condition` | `Func<bool>`  | 조건 함수 (null = 항상 실행)           |
| `priority`  | `int`         | 실행 우선순위 (기본값: 0)              |

**예시:**
```csharp
myEvent.AddConditionalListener(
    OnHealthLow,
    () => playerHealth < 20,
    priority: 10
);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddConditionalListener(UnityAction<T> call, Func<T, bool> condition, int priority = 0);
```

**매개변수:**

| 이름        | 타입             | 설명                        |
| ----------- | ---------------- | --------------------------- |
| `call`      | `UnityAction<T>` | 콜백 메서드                 |
| `condition` | `Func<T, bool>`  | 인수를 받는 조건 함수       |
| `priority`  | `int`            | 실행 우선순위 (기본값: 0)   |

**예시:**
```csharp
scoreEvent.AddConditionalListener(
    OnHighScore,
    score => score > 1000,
    priority: 5
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddConditionalListener(
    UnityAction<TSender, TArgs> call, 
    Func<TSender, TArgs, bool> condition,
    int priority = 0
);
```

**매개변수:**

| 이름        | 타입                          | 설명                             |
| ----------- | ----------------------------- | -------------------------------- |
| `call`      | `UnityAction<TSender, TArgs>` | 콜백 메서드                      |
| `condition` | `Func<TSender, TArgs, bool>`  | sender와 arguments를 받는 조건 함수 |
| `priority`  | `int`                         | 실행 우선순위 (기본값: 0)        |

**예시:**
```csharp
damageEvent.AddConditionalListener(
    OnCriticalHit,
    (attacker, info) => info.isCritical,
    priority: 10
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemoveConditionalListener()</summary>

조건부 리스너의 등록을 해제합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemoveConditionalListener(UnityAction call);
```

**매개변수:**

| 이름   | 타입          | 설명                     |
| ------ | ------------- | ------------------------ |
| `call` | `UnityAction` | 매개변수가 없는 콜백 메서드 |

**예시:**
```csharp
myEvent.RemoveConditionalListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemoveConditionalListener(UnityAction<T> call);
```

**매개변수:**

| 이름   | 타입             | 설명                        |
| ------ | ---------------- | --------------------------- |
| `call` | `UnityAction<T>` | 타입 인수를 받는 콜백 메서드 |

**예시:**
```csharp
scoreEvent.RemoveConditionalListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemoveConditionalListener(UnityAction<TSender, TArgs> call);
```

**매개변수:**

| 이름   | 타입                          | 설명                           |
| ------ | ----------------------------- | ------------------------------ |
| `call` | `UnityAction<TSender, TArgs>` | sender와 arguments를 받는 콜백 |

**예시:**
```csharp
damageEvent.RemoveConditionalListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>AddPersistentListener()</summary>

씬 변경에서 살아남는 글로벌 리스너를 등록합니다(DontDestroyOnLoad).

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddPersistentListener(UnityAction call, int priority = 0);
```

**매개변수:**

| 이름       | 타입          | 설명                    |
| ---------- | ------------- | ----------------------- |
| `call`     | `UnityAction` | 콜백 메서드             |
| `priority` | `int`         | 실행 우선순위 (기본값: 0) |

**예시:**
```csharp
globalEvent.AddPersistentListener(OnGlobalAction, priority: 100);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddPersistentListener(UnityAction<T> call, int priority = 0);
```

**매개변수:**

| 이름       | 타입             | 설명                    |
| ---------- | ---------------- | ----------------------- |
| `call`     | `UnityAction<T>` | 콜백 메서드             |
| `priority` | `int`            | 실행 우선순위 (기본값: 0) |

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddPersistentListener(UnityAction<TSender, TArgs> call, int priority = 0);
```

**매개변수:**

| 이름       | 타입                          | 설명                    |
| ---------- | ----------------------------- | ----------------------- |
| `call`     | `UnityAction<TSender, TArgs>` | 콜백 메서드             |
| `priority` | `int`                         | 실행 우선순위 (기본값: 0) |

</TabItem> </Tabs>

:::info 영속성

영구 리스너는 씬 로드 전체에 걸쳐 활성 상태를 유지합니다. 저장 관리 또는 분석과 같은 글로벌 시스템에 사용하세요.

:::

</details>

<details>
<summary>RemovePersistentListener()</summary>

영구 리스너의 등록을 해제합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemovePersistentListener(UnityAction call);
```

**매개변수:**

| 이름   | 타입          | 설명                     |
| ------ | ------------- | ------------------------ |
| `call` | `UnityAction` | 매개변수가 없는 콜백 메서드 |

**예시:**
```csharp
myEvent.RemovePersistentListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemovePersistentListener(UnityAction<T> call);
```

**매개변수:**

| 이름   | 타입             | 설명                        |
| ------ | ---------------- | --------------------------- |
| `call` | `UnityAction<T>` | 타입 인수를 받는 콜백 메서드 |

**예시:**
```csharp
scoreEvent.RemovePersistentListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemovePersistentListener(UnityAction<TSender, TArgs> call);
```

**매개변수:**

| 이름   | 타입                          | 설명                           |
| ------ | ----------------------------- | ------------------------------ |
| `call` | `UnityAction<TSender, TArgs>` | sender와 arguments를 받는 콜백 |

**예시:**
```csharp
damageEvent.RemovePersistentListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

## ⚡ 트리거 이벤트 (Fan-Out 패턴)

<details>
<summary>AddTriggerEvent()</summary>

이 이벤트가 발동될 때 자동으로 트리거될 타겟 이벤트를 등록합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<bool> condition = null,
    int priority = 0
);
```

**매개변수:**

| 이름          | 타입            | 설명                                        |
| ------------- | --------------- | ------------------------------------------- |
| `targetEvent` | `GameEventBase` | 트리거할 이벤트                             |
| `delay`       | `float`         | 선택적 지연(초) (기본값: 0)                 |
| `condition`   | `Func<bool>`    | 실행을 제어하는 선택적 조건                 |
| `priority`    | `int`           | 다른 트리거와 관련된 실행 순서 (기본값: 0)  |

**반환:** `TriggerHandle` - 안전한 제거를 위한 고유 식별자

**예시:**
```csharp
// 간단한 트리거: 문 열림 → 불 켜짐
doorOpenEvent.AddTriggerEvent(lightOnEvent);

// 지연 트리거: 2초 후 폭발
fuseEvent.AddTriggerEvent(explosionEvent, delay: 2f);

// 조건부 트리거
doorOpenEvent.AddTriggerEvent(
    alarmEvent,
    condition: () => isNightTime
);

// 우선순위 순서 트리거
bossDefeatedEvent.AddTriggerEvent(stopMusicEvent, priority: 100);
bossDefeatedEvent.AddTriggerEvent(victoryMusicEvent, priority: 90);
bossDefeatedEvent.AddTriggerEvent(showRewardsEvent, priority: 50);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<T, bool> condition = null,
    bool passArgument = true,
    Func<T, object> argumentTransformer = null,
    int priority = 0
);
```

**매개변수:**

| 이름                  | 타입              | 설명                                   |
| --------------------- | ----------------- | -------------------------------------- |
| `targetEvent`         | `GameEventBase`   | 트리거할 이벤트                        |
| `delay`               | `float`           | 선택적 지연(초) (기본값: 0)            |
| `condition`           | `Func<T, bool>`   | 인수를 받는 선택적 조건                |
| `passArgument`        | `bool`            | 타겟에 데이터 전달 여부 (기본값: true) |
| `argumentTransformer` | `Func<T, object>` | 데이터를 변환하는 선택적 함수          |
| `priority`            | `int`             | 실행 우선순위 (기본값: 0)              |

**반환:** `TriggerHandle` - 안전한 제거를 위한 고유 식별자

**예시:**
```csharp
// 인수 직접 전달
public Int32GameEvent scoreEvent;
public Int32GameEvent updateUIEvent;
scoreEvent.AddTriggerEvent(updateUIEvent, passArgument: true);

// 인수 변환: int → string
public Int32GameEvent scoreEvent;
StringGameEvent notificationEvent;
scoreEvent.AddTriggerEvent(
    notificationEvent,
    passArgument: true,
    argumentTransformer: score => $"점수: {score}"
);

// 인수 확인을 포함한 조건부
SingleGameEvent healthEvent;
GameEvent lowHealthWarningEvent;
healthEvent.AddTriggerEvent(
    lowHealthWarningEvent,
    condition: health => health < 20f,
    passArgument: false
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<TSender, TArgs, bool> condition = null,
    bool passArgument = true,
    Func<TSender, TArgs, object> argumentTransformer = null,
    int priority = 0
);
```

**매개변수:**

| 이름                  | 타입                           | 설명                                   |
| --------------------- | ------------------------------ | -------------------------------------- |
| `targetEvent`         | `GameEventBase`                | 트리거할 이벤트                        |
| `delay`               | `float`                        | 선택적 지연(초) (기본값: 0)            |
| `condition`           | `Func<TSender, TArgs, bool>`   | sender와 args를 받는 선택적 조건       |
| `passArgument`        | `bool`                         | 타겟에 데이터 전달 여부 (기본값: true) |
| `argumentTransformer` | `Func<TSender, TArgs, object>` | 선택적 변환 함수                       |
| `priority`            | `int`                          | 실행 우선순위 (기본값: 0)              |

**반환:** `TriggerHandle` - 안전한 제거를 위한 고유 식별자

**예시:**
```csharp
// sender와 args를 다른 sender 이벤트로 전달
GameObjectDamageInfoGameEvent damageEvent;
GameObjectDamageInfoGameEvent logEvent;
damageEvent.AddTriggerEvent(logEvent, passArgument: true);

// 변환: 데미지 값만 추출
GameObjectDamageInfoGameEvent damageEvent;
public Int32GameEvent damageNumberEvent;
damageEvent.AddTriggerEvent(
    damageNumberEvent,
    passArgument: true,
    argumentTransformer: (sender, info) => info.amount
);

// sender와 args 기반 조건부
GameObjectDamageInfoGameEvent damageEvent;
GameEvent criticalHitEvent;
damageEvent.AddTriggerEvent(
    criticalHitEvent,
    condition: (sender, info) => 
        info.isCritical && sender.CompareTag("Player"),
    passArgument: false
);
```

</TabItem> </Tabs>

:::tip Fan-Out 패턴

트리거는 **병렬로** 실행됩니다 - 각 트리거는 독립적입니다. 한 트리거의 조건이 실패하거나 예외가 발생해도 다른 트리거는 여전히 실행됩니다.

:::

</details>

<details>
<summary>RemoveTriggerEvent() (핸들로)</summary>

고유 핸들을 사용하여 특정 트리거를 안전하게 제거합니다.
```csharp
void RemoveTriggerEvent(TriggerHandle handle);
```

**매개변수:**

| 이름     | 타입            | 설명                               |
| -------- | --------------- | ---------------------------------- |
| `handle` | `TriggerHandle` | `AddTriggerEvent()`가 반환한 핸들  |

**예시:**
```csharp
TriggerHandle handle = doorEvent.AddTriggerEvent(lightEvent);

// 특정 트리거 제거
doorEvent.RemoveTriggerEvent(handle);
```

:::tip 권장

이것은 특정 트리거 인스턴스만 제거하므로 **가장 안전한** 제거 방법입니다.

:::

</details>

<details>
<summary>RemoveTriggerEvent() (타겟으로)</summary>

특정 타겟 이벤트를 가리키는 **모든** 트리거를 제거합니다.
```csharp
void RemoveTriggerEvent(GameEventBase targetEvent);
```

**매개변수:**

| 이름          | 타입            | 설명                   |
| ------------- | --------------- | ---------------------- |
| `targetEvent` | `GameEventBase` | 연결을 끊을 타겟 이벤트 |

**예시:**
```csharp
doorEvent.RemoveTriggerEvent(lightEvent);
```

:::warning 광범위한 영향

이것은 이 이벤트를 타겟으로 하는 **모든** 트리거를 제거합니다. 다른 시스템에서 등록한 것도 포함됩니다. 정확성을 위해 `RemoveTriggerEvent(handle)`을 사용하세요.

:::

</details>

<details>
<summary>RemoveAllTriggerEvents()</summary>

이 이벤트에서 모든 트리거 이벤트를 제거합니다.
```csharp
void RemoveAllTriggerEvents();
```

**예시:**
```csharp
myEvent.RemoveAllTriggerEvents();
```

</details>

## 🔗 체인 이벤트 (순차 패턴)

<details>
<summary>AddChainEvent()</summary>

체인에서 순차적으로 실행할 타겟 이벤트를 등록합니다.

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<bool> condition = null,
    bool waitForCompletion = false
);
```

**매개변수:**

| 이름                | 타입            | 설명                                    |
| ------------------- | --------------- | --------------------------------------- |
| `targetEvent`       | `GameEventBase` | 체인에서 실행할 이벤트                  |
| `delay`             | `float`         | 이 노드를 실행하기 전 지연 (기본값: 0)  |
| `duration`          | `float`         | 이 노드를 실행한 후 지연 (기본값: 0)    |
| `condition`         | `Func<bool>`    | 선택적 조건 - false이면 체인 중단       |
| `waitForCompletion` | `bool`          | 실행 후 한 프레임 대기 (기본값: false)  |

**반환:** `ChainHandle` - 안전한 제거를 위한 고유 식별자

**예시:**
```csharp
// 간단한 시퀀스: A → B → C
eventA.AddChainEvent(eventB);
eventB.AddChainEvent(eventC);

// 지연이 있는 컷씬
fadeOutEvent.AddChainEvent(loadSceneEvent, delay: 1f);
loadSceneEvent.AddChainEvent(fadeInEvent, delay: 0.5f);

// 조건부 체인: 조건이 충족되는 경우에만 계속
combatEndEvent.AddChainEvent(
    victoryEvent,
    condition: () => playerHealth > 0
);

// 비동기 작업을 위한 프레임 대기가 있는 체인
showDialogEvent.AddChainEvent(
    typeTextEvent,
    waitForCompletion: true
);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<T, bool> condition = null,
    bool passArgument = true,
    Func<T, object> argumentTransformer = null,
    bool waitForCompletion = false
);
```

**매개변수:**

| 이름                  | 타입              | 설명                                    |
| --------------------- | ----------------- | --------------------------------------- |
| `targetEvent`         | `GameEventBase`   | 체인에서 실행할 이벤트                  |
| `delay`               | `float`           | 이 노드를 실행하기 전 지연 (기본값: 0)  |
| `duration`            | `float`           | 이 노드를 실행한 후 지연 (기본값: 0)    |
| `condition`           | `Func<T, bool>`   | 인수를 받는 선택적 조건                 |
| `passArgument`        | `bool`            | 타겟에 데이터 전달 여부 (기본값: true)  |
| `argumentTransformer` | `Func<T, object>` | 선택적 변환 함수                        |
| `waitForCompletion`   | `bool`            | 실행 후 한 프레임 대기 (기본값: false)  |

**반환:** `ChainHandle` - 안전한 제거를 위한 고유 식별자

**예시:**
```csharp
// 인수 전달이 있는 체인
public Int32GameEvent damageEvent;
public Int32GameEvent applyDamageEvent;
public Int32GameEvent updateHealthBarEvent;

damageEvent.AddChainEvent(applyDamageEvent, passArgument: true);
applyDamageEvent.AddChainEvent(updateHealthBarEvent, passArgument: true);

// 변환이 있는 체인
public Int32GameEvent damageEvent;
SingleGameEvent healthPercentEvent;

damageEvent.AddChainEvent(
    healthPercentEvent,
    passArgument: true,
    argumentTransformer: damage => 
        (float)(currentHealth - damage) / maxHealth
);

// 인수 확인이 있는 조건부 체인
public Int32GameEvent damageEvent;
GameEvent deathEvent;

damageEvent.AddChainEvent(
    deathEvent,
    condition: damage => (currentHealth - damage) <= 0,
    passArgument: false
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<TSender, TArgs, bool> condition = null,
    bool passArgument = true,
    Func<TSender, TArgs, object> argumentTransformer = null,
    bool waitForCompletion = false
);
```

**매개변수:**

| 이름                  | 타입                           | 설명                                    |
| --------------------- | ------------------------------ | --------------------------------------- |
| `targetEvent`         | `GameEventBase`                | 체인에서 실행할 이벤트                  |
| `delay`               | `float`                        | 이 노드를 실행하기 전 지연 (기본값: 0)  |
| `duration`            | `float`                        | 이 노드를 실행한 후 지연 (기본값: 0)    |
| `condition`           | `Func<TSender, TArgs, bool>`   | sender와 args를 받는 선택적 조건        |
| `passArgument`        | `bool`                         | 타겟에 데이터 전달 여부 (기본값: true)  |
| `argumentTransformer` | `Func<TSender, TArgs, object>` | 선택적 변환 함수                        |
| `waitForCompletion`   | `bool`                         | 실행 후 한 프레임 대기 (기본값: false)  |

**반환:** `ChainHandle` - 안전한 제거를 위한 고유 식별자

**예시:**
```csharp
// 공격 시퀀스 체인
GameObjectAttackDataGameEvent attackStartEvent;
GameObjectAttackDataGameEvent playAnimationEvent;
GameObjectAttackDataGameEvent dealDamageEvent;

attackStartEvent.AddChainEvent(playAnimationEvent, delay: 0f);
playAnimationEvent.AddChainEvent(dealDamageEvent, delay: 0.5f);

// 데미지 값 추출
GameObjectAttackDataGameEvent dealDamageEvent;
public Int32GameEvent showDamageNumberEvent;

dealDamageEvent.AddChainEvent(
    showDamageNumberEvent,
    passArgument: true,
    argumentTransformer: (attacker, data) => data.damage
);

// 조건이 있는 승리 체인
GameObjectAttackDataGameEvent attackEndEvent;
GameEvent<GameObject, VictoryData> victoryEvent;

attackEndEvent.AddChainEvent(
    victoryEvent,
    condition: (attacker, data) => data.targetHealth <= 0,
    argumentTransformer: (attacker, data) => 
        new VictoryData { winner = attacker }
);
```

</TabItem> </Tabs>

:::warning 순차 실행

체인은 **순차적**입니다(A → B → C). 어떤 노드의 조건이 `false`를 반환하거나 예외가 발생하면 전체 체인이 그 지점에서 **중지됩니다**.

:::

:::tip 트리거 vs 체인

- **트리거** = 병렬 (A → [B, C, D]) - 모두 독립적으로 실행
- **체인** = 순차적 (A → B → C) - 엄격한 순서, 실패 시 중지

:::

</details>

<details>
<summary>RemoveChainEvent() (핸들로)</summary>

고유 핸들을 사용하여 특정 체인 노드를 안전하게 제거합니다.
```csharp
void RemoveChainEvent(ChainHandle handle);
```

**매개변수:**

| 이름     | 타입          | 설명                             |
| -------- | ------------- | -------------------------------- |
| `handle` | `ChainHandle` | `AddChainEvent()`가 반환한 핸들  |

**예시:**
```csharp
ChainHandle handle = eventA.AddChainEvent(eventB);

// 특정 체인 노드 제거
eventA.RemoveChainEvent(handle);
```

</details>

<details>
<summary>RemoveChainEvent() (타겟으로)</summary>

특정 타겟 이벤트를 가리키는 **모든** 체인 노드를 제거합니다.
```csharp
void RemoveChainEvent(GameEventBase targetEvent);
```

**매개변수:**

| 이름          | 타입            | 설명                   |
| ------------- | --------------- | ---------------------- |
| `targetEvent` | `GameEventBase` | 연결을 끊을 타겟 이벤트 |

**예시:**
```csharp
eventA.RemoveChainEvent(eventB);
```

:::warning 광범위한 영향

이것은 이 이벤트를 타겟으로 하는 **모든** 체인 노드를 제거합니다. 정확성을 위해 `RemoveChainEvent(handle)`을 사용하세요.

:::

</details>

<details>
<summary>RemoveAllChainEvents()</summary>

이 이벤트에서 모든 체인 이벤트를 제거합니다.
```csharp
void RemoveAllChainEvents();
```

**예시:**
```csharp
myEvent.RemoveAllChainEvents();
```

</details>

## 🔧 구성 및 유틸리티

<details>
<summary>SetInspectorListenersActive()</summary>

이벤트가 발동될 때 Inspector 구성 리스너가 실행되어야 하는지 제어합니다.
```csharp
void SetInspectorListenersActive(bool isActive);
```

**매개변수:**

| 이름       | 타입   | 설명                                              |
| ---------- | ------ | ------------------------------------------------- |
| `isActive` | `bool` | Inspector 리스너 활성화는 `true`, 음소거는 `false` |

**예시:**
```csharp
// Inspector 구성 UI/오디오 효과 음소거
damageEvent.SetInspectorListenersActive(false);

// 이벤트는 코드로 등록된 리스너만 트리거합니다
damageEvent.Raise(10);

// Inspector 리스너 다시 활성화
damageEvent.SetInspectorListenersActive(true);
```

**사용 사례:**

- 컷씬 중 시각/오디오 효과를 일시적으로 음소거
- UI 업데이트를 트리거하지 않고 백엔드 계산 실행
- 로딩 화면 중 씬별 동작 비활성화
- 테스트/디버그 모드에서 게임 로직 시뮬레이션

:::info 범위

이 설정은 GameEventManager를 통해 **Unity Inspector**에서 구성된 리스너에만 영향을 줍니다. 코드에서 `AddListener()`를 통해 등록된 리스너는 **영향을 받지 않으며** 항상 실행됩니다.

:::

</details>

------

## 📊 빠른 참조 표

### 메서드 카테고리

| 카테고리              | 메서드                                                       | 목적                             |
| --------------------- | ------------------------------------------------------------ | -------------------------------- |
| **실행**              | `Raise()`, `Cancel()`                                        | 이벤트 트리거 및 예약된 실행 중지 |
| **스케줄링**          | `RaiseDelayed()`, `RaiseRepeating()`, `CancelDelayed()`, `CancelRepeating()` | 시간 기반 이벤트 실행            |
| **기본 리스너**       | `AddListener()`, `RemoveListener()`, `RemoveAllListeners()`  | 표준 콜백 등록                   |
| **우선순위 리스너**   | `AddPriorityListener()`, `RemovePriorityListener()`          | 순서가 정해진 콜백 실행          |
| **조건부 리스너**     | `AddConditionalListener()`, `RemoveConditionalListener()`    | 제어된 콜백 실행                 |
| **영구 리스너**       | `AddPersistentListener()`, `RemovePersistentListener()`      | 씬 독립적 콜백                   |
| **트리거 이벤트**     | `AddTriggerEvent()`, `RemoveTriggerEvent()`, `RemoveAllTriggerEvents()` | 병렬 이벤트 체인                 |
| **체인 이벤트**       | `AddChainEvent()`, `RemoveChainEvent()`, `RemoveAllChainEvents()` | 순차적 이벤트 체인               |
| **구성**              | `SetInspectorListenersActive()`                              | 런타임 동작 제어                 |