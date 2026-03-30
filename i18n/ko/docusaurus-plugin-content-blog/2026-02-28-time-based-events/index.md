---
slug: raising-and-scheduling-api
title: '시간 기반 이벤트: 코루틴이 지연과 반복에 적합하지 않은 이유'
authors: [tinygiants]
tags: [ges, unity, scripting, tutorial, advanced]
description: "코루틴은 간단한 딜레이를 쉽게 만들고 나머지 모든 것을 고통스럽게 만듭니다. 취소, 라이프사이클 콜백, 반복 관리 — Unity의 시간 기반 이벤트를 처리하는 더 나은 방법이 있습니다."
image: /img/home-page/game-event-system-preview.png
---

수류탄이 착지한 후 2초 뒤에 폭발을 지연시켜야 합니다. 충분히 간단합니다. 코루틴을 작성합니다. `IEnumerator DelayedExplosion()`, yield return `new WaitForSeconds(2f)`, 폭발 로직 호출. 깔끔하게 정리하면 10줄 정도. 기분이 좋습니다.

그런데 디자이너가 "플레이어가 폭탄을 해제할 수 있어야 해요"라고 합니다. 좋아요, 이제 `StopCoroutine()`을 호출할 수 있도록 `Coroutine` 레퍼런스를 저장해야 합니다. 잠깐 — 코루틴이 시작되기 전에 해제하면? null 체크가 필요합니다. 대기 중에 게임 오브젝트가 파괴되면? 또 다른 null 체크. 코루틴이 완료되는 정확한 프레임에 해제하면? 경쟁 조건. 10줄이 25줄이 됐고, "해제 메시지 vs. 폭발 표시" 분기 처리는 시작도 하지 않았습니다.

이것이 Unity의 모든 시간 기반 이벤트의 이야기입니다. 첫 번째 구현은 깔끔합니다. 두 번째 요구사항이 코드를 두 배로 늘립니다. 세 번째는 직업 선택을 의심하게 만듭니다.

<!-- truncate -->

## 간단한 딜레이에 대한 코루틴 세금

"간단한 딜레이"가 프로덕션 Unity 코드에서 실제로 어떤 모습인지 솔직하게 이야기합시다. 튜토리얼 버전이 아니라 — 실제로 출시되는 버전.

```csharp
public class BombController : MonoBehaviour
{
    [SerializeField] private float fuseTime = 2f;

    private Coroutine _explosionCoroutine;
    private bool _isArmed;
    private bool _isExploded;

    public void ArmBomb()
    {
        if (_isArmed) return;
        _isArmed = true;
        _explosionCoroutine = StartCoroutine(DelayedExplosion());
    }

    public void Defuse()
    {
        if (!_isArmed || _isExploded) return;

        if (_explosionCoroutine != null)
        {
            StopCoroutine(_explosionCoroutine);
            _explosionCoroutine = null;
        }

        _isArmed = false;
        ShowDefuseMessage(); // 이걸 호출해야 한다는 걸 어떻게 알죠?
    }

    private IEnumerator DelayedExplosion()
    {
        yield return new WaitForSeconds(fuseTime);
        _isExploded = true;
        _explosionCoroutine = null;
        DoExplosion();
        // "완료 시" 로직은?
        // 그냥... 여기에 넣나? 다른 것이 알아야 하지 않기를 바라면서?
    }

    private void OnDestroy()
    {
        if (_explosionCoroutine != null)
            StopCoroutine(_explosionCoroutine);
    }
}
```

"2초 기다렸다가 폭발, 취소 가능"에 약 40줄입니다. 그리고 아직 흥미로운 부분은 시작도 안 했습니다.

## 반복 추가: 독 데미지 문제

게임에 독 효과가 있습니다. 틱당 10 데미지, 1초마다, 5틱. 또 다른 코루틴.

