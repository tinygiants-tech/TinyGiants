---
slug: parallel-vs-sequential
title: '병렬 vs 순차: 모든 이벤트 시스템에 필요한 두 가지 실행 패턴'
authors: [tinygiants]
tags: [ges, unity, flow-graph, architecture, advanced]
description: "사운드와 파티클은 동시에 재생됩니다. 하지만 화면 페이드는 리스폰 로드 전에 반드시 끝나야 합니다. 실제 게임에는 병렬과 순차 이벤트 실행 모두가 필요합니다 — 조건 분기, 타입 변환, 비동기 조율까지."
image: /img/home-page/game-event-system-preview.png
---

플레이어가 죽습니다. 사망 사운드와 사망 파티클은 같은 순간에 시작해야 합니다 — 하나를 기다릴 이유가 없습니다. 하지만 화면 페이드는 리스폰 포인트 로드 전에 반드시 끝나야 합니다. 그리고 리스폰은 반드시 플레이어 텔레포트 전에 끝나야 합니다. 그리고 텔레포트는 반드시 화면 페이드 인 전에 끝나야 합니다.

하나의 이벤트로 트리거되는 같은 흐름 안에 병렬 AND 순차 실행. 불편한 진실은: Unity의 대부분의 이벤트 시스템은 정확히 하나의 패턴만 줍니다. 이벤트를 발생시키고, 모든 리스너가 응답하고, 끝. 그 응답들이 동시에 일어나야 하는지 엄격한 순서로 일어나야 하는지? 당신의 문제입니다.

그래서 해결합니다. 코루틴으로. 콜백으로. `_hasFadeFinished`라는 이름의 불리언으로. 그리고 어느새 여섯 개의 파일에 흩어진 임시 상태 머신을 만들어놨는데, 미래의 자신을 포함해 아무도 따라갈 수 없습니다.

<!-- truncate -->

## 실행 패턴 문제

표준 Unity 도구로 "같은 흐름 안의 병렬과 순차"가 실제로 어떤 모습인지 살펴보겠습니다. 악마는 확실히 구현 디테일에 있으니까요.

### 병렬 부분 (쉬워 보임)

플레이어가 죽습니다. 세 가지가 동시에 일어납니다: 사망 사운드, 사망 파티클, 입력 비활성화. 표준 C# 이벤트가 이걸 처리합니다:

```csharp
public static event Action OnPlayerDeath;

// AudioManager.cs
OnPlayerDeath += PlayDeathSound;

// ParticleManager.cs
OnPlayerDeath += SpawnDeathParticles;

// InputManager.cs
OnPlayerDeath += DisableInput;
```

세 개 모두 이벤트가 발생하면 실행됩니다. 같은 디스패치 안에서 모두 실행된다는 점에서 "병렬". 간단합니다.

하지만 `PlayDeathSound`가 예외를 던지면? delegate 호출 리스트가 멈춥니다. `SpawnDeathParticles`와 `DisableInput`은 실행되지 않습니다. 하나의 깨진 핸들러가 전체 응답 체인을 다운시킵니다. 플레이어가 소리도 파티클도 없이, 입력이 활성화된 채로 죽습니다. 재밌겠네요.

"각 핸들러를 try-catch로 감싸면 되잖아." 네. 이제 모든 구독에 보일러플레이트 예외 처리를 작성하는 겁니다. 아니면 핸들러별로 잡아주는 커스텀 이벤트 디스패처를 만들거나. 이미 존재해야 할 인프라를 만드는 거죠.

그리고 우선순위는? 아마 입력을 먼저 비활성화해야 할 겁니다 — 사망 사운드 셋업 중에 플레이어가 버튼을 누를 수 있는 미세한 창이 있습니다. 평평한 delegate 체인에서 실행 순서는 구독 순서입니다. 곧 로드 순서입니다. 비결정적입니다.

### 순차 부분 (여기서 무너짐)

병렬 이펙트 후에, 순차 리스폰 흐름: 블랙으로 페이드, 대기, 체크포인트 로드, 대기, 텔레포트, 페이드 인.

```csharp
IEnumerator DeathSequence()
{
    yield return StartCoroutine(FadeToBlack());
    yield return StartCoroutine(LoadRespawnPoint());
    TeleportPlayer();
    yield return StartCoroutine(FadeIn());
    EnableInput();
}
```

