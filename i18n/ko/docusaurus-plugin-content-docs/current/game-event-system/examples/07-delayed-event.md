---
sidebar_label: '07 지연 이벤트'
sidebar_position: 8
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 07 지연 이벤트: 시한폭탄 시나리오

<VideoGif src="/video/game-event-system/example/07-delayed-event.mp4" />

## 📋 개요

표준 이벤트는 즉시 발동됩니다(`Raise()` → `Execute()`). 지연 이벤트는 중요한 간격을 도입합니다: `Raise()` → **[대기 상태]** → `Execute()`. 이 데모는 고전적인 "전선 자르기" 미니 게임을 통해 **스케줄링 시스템**을 보여주며, 지연된 실행을 구성하는 방법과—중요하게는—실행되기 전에 대기 중인 이벤트를 **취소**하는 방법을 배우게 됩니다.

:::tip 💡 배울 내용
- Behavior Window에서 액션 지연을 구성하는 방법
- 이벤트 스케줄링 시스템이 내부적으로 작동하는 방식
- `.Cancel()`로 대기 중인 이벤트를 취소하는 방법
- 비주얼 타이머와 로직 타이머의 차이점

:::

---

## 🎬 데모 씬
```
Assets/TinyGiants/GameEventSystem/Demo/07_DelayedEvent/07_DelayedEvent.unity
```

### 씬 구성

**시각적 요소:**
- 💣 **TimeBomb_TNT** - 중앙의 원통형 폭탄
  - 빨간 캡이 있는 검은 원통 본체
  - 카운트다운을 보여주는 주황색 타이머 디스플레이: "04.046" (실시간 업데이트)
  - 상단의 두 개의 색상 표시등(빨강과 녹색)
  - 회색 원형 플랫폼 위에 위치
  

**UI 레이어 (Canvas):**
- 🎮 **세 개의 버튼** - 화면 하단
  - "Arm Bomb" (흰색) → `DelayedEventRaiser.ArmBomb()` 트리거
  - "Cut RedWire" (빨강/핑크) → `DelayedEventRaiser.CutRedWire()` 트리거
  - "Cut GreenWire" (녹색) → `DelayedEventRaiser.CutGreenWire()` 트리거

**게임 로직 레이어 (Demo Scripts):**
- 📤 **DelayedEventRaiser** - raiser 스크립트가 있는 GameObject
  - 폭탄 장착 및 전선 자르기 로직 관리
  - 각 라운드마다 어느 전선이 안전한지 무작위로 결정
  - 시각적 카운트다운 타이머 제어(장식용)
  - 올바른 전선이 잘릴 때 `.Cancel()` 호출

- 📥 **DelayedEventReceiver** - receiver 스크립트가 있는 GameObject
  - `onExplodeEvent` 리스닝
  - 폭발 로직 실행: VFX, 물리, 카메라 흔들림
  - 타이머가 0에 도달할 때만 호출(취소되지 않은 경우)

**오디오-비주얼 피드백:**
- 🔊 **틱 사운드** - 카운트다운 중 매초마다 재생
- 💥 **폭발 VFX** - 폭발 시 파티클 시스템 생성
- ⚡ **전선 스파크** - 전선 자를 때 파티클 효과
- 📹 **카메라 흔들림** - 폭발 시 강렬한 흔들림

---

## 🎮 상호작용 방법

### 해체 챌린지

올바른 전선을 식별하고 자를 시간이 **5초** 있습니다. 하나의 전선은 **안전**(이벤트 취소)하고, 다른 하나는 **함정**(아무것도 하지 않음)입니다.

:::warning 🎲 무작위 선택

폭탄을 장착할 때마다 안전한 전선이 무작위로 선택됩니다! 콘솔 로그에 주의하세요(또는 운을 시험해 보세요).

:::

---

### 1단계: 플레이 모드 진입

Unity에서 **Play** 버튼을 누릅니다. 폭탄은 흰색 텍스트로 "READY"를 표시합니다.

---

### 2단계: 폭탄 장착

**"Arm Bomb" (흰색 버튼) 클릭:**

**발생하는 일:**
1. 🔊 틱 사운드 시작(매초 비프음)
2. ⏱️ 타이머가 주황색으로 `05.000`부터 카운트다운 시작
3. 🎲 시스템이 안전한 전선(빨강 또는 녹색)을 무작위로 선택
4. 📝 **콘솔이 답을 공개:** `[Game Logic] Bomb Armed! The SAFE wire is: Red`
5. 💣 이벤트가 **대기 상태** 진입 - 5초 후 실행됨

