---
sidebar_label: '리스닝 전략'
sidebar_position: 2
---

# 리스닝 전략

이벤트 발동이 신호를 전송하는 것이라면, **리스닝**은 실제 게임 로직이 발생하는 곳입니다.

Game Event System은 계층화된 리스닝 아키텍처를 제공하여 *무엇*이 응답하는지뿐만 아니라 *언제* 그리고 *어떤 조건에서* 응답하는지를 제어할 수 있도록 합니다.

---

## 🚦 실행 파이프라인

이벤트가 발동되면 리스너는 엄격하고 결정론적인 순서로 실행됩니다. 이 파이프라인을 이해하는 것은 종속성을 관리하는 데 중요합니다(예: UI보다 먼저 데이터가 업데이트되도록 보장).

1.  **기본 리스너** (코드)
2.  **Inspector 바인딩** (씬 비주얼)
3.  **우선순위 리스너** (정렬된 코드)
4.  **조건부 리스너** (필터링된 코드)
5.  **영구 리스너** (글로벌/씬 간)
6.  **Flow Graph** (트리거 및 체인)

---

## 1. 기본 리스너 (표준)

이것은 로직을 바인딩하는 가장 일반적인 방법입니다. 표준 C# Event 또는 `UnityEvent`와 정확히 동일하게 동작합니다.

### 사용법
다른 리스너와 관련하여 실행 순서가 중요하지 않은 표준적이고 중요하지 않은 게임플레이 로직에 사용하세요.
```csharp
public class PlayerHealth : MonoBehaviour
{
    [GameEventDropdown] public Int32GameEvent onTakeDamage;

    private void OnEnable()
    {
        // 구독
        onTakeDamage.AddListener(OnDamageReceived);
    }

    private void OnDisable()
    {
        // 구독 해제 (메모리 누수 방지를 위해 중요!)
        onTakeDamage.RemoveListener(OnDamageReceived);
    }

    private void OnDamageReceived(int amount)
    {
        Debug.Log($"아야! {amount} 데미지를 받았습니다.");
    }
}
```

:::warning 익명 함수 (람다)
나중에 구독을 해제할 필요가 없다고 확신하지 않는 한 람다 표현식(예: AddListener(() => DoThing()))의 사용을 피하세요. 익명 인스턴스가 손실되기 때문에 나중에 특정 람다 리스너를 제거할 **수 없습니다**.
:::

------

## 2. 우선순위 리스너 (정렬)

여러 스크립트가 동일한 이벤트를 리스닝할 때 실행 순서는 일반적으로 정의되지 않습니다. **우선순위 리스너**는 정수 가중치를 주입할 수 있도록 하여 이 문제를 해결합니다.

### 실행 규칙

- **높은 숫자** = **먼저** 실행됨.
- **낮은 숫자** = **나중에** 실행됨.

### 사용법

**데이터 로직**과 **뷰 로직**을 분리하는 데 완벽합니다.
```csharp
// 1. 데이터 시스템 (높은 우선순위)
// 새로운 체력 값을 계산하기 위해 먼저 실행되어야 합니다.
onPlayerHit.AddPriorityListener(CalculateHealth, 100);

// 2. UI 시스템 (낮은 우선순위)
// 나중에 실행됩니다. 이제 업데이트된 체력 값을 안전하게 읽을 수 있습니다.
onPlayerHit.AddPriorityListener(UpdateHealthBar, 0);
```

### Sender 및 Arguments 지원

우선순위 리스너는 제네릭과 sender 페이로드를 완벽하게 지원합니다.
```csharp
// 우선순위와 함께 리스닝하며 Sender와 Args를 모두 받습니다
onCombatEvent.AddPriorityListener(OnCombatLog, 10);

void OnCombatLog(GameObject sender, DamageInfo info) { ... }
```

------

## 3. 조건부 리스너 (Predicates)

