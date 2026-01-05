---
sidebar_label: '08 반복 이벤트'
sidebar_position: 9
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 08 반복 이벤트: 자동화된 루프

<!-- <VideoGif src="/video/game-event-system/08-repeating-event.mp4" /> -->

## 📋 개요 (Overview)

일반적으로 레이더 스캔이나 독 데미지와 같이 반복되는 펄스를 생성하려면 C#에서 `InvokeRepeating` 또는 코루틴을 사용하여 타이머 루프를 작성해야 합니다. GameEvent System은 이 로직을 **이벤트 에셋(Event Asset)** 자체로 옮겨 코드 루프가 필요 없게 만듭니다. 에디터에서 한 번만 구성하면, `Raise()`를 호출할 때 시스템이 자동으로 반복을 처리합니다.

:::tip 💡 학습 내용
- Behavior 윈도우에서 반복 간격 및 횟수를 구성하는 방법
- 유한 루프(N회)와 무한 루프(영구 지속)의 차이점
- `.Cancel()`을 사용하여 무한 루프를 취소하는 방법
- 반복 이벤트와 수동 트리거의 사용 시기

:::

---

## 🎬 데모 씬 (Demo Scene)
```
Assets/TinyGiants/GameEventSystem/Demo/08_RepeatingEvent/08_RepeatingEvent.unity
```

### 씬 구성

**시각적 요소:**
- 📡 **SonarBeacon** - 중앙 타워 비컨
  - 회색 베이스의 검은색 원통형 타워
  - **RotatingCore** - 상단의 회전 요소 (회전 속도는 활성화 모드를 나타냄)
  - 펄스 발생 시 확장되는 시안색(Cyan) 충격파 링을 방출
  
- 🎯 **ScanTargets** - 비컨 주변에 흩어져 있는 4개의 부유하는 녹색 큐브
  - 기본적으로 "?" 텍스트 표시
  - 충격파에 닿으면 빨간색 재질로 변경되고 "DETECTED" 표시
  - 잠시 강조된 후 다시 녹색으로 초기화

- 🔵 **Cyan Ring** - 큰 원형 경계선
  - 최대 스캔 범위(반지름 40 유닛) 표시
  - 펄스 확장 영역의 시각적 가이드

**UI 레이어 (Canvas):**
- 🎮 **세 개의 버튼** - 화면 하단
  - "Activate Beacon" (흰색) → `RepeatingEventRaiser.ActivateBeacon()` 트리거
  - "Toggle Mode (Finite[5])" → `RepeatingEventRaiser.ToggleMode()` 트리거
    - 유한(Finite) 모드와 무한(Infinite) 모드 간 전환
    - 현재 모드를 보여주도록 텍스트 업데이트
  - "StopSignal" (흰색) → `RepeatingEventRaiser.StopSignal()` 트리거

**게임 로직 레이어 (데모 스크립트):**
- 📤 **RepeatingEventRaiser** - 레이저 스크립트가 포함된 게임 오브젝트
  - `onFinitePulseEvent`와 `onInfinitePulseEvent` 두 이벤트를 관리
  - 모드 전환 및 비컨 회전 속도 제어
  - `.Raise()`를 한 번만 호출하며, 시스템이 자동으로 반복 처리

- 📥 **RepeatingEventReceiver** - 리시버 스크립트가 포함된 게임 오브젝트
  - 펄스 이벤트를 리스닝
  - 충격파 VFX 및 소나 오디오 생성
  - 타겟 감지를 위해 물리 기반 스캔 루틴 실행

**시청각 피드백:**
- 💫 **ShockwaveVFX** - 확장되는 시안색 파티클 링
- 🔊 **Sonar Ping** - 매 스캔 시 오디오 펄스 발생
- 🎵 **Toggle/Stop Sounds** - UI 피드백 사운드

---

## 🎮 상호작용 방법

### 두 가지 루프 모드

이 데모는 두 가지 상이한 루프 패턴을 보여줍니다:

**유한 모드 (Finite Mode - 5회 펄스):**
- 간격(Interval): 1.5초
- 횟수(Count): 5회 반복
- **동작:** 자동으로 5번 실행된 후 중지됨