**시각적 변화:**
- 타이머 텍스트가 흰색에서 주황색으로 변경
- 타이머가 밀리초 정밀도로 카운트다운: `04.987`, `04.834`...
- 시간이 다 되면서 색상이 주황색 → 빨강으로 점차 변경

**무대 뒤:**
- `explodeEvent.Raise()`가 호출됨
- **Action Delay = 5s**가 Behavior Window에 구성되어 있기 때문에
- 이벤트가 GameEventManager의 스케줄러에 **큐잉**됨
- 내부적으로 카운트다운 타이머 시작

---

### 3단계: 운명 선택

이제 매우 다른 결과를 가진 세 가지 옵션이 있습니다:

#### 옵션 A: 아무것도 하지 않기 (폭발시키기)

**행동:** 아무 버튼도 클릭하지 않음. 대기.

**타임라인:**
- `04.000` - 두 번째 틱 사운드
- `03.000` - 틱, 타이머가 더 빨갛게 변함
- `02.000` - 틱, 긴박감 증가
- `01.000` - 마지막 틱
- `00.000` - **쾅!**

**결과:** 💥 **폭발**
- 콘솔: `BOOM! The event executed.`
- 폭탄 위치에 거대한 폭발 VFX 생성
- 폭탄 원통이 운동학적이 되어 공중으로 발사됨
- 카메라가 격렬하게 흔들림(0.5초 지속, 0.8 크기)
- 폭발 사운드 재생
- 타이머 텍스트가 진한 빨강으로 "ERROR"로 변경

**이유:** 5초 지연이 경과하여 스케줄러에 의해 `DelayedEventReceiver.OnExplode()`가 호출됨.

---

#### 옵션 B: 잘못된 전선 자르기

**행동:** 안전한 전선이 **아닌** 버튼을 클릭.

예시: 콘솔이 `The SAFE wire is: Red`라고 말하면 **"Cut GreenWire"** 클릭

**발생하는 일:**
1. ⚡ 전선 스파크 VFX 재생
2. 🔊 전선 자르기 사운드
3. 📝 콘솔: `[Player] Cutting Green Wire...`
4. 📝 콘솔: `Wrong wire! The clock is still ticking...`
5. ⏱️ **타이머가 계속 카운트다운**
6. 💣 이벤트가 **대기 상태** 유지

**결과:** 아무것도 변하지 않음. 카운트다운 계속.
- 몇 초 후: **쾅!** (옵션 A와 동일)
- 잘못된 선택을 한 긴장감을 느낄 수 있음

**이유:** 코드가 `if (color == _safeWireColor)`를 확인하고, false이므로 `.Cancel()`이 절대 호출되지 않음. 스케줄러가 계속 실행됨.

---

#### 옵션 C: 올바른 전선 자르기 (해체)

**행동:** 안전한 전선과 일치하는 버튼 클릭.

예시: 콘솔이 `The SAFE wire is: Red`라고 말하면 **"Cut RedWire"** 클릭

**발생하는 일:**
1. ⚡ 전선 스파크 VFX 재생
2. 🔊 전선 자르기 사운드
3. 📝 콘솔: `[Player] Cutting Red Wire...`
4. 🎯 **중요:** `explodeEvent.Cancel()`이 호출됨
5. ⏱️ 타이머가 현재 값에서 **즉시 중지** (예: `03.247`)
6. 📝 콘솔: `BOMB DEFUSED! Event Cancelled.`
7. ✅ 타이머 텍스트가 **녹색**으로 "DEFUSED"로 변경
8. 🔕 해체 성공 사운드 재생
9. 💣 이벤트가 **대기 상태**에서 제거됨

**결과:** 🟢 **성공 - 폭발 없음**
- 폭탄이 안전함
- `DelayedEventReceiver.OnExplode()`가 **절대 호출되지 않음**
- 다른 라운드를 위해 폭탄을 다시 장착할 수 있음

**이유:** `.Cancel()`이 GameEventManager의 내부 큐에서 예약된 이벤트를 제거함. 5초 타이머가 경과했을 때 실행할 것이 없음.

---

## 🏗️ 씬 아키텍처

### 스케줄링 시스템