```csharp
private Coroutine _poisonCoroutine;
private int _poisonTicksRemaining;

public void ApplyPoison(int damage, float interval, int ticks)
{
    if (_poisonCoroutine != null)
        StopCoroutine(_poisonCoroutine);

    _poisonCoroutine = StartCoroutine(PoisonRoutine(damage, interval, ticks));
}

private IEnumerator PoisonRoutine(int damage, float interval, int ticks)
{
    _poisonTicksRemaining = ticks;

    for (int i = 0; i < ticks; i++)
    {
        yield return new WaitForSeconds(interval);
        ApplyDamage(damage);
        _poisonTicksRemaining--;
        // UI에 남은 틱을 어떻게 알리죠?
        // 콜백 전달? 레퍼런스 저장? 이벤트 발생?
    }

    _poisonCoroutine = null;
    // 독이 자연스럽게 만료됨. "독이 치료됨"과
    // 정리 로직에서 어떻게 구분하죠?
}

public void CurePoison()
{
    if (_poisonCoroutine != null)
    {
        StopCoroutine(_poisonCoroutine);
        _poisonCoroutine = null;
        _poisonTicksRemaining = 0;
        // 치료 이펙트 재생? UI는 어떻게 업데이트 알죠?
    }
}
```

패턴을 주목하세요. 모든 시간 기반 동작에 필요한 것:
- 핸들을 추적하는 `Coroutine` 필드
- null 체크와 함께 `StopCoroutine()` 호출
- 수동 상태 추적 (`_poisonTicksRemaining`)
- "자연스럽게 완료됨"과 "취소됨"을 구분하는 내장 방법 없음
- 다른 시스템에 진행 상태를 알리는 내장 방법 없음

그리고 이건 독 효과 하나입니다. 여러 독이 중첩될 수 있다면? 이제 `List&lt;Coroutine>`이 필요합니다. 각 독이 다른 틱 속도라면? 다른 지속시간이라면? 다른 취소 조건이라면?

## 라이프사이클 콜백의 부재

JavaScript 개발자들이 당연하게 여기는 것:

```javascript
const timer = setTimeout(() => explode(), 2000);
clearTimeout(timer); // 깔끔한 취소
```

C# async 개발자들이 당연하게 여기는 것:

```csharp
var cts = new CancellationTokenSource();
await Task.Delay(2000, cts.Token);
cts.Cancel(); // 적절한 예외 처리와 함께 깔끔한 취소
```

두 패러다임 모두 명확한 라이프사이클 의미를 가집니다. 무언가가 시작할 때, 완료될 때, 취소될 때를 알 수 있습니다. 각 상태 전환에 콜백을 붙일 수 있습니다.

Unity 코루틴에는 이런 게 하나도 없습니다. 코루틴은 블랙박스입니다. 실행 중이거나 아니거나. `OnCompleted` 콜백 없음. `OnCancelled` 콜백 없음. 반복 연산을 위한 `OnStep` 콜백 없음. 이 모든 걸 매번, 수동 상태 추적과 교차 참조 불리언 플래그로 직접 구축해야 합니다.

결과? MonoBehaviour가 이렇게 되기 시작합니다:

```csharp
private Coroutine _explosionCoroutine;
private Coroutine _poisonCoroutine;
private Coroutine _shieldRegenCoroutine;
private Coroutine _buffTimerCoroutine;
private Coroutine _respawnCoroutine;
private bool _isExploding;
private bool _isPoisoned;
private bool _isRegenerating;
private bool _isBuffed;
private bool _isRespawning;
private int _poisonTicksLeft;
private float _buffTimeLeft;
```

10개의 시간 기반 동작은 10개의 코루틴 필드, 10개의 불리언 플래그, 그리고 아마 거의 동일하게 생긴 10개의 메서드입니다: 코루틴 시작, 레퍼런스 저장, 정지 전 null 체크, 플래그 리셋. 컴포넌트의 60%가 타이머 관리 보일러플레이트입니다.

## 취약성 문제