**무한 모드 (Infinite Mode - 지속):**
- 간격(Interval): 1.0초
- 횟수(Count): -1 (무한 루프)
- **동작:** 수동으로 취소할 때까지 영구적으로 실행됨

---

### 1단계: 플레이 모드 진입

Unity에서 **Play** 버튼을 누릅니다. 비컨의 코어가 천천히 회전합니다 (대기 상태).

**UI 상태:**
- 모드 버튼 표시: "Toggle Mode (Finite[5])"
- 비컨 회전: 약 20°/sec (대기 속도)

---

### 2단계: 유한 루프 모드 테스트

**현재 모드 확인:**
버튼에 **"Toggle Mode (Finite[5])"**(기본 모드)가 표시되는지 확인합니다.

**"Activate Beacon" 클릭:**

**발생하는 현상:**
1. 🎯 비컨 코어 회전이 150°/sec로 **가속**됩니다.
2. 📡 **첫 번째 펄스**가 즉시 발생합니다.
   - 시안색 충격파 링이 생성되어 바깥쪽으로 확장됩니다.
   - 소나 핑 사운드가 재생됩니다.
   - 링이 닿으면 녹색 큐브가 잠시 빨간색으로 변합니다.
   - 콘솔: `[Raiser] Beacon Activated. Mode: Finite (5x)`
   - 콘솔: `[Receiver] Pulse #1 emitted.`

3. ⏱️ **1.5초 후** - 두 번째 펄스
   - 콘솔: `[Receiver] Pulse #2 emitted.`
   - 또 다른 충격파가 확장됩니다.
   - 타겟이 다시 빨간색으로 깜박입니다.

4. ⏱️ **3, 4, 5회 펄스**가 1.5초 간격으로 계속됩니다.
   - 콘솔 카운트가 `[Receiver] Pulse #5 emitted.`까지 올라갑니다.

5. ✅ **5번째 펄스 후** - 자동 중지
   - 비컨 코어 회전이 20°/sec(대기)로 **감속**됩니다.
   - 더 이상 펄스가 발생하지 않습니다.
   - 시스템이 자동으로 중지되었으며 수동 개입이 필요 없습니다.

**타임라인:**
```
🖼️ T+0.0s | 초기 상태
⚡ 펄스 #1 (첫 트리거)
│
┆  (Δ 1.5초 루프)
▼
🖼️ T+1.5s | 반복 1
⚡ 펄스 #2
│
┆  (Δ 1.5초 루프)
▼
🖼️ T+3.0s | 반복 2
⚡ 펄스 #3
│
┆  (Δ 1.5초 루프)
▼
🖼️ T+4.5s | 반복 3
⚡ 펄스 #4
│
┆  (Δ 1.5초 루프)
▼
🖼️ T+6.0s | 반복 4
⚡ 펄스 #5 (최종)
│
┆  (Δ 1.5초 간격)
▼
🛑 T+7.5s | 라이프사이클 종료
🏁 [ 자동 중지: 펄스 #6 없음 ]
```

**결과:** ✅ 이벤트가 정확히 5번 반복된 후 자동으로 종료되었습니다.

---

### 3단계: 무한 루프 모드 테스트

**"Toggle Mode" 클릭:**
- 버튼 텍스트가 "Toggle Mode (Infinite)"로 변경됩니다.
- 전환 사운드가 재생됩니다.
- 비컨이 활성화 상태였다면 먼저 중지됩니다.
- 콘솔: 모드 전환됨

**"Activate Beacon" 클릭:**

**발생하는 현상:**
1. 🎯 비컨 코어 회전이 300°/sec로 **가속**됩니다 (유한 모드보다 빠름!).
2. 📡 **연속 펄스**가 시작됩니다.
   - 첫 번째 펄스가 즉시 발생합니다.
   - 콘솔: `[Raiser] Beacon Activated. Mode: Infinite`
   - 콘솔: `[Receiver] Pulse #1 emitted.`