깔끔합니다. 동작합니다. 변경이 필요할 때까지.

즉시 멀티플레이어 리스폰을 위해 페이드를 건너뛰고 싶다면? 페이드와 리스폰 사이에 "계속하시겠습니까?" 화면을 추가하고 싶다면? 텔레포트 후에 리스폰 애니메이션을 넣고 싶다면? 세 가지 변경이면 이렇게 됩니다:

```csharp
IEnumerator DeathSequence(DeathInfo info)
{
    if (!info.isInstantRespawn)
    {
        yield return StartCoroutine(FadeToBlack());
    }

    if (info.showContinueScreen)
    {
        yield return StartCoroutine(ShowContinuePrompt());
        if (!_playerChoseContinue)
        {
            yield return StartCoroutine(ShowGameOverScreen());
            yield break;
        }
    }

    yield return StartCoroutine(LoadRespawnPoint());
    TeleportPlayer();

    if (info.playRespawnAnimation)
    {
        yield return StartCoroutine(PlayRespawnAnimation());
    }

    yield return StartCoroutine(FadeIn());
    EnableInput();
}
```

코루틴이 이제 분기, 조기 반환, 조건부 단계를 가집니다. 하나의 파일에 있습니다. AudioManager, ParticleManager, InputManager는 이에 대해 아무것도 모릅니다. 병렬 이펙트와 순차 흐름이 완전히 단절되어 있습니다. 그리고 이건 비교적 간단한 사망 시퀀스입니다.

### 타입 불일치 문제

아무도 마주치기 전까지는 이야기하지 않는 문제입니다. 데미지 이벤트가 `DamageInfo` 구조체를 운반합니다 — 공격자, 대상, 양, 타입, 크리티컬 플래그. 다운스트림에서, 체력바 UI는 `float` 데미지 양만 필요합니다. 화면 흔들림 시스템은 `bool` isCritical만 필요합니다.

평평한 이벤트 시스템에서는 두 가지 선택지가 있습니다:

**옵션 A: 모든 곳에서 `DamageInfo`를 받는다.** 체력바는 `info.damage`를 추출합니다. 화면 흔들림은 `info.isCritical`을 추출합니다. 모든 리스너가 필요하지 않은 데이터를 받고 자체 추출을 수행합니다. 어디에나 결합.

**옵션 B: 중간 이벤트.** 데미지 핸들러가 `DamageInfo`를 받아서 float를 추출하고, 별도의 `OnDamageAmountChanged` 이벤트를 발생시킵니다. bool을 추출하고 `OnCriticalHitOccurred`를 발생시킵니다. 이제 유일한 역할이 타입 변환인 보일러플레이트 릴레이 이벤트가 생겼습니다.

이벤트 50개면, 옵션 B는 타입 변환만을 위해 수십 개의 중간 이벤트가 생길 수 있습니다. 보일러플레이트 폭발. 각 릴레이 이벤트는 관리할 에셋 하나, 이름 지어야 할 것 하나, 이벤트 드롭다운의 항목 하나.

### 비동기 문제

"이것이 끝날 때까지 기다렸다가 계속"은 간단해 보입니다. Unity에서는 전혀 그렇지 않습니다.

씬 로드는 async. 애니메이션은 시간 기반. 네트워크 호출은 Task를 반환. 페이드는 커스텀 트위닝 시스템을 사용. 각 비동기 메커니즘마다 자체 완료 패턴이 있습니다 — 코루틴 yield, Task continuation, 콜백 delegate, 애니메이션 이벤트.

하나의 순차 흐름에서 이들을 조율하면, 코루틴이 다른 비동기 패러다임들 사이의 번역기가 됩니다:

```csharp
IEnumerator WaitForAnimation(Animator anim, string clipName)
{
    anim.Play(clipName);
    while (anim.GetCurrentAnimatorStateInfo(0).normalizedTime < 1.0f)
        yield return null;
}

IEnumerator WaitForSceneLoad(string sceneName)
{
    var op = SceneManager.LoadSceneAsync(sceneName);
    while (!op.isDone)
        yield return null;
}
```

모든 비동기 요소에 커스텀 코루틴 래퍼가 필요합니다. 조율 로직은 보이지 않습니다 — yield 문과 while 루프 안에 숨겨져 있습니다. 이 코드를 보는 디자이너는 흐름이 아니라 구현 디테일을 봅니다.

