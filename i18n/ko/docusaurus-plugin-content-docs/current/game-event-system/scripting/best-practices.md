---
sidebar_label: '실행 순서 및 베스트 프랙티스'

sidebar_position: 4
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

# 실행 순서 및 베스트 프랙티스 (Execution Order & Best Practices)

GameEvent가 콜백을 실행하고 이벤트 흐름을 관리하는 방식을 이해하는 것은 안정적이고 성능이 뛰어난 이벤트 기반 시스템을 구축하는 데 필수적입니다. 이 가이드에서는 실행 순서, 일반적인 패턴, 주의 사항 및 최적화 전략을 다룹니다.

------

## 🎯 실행 순서 (Execution Order)

### 시각적 타임라인

`myEvent.Raise()`가 호출되면 다음과 같은 정밀한 순서에 따라 실행됩니다.

```text
myEvent.Raise() 🚀
      │
      ├── 1️⃣ 기본 리스너 (Basic Listeners - FIFO 순서)
      │      │
      │      ├─► OnUpdate() 📝
      │      │      ✓ 실행됨
      │      │
      │      └─► OnRender() 🎨
      │             ✓ 실행됨
      │
      ├── 2️⃣ 우선순위 리스너 (Priority Listeners - 높은 순 → 낮은 순)
      │      │
      │      ├─► [우선순위 100] Critical() ⚡
      │      │      ✓ 가장 먼저 실행됨
      │      │
      │      ├─► [우선순위 50] Normal() 📊
      │      │      ✓ 두 번째로 실행됨
      │      │
      │      └─► [우선순위 0] LowPriority() 📌
      │             ✓ 마지막에 실행됨
      │
      ├── 3️⃣ 조건부 리스너 (Conditional Listeners - 우선순위 + 조건)
      │      │
      │      └─► [우선순위 10] IfHealthLow() 💊
      │             │
      │             ├─► 조건 확인: 체력 < 20?
      │             │      ├─► ✅ True → 리스너 실행
      │             │      └─► ❌ False → 리스너 건너뜀
      │             │
      │             └─► (다음 조건 확인...)
      │
      ├── 4️⃣ 상주 리스너 (Persistent Listeners - 교차 씬)
      │      │
      │      └─► GlobalLogger() 📋
      │             ✓ 항상 실행됨 (DontDestroyOnLoad)
      │
      ├── 5️⃣ 트리거 이벤트 (Trigger Events - 병렬/팬아웃) 🌟
      │      │
      │      ├─────► lightOnEvent.Raise() 💡
      │      │          (독립적으로 실행)
      │      │
      │      ├─────► soundEvent.Raise() 🔊
      │      │          (독립적으로 실행)
      │      │
      │      └─────► particleEvent.Raise() ✨
      │                 (독립적으로 실행)
      │
      │      ⚠️ 하나가 실패해도 다른 이벤트는 계속 실행됨
      │
      └── 6️⃣ 체인 이벤트 (Chain Events - 순차적/엄격한 순서) 🔗
             │
             └─► fadeOutEvent.Raise() 🌑
                    ✓ 성공
                    │
                    ├─► ⏱️ 대기 (지속 시간/지연)
                    │
                    └─► loadSceneEvent.Raise() 🗺️
                           ✓ 성공
                           │
                           ├─► ⏱️ 대기 (지속 시간/지연)
                           │
                           └─► fadeInEvent.Raise() 🌕
                                  ✓ 성공
                                  
                                  🛑 단계 중 하나라도 실패 시 → 체인 중단(STOP)
```

------

### 실행 특성

