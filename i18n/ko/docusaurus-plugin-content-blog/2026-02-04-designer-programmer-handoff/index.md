---
slug: inspector-binding-guide
title: '기획자가 코드 없이 이벤트를 설정한다: 디자이너와 프로그래머의 협업 문제'
authors: [tinygiants]
tags: [ges, unity, visual-workflow, tutorial, beginner]
description: "이벤트 응답, 조건, 지연, 반복을 Inspector에서 전부 설정합니다. 코드가 필요 없습니다. 디자이너-프로그래머 협업에 최적화되어 있습니다."
image: /img/home-page/game-event-system-preview.png
---

화요일 오후 3시. 디자이너가 다가와서 말합니다. "저기, 플레이어가 50 이상 데미지를 받을 때 화면 흔들림을 좀 더 강하게 할 수 있어요? 그리고 히트 사운드 전에 0.5초 딜레이 넣어주세요. 아, 독 효과 틱도 2초 대신 1.5초로 바꿔주세요."

세 가지 변경. 디자이너 입장에서는 15초면 결정할 수 있는 내용입니다. 하지만 실제로 벌어지는 일은 이렇습니다: Scene 뷰를 닫고, IDE를 열고, 로딩을 기다리고, 데미지 핸들러를 찾고, 메서드 안에 묻혀있는 화면 흔들림 강도 값을 찾아 변경합니다. 그다음 오디오 딜레이를 찾는데 — 그건 다른 클래스에 있습니다. 변경합니다. 그리고 독 코루틴을 찾는데 — 또 다른 클래스에 있고, 틱 간격은 WaitForSeconds 호출 안에 있습니다. 변경합니다. 세 파일 모두 저장하고, Unity로 돌아가서 리컴파일을 기다리고, 테스트합니다.

8분 후, 디자이너가 말합니다. "아, 흔들림은 원래가 나았어요. 그리고 독은 1.8초로 해볼 수 있을까요?"

<!-- truncate -->

이것이 게임 개발에서 이터레이션 속도를 죽이는 루프입니다. 큰 아키텍처 결정이 아니라 — 모든 파라미터 조정에 프로그래머가 코드를 건드려야 하는 끊임없는 마찰입니다. 단순히 느린 것만이 아닙니다. 팀이 게임 필을 얼마나 빠르게 이터레이션할 수 있는지를 근본적으로 제한하는 협업 병목입니다.

가장 안타까운 점은? 이 루프 동안 프로그래머는 프로그래밍을 하는 게 아닙니다. 데이터 입력을 하는 겁니다. `0.5f`를 `0.3f`로 바꾸고 컴파일러를 기다리는 거죠. 누구의 시간도 제대로 쓰는 게 아닙니다.

## 디자이너-프로그래머 핸드오프 문제

대부분의 Unity 팀이 어떻게 일하는지 솔직하게 이야기해봅시다. 이벤트 응답을 다뤄야 하는 사람은 두 부류입니다: 시스템을 만드는 사람(프로그래머)과 파라미터를 조정하는 사람(디자이너). 근본적으로 다른 활동이고, 근본적으로 다른 도구가 필요합니다.

프로그래머에게는 IDE, 디버거, 버전 관리, C#의 모든 기능이 필요합니다. 디자이너에게는 슬라이더, 드롭다운, 체크박스, 즉각적인 피드백이 필요합니다. 두 그룹 모두를 같은 코드-컴파일-테스트 파이프라인에 밀어넣으면, 어느 쪽도 최적화되지 않습니다.

### 전형적인 의존성 루프

제가 함께 일했던 모든 팀에서 반복되는 패턴입니다:

1. 디자이너에게 아이디어가 떠오름: "히트 리액션 전에 0.2초 딜레이를 넣으면 어떨까?"
2. 디자이너는 변경할 수 없음 — 코드에 있으니까
3. 디자이너가 프로그래머에게 요청
4. 프로그래머는 다른 작업 중 — 컨텍스트 스위칭 비용
5. 프로그래머가 파일 열고, 변경하고, 컴파일 대기
6. 디자이너가 테스트: "음, 0.15로 해볼래요?"
7. 4-6 반복, 느낌이 맞을 때까지
8. 총 소요 시간: 개념적으로 5초짜리 조정에 20분

이걸 프로젝트 전체의 모든 이벤트 응답의 모든 파라미터에 곱하세요. 프로덕션 기간의 매일에 다시 곱하세요. 누적 비용은 엄청나지만, 대부분의 팀은 다른 경험을 해본 적이 없기 때문에 그냥 받아들입니다.

### 디자이너가 실제로 제어하고 싶은 것

이벤트 응답에 대해 디자이너가 조정해야 하는 것들을 분류하면 몇 가지 명확한 카테고리로 나뉩니다:

**무엇이 일어나는가.** 이벤트가 발생하면 어떤 메서드가 호출되나? 사운드 재생, 파티클 이펙트 생성, UI 요소 업데이트, 애니메이션 트리거.

**어떤 조건에서.** 이 응답이 매번 실행되어야 하나, 아니면 데미지가 특정 임계값을 넘을 때만? 플레이어 HP가 30% 미만일 때만? 특정 플래그가 true일 때만?

**어떤 타이밍으로.** 응답이 즉시여야 하나, 0.2초 후여야 하나? 반복해야 하나? 얼마나 자주? 몇 번?

이것들은 "프로그래밍" 질문이 아닙니다. 디자인 질문입니다. 디자이너가 한 줄의 코드도 작성하지 않고 답할 수 있어야 합니다.

### 기존 솔루션들 (그리고 왜 부족한지)

Unity 개발자들은 디자이너에게 더 많은 제어권을 주기 위해 다양한 접근법을 시도해왔습니다. 각각 상당한 한계가 있습니다.

**MonoBehaviour에 [SerializeField] 필드 노출.** 간단한 값에는 동작하지만 금방 지저분해집니다. 조정 가능한 모든 파라미터마다 시리얼라이즈드 필드가 필요합니다. Inspector가 라벨 없는 float의 벽이 됩니다. 그룹핑도, 조건도, 타이밍 제어도 없습니다. 그리고 프로그래머는 디자이너가 조정하고 싶어할 수 있는 모든 파라미터를 미리 예측해야 합니다 — 하나라도 빠뜨리면 다시 코드-컴파일 루프로 돌아갑니다.

```csharp
// "모든 것을 노출" 접근법
public class DamageResponse : MonoBehaviour
{
    [SerializeField] private float screenShakeIntensity = 0.5f;
    [SerializeField] private float screenShakeDuration = 0.3f;
    [SerializeField] private float soundDelay = 0.1f;
    [SerializeField] private float damageThreshold = 50f;
    [SerializeField] private bool enableScreenShake = true;
    [SerializeField] private bool enableSound = true;
    [SerializeField] private float poisonTickRate = 2.0f;
    [SerializeField] private int poisonTickCount = 5;
    // ... 끝없이 늘어남
    // 그리고 구현 코드와 뒤엉켜 있음
}
```

**커스텀 Editor 스크립트.** 각 시스템별로 아름다운 커스텀 Inspector를 만들 수 있습니다. 하지만 시스템당 상당한 엔지니어링 투자가 필요합니다. 그리고 기반 시스템이 변경될 때마다 커스텀 에디터도 변경해야 합니다. 대부분의 팀은 게임의 모든 이벤트 응답에 이 비용을 감당할 수 없습니다.

**UnityEvent.** Unity 내장 UnityEvent 시스템이 실질적인 솔루션에 가장 가깝습니다. 대상 오브젝트를 드래그하고, 드롭다운에서 메서드를 선택하면 끝입니다. 디자이너가 코드 없이 응답을 연결할 수 있습니다. 하지만 UnityEvent에는 실질적인 한계가 있습니다:

- 조건 시스템 없음 — "값이 50보다 클 때만 실행"이 불가능
- 스케줄링 없음 — 딜레이, 반복, 타이밍 제어 없음
- 문자열 기반 메서드 바인딩 — 리팩토링에 취약
- 제한된 제네릭 타입 지원 — 타입이 있는 이벤트 파라미터를 깔끔하게 처리 못함
- 상태 가시성 없음 — 어떤 이벤트에 응답이 설정되어 있는지 한눈에 파악 불가

UnityEvent는 대략 40% 정도의 해결책입니다. 나머지 60% — 조건, 스케줄링, 타입 안전성, 상태 가시성 — 가 어려운 부분입니다.

### 진짜 질문

모든 이벤트에 대해 커스텀 에디터를 만들지 않고도, 디자이너에게 이벤트 응답에 대한 완전한 제어권 — 조건, 타이밍, 반복 포함 — 을 줄 수 있을까?

이것이 GES Behavior Window가 답하는 질문입니다.

## Behavior Window: 완전한 응답 제어, 코드 제로

Behavior Window는 디자이너, 사운드 엔지니어, 게임플레이 프로그래머 — 누구든 비주얼 컨트롤을 통해 완전한 이벤트 응답을 설정할 수 있는 단일 에디터 인터페이스입니다. IDE 필요 없음. 컴파일 필요 없음. 대기 시간 없음.

![Behavior Window Full](/img/game-event-system/visual-workflow/game-event-behavior/behavior-window-full.png)

네 개의 섹션으로 논리적 순서에 따라 나뉩니다: "이 이벤트는 무엇인가?" > "응답해야 하는가?" > "무엇을 하는가?" > "언제, 얼마나 자주?"

리시버는 이 창에서 직접 설정합니다. 별도의 "리스너" 컴포넌트를 GameObject에 추가할 필요가 없습니다. 이벤트를 선택하고, Behavior Window를 열고, 모든 것을 한 곳에서 설정합니다.

### Event Info: "현재 위치" 표시기

![Behavior Info](/img/game-event-system/visual-workflow/game-event-behavior/behavior-info.png)

최상단 섹션은 읽기 전용입니다 — 설정 중인 이벤트의 정체성을 보여줍니다: 이름, 타입(파라미터 없음, 타입 지정 단일 파라미터, 또는 sender), GUID, 카테고리, 데이터베이스.

열두 개의 이벤트를 연속으로 설정하다가 지금 어떤 이벤트를 보고 있는지 잊어버리기 전까지는 사소해 보입니다. info 섹션이 확인 수단입니다. 그리고 GUID는 디버깅에 진짜 유용합니다 — 런타임에 콘솔 로그에서 이벤트 ID를 보면, 여기서 즉시 매칭할 수 있습니다.

### Action Condition: "Then" 앞의 "If"

![Behavior Condition](/img/game-event-system/visual-workflow/game-event-behavior/behavior-condition.png)

이 부분에서 Behavior Window가 UnityEvent를 넘어섭니다. Action Condition 섹션은 이벤트가 발생했을 때 응답이 실제로 실행되어야 하는지를 결정하는 비주얼 게이트입니다.

Inspector에서 조건 트리를 구성합니다:

- **값 비교** — 들어오는 파라미터가 임계값보다 크거나, 작거나, 같은가?
- **불리언 상태** — 플래그가 true인가 false인가?
- **레퍼런스 체크** — 특정 오브젝트가 null인가 아닌가?
- **복합 조건** — 위 조건들의 AND/OR 조합

여기서 디자이너-프로그래머 협업이 진짜로 빛납니다. 프로그래머는 `Float32GameEvent`인 `OnDamageReceived`를 만들고 이벤트를 발생시키는 코드를 작성합니다:

```csharp
[GameEventDropdown, SerializeField] private Float32GameEvent onDamageReceived;

// 데미지 계산 어딘가에서:
onDamageReceived.Raise(calculatedDamage);
```

프로그래머의 할 일은 끝났습니다. 이제 디자이너가 Behavior Window를 열고 조건을 설정합니다: "데미지 값이 50보다 클 때만 응답." 디자이너는 그 임계값을 30으로, 80으로, 1000으로 바꾸면서 Play 모드에서 즉시 테스트할 수 있습니다. 코드 변경 없음. 리컴파일 없음. 프로그래머를 기다릴 필요 없음.

조건은 선택사항입니다. 설정하지 않으면 이벤트가 발생할 때마다 응답이 실행됩니다. 많은 경우에 그것이 정확히 맞습니다 — 모든 응답에 게이트가 필요한 건 아닙니다.

조건 트리 시스템은 전통적으로 커스텀 코드가 필요했던 더 복잡한 시나리오도 처리합니다. "데미지가 30보다 크고 AND 플레이어가 전투 모드일 때만 응답"은 조건 트리의 두 노드가 됩니다. `if` 문 작성도, 불리언 노출도 필요 없습니다.

### Event Action: 실제로 일어나는 일

![Behavior Action](/img/game-event-system/visual-workflow/game-event-behavior/behavior-action.png)

Event Action 섹션은 이벤트가 발생하고 조건이 통과했을 때 무슨 일이 일어나는지를 정의합니다. Unity의 Inspector에서 Button의 `onClick`을 사용해봤다면, 기본 패턴을 알고 있을 것입니다: 대상 오브젝트를 드래그하고, 드롭다운에서 메서드를 선택합니다. Behavior Window는 같은 패턴을 GES의 타입 시스템을 지원하도록 확장합니다.

**파라미터 없는 이벤트의 경우**, 표준 액션 바인딩을 사용합니다. 대상을 드래그하고, 파라미터 없는 메서드를 선택합니다:

```csharp
// Behavior Window에서 바인딩할 수 있는 메서드들:
public void PlayExplosionEffect() { /* ... */ }
public void ShakeCamera() { /* ... */ }
public void IncrementKillCounter() { /* ... */ }
```

**타입이 있는 이벤트의 경우**, 이벤트 데이터가 자동으로 바인딩된 메서드에 전달됩니다. Behavior Window는 이벤트의 파라미터 타입을 이해하고 호환되는 메서드만 보여줍니다:

```csharp
// Float32GameEvent (OnDamageReceived)의 경우:
public void ApplyDamage(float amount)
{
    currentHealth -= amount;
    UpdateHealthBar();
}

// StringGameEvent (OnDialogueTriggered)의 경우:
public void ShowDialogue(string text)
{
    dialogueBox.SetText(text);
    dialogueBox.Show();
}
```

**Sender 이벤트의 경우**, 데이터와 소스 GameObject 모두를 받습니다:

```csharp
// sender Float32GameEvent (OnDamageDealt)의 경우:
public void HandleDamage(float amount, GameObject source)
{
    currentHealth -= amount;
    FaceToward(source.transform);
    SpawnHitParticles(source.transform.position);
}
```

![Behavior Action Add](/img/game-event-system/visual-workflow/game-event-behavior/behavior-action-add.png)

액션 바인딩은 **Dynamic**과 **Static** 파라미터 모드를 지원합니다. Dynamic 모드는 이벤트의 런타임 값을 메서드에 전달합니다 — 실제 데미지 양. Static 모드는 디자이너가 Inspector에서 고정값을 설정하여 이벤트 데이터를 무시합니다. 두 모드 모두 유용합니다: dynamic은 "실제 데미지를 적용"할 때, static은 "데미지 양에 관계없이 항상 큰 폭발 사운드를 재생"할 때.

