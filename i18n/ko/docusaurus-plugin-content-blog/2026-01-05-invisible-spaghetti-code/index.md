---
slug: invisible-spaghetti-code
title: '보이지 않는 스파게티 코드에 작별을: 당신의 이벤트 시스템이 프로젝트를 망치고 있는 이유'
authors: [tinygiants]
tags: [ges, unity, architecture, decoupling, beginner]
description: "기존 Unity 이벤트 시스템은 런타임에 깨지는 보이지 않는 의존성을 만든다. ScriptableObject 기반 이벤트와 GUID 보호가 이 문제를 어떻게 영구적으로 해결하는지 알아보자."
image: /img/home-page/game-event-system-preview.png
---

메서드 이름 하나를 바꿨다. 딱 하나 — `OnPlayerDied`를 `OnPlayerDefeated`로. 게임 디자이너가 표현을 부드럽게 해달라고 해서. Play를 눌렀다. 아무 일도 안 일어난다. 컴파일 에러도 없다. 경고도 없다. Inspector에서 UnityEvent로 연결되어 있던 씬 오브젝트 열 개가 그냥... 조용히 멈췄다. 3일 뒤 QA가 보고하거나, 더 최악의 경우 유저가 직접 발견하기 전까지는 알 수가 없다.

익숙한 상황이라면, 축하한다 — 보이지 않는 스파게티 코드를 만난 것이다. IDE에서 안 보이고, 컴파일러 경고도 안 뜨고, 의존성 그래프에도 나타나지 않는 종류의 기술 부채다. 그저 거기 앉아서 최악의 타이밍에 터지길 기다리고 있을 뿐이다.

이건 실력 문제가 아니다. 아키텍처 문제다. 그리고 대부분의 Unity 개발자가 인정하고 싶어하는 것보다 훨씬 흔한 일이다.

<!-- truncate -->

## 아무도 말 안 하는 세 가지 치명적 문제

수년간 Unity 프로젝트를 만들면서, 거의 모든 이벤트 기반 Unity 프로젝트에서 반복적으로 나타나는 세 가지 문제를 발견했다. 전통적인 의미의 버그는 아니다. 시간이 지날수록 누적되는 구조적 결함이다.

### 문제 1: 보이지 않는 의존성 (대체 누가 듣고 있는 건가?)

이런 시나리오를 생각해보자. `GameManager`가 플레이어 레벨업 시 이벤트를 발생시킨다. 프로젝트 어딘가에서 UI가 레벨 표시를 업데이트하려고 듣고 있다. 오디오 시스템이 팡파레를 재생하려고 듣고 있다. 업적 시스템이 마일스톤을 확인하려고 듣고 있다. 애널리틱스 시스템이 이벤트를 기록하려고 듣고 있다.

자, 이제 질문이다: 프로젝트의 모든 스크립트를 검색하지 않고, 지금 이 이벤트를 구독하고 있는 시스템이 뭔지 말할 수 있는가?

말할 수 없다. 전수 검색 없이는. 바로 이게 문제다.

기존 C# 이벤트나 delegate를 쓰면 구독이 수십 개 파일에 흩어져 있다. 전체 그림을 한눈에 볼 수 있는 곳이 없다. 연결은 보이지 않는다 — 런타임에만, 메모리 안에서, Play를 멈추는 순간 사라지는 delegate 체인으로만 존재한다.

```csharp
// GameManager.cs
public static event Action OnPlayerLevelUp;

// Somewhere in LevelUI.cs
GameManager.OnPlayerLevelUp += UpdateLevelDisplay;

// Somewhere in AudioManager.cs
GameManager.OnPlayerLevelUp += PlayLevelUpFanfare;

// Somewhere in AchievementTracker.cs
GameManager.OnPlayerLevelUp += CheckLevelMilestones;

// Somewhere in AnalyticsService.cs
GameManager.OnPlayerLevelUp += LogLevelUpEvent;
```

파일 4개. 구독 포인트 4개. 어디서든 한눈에 파악할 수 있는 가시성은 0. 실제 프로젝트에서 이벤트 50개를 곱해보라.

### 문제 2: 이름 변경 시 런타임 파손

이건 정말 교활하다. UnityEvent는 메서드 이름을 문자열로 직렬화한다. 다시 말하겠다: **문자열**이다. Inspector를 통해 바인딩된 메서드의 이름을 바꾸면 Unity는 모른다. 직렬화된 데이터는 여전히 옛날 이름을 가리킨다. 컴파일 에러 없음. 경고 없음. 런타임에 그냥 침묵.

```csharp
// Before: works fine
public void OnPlayerDied() { /* ... */ }

// After: renamed for clarity
public void OnPlayerDefeated() { /* ... */ }
// Every Inspector binding to "OnPlayerDied" is now broken.
// Zero compiler warnings. Zero runtime errors. Just... nothing happens.
```

