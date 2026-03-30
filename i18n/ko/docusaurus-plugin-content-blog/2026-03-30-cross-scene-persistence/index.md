---
slug: cross-scene-persistence
title: '크로스씬 이벤트: 아무도 말하지 않지만 모두가 겪는 영속화 문제'
authors: [tinygiants]
tags: [ges, unity, cross-scene, architecture, best-practices]
description: "씬 전환은 이벤트 구독을 깨뜨린다. static 이벤트는 유령 참조를 만든다. DontDestroyOnLoad은 임시방편이다. 씬 로드를 실제로 넘어서 생존하는 이벤트 통신을 구축하는 방법."
image: /img/home-page/game-event-system-preview.png
---

`AudioManager`가 배경 음악을 재생한다. `OnLevelStart`에 구독하여 플레이어가 새 지역에 진입하면 트랙을 변경한다. `DontDestroyOnLoad` 오브젝트에 `AudioManager`를 배치해서 씬 로드 간에 유지되도록 한다. 같은 씬에서만 테스트하고 있으니까 개발 중에는 모든 것이 잘 동작한다.

그러다 누군가 처음으로 Level 1에서 Level 2를 로드한다. 음악이 바뀌지 않는다. `AudioManager`는 살아있다 — `DontDestroyOnLoad`이 제 역할을 했다 — 하지만 이벤트 구독이 전환을 넘기지 못했다. 더 나쁜 경우: 이전 구독이 여전히 남아있고, 파괴된 Level 1의 이벤트 발생자를 가리키고 있어서, 다음에 뭔가가 호출하려 하면 게임플레이 도중에 `MissingReferenceException`이 터진다.

이것이 영속화 문제이며, 씬이 두 개 이상인 모든 Unity 프로젝트가 결국 맞닥뜨린다.

<!-- truncate -->

## 근본적인 긴장

Unity의 씬 시스템과 이벤트 시스템은 오브젝트 수명에 대해 근본적으로 다른 가정 위에 구축되어 있다.

씬은 **일시적**이다. 씬을 로드하고, 사용하고, 언로드한다. 씬의 오브젝트는 씬과 함께 생기고 죽는다. 깔끔하고 예측 가능하며 플레이어가 게임을 경험하는 방식과 일치한다 — 새 지역으로 이동하고, 이전 것은 뒤로 남긴다.

이벤트는 **영속성**이 필요하다. 글로벌 애널리틱스 시스템은 모든 씬의 데미지 이벤트를 들어야 한다. 세이브 시스템은 플레이어가 어떤 레벨에 있든 체크포인트 이벤트에 응답해야 한다. 업적 추적기는 전체 플레이 세션에 걸쳐 데이터를 축적해야 한다.

이 두 모델은 충돌한다. 그리고 Unity는 이를 조화시킬 좋은 도구를 주지 않는다.

## Static 이벤트: 유령 구독 문제

대부분의 개발자가 처음 시도하는 것이 static 이벤트다:

```csharp
public static class GameEvents
{
    public static event Action OnLevelStart;
    public static event Action<int> OnPlayerDamaged;
    public static event Action OnPlayerDied;
}
```

static 이벤트는 클래스에 속하지 어떤 오브젝트에도 속하지 않으므로 씬 로드를 넘어서 유지된다. 문제 해결, 맞지?

아니다. static 이벤트는 유지되지만, **구독하는 오브젝트**는 유지되지 않는다. 씬이 언로드되면, 해당 씬의 모든 MonoBehaviour가 파괴된다. 그 MonoBehaviour 중 하나가 static 이벤트에 구독하고 `OnDisable`이나 `OnDestroy`에서 해제하지 않았다면, 유령 구독이 생긴다 — 파괴된 오브젝트를 가리키는 델리게이트.

다음에 이벤트가 발동하면:

```
MissingReferenceException: The object of type 'EnemySpawner'
has been destroyed but you are still trying to access it.
```

해결법은 당연해 보인다: 항상 `OnDisable`에서 구독을 해제하라. 하지만 `OnDisable`은 씬 전환 중에 자체적인 문제가 있다(곧 더 자세히). 그리고 완벽하게 규율을 지키더라도, 하나의 스크립트에서 하나의 누락된 구독 해제가 씬 전환 시에만 나타나는 버그를 만든다 — 가장 재현하기 어렵고 테스트에서 가장 놓치기 쉬운 종류.