하나의 behavior에 여러 액션을 바인딩할 수 있습니다. 이벤트가 발생하고 조건이 통과하면, 바인딩된 모든 액션이 순서대로 실행됩니다. 제가 끊임없이 사용하는 패턴입니다: 하나의 이벤트를 세 개의 다른 오브젝트의 메서드에 바인딩합니다. 이벤트가 한 번 발생하면, 오디오 매니저는 사운드를 재생하고, VFX 매니저는 파티클을 생성하고, UI 매니저는 알림을 표시합니다. 세 시스템이 독립적으로 응답하며, 서로 완전히 디커플링되어 있습니다.

### Schedule: 코루틴 없는 타이밍

![Behavior Schedule](/img/game-event-system/visual-workflow/game-event-behavior/behavior-schedule.png)

Schedule 섹션은 Behavior Window를 "유용함"에서 "이게 코드 없이 된다고?"로 끌어올리는 부분입니다. 비주얼 필드만으로 완전한 타이밍과 라이프사이클 제어가 가능합니다.

**Action Delay** — 이벤트가 발생한 시점과 액션이 실행되는 시점 사이의 시간(초). 즉시는 0. 0.5초는 0.5. 3초는 3.0.

이것만으로도 충분히 가치있습니다. 폭발 이벤트를 생각해보세요:

```
Event: OnExplosion
  Behavior 1: ShakeCamera()      -- Delay: 0.0s
  Behavior 2: PlayExplosionSFX() -- Delay: 0.05s
  Behavior 3: ShowDamageNumber() -- Delay: 0.3s
  Behavior 4: FadeSmoke()        -- Delay: 1.5s
```

코루틴 없음. `Invoke` 호출 없음. 타이머 관리 코드 없음. 디자이너가 네 개의 딜레이 값을 설정하면 완벽하게 시퀀싱된 폭발 응답을 얻습니다. 사운드 딜레이를 0.05에서 0.1로 바꿔서 더 먼 거리를 시뮬레이션하고 싶다면? 필드 하나. 즉시 테스트.

**Repeat Interval** — 반복 실행 사이의 시간. 1.0으로 설정하면 매초마다 액션이 반복됩니다.

**Repeat Count** — 액션이 반복되는 횟수:
- **0** — 한 번 실행, 반복 없음 (기본값)
- **N** — 첫 번째 이후 N번 추가 실행
- **-1** — 취소되거나 오브젝트가 파괴될 때까지 무한 반복

이들을 조합하면 코드 한 줄 없이 반복 동작을 얻습니다:

```
Event: OnPoisoned
Action: ApplyPoisonTick(5.0f)
  Delay: 0.0s
  Repeat Interval: 2.0s
  Repeat Count: 5
  Result: 즉시 5 데미지, 이후 2초마다 5번 추가
  Total: 6틱 x 5 데미지 = 10초 동안 총 30 독 데미지
```

독 효과를 1.5초마다 3 데미지로 8틱으로 바꾸고 싶다면? 숫자 세 개를 변경합니다. 즉시 테스트. 디자이너가 프로그래머도 모르는 사이에 지속 데미지 시스템을 튜닝한 겁니다.

**Persistent Event** — 오브젝트가 `DontDestroyOnLoad`를 사용할 때 씬 로드를 넘어서도 behavior가 유지됩니다. 어떤 씬이 활성화되어 있든 이벤트에 응답해야 하는 오디오 매니저, 분석 트래커, 업적 시스템 같은 글로벌 시스템에 필수적입니다.

### 색상 코드 상태: 아키텍처를 한눈에 파악

GES 생태계에서 제가 가장 좋아하는 디테일 중 하나는 툴체인 전체에서 볼 수 있는 색상 코드 behavior 상태입니다:

- **초록** — 이 이벤트는 Behavior Window에서 behavior가 설정되어 있습니다. 응답이 세팅되어 준비 완료.
- **파랑** — 이 이벤트는 런타임에 코드를 통해 리스너가 등록되어 있습니다. Behavior가 존재하지만, 프로그래밍적으로 연결되었습니다.
- **주황** — 이 이벤트는 설정된 behavior가 없습니다. 사용되지 않거나, 누군가 응답 설정을 빠뜨린 겁니다.

Event Editor에서 주황색이 가득하면, 아무도 리스닝하지 않는 이벤트가 있다는 뜻입니다. 정리해야 할 죽은 코드이거나, 설정해야 할 응답이 빠져있거나. 어느 쪽이든, 플레이어가 버그 리포트를 제출하고 나서야 발견하는 대신 한눈에 알 수 있습니다.

## 워크플로우 변환

처음의 시나리오로 돌아가봅시다. 디자이너가 세 가지 변경을 원합니다: 큰 히트에 더 강한 화면 흔들림, 히트 사운드에 0.5초 딜레이, 다른 독 틱 간격.

**기존 워크플로우:** 디자이너가 프로그래머에게 요청. 프로그래머 컨텍스트 스위칭. 세 파일, 세 변경, 한 번의 컴파일, 한 번의 테스트, 한 번의 "다른 값으로 해보자," 또 한 번의 컴파일. 20분.

**새 워크플로우:** 디자이너가 Behavior Window를 엽니다. 화면 흔들림 조건 임계값을 변경합니다. 사운드 딜레이 필드를 변경합니다. 독 반복 간격을 변경합니다. Play 모드에서 테스트합니다. 조정합니다. 다시 테스트합니다. 끝. 3분. 프로그래머는 자기 작업에서 벗어나지 않았습니다.

프로그래머는 아키텍처를 정의하고 public 메서드를 노출하는 시스템을 만듭니다. 그리고 `Raise()` 호출을 작성합니다:

```csharp
[GameEventDropdown, SerializeField] private Float32GameEvent onDamageReceived;

public void TakeDamage(float amount)
{
    // 프로그래머의 책임: 데이터와 함께 이벤트 발생
    onDamageReceived.Raise(amount);

    // 이 이벤트에 응답하는 모든 것은
    // 디자이너가 Behavior Window에서 설정합니다.
    // 프로그래머는 그 응답이 무엇인지 알 필요도, 신경 쓸 필요도 없습니다.
}
```

깔끔한 분리입니다. 프로그래머는 "어떤 이벤트가 존재하고 언제 발생하는가"를 담당합니다. 디자이너는 "어떤 응답이 어떤 타이밍으로 일어나는가"를 담당합니다. 어느 쪽도 상대를 블로킹하지 않습니다.

## 실전 예제: 완전한 데미지 응답 시스템

모든 것을 합쳐봅시다. 플레이어가 데미지를 받을 때 다음과 같은 응답을 원합니다:

1. 즉시 화면을 빨갛게 플래시
2. 작은 딜레이 후 피격 사운드 재생
3. 플로팅 데미지 숫자 표시
4. 카메라 흔들림, 단 큰 히트(50 데미지 초과)에만
5. 6초에 걸쳐 3번 틱하는 출혈 효과

**Behavior 1: 화면 플래시**
- Condition: 없음 (항상 실행)
- Action: `ScreenEffects.FlashRed()`
- Delay: 0.0s, Repeat: 0

**Behavior 2: 피격 사운드**
- Condition: 없음
- Action: `AudioManager.PlayHurtSound()`
- Delay: 0.03s, Repeat: 0

**Behavior 3: 데미지 숫자**
- Condition: 없음
- Action: `DamageUI.ShowNumber(float)` — 데미지 값을 동적으로 수신
- Delay: 0.1s, Repeat: 0

**Behavior 4: 카메라 흔들림**
- Condition: value > 50.0
- Action: `CameraController.HeavyShake()`
- Delay: 0.0s, Repeat: 0