문자열 기반 이벤트 시스템도 같은 문제를 갖고 있는데 더 심하다 — 최소한 UnityEvent는 씬의 모든 오브젝트를 클릭하면 어느 GameObject에 바인딩이 있는지 보여주기라도 한다.

```csharp
// String-based event system
EventBus.Subscribe("player_died", HandlePlayerDeath);
EventBus.Publish("player_died"); // Works

// Someone "fixes" the naming convention
EventBus.Subscribe("PlayerDied", HandlePlayerDeath);
EventBus.Publish("player_died"); // Still uses old string. Silent failure.
```

### 문제 3: 크로스 씬 이벤트 지옥

Unity의 씬 시스템과 이벤트 시스템은 근본적으로 충돌한다. static 이벤트는 씬 로드를 넘어 유지된다 — 파괴된 오브젝트의 유령 구독이 남는다는 뜻이다. 인스턴스 기반 이벤트는 씬과 함께 죽는다 — 씬 간 통신이 불가능하다는 뜻이다.

```csharp
// Static event approach: ghost subscription problem
public class EnemySpawner : MonoBehaviour
{
    void OnEnable()
    {
        GameManager.OnWaveStart += SpawnWave;
    }

    // If you forget OnDisable, or the object is destroyed
    // without OnDisable firing, you get a null reference
    // on the NEXT scene load when the event fires
    void OnDisable()
    {
        GameManager.OnWaveStart -= SpawnWave;
    }
}
```

고전적인 "해결법"은 `OnDisable`이나 `OnDestroy`에서 구독을 해제하는 것이다. 하지만 딱 하나의 해제 누락, 정상적인 라이프사이클 없이 오브젝트가 파괴되는 엣지 케이스 하나만 있으면, `MissingReferenceException`이나 20분 플레이 후에나 나타나는 메모리 누수를 만나게 된다.

## 기존 접근법 (그리고 왜 전부 부족한가)

대부분의 Unity 개발자가 손에 잡는 도구들에 대해 솔직해지자.

### 순수 C# Events / Delegates

**장점:** 타입 안전, 빠름, C# 개발자에게 익숙.
**치명적 결함:** 가시성 제로. Inspector 통합 없음. 구독이 코드베이스 전체에 흩어져 있음. 프로젝트 전체를 grep 하지 않고는 누가 듣고 있는지 알 방법 없음.

### UnityEvents

**장점:** Inspector에서 바인딩이 보임. 디자이너가 코드 없이 연결 가능.
**치명적 결함:** 문자열 기반 메서드 직렬화. 메서드 이름 바꾸면 전부 조용히 깨짐. 매번 호출할 때마다 리플렉션 오버헤드. 모든 씬에 걸친 이벤트의 리스너를 한눈에 볼 방법 없음.

### Singleton Event Manager

**장점:** 단일 접근 포인트. 이해하기 쉬움.
**치명적 결함:** 싱글톤에 강한 커플링. 테스트 어려움. 로드 순서 문제. 모든 것이 유지보수 악몽이 되는 하나의 God 객체에 의존.

```csharp
// The singleton pattern that starts simple and grows into a monster
public class EventManager : MonoBehaviour
{
    public static EventManager Instance;

    // Month 1: just a few events
    public event Action OnPlayerDied;
    public event Action<int> OnScoreChanged;

    // Month 6: the file is 800 lines long
    public event Action<Enemy, Vector3, float> OnEnemyDamaged;
    public event Action<string, int, bool, ItemData> OnInventoryChanged;
    // ... 40 more events ...
}
```

### 문자열 기반 Event Bus

**장점:** 완전한 디커플링. 새 이벤트 추가 쉬움.
**치명적 결함:** 타입 안전성 없음. 오타가 조용한 실패를 유발. 자동완성 없음. 리팩터링 지원 없음. 본질적으로 C# 안에서 JavaScript의 타입 시스템을 재현한 것이다.

이 솔루션 중 어느 것도 세 가지 문제를 동시에 해결하지 못한다. 하나를 고치면서 다른 하나를 악화시킬 뿐이다.

## ScriptableObject 이벤트 패턴: 에셋으로서의 이벤트

여기서부터 흥미로워진다. 이벤트가 코드 한 줄이 아니라 **실체** — 프로젝트에 존재하고, 정체성을 갖고, 어떤 씬의 어떤 오브젝트에서든 참조할 수 있는 에셋이라면?

이것이 Game Event System (GES)의 핵심 통찰이다. 이벤트는 ScriptableObject 에셋이다. `.asset` 파일로 프로젝트에 존재한다. 만들고, 이름 짓고, 폴더에 정리하고, Inspector를 통해 참조한다.