| 단계 | 패턴 | 타이밍 | 실패 시 동작 | 유스케이스 |
| ------------------------- | --------------------- | ----------------------- | ----------------------- | --------------------------- |
| **기본 리스너** | 순차적 | 동일 프레임, 동기 | 다음으로 계속 | 표준 콜백 |
| **우선순위 리스너** | 순차적 (정렬됨) | 동일 프레임, 동기 | 다음으로 계속 | 순서가 보장된 처리 |
| **조건부 리스너** | 순차적 (필터링됨) | 동일 프레임, 동기 | False 시 건너뜀, 계속 진행 | 상태 의존적 로직 |
| **상주 리스너** | 순차적 | 동일 프레임, 동기 | 다음으로 계속 | 전역/교차 씬 시스템 |
| **트리거 이벤트** | **병렬적** | 동일 프레임, 독립적 | 다른 이벤트 영향 없음 | 부수 효과, 알림 |
| **체인 이벤트** | **순차적** | 멀티 프레임, 차단형 | **전체 체인 중단** | 컷씬, 시퀀스 연출 |

------

### 주요 차이점 설명

<Tabs> <TabItem value="listeners" label="리스너 (1-4단계)" default>

**특징:**

- 현재 프레임에서 **동기적으로** 실행됩니다.
- 정의된 순서에 따라 하나씩 차례대로 실행됩니다.
- 각 리스너는 독립적입니다.
- 리스너 하나가 실패(예외 발생)해도 다른 리스너 실행을 멈추지 않습니다.

**예시:**

```csharp
healthEvent.AddListener(UpdateUI);           // 1순위 실행
healthEvent.AddPriorityListener(SaveGame, 100); // 2순위 실행 (높은 우선순위)
healthEvent.AddConditionalListener(ShowWarning, 
    health => health < 20);                  // 3순위 실행 (조건 충족 시)

healthEvent.Raise(15f);
// 실행 순서: SaveGame() → UpdateUI() → ShowWarning() (체력 < 20일 때)
```

**타임라인:**

```
🖼️ 프레임 1024
🚀 healthEvent.Raise(15.0f)
│
├─► 💾 SaveGame()          ⏱️ 0.1ms
├─► 🖥️ UpdateUI()          ⏱️ 0.3ms
└─► ⚠️ ShowWarning()       ⏱️ 0.2ms
│
📊 총 비용: 0.6ms | ⚡ 상태: 동기 방식 (동일 프레임)
```

</TabItem> <TabItem value="triggers" label="트리거 (5단계)">

**특징:**

- **병렬적**(팬아웃 패턴)으로 실행됩니다.
- 모든 트리거는 독립적으로 발생합니다.
- 한 트리거의 실패가 다른 트리거에 영향을 주지 않습니다.
- 동기적으로 실행되지만 논리적으로는 병렬 구조를 가집니다.

**예시:**

```csharp
// 보스 사망 시, 독립적인 여러 이벤트 트리거
bossDefeatedEvent.AddTriggerEvent(stopBossMusicEvent, priority: 100);
bossDefeatedEvent.AddTriggerEvent(playVictoryMusicEvent, priority: 90);
bossDefeatedEvent.AddTriggerEvent(spawnLootEvent, priority: 50);
bossDefeatedEvent.AddTriggerEvent(showVictoryUIEvent, priority: 40);
bossDefeatedEvent.AddTriggerEvent(saveCheckpointEvent, priority: 10);

bossDefeatedEvent.Raise();
// 5개 이벤트가 모두 발생하며, 우선순위에 따라 정렬되지만 서로 독립적입니다.
// spawnLootEvent가 실패해도 나머지 이벤트는 정상 실행됩니다.
```

**타임라인:**

```
🖼️ 프레임 2048
🚀 bossDefeatedEvent.Raise()
│
├─► 🚀 stopBossMusicEvent.Raise()     ✅ 성공
├─► 🚀 playVictoryMusicEvent.Raise()  ✅ 성공
├─► 🚀 spawnLootEvent.Raise()         ❌ 실패! (예외 격리됨)
├─► 🚀 showVictoryUIEvent.Raise()     ✅ 실행됨 (복원력 있음)
└─► 🚀 saveCheckpointEvent.Raise()    ✅ 실행됨 (복원력 있음)
│
📊 결과: 4/5 성공 | 🛡️ 상태: 결함 허용 (격리된 실패)
```