**Behavior 5: 출혈 효과**
- Condition: 없음
- Action: `PlayerHealth.ApplyBleedTick(float)`
- Delay: 1.0s, Repeat Interval: 2.0s, Repeat Count: 3

모두 Behavior Window에서 설정됩니다. 디자이너는:
- 카메라 흔들림 임계값을 필드 하나 수정해서 50에서 30으로 변경 가능
- 출혈 타이밍을 2초 간격에서 1.5초로 조정 가능
- behavior를 제거해서 화면 플래시를 완전히 비활성화 가능
- 다른 behavior를 추가해서 새 응답(컨트롤러 진동) 추가 가능
- 딜레이를 재배치해서 피격 "필"을 변경 가능

이 변경 중 어느 것도 코드 수정이 필요하지 않습니다. 리컴파일도 필요 없습니다. `ScreenEffects`, `AudioManager`, `CameraController`, `PlayerHealth`를 만든 프로그래머는 public 메서드만 노출하면 됐습니다. Behavior Window가 모든 와이어링, 조건, 스케줄링을 처리합니다.

## Behavior Window vs. 코드: 언제 무엇을 사용할 것인가

Behavior Window는 코드 기반 이벤트 핸들링의 대체가 아닙니다. 보완입니다. 실전에서 작동하는 분할은 이렇습니다:

**Behavior Window를 사용할 때:**
- 응답이 간단할 때 (메서드 호출, 값 설정)
- 디자이너가 파라미터를 이터레이션해야 할 때
- 타이밍을 빠르게 실험하고 싶을 때
- 응답에 복잡한 분기 로직이 필요하지 않을 때

**코드 리스너를 사용할 때:**
- 응답에 복잡한 상태 머신 로직이 포함될 때
- 응답하기 전에 이벤트 데이터를 가공해야 할 때
- 응답에 async 연산이나 복잡한 코루틴 체인이 포함될 때
- 타이트 루프에서 성능이 중요할 때

대부분의 프로젝트는 응답의 60-70%를 Behavior Window로, 30-40%를 코드로 설정하게 됩니다. 디자이너가 더 많은 팀은 Behavior Window 비율이 더 높습니다. 중요한 것은 디자이너 주도의 응답이 절대 프로그래머의 가용성에 의해 블로킹되지 않는다는 점입니다.

## 더 큰 그림

Behavior Window의 핵심은 사실 시간 절약이 아닙니다 — 물론 그것도 됩니다. 팀에서 누가 무엇을 할 수 있는지를 바꾸는 것입니다.

전통적인 모델에서 이벤트 응답은 프로그래머의 영역입니다. 모든 조정, 모든 실험, 모든 "이걸 해보면 어떨까"가 코드-컴파일 파이프라인을 통과합니다. 이것은 디자이너의 창의성이 프로그래머의 가용성에 의해 게이팅되는 병목을 만듭니다.

Behavior Window 모델에서는 프로그래머가 시스템을 만들고 이벤트를 발생시킵니다. 디자이너가 응답을 설정하고 필을 이터레이션합니다. 핸드오프는 깔끔하고, 이터레이션은 빠르며, 어느 역할도 다른 역할을 블로킹하지 않습니다. 이것은 도구 개선이 아니라 — 워크플로우 변환입니다.

팀의 이터레이션 속도가 느리다면 — 모든 작은 게임플레이 변경에 코드 커밋과 리컴파일 사이클이 필요하다면 — Behavior Window가 가장 임팩트 있는 변화일 수 있습니다. 일주일만 진지하게 사용해보세요. 디자이너에게 자유를 주세요. 이터레이션 속도에 무슨 일이 일어나는지 지켜보세요.

다음 포스트에서는 `[GameEventDropdown]` 어트리뷰트를 살펴보겠습니다 — 코드에 한 줄만 추가하면 Inspector에서 검색 가능하고, 타입 안전하고, 카테고리별로 정리된 이벤트 피커를 사용할 수 있습니다.

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
