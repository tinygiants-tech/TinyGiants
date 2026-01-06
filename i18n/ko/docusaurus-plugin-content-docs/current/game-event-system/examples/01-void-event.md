---
sidebar_label: '01 Void 이벤트'
sidebar_position: 2
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 01 Void 이벤트: 디커플링된 아키텍처

<VideoGif src="/video/game-event-system/example/01-void-event.mp4" />

## 📋 개요

이 데모는 게임 이벤트 시스템을 사용한 핵심적인 **옵저버 패턴(Observer Pattern)** 워크플로우를 보여줍니다. 가장 중요한 점은 **송신자(VoidEventRaiser)**와 **수신자(VoidEventReceiver)** 스크립트가 완전히 디커플링(Decoupled)되어 있다는 것입니다. 즉, 코드상에서 서로를 전혀 참조하지 않습니다!

:::tip 💡 배울 내용
- 매개변수가 없는 (void) 이벤트를 생성하는 방법
- 리스너가 누구인지 모르는 상태에서 이벤트를 발생시키는 방법
- 게임 이벤트 에디터에서 시각적으로 콜백을 바인딩하는 방법
- 디커플링된 아키텍처의 강력함

:::

---

## 🎬 데모 씬
```
Assets/TinyGiants/GameEventSystem/Demo/01_VoidEvent/01_VoidEvent.unity
```

### 씬 구성

**UI 레이어 (Canvas):**
- 🎮 **Button** - 화면 하단 중앙에 위치한 캔버스 UI 버튼
  - `OnClick()` 이벤트가 `VoidEventRaiser.RaiseBasicEvent()`에 연결되어 있습니다.
  - 이는 표준적인 유니티 UI 이벤트 바인딩 방식입니다.

**게임 로직 레이어 (데모 스크립트):**
- 📤 **VoidEventRaiser** - `VoidEventRaiser.cs` 스크립트가 포함된 게임 오브젝트
  - `OnVoidEvent` 게임 이벤트 에셋에 대한 참조를 보유합니다.
  - 버튼에 의해 `RaiseBasicEvent()`가 호출되면 `voidEvent.Raise()`를 트리거합니다.
  - 또한 UI 오디오 피드백을 재생합니다.
  
- 📥 **VoidEventReceiver** - `VoidEventReceiver.cs` 스크립트가 포함된 게임 오브젝트
  - 게임 이벤트 에디터의 시각적 바인딩을 통해 `OnVoidEvent`를 리스닝합니다.
  - 물리 반응을 적용하기 위해 파란색 큐브의 리지드바디(Rigidbody)를 참조합니다.

**시각적 피드백 레이어 (데모 오브젝트):**
- 🎲 **Blue Cube** - 씬에 있는 3D 오브젝트
  - 물리 시뮬레이션을 위한 리지드바디 컴포넌트를 가집니다.
  - 이벤트가 발생하면 점프와 회전으로 반응합니다.
  - 착지 표면을 위한 바닥(Ground plane)이 아래에 있습니다.

---

## 🎮 상호작용 방법

### 1단계: 플레이 모드 진입

유니티의 **Play** 버튼을 눌러 데모를 시작합니다.

### 2단계: "Raise" 버튼 클릭

게임 뷰 하단에 있는 **"Raise"** 버튼을 클릭합니다.

**이벤트 흐름:**
1. 🖱️ 유니티 버튼의 `OnClick()`이 `VoidEventRaiser.RaiseBasicEvent()`를 트리거합니다.
2. 🔊 VoidEventRaiser에서 오디오 피드백이 재생됩니다.
3. 📡 `voidEvent.Raise()`가 GameEventManager를 통해 신호를 브로드캐스트합니다.
4. 📥 VoidEventReceiver의 `OnEventReceived()` 메서드가 자동으로 호출됩니다.
5. 🎲 큐브가 무작위 수평 드리프트 및 회전과 함께 위로 점프합니다.
6. 📝 콘솔 로그가 각 단계를 확인해 줍니다: `[VoidEvent] Raise()` → `[VoidEvent] OnEventReceived()`

---

## 🏗️ 씬 아키텍처

### 이벤트 정의 (Event Definition)

**게임 이벤트 에디터** 창을 엽니다 (`Tools → TinyGiants → Game Event Editor`):

![Game Event Editor](/img/game-event-system/examples/01-void-event/demo-01-editor.png)

**주요 컴포넌트:**
- **Event Name**: `OnVoidEvent`
- **Event Type**: `void` (매개변수 없음)
- **Database**: `GameEventDatabase_Void`
- **Behavior Column**: 콜백 바인딩을 나타내는 녹색 **(void)** 아이콘이 표시됩니다.