static 이벤트는 또 다른 아키텍처적 문제를 만든다: **모든 것이 글로벌**이다. "이 이벤트는 이 씬에 속한다"거나 "이 이벤트는 이 컨텍스트에서만 관련된다"는 개념이 없다. 전체 프로젝트의 모든 시스템이 모든 이벤트를 보고 구독할 수 있다. `OnApplicationPause` 같은 진정한 글로벌 이벤트에는 괜찮지만, `OnDoorOpened`나 `OnPuzzleSolved` 같은 씬별 이벤트에는 엉망이다.

## 인스턴스 이벤트: 씬과 함께 죽는다

반대 접근법 — MonoBehaviour의 인스턴스 이벤트:

```csharp
public class LevelManager : MonoBehaviour
{
    public event Action OnLevelStart;
    public event Action OnLevelComplete;
}
```

깔끔하고 범위가 한정된다. `LevelManager`에 대한 참조가 있는 오브젝트만 구독할 수 있다. 씬이 언로드되면 `LevelManager`가 파괴되고, 모든 구독이 함께 사라진다. 유령 참조 없음.

하지만 이제 크로스씬 통신이 불가능하다. `AudioManager`(`DontDestroyOnLoad` 세계에 사는)가 현재 씬의 `LevelManager`에 대한 참조가 필요하다. 어떻게 얻나? 매 씬 로드 후에 `FindObjectOfType`? static 레지스트리? 서비스 로케이터? 각 해결책이 복잡성과 커플링을 추가한다 — 바로 이벤트가 제거하기로 한 것을.

그리고 씬이 언로드되면, `AudioManager`가 파괴된 `LevelManager`에 대한 참조를 들고 있다. null 검사 잘 하길.

## DontDestroyOnLoad 임시방편

"`DontDestroyOnLoad` 오브젝트에 이벤트 시스템을 올려놓으면 된다."

가장 흔한 조언이고, 어느 정도는 동작한다. 모든 이벤트를 가진 영속적인 `EventManager`를 만들고 `DontDestroyOnLoad`로 표시하면, 모든 것이 거기에 구독한다.

하지만 `DontDestroyOnLoad`에 대해 사람들이 말하지 않는 것들:

**문제 1: 비-DDOL 오브젝트의 씬 전환 중에 `OnDisable`이 발동한다.** Unity가 씬을 언로드할 때, 해당 씬의 모든 MonoBehaviour가 `OnDisable`과 `OnDestroy`를 받는다. 리스너가 `OnDisable`에서 구독 해제하면(그래야 하듯이), 씬 전환 도중에 구독 해제된다. 이벤트 시스템이 순간적으로 리스너가 비어있게 된다. 이 창 동안에 뭔가 이벤트를 발동하면, 아무도 듣지 않는다.

**문제 2: 전환 중 실행 순서가 보장되지 않는다.** 새 씬이 로드되면, 모든 새 MonoBehaviour에서 `OnEnable`이 발동한다. 하지만 어떤 순서로? `EnemySpawner.OnEnable`이 `LevelManager.OnEnable`보다 먼저 발동하고, 스포너가 `LevelManager`가 아직 초기화하지 않은 이벤트에 구독해야 한다면, null 참조를 얻는다. 내 컴퓨터에서는 동작한다(Unity가 우연히 올바른 순서로 초기화했으니까). QA 테스터의 컴퓨터에서는 동작하지 않는다.

**문제 3: 중복 DDOL 오브젝트.** 영속적인 `EventManager`가 두 번 로드되는 씬에 있으면(다른 시작 씬에서 Play를 누를 때 흔한), 두 개의 `EventManager`가 생긴다. 모든 이벤트가 두 개씩. 리스너 절반은 한 복사본에, 나머지 절반은 다른 복사본에 구독한다. 아무것도 동작하지 않는데 인스펙터에서는 모든 것이 올바르게 보인다.

## 부트스트랩 씬 패턴

일부 팀은 "부트스트랩" 씬으로 중복 문제를 해결한다. 게임이 항상 부트스트랩 씬을 먼저 로드하고, 모든 영속 매니저를 생성한 다음, 실제 게임플레이 씬을 추가적으로 로드한다.

동작하지만, 실질적인 복잡성을 추가한다:

- **아무 씬에서나 Play를 누를 수 없게 된다.** 항상 부트스트랩 씬에서 시작하거나, 테스트 씬 전에 부트스트랩을 자동 로드하는 에디터 도구를 작성해야 한다.
- **로딩 순서가 중요해진다.** 부트스트랩이 게임플레이 씬이 시스템에 접근하기 전에 초기화를 마쳐야 한다. 빠른 로드에서도 보통 로딩 화면이 필요하다.
- **씬 관리가 복잡해진다.** 이제 추가적 씬 로딩을 관리한다. 어떤 씬이 로드되었는지, 로딩 중인지, 언로딩 중인지를 모두 동시에 관리해야 한다.

동작한다. 많은 출시 게임이 이 패턴을 사용한다. 하지만 영속화 문제를 우회하기 위해서만 존재하는 인프라다. 배관이지, 게임플레이가 아니다.

## 멀티씬 에디팅이 문제를 악화시킨다

Unity의 추가적 씬 로딩은 대규모 월드에 강력하다 — 마을 씬, 지형 씬, UI 씬을 동시에 로드한다. 하지만 영속화 문제를 배가시킨다.

어떤 씬이 어떤 이벤트를 소유하나? `OnShopOpened`가 마을 씬에 있고 `OnInventoryChanged`가 플레이어 씬에 있으면, 마을이 언로드될 때 어떻게 되나? `OnShopOpened`가 사라지지만, 아직 로드된 플레이어 씬의 오브젝트가 여전히 리스닝하고 있을 수 있다. 아무것에도 구독되지 않은 상태가 됐는데, 그걸 모른다.

씬 언로드는 깔끔해야 한다. 크로스씬 이벤트 참조가 있으면, 전혀 깔끔하지 않다.

## 라이프사이클 문제

이벤트를 사용할 때 씬 전환 중에 정확히 무슨 일이 일어나는지 추적해 보자:

1. `SceneManager.LoadScene("Level2")`가 호출된다
2. Unity가 현재 씬 언로드를 시작한다
3. 현재 씬의 모든 MonoBehaviour에서 `OnDisable`이 발동한다 (리스너가 구독 해제)
4. 현재 씬의 모든 MonoBehaviour에서 `OnDestroy`가 발동한다
5. 현재 씬이 완전히 언로드된다
6. 새 씬이 로딩을 시작한다
7. 새 씬의 모든 MonoBehaviour에서 `Awake`가 발동한다
8. 새 씬의 모든 MonoBehaviour에서 `OnEnable`이 발동한다 (리스너가 재구독)
9. 새 씬의 모든 MonoBehaviour에서 `Start`가 발동한다

문제는 3단계와 8단계 사이의 갭이다. 잠시 동안 이벤트 시스템에 씬 기반 리스너가 제로다. 이 창 동안 DDOL 오브젝트가 이벤트를 발동하면 허공에 외치는 것이다.

그리고 8단계 내에서, 순서는 다른 머신이나 Unity 버전 간에 결정론적이지 않다. 시스템 A가 시스템 B가 초기화하는 이벤트에 구독해야 할 수 있다. B의 `OnEnable`이 A의 것보다 나중에 실행되면, 하이젠버그로 나타나는 경쟁 조건이다.

크로스씬 영속이 필요한 시스템의 실제 예시:
- **AudioManager** — 어떤 씬에서든 `OnLevelStart`, `OnBossFight`, `OnVictory`를 들어야 한다
- **AnalyticsManager** — 세션의 모든 씬에서 이벤트를 추적해야 한다
- **SaveSystem** — 씬에 관계없이 `OnCheckpointReached`에 응답해야 한다
- **AchievementTracker** — 모든 씬에 걸쳐 진행 데이터를 축적해야 한다

이 모든 것이 어떤 씬에서든 이벤트를 반드시 들어야 하는 시스템이다. 영속화 문제는 학술적이지 않다 — 실제 게임의 실제 기능을 막고 있다.

## GES는 이것을 어떻게 해결하나

GES는 임시방편이 아닌 아키텍처 레벨에서 영속화 문제를 해결한다.

### ScriptableObject 이벤트는 씬 밖에 존재한다