3. ⏱️ **매 1.0초마다** - 새로운 펄스
   - 유한 모드보다 짧은 간격 (1.5초 vs 1.0초)
   - 펄스가 계속 발생: #2, #3, #4, #5...
   - 카운터가 무한히 증가합니다.

4. ⚠️ **자동으로 중지되지 않음**
   - 펄스 #10, #20, #100...
   - 수동으로 취소할 때까지 계속됩니다.
   - 비컨은 계속해서 빠르게 회전합니다.

**관찰 기간:**
자동으로 중지되지 않는지 약 10초간 지켜봅니다. 콘솔에서 펄스 카운트가 제한 없이 증가하는 것을 볼 수 있습니다.

---

### 4단계: 수동 취소 (Manual Cancellation)

**무한 모드가 실행 중일 때:**

**"StopSignal" 클릭:**

**발생하는 현상:**
1. 🛑 펄스가 **즉시 중단**됩니다.
   - 현재 펄스는 완료되지만 새로운 펄스는 예약되지 않습니다.
   - 비컨 코어 회전이 **대기 상태**(20°/sec)로 느려집니다.
   - 콘솔: `[Raiser] Signal Interrupted manually.`

2. 🔄 시스템 상태 초기화
   - 펄스 카운터가 0으로 리셋됩니다.
   - 종료 사운드가 재생됩니다.
   - 비컨이 대기 모드로 돌아갑니다.

**결과:** ✅ `.Cancel()` API를 통해 무한 루프를 성공적으로 취소했습니다.

:::note 🔑 핵심 차이점
- **유한 모드(Finite Mode):** N번 반복 후 자동으로 중지됩니다.
- **무한 모드(Infinite Mode):** 중지하려면 수동으로 `.Cancel()`을 호출해야 합니다.

:::

---

## 🏗️ 씬 아키텍처 (Scene Architecture)

### 반복 이벤트 시스템 (Repeating Event System)

지연 이벤트(한 번 대기, 한 번 실행)와 달리, 반복 이벤트는 **타이머 루프**를 사용합니다:
```
🚀 시작: Raise()
│
▼ ❮─── 루프 사이클 ───┐
⚡ [ 액션 실행 ]       │
│                    │
⏳ [ 간격 대기 ]       │ (Δ 델타 타임)
│                    │
🔄 [ 반복 체크 ] ──┘ (남은 횟수 > 0인 경우)
│
🛑 [ 중지 조건 ] ➔ 🏁 라이프사이클 종료
```

**중지 조건:**
1. **반복 횟수 도달:** 유한 모드는 N회 실행 후 자동 중지됩니다.
2. **수동 취소:** `.Cancel()`은 무한 루프를 즉시 종료합니다.
3. **씬 언로드:** 예약된 모든 이벤트가 정리됩니다.

**내부 스케줄링:**
- GameEventManager가 스케줄러 큐를 유지합니다.
- 각 반복 이벤트는 내부 타이머를 가집니다.
- 타이머는 정확한 간격을 유지하기 위해 매 실행 후 리셋됩니다.

---

### 이벤트 정의

![Game Event Editor](/img/game-event-system/examples/08-repeating-event/demo-08-editor.png)

| 이벤트 이름             | 타입               | 반복 간격 (Interval) | 반복 횟수 (Count) |
| ---------------------- | ------------------ | --------------- | ------------- |
| `onFinitePulseEvent`   | `GameEvent` (void) | 1.5 초          | 5             |
| `onInfinitePulseEvent` | `GameEvent` (void) | 1.0 초          | -1 (Infinite) |

**동일한 리시버 메서드:**
두 이벤트 모두 `RepeatingEventReceiver.OnPulseReceived()`에 바인딩되어 있습니다. 리시버는 어떤 이벤트가 자신을 트리거했는지 알거나 신경 쓸 필요가 없으며, 단지 각 펄스에 반응할 뿐입니다.

---

### 동작 구성 비교 (Behavior Configuration)

#### 유한 루프 구성

`onFinitePulseEvent`의 **(void)** 아이콘을 클릭하여 Behavior 윈도우를 엽니다:

![Finite Behavior](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-finite.png)