### 하이브리드 복잡성: 보스 전투

이제 전부 합치세요. 보스 전투 페이즈 전환:

1. HP가 임계값 아래로 떨어짐 (조건)
2. 포효 애니메이션 + 음악 전환 + 아레나 조명 변경 (병렬, 하지만 포효는 async)
3. 포효가 끝날 때까지 대기 (async 순차)
4. 공격 패턴 전환 (순차)
5. 미니언을 시차를 두고 하나씩 스폰 (순차 루프)
6. 모든 미니언 스폰 완료 대기 (async 순차)
7. 보스 취약 상태 (순차)
8. 마지막 페이즈면, 특별 대사 재생 (조건 분기)

병렬 트리거, 순차 체인, async 대기, 조건 분기, 시차 타이밍 — 하나의 흐름에 전부 있습니다. 코루틴으로 표현하면 중첩된 yield, 불리언 플래그, 페이즈 enum, 애니메이션 이벤트에서 코루틴으로 피드백하는 콜백이 있는 100줄짜리 메서드가 됩니다.

로직은 맞습니다. 하지만 쓰기 전용 코드입니다. 6개월 후에 아무도 읽지 못합니다. 모든 yield와 모든 플래그를 이해하지 않고는 아무도 안전하게 수정하지 못합니다.

상태 머신? 더 나은 추상화이지만 복잡성이 폭발합니다. 조건 전환과 병렬 이펙트가 있는 세 페이즈는 쉽게 15-20개의 상태가 필요합니다. 각 상태가 자체 병렬 연산을 관리하고 AND 전환을 처리하고 AND 조건을 평가합니다. 보이지 않는 코루틴 스파게티를 잘 구조화되었지만 동일하게 불투명한 상태 머신 스파게티로 바꾼 겁니다.

## GES의 답: 혼합 가능한 두 가지 명시적 패턴

GES는 두 가지 기본 실행 패턴 — Trigger와 Chain — 을 비주얼 Flow Graph 에디터와 코드 API 양쪽에서 일급 개념으로 도입합니다. Unity 이벤트 시스템 위에 레이어된 추상화가 아닙니다. 모든 이벤트 흐름을 구성하는 두 개의 원자적 빌딩 블록입니다.

### Trigger: 병렬 Fan-Out (주황색)

소스 이벤트가 발생하면, Trigger로 연결된 모든 타겟이 동시에 독립적으로 발생합니다.

![Trigger Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-trigger.png)

**병렬 실행.** 모든 타겟이 같은 프레임에서 처리를 시작합니다. 타겟 간 보장된 순서는 없습니다(우선순위를 지정하지 않는 한).

**폴트 톨러런트.** 타겟 B가 예외를 던져도 타겟 A와 C는 여전히 실행됩니다. 하나의 깨진 핸들러가 전체 흐름을 다운시키지 않습니다. C# 이벤트가 기본으로 가졌으면 하는 동작입니다.

**Fire-and-forget.** 소스는 어떤 타겟이 완료되길 기다리지 않습니다. 타겟이 5초짜리 코루틴을 시작해도 소스는 알지도 신경 쓰지도 않습니다.

**우선순위 정렬.** 개념적으로는 병렬이지만, trigger 타겟은 프레임 내에서 결정적 순서로 실행됩니다. 우선순위 할당: `priority: 20`이 `priority: 10`보다 먼저 실행됩니다. 별도의 순차 단계 없이 "대부분 병렬이지만, 사망 사운드 전에 입력을 비활성화"를 처리합니다.

```csharp
// onPlayerDeath가 발생하면 모두 동시에 실행
onPlayerDeath.AddTriggerEvent(onDisableInput, priority: 20);     // 첫 번째
onPlayerDeath.AddTriggerEvent(onPlayDeathSound, priority: 10);   // 두 번째
onPlayerDeath.AddTriggerEvent(onSpawnDeathParticles, priority: 5); // 세 번째
```

Flow Graph 에디터에서 trigger 연결은 소스 노드에서 팬아웃하는 주황색 선입니다. 비주얼 약속: "이것들은 함께 일어납니다."