때로는 이벤트를 리스닝하고 싶지만 특정 기준이 충족될 때만 로직을 실행하고 싶을 수 있습니다. 모든 콜백 내부에 if문을 작성하는 대신 **Predicate**를 등록할 수 있습니다.

### 로직 흐름

1. 이벤트 발동됨.
2. 시스템이 **조건 함수**를 호출합니다.
3. true 반환 ➔ 리스너 실행.
4. false 반환 ➔ 리스너 건너뜀.

### 사용법

고빈도 이벤트에서 노이즈를 필터링하는 데 적합합니다.
```csharp
// 체력이 실제로 0일 때만 'Die' 로직 트리거
onHealthChanged.AddConditionalListener(
    OnDeath, 
    condition: (currentHealth) => currentHealth <= 0
);

// sender가 Player일 때만 응답
onInteraction.AddConditionalListener(
    OpenMenu, 
    condition: (sender, args) => sender.CompareTag("Player")
);
```

------

## 4. 영구 리스너 (글로벌)

표준 리스너는 GameObject가 파괴될 때 함께 파괴됩니다(예: 새 씬 로딩). **영구 리스너**는 글로벌 매니저(DontDestroyOnLoad)에 등록되며 씬 전환에서 살아남습니다.

### 사용법

게임 전체에 걸쳐 지속되는 **AudioManager**, **Analytics** 또는 **SaveSystem**과 같은 글로벌 매니저에 이상적입니다.
```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onLevelStart;

    void Awake()
    {
        DontDestroyOnLoad(this);
        
        // 이 리스너는 씬 변경 후에도 계속 작동합니다
        onLevelStart.AddPersistentListener(PlayLevelMusic);
    }
    
    // 참고: 이 객체가 실제로 파괴될 경우 여전히 수동으로 제거해야 합니다
    void OnDestroy()
    {
        onLevelStart.RemovePersistentListener(PlayLevelMusic);
    }
}
```

:::danger 타겟 안전성
영구 리스너의 타겟 객체가 파괴되면(예: 일반 적), 시스템이 null 참조를 감지하고 실행을 건너뛰며 경고를 출력합니다. 항상 OnDestroy에서 영구 리스너의 등록을 해제하세요.
:::

------

## 🧹 안전성 및 유지보수

### 리스너 제거

항상 Add 호출과 Remove 호출을 쌍으로 사용하세요. API는 모든 리스너 타입에 대해 대칭적인 제거 메서드를 제공합니다:

- RemoveListener(action)
- RemovePriorityListener(action)
- RemoveConditionalListener(action)
- RemovePersistentListener(action)

### 최후의 수단 (RemoveAllListeners)

드문 경우(예: 풀링 리셋 또는 게임 종료)에 이벤트를 완전히 정리하고 싶을 수 있습니다.
```csharp
// 기본, 우선순위 및 조건부 리스너를 지웁니다.
// 안전을 위해 영구 리스너는 지우지 않습니다.
myEvent.RemoveAllListeners();
```

------

## 🧩 요약: 어떤 전략을 사용해야 할까요?

| 요구사항                                   | 전략            | 이유                                              |
| ------------------------------------------ | --------------- | ------------------------------------------------- |
| **"언제 발생하는지만 알려주세요."**        | **기본**        | 가장 낮은 오버헤드, 표준 동작.                    |
| **"UI 업데이트 전에 실행되어야 합니다."**  | **우선순위**    | 실행 순서 보장(높은 우선순위가 먼저).             |
| **"체력 < 0일 때만 실행하세요."**          | **조건부**      | 깔끔한 코드, 소스에서 로직 필터링.                |
| **"다음 씬에서도 계속 리스닝하세요."**     | **영구**        | 씬 로딩/언로딩에서 살아남음.                      |

---

## 📜 API 요약