![GES Architecture](/img/game-event-system/intro/overview/architecture.png)

이것이 이벤트 통신의 작동 방식을 완전히 바꾼다:

**송신자** → Event Asset 참조 → **수신자**도 같은 Event Asset 참조

송신자는 수신자를 모른다. 수신자는 송신자를 모른다. 둘 다 이벤트만 안다. 이것이 진짜 디커플링이다 — "모든 것이 의존하는 싱글톤을 통한 디커플링"이 아니라, 진정한 아키텍처적 분리다.

```csharp
// Sender: raises the event. Doesn't know or care who's listening.
public class PlayerHealth : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent onPlayerDefeated; // Drag the asset in

    public void TakeDamage(float damage)
    {
        currentHealth -= damage;
        if (currentHealth <= 0f)
        {
            onPlayerDefeated.Raise(); // That's it. Done.
        }
    }
}
```

수신 측에서는 코드를 작성할 필요가 없다. Behavior Window에서 Action을 설정하기만 하면 된다.

![Action Behavior](/img/game-event-system/visual-workflow/game-event-behavior/behavior-window-full.png)

### 비주얼 바인딩의 힘

GES를 쓰면 모든 것이 보인다. 이벤트 에셋을 클릭하면 Inspector에 해당 에셋을 참조하는 모든 오브젝트가 표시된다 — 송신자와 수신자 모두. Event Editor 창을 열면 전체 이벤트 아키텍처를 한눈에 볼 수 있다.

![Event Editor](/img/game-event-system/visual-workflow/game-event-editor/editor-window-full.png)

이건 단순한 편의가 아니다. 이벤트 기반 코드를 디버그하고 유지보수하는 방식의 근본적인 변화다. 뭔가 잘못되면 파일을 grep할 필요 없이 이벤트 에셋을 클릭하면 관련된 모든 것을 즉시 확인할 수 있다.

![Inspector Binding](/img/game-event-system/visual-workflow/game-event-finder/game-event-finder-grouped.png)

## GUID 보호의 실제 작동 원리

GES가 이름 변경 문제를 영구적으로 해결하는 방법이다. 모든 이벤트 에셋은 GUID를 가진다 — 에셋 생성 시 Unity가 할당하는 고유 식별자. 컴포넌트가 이벤트를 참조할 때 이름이나 경로로 참조하는 것이 아니다. GUID로 참조한다.

실제로 이게 뭘 의미할까?

- **이벤트 에셋 이름 변경?** 참조 유지. GUID는 변하지 않는다.
- **에셋을 다른 폴더로 이동?** 참조 유지. 같은 GUID.
- **리스너의 필드 이름 변경?** 상관없음 — 바인딩은 에셋에 대한 것이지 문자열이 아니다.
- **프로젝트 구조 전체 리팩터링?** `.asset` 파일만 존재하면 모든 참조가 온전하다.

이것은 Unity가 모든 에셋 참조(프리팹, 머티리얼, 텍스처)에 사용하는 것과 동일한 메커니즘을, 이벤트 아키텍처에 적용한 것이다. 커스텀 핵이 아니다 — Unity의 직렬화 시스템을 설계 의도대로 활용하는 것이다.

기존 방식과 비교해보자:

```csharp
// Traditional: rename "OnPlayerDied" to "OnPlayerDefeated" and everything breaks
UnityEvent onPlayerDied; // String-serialized method bindings are now invalid

// GES: rename the asset from "PlayerDied" to "PlayerDefeated"
// Result: every reference updates automatically. Nothing breaks. Ever.
```

## 디커플링 아키텍처의 실전 적용

실제 사례를 살펴보자. RPG를 만들고 있다. 플레이어가 보스를 처치한다. 벌어져야 할 일:

1. 승리 팡파레 재생
2. "보스 처치!" UI 팝업 표시
3. 다음 지역 해금
4. 업적 달성
5. 애널리틱스 이벤트 기록
6. 게임 저장

기존 방식: `BossEnemy` 스크립트가 6개 시스템에 대한 직접 참조(또는 이벤트 구독)를 가진다. 하나라도 변경하면 보스전이 깨질 수 있다.

GES 방식: `BossEnemy` 스크립트는 참조 하나 — `BossDefeated` 이벤트 에셋만 가진다. 보스가 죽으면 해당 이벤트를 발생시킨다. 6개 시스템은 각각 독립적으로 같은 이벤트 에셋을 구독한다. 보스는 그 어느 시스템도 모른다.

```csharp
// BossEnemy.cs — knows about NOTHING except its own event
public class BossEnemy : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent onBossDefeated;

    private void Die()
    {
        // Play death animation, etc.
        onBossDefeated.Raise();
    }
}
```