코루틴은 시작한 MonoBehaviour에 묶여 있습니다. 게임 오브젝트가 파괴되면 — 풀링, 씬 전환, 수동 Destroy 호출 — 그 위의 모든 코루틴이 조용히 죽습니다. 알림 없음. 정리 콜백 없음. 경고 없음.

이것은:
- 풀링되는 수류탄 오브젝트의 폭발 코루틴? 오브젝트가 풀로 돌아갈 때 조용히 취소됨.
- 플레이어 오브젝트의 버프 타이머? 새 씬 로드할 때 사라짐.
- 반복 레이더 핑? 레이더 스테이션 프리팹이 재활용되는 순간 사망.

오브젝트에 `DontDestroyOnLoad`를 사용할 수 있지만, 그건 자체 문제를 유발합니다. 영속 싱글톤에서 코루틴을 시작할 수 있지만, 그러면 자연스러운 라이프사이클 바인딩을 잃습니다. 모든 솔루션에 관리할 더 많은 코드가 필요한 트레이드오프가 있습니다.

## 만약 스케줄링이 그냥... API라면?

여기서 GES가 근본적으로 다른 접근을 합니다. 수동으로 관리하는 코루틴에 타이머 로직을 감싸는 대신, GES는 스케줄링을 이벤트 자체의 일급 API로 취급합니다.

### 즉시: Raise()

가장 간단한 경우 — 지금 즉시 이벤트 발생, 딜레이 없음.

```csharp
[GameEventDropdown, SerializeField] private SingleGameEvent onBombExplode;

// 즉시 발생
onBombExplode.Raise();
```

모든 리스너가 같은 프레임에서 동기적으로 실행됩니다. 코루틴 관련 없음.

타입이 있는 이벤트:

```csharp
[GameEventDropdown, SerializeField] private Int32GameEvent onDamageDealt;

onDamageDealt.Raise(42);
```

Sender 이벤트:

```csharp
[GameEventDropdown, SerializeField] private Int32SenderGameEvent onDamageFromSource;

onDamageFromSource.Raise(this, 42);
```

### 지연: RaiseDelayed()

딜레이 후에 발생하도록 이벤트를 예약합니다. 한 줄. 핸들을 돌려받습니다.

```csharp
ScheduleHandle handle = onBombExplode.RaiseDelayed(2f);
```

그게 전부입니다. 2초 후에 `onBombExplode`가 발생합니다. 핸들은 이 예약된 실행에 관한 모든 것을 관리하는 티켓입니다 — 취소, 라이프사이클 콜백, 상태 확인.

타입이 있는 이벤트의 경우, 인자는 호출 시점에 캡처됩니다:

```csharp
ScheduleHandle handle = onDamageDealt.RaiseDelayed(50, 1.5f);
```

값 `50`은 `RaiseDelayed()`를 호출할 때 잠깁니다. 전달한 변수가 딜레이 만료 전에 변경되어도 원래 값이 사용됩니다. 서프라이즈 없음.

![Delayed Event Behavior](/img/game-event-system/examples/07-delayed-event/demo-07-behavior.png)

### 반복: RaiseRepeating()

정해진 간격으로 이벤트를 발생시킵니다. 정해진 횟수 또는 무한히.

```csharp
// 독: 1초마다 10 데미지, 총 5틱
ScheduleHandle handle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: 5);
```

`count`는 반복 횟수가 아니라 총 실행 횟수입니다. `count: 5`는 이벤트가 5번 발생한다는 뜻입니다.

![Repeating Event Finite](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-finite.png)

무한 반복 — 하트비트, 레이더 핑, 앰비언트 이펙트:

```csharp
// 레이더 스캔: 2초마다, 무한히
ScheduleHandle handle = onRadarPing.RaiseRepeating(interval: 2f, count: -1);
```

`count: -1`을 전달하면 취소할 때까지 실행됩니다.

![Repeating Event Infinite](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-infinite.png)

## ScheduleHandle: 코루틴이 되었어야 할 것