**스케줄 구성:**
- ⏱️ **Action Delay:** `0` (초기 지연 없음)
- 🔄 **Repeat Interval:** `1.5` 초
  - 각 펄스 실행 사이의 시간
- 🔢 **Repeat Count:** `5`
  - 총 펄스 수
  - 5번째 실행 후 자동으로 중지됨

**동작 패턴:**
```
🖼️ T+0.0s | 초기 Raise
🚀 Raise() ➔ ⚡ 실행 #1
│
┆  (Δ 1.5초 간격)
▼
🖼️ T+1.5s | 반복 1/4
⚡ 실행 #2
│
┆  (Δ 1.5초 간격)
▼
🖼️ T+3.0s | 반복 2/4
⚡ 실행 #3
│
┆  (Δ 1.5초 간격)
▼
🖼️ T+4.5s | 반복 3/4
⚡ 실행 #4
│
┆  (Δ 1.5초 간격)
▼
🖼️ T+6.0s | 반복 4/4
⚡ 실행 #5 ➔ [최종 실행]
│
🏁 T+7.5s | 라이프사이클 종료
🛑 [ 시퀀스 종료: 카운터 0 ]
```

---

#### 무한 루프 구성

`onInfinitePulseEvent`의 **(void)** 아이콘을 클릭하여 Behavior 윈도우를 엽니다:

![Infinite Behavior](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-infinite.png)

**스케줄 구성:**
- ⏱️ **Action Delay:** `0`
- 🔄 **Repeat Interval:** `1` 초 (유한 모드보다 빠름)
- 🔢 **Repeat Count:** `Infinite Loop` ♾️
  - 특별 값: `-1`은 무제한을 의미
  - 자동으로 중지되지 않음

**동작 패턴:**
```
🚀 시작: Raise()
│
▼ ❮━━━━━━━━━  영구 루프  ━━━━━━━━━┓
⚡ 실행 #1 (초기)                     ┃
│                                    ┃
⏳ (1.0초 대기)                       ┃
│                                    ┃
⚡ 실행 #2 (반복)                     ┃
│                                    ┃
⏳ (1.0초 대기)                       ┃
│                                    ┃
⚡ 실행 #N... (반복)                  ┛
│
│   [ 외부 개입 필요 ]
└─► 🛠️ 호출: .Cancel() 
    └─► 🛑 루프 종료 ➔ 🏁 정리
```

:::tip ⚙️ 무한 루프 구성하기

무한 반복을 설정하려면 Repeat Count 옆의 **Infinite Loop** 토글 버튼(♾️ 아이콘)을 클릭하세요. 그러면 값이 자동으로 `-1`로 설정됩니다.

:::

---

### 송신자 설정 (RepeatingEventRaiser)

**RepeatingEventRaiser** 게임 오브젝트를 선택합니다:

![RepeatingEventRaiser Inspector](/img/game-event-system/examples/08-repeating-event/demo-08-inspector.png)

**이벤트 채널:**
- `Finite Pulse Event`: `onFinitePulseEvent`
  - 툴팁: "Interval = 1.0s, Count = 5"
- `Infinite Pulse Event`: `onInfinitePulseEvent`
  - 툴팁: "Interval = 0.5s, Count = -1 (Infinite)"

**참조:**
- `Repeating Event Receiver`: RepeatingEventReceiver (조정용)

**시각적 참조:**
- `Rotating Core`: RotatingCore (Transform) - 활성 상태의 시각적 지표
- `Mode Text`: Text (TMP) (TextMeshProUGUI) - 현재 모드 표시

---

### 수신자 설정 (RepeatingEventReceiver)

**RepeatingEventReceiver** 게임 오브젝트를 선택합니다:

![RepeatingEventReceiver Inspector](/img/game-event-system/examples/08-repeating-event/demo-08-receiver.png)

**구성:**
- `Beacon Origin`: SonarBeacon (Transform) - 펄스 생성 지점

**시각적 리소스:**
- `Shockwave Prefab`: ShockwaveVFX (Particle System) - 확장되는 링 효과
- `Scanned Material`: Prototype_Guide_Red - 타겟 강조 재질
- `Default Material`: Prototype_Guide_Default - 타겟 일반 재질