오디오 시스템, UI 시스템, 진행 시스템, 업적 시스템, 애널리틱스 시스템, 저장 시스템 — 모든 응답은 `BossDefeated` 이벤트의 Behavior Window에서 **Event Action**으로 설정한다. 대상 오브젝트를 드래그하고, 메서드를 선택한다. 코드 커플링 없음. 보이지 않는 의존성 없음. 이름 변경이 뭔가를 조용히 깨트릴 가능성 없음.

일곱 번째 응답을 추가하고 싶다면 — 예를 들어 루트 드롭 스폰? `BossDefeated`의 Behavior Window를 열고, 새 Event Action을 추가하고, 루트 스포너의 스폰 메서드를 지정하면 된다. 기존 코드 한 줄도 건드릴 필요 없다.

애널리틱스 로깅을 제거하고 싶다면? Behavior Window에서 해당 Event Action을 삭제하면 된다. 다른 시스템에는 영향 없다.

이것이 진짜 디커플링이다. "모든 것이 의존하는 중간자를 통한 디커플링"이 아니라, 공유되고 가시적이며 GUID로 보호되는 이벤트 에셋을 통해 통신하는 진정한 독립 시스템이다.

## 크로스 씬 문제: 해결

유령 구독 문제를 기억하는가? ScriptableObject 이벤트는 ScriptableObject가 씬 밖에 존재하기 때문에 이 문제를 우아하게 해결한다. 프로젝트 레벨 에셋이다.

이벤트 리스너는 활성화될 때 구독하고 비활성화될 때 구독 해제한다. 이것은 Unity의 `OnEnable`/`OnDisable` 라이프사이클을 통해 자동으로 처리된다 — Behavior Window 바인딩이 이를 대신 관리한다. 씬이 언로드되면 모든 GameObject가 파괴되고, `OnDisable`이 실행되어 깔끔하게 구독 해제된다. 유령 참조 없음. 메모리 누수 없음. `MissingReferenceException` 없음.

그리고 이벤트 에셋 자체가 씬 로드를 넘어 유지되므로, 크로스 씬 통신을 무료로 얻는다. 게임플레이 씬에서 발생한 이벤트가 UI 씬의 응답을 트리거할 수 있다. 로딩 화면의 이벤트가 메인 메뉴의 시스템을 초기화할 수 있다. 이벤트 에셋이 중간자이기 때문에 그냥 작동한다 — 씬에 바인딩된 오브젝트가 아니라.

```csharp
// This works across scenes automatically.
// The event asset exists at the project level.
// Listeners subscribe/unsubscribe via OnEnable/OnDisable.
// No special setup. No DontDestroyOnLoad hacks. No singletons.
```

## 전환하기

보이지 않는 스파게티로 가득한 프로젝트를 보고 있다면 — 흩어진 `+=` 구독, 문자열 기반 이벤트, 취약한 UnityEvent 바인딩 — 리팩터링이 막막하게 느껴질 수 있다. 하지만 한 번에 다 할 필요는 없다.

하나의 시스템부터 시작하자. 프로젝트에서 가장 고통스러운 이벤트 인터랙션을 골라라 — 가장 자주 깨지는 것, 리팩터링하기 무서운 것. 딱 그것만 GES 이벤트 에셋으로 교체해보자. 어떤 느낌인지 보자. 이벤트를 클릭하면 연결된 모든 것이 보일 때 디버깅이 얼마나 쉬워지는지 보자.

그 다음 하나 더. 또 하나 더. 점차 보이지 않는 스파게티가 풀린다. 아키텍처가 눈에 보이게 된다. 이벤트 흐름이 50개 파일에 흩어진 숨겨진 delegate 체인이 아니라, 실제로 보고 추론할 수 있는 그래프가 된다.

## 핵심 정리

1. **보이지 않는 의존성이 진짜 적이다.** 이벤트를 쓰는 것 자체가 아니라, 그것을 볼 수 있고 관리할 수 있느냐가 핵심이다.
2. **문자열 기반 직렬화는 시한폭탄이다.** GUID 기반 참조는 런타임 실패의 한 범주를 통째로 제거한다.
3. **크로스 씬 통신에 핵이 필요하면 안 된다.** ScriptableObject 이벤트는 씬 계층 구조 밖에 존재하므로 이 문제를 해결한다.
4. **디커플링이란 양쪽 모두 상대방을 모르는 것이다.** "디커플링된" 시스템이 양쪽 모두 공유 싱글톤을 참조해야 한다면, 실제로 디커플링된 것이 아니다.
5. **시각적 디버깅이 아키텍처에 대한 사고방식을 바꾼다.** 이벤트 흐름을 볼 수 있을 때 더 나은 시스템을 설계하게 된다.

보이지 않는 스파게티가 보이지 않을 필요도 없고, 스파게티일 필요도 없다.

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