지연 이벤트는 GameEventManager가 관리하는 내부 타이머를 사용합니다:
```
🚀 시작: Raise()
│
📦 [ 이벤트 큐잉 + 타이머 시작 ]
│
⏳ 상태: 대기 중...
│
├─ ⚡ 실행 경로 (타이머 만료)
│  └─► ✅ Execute() ➔ 로직 호출
│
└─ 🛑 중단 경로 (수동/조건)
   └─► 🧹 Cancel() ➔ [ 큐에서 제거 ]
```

**핵심 개념:**
- **대기 상태:** `Raise()`와 실행 사이
- **스케줄러 큐:** 시간 지정 이벤트의 내부 목록
- **취소:** 실행 전 큐에서 이벤트 제거
- **원자적 작업:** 취소되면 receiver 메서드가 절대 실행되지 않음

---

### 이벤트 정의

![Game Event Editor](/img/game-event-system/examples/07-delayed-event/demo-07-editor.png)

| 이벤트 이름      | 타입               | 구성된 지연  |
| ---------------- | ------------------ | ------------ |
| `onExplodeEvent` | `GameEvent` (void) | 5.0초        |

---

### 지연을 사용한 Behavior 구성

Behavior 열의 **(void)** 아이콘을 클릭하여 Behavior Window를 엽니다:

![Behavior Settings](/img/game-event-system/examples/07-delayed-event/demo-07-behavior.png)

**스케줄 구성 섹션:**
- ⏱️ **Action Delay:** `5`초
  - 이것은 `Raise()`와 실행 사이의 시간 간격
  - 에디터에서 이벤트별로 구성 가능
  - 타이밍 조정을 위한 코드 변경 불필요

- 🔄 **Repeat Interval:** `0` (비활성화됨)
- 🔢 **Repeat Count:** `Infinite Loop` (이 데모에서 사용 안 함)
- 💾 **Persistent Event:** 체크 해제됨

**이벤트 액션:**
- 메서드: `DelayedEventReceiver.OnExplode()`
- 모드: Runtime Only

:::tip ⚙️ 쉬운 타이밍 조정

폭탄 카운트다운을 더 빠르거나 느리게 만들고 싶으신가요? 이 창에서 **Action Delay** 값만 변경하면 됩니다. 더 어려운 난이도를 위해 `3`을 시도하거나 더 쉬운 난이도를 위해 `10`을 시도해 보세요!

:::

---

### Sender 설정 (DelayedEventRaiser)

**DelayedEventRaiser** GameObject를 선택하세요:

![DelayedEventRaiser Inspector](/img/game-event-system/examples/07-delayed-event/demo-07-inspector.png)

**이벤트 채널:**
- `Explode Event`: `onExplodeEvent`
  - 툴팁: "Configuration: Start Delay = 5.0 seconds"

**참조:**
- `Bomb Receiver`: DelayedEventReceiver (콜백 조정용)

**비주얼:**
- `Timer Text`: TimerText (TextMeshPro) - 카운트다운 표시
- `Sparks VFX`: WireSparksVFX (Particle System) - 전선 자르기 효과

---

### Receiver 설정 (DelayedEventReceiver)

**DelayedEventReceiver** GameObject를 선택하세요:

![DelayedEventReceiver Inspector](/img/game-event-system/examples/07-delayed-event/demo-07-receiver.png)

**참조:**
- `Bomb Raiser`: DelayedEventRaiser (상태 콜백용)
- `Bomb Rigidbody`: TimeBomb_TNT (Rigidbody) - 폭발 물리용

**비주얼:**
- `Explosion VFX Prefab`: BombExplosionVFX (Particle System)

**오디오:**
- `Tick Clip`: BeepSFX (매초 틱 사운드)
- `Explosion Clip`: BoomSFX (폭발 사운드)
- `Defuse Clip`: DefuseSFX (성공 사운드)

---

## 💻 코드 분석

### 📤 DelayedEventRaiser.cs (Sender)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;
using System.Collections;

public class DelayedEventRaiser : MonoBehaviour
{
    [Header("Event Channels")]
    [Tooltip("Configuration: Start Delay = 5.0 seconds.")]
    [GameEventDropdown] public GameEvent explodeEvent;

    private bool _isArmed;
    private float _countDownTime = 5.0f;
    private string _safeWireColor; // 각 라운드마다 무작위화