`RaiseDelayed()`와 `RaiseRepeating()`이 반환하는 `ScheduleHandle`이 진짜 파워가 있는 곳입니다. 코루틴이 수동으로 처리하게 놔두는 바로 그 문제를 해결하는 세 개의 라이프사이클 콜백을 가지고 있습니다.

### OnStep: 각 틱 후

```csharp
ScheduleHandle handle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: 5);

handle.OnStep((remainingCount) =>
{
    Debug.Log($"독 틱! {remainingCount}틱 남음");
    UpdatePoisonStackUI(remainingCount);
});
```

`OnStep`은 각 개별 실행 후에 발생합니다. `remainingCount`는 몇 번 남았는지 알려줍니다. 무한 루프에서는 항상 `-1`. 지연 이벤트(단일 실행)에서는 `remainingCount` `0`으로 한 번 발생합니다.

수동 카운터 추적 없음. `_poisonTicksRemaining` 필드 없음. 핸들이 알고 있습니다.

### OnCompleted: 자연 완료

```csharp
handle.OnCompleted(() =>
{
    Debug.Log("모든 독 틱 완료");
    RemovePoisonVisualEffect();
    ShowPoisonExpiredMessage();
});
```

모든 계획된 실행이 끝나면 발생합니다. 유한 스케줄에서만 발생 — 무한 루프는 자연적으로 완료되지 않습니다. `RaiseDelayed()`에서는 단일 지연 실행 후에 발생합니다.

딜레이 후 동작을 체이닝하는 깔끔한 방법입니다. 중첩 코루틴 없음. 콜백 스파게티 없음.

### OnCancelled: 수동 취소

```csharp
handle.OnCancelled(() =>
{
    Debug.Log("독이 일찍 치료됨!");
    PlayCureParticleEffect();
    ShowPoisonCuredMessage();
});
```

스케줄을 수동으로 취소할 때 발생합니다. 자연 완료 시에는 발생하지 않습니다. 두 콜백은 상호 배타적입니다.

이 구분이 코루틴으로는 불가능했던 것입니다. 독이 자연스럽게 끝나면 "만료" 메시지 표시. 치료되면 치료 애니메이션 재생. 코루틴에서는 어떤 경우인지 추적하기 위해 불리언 플래그가 필요했습니다. 핸들에서는 API가 알려줍니다.

### 체이닝: 플루언트 패턴

세 콜백 모두 핸들을 반환하므로 체이닝할 수 있습니다:

```csharp
ScheduleHandle handle = onCountdown.RaiseRepeating(interval: 1f, count: 10)
    .OnStep((remaining) => UpdateCountdownUI(remaining))
    .OnCompleted(() => TriggerLaunch())
    .OnCancelled(() => AbortLaunch());
```

루프, 카운터, "취소됨 vs. 완료됨"을 위한 불리언 플래그, 각 정리 경로를 위한 별도 메서드가 있는 코루틴과 비교해보세요. 근본적으로 다른 수준의 표현력입니다.

## 취소: 세 가지 방법, 모두 깔끔

### 직접 핸들 취소

```csharp
handle.Cancel();
```

모든 활성 핸들에서 동작합니다.

### 이벤트를 통해: CancelDelayed()

```csharp
onBombExplode.CancelDelayed(handle);
```

`handle.Cancel()`과 기능적으로 동일하지만, 여러 핸들을 관리할 때 더 명확하게 읽힙니다 — 어떤 이벤트에 대해 작업하는지를 강조합니다.

### 이벤트를 통해: CancelRepeating()

```csharp
onRadarPing.CancelRepeating(handle);
```

반복 스케줄에 대한 같은 패턴.

### 안전한 취소

핸들이 이미 완료됐을 가능성이 있다면 취소 전에 항상 `IsActive`를 확인하세요:

```csharp
private void StopAllSchedules()
{
    if (_explosionHandle.IsActive)
        _explosionHandle.Cancel();

    if (_poisonHandle.IsActive)
        _poisonHandle.Cancel();

    if (_radarHandle.IsActive)
        _radarHandle.Cancel();
}
```

