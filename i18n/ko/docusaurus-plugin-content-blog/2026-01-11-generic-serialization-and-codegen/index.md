---
slug: generic-serialization-and-codegen
title: 'Unity 제네릭 직렬화의 벽: 타입 안전한 이벤트에 보일러플레이트 세금은 불필요하다'
authors: [tinygiants]
tags: [ges, unity, architecture, codegen, tutorial]
description: "Unity는 제네릭 타입을 직렬화할 수 없다. 이벤트 타입마다 구체 클래스가 필요하다는 뜻이다. 보일러플레이트 지옥 — 도구가 전부 생성해주지 않는 한."
image: /img/home-page/game-event-system-preview.png
---

`GameEvent<T>`를 만들었다. 깔끔하고, 타입 안전하고, 우아하다. 체력 업데이트용 `GameEvent<float>` 필드를 만들고 `[SerializeField]`를 붙였다. Inspector로 전환했다. 필드가 안 보인다. 그냥... 없다. Unity가 0으로 나누기를 요청한 것처럼 빈 패널로 쳐다보고 있다.

Unity의 가장 오래된 아키텍처 두통이다. 직렬화 시스템이 제네릭을 이해하지 못한다. 한 번도 이해한 적 없다. 타입 안전하고 데이터 기반인 이벤트 시스템을 만들려고 시도한 모든 개발자가 이 벽에 정면으로 부딪혔다.

사소한 불편이 아니다. 아키텍처 전체를 오염시키는 종류의 제한이다. 타입 안전성을 포기하거나, 보일러플레이트에 익사하거나, 아름다운 제네릭 설계가 Inspector에 절대 닿지 못한다는 걸 받아들여야 한다. 수년간 커뮤니티의 답은 "그냥 구체 클래스를 직접 작성해라"였다. 그런데 보일러플레이트가 100% 예측 가능하다면, 왜 사람이 쓰고 있는 건가?

<!-- truncate -->

## Unity가 제네릭을 직렬화할 수 없는 이유

고치려고 하기 전에, 내부에서 실제로 무슨 일이 벌어지는지 이해해보자.

Unity의 직렬화 시스템 — Inspector, 프리팹 저장, 씬 파일, 에셋 저장의 엔진 — 은 C# 제네릭이 게임 개발에서 흔하지 않던 시대에 설계됐다. 알려진 고정 메모리 레이아웃을 가진 구체 타입에 대해 동작한다. 직렬화기가 필드를 만나면, 컴파일 타임에 정확한 타입을 알아야 메모리 할당, Inspector GUI 그리기, 디스크 쓰기가 가능하다.

Unity가 이런 필드를 만나면:

```csharp
[SerializeField] private GameEvent<float> healthChanged;
```

어떻게 해야 할지 모른다. 제네릭 타입 매개변수 `T`는 직렬화기 관점에서 메모리 레이아웃이 고정되지 않았다는 의미다. 어떤 필드를 보여줘야 할지 몰라서 Inspector 드로어를 만들 수 없다. 구체 타입을 모르니 씬 파일에 참조를 저장할 수 없다. 그래서 할 수 있는 유일한 일을 한다 — 필드를 완전히 무시한다.

필드는 컴파일된다. C# 코드에 존재한다. 하지만 Unity의 Inspector와 직렬화 파이프라인에서는 존재하지 않는다. 경고 없고, 에러 없고, 그냥 침묵이다.

이것은 Inspector에서 실제로 동작하는 타입 안전 이벤트를 원한다면 — 비주얼 워크플로우의 핵심이 바로 그것이다 — 사용하려는 모든 타입에 대해 구체적인 비제네릭 서브클래스가 필요하다는 뜻이다:

```csharp
// You have to write one of these for EVERY type
[CreateAssetMenu]
public class FloatGameEvent : GameEvent<float> { }

[CreateAssetMenu]
public class Int32GameEvent : GameEvent<int> { }

[CreateAssetMenu]
public class StringGameEvent : GameEvent<string> { }

[CreateAssetMenu]
public class Vector3GameEvent : GameEvent<Vector3> { }
```