</TabItem> <TabItem value="chains" label="체인 (6단계)">

**특징:**

- 차단(Blocking) 방식을 사용하여 **순차적으로** 실행됩니다.
- 엄격한 순서 보장: A → B → C
- 각 단계 사이의 지연 시간을 지원합니다.
- 단계 중 하나라도 실패하면 **전체 체인이 중단**됩니다.

**예시:**

```csharp
// 컷씬 시퀀스
cutsceneStartEvent.AddChainEvent(fadeOutEvent, delay: 0f, duration: 1f);
cutsceneStartEvent.AddChainEvent(hideUIEvent, delay: 0f, duration: 0.5f);
cutsceneStartEvent.AddChainEvent(playCutsceneEvent, delay: 0f, duration: 5f);
cutsceneStartEvent.AddChainEvent(fadeInEvent, delay: 0f, duration: 1f);
cutsceneStartEvent.AddChainEvent(showUIEvent, delay: 0f, duration: 0f);

// 체인 실행
cutsceneStartEvent.Raise();
```

**타임라인:**

```
🖼️ T+0.0s | 프레임 0
🚀 cutsceneStartEvent.Raise()
└─► 🎬 fadeOutEvent.Raise()             ✅ 시작됨

        ┆  (Δ 1.0초 지연)
        ▼
🖼️ T+1.0s | 프레임 60
└─► 🖥️ hideUIEvent.Raise()              ✅ 실행됨

        ┆  (Δ 0.5초 지연)
        ▼
🖼️ T+1.5s | 프레임 90
└─► 🎞️ playCutsceneEvent.Raise()         ✅ 실행됨

        ┆  (Δ 5.0초 지연)
        ▼
🖼️ T+6.5s | 프레임 390
└─► 🎬 fadeInEvent.Raise()              ✅ 실행됨

        ┆  (Δ 1.0초 지연)
        ▼
🖼️ T+7.5s | 프레임 450
└─► 🖥️ showUIEvent.Raise()              ✅ 완료됨

📊 총 타임라인: ~7.5초 | 🎞️ 총 시간: 450 프레임
```

**실패 시나리오:**

```csharp
🖼️ T+0.0s | 프레임 0
🚀 cutsceneStartEvent.Raise()           ✅ 시작됨

        ┆  (Δ 1.0초)
        ▼
🖼️ T+1.0s | 프레임 60
🚀 fadeOutEvent.Raise()                 ✅ 실행됨

        ┆  (Δ 0.5초)
        ▼
🖼️ T+1.5s | 프레임 90
🚀 hideUIEvent.Raise()                  ✅ 실행됨

        ┆  (Δ 5.0초)
        ▼
🖼️ T+6.5s | 프레임 390
🚀 playCutsceneEvent.Raise()            ❌ 치명적 오류 발생!
                                        
        🛑 [ 서킷 브레이커 활성화 ]
        ⚠️ 상태 비동기화를 방지하기 위해 논리 체인이 즉시 중단됨.

        ⏩ fadeInEvent.Raise()          🚫 실행되지 않음
        ⏩ showUIEvent.Raise()          🚫 실행되지 않음
```

</TabItem> </Tabs>

------

## 💡 베스트 프랙티스 (Best Practices)

### 1. 리스너 관리

#### 항상 구독 해제하기

메모리 누수는 이벤트 시스템에서 발생하는 가장 흔한 문제입니다. 리스너를 사용한 후에는 항상 정리해야 합니다.

<Tabs> <TabItem value="bad" label="❌ 나쁜 예">

```csharp
public class PlayerController : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onPlayerDeath;
    
    void Start()
    {
        onPlayerDeath.AddListener(HandleDeath);
    }
    
    // 오브젝트가 파괴되어도 리스너가 메모리에 남아 있습니다!
    // 이는 메모리 누수와 잠재적인 크래시의 원인이 됩니다.
}
```