![Trigger Demo Graph](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

### Chain: 순차 블로킹 (초록색)

소스 이벤트가 발생하면, Chain으로 연결된 타겟이 엄격한 순서로 하나씩 실행됩니다. 각 단계는 이전 단계가 완료될 때까지 기다립니다.

![Chain Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-chain.png)

**엄격한 순서.** 단계 1, 그다음 단계 2, 그다음 단계 3. 모호함 없음. 경쟁 조건 없음. 비주얼 레이아웃이 왼쪽에서 오른쪽, 위에서 아래로 — 정확히 실행 순서대로 읽힙니다.

**딜레이와 duration.** 각 chain 단계에 딜레이(시작 전 일시 정지)와 duration(체인이 진행하기 전에 이 단계가 "소요하는" 시간)을 설정할 수 있습니다. 코루틴에 흩어진 `WaitForSeconds`를 각 연결에 명시적이고 보이는 타이밍으로 대체합니다.

**waitForCompletion으로 비동기 대기.** Chain 단계는 핸들러의 비동기 작업이 끝날 때까지 체인을 일시 정지할 수 있습니다. 씬 로드, 애니메이션, 네트워크 호출 — 체인이 우아하게 기다립니다. 코루틴 래퍼 코드 없음. 완료 콜백 없음. 체크박스 하나.

**조건부 중단.** Chain 연결은 나머지 시퀀스를 중지할 수 있는 조건을 지원합니다. 조건이 `false`로 평가되면, 이후 단계는 실행되지 않습니다. "플레이어에게 부활 토큰이 있으면, 사망 시퀀스를 중단"은 첫 번째 chain 단계의 조건입니다.

```csharp
// 각 단계가 이전 단계의 완료를 기다림
onPlayerDeath.AddChainEvent(onFadeToBlack, delay: 1.0f);
onFadeToBlack.AddChainEvent(onLoadRespawn, waitForCompletion: true);
onLoadRespawn.AddChainEvent(onTeleportPlayer);
onTeleportPlayer.AddChainEvent(onResetPlayerState);
onResetPlayerState.AddChainEvent(onFadeIn, duration: 1.0f);
onFadeIn.AddChainEvent(onEnableInput);
```

Flow Graph에서 chain 연결은 순서대로 흐르는 초록색 선입니다. 비주얼 약속: "이것들은 이 순서로 일어납니다."

![Chain Demo Graph](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

### 혼합: 하이브리드 흐름

실제 게임 로직은 순수하게 병렬이거나 순수하게 순차가 아닙니다. 둘 다입니다. 두 가지 명시적 패턴의 요점은 같은 소스 노드에서 자유롭게 혼합할 수 있다는 겁니다.

![Hybrid Flow](/img/game-event-system/intro/overview/flow-graph-mix.png)

플레이어 사망 흐름이 이렇게 됩니다:

```
OnPlayerDeath ──trigger──► OnPlayDeathSound       (병렬, 즉시)
              ──trigger──► OnSpawnDeathParticles   (병렬, 즉시)
              ──trigger──► OnDisableInput          (병렬, 즉시, priority: 20)
              ──chain───► OnFadeToBlack            (순차, delay: 1.0s)
                          └──chain──► OnLoadRespawn (waitForCompletion)
                                     └──chain──► OnTeleportPlayer
                                                 └──chain──► OnResetState
                                                             └──chain──► OnFadeIn (duration: 1.0s)
                                                                         └──chain──► OnEnableInput
```

세 개의 주황색 trigger 선이 팬아웃 — 병렬 이펙트가 즉시 발생. 초록색 chain이 순차 리스폰 흐름을 시작. 둘 다 동시에 실행됩니다: 사망 사운드가 재생되는 동안 chain은 페이드 시작 전 1.0초 딜레이를 기다립니다.

코드로:

```csharp
void SetupDeathFlow()
{
    // 병렬 이펙트 (Trigger - 주황색)
    onPlayerDeath.AddTriggerEvent(onDisableInput, priority: 20);
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound, priority: 10);
    onPlayerDeath.AddTriggerEvent(onSpawnDeathParticles, priority: 5);

    // 순차 리스폰 (Chain - 초록색)
    onPlayerDeath.AddChainEvent(onFadeToBlack, delay: 1.0f);
    onFadeToBlack.AddChainEvent(onLoadRespawn, waitForCompletion: true);
    onLoadRespawn.AddChainEvent(onTeleportPlayer);
    onTeleportPlayer.AddChainEvent(onResetPlayerState);
    onResetPlayerState.AddChainEvent(onFadeIn, duration: 1.0f);
    onFadeIn.AddChainEvent(onEnableInput);
}
```

하지만 비주얼 Flow Graph에서 이것이 진짜 빛납니다. 에디터를 열면 전체 흐름을 봅니다: 왼쪽에 병렬 팬아웃, 오른쪽으로 흐르는 순차 체인. 주황색과 초록색. 여러 파일에 걸쳐 80줄의 코루틴 코드가 될 것을 즉각적으로 이해.

## Argument Transformer: 타입 불일치 해결

중간 이벤트 문제를 기억하나요? 업스트림이 `DamageInfo`를 보내는데 다운스트림은 `float` 데미지 양만 필요합니다. 트랜스포머 없이는 모든 타입 변환에 릴레이 이벤트를 만들어야 했습니다.

GES는 Argument Transformer로 이를 해결합니다 — Flow Graph에서 이벤트 간 연결에 위치하는 타입 변환 노드.

![Node Transform](/img/game-event-system/flow-graph/game-event-node-behavior/node-transform.png)

`DamageInfo` 소스를 `SingleGameEvent` 타겟에 연결하면, 에디터가 타입 불일치를 감지하고 변환을 정의할 수 있게 합니다. 소스 타입에서 타겟 타입으로의 프로퍼티 경로를 지정합니다:

```
DamageInfo → .damage → float
```

트랜스포머가 `damageInfo.damage`를 추출해서 `float` 값을 다운스트림 이벤트에 전달합니다. 중간 이벤트 없음. 보일러플레이트 릴레이 코드 없음. 변환이 연결 자체에 보입니다.

중첩 프로퍼티 접근도 동작합니다:

```
DamageInfo → .attacker.stats.critChance → float
```

Flow Graph는 트랜스포머 연결을 직접 연결과 다르게 표시하므로, 타입 변환이 어디서 일어나는지 항상 볼 수 있습니다. 타입 시스템이 설정 시점에 경로를 검증합니다 — 프로퍼티가 존재하지 않거나 최종 타입이 타겟과 일치하지 않으면 런타임 전에 눈에 보이는 에러를 받습니다.

### 연결 호환성 표시기

두 노드 사이에 연결을 드래그하면, 에디터가 색상 코드 호환성을 보여줍니다:

![Node Connection](/img/game-event-system/flow-graph/game-event-node-connector/node-connection.png)

- **초록:** 타입이 완벽히 일치. `Int32GameEvent` to `Int32GameEvent`. 직접 연결.
- **노랑:** 변환으로 호환 가능. `DamageInfo` 소스, `float` 타겟. Argument Transformer가 간격을 메울 수 있음.
- **주황:** 가능하지만 설정 필요. 타입이 관련 없지만, void passthrough나 커스텀 트랜스포머가 동작 가능.
- **빨강:** 유효하지 않음. 일반적으로 chain 모드에서의 순환 의존성.

두 노드가 연결 가능한지 추측 없음. 비주얼 피드백이 즉시 알려줍니다.

## 이중 레이어 조건 시스템

trigger/chain 설계에서 가장 미묘한 부분입니다. 독립적인 두 레이어의 조건이 있고, 다른 목적을 가집니다.

**Node 조건** (NodeBehavior Window에서 설정)은 흐름 자체를 제어합니다.

Node 조건이 `false`로 평가되면:
- **trigger** 연결에서: 해당 특정 타겟이 발생하지 않지만, 같은 소스의 다른 trigger는 영향 없음
- **chain** 연결에서: 나머지 전체 시퀀스가 중단 — 이후 단계가 절대 실행되지 않음

**Event 조건** (Behavior Window에서 설정)은 사이드 이펙트만 제어합니다.

Event 조건이 `false`로 평가되면:
- 이벤트의 액션(사운드 재생, 파티클 생성 같은 게임플레이 응답)이 실행되지 않음
- 하지만 흐름은 계속됨 — 다음 chain 단계가 여전히 발생하고, trigger 디스패치도 진행

왜 이 구분이 존재하나요? "건너뛰기"와 "중단"은 근본적으로 다른 연산이기 때문입니다.

"사운드 재생은 건너뛰되 리스폰 시퀀스는 계속" → 사운드의 Event Action에 대한 event 조건. 체인은 다음 단계로 계속.

"플레이어에게 부활 토큰이 있으면, 전체 사망 시퀀스를 중단" → 첫 번째 chain 단계에 대한 node 조건. 전체 체인이 멈춤.

Flow Graph에서 두 조건 타입 모두 해당 노드에 보입니다. 런타임 디버깅 중에 어떤 레이어가 실행을 차단했는지 볼 수 있습니다. 이 가시성만으로도 "왜 체인이 멈췄지?" 질문에 대한 디버깅 시간을 몇 시간 절약합니다.

## 중첩 그룹: 복잡한 흐름 정리

흐름이 커지면 — 20+ 노드, 다수의 trigger 팬아웃, 분기 체인 — 그래프가 읽기 어려워질 수 있습니다. GES는 중첩 그룹을 지원합니다: 하위 흐름을 하나의 레이블된 박스로 접는 비주얼 컨테이너.

보스 페이즈 전환을 "페이즈 2 전환" 그룹으로 묶습니다. 접습니다. 이제 최상위 그래프에 12개의 중간 노드 대신 `OnBossHP50` → `[페이즈 2 전환]` → `OnPhase2Active`가 보입니다.

내부를 편집할 때 그룹을 펼칩니다. 큰 그림을 원할 때 접습니다. IDE의 코드 접기와 같은 개념입니다 — 완료된 디테일을 숨기고 구조를 보여줍니다.

## 패턴 갤러리: 세 가지 일반적인 아키텍처

여러 프로젝트에서 trigger와 chain을 사용한 후, 세 가지 패턴이 일관되게 나타납니다.

### Broadcaster 패턴

하나의 소스, 다수의 독립적 응답. 순수 trigger 팬아웃.

![Broadcaster Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-broadcaster.png)

`OnPlayerDeath`가 트리거: 점수 업데이트, 분석 로깅, 사운드 재생, UI 표시, AI 알림. 모두 독립적. 모두 폴트 톨러런트. 분석 로깅이 실패해도 사운드는 재생됩니다.

**사용 시기:** 이벤트 응답이 독립적이고 조율이 필요 없을 때. 가장 일반적인 패턴 — 아마 모든 이벤트 연결의 60%.

**코드 동등물:**

```csharp
onPlayerDeath.AddTriggerEvent(onUpdateScore);
onPlayerDeath.AddTriggerEvent(onLogAnalytics);
onPlayerDeath.AddTriggerEvent(onPlaySound);
onPlayerDeath.AddTriggerEvent(onShowDeathUI);
onPlayerDeath.AddTriggerEvent(onNotifyAI);
```

### Cinematic 패턴

타이밍 제어가 있는 엄격한 순차 흐름. 순수 chain.

![Cinematic Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-cinematic.png)

`OnCutsceneStart`가 chain: 카메라 이동 (waitForCompletion) → 대사 시작 (waitForCompletion) → 선택지 UI 표시 (waitForCompletion) → 선택에 따라 적절한 분기 진행.

**사용 시기:** 순서가 핵심일 때. 단계 A가 끝나지 않은 상태에서 단계 B가 실행되면 깨지거나 잘못된 결과를 만들 때. 컷신, 튜토리얼, 순차 상태 변경.

**코드 동등물:**

```csharp
onCutsceneStart.AddChainEvent(onMoveCamera, waitForCompletion: true);
onMoveCamera.AddChainEvent(onStartDialogue, waitForCompletion: true);
onStartDialogue.AddChainEvent(onShowChoiceUI, waitForCompletion: true);
```

### Hybrid Boss 패턴

병렬 즉시 피드백 + 순차 상태 변경 + 조건 분기. 두 패턴의 전체 파워.

![Hybrid Boss Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-hybrid.png)

`OnBossPhaseTransition`:
- **Trigger (병렬):** 경고 사운드, 화면 흔들림, UI 알림, 파티클 버스트
- **Chain (순차):** 보스 무적 → 포효 애니메이션 (waitForCompletion) → 미니언 스폰 (시차 딜레이) → 새 공격 패턴 로드 → 보스 취약성 복원
- **마지막 단계의 node 조건:** 마지막 페이즈라면, 대신 특별 엔딩 체인으로 분기

**사용 시기:** 복잡한 게임 순간의 현실적인 패턴. 즉각적인 감각 피드백(trigger) + 신중한 상태 변경(chain) + 조건 분기(node 조건).

**코드 동등물:**

```csharp
void SetupBossTransition()
{
    // 즉시 피드백 (병렬)
    onBossPhaseTransition.AddTriggerEvent(onWarningSound);
    onBossPhaseTransition.AddTriggerEvent(onScreenShake);
    onBossPhaseTransition.AddTriggerEvent(onUIAlert);

    // 상태 변경 (순차)
    onBossPhaseTransition.AddChainEvent(onBossInvulnerable);
    onBossInvulnerable.AddChainEvent(onRoarAnimation, waitForCompletion: true);
    onRoarAnimation.AddChainEvent(onSpawnMinions, delay: 0.5f);
    onSpawnMinions.AddChainEvent(onLoadAttackPatterns);
    onLoadAttackPatterns.AddChainEvent(onBossVulnerable);
}
```

## 런타임 디버깅: 흐름 실행 관찰

Flow Graph는 단순한 설정 도구가 아닙니다. Play 모드에서 전체 흐름이 실시간으로 실행되는 것을 관찰할 수 있습니다:

- **활성 노드**가 연결 색상으로 펄스합니다 (trigger는 주황색, chain은 초록색)
- **완료된 노드**가 잠깐 깜박입니다
- **건너뛴 노드** (조건이 false)가 빨간 플래시를 보여줍니다
- **에러 노드**가 지속적인 빨간 하이라이트를 보여줍니다

보스 페이즈 전환이 단계별로 실행되는 것을 관찰할 수 있습니다. Trigger 팬아웃이 동시에 발생하는 것을 봅니다. Chain이 각 단계를 거쳐 진행하는 것을 봅니다. 조건이 단계를 차단하거나 에러가 흐름을 끊을 때 즉시 파악합니다.

이 가시성이 코루틴 기반 흐름에서 잃어버리는 것입니다. 코루틴이 중간에 조용히 멈추면, Debug.Log 문을 사방에 추가하고 탐정 놀이를 합니다. Flow Graph 노드가 빨간 플래시를 보이면, 어디서 왜인지 정확히 봅니다.

## 결정 프레임워크

여러 프로젝트에서 trigger와 chain 패턴을 사용한 후의 경험적 규칙입니다:

**기본은 Trigger.** 확실하지 않으면 trigger로 시작하세요. 대부분의 이벤트 연결은 "이 시스템이 이 이벤트에 독립적으로 응답해야 한다"입니다. 사운드, 파티클, UI, 분석, 상태 추적 — 모두 trigger. 아마 연결의 60-70%.

**순서가 핵심일 때 Chain으로 업그레이드.** 단계 A가 끝나지 않은 상태에서 단계 B가 깨진다면 chain입니다. 텔레포트 전의 페이드. 초기화 전의 로드. 히트박스 활성화 전의 애니메이션.

**즉시 피드백 + 지연된 결과가 있을 때 둘 다 사용.** 즉각적 감각 반응(사운드, 파티클, 비주얼 이펙트)은 trigger. 신중한 상태 변경(씬 로드, 텔레포트, 데이터 저장)은 chain. 플레이어는 즉시 반응을 느끼면서 게임 상태는 안전하게 순차적으로 업데이트됩니다.

**타입이 일치하지 않으면 Argument Transformer 사용.** 타입 변환을 위한 중간 이벤트를 만들지 마세요. 연결에 트랜스포머를 놓고 프로퍼티 경로를 지정하세요.

**"중단"에는 node 조건 사용.** 나머지 전체 chain이 멈춥니다. "플레이어에게 부활 토큰이 있다면? 사망 시퀀스를 실행하지 않음."

**"건너뛰기"에는 event 조건 사용.** 체인은 계속되지만 이 단계의 사이드 이펙트는 실행되지 않습니다. "음소거 모드? 사운드는 건너뛰되 리스폰은 계속."

비주얼 Flow Graph가 이 모든 것을 명시적으로 만듭니다. 병렬은 주황색. 순차는 초록색. 연결의 트랜스포머. 노드의 조건. 복잡한 게임 흐름 — 보스 전투, 컷신, 사망 시퀀스 — 의 전체 아키텍처가 수십 개의 파일에 흩어지는 대신 하나의 창에 보입니다.

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
