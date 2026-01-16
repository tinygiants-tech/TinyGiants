---
sidebar_label: '게임 이벤트 발생'
sidebar_position: 6
---

# 게임 이벤트 발생

이벤트를 생성하고 설정한 후, 마지막 단계는 **게임 로직에서 이벤트를 트리거하는 것**입니다. 이 페이지에서는 게임 이벤트가 어떻게 작동하는지, 그리고 스크립트에서 이벤트를 발생시키는 방법을 설명합니다.

:::tip 시각적 워크플로우 완료하기

1. ✅ 이벤트 생성 → **[게임 이벤트 생성기](./game-event-creator.md)**
2. ✅ 액션 설정 → **[게임 이벤트 비헤이비어](./game-event-behavior.md)**
3. ✅ **이벤트 발생** ← 현재 단계
   :::

---

## 🎯 게임 이벤트 작동 방식

게임 이벤트는 **이벤트 발생(Raising)**과 **액션 실행(Action Execution)**을 분리(Decouple)합니다.

**전통적인 방식**:

```csharp
// ❌ 강하게 결합됨(Tightly coupled) - 문 로직이 사운드, 애니메이션 등을 직접 알고 있어야 함
public class Door : MonoBehaviour
{
    public AudioSource audioSource;
    public Animator animator;
    public UIManager uiManager;
    
    public void Open()
    {
        audioSource.Play();
        animator.SetTrigger("Open");
        uiManager.ShowNotification("Door opened");
        // 로직이 여러 의존성에 흩어져 있음
    }
}
```

**게임 이벤트 방식**:

```csharp
// ✅ 디커플링됨 - 문은 단지 "무언가 일어났다"는 것만 알면 됨
public class Door : MonoBehaviour
{
    [GameEventDropdown]
    public GameEvent onDoorOpened;
    
    public void Open()
    {
        onDoorOpened.Raise();  // 인스펙터에서 설정된 액션들이 실행됨
    }
}
```

**핵심 차이점**: 액션(사운드, 애니메이션, UI 등)은 스크립트에 하드코딩되지 않고, **이벤트 비헤이비어에서 시각적으로 설정**됩니다.

---

## 📝 기본 사용법: 이벤트 발생시키기

### 1단계: 스크립트에서 이벤트 참조하기

```csharp
using TinyGiants.GameEventSystem.Runtime;
using UnityEngine;

public class DoorController : MonoBehaviour
{
    [GameEventDropdown]  // 스마트 인스펙터 선택기
    public GameEvent onDoorOpened;
    
    [GameEventDropdown]
    public GameEvent onDoorClosed;
    
    public void OpenDoor()
    {
        // 문의 로직 처리
        onDoorOpened.Raise();  // 이벤트 트리거
    }
    
    public void CloseDoor()
    {
        // 문의 로직 처리
        onDoorClosed.Raise();
    }
}
```

---

### 2단계: 인스펙터에서 이벤트 할당하기

**[GameEventDropdown]** 속성은 **타입 안정성이 보장된 검색 가능한 드롭다운**을 제공합니다.

![GameEvent Dropdown](/img/game-event-system/visual-workflow/game-event-raiser/raiser-dropdown.png)

**주요 기능**:

- 🔍 **유사 검색(Fuzzy Search)**: 이름을 입력하여 이벤트를 필터링
- 📁 **카테고리화**: 데이터베이스 및 카테고리별로 그룹화된 이벤트
- 🔒 **타입 안정성**: 호환되는 이벤트 타입만 표시
- ⚡ **빠른 접근**: 에셋을 직접 드래그할 필요 없음

---

### 대안: [GameEventDropdown] 없이 사용하기

표준 public 필드를 사용할 수도 있습니다.

```csharp
public GameEvent onDoorOpened;  // 표준 ScriptableObject 필드
```

**인스펙터 뷰**:

![Standard Object Field](/img/game-event-system/visual-workflow/game-event-raiser/raiser-so.png)

**워크플로우**:

1. 프로젝트 창(이벤트 데이터베이스)에서 이벤트 에셋을 찾음
2. 인스펙터 필드로 드래그 앤 드롭