의미 있는 정보 한 줄 — 타입 매개변수 — 이 전체 클래스 선언으로 감싸진다. 매. 번.

## 보일러플레이트 산수

불편해질 간단한 계산을 해보자.

제대로 된 이벤트 시스템에서는 각 타입마다 구체 이벤트 클래스만 필요한 게 아니다. 비주얼 워크플로우가 이벤트를 응답에 연결할 수 있도록 바인딩 필드도 필요하다. 타입당 최소 두 개의 생성 코드가 필요하다.

일반적인 중간 규모 Unity 프로젝트는 이벤트에 약 15개의 서로 다른 타입을 사용한다: 기본형 몇 개(`int`, `float`, `bool`, `string`), Unity 타입 몇 개(`Vector3`, `Color`, `GameObject`, `Transform`), 게임 고유 커스텀 struct 몇 개(`DamageInfo`, `ItemData`, `QuestProgress`).

15 타입 x 2 산출물 = 거의 동일한 보일러플레이트 코드 30개.

이제 Sender 변형을 더하자. Sender 이벤트는 타입 매개변수 두 개를 가진다 — 누가 보냈는지와 어떤 데이터를 전달하는지. 엔티티별 체력을 위한 `GameEvent<GameObject, float>`를 원한다면? 구체 클래스 하나와 바인딩 필드 하나가 더 필요하다. 보수적인 프로젝트라도 5-10개의 Sender 조합이 있을 수 있다.

의미 있는 변형이 타입 이름뿐인 보일러플레이트 코드 40개 이상을 보고 있는 것이다. 하나하나가 복사-붙여넣기 기회다. 하나하나가 잠재적 오타다. 기본 클래스 인터페이스가 변경되면 하나하나를 업데이트해야 한다.

아무도 말 안 하는 부분은: 처음 생성할 때만의 문제가 아니라 유지보수의 문제라는 것이다. 누군가 기본 이벤트 클래스를 리팩터링하고 구체 타입 세 개를 업데이트하는 걸 잊는다. 누군가 새 타입을 추가하면서 파일을 잘못된 폴더에 넣는다. 누군가 `IntGameEvent`를 복사해서 `FloatGameEvent`로 이름을 바꾸지만 안의 제네릭 매개변수를 바꾸는 걸 잊는다. 코드는 컴파일되고 테스트도 통과하는데, 2주 뒤에 float 이벤트가 내내 int로 캐스팅되고 있었다는 걸 발견한다.

가설이 아니다. 실제 프로젝트에서 끊임없이 발생하는 일이다.

## 흔한 우회 방법 (그리고 왜 전부 실패하는가)

Unity 커뮤니티는 창의적이다. 시도했던 접근법들과 왜 근본적인 해결이 안 되는지 살펴보자.

### 수동 보일러플레이트: "그냥 직접 써라"

무식한 방법이다. 모든 구체 클래스를 수동으로 만든다. 기술적으로 동작하지만:

- 지루하고 에러가 쉽게 발생한다. 창의적 가치 제로의 기계적 작업이다.
- 새 타입을 추가할 때마다 여러 파일을 생성해야 한다. 하나 빼먹으면 조용히 깨진다.
- 기본 클래스 리팩터링은 모든 파생 클래스를 건드려야 한다.
- 아무도 이걸 일관되게 하지 않는다. 타입이 프로젝트 전체에 흩어지고, 이름도 다르고, 구조도 다르다. 6개월 후엔 세 사람이 같은 시스템을 세 가지 다른 방식으로 만든 것처럼 보인다. 실제로 그렇기 때문이다.

### 타입 안전성 포기: `object` 접근법

일부 시스템은 `object`를 사용해서 제네릭 문제를 완전히 우회한다:

```csharp
public class GenericEvent : ScriptableObject
{
    public void Raise(object data) { /* broadcast to listeners */ }
}

// Usage
scoreEvent.Raise(42);           // Boxed int — works
scoreEvent.Raise("oops");       // Wrong type — also compiles, breaks at runtime
scoreEvent.Raise(new Enemy());  // Also compiles. Also wrong. Also runtime.
```

축하한다, 처음에 제네릭을 원했던 이유 전체를 버려서 직렬화 문제를 "해결"한 것이다. 모든 이벤트 호출이 잠재적 런타임 에러다. 모든 리스너가 수동 캐스팅과 null 체크를 해야 한다. 본질적으로 C# 안에서 JavaScript의 타입 시스템을 재현한 것이다.

박싱/언박싱 오버헤드도 좋지 않다, 특히 이벤트를 빈번하게 발생시킨다면. 하지만 진짜 비용은 개발자 신뢰도다 — 모든 호출부를 읽지 않고는 이벤트가 올바른 타입을 전달하는지 확신할 수 없다.

### T4 Templates: 맞는 아이디어, 틀린 실행

일부 개발자는 T4 텍스트 템플릿이나 커스텀 에디터 스크립트로 보일러플레이트를 자동 생성한다. 이건 사실 올바른 직관이다 — 코드가 예측 가능하다는 걸 인식하고 자동화하는 것. 하지만 대부분의 구현은:

- 취약하다. T4 템플릿은 쳐다만 봐도 깨진다.
- 불투명하다. 설정한 개발자가 떠나면 아무도 템플릿 문법을 이해하지 못한다.
- 외부에 있다. 일반적인 Unity 워크플로우 밖에 있어서 존재 자체를 잊는다.
- 수동이다. 생성 단계를 실행하는 것을 기억해야 한다.

### 복사-붙여넣기: 솔직한 답

솔직하자 — 대부분의 사람이 실제로 하는 방법이다. 기존 구체 클래스를 복사하고, 타입 이름을 바꾸고, 제네릭 매개변수를 바꾸고, 저장한다. 안 될 때까지는 된다. 그리고 이럴 때 안 된다:

- 잘못된 템플릿을 복사해서 잘못된 기본 클래스를 상속한다
- 이름 바꾸기를 잊어서 중복 클래스 이름이 생긴다
- 잘못된 네임스페이스에 붙여넣는다
- 30번 하다 보면 15번째쯤 눈이 풀린다

모두가 이렇게 한다. 결국 모두가 후회한다.

## 다른 언어는 어떻게 하는가

이 문제는 Unity만의 것이 아니지만, 다른 대부분의 생태계는 해결했다.

**Rust**에는 `#[derive(...)]` 매크로가 있어서 컴파일 타임에 trait 보일러플레이트를 자동 구현한다. struct를 정의하고, derive 어트리뷰트를 붙이면 끝.

**Go**에는 `go generate`가 있다 — 언어 도구 체인에 내장된 일급 코드 생성 도구다. 제너레이터를 한 번 작성하고, 주석에서 참조하면, 도구 체인이 나머지를 처리한다.

**C# 자체**에도 Roslyn source generator가 있어서 기존 타입을 기반으로 컴파일 타임에 코드를 생성할 수 있다. 이론적으로 완벽한 솔루션이다. 실제로는 Unity의 컴파일러 파이프라인이 source generator 지원이 제한적이고, 디버깅 경험이 거칠며, 도구가 아직 따라잡는 중이다. 나아지고 있지만 "그냥 동작" 영역은 아직 아니다.

이 모든 솔루션의 패턴은 동일하다: **보일러플레이트가 예측 가능하면 기계가 작성해야 한다.** `public class FloatGameEvent : GameEvent<float> { }`를 타이핑하는 사람은 변수 하나인 템플릿으로 표현할 수 있는 작업을 하고 있다. 그게 말 그대로 컴파일러가 하는 일이다.