**오디오:**
- `Sonar Ping Clip`: SonarPingSFX - 펄스 사운드
- `Power Down Clip`: PowerDownSFX - 중지 사운드

---

## 💻 코드 분석

### 📤 RepeatingEventRaiser.cs (송신자)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;
using TMPro;

public class RepeatingEventRaiser : MonoBehaviour
{
    [Header("Event Channels")]
    [Tooltip("에디터 설정: 간격 = 1.5초, 횟수 = 5회.")]
    [GameEventDropdown] public GameEvent finitePulseEvent;

    [Tooltip("에디터 설정: 간격 = 1.0초, 횟수 = -1 (무한).")]
    [GameEventDropdown] public GameEvent infinitePulseEvent;

    [SerializeField] private Transform rotatingCore;
    [SerializeField] private TextMeshProUGUI modeText;
    
    private bool _isInfiniteMode = false;
    private bool _isActive = false;
    private GameEvent _currentEvent;

    private void Update()
    {
        // 시각적 피드백: 회전 속도가 상태를 나타냄
        if (rotatingCore != null)
        {
            float speed = _isActive 
                ? (_isInfiniteMode ? 300f : 150f)  // 활성: 빠름 또는 중간
                : 20f;                              // 대기: 느림
            rotatingCore.Rotate(Vector3.up, speed * Time.deltaTime);
        }
    }

    /// <summary>
    /// 버튼 액션: 반복 이벤트 루프를 시작합니다.
    /// 
    /// 중요: Raise()를 단 '한 번'만 호출합니다.
    /// 이벤트 시스템의 스케줄러가 에디터에 구성된 반복 간격 및 횟수를 기반으로
    /// 모든 반복을 자동으로 처리합니다.
    /// </summary>
    public void ActivateBeacon()
    {
        if (_isActive) return;

        _isActive = true;
        
        // 현재 모드에 따라 사용할 이벤트 선택
        _currentEvent = _isInfiniteMode ? infinitePulseEvent : finitePulseEvent;

        if (_currentEvent != null)
        {
            // 핵심: 단일 Raise() 호출로 전체 루프 시작
            // 시스템이 이벤트의 Repeat Interval 및 Repeat Count를 확인합니다.
            // 모든 향후 실행을 자동으로 예약합니다.
            _currentEvent.Raise();
            
            Debug.Log($"[Raiser] Beacon Activated. Mode: " +
                     $"{(_isInfiniteMode ? "Infinite" : "Finite (5x)")}");
        }
    }
    
    /// <summary>
    /// 버튼 액션: 유한 모드와 무한 모드 사이를 전환합니다.
    /// 전환하기 전에 활성 루프를 중지합니다.
    /// </summary>
    public void ToggleMode()
    {
        // 모드 전환 전 중지 필수
        if (_isActive) StopSignal();

        _isInfiniteMode = !_isInfiniteMode;
        UpdateUI();
    }

    /// <summary>
    /// 버튼 액션: 활성 루프를 수동으로 취소합니다.
    /// 
    /// 무한 루프에는 필수적입니다. 무한 루프는 자동으로 중지되지 않기 때문입니다.
    /// 유한 루프의 경우, 조기 종료가 가능하게 합니다.
    /// </summary>
    public void StopSignal()
    {
        if (!_isActive || _currentEvent == null) return;

        // 핵심 API: Cancel은 스케줄러에서 이벤트를 제거합니다.
        // 타이머를 즉시 중지시키며 더 이상 펄스가 발생하지 않습니다.
        _currentEvent.Cancel();
        
        _isActive = false;
        UpdateUI();
        
        Debug.Log("[Raiser] Signal Interrupted manually.");
    }