    /// <summary>
    /// 버튼 액션: 폭탄을 장착하고 지연 이벤트를 시작합니다.
    /// </summary>
    public void ArmBomb()
    {
        if (_isArmed || explodeEvent == null) return;

        _isArmed = true;
        
        // 퍼즐 솔루션 무작위화
        _safeWireColor = Random.value > 0.5f ? "Red" : "Green";
        Debug.Log($"[Game Logic] Bomb Armed! The SAFE wire is: " +
                  $"<color={_safeWireColor.ToLower()}>{_safeWireColor}</color>");

        // 중요: 지연 이벤트 발동
        // 이것은 즉시 실행되지 않습니다!
        // 이벤트가 5초 동안 "대기 상태"에 진입합니다
        explodeEvent.Raise();
        
        // 장식용 카운트다운 시작(비주얼만)
        StartCoroutine(CountdownRoutine());
    }

    /// <summary>
    /// 버튼 액션: 플레이어가 빨간 전선을 자르려고 시도합니다.
    /// </summary>
    public void CutRedWire() => ProcessCut("Red");

    /// <summary>
    /// 버튼 액션: 플레이어가 녹색 전선을 자르려고 시도합니다.
    /// </summary>
    public void CutGreenWire() => ProcessCut("Green");

    private void ProcessCut(string color)
    {
        if (!_isArmed) return;

        Debug.Log($"[Player] Cutting {color} Wire...");

        // 전선 자르기 VFX 재생...

        // 중요한 결정 지점
        if (color == _safeWireColor)
        {
            // 마법: 대기 중인 이벤트 취소
            // 이것은 스케줄러 큐에서 제거합니다
            // OnExplode()가 절대 호출되지 않습니다
            explodeEvent.Cancel();
            
            DisarmSuccess();
        }
        else
        {
            // 잘못된 전선 - 이벤트가 대기 상태 유지
            Debug.LogWarning("Wrong wire! The clock is still ticking...");
        }
    }

    private void DisarmSuccess()
    {
        _isArmed = false;
        StopAllCoroutines(); // 비주얼 카운트다운 중지
        
        // UI를 업데이트하여 성공 표시...
        Debug.Log("<color=green>BOMB DEFUSED! Event Cancelled.</color>");
    }

    private IEnumerator CountdownRoutine()
    {
        // 이것은 순전히 장식용입니다
        // 실제 타이머는 GameEventManager의 스케줄러가 관리합니다
        // 이 코루틴이 멈추더라도 폭탄은 여전히 폭발합니다
        
        float _currentTimer = _countDownTime;
        
        while (_currentTimer > 0)
        {
            _currentTimer -= Time.deltaTime;
            if (_currentTimer < 0) _currentTimer = 0;

            // 비주얼 타이머 텍스트 업데이트
            if (timerText)
            {
                timerText.text = _currentTimer.ToString("00.000");
                
                // 긴박감을 위해 주황색에서 빨강으로 색상 보간
                float urgency = 1f - (_currentTimer / _countDownTime);
                timerText.color = Color.Lerp(new Color(1f, 0.5f, 0f), 
                                            Color.red, urgency);
            }
            
            yield return null;
        }
    }
}
```

**핵심 포인트:**
- 🎯 **관심사 분리** - 비주얼 타이머(코루틴) vs 로직 타이머(스케줄러)
- 🎲 **무작위 선택** - `_safeWireColor`가 각 라운드마다 결정됨
- 🔴 **취소 API** - `.Cancel()`이 큐에서 대기 중인 이벤트를 제거
- ⏱️ **장식용 카운트다운** - UI가 이벤트 시스템과 독립적으로 업데이트

---

### 📥 DelayedEventReceiver.cs (Listener)
```csharp
using UnityEngine;
using System.Collections;

public class DelayedEventReceiver : MonoBehaviour
{
    [SerializeField] private Rigidbody bombRigidbody;
    [SerializeField] private ParticleSystem explosionVFXPrefab;
    
    private AudioSource _audioSource;
    private Camera _mainCamera;