근본적인 질문이다: 이벤트 보일러플레이트는 100% 예측 가능하다. 구체 클래스 이름은 패턴을 따른다. 제네릭 매개변수가 유일한 변수다. 바인딩 필드도 같은 패턴을 따른다. 그런데 왜 사람이 이걸 쓰고 있는가?

## 세 가지 이벤트 타입, 하나의 시스템

GES가 코드 생성을 어떻게 처리하는지 보기 전에, 제공하는 세 가지 이벤트 아키텍처를 이해하자. 각각 특정 통신 패턴에 매핑된다.

### Void Events: `GameEvent`

가장 단순한 형태. 데이터 페이로드 없는 이벤트. "무언가 일어났다" — 이게 전체 메시지다.

![Creator Parameterless](/img/game-event-system/visual-workflow/game-event-creator/creator-parameterless.png)

```csharp
[GameEventDropdown, SerializeField] private GameEvent onLevelComplete;

public void CompleteLevel()
{
    onLevelComplete.Raise();
}
```

제네릭 매개변수 없고, 직렬화 문제 없고, 코드 생성 필요 없다. ScriptableObject 에셋을 만들고 쓰면 된다. 게임 시작, 게임 오버, 일시정지, 해제, 체크포인트 도달 — 발생 자체가 전체 메시지인 모든 신호에 적합하다.

### 단일 매개변수 이벤트: `GameEvent&lt;T>`가 구체 타입이 된다

타입이 지정된 데이터 하나를 전달하는 이벤트. "무언가 일어났고, 관련 정보는 이것이다."

![Creator Single](/img/game-event-system/visual-workflow/game-event-creator/creator-single.png)

여기서 직렬화의 벽에 부딪힌다. Inspector에서 `GameEvent<float>`를 직접 사용할 수 없다. GES는 `SingleGameEvent`, `Int32GameEvent`, `BooleanGameEvent` 같은 구체 타입으로 이를 해결한다:

```csharp
[GameEventDropdown, SerializeField] private Int32GameEvent onScoreChanged;

public void AddScore(int points)
{
    currentScore += points;
    onScoreChanged.Raise(currentScore);
}
```

주목하자: 필드 타입은 `GameEvent<int>`가 아니라 `Int32GameEvent`다. Unity가 직렬화하고, 검사하고, 저장할 수 있는 구체적이고 비제네릭인 클래스다. 내부적으로는 `GameEvent<int>`를 상속하지만, Unity는 제네릭을 보지 않는다 — 구체 서브클래스만 본다.

사용 사례: 점수 변경(`Int32GameEvent`), 체력 업데이트(`SingleGameEvent`), 데미지 양(`SingleGameEvent`), 아이템 수량, 쿨다운 타이머 등 데이터 하나면 충분한 모든 경우.

### Sender Events: `GameEvent&lt;TSender, TArgs>`가 구체 타입이 된다

송신자 정체성과 이벤트 데이터를 모두 전달하는 이벤트. "이 특정 오브젝트에 이런 일이 일어났고, 상세 내용은 이것이다."

![Creator Sender](/img/game-event-system/visual-workflow/game-event-creator/creator-sender.png)

제네릭 매개변수가 두 개면 수동 시스템에서 보일러플레이트가 더 많아진다. GES는 `GameObjectDamageInfoGameEvent` 같은 구체 타입을 생성한다:

```csharp
[GameEventDropdown, SerializeField] private GameObjectDamageInfoGameEvent onDamageTaken;

public void TakeDamage(DamageInfo info)
{
    currentHealth -= info.amount;
    onDamageTaken.Raise(gameObject, info);
}
```

Sender 매개변수는 여러 인스턴스가 같은 이벤트 타입을 공유할 때 핵심이다. 적 열 개가 모두 같은 `onDamageTaken` 이벤트를 발생시킨다면 — sender 매개변수가 추가 연결 없이 "보스가 데미지를 받았다"와 "잡몹이 데미지를 받았다"를 구분하게 해준다.