핵심 통찰이다. GES에서 이벤트는 프로젝트의 Assets 폴더에 있는 ScriptableObject 에셋이다 — 어떤 씬에도 속하지 않는다. 프로젝트 수준 리소스이지, 씬 수준 오브젝트가 아니다.

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField]
    private SingleGameEvent onLevelStart;

    [GameEventDropdown, SerializeField]
    private SingleGameEvent onBossFight;
}
```

Level 1이 언로드되고 Level 2가 로드될 때, `onLevelStart` 이벤트 에셋은 아무 데도 가지 않는다. 어느 씬에도 소유되지 않는다. 프로젝트 수준에서, 씬 라이프사이클과 독립적으로 존재한다. `AudioManager`(DDOL)는 같은 이벤트 에셋에 대한 참조를 유지한다. 새 씬의 `LevelManager`도 같은 이벤트 에셋에 대한 참조를 얻는다. 통신이 그냥 동작한다.

static 이벤트 없음. 이벤트 매니저 싱글톤 없음. 부트스트랩 씬 없음. ScriptableObject 아키텍처가 크로스씬 통신을 별도로 옵트인해야 하는 특별 기능이 아닌, 이벤트 저장 방식의 자연스러운 결과로 만든다.

### Behavior Window: 자동 라이프사이클 관리

GES의 Behavior Window는 구독 라이프사이클을 비주얼하게 처리한다. Behavior Window를 통해 리스너를 바인딩하면, `OnEnable`에서 자동 구독하고 `OnDisable`에서 자동 해제한다. 수동 구독 코드 없음. 구독 해제를 잊을 가능성 없음.

![Behavior Window with Persistent Listener](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

이것은 씬 전환이 그냥 동작한다는 뜻이다:

1. 이전 씬 언로드 — `OnDisable` 발동 — Behavior Window가 이전 리스너를 자동 해제
2. 새 씬 로드 — `OnEnable` 발동 — Behavior Window가 새 리스너를 자동 구독
3. 이벤트 에셋은 파괴되지 않았으므로, 구독이 같은 이벤트에 매끄럽게 연결

갭 없음. 경쟁 조건 없음. 유령 참조 없음.

### Persistent 리스너: 명시적 크로스씬 생존

씬 로드를 넘어서 진정으로 유지되어야 하는 시스템 — `AudioManager`, `AnalyticsManager` — 을 위해 GES는 persistent 리스너를 제공한다.

코드에서 `AddPersistentListener`를 사용한다:

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField]
    private SingleGameEvent onLevelStart;

    private void OnEnable()
    {
        onLevelStart.AddPersistentListener(HandleLevelStart);
    }

    private void OnDestroy()
    {
        onLevelStart.RemovePersistentListener(HandleLevelStart);
    }

    private void HandleLevelStart(string levelName)
    {
        // Change music based on level
    }
}
```

Persistent 리스너는 일반 리스너와 별도의 레이어에 저장된다. 씬 전환을 넘어서 생존하는 이유:
- 이벤트가 ScriptableObject다 (씬 밖에 존재)
- 리스너가 DDOL 오브젝트에 있다 (전환을 넘어서 생존)
- Persistent 등록이 이벤트 시스템에 "이것을 로드를 넘어서 유지하라"고 명시적으로 알린다

Behavior Window에는 **Persistent 체크박스**가 있다 — `AddPersistentListener`의 비주얼 버전. 체크하면, 코드 없이도 해당 바인딩이 씬 전환을 넘어서 생존한다.

### 씬 전환 중 일어나는 일 (단계별)

앞서의 같은 전환 추적인데, GES와 함께:

1. `SceneManager.LoadScene("Level2")`가 호출된다
2. Unity가 Level 1 언로드를 시작한다
3. Level 1 MonoBehaviour에서 `OnDisable` 발동 — Behavior Window가 리스너를 자동 해제
4. Level 1 MonoBehaviour에서 `OnDestroy` 발동
5. Level 1이 완전히 언로드된다
6. **이벤트 에셋은 건드려지지 않는다** — ScriptableObject이므로, 씬 오브젝트가 아니다
7. **Persistent 리스너는 건드려지지 않는다** — DDOL 오브젝트에 등록되어 있다
8. Level 2가 로딩을 시작한다
9. Level 2 MonoBehaviour에서 `OnEnable` 발동 — Behavior Window가 리스너를 자동 구독
10. Level 2 MonoBehaviour에서 `Start` 발동

결정적인 차이: 5단계와 9단계 사이에서, 이벤트 시스템이 비어있지 않다. Persistent 리스너가 여전히 활성이다. 로딩 중에 DDOL 시스템이 이벤트를 발동하면, persistent 리스너가 듣는다. 씬별 리스너는 사라졌다(올바르게), 하지만 글로벌 시스템은 연결을 잃지 않는다.

### 영속성을 위한 씬 셋업