    /// <summary>
    /// [이벤트 콜백 - 지연 실행]
    /// 
    /// 이 메서드는 다음의 경우에만 호출됩니다:
    /// 1. explodeEvent.Raise()가 호출됨
    /// 2. 5초가 경과함
    /// 3. 그 시간 동안 explodeEvent.Cancel()이 호출되지 않음
    /// 
    /// 올바른 전선이 잘리면 이 메서드는 절대 실행되지 않습니다.
    /// </summary>
    public void OnExplode()
    {
        Debug.Log("<color=red><b>BOOM! The event executed.</b></color>");

        // 폭발 VFX 생성
        if (explosionVFXPrefab != null)
        {
            ParticleSystem vfx = Instantiate(explosionVFXPrefab, 
                                            transform.position, 
                                            Quaternion.identity);
            vfx.Play();
            Destroy(vfx.gameObject, 3.0f);
        }

        // 폭탄에 물리 활성화
        if (bombRigidbody)
        {
            bombRigidbody.isKinematic = false;
            
            // 폭발력 적용(폭탄을 위로 발사)
            bombRigidbody.AddExplosionForce(2000f, 
                                           transform.position + Vector3.down * 0.5f, 
                                           5f);
            bombRigidbody.AddTorque(Random.insideUnitSphere * 100f, 
                                   ForceMode.Impulse);
        }
        
        // 오디오 + 카메라 흔들림
        if (explosionClip) _audioSource.PlayOneShot(explosionClip);
        StartCoroutine(ShakeCamera(0.5f, 0.8f));
    }

    private IEnumerator ShakeCamera(float duration, float magnitude)
    {
        if (_mainCamera == null) yield break;
        
        Vector3 originalPos = _mainCamera.transform.position;
        float elapsed = 0f;
        
        while (elapsed < duration)
        {
            float x = Random.Range(-1f, 1f) * magnitude;
            float y = Random.Range(-1f, 1f) * magnitude;
            _mainCamera.transform.position = originalPos + new Vector3(x, y, 0);
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        _mainCamera.transform.position = originalPos;
    }
}
```

**핵심 포인트:**
- 🎯 **조건부 실행** - 취소되지 않은 경우에만 실행
- 💥 **폭발 로직** - VFX, 물리, 오디오, 카메라 흔들림
- 🎬 **순수 반응** - 타이머나 취소에 대한 지식 없음
- ⏱️ **지연된 호출** - `Raise()` 5초 후 호출됨(취소되지 않은 경우)

---

## 🔑 핵심 요점

| 개념                   | 구현                                                    |
| ---------------------- | ------------------------------------------------------- |
| ⏱️ **Action Delay**     | Behavior Window에서 실행 지연 구성(코드 없음)           |
| 📋 **대기 상태**        | 이벤트가 Raise와 Execute 사이에 스케줄러 큐에서 대기    |
| 🔴 **취소 API**         | `.Cancel()`이 실행 전 큐에서 이벤트 제거                |
| 🎯 **원자적 실행**      | 취소된 이벤트는 receiver 메서드를 절대 호출하지 않음    |
| 🎨 **비주얼 vs 로직**   | 장식용 타이머를 이벤트 시스템 타이머와 분리             |

:::note 🎓 설계 인사이트

지연 이벤트는 다음에 완벽합니다:

- **시간 제한 능력** - 쿨다운, 캐스팅 시간, 채널링
- **카운트다운 메커니즘** - 폭탄, 버프 만료, 지원군 도착
- **취소 가능한 액션** - 캐스팅 중단, 해체 메커니즘
- **턴 기반 지연** - 다음 액션 전 애니메이션 대기
- **예약된 이벤트** - 낮/밤 사이클 트리거, 주기적 생성

`.Cancel()` API는 상호작용 게임플레이에 중요합니다—플레이어가 위험한 액션을 중단할 수 있게 하면 긴장감과 플레이어 주도성이 추가됩니다!

:::

---

## 🎯 다음 단계

지연 실행과 취소를 마스터했습니다. 이제 주기적인 동작을 위한 **반복 이벤트**를 탐색해 봅시다.

**다음 챕터**: **[08 Repeating Event](./08-repeating-event.md)**에서 반복 간격에 대해 배우기

---

## 📚 관련 문서

- **[Game Event Behavior](../visual-workflow/game-event-behavior.md)** - 스케줄 구성에 대한 완전한 가이드
- **[Raising and Scheduling](../scripting/raising-and-scheduling.md)** - `.Raise()` 및 `.Cancel()`에 대한 API 레퍼런스
- **[Best Practices](../scripting/best-practices.md)** - 시간 제한 게임플레이 메커니즘을 위한 패턴