이 ScriptableObject는 송신자와 수신자 사이의 **신호 채널** 역할을 합니다.

---

### 송신자 설정 (VoidEventRaiser)

하이어라키에서 **VoidEventRaiser** 게임 오브젝트를 선택합니다 (`Demo Scripts/VoidEventRaiser`):

![VoidEventRaiser Inspector](/img/game-event-system/examples/01-void-event/demo-01-inspector.png)

**설정:**
- **GameObject 섹션**:
  - `Void Event` 필드는 `[GameEventDropdown]` 속성을 사용합니다.
  - `OnVoidEvent` 에셋으로 설정되어 있습니다.
  
- **Audio 섹션**:
  - 버튼 클릭 피드백을 위한 `UI Clip`이 할당되어 있습니다.

이 스크립트는 버튼이 트리거될 때 단순히 `voidEvent.Raise()`를 호출할 뿐이며, **누가 리스닝하는지에 대해서는 알지 못합니다**.

---

### 수신자 바인딩 (Behavior 설정)

이것이 바로 **디커플링의 마법**이 일어나는 지점입니다! 이벤트와 콜백 사이의 연결은 전적으로 에디터에서 설정됩니다.

**설정 방법:**

1. **게임 이벤트 에디터** 창의 이벤트 목록에서 `OnVoidEvent`를 찾습니다.
2. 우측의 **Behavior** 열을 확인합니다.
3. 녹색 **(void)** 아이콘을 클릭하여 **Behavior 창**을 엽니다.

![Behavior Window](/img/game-event-system/examples/01-void-event/demo-01-behavior.png)

**설정 세부 사항:**

**Event Action 섹션:**
- **Mode**: `Runtime Only` (에디터가 아닌 런타임에만 실행)
- **Target Object**: `VoidEventReceiver` 게임 오브젝트
- **Method**: `VoidEventReceiver.OnEventReceived` (void 메서드)

이 바인딩은 GameEventManager에게 다음과 같이 지시합니다: *"When `OnVoidEvent.Raise()`가 호출되면, 자동으로 `VoidEventReceiver.OnEventReceived()`를 실행하라"*

:::note 🎯 시각적 바인딩의 장점

- ✅ 송신자(Raiser)와 수신자(Receiver) 사이에 코드 참조가 필요 없음
- ✅ 스크립트를 수정하지 않고도 리스너를 쉽게 추가/제거 가능
- ✅ 이벤트 → 콜백 관계를 시각적으로 명확하게 파악 가능
- ✅ Runtime-only 모드는 에디터에서의 의도치 않은 실행을 방지함

:::

---

## 💻 코드 분석

### 📤 VoidEventRaiser.cs (이벤트 송신자)
```csharp
using TinyGiants.GameEventSystem.Runtime;
using UnityEngine;

public class VoidEventRaiser : MonoBehaviour
{
    [Header("GameObject")]
    [GameEventDropdown] public GameEvent voidEvent;

    [Header("Audio")]
    [SerializeField] private AudioClip UIClip;

    private AudioSource _audioSource;

    private void Start()
    {
        _audioSource = gameObject.AddComponent<AudioSource>();
    }

    /// <summary>
    /// [입력 트리거]
    /// 이 메서드는 버튼의 OnClick() 이벤트(인스펙터에서 설정됨)에 의해 호출됩니다.
    /// 누가 리스닝하고 있는지 모르는 상태에서 이벤트 신호를 브로드캐스트합니다.
    /// </summary>
    public void RaiseBasicEvent()
    {
        if (UIClip) _audioSource.PlayOneShot(UIClip);
        
        if (voidEvent == null)
        {
            Debug.LogWarning("[VoidEvent] VoidEventRaiser에 할당된 GameEvent가 없습니다.");
            return;
        }
        
        voidEvent.Raise();
        Debug.Log("[VoidEvent] GameEvent에서 Raise()가 호출되었습니다.");
    }
}
```

**핵심 포인트:**
- 🎯 **`[GameEventDropdown]`** - 인스펙터에서 이벤트를 선택할 수 있는 드롭다운을 제공합니다.
- 🔊 **오디오 피드백** - 이벤트를 발생시키기 전에 사운드를 재생합니다.
- 📢 **`voidEvent.Raise()`** - 단 한 줄의 코드로 모든 리스너에게 신호를 보냅니다.
- 🔇 **결합도 제로** - VoidEventReceiver나 큐브에 대한 참조가 전혀 없습니다.

---