비활성 핸들을 취소하는 것은 no-op입니다(예외 없음). 하지만 `IsActive` 확인이 의도를 명확하게 합니다.

## Inspector 통합: 비주얼 스케줄링

디자이너가 좋아하는 부분: 스케줄링 API와 Inspector의 Behavior Window가 함께 동작합니다. 코드를 건드리지 않고 딜레이와 반복 설정을 시각적으로 설정할 수 있습니다.

![Behavior Schedule](/img/game-event-system/visual-workflow/game-event-behavior/behavior-schedule.png)

Behavior 컴포넌트가 노출하는 것:
- **Delay**: 첫 번째 raise 전 초
- **Repeat Count**: 반복 횟수 (0 = 한 번, -1 = 무한)
- **Repeat Interval**: 반복 사이 초

이것들은 내부적으로 `RaiseDelayed()`와 `RaiseRepeating()`에 직접 매핑됩니다. 디자이너가 2초 딜레이에 1초 간격으로 3번 반복을 설정하면 — 코드에서 `RaiseDelayed(2f)` 후 `RaiseRepeating(interval: 1f, count: 3)`과 동등합니다.

디자이너는 코드 없이 타이밍을 조정합니다. 프로그래머는 스크립트에서 같은 타이밍을 오버라이드하거나 확장합니다. 두 경로 모두 같은 ScheduleHandle 관리를 생산합니다. 타이밍 로직을 누가 소유하는지에 대한 싸움 없음.

![Delayed Event Inspector](/img/game-event-system/examples/07-delayed-event/demo-07-inspector.png)

## 전체 비교: 폭탄 해제

전부 합쳐봅시다. 인트로의 폭탄 시나리오 — 이번에는 GES 스케줄링으로.

### 코루틴 버전 (오늘 작성하게 될 코드)

```csharp
public class BombCoroutine : MonoBehaviour
{
    [SerializeField] private float fuseTime = 30f;
    [SerializeField] private float tickInterval = 1f;

    private Coroutine _explosionCoroutine;
    private Coroutine _countdownCoroutine;
    private bool _isArmed;
    private bool _hasExploded;
    private int _ticksRemaining;

    public void ArmBomb()
    {
        if (_isArmed) return;
        _isArmed = true;
        _hasExploded = false;
        _ticksRemaining = Mathf.FloorToInt(fuseTime / tickInterval);

        _explosionCoroutine = StartCoroutine(ExplosionRoutine());
        _countdownCoroutine = StartCoroutine(CountdownRoutine());
    }

    private IEnumerator ExplosionRoutine()
    {
        yield return new WaitForSeconds(fuseTime);
        _hasExploded = true;
        _explosionCoroutine = null;
        // 폭발을 알리려면... 어떻게? 직접 참조? UnityEvent?
        Debug.Log("BOOM!");
    }

    private IEnumerator CountdownRoutine()
    {
        while (_ticksRemaining > 0)
        {
            yield return new WaitForSeconds(tickInterval);
            _ticksRemaining--;
            // UI에 알리려면... 어떻게?
            Debug.Log($"Tick... {_ticksRemaining}");
        }
        _countdownCoroutine = null;
    }

    public void AttemptDefusal()
    {
        if (!_isArmed || _hasExploded) return;

        _isArmed = false;

        if (_explosionCoroutine != null)
        {
            StopCoroutine(_explosionCoroutine);
            _explosionCoroutine = null;
        }
        if (_countdownCoroutine != null)
        {
            StopCoroutine(_countdownCoroutine);
            _countdownCoroutine = null;
        }

        // 해제됐나 폭발했나? _hasExploded 확인.
        // 다른 시스템에 알리려면? 수동 호출.
        Debug.Log("Defused!");
    }

    private void OnDestroy()
    {
        if (_explosionCoroutine != null)
            StopCoroutine(_explosionCoroutine);
        if (_countdownCoroutine != null)
            StopCoroutine(_countdownCoroutine);
    }
}
```