</TabItem> <TabItem value="good" label="✅ 좋은 예">

```csharp
public class PlayerController : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onPlayerDeath;
    
    void OnEnable()
    {
        onPlayerDeath.AddListener(HandleDeath);
    }
    
    void OnDisable()
    {
        // 메모리 누수 방지를 위해 항상 구독을 해제하십시오.
        onPlayerDeath.RemoveListener(HandleDeath);
    }
    
    void HandleDeath()
    {
        Debug.Log("Player died!");
    }
}
```

</TabItem> </Tabs>

------

#### OnEnable/OnDisable 패턴 사용하기

유니티에서는 OnEnable/OnDisable 패턴을 사용하는 것이 권장되는 방식입니다.

```csharp
public class HealthUI : MonoBehaviour
{
    [GameEventDropdown] public GameEvent<float> healthChangedEvent;
    
    void OnEnable()
    {
        // 활성화 시 구독
        healthChangedEvent.AddListener(OnHealthChanged);
    }
    
    void OnDisable()
    {
        // 비활성화 시 구독 해제
        healthChangedEvent.RemoveListener(OnHealthChanged);
    }
    
    void OnHealthChanged(float newHealth)
    {
        // UI 업데이트 로직
    }
}
```

**이점:**

- 오브젝트가 비활성화되거나 파괴될 때 자동으로 정리됨
- 리스너가 필요한 순간에만 활성화됨
- 중복 구독 방지
- 오브젝트 풀링(Object Pooling)과 완벽하게 호환됨

------

### 2. 스케줄 관리

#### 취소를 위해 핸들 저장하기

나중에 작업을 취소해야 하는 경우 항상 `ScheduleHandle`을 저장해 두십시오.

<Tabs> <TabItem value="bad" label="❌ 나쁜 예">

```csharp
public class PoisonEffect : MonoBehaviour
{
    void ApplyPoison()
    {
        // 나중에 이 작업을 취소할 방법이 없습니다!
        poisonEvent.RaiseRepeating(damagePerTick, 1f, repeatCount: 10);
    }
    
    void CurePoison()
    {
        // 독 효과를 멈출 수 없습니다!
        // 10회 모두 실행될 때까지 계속 작동합니다.
    }
}
```

</TabItem> <TabItem value="good" label="✅ 좋은 예">

```csharp
public class PoisonEffect : MonoBehaviour
{
    private ScheduleHandle _poisonHandle;
    
    void ApplyPoison()
    {
        // 핸들을 저장합니다.
        _poisonHandle = poisonEvent.RaiseRepeating(
            damagePerTick, 
            1f, 
            repeatCount: 10
        );
    }
    
    void CurePoison()
    {
        // 저장된 핸들을 사용하여 독 효과를 취소할 수 있습니다.
        if (poisonEvent.CancelRepeating(_poisonHandle))
        {
            Debug.Log("Poison cured!");
        }
    }
    
    void OnDisable()
    {
        // 비활성화 시 정리
        poisonEvent.CancelRepeating(_poisonHandle);
    }
}
```

</TabItem> </Tabs>

------

#### 다중 스케줄 패턴

여러 스케줄을 관리할 때는 컬렉션을 사용하십시오.