사용 사례: 전투 이벤트(누가 누구를 때렸고 얼마나), 인터랙션 이벤트(어떤 NPC, 어떤 대화), 물리 이벤트(어떤 오브젝트, 어떤 힘). "누구"가 "무엇"만큼 중요한 모든 경우.

## 대부분의 프로젝트를 커버하는 32개 사전 생성 타입

GES는 32개의 일반적인 타입에 대한 구체 구현을 기본 제공한다. 대부분의 프로젝트에서 아무것도 생성할 필요가 없다.

![Basic Types](/img/game-event-system/examples/02-basic-types-event/demo-02-editor.png)

사전 생성 세트에 포함된 것:

- **기본형:** `int`, `float`, `bool`, `string`, `byte`, `double`, `long`
- **Unity 수학:** `Vector2`, `Vector3`, `Vector4`, `Quaternion`
- **Unity 비주얼:** `Color`, `Color32`
- **Unity 참조:** `GameObject`, `Transform`, `Component`, `Object`
- **Unity 구조체:** `Rect`, `Bounds`, `Ray`, `RaycastHit`
- **컬렉션 및 기타**

실제로 이 사전 생성 타입이 일반적인 프로젝트의 이벤트 요구의 70-80%를 처리한다. 점수 추적, 체력 시스템, UI 업데이트, 위치 브로드캐스팅, 기본 게임 상태 — 코드 제너레이터를 건드리지 않고 전부 커버된다.

나머지 20-30%가 게임이 재미있어지는 부분이다: `DamageInfo`, `QuestProgress`, `InventorySlot`, `DialogueLine` 같은 커스텀 struct. 여기서 Creator가 등장한다.

## Creator: 이벤트 생성 시점의 코드 생성

GES 설계의 핵심 통찰: 코드 생성이 별도의 단계가 아니다. 커스텀 타입으로 이벤트를 만들 때 자동으로 발생한다.

![Creator Single](/img/game-event-system/visual-workflow/game-event-creator/creator-single.png)

Game Event Creator를 열고 아직 구체 이벤트 클래스가 없는 타입을 선택하면, GES가 즉석에서 생성한다. 별도의 코드 생성 도구를 열 필요 없다. 커맨드를 실행할 필요 없다. 보일러플레이트를 전혀 생각할 필요 없다. "DamageInfo를 전달하는 이벤트가 필요해"라고 하면 구체 클래스가 나타난다.

### 생성되는 것

커스텀 타입의 단일 매개변수 이벤트에 대해 Creator는 두 가지를 생성한다:

**1. 구체 이벤트 클래스:**

```csharp
// Auto-generated by GES
public class DamageInfoGameEvent : GameEvent<DamageInfo> { }
```

**2. 부분 바인딩 클래스:**

```csharp
public partial class GameEventManager
{
    /// <summary>
    /// The field name MUST match the Event Class Name + "Action"
    /// This allows the EventBinding system to find it via reflection.
    /// </summary>
    public partial class EventBinding
    {
        [HideInInspector]
        public UnityEvent<DamageInfo> DamageInfoGameEventAction;
    }
}
```

바인딩 클래스가 비주얼 워크플로우를 가능하게 한다 — Behavior Window가 연결 코드를 작성하지 않고도 이벤트를 응답 메서드에 연결하는 방법이다. `partial` 키워드는 이 생성된 파일이 컴파일 타임에 나머지 GES 프레임워크와 깔끔하게 병합된다는 의미다.

Sender 이벤트에도 두 개의 타입 매개변수로 같은 패턴이 적용된다:

```csharp
// Auto-generated by GES
public class GameObjectDamageInfoGameEvent : GameEvent<UnityEngine.GameObject, DamageInfo> { }

public partial class GameEventManager
{
    public partial class EventBinding
    {
        [HideInInspector]
        public UnityEvent<UnityEngine.GameObject, DamageInfo> GameObjectDamageInfoGameEventAction;
    }
}
```