    private void UpdateUI()
    {
        if (modeText) 
            modeText.text = _isInfiniteMode 
                ? "Toggle Mode\n<b>(Infinite)</b>" 
                : "Toggle Mode\n<b>(Finite[5])</b>";
    }
}
```

**주요 포인트:**
- 🎯 **단일 Raise()** - 전체 루프를 시작하기 위해 단 한 번만 호출됩니다.
- 🔀 **모드 선택** - 사전 구성된 두 이벤트 사이를 전환합니다.
- 🛑 **Cancel API** - 무한 루프를 중지하거나 유한 루프를 조기에 종료합니다.
- 🎨 **시각적 피드백** - 회전 속도로 활성 상태 및 모드를 나타냅니다.

---

### 📥 RepeatingEventReceiver.cs (수신자)
```csharp
using UnityEngine;
using System.Collections;

public class RepeatingEventReceiver : MonoBehaviour
{
    [Header("Configuration")]
    public Transform beaconOrigin;

    [Header("Visual Resources")]
    public ParticleSystem shockwavePrefab;
    public Material scannedMaterial;
    public Material defaultMaterial;

    [Header("Audio")]
    public AudioClip sonarPingClip;
    
    private AudioSource _audioSource;
    private int _pulseCount = 0;

    /// <summary>
    /// [이벤트 콜백 - 반복 실행]
    /// 
    /// 'onFinitePulseEvent'와 'onInfinitePulseEvent' 모두에 바인딩됨.
    /// 
    /// 이 메서드는 다음과 같이 실행됩니다:
    /// - Raise()가 호출될 때 즉시 (첫 번째 펄스)
    /// - 이후 각 반복 간격(Repeat Interval)마다 반복적으로
    /// - 반복 횟수(Repeat Count)에 도달하거나(유한) Cancel()이 호출될 때까지(무한)
    /// 
    /// 리시버는 상태 비저장(Stateless) 방식입니다. 펄스 번호나 루프 상태를 추적하지 않습니다.
    /// 단지 각 트리거에 반응할 뿐입니다.
    /// </summary>
    public void OnPulseReceived()
    {
        _pulseCount++;
        Debug.Log($"[Receiver] Pulse #{_pulseCount} emitted.");

        Vector3 spawnPos = beaconOrigin != null 
            ? beaconOrigin.position 
            : transform.position;

        // 시각적 충격파 생성
        if (shockwavePrefab != null)
        {
            var vfx = Instantiate(shockwavePrefab, spawnPos, Quaternion.identity);
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        // 약간의 피치 변화를 주어 소나 핑 재생
        if (sonarPingClip) 
        {
            _audioSource.pitch = Random.Range(0.95f, 1.05f);
            _audioSource.PlayOneShot(sonarPingClip);
        }

        // 물리 기반 타겟 스캔 루틴 시작
        StartCoroutine(ScanRoutine(spawnPos));
    }

    public void OnPowerDown()
    {
        _pulseCount = 0;  // 시스템 전원이 꺼질 때 카운터 리셋
    }

    /// <summary>
    /// 비컨 원점에서 투명한 구체를 확장합니다.
    /// 확장되는 파면(wavefront) 내의 타겟을 강조합니다.
    /// </summary>
    private IEnumerator ScanRoutine(Vector3 center)
    {
        float maxRadius = 40f;      // 시안색 링 크기와 일치
        float speed = 10f;          // 확장 속도
        float currentRadius = 0f;

        while (currentRadius < maxRadius)
        {
            currentRadius += speed * Time.deltaTime;
            
            // 타겟을 찾기 위한 물리 SphereCast
            Collider[] hits = Physics.OverlapSphere(center, currentRadius);
            
            foreach (var hit in hits)
            {
                if (hit.name.Contains("ScanTarget"))
                {
                    var rend = hit.GetComponent<Renderer>();
                    if (rend && rend.sharedMaterial != scannedMaterial)
                    {
                        float dist = Vector3.Distance(center, hit.transform.position);
                        
                        // 파면 가장자리(1유닛 이내)에 있는 경우에만 강조
                        if (dist <= currentRadius && dist > currentRadius - 1.0f)
                        {
                            StartCoroutine(HighlightTarget(rend));
                        }
                    }
                }
            }
            
            yield return null;
        }
    }

    private IEnumerator HighlightTarget(Renderer target)
    {
        // 일시적으로 빨간색으로 깜박임
        target.material = scannedMaterial;
        
        var tmp = target.GetComponentInChildren<TMPro.TextMeshPro>();
        if(tmp) tmp.text = "DETECTED";

        yield return new WaitForSeconds(0.4f);

        // 기본값으로 복구
        target.material = defaultMaterial;
        if(tmp) tmp.text = "?";
    }
}
```

**주요 포인트:**
- 🎯 **상태 비저장 리시버 (Stateless Receiver)** - 루프 횟수나 타이밍을 추적하지 않습니다.
- 📡 **물리 스캔** - 확장되는 SphereCast를 통해 타겟을 감지합니다.
- 🎨 **파면 감지** - 충격파의 가장자리에 있는 타겟만 강조합니다.
- 🔢 **펄스 카운터** - 수신된 총 펄스 수를 추적합니다 (표시용).

---

## 🔑 핵심 요약

| 개념                   | 구현 방식                                            |
| ------------------------- | --------------------------------------------------------- |
| 🔄 **반복 간격 (Repeat Interval)** | 각 실행 사이의 시간 (에디터에서 구성)        |
| 🔢 **반복 횟수 (Repeat Count)**    | 반복 횟수 (유한한 경우 `N`, 무한한 경우 `-1`) |
| 🎯 **단일 Raise()**      | 한 번의 호출로 전체 루프 시작—수동 트리거 불필요     |
| ✅ **자동 중지 (Auto-Stop)**       | 유한 루프는 N회 실행 후 자동으로 종료   |
| 🛑 **수동 취소 (Manual Cancel)**   | 무한 루프를 중지하려면 `.Cancel()`이 필요               |
| 🎨 **상태 비저장 리시버** | 콜백이 루프 상태를 추적할 필요가 없음                  |

:::note 🎓 설계 인사이트

반복 이벤트는 다음과 같은 경우에 완벽합니다:

- **주기적 능력** - 독 데미지, 재생, 구역 차단
- **환경 효과** - 용암 거품, 증기 배출구, 등대 비컨
- **스폰 시스템** - 적 웨이브, 아이템 드랍, 파티클 버스트
- **레이더/감지** - 소나 펄스, 보안 스캔, 근접 경보
- **게임플레이 루프** - 턴 타이머, 체크포인트 자동 저장, 주기적 이벤트

무언가가 몇 번 반복되어야 하는지 정확히 알고 있을 때(예: "3발 발사") **유한(Finite)** 루프를 사용하세요. 특정 조건이 충족될 때까지 계속되어야 하는 지속적인 효과(예: "플레이어가 지역을 떠날 때까지 펄스")에는 **무한(Infinite)** 루프를 사용하세요.

:::

:::tip 💻 프로그래밍 API

인스펙터 설정을 무시하고 코드를 통해 순수하게 루프를 구성할 수도 있습니다:

```csharp
// 인스펙터 설정을 일시적으로 오버라이드
myEvent.RaiseRepeating(interval: 0.5f, repeatCount: 10);

// 또는 기본 인스펙터 설정 사용
myEvent.Raise();
```

이를 통해 런타임 조건(예: 난이도 보정, 파워업)에 따라 동적인 조정이 가능합니다.

:::

---

## 🎯 다음 단계

이제 자동화된 루프를 위한 반복 이벤트를 마스터했습니다. 다음으로 씬 전환 시에도 살아남는 **지속성 이벤트(Persistent Event)**에 대해 알아보겠습니다.

**다음 장**: **[09 Persistent Event](./09-persistent-event.md)**에서 씬 교차 이벤트에 대해 배워보세요.

---

## 📚 관련 문서

- **[Game Event Behavior](../visual-workflow/game-event-behavior.md)** - 스케줄 구성에 대한 전체 가이드
- **[Raising and Scheduling](../scripting/raising-and-scheduling.md)** - `.Raise()`, `.RaiseRepeating()`, `.Cancel()`에 대한 API 참조
- **[Best Practices](../scripting/best-practices.md)** - 주기적인 게임플레이 메커니즘을 위한 패턴