```csharp
public class BuffManager : MonoBehaviour
{
    [GameEventDropdown] public GameEvent<string> buffTickEvent;
    
    private Dictionary<string, ScheduleHandle> _activeBuffs = new();
    
    public void ApplyBuff(string buffName, float interval, int duration)
    {
        // 기존에 동일한 버프가 있다면 취소
        if (_activeBuffs.TryGetValue(buffName, out var existingHandle))
        {
            buffTickEvent.CancelRepeating(existingHandle);
        }
        
        // 새 버프 적용
        var handle = buffTickEvent.RaiseRepeating(
            buffName, 
            interval, 
            repeatCount: duration
        );
        
        _activeBuffs[buffName] = handle;
    }
    
    public void RemoveBuff(string buffName)
    {
        if (_activeBuffs.TryGetValue(buffName, out var handle))
        {
            buffTickEvent.CancelRepeating(handle);
            _activeBuffs.Remove(buffName);
        }
    }
    
    void OnDisable()
    {
        // 모든 버프 취소
        foreach (var handle in _activeBuffs.Values)
        {
            buffTickEvent.CancelRepeating(handle);
        }
        _activeBuffs.Clear();
    }
}
```

------

### 3. 트리거 및 체인 관리

#### 안전한 제거를 위해 핸들 사용하기

다른 시스템의 트리거/체인을 의도치 않게 제거하지 않도록 항상 핸들을 사용하십시오.

<Tabs> <TabItem value="bad" label="❌ 위험한 예">

```csharp
public class DoorSystem : MonoBehaviour
{
    void SetupDoor()
    {
        doorOpenEvent.AddTriggerEvent(lightOnEvent);
    }
    
    void Cleanup()
    {
        // 위험: lightOnEvent로 연결된 '모든' 트리거를 제거합니다.
        // 다른 시스템에서 등록한 트리거까지 모두 사라집니다!
        doorOpenEvent.RemoveTriggerEvent(lightOnEvent);
    }
}
```

</TabItem> <TabItem value="good" label="✅ 안전한 예">

```csharp
public class DoorSystem : MonoBehaviour
{
    private TriggerHandle _lightTriggerHandle;
    
    void SetupDoor()
    {
        // 핸들을 저장합니다.
        _lightTriggerHandle = doorOpenEvent.AddTriggerEvent(lightOnEvent);
    }
    
    void Cleanup()
    {
        // 당신이 생성한 특정 트리거만 제거합니다.
        doorOpenEvent.RemoveTriggerEvent(_lightTriggerHandle);
    }
}
```

</TabItem> </Tabs>

------

#### 다중 트리거/체인 정리

복잡한 시스템에서는 구조화된 접근 방식을 사용하십시오.

```csharp
public class CutsceneManager : MonoBehaviour
{
    // 정리를 위해 모든 핸들을 저장
    private readonly List<ChainHandle> _cutsceneChains = new();
    private readonly List<TriggerHandle> _cutsceneTriggers = new();
    
    void SetupCutscene()
    {
        // 컷씬 시퀀스 구축
        var chain1 = startEvent.AddChainEvent(fadeOutEvent, duration: 1f);
        var chain2 = startEvent.AddChainEvent(playVideoEvent, duration: 5f);
        var chain3 = startEvent.AddChainEvent(fadeInEvent, duration: 1f);
        
        _cutsceneChains.Add(chain1);
        _cutsceneChains.Add(chain2);
        _cutsceneChains.Add(chain3);
        
        // 효과를 위한 병렬 트리거 추가
        var trigger1 = startEvent.AddTriggerEvent(stopGameplayMusicEvent);
        var trigger2 = startEvent.AddTriggerEvent(hideCrosshairEvent);
        
        _cutsceneTriggers.Add(trigger1);
        _cutsceneTriggers.Add(trigger2);
    }
    
    void SkipCutscene()
    {
        // 모든 체인 정리
        foreach (var chain in _cutsceneChains)
        {
            startEvent.RemoveChainEvent(chain);
        }
        _cutsceneChains.Clear();
        
        // 모든 트리거 정리
        foreach (var trigger in _cutsceneTriggers)
        {
            startEvent.RemoveTriggerEvent(trigger);
        }
        _cutsceneTriggers.Clear();
    }
}
```

------

### 4. 우선순위 사용 가이드

#### 우선순위 값 규칙

프로젝트 전체에서 일관된 우선순위 척도를 사용하십시오.