### 📥 VoidEventReceiver.cs (이벤트 리스너)
```csharp
using UnityEngine;

public class VoidEventReceiver : MonoBehaviour
{
    [SerializeField] private Rigidbody targetRigidbody;
    
    private float jumpForce = 5.0f;
    private float horizontalRandomness = 1.0f;
    private float spinStrength = 5.0f;
    
    /// <summary>
    /// [이벤트 콜백]
    /// 이 메서드는 VoidEventRaiser에 의해 직접 호출되지 않습니다.
    /// 게임 이벤트 에디터의 Behavior 창을 통해 'OnVoidEvent'에 바인딩되어 있습니다.
    /// 
    /// 효과: 수직 속도를 리셋한 후 점프 + 랜덤 드리프트 + 회전을 적용합니다.
    /// </summary>
    public void OnEventReceived()
    {
        Debug.Log("[VoidEvent] GameEvent에 의해 OnEventReceived()가 호출되었습니다.");
        
        if (targetRigidbody != null)
        {
            // 일관된 점프 높이를 위해 수직 속도 리셋
            Vector3 currentVel;
#if UNITY_6000_0_OR_NEWER
            currentVel = targetRigidbody.linearVelocity;
#else
            currentVel = targetRigidbody.velocity;
#endif
            currentVel.y = 0;
            
#if UNITY_6000_0_OR_NEWER
            targetRigidbody.linearVelocity = currentVel;
#else
            targetRigidbody.velocity = currentVel;
#endif
            
            // 랜덤 수평 드리프트와 함께 점프 적용
            Vector2 randomCircle = Random.insideUnitCircle * horizontalRandomness;
            Vector3 sideForce = new Vector3(randomCircle.x, 0, randomCircle.y);
            Vector3 finalForce = (Vector3.up * jumpForce) + sideForce;
            targetRigidbody.AddForce(finalForce, ForceMode.Impulse);

            // 랜덤 회전 적용
            Vector3 randomTorque = Random.insideUnitSphere * spinStrength;
            targetRigidbody.AddTorque(randomTorque, ForceMode.Impulse);
        }
        else
        {
            Debug.LogWarning("VoidEventReceiver: 인스펙터에서 targetRigidbody를 할당해 주세요!");
        }
    }
}
```

**핵심 포인트:**
- 🎲 **속도 리셋** - Y 속도를 먼저 0으로 만들어 일관된 점프 높이를 보장합니다.
- 🎯 **물리 반응** - 상향 임펄스 + 랜덤 수평 드리프트 + 랜덤 토크를 결합합니다.
- 🔇 **결합도 제로** - VoidEventRaiser나 버튼에 대한 참조가 전혀 없습니다.
- 🔄 **유니티 버전 호환성** - 레거시와 유니티 6의 새로운 물리 API를 모두 처리합니다.

---

## 🔑 핵심 요약

| 개념 | 구현 방식 |
| ---------------------- | ------------------------------------------------------------ |
| 🎯 **디커플링** | 송신자(Raiser)와 수신자(Receiver)는 서로를 전혀 참조하지 않음 |
| 📡 **브로드캐스팅** | 단일 `Raise()` 호출로 모든 리스너에게 알림 |
| 🎨 **시각적 바인딩** | 이벤트 콜백이 코드가 아닌 Behavior 창에서 설정됨 |
| 🔗 **레이어 분리** | UI → 로직(송신자) → 이벤트 시스템 → 로직(수신자) → 시각 효과 |
| 🔄 **확장성** | 송신자 코드를 수정하지 않고 더 많은 수신자 추가 가능 |

:::note 🧠 디자인 패턴

이 데모는 주체(이벤트)가 강한 결합 없이 관찰자(리스너)에게 알리는 전형적인 **옵저버 패턴(Observer Pattern)**을 보여줍니다. 버튼은 VoidEventRaiser만 알고, VoidEventRaiser는 GameEvent만 알며, VoidEventReceiver는 에디터 바인딩을 통해 GameEvent만 압니다. 완벽한 디커플링입니다!

:::

---

## 🎯 다음 단계는?

이제 매개변수가 없는 이벤트를 이해했으므로, 시스템 간에 **데이터를 전달**하는 방법을 살펴보겠습니다.

**다음 장**: **[02 기본 타입 이벤트](./02-basic-types-event.md)**에서 이벤트와 함께 파라미터를 보내는 방법을 배워보세요.

---

## 📚 관련 문서

- **[게임 이벤트 에디터](../visual-workflow/game-event-editor.md)** - 이벤트 설정에 대한 상세 가이드
- **[게임 이벤트 비헤이비어](../visual-workflow/game-event-behavior.md)** - 이벤트 콜백 설정 방법
- **[이벤트 발생시키기](../scripting/raising-and-scheduling.md)** - 이벤트 트리거를 위한 런타임 API
- **[리스닝 전략](../scripting/listening-strategies.md)** - 이벤트에 반응하는 다양한 방법