![Scene Setup for Persistent Events](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

씬 셋업은 간단하다: 영속 매니저들은 persistent 리스너 바인딩을 가진 DDOL 오브젝트에 존재한다. 씬별 오브젝트는 일반 Behavior Window 바인딩을 사용한다. 이벤트 에셋은 어떤 씬에서든 접근 가능한 공유 데이터베이스에 위치한다.

![Persistent Event Editor](/img/game-event-system/examples/09-persistent-event/demo-09-editor.png)

### 멀티 데이터베이스 동적 로딩

많은 씬이 있는 대규모 프로젝트를 위해 GES는 여러 이벤트 데이터베이스를 지원한다. 컨텍스트별로 이벤트를 정리할 수 있다:

- **Core 데이터베이스** — 시작 시 로드되는 글로벌 이벤트 (`OnApplicationPause`, `OnSaveRequested`, `OnAchievementUnlocked`)
- **Combat 데이터베이스** — 전투 씬이 활성일 때 로드 (`OnDamageDealt`, `OnEnemyDefeated`)
- **UI 데이터베이스** — UI 씬과 함께 로드 (`OnMenuOpened`, `OnSettingsChanged`)

![Manager with Multiple Databases](/img/game-event-system/visual-workflow/game-event-manager/manager-databases.png)

씬별 데이터베이스를 해당 씬과 함께 로드한다. 씬이 언로드되면 함께 언로드한다. Core 데이터베이스는 항상 로드된 상태다. 언로드된 데이터베이스의 이벤트는 비활성이 된다 — 발동하지 않으며, Raise를 시도하면 에러가 아닌 no-op이다.

이것은 static 이벤트에 없는 범위 지정("이 이벤트는 이 씬이 로드됐을 때만 존재한다")을 인스턴스 이벤트의 취약성("이 이벤트는 이 오브젝트가 죽으면 죽는다") 없이 제공한다.

### 주의해야 할 안티패턴

피해야 할 실수 하나: `OnDestroy`에서 persistent 리스너를 제거하는 것을 잊는 것.

```csharp
// BAD - persistent listener leaks if this object is destroyed
private void OnEnable()
{
    onLevelStart.AddPersistentListener(HandleLevelStart);
}

// GOOD - clean up in OnDestroy for DDOL objects
private void OnDestroy()
{
    onLevelStart.RemovePersistentListener(HandleLevelStart);
}
```

일반 리스너는 `OnDisable`에서 구독 해제한다. Persistent 리스너는 `OnDestroy`에서 구독 해제해야 한다 — persistent 리스너의 핵심이 씬 전환 중의 `OnDisable`을 넘어서 생존하는 것이기 때문이다. 제거를 `OnDisable`에 넣으면 목적이 무산된다.

GES의 Runtime Monitor(특히 Warnings 탭)는 `DontDestroyOnLoad`가 아닌 오브젝트에 등록된 persistent 리스너를 플래그한다. 거의 항상 버그다 — 이벤트 시스템에 "이 리스너를 씬 로드를 넘어서 유지하라"고 말하지만, 오브젝트 자체가 로드를 넘기지 못한다.

## 더 큰 그림

크로스씬 영속성은 단순한 기술적 문제가 아니다 — 전체 프로젝트 구조에 영향을 미치는 아키텍처적 결정이다. 잘못된 선택은 싱글톤, 서비스 로케이터, 부트스트랩 씬, 로딩 순서 의존성, 모든 스크립트에 산재한 방어적 null 검사로 연쇄적으로 번진다.

GES의 접근법 — 명시적 영속성 제어가 있는 ScriptableObject 이벤트 — 은 "모든 것이 글로벌"과 "아무것도 씬 경계를 넘지 못한다" 사이에서 선택할 필요가 없다는 뜻이다. 이벤트는 프로젝트 수준에 존재한다. 리스너가 자신의 필요에 따라 영속성을 선택한다. 라이프사이클은 일반적인 경우에는 자동이고 특별한 경우에는 명시적이다.

`AudioManager`는 persistent 리스너로 한 번 구독하고 전체 세션 동안 모든 씬의 이벤트를 듣는다. `EnemySpawner`는 Behavior Window를 통해 구독하고, 씬 언로드 시 자동으로 연결이 끊기고, 다음 씬에서 자동으로 재연결된다. 두 패턴이 같은 이벤트에 공존한다. 특별한 설정 없음. 부트스트랩 씬 없음. 경쟁 조건 없음.

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