| 메서드 시그니처                                              | 반환   | 설명                                                         |
| :----------------------------------------------------------- | :----- | :----------------------------------------------------------- |
| **기본 리스너**                                              |        |                                                              |
| `AddListener(UnityAction call)`                              | `void` | 기본 void 리스너를 추가합니다.                               |
| `AddListener(UnityAction<T> call)`                           | `void` | 하나의 인수를 가진 기본 리스너를 추가합니다.                 |
| `AddListener(UnityAction<TSender, TArgs> call)`              | `void` | sender와 argument를 가진 기본 리스너를 추가합니다.           |
| `RemoveListener(UnityAction call)`                           | `void` | 기본 void 리스너를 제거합니다.                               |
| `RemoveListener(UnityAction<T> call)`                        | `void` | 하나의 인수를 가진 기본 리스너를 제거합니다.                 |
| `RemoveListener(UnityAction<TSender, TArgs> call)`           | `void` | sender와 argument를 가진 기본 리스너를 제거합니다.           |
| **우선순위 리스너**                                          |        |                                                              |
| `AddPriorityListener(UnityAction call, int priority)`        | `void` | 실행 우선순위를 가진 void 리스너를 추가합니다.               |
| `AddPriorityListener(UnityAction<T> call, int priority)`     | `void` | 실행 우선순위를 가진 타입 리스너를 추가합니다.               |
| `AddPriorityListener(UnityAction<TSender, TArgs> call, int priority)` | `void` | 실행 우선순위를 가진 sender 리스너를 추가합니다.             |
| `RemovePriorityListener(UnityAction call)`                   | `void` | void 우선순위 리스너를 제거합니다.                           |
| `RemovePriorityListener(UnityAction<T> call)`                | `void` | 타입 우선순위 리스너를 제거합니다.                           |
| `RemovePriorityListener(UnityAction<TSender, TArgs> call)`   | `void` | sender 우선순위 리스너를 제거합니다.                         |
| **조건부 리스너**                                            |        |                                                              |
| `AddConditionalListener(UnityAction call, Func<bool> condition, int priority)` | `void` | 조건으로 보호되는 void 리스너를 추가합니다.                  |
| `AddConditionalListener(UnityAction<T> call, Func<T, bool> condition, int priority)` | `void` | 조건으로 보호되는 타입 리스너를 추가합니다.                  |
| `AddConditionalListener(UnityAction<TSender, TArgs> call, Func<TSender, TArgs, bool> condition, int priority)` | `void` | 조건으로 보호되는 sender 리스너를 추가합니다.                |
| `RemoveConditionalListener(UnityAction call)`                | `void` | void 조건부 리스너를 제거합니다.                             |
| `RemoveConditionalListener(UnityAction<T> call)`             | `void` | 타입 조건부 리스너를 제거합니다.                             |
| `RemoveConditionalListener(UnityAction<TSender, TArgs> call)` | `void` | sender 조건부 리스너를 제거합니다.                           |
| **영구 리스너**                                              |        |                                                              |
| `AddPersistentListener(UnityAction call, int priority)`      | `void` | 글로벌 void 리스너를 추가합니다(DontDestroyOnLoad).          |
| `AddPersistentListener(UnityAction<T> call, int priority)`   | `void` | 글로벌 타입 리스너를 추가합니다.                             |
| `AddPersistentListener(UnityAction<TSender, TArgs> call, int priority)` | `void` | 글로벌 sender 리스너를 추가합니다.                           |
| `RemovePersistentListener(UnityAction call)`                 | `void` | 글로벌 void 리스너를 제거합니다.                             |
| `RemovePersistentListener(UnityAction<T> call)`              | `void` | 글로벌 타입 리스너를 제거합니다.                             |
| `RemovePersistentListener(UnityAction<TSender, TArgs> call)` | `void` | 글로벌 sender 리스너를 제거합니다.                           |
| **글로벌 정리**                                              |        |                                                              |
| `RemoveAllListeners()`                                       | `void` | **기본**, **우선순위** 및 **조건부** 리스너를 지웁니다. <br/>*(참고: 안전을 위해 영구 리스너는 지우지 않습니다).* |