```csharp
// 우선순위 상수 정의
public static class EventPriority
{
    public const int CRITICAL = 1000;    // 반드시 가장 먼저 실행되어야 함
    public const int HIGH = 100;         // 중요한 시스템
    public const int NORMAL = 0;         // 기본 우선순위
    public const int LOW = -100;         // 나중에 실행되어도 무방함
    public const int CLEANUP = -1000;    // 최종 정리 작업
}

// 사용 예시
healthEvent.AddPriorityListener(SavePlayerData, EventPriority.CRITICAL);
healthEvent.AddPriorityListener(UpdateHealthBar, EventPriority.HIGH);
healthEvent.AddPriorityListener(PlayDamageSound, EventPriority.NORMAL);
healthEvent.AddPriorityListener(UpdateStatistics, EventPriority.LOW);
```

------

#### 우선순위 안티 패턴

<Tabs> <TabItem value="bad" label="❌ 피해야 할 것">

```csharp
// 무작위이거나 일관성 없는 우선순위 값을 사용하지 마십시오.
healthEvent.AddPriorityListener(SystemA, 523);
healthEvent.AddPriorityListener(SystemB, 891);
healthEvent.AddPriorityListener(SystemC, 7);

// 순서가 중요하지 않은 곳에 우선순위를 남용하지 마십시오.
uiClickEvent.AddPriorityListener(PlaySound, 50);
uiClickEvent.AddPriorityListener(PlayParticle, 49);
// 이런 경우에는 기본 리스너를 사용하십시오!
```

</TabItem> <TabItem value="good" label="✅ 모범 사례">

```csharp
// 순서가 정말 중요할 때만 우선순위를 사용하십시오.
saveGameEvent.AddPriorityListener(ValidateData, 100);   // 데이터 검증이 먼저
saveGameEvent.AddPriorityListener(SerializeData, 50);   // 그다음 직렬화
saveGameEvent.AddPriorityListener(WriteToFile, 0);      // 마지막으로 파일 쓰기

// 순서가 상관없다면 기본 리스너를 사용하십시오.
buttonClickEvent.AddListener(PlaySound);
buttonClickEvent.AddListener(ShowFeedback);
buttonClickEvent.AddListener(LogAnalytics);
```

</TabItem> </Tabs>

------

### 5. 조건부 리스너

#### 효과적인 조건 설계

조건식은 간단하고 빠르게 실행되도록 설계하십시오.

<Tabs> <TabItem value="bad" label="❌ 무거운 작업">

```csharp
// 조건식 안에서 무거운 연산을 수행하지 마십시오.
enemySpawnEvent.AddConditionalListener(
    SpawnBoss,
    () => {
        // 나쁜 예: 조건문 내부에서 복잡한 계산 수행
        var enemies = FindObjectsOfType<Enemy>();
        var totalHealth = enemies.Sum(e => e.Health);
        var averageLevel = enemies.Average(e => e.Level);
        return totalHealth < 100 && averageLevel > 5;
    }
);
```

</TabItem> <TabItem value="good" label="✅ 효율적인 작업">

```csharp
// 상태를 캐싱하고, 조건식은 단순한 체크만 하도록 만드십시오.
private bool _shouldSpawnBoss = false;

void UpdateGameState()
{
    // 매 프레임이 아닌 특정 시점에만 캐시된 상태 업데이트
    _shouldSpawnBoss = enemyManager.TotalHealth < 100 
                    && enemyManager.AverageLevel > 5;
}

void Setup()
{
    // 단순하고 빠른 조건 체크
    enemySpawnEvent.AddConditionalListener(
        SpawnBoss,
        () => _shouldSpawnBoss
    );
}
```

</TabItem> </Tabs>

------

## ⚠️ 흔한 실수 (Common Pitfalls)

### 1. 메모리 누수 (Memory Leaks)

**문제:** 오브젝트가 파괴될 때 리스너를 구독 해제하지 않음.