~50줄입니다. 두 개의 코루틴 필드, 두 개의 불리언 플래그, 수동 알림(`// but how?` 주석들), 라이프사이클 콜백 없음, UI는 `_ticksRemaining`을 폴링하거나 이 컴포넌트에 대한 직접 참조가 필요합니다.

### GES 버전

```csharp
public class BombController : MonoBehaviour
{
    [Header("Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombExplode;
    [GameEventDropdown, SerializeField] private Int32GameEvent onCountdownTick;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombDefused;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombArmed;

    [Header("Settings")]
    [SerializeField] private float fuseTime = 30f;
    [SerializeField] private float tickInterval = 1f;

    private ScheduleHandle _explosionHandle;
    private ScheduleHandle _countdownHandle;
    private bool _isArmed;

    public void ArmBomb()
    {
        if (_isArmed) return;
        _isArmed = true;

        onBombArmed.Raise();

        int totalTicks = Mathf.FloorToInt(fuseTime / tickInterval);

        _explosionHandle = onBombExplode.RaiseDelayed(fuseTime)
            .OnCompleted(() => Debug.Log("BOOM! Bomb exploded."));

        _countdownHandle = onCountdownTick.RaiseRepeating(
            totalTicks, interval: tickInterval, count: totalTicks)
            .OnStep((remaining) => Debug.Log($"Tick... {remaining} seconds left"));
    }

    public void AttemptDefusal(float progress)
    {
        if (!_isArmed) return;
        if (progress < 1f) return;

        _isArmed = false;

        if (_explosionHandle.IsActive) _explosionHandle.Cancel();
        if (_countdownHandle.IsActive) _countdownHandle.Cancel();

        _explosionHandle.OnCancelled(() => Debug.Log("Explosion cancelled!"));

        onBombDefused.Raise();
    }

    private void OnDisable()
    {
        if (_explosionHandle.IsActive) _explosionHandle.Cancel();
        if (_countdownHandle.IsActive) _countdownHandle.Cancel();
    }
}
```

UI 쪽은 완전히 디커플링 — `BombController`에 대한 참조가 전혀 없습니다:

```csharp
public class BombUI : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onCountdownTick;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombDefused;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombExplode;
    [SerializeField] private TextMeshProUGUI countdownText;
    [SerializeField] private GameObject bombPanel;

    private void OnEnable()
    {
        onCountdownTick.AddListener(UpdateCountdown);
        onBombDefused.AddListener(ShowDefusedMessage);
        onBombExplode.AddListener(ShowExplosionScreen);
    }

    private void OnDisable()
    {
        onCountdownTick.RemoveListener(UpdateCountdown);
        onBombDefused.RemoveListener(ShowDefusedMessage);
        onBombExplode.RemoveListener(ShowExplosionScreen);
    }

    private void UpdateCountdown(int secondsRemaining)
    {
        bombPanel.SetActive(true);
        countdownText.text = $"{secondsRemaining}";
        if (secondsRemaining <= 5)
            countdownText.color = Color.red;
    }

    private void ShowDefusedMessage()
    {
        countdownText.text = "DEFUSED";
        countdownText.color = Color.green;
    }

    private void ShowExplosionScreen()
    {
        bombPanel.SetActive(false);
    }
}
```

`BombController`는 UI의 존재를 모릅니다. `BombUI`는 폭탄의 내부 상태를 모릅니다. 스케줄링이 있는 이벤트를 통해 통신합니다. 폭탄이 자체 폭발과 카운트다운을 예약합니다. UI가 리스닝하고 반응합니다. 해제는 스케줄을 취소하고, 라이프사이클 콜백이 분기를 처리합니다. 코루틴 없음. `Update()` 루프 없음. 교차 참조 없음.

## 실전 패턴들

### 독 지속 데미지