**권장 사항**: 더 빠르고 타입 안정성이 보장되는 **[GameEventDropdown]**을 사용하는 것이 좋습니다.

---

## 🎨 타입 지정 이벤트 (인자 포함)

이벤트는 액션에 데이터를 전달할 수 있습니다.

### Void 이벤트 (데이터 없음)

```csharp
[GameEventDropdown]
public GameEvent onGameStart;

void Start()
{
    onGameStart.Raise();  // 인자 없음
}
```

---

### 단일 인자 이벤트

```csharp
[GameEventDropdown]
public SingleGameEvent onHealthChanged;

private float health = 100f;

public void TakeDamage(float damage)
{
    health -= damage;
    onHealthChanged.Raise(health);  // 현재 체력 값을 전달
}
```

**타입 안정성**: 드롭다운에 `SingleGameEvent` 타입의 이벤트만 표시되어 타입 불일치를 방지합니다.

---

### 송신자(Sender) + 인자 이벤트

```csharp
[GameEventDropdown]
public GameObjectDamageInfoGameEvent onPlayerDamaged;

public void ApplyDamage(DamageInfo damageInfo)
{
    // Sender = 이 GameObject, Args = 데미지 정보
    onPlayerDamaged.Raise(this.gameObject, damageInfo);
}
```

**사용 사례**: 액션에서 **누가** 이벤트를 트리거했는지와 **어떤** 데이터를 처리해야 하는지 모두 알아야 할 때 사용합니다.

---

## 🔒 타입 안정성 작동 원리

드롭다운은 필드 타입에 따라 이벤트를 **자동으로 필터링**합니다.

```csharp
public class ScoreManager : MonoBehaviour
{
    [GameEventDropdown]
    public Int32GameEvent onScoreChanged;  // public Int32GameEvent만 표시됨
    
    [GameEventDropdown]
    public Int32GameEvent onLevelUp;       // public Int32GameEvent만 표시됨
    
    private int score = 0;
    
    public void AddScore(int points)
    {
        score += points;
        onScoreChanged.Raise(score);  // 정수형 점수 전달
    }
}
```

**드롭다운 필터링 예시**:

```
public Int32GameEvent에 사용 가능한 이벤트:
  ✅ OnScoreChanged (int)
  ✅ OnLevelUp (int)
  ✅ OnComboMultiplier (int)
  ❌ OnPlayerDeath (void) — 필터링됨 (타입 불일치)
  ❌ OnDamage (float) — 필터링됨 (타입 불일치)
```

**이 기능이 중요한 이유**: 런타임이 아닌 **에디터 수정 시점**에서 타입 오류를 잡아낼 수 있습니다.

---

## 🔄 예약된 이벤트 취소하기

이벤트가 **지연(Delay)** 또는 **반복(Repeat)** 설정( **[게임 이벤트 비헤이비어](./game-event-behavior.md)**에서 설정)을 사용하는 경우, 실행을 취소할 수 있습니다.

```csharp
[GameEventDropdown]
public GameEvent repeatingSoundEvent;

void StartAmbientSound()
{
    repeatingSoundEvent.Raise();  // 반복 시작 (비헤이비어 설정 기준)
}

void StopAmbientSound()
{
    repeatingSoundEvent.Cancel();  // 예약된 실행 중지
}
```

**사용 사례**:

- 플레이어가 트리거 구역을 벗어남 → 주변 환경 사운드 취소
- 게임 일시 정지 → 예약된 타이머 이벤트 취소
- 오브젝트 파괴 → 예약된 액션 정리

---

## 🔧 고급: 인스펙터 리스너 제어

자주 사용되지는 않지만, 런타임에 인스펙터에서 설정된 액션을 비활성화할 수 있습니다.

```csharp
[GameEventDropdown]
public GameEvent myEvent;

void DisableCutsceneUI()
{
    myEvent.SetInspectorListenersActive(false);
    // 인스펙터 액션은 실행되지 않고, 코드 리스너만 실행됨
}

void EnableCutsceneUI()
{
    myEvent.SetInspectorListenersActive(true);
    // 인스펙터 액션이 다시 실행됨
}
```