**증상:**

- 시간이 지남에 따라 메모리 사용량 증가
- 파괴된 오브젝트에 대한 에러 발생
- null 참조가 된 오브젝트에서 콜백 실행

**해결책:**

```csharp
// 항상 OnEnable/OnDisable 패턴을 사용하십시오.
void OnEnable() => myEvent.AddListener(OnCallback);
void OnDisable() => myEvent.RemoveListener(OnCallback);
```

------

### 2. 스케줄 핸들 유실

**문제:** 핸들을 저장하지 않고 스케줄을 생성함.

**증상:**

- 반복 이벤트를 취소할 수 없음
- 오브젝트가 파괴된 후에도 이벤트가 계속 발생
- 불필요한 실행으로 인한 리소스 낭비

**해결책:**

```csharp
private ScheduleHandle _handle;

void StartTimer()
{
    _handle = timerEvent.RaiseRepeating(1f);
}

void StopTimer()
{
    timerEvent.CancelRepeating(_handle);
}
```

------

### 3. 무분별한 제거 영향

**문제:** 핸들 기반 제거 대신 타겟 기반 제거 방식을 사용하여 부작용 발생.

**증상:**

- 다른 시스템의 트리거/체인이 의도치 않게 제거됨
- 이벤트가 실행되지 않는 이유를 찾기 힘든 디버깅 지옥 발생
- 시스템 간 결합도 증가 및 안정성 저하

**해결책:**

```csharp
// 핸들을 저장하고 정확한 대상만 제거하십시오.
private TriggerHandle _myTrigger;

void Setup()
{
    _myTrigger = eventA.AddTriggerEvent(eventB);
}

void Cleanup()
{
    eventA.RemoveTriggerEvent(_myTrigger);  // 안전함!
}
```

------

### 4. 재귀적 이벤트 발생 (Recursive Event Raises)

**문제:** 이벤트 리스너가 동일한 이벤트를 다시 발생시켜 무한 루프 발생.

**증상:**

- Stack overflow 예외 발생
- 유니티 에디터 프리징(멈춤)
- 실행 횟수의 기하급수적 증가

**예시:**

```csharp
// ❌ 위험: 무한 재귀!
void Setup()
{
    healthEvent.AddListener(OnHealthChanged);
}

void OnHealthChanged(float health)
{
    // 이 코드가 OnHealthChanged를 다시 트리거합니다!
    healthEvent.Raise(health - 1);  // ← 무한 루프 발생
}
```

**해결책:**

```csharp
// ✅ 플래그를 사용하여 재귀 방지
private bool _isProcessingHealthChange = false;

void OnHealthChanged(float health)
{
    if (_isProcessingHealthChange) return;  // 재귀 방지
    
    _isProcessingHealthChange = true;
    
    // 이제 여기서 안전하게 이벤트 발생 가능
    if (health <= 0)
    {
        deathEvent.Raise();
    }
    
    _isProcessingHealthChange = false;
}
```

------

## 🚀 성능 최적화 (Performance Optimization)

### 1. 리스너 수 최소화

코드가 고도로 최적화되어 있지만, 각 리스너마다 약간의 오버헤드는 존재합니다. 가능한 경우 하나로 통합하십시오.

<Tabs> <TabItem value="bad" label="❌ 비효율적">

```csharp
// 관련된 작업에 대해 여러 리스너 등록
healthEvent.AddListener(UpdateHealthBar);
healthEvent.AddListener(UpdateHealthText);
healthEvent.AddListener(UpdateHealthIcon);
healthEvent.AddListener(UpdateHealthColor);
```

</TabItem> <TabItem value="good" label="✅ 최적화됨">

```csharp
// 하나의 리스너에서 모든 UI 업데이트 처리
healthEvent.AddListener(UpdateHealthUI);

void UpdateHealthUI(float health)
{
    // 모든 UI 업데이트를 일괄 처리
    healthBar.value = health / maxHealth;
    healthText.text = $"{health:F0}";
    healthIcon.sprite = GetHealthIcon(health);
    healthColor.color = GetHealthColor(health);
}
```