```csharp
public class PoisonEffect : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onPoisonDamage;

    private ScheduleHandle _poisonHandle;

    public void ApplyPoison(int damagePerTick, float interval, int ticks)
    {
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);

        _poisonHandle = onPoisonDamage.RaiseRepeating(
            damagePerTick, interval: interval, count: ticks)
            .OnStep((remaining) => UpdatePoisonUI(remaining))
            .OnCompleted(() => ShowPoisonExpired())
            .OnCancelled(() => ShowPoisonCured());
    }

    public void CurePoison()
    {
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);
    }

    private void OnDisable()
    {
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);
    }
}
```

### 레이더 / 하트비트 시스템

```csharp
public class RadarSystem : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private SingleGameEvent onRadarPing;

    private ScheduleHandle _scanHandle;

    private void OnEnable()
    {
        _scanHandle = onRadarPing.RaiseRepeating(interval: 2f, count: -1)
            .OnStep((_) => Debug.Log("Radar ping sent"));
    }

    private void OnDisable()
    {
        if (_scanHandle.IsActive)
            onRadarPing.CancelRepeating(_scanHandle);
    }
}
```

이게 레이더 시스템 전체입니다. 실제 로직 7줄. 코루틴 없음, Update 루프 없음, 수동 타이머 추적 없음. enable 시 시작, disable 시 정지.

## 언제 무엇을 사용할 것인가

**`Raise()`는** 즉시 알림: 플레이어 사망, 버튼 클릭, 아이템 획득. 타이밍이 관련 없을 때.

**`RaiseDelayed()`는** 원샷 시간 이벤트: 퓨즈 후 폭발, 컷신 후 대사, 사망 타이머 후 리스폰. 기다린 후 한 번 일어나는 것.

**유한 count의 `RaiseRepeating()`은** 지속 데미지, 채널링 능력, 카운트다운, 다단계 시퀀스. 정해진 횟수만큼 펄스하는 것.

**count: -1의 `RaiseRepeating()`은** 하트비트 시스템, 폴링 루프, 앰비언트 이펙트, 레이더 핑. 명시적으로 정지할 때까지 실행되는 것.

**취소할 가능성이 있으면 항상 핸들을 저장하세요.** 실전에서는 거의 항상 필요합니다.

**`OnDisable()`에서 항상 정리하세요.** 스케줄이 활성 상태일 때 MonoBehaviour가 파괴되면 취소하세요. GES는 안 해도 크래시하지 않지만, 고아 스케줄은 코드 스멜입니다.

## 빠른 참조

| 메서드 | 반환값 | 설명 |
|--------|--------|------|
| `Raise()` | void | 즉시 실행 |
| `Raise(arg)` | void | 인자와 함께 즉시 |
| `Raise(sender, args)` | void | sender + args와 함께 즉시 |
| `RaiseDelayed(delay)` | ScheduleHandle | 지연된 void 이벤트 |
| `RaiseDelayed(arg, delay)` | ScheduleHandle | 지연된 타입 이벤트 |
| `RaiseDelayed(sender, args, delay)` | ScheduleHandle | 지연된 sender 이벤트 |
| `RaiseRepeating(interval, count)` | ScheduleHandle | 반복 void 이벤트 |
| `RaiseRepeating(arg, interval, count)` | ScheduleHandle | 반복 타입 이벤트 |
| `handle.OnStep(callback)` | ScheduleHandle | 각 실행 후 |
| `handle.OnCompleted(callback)` | ScheduleHandle | 자연 완료 후 |
| `handle.OnCancelled(callback)` | ScheduleHandle | 수동 취소 후 |
| `handle.Cancel()` | void | 스케줄 취소 |
| `handle.IsActive` | bool | 아직 실행 중인지 확인 |

스케줄링 API는 코루틴 관리 보일러플레이트를 선언적이고 핸들 관리되는 이벤트 타이밍으로 축약합니다. 패턴은 항상 동일합니다: raise, 핸들 캡처, 콜백 부착, 완료 시 취소. 이걸 내재화하면, 간단한 딜레이에 왜 `IEnumerator`를 작성했는지 진심으로 궁금해질 겁니다.

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