**사용 사례**:

- 컷씬 동안 UI 업데이트를 일시적으로 중단
- 게임 상태에 따라 액션 세트 간 전환

------

## 💡 전체 워크플로우 예시

시각적 워크플로우를 사용하여 완전한 문(Door) 시스템을 만들어 봅시다.

### 1단계: 이벤트 생성

**[게임 이벤트 생성기](./game-event-creator.md)**에서:

![Event Editor Create](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-editor.png)

- `OnDoorOpened` (void 이벤트) 생성
- `OnDoorClosed` (void 이벤트) 생성

---

### 2단계: 액션 설정

**[게임 이벤트 비헤이비어](./game-event-behavior.md)**에서:

![Event Behavior Configure](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-behavior.png)

**OnDoorOpened 이벤트**:

- 액션: `AudioSource.PlayOneShot(doorOpenSound)`
- 액션: `Animator.SetTrigger("Open")`
- 액션: `ParticleSystem.Play()` (먼지 효과)

**OnDoorClosed 이벤트**:

- 액션: `AudioSource.PlayOneShot(doorCloseSound)`
- 액션: `Animator.SetTrigger("Close")`

---

### 3단계: 스크립트 작성

```csharp
using TinyGiants.GameEventSystem.Runtime;
using UnityEngine;

public class DoorController : MonoBehaviour
{
    [GameEventDropdown]
    public GameEvent onDoorOpened;
    
    [GameEventDropdown]
    public GameEvent onDoorClosed;
    
    private bool isOpen = false;
    
    public void ToggleDoor()
    {
        if (isOpen)
        {
            isOpen = false;
            onDoorClosed.Raise();  // 모든 액션이 자동으로 실행됨
        }
        else
        {
            isOpen = true;
            onDoorOpened.Raise();  // 모든 액션이 자동으로 실행됨
        }
    }
    
    // 이 메서드는 다음에서 호출될 수 있습니다:
    // - 인스펙터의 Button OnClick
    // - 충돌/트리거 감지
    // - 기타 게임 시스템
}
```

---

### 4단계: 인스펙터에서 이벤트 할당

![Door Inspector Setup](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-dropdown.png)

1. `DoorController` GameObject 선택
2. 드롭다운을 사용하여 `OnDoorOpened` 이벤트 할당
3. 드롭다운을 사용하여 `OnDoorClosed` 이벤트 할당

**완료!** 스크립트에는 사운드, 애니메이션 또는 VFX 참조가 전혀 없으며, 모든 것이 시각적으로 설정되었습니다.

---

## 🆚 왜 UnityEvent보다 나은가요?

전통적인 UnityEvent 방식에는 게임 이벤트가 해결해 주는 몇 가지 한계가 있습니다.

### 전통적인 UnityEvent의 한계

```csharp
// ❌ 문제 1: 설정이 여러 GameObject에 흩어져 있음
public class Button1 : MonoBehaviour
{
    public UnityEvent onClick;  // Button1의 인스펙터에서 설정됨
}

public class Button2 : MonoBehaviour
{
    public UnityEvent onClick;  // Button2의 인스펙터에서 설정됨
}

// ❌ 문제 2: 모든 사용처를 찾기 어려움
// 씬의 모든 GameObject를 수동으로 뒤져야 함

// ❌ 문제 3: 중앙 제어 불가
// 버튼 사운드를 전역적으로 켜고 끌 수 없음

// ❌ 문제 4: 중복 작업
// 50개의 버튼에 동일한 사운드/VFX 설정이 반복됨
```

---

### 게임 이벤트의 장점

```csharp
// ✅ 해결책: 모든 버튼이 동일한 이벤트를 발생시킴
public class ButtonController : MonoBehaviour
{
    [GameEventDropdown]
    public GameEvent onButtonClick;  // 모든 버튼에 동일한 이벤트 사용
    
    public void OnClick()
    {
        onButtonClick.Raise();
    }
}
```

**이점**:

| 기능 | UnityEvent | 게임 이벤트 |
| ---------------------- | ------------------- | ---------------------------------------- |
| **중앙 집중식 설정** | ❌ GameObject마다 설정 | ✅ 하나의 이벤트 비헤이비어 |
| **모든 사용처 찾기** | ❌ 수동 검색 | ✅ [이벤트 파인더](./game-event-finder.md) |
| **전역 제어** | ❌ 50개 오브젝트 수정 | ✅ 하나의 이벤트 수정 |
| **재사용성** | ❌ 복사 붙여넣기 | ✅ 동일한 에셋 참조 |
| **조건부 로직** | ❌ 코드 작성 필요 | ✅ 시각적 조건 트리 |
| **디버깅** | ❌ 인스펙터만 가능 | ✅ 플로우 그래프 시각화 |

---

### 각각 언제 사용해야 하나요?

**UnityEvent 사용**:

- 일회성 단순 콜백 (예: 튜토리얼 버튼)
- 컴포넌트 전용 로직 (예: 슬라이더가 자신의 라벨을 업데이트)
- 재사용성이 필요 없는 경우

**게임 이벤트 사용**:

- 재사용 가능한 로직 (예: 모든 버튼 클릭 시 동일한 사운드 재생)
- 복잡한 시퀀스 (예: 컷씬, 문의 퍼즐)
- 중앙 제어가 필요한 경우 (예: 모든 UI 사운드 음소거)
- 시각적 디버깅이 필요한 경우 (플로우 그래프)

------

## ❓ 문제 해결

### 드롭다운에 "Manager Missing"이라고 뜸

**원인**: 씬에 `GameEventManager`가 없습니다.

**해결 방법**: 

유니티 상단 툴바에서 게임 이벤트 시스템을 엽니다.

```csharp
Tools > TinyGiants > Game Event System
```

**"Initialize Event System"** 버튼을 클릭하면 씬에 **Game Event Manager** GameObject(싱글톤)가 생성됩니다.

---

### 드롭다운에 "No Active Databases"라고 뜸

**원인**: `GameEventManager`에 할당된 데이터베이스가 없습니다.

**해결 방법**:
1. 씬에서 `GameEventManager` 선택
2. 인스펙터 → Databases 섹션
3. 이벤트 데이터베이스 추가

---

### 드롭다운에 "No Matching Events"라고 뜸

**원인**: 필드 타입과 일치하는 이벤트가 없습니다.

**예시**:
```csharp
[GameEventDropdown]
public StringGameEvent textEvent;  // StringGameEvent이 필요함

// 하지만 데이터베이스에는 다음만 있는 경우:
// - GameEvent (void)
// - public Int32GameEvent
// - SingleGameEvent

결과: 일치하는 이벤트 없음!
```

**해결 방법**: [게임 이벤트 생성기](./game-event-creator.md)를 사용하여 올바른 타입의 이벤트를 생성하세요.

---

### 이벤트가 발생하지 않음

**체크리스트**:
1. ✅ 인스펙터에 이벤트 에셋이 할당되어 있습니까?
2. ✅ `Raise()`가 호출되고 있습니까? (Debug.Log로 확인)
3. ✅ [게임 이벤트 비헤이비어](./game-event-behavior.md)에서 액션이 설정되어 있습니까?
4. ✅ 조건이 충족되고 있습니까? (조건 트리 확인)
5. ✅ 씬에 GameEventManager가 있습니까?

:::tip 시각적 워크플로우 완료!

이제 전체 시각적 워크플로우를 익혔습니다:

1. ✅ 이벤트 생성기에서 이벤트 **생성**
2. ✅ 이벤트 비헤이비어에서 액션 **설정**
3. ✅ UnityEvent 또는 `GameEventDropdown`으로 이벤트 **발생**

**결과**: 디커플링되고 유지보수가 쉬우며 디자이너 친화적인 게임 로직 완성!

:::

:::info 시각적 방식에서 코드 방식으로

이 페이지는 **시각적 워크플로우**(인스펙터 할당을 통한 스크립트 내 이벤트 발생)를 다룹니다. **고급 코드 기법**(런타임 리스너, 조건부 트리거, 이벤트 체인 등)은 **[런타임 API](../scripting/raising-and-scheduling.md)**를 참조하세요.

:::