깔끔하고, 최소한이고, 정확하다. 오타 없음. 누락된 어트리뷰트 없음. 불일치 없음. 네이밍 컨벤션은 자동이다: 타입 이름 + `GameEvent`가 클래스, 타입 이름 + `GameEvent` + `Action`이 바인딩 필드. 생성되는 모든 파일이 정확히 같은 패턴을 따른다.

## CodeGen 도구: 생성이 아닌 유지보수

![Code Tools](/img/game-event-system/tools/codegen-and-cleanup/hub-code-tools.png)

Creator가 자동으로 생성을 처리한다면 별도의 CodeGen 도구는 왜 있는 걸까?

CodeGen 도구는 유지보수 시나리오를 위해 존재한다:

![CodeGen Tool](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

- **VCS 병합 후.** 두 개발자가 다른 브랜치에서 이벤트를 생성했다. 병합으로 새 이벤트 에셋은 들어왔지만 생성된 코드는 안 들어왔다. CodeGen 도구가 구체 클래스가 없는 이벤트를 스캔하고 재생성한다.
- **GES 업그레이드 후.** 새 버전이 생성 코드 템플릿을 변경했을 수 있다. CodeGen 도구가 모든 구체 클래스를 새 템플릿에 맞게 재생성할 수 있다.
- **죽은 타입 정리.** 생성된 이벤트가 있는 커스텀 struct를 삭제했다. CodeGen 도구의 정리 모드가 고아 생성 파일을 찾아서 제거한다.

이렇게 생각하면 된다: Creator는 일상 워크플로우다. CodeGen 도구는 분기별 유지보수 작업이다. 대부분의 개발자는 Creator를 끊임없이, CodeGen 도구는 드물게 사용한다.

## 완전 연습: 커스텀 Struct에서 동작하는 이벤트까지

현실적인 시나리오를 처음부터 끝까지 살펴보자. "커스텀 이벤트가 필요하다"에서 "게임에서 동작한다"까지 정확히 몇 단계가 걸리는지 보여준다.

**시나리오:** 전투 시스템을 만들고 있다. 엔티티가 데미지를 받으면 누가 맞았는지, 데미지가 얼마인지, 어떤 타입인지, 어디에 맞았는지를 브로드캐스트해야 한다.

### 1단계: 데이터 Struct 정의

```csharp
namespace MyGame.Combat
{
    [Serializable]
    public struct DamageInfo
    {
        public float amount;
        public DamageType type;
        public Vector3 hitPoint;
        public bool isCritical;
    }
}
```

어차피 작성할 게임 코드다. GES 전용 코드는 없다.

### 2단계: Creator에서 이벤트 생성

Game Event Creator를 연다. 이벤트 타입으로 "Single Parameter"를 선택한다. 매개변수 타입으로 `DamageInfo`를 선택하거나 입력한다. 이벤트 에셋 이름을 `OnDamageTaken`으로 짓는다. Create를 클릭한다.

GES가 `DamageInfoGameEvent`와 바인딩 필드를 자동 생성한다. 이벤트 에셋이 생성되어 사용할 준비가 됐다. 총 시간: 약 5초.

### 3단계: 송신자 연결

```csharp
using MyGame.Combat;
using UnityEngine;

public class Health : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private DamageInfoGameEvent onDamageTaken;

    private float currentHealth = 100f;

    public void TakeDamage(DamageInfo info)
    {
        currentHealth -= info.amount;
        onDamageTaken.Raise(info);
    }
}
```

Inspector에서 `onDamageTaken` 필드가 프로젝트의 모든 `DamageInfoGameEvent` 에셋의 드롭다운을 보여준다. `OnDamageTaken`을 선택하면 끝.

### 4단계: 수신자 연결

보통이라면 리스너 클래스를 작성하고, 콜백을 등록하고, 구독을 관리해야 하는 부분이다. GES에서는 Behavior Window에서 시각적으로 설정한다:

1. Game Event Editor에서 `OnDamageTaken` 이벤트를 찾는다
2. Behavior Window를 연다
3. 액션 추가: 데미지 숫자 UI, 피격 사운드, 카메라 흔들림, 애널리틱스 로깅
4. 각 액션은 GameObject와 메서드를 대상으로 한다 — 코드 커플링 없음

수신자 스크립트는 public 메서드를 가진 일반 MonoBehaviour일 뿐이다:

```csharp
public class DamageNumbersUI : MonoBehaviour
{
    public void ShowDamageNumber(DamageInfo info)
    {
        // Spawn floating text at info.hitPoint
        // Color based on info.isCritical
        // Size based on info.amount
    }
}
```

### 5단계: 컴파일 타임 안전성 확인

```csharp
// All of these are caught at compile time, not runtime:
onDamageTaken.Raise(42f);           // Error: float is not DamageInfo
onDamageTaken.Raise("damage");      // Error: string is not DamageInfo
onDamageTaken.Raise(null);          // Error: DamageInfo is a struct, can't be null
```

수동 작성한 보일러플레이트: 제로. 생성된 코드: 작은 파일 두 개, 자동으로. "데미지 이벤트가 필요하다"에서 "동작한다"까지 총 시간: 1분 미만.

## 어떤 이벤트 타입을 언제 사용할까

| 시나리오 | 이벤트 타입 | 구체 예시 |
|----------|-----------|----------|
| 순수 신호, 데이터 불필요 | `GameEvent` (void) | 게임 일시정지, 레벨 완료 |
| 데이터 하나를 브로드캐스트 | 단일 매개변수 | 점수용 `Int32GameEvent`, 체력용 `SingleGameEvent` |
| 여러 관련 필드 | 단일 매개변수 + 커스텀 struct | 전투 데이터용 `DamageInfoGameEvent` |
| 누가 보냈는지 알아야 할 때 | Sender | 엔티티별 체력용 `GameObjectSingleGameEvent` |
| 인스턴스별 추적 + 풍부한 데이터 | Sender + 커스텀 struct | `GameObjectDamageInfoGameEvent` |
| 시스템 전역 알림 | `GameEvent` (void) | 씬 전환 시작, 저장 완료 |

**일반 규칙:** void 이벤트부터 시작하라. 데이터가 필요하면 단일 매개변수 이벤트를 써라 — 필드가 하나 이상이면 struct로 감싸라. Sender 이벤트는 리스너가 정말로 어떤 특정 인스턴스가 이벤트를 발생시켰는지 알아야 할 때만 사용하라.

## 마무리

Unity의 제네릭 직렬화 제한은 현실이고, 짜증나며, 사라질 기미가 안 보인다. 하지만 그것이 당신의 문제일 필요는 없다.

패턴은 명확하다: 보일러플레이트가 예측 가능하니 도구가 작성해야 한다. GES는 이를 논리적 결론까지 밀고 나간다 — 코드 생성과 직접 상호작용할 필요가 없다. Creator를 통해 이벤트를 만들면 구체 클래스가 나타난다. 필드에 `[GameEventDropdown, SerializeField]`를 붙이면 Inspector가 그냥 동작한다. CodeGen 도구가 팀 협업과 버전 관리에서 나오는 엣지 케이스를 처리한다.

산수는 간단하다. 수동 접근법: 거의 동일한 코드 40개 이상의 파일, 수동 유지보수, 복사-붙여넣기 에러에 취약, 새 이벤트 타입이 필요한 모든 개발자를 늦춤. GES 접근법: 수동 작성 보일러플레이트 제로, 생성 시점 자동 생성, 처음부터 끝까지 타입 안전성, 드물게 생성 코드를 새로고침해야 할 때를 위한 유지보수 도구.

보일러플레이트가 100% 예측 가능하면 사람이 작성하면 안 된다. 그건 게으름이 아니다 — 엔지니어링이다.

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