</TabItem> </Tabs>

------

### 2. 리스너 내부 무거운 작업 피하기

리스너는 가볍게 유지하십시오. 무거운 작업은 코루틴이나 비동기(Async) 방식으로 이동시키십시오.

<Tabs> <TabItem value="bad" label="❌ 차단 방식">

```csharp
void OnDataLoaded(string data)
{
    // 나쁜 예: 모든 후속 리스너의 실행을 차단함
    var parsed = JsonUtility.FromJson<LargeData>(data);
    ProcessComplexData(parsed);  // 50ms 소요
    SaveToDatabase(parsed);      // 100ms 소요
}
```

</TabItem> <TabItem value="good" label="✅ 비동기 방식">

```csharp
void OnDataLoaded(string data)
{
    // 좋은 예: 비동기 처리를 시작하고 프레임을 차단하지 않음
    StartCoroutine(ProcessDataAsync(data));
}

IEnumerator ProcessDataAsync(string data)
{
    // 파싱
    var parsed = JsonUtility.FromJson<LargeData>(data);
    yield return null;
    
    // 처리
    ProcessComplexData(parsed);
    yield return null;
    
    // 저장
    SaveToDatabase(parsed);
}
```

</TabItem> </Tabs>

------

### 3. 대리자(Delegate) 할당 캐싱

매 프레임 새로운 대리자 할당이 발생하는 것을 피하십시오.

<Tabs> <TabItem value="bad" label="❌ 잦은 할당">

```csharp
void OnEnable()
{
    // 매번 새로운 대리자 할당 발생
    updateEvent.AddListener(() => UpdateHealth());
}
```

</TabItem> <TabItem value="good" label="✅ 캐싱됨">

```csharp
void OnEnable()
{
    // 동일한 메서드 참조를 재사용하여 할당 방지
    updateEvent.AddListener(UpdateHealth);
}

void UpdateHealth()
{
    // 구현부
}
```

</TabItem> </Tabs>

------

## 📊 요약 체크리스트 (Summary Checklist)

`GameEvent`로 작업할 때 이 체크리스트를 활용하십시오.

### 리스너 관리

- [ ] OnDisable에서 항상 구독 해제를 수행했는가?
- [ ] OnEnable/OnDisable 패턴을 사용 중인가?
- [ ] 가능한 경우 대리자 참조를 캐싱했는가?
- [ ] 리스너 로직이 가벼운가?

### 스케줄 관리

- [ ] 취소가 필요한 경우 ScheduleHandle을 저장했는가?
- [ ] OnDisable에서 스케줄을 취소했는가?
- [ ] 다중 스케줄에는 컬렉션을 사용했는가?
- [ ] 오브젝트 파괴 시 정리를 수행했는가?

### 트리거/체인 관리

- [ ] 안전한 제거를 위해 핸들을 사용했는가?
- [ ] 정리를 위해 핸들을 컬렉션에 저장했는가?
- [ ] 병렬은 트리거, 순차는 체인을 올바르게 선택했는가?
- [ ] 체인의 경우 ExecuteChainEvents() 호출을 잊지 않았는가?

### 성능

- [ ] 관련된 리스너들을 하나로 통합했는가?
- [ ] 무거운 작업은 코루틴/비동기로 분리했는가?
- [ ] 단순하고 빠른 조건식을 사용했는가?
- [ ] 재귀적 이벤트 발생을 방지했는가?

### 우선순위 및 조건

- [ ] 일관된 우선순위 척도를 사용했는가?
- [ ] 순서가 중요할 때만 우선순위를 적용했는가?
- [ ] 조건식은 단순하게 유지되고 캐싱되는가?
- [ ] 우선순위 의존성을 문서화했는가?