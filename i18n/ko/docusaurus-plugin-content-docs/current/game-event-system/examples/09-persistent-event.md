---
sidebar_label: '09 지속성 이벤트'
sidebar_position: 10
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 09 지속성 이벤트: 씬 로드 시에도 생존하기

<!-- <VideoGif src="/video/game-event-system/09-persistent-event.mp4" /> -->

## 📋 개요 (Overview)

Unity에서는 새로운 씬을 로드할 때 이전 씬의 모든 게임 오브젝트(및 해당 이벤트 리스너)가 파괴됩니다. **지속성 이벤트(Persistent Events)**는 씬 전환 시에도 파괴되지 않고 유지되는 글로벌 매니저에 리스너 바인딩을 저장하여 이 문제를 해결합니다. 이는 뮤직 컨트롤러, 인벤토리 매니저, 업적 추적기와 같은 글로벌 시스템을 구축할 때 필수적입니다.

:::tip 💡 학습 내용
- Unity의 씬 전환 시 발생하는 이벤트 리스너 정리(Cleanup) 문제
- 체크박스 하나로 이벤트 지속성을 활성화하는 방법
- 지속성 이벤트와 비지속성 이벤트 동작의 차이점
- 씬 교차 이벤트 시스템을 위한 아키텍처 패턴

:::

---

## 🎬 데모 씬 (Demo Scene)
```
Assets/TinyGiants/GameEventSystem/Demo/09_PersistentEvent/09_PersistentEvent_1.unity
```

### 씬 구성

**시각적 요소:**
- 🔴 **Turret_A (왼쪽)** - 회색 베이스의 빨간색 터렛
  - **지속성(Persistent)** 이벤트 `OnTurretA`에 의해 제어됨
  - 회전 헤드 메커니즘 포함
  - 씬 리로드 후에도 정상적으로 계속 작동함
  
- 🔵 **Turret_B (오른쪽)** - 회색 베이스의 파란색 터렛
  - **비지속성(Non-persistent)** 이벤트 `OnTurretB`에 의해 제어됨
  - 터렛 A와 동일한 기능
  - 씬 리로드 후에는 작동이 중지됨

- 🎯 **TargetDummy** - 중앙의 캡슐 타겟
  - 두 터렛 모두 이 타겟을 조준하고 발사함
  - 넉백 물리 처리를 위한 Rigidbody 포함

- 📋 **HoloDisplay** - 정보 패널
  - 실험에 대한 설명 텍스트 표시
  - 지속성 상태 정보 표시

**UI 레이어 (Canvas):**
- 🎮 **세 개의 버튼** - 화면 하단
  - "Fire A" (흰색) → `PersistentEventRaiser.FireTurretA()` 트리거
  - "Fire B" (흰색) → `PersistentEventRaiser.FireTurretB()` 트리거
  - "Load Scene 2" (초록색) → 지속성 테스트를 위해 현재 씬을 리로드

**게임 로직 레이어 (데모 스크립트):**
- 📤 **PersistentEventRaiser** - 일반적인 씬 기반 레이저(Raiser)
  - 두 이벤트에 대한 참조를 보유
  - 씬 리로드 시 파괴되었다가 다시 생성됨
  
- 📥 **PersistentEventReceiver** - **DontDestroyOnLoad** 싱글톤
  - 씬 전환 시에도 파괴되지 않고 유지됨
  - 두 터렛에 대한 전투 로직 보유
  - 씬 참조를 위해 **의존성 주입(Dependency Injection)** 패턴 사용

- 🔧 **Scene Setup** - 의존성 주입 헬퍼
  - 씬 로드 시 실행됨
  - 새로운 터렛 참조를 지속성 리시버에 다시 주입
  - 지속성 리시버가 새로운 씬의 오브젝트를 제어할 수 있게 함

---

## 🎮 상호작용 방법

### 지속성 실험 (The Persistence Experiment)

이 데모는 지속성 이벤트가 씬 로드 후에도 바인딩을 유지하는 반면, 비지속성 이벤트는 연결이 끊어지는 것을 보여줍니다.

---

### 1단계: 플레이 모드 진입

Unity에서 **Play** 버튼을 누릅니다.

**초기 상태:**
- 두 개의 터렛(빨간색과 파란색)이 씬에서 대기 중
- HoloDisplay에 설명 텍스트 표시
- 콘솔창 깨끗함

---

### 2단계: 초기 기능 테스트

**"Fire A" 클릭:**
- 🎯 빨간색 터렛(왼쪽)이 타겟을 향해 회전
- 🚀 투사체 발사 및 이동
- 💥 충돌 시:
  - 주황색 플로팅 텍스트 "CRIT! -500" 표시
  - 거대한 폭발 VFX 발생
  - 카메라 흔들림(Shake) 발생
  - 타겟 넉백 처리
- 📝 콘솔: `[Raiser] Broadcasting Command: Fire Turret A`
- 📝 콘솔: `[Receiver] Received Command A. Engaging...`

**"Fire B" 클릭:**
- 🎯 파란색 터렛(오른쪽)이 타겟을 향해 회전
- 🚀 투사체 발사
- 💥 충돌 시:
  - 흰색 플로팅 텍스트 "-200" 표시
  - 일반 폭발 VFX 발생
  - 카메라 흔들림 없음 (약한 공격)
  - 타겟 넉백 처리
- 📝 콘솔: `[Raiser] Broadcasting Command: Fire Turret B`
- 📝 콘솔: `[Receiver] Received Command B. Engaging...`

**결과:** ✅ 초기 씬에서는 두 터렛 모두 완벽하게 작동합니다.

---

### 3단계: 씬 리로드 (The Purge)

**"Load Scene 2" 클릭:**

**백그라운드에서 발생하는 일:**
1. 🔄 Unity의 `SceneManager.LoadScene()`이 호출됩니다.
2. 💀 **씬 파괴 단계 (Scene Destruction Phase):**
   - 모든 씬 게임 오브젝트가 파괴됩니다:
     - ❌ Turret_A 파괴됨
     - ❌ Turret_B 파괴됨
     - ❌ TargetDummy 파괴됨
     - ❌ PersistentEventRaiser 파괴됨
   - 🗑️ GameEventManager가 **비지속성** 이벤트 리스너를 정리합니다.
     - `OnTurretB` 리스너 제거됨
     - `OnTurretA` 리스너 **보존됨** (지속성 플래그 설정 덕분)

3. 🏗️ **씬 재생성 단계 (Scene Recreation Phase):**
   - 새로운 Turret_A 스폰됨
   - 새로운 Turret_B 스폰됨
   - 새로운 TargetDummy 스폰됨
   - 새로운 PersistentEventRaiser 스폰됨

4. ✨ **지속성 오브젝트:**
   - ✅ `PersistentEventReceiver`는 **생존**합니다 (DontDestroyOnLoad).
   - ✅ `OnTurretA`에 대한 메서드 바인딩이 **여전히 활성화**되어 있습니다.

5. 🔧 **의존성 주입:**
   - `PersistentEventSceneSetup.Start()` 실행
   - `PersistentEventReceiver.UpdateSceneReferences()` 호출
   - 새로운 씬 터렛 참조를 지속성 리시버에 주입

**시각적 변화:**
- 리로드 동안 씬이 잠시 검게 변함
- 터렛들이 동일한 위치에서 다시 스폰됨
- UI 버튼들은 계속 작동 가능한 상태 유지

---

### 4단계: 리로드 후 생존 테스트

**"Fire A" 클릭 (리로드 후):**

**발생하는 현상:**
1. 🎯 빨간색 터렛이 회전하고 발사됩니다 (완벽하게 작동!).
2. 💥 전체 전투 시퀀스 재생
3. 📝 콘솔: `[Receiver] Received Command A. Engaging...`

**작동 원리:**
```
버튼 클릭 → fireAEvent.Raise() 
          → GameEventManager가 지속성 바인딩을 찾음
          → PersistentEventReceiver.OnFireCommandA() 실행
          → 새로 주입된 터렛 참조를 사용함
          → 터렛 발사
```

**결과:** ✅ **지속성 이벤트가 씬 리로드 후에도 생존했습니다!**

---

**"Fire B" 클릭 (리로드 후):**

**발생하는 현상:**
1. 🔇 **아무 반응 없음**
2. 📝 콘솔: `[Raiser] Broadcasting Command: Fire Turret B`
3. ❌ 리시버 로그가 남지 않음
4. 파란색 터렛이 움직이거나 발사되지 않음

**실패 원리:**
```
🔘 입력: 버튼 클릭
│
🚀 이벤트: fireBEvent.Raise()
│
🔍 레지스트리: [ GameEventManager 조회 ]
│   
├─❓ 결과: 찾을 수 없음 (NONE Found)
│  └─ 🗑️ 사유: 씬 리로드 동안 바인딩이 제거됨
│
🌑 결과: 신호 소멸 (Signal Dissipated)
│  └─ 👻 상태: "허공에 외치기" (호출된 리시버 없음)
│
📊 상태: 실행된 액션 0개 | ✅ 시스템 안전 (NullRef 발생 안 함)
```

**결과:** ❌ **비지속성 이벤트 바인딩이 파괴되었습니다!**

:::danger 🔴 끊어진 연결 (The Dead Event)

씬이 언로드될 때 `OnTurretB` 리스너가 제거되었습니다. 이벤트 에셋 자체는 존재하지만, `PersistentEventReceiver.OnFireCommandB()`와의 연결은 **영구적으로 끊어졌습니다** (코드를 통해 수동으로 다시 구독하지 않는 한).

:::

---

## 🏗️ 씬 아키텍처 (Scene Architecture)

### 씬 전환 시의 문제점

표준 Unity 이벤트 시스템의 경우:
```
🖼️ 씬 A: 로드됨
   └─ 🔗 리스너: 구독됨 (로컬 컨텍스트)
│
🚚 [ 씬 B 로딩 중... ]
│
🧹 정리: 메모리 비우기
   └─ ❌ 결과: 레지스트리에서 모든 리스너가 제거됨
│
🖼️ 씬 B: 활성화됨
   └─ 🌑 상태: 이벤트가 "비어 있음" (수신자 없음)
```

이것은 여러 씬에 걸쳐 지속되어야 하는 글로벌 시스템을 망가뜨립니다.

### 지속성 이벤트 해결책
```
🖼️ 씬 A: 로드됨
   └─ 🛡️ 리스너: 구독됨 (글로벌 컨텍스트)
│
🚚 [ 씬 B 로딩 중... ]
│
💎 보존: 핸드오버 성공
   └─ ✅ 결과: 바인딩이 글로벌 지속성 레지스트리에 저장됨
│
🖼️ 씬 B: 활성화됨
   └─ 🔥 상태: 이벤트가 "활성 상태" (리스너가 발사 준비 완료됨)
```

지속성 이벤트는 이벤트 로직에 대해 `DontDestroyOnLoad`를 적용하는 것과 같습니다.

---

### 아키텍처 패턴: 의존성 주입 (Dependency Injection)

이 데모는 씬 참조를 처리하기 위해 정교한 패턴을 사용합니다:

**과제:**
- `PersistentEventReceiver`는 생존합니다 (DontDestroyOnLoad).
- 하지만 터렛은 매 씬 로드 시마다 파괴되고 다시 생성됩니다.
- 리시버는 새로운 터렛 인스턴스에 대한 참조가 필요합니다.

**해결책:**
1. **지속성 리시버(Persistent Receiver)**가 전투 로직을 보유합니다.
2. **씬 설정 스크립트(Scene Setup Script)**가 매 씬 로드 시마다 실행됩니다.
3. 설정 스크립트가 새로운 씬의 참조를 지속성 리시버에 주입합니다.
4. 이제 리시버는 새로운 터렛을 제어할 수 있습니다.
```
🛡️ 지속성 레이어 (생존자)
┃  └─ 💎 PersistentEventReceiver [씬 로드 시 유지됨]
┃        ▲
┃        ║ 💉 의존성 주입 (참조 재바인딩)
┃        ╚══════════════════════════════════════╗
┃                                               ║
🖼️ 씬 레이어 (컨텍스트)                         ║
┃  └─ ⚙️ PersistentEventSceneSetup [재생성됨]  ║
┃        │                                      ║
┃        └── 🔍 참조를 찾아 전달 ➔ ══════════════╝
┃              │
┃              ├── 🤖 새로운 Turret_A [씬 인스턴스]
┃              └── 🤖 새로운 Turret_B [씬 인스턴스]
```

---

### 이벤트 정의 (Event Definitions)

![Game Event Editor](/img/game-event-system/examples/09-persistent-event/demo-09-editor.png)

| 이벤트 이름  | 타입               | 지속성 플래그 (Persistent Flag) |
| ----------- | ------------------ | --------------- |
| `OnTurretA` | `GameEvent` (void) | ✅ 체크됨       |
| `OnTurretB` | `GameEvent` (void) | ❌ 체크 해제됨     |

**동일한 이벤트, 다른 운명:**
두 이벤트 모두 동일한 구성을 가진 void 이벤트이지만, 체크박스 하나로 생존 여부가 결정됩니다.

---

### 동작 구성 (Behavior Configuration)

#### 지속성 이벤트 (OnTurretA)

`OnTurretA`의 **(void)** 아이콘을 클릭하여 Behavior 윈도우를 엽니다:

![Persistent Behavior](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

**핵심 설정:**
- 💾 **Persistent Event:** ✅ **체크됨**

**경고 메시지:**
> "Event will behave like DontDestroyOnLoad." (이벤트가 DontDestroyOnLoad처럼 동작합니다.)

**의미:**
- 리스너 바인딩이 글로벌 지속성 매니저에 저장됩니다.
- 씬 전환 중에 제거되지 않습니다.
- 명시적으로 제거하거나 게임을 종료할 때까지 유지됩니다.
- 씬 교차 시스템에 필수적입니다.

---

#### 비지속성 이벤트 (OnTurretB)

다음 설정을 제외하고 동일한 구성입니다:
- 💾 **Persistent Event:** ❌ **체크 해제됨**

**결과:**
- 표준 Unity 라이프사이클을 따릅니다.
- 씬 언로드 시 리스너가 제거됩니다.
- 새로운 씬에서 필요할 경우 다시 구독해야 합니다.

---

### 송신자 설정 (PersistentEventRaiser)

**PersistentEventRaiser** 게임 오브젝트를 선택합니다:

![PersistentEventRaiser Inspector](/img/game-event-system/examples/09-persistent-event/demo-09-inspector.png)

**게임 이벤트:**
- `Fire A Event`: `OnTurretA` (지속성)
  - 툴팁: "에디터에서 'Persistent Event' 체크됨"
- `Fire B Event`: `OnTurretB` (비지속성)
  - 툴팁: "에디터에서 'Persistent Event' 체크 해제됨"

**라이프사이클:**
- ❌ 씬 리로드 시 파괴됨
- ✅ 새로운 씬과 함께 다시 생성됨
- 새로운 이벤트 참조를 보유함 (에셋은 지속적인 ScriptableObject임)

---

### 수신자 설정 (PersistentEventReceiver)

**PersistentEventReceiver** 게임 오브젝트를 선택합니다:

![PersistentEventReceiver Inspector](/img/game-event-system/examples/09-persistent-event/demo-09-receiver.png)

**전투 리소스:**
- `Projectile Prefab`: Projectile (터렛 투사체)
- `Fire VFX`: MuzzleFlashVFX (파티클 시스템)

**피드백:**
- `Hit Normal VFX`: HitVFX_Normal (파티클 시스템)
- `Hit Crit VFX`: HitVFX_Crit (파티클 시스템)
- `Floating Text Prefab`: DamageFloatingText (Text Mesh Pro)
- `Hit Clip`: ExplosionSFX (오디오 클립)

**동적 참조 (숨겨짐):**
이들은 런타임에 Scene Setup에 의해 주입됩니다:
- `turretA`, `headA` (터렛 A 참조)
- `turretB`, `headB` (터렛 B 참조)
- `targetDummy`, `targetRigidbody` (타겟 참조)

---

### 씬 설정 구성 (Scene Setup Configuration)

**Scene Setup** 게임 오브젝트를 선택합니다:

![Scene Setup Inspector](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

**현재 씬 오브젝트:**
- `Turret A`: Turret_A (게임 오브젝트)
- `Head A`: Head (Transform) - 회전 피벗
- `Turret B`: Turret_B (게임 오브젝트)
- `Head B`: Head (Transform)
- `Target Dummy`: TargetDummy (Transform)
- `Target Rigidbody`: TargetDummy (Rigidbody)

**목적:**
`Start()` 시점에 이 스크립트는 지속성 리시버를 찾아 이러한 참조들을 주입하며, 이를 통해 리시버가 새로운 씬의 오브젝트를 제어할 수 있게 합니다.

---

## 💻 코드 분석 (Code Breakdown)

### 📤 PersistentEventRaiser.cs (송신자)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class PersistentEventRaiser : MonoBehaviour
{
    [Header("Game Events")]
    [Tooltip("설정: 에디터에서 'Persistent Event' 체크됨.")]
    [GameEventDropdown] public GameEvent fireAEvent;
    
    [Tooltip("설정: 에디터에서 'Persistent Event' 체크 해제됨.")]
    [GameEventDropdown] public GameEvent fireBEvent;

    /// <summary>
    /// UI 버튼: 터렛 A에게 발사를 명령합니다.
    /// 
    /// 'fireAEvent'는 지속성이므로, 이 바인딩은 씬 로드 후에도 유지됩니다.
    /// 리로드 후에도 지속성 리시버는 여전히 반응합니다.
    /// </summary>
    public void FireTurretA()
    {
        if (fireAEvent == null) return;
        
        fireAEvent.Raise();
        Debug.Log("<color=cyan>[Raiser] Broadcasting Command: Fire Turret A</color>");
    }

    /// <summary>
    /// UI 버튼: 터렛 B에게 발사를 명령합니다.
    /// 
    /// 'fireBEvent'는 지속성이 아니므로, 씬 로드 후에 이 바인딩은 끊어집니다.
    /// 이벤트는 발생하지만 더 이상 듣고 있는 리스너가 없습니다.
    /// </summary>
    public void FireTurretB()
    {
        if (fireBEvent == null) return;
        
        fireBEvent.Raise();
        Debug.Log("<color=orange>[Raiser] Broadcasting Command: Fire Turret B</color>");
    }
}
```

**주요 포인트:**
- 🎯 **표준 컴포넌트** - 지속성이 아니며 매 씬마다 다시 생성됩니다.
- 📡 **이벤트 참조** - ScriptableObject 에셋 (지속적임).
- 🔇 **라이프사이클 무지** - 리스너가 생존했는지 여부를 알지 못합니다.

---

### 📥 PersistentEventReceiver.cs (수신자 - 싱글톤)
```csharp
using UnityEngine;
using System.Collections;

public class PersistentEventReceiver : MonoBehaviour
{
    [Header("Combat Resources")]
    [SerializeField] private TurretProjectile projectilePrefab;
    [SerializeField] private ParticleSystem fireVFX;
    // ... 기타 리소스 ...

    // 런타임에 주입되는 씬 참조
    [HideInInspector] public GameObject turretA;
    [HideInInspector] public Transform headA;
    [HideInInspector] public GameObject turretB;
    [HideInInspector] public Transform headB;
    [HideInInspector] public Transform targetDummy;
    [HideInInspector] public Rigidbody targetRigidbody;

    private bool _isFiringA;
    private bool _isFiringB;

    // 지속성을 위한 싱글톤 패턴
    private static PersistentEventReceiver _instance;
    public static PersistentEventReceiver Instance => _instance;

    private void Awake()
    {
        // 중요: DontDestroyOnLoad로 인해 이 오브젝트는 씬 전환 시 유지됩니다.
        if (_instance == null)
        {
            _instance = this;
            DontDestroyOnLoad(gameObject);
            Debug.Log("[PersistentReceiver] Initialized with DontDestroyOnLoad.");
        }
        else if (_instance != this)
        {
            // 씬 리로드 시 중복 방지
            Destroy(gameObject);
        }
    }

    private void Update()
    {
        // 주입된 참조를 사용하여 터렛 제어
        HandleTurretRotation(turretA, headA, ref _isFiringA);
        HandleTurretRotation(turretB, headB, ref _isFiringB);
    }

    /// <summary>
    /// [이벤트 콜백 - 지속성 바인딩]
    /// Persistent Event 플래그가 체크된 'OnTurretA'에 바인딩됨.
    /// 
    /// 이 메서드 바인딩은 씬 리로드 후에도 생존합니다.
    /// 리로드 후에도 fireAEvent.Raise()가 실행되면 이 메서드가 호출됩니다.
    /// </summary>
    public void OnFireCommandA()
    {
        Debug.Log("<color=cyan>[Receiver] Received Command A. Engaging...</color>");
        _isFiringA = true;
    }

    /// <summary>
    /// [이벤트 콜백 - 비지속성 바인딩]
    /// Persistent Event 플래그가 체크 해제된 'OnTurretB'에 바인딩됨.
    /// 
    /// 이 메서드 바인딩은 씬 리로드 시 제거(CLEARED)됩니다.
    /// 리로드 후에는 절대 다시 호출되지 않습니다 (바인딩 분실).
    /// </summary>
    public void OnFireCommandB()
    {
        Debug.Log("<color=orange>[Receiver] Received Command B. Engaging...</color>");
        _isFiringB = true;
    }
    
    /// <summary>
    /// 매 씬 로드 시 PersistentEventSceneSetup에 의해 호출됩니다.
    /// 지속성 리시버에 새로운 씬 오브젝트 참조를 주입합니다.
    /// </summary>
    public void UpdateSceneReferences(
        GameObject tA, Transform hA, 
        GameObject tB, Transform hB, 
        Transform target, Rigidbody rb)
    {
        this.turretA = tA;
        this.headA = hA;
        this.turretB = tB;
        this.headB = hB;
        this.targetDummy = target;
        this.targetRigidbody = rb;
        
        Debug.Log("[PersistentReceiver] Scene references updated.");
    }

    private void HandleTurretRotation(GameObject turret, Transform head, ref bool isFiring)
    {
        if (head == null || targetDummy == null) return;

        Quaternion targetRot;
        float speed = isFiring ? 10f : 2f;

        if (isFiring)
        {
            // 타겟 조준
            Vector3 dir = targetDummy.position - head.position;
            dir.y = 0;
            if (dir != Vector3.zero) 
                targetRot = Quaternion.LookRotation(dir);
            else 
                targetRot = head.rotation;
        }
        else
        {
            // 대기 순찰
            float angle = Mathf.Sin(Time.time * 0.5f) * 30f;
            targetRot = Quaternion.Euler(0, 180 + angle, 0);
        }

        head.rotation = Quaternion.Slerp(head.rotation, targetRot, speed * Time.deltaTime);

        // 조준 시 발사
        if (isFiring && Quaternion.Angle(head.rotation, targetRot) < 5f)
        {
            PerformFireSequence(turret);
            isFiring = false;
        }
    }

    private void PerformFireSequence(GameObject turret)
    {
        // 머즐 플래시 생성, 투사체 발사 등...
        // ... (전투 로직) ...
    }
}
```

**주요 포인트:**
- 🎯 **DontDestroyOnLoad** - 씬 전환 시에도 생존합니다.
- 🔀 **싱글톤 패턴** - 전역적으로 하나의 인스턴스만 존재합니다.
- 📍 **의존성 주입** - 런타임에 씬 참조가 주입됩니다.
- 🎭 **이중 바인딩** - 지속성(A) 및 비지속성(B) 메서드를 모두 관리합니다.

---

### 🔧 PersistentEventSceneSetup.cs (의존성 주입기)
```csharp
using UnityEngine;

public class PersistentEventSceneSetup : MonoBehaviour
{
    [Header("현재 씬 오브젝트")]
    public GameObject turretA;
    public Transform headA;
    public GameObject turretB;
    public Transform headB;
    public Transform targetDummy;
    public Rigidbody targetRigidbody;

    private void Start()
    {
        // 지속성 리시버 찾기 (DontDestroyOnLoad 씬에 상주)
        var receiver = PersistentEventReceiver.Instance;
        
        if (receiver != null)
        {
            // 현재 씬의 오브젝트 참조 주입
            receiver.UpdateSceneReferences(
                turretA, headA, 
                turretB, headB, 
                targetDummy, targetRigidbody
            );
            
            Debug.Log("[SceneSetup] Successfully injected scene references " +
                     "into persistent receiver.");
        }
        else
        {
            Debug.LogWarning("[SceneSetup] PersistentEventReceiver not found! " +
                            "Is the demo started correctly?");
        }
    }
}
```

**주요 포인트:**
- 🔧 **씬 로드 시 실행** - 씬 초기화 시 `Start()`가 실행됩니다.
- 🔍 **싱글톤 조회** - 정적 인스턴스를 통해 지속성 리시버에 접근합니다.
- 💉 **참조 주입** - 새로운 씬 오브젝트를 지속성 로직에 전달합니다.
- 🏗️ **씬 교차 제어 활성화** - 지속성 로직과 일시적인 오브젝트 사이를 연결합니다.

---

## 🔑 핵심 요약 (Key Takeaways)

| 개념                    | 구현 방식                                               |
| -------------------------- | ------------------------------------------------------------ |
| 💾 **지속성 이벤트**     | Behavior 윈도우의 체크박스로 씬 전반에 걸친 바인딩 보존 |
| 🗑️ **정리 동작 (Cleanup)** | 씬 언로드 시 비지속성 이벤트 리스너 제거                |
| 🔄 **DontDestroyOnLoad**    | 지속성 이벤트가 작동하려면 리시버가 생존해야 함          |
| 💉 **의존성 주입** | 지속성 로직과 씬 오브젝트를 연결하기 위한 패턴   |
| 🎯 **단일 체크박스**      | 설정 하나로 씬 교차 생존 여부 결정                  |

:::note 🎓 설계 인사이트

지속성 이벤트는 다음과 같은 경우에 완벽합니다:

- **뮤직 시스템** - 여러 레벨에 걸쳐 끊김 없이 재생되는 배경 음악 컨트롤러
- **인벤토리 매니저** - 씬 전환 시에도 유지되는 플레이어 데이터 및 아이템
- **업적 추적기** - 모든 씬을 모니터링하는 글로벌 업적 리스너
- **분석 시스템** - 중단되지 않는 데이터 로깅
- **UI 시스템** - 체력 바, 스코어 보드 등 공통 HUD 컨트롤러

**아키텍처 패턴:**
```
[지속성 레이어 - DontDestroyOnLoad]
- 글로벌 매니저
- 이벤트 리시버
- 씬 교차 로직

[씬 레이어 - 재생성됨]
- 레벨 전용 오브젝트
- 씬 설정 스크립트 (의존성 주입)
- UI 버튼 및 레이저
```

이러한 분리는 수동으로 리스너를 다시 등록할 필요 없이 깔끔한 씬 교차 아키텍처를 가능하게 합니다.

:::

:::warning ⚠️ 중요 고려 사항

1. **리시버 생존 필수:** "Persistent Event"를 체크하는 것은 바인딩만 보존합니다. 리시버 게임 오브젝트 자체가 생존하려면 반드시 `DontDestroyOnLoad`를 사용해야 합니다.
2. **씬 참조 단절:** 바인딩은 유지되어도 파괴된 이전 씬 오브젝트에 대한 참조는 null이 됩니다. 의존성 주입을 통해 참조를 갱신하십시오.
3. **메모리 관리:** 지속성 이벤트는 게임 종료 시까지 활성 상태를 유지합니다. 장시간 실행되는 게임에서 누적되는 바인딩에 주의하십시오.
4. **초기 씬 요구 사항:** 지속성 리시버는 첫 번째로 로드되는 씬에 있어야 합니다. 만약 리시버 없이 씬 B가 먼저 로드되면 지속성 이벤트가 작동하지 않습니다.

:::

---

## 🎯 다음 단계

이제 씬 교차 시스템을 위한 지속성 이벤트를 마스터했습니다. 다음으로 충돌 기반 상호작용을 위한 **트리거 이벤트(Trigger Event)**를 살펴보겠습니다.

**다음 장**: **[10 트리거 이벤트](./10-trigger-event.md)**에서 충돌 트리거를 배워보세요.

---

## 📚 관련 문서

- **[게임 이벤트 동작](../visual-workflow/game-event-behavior.md)** - 지속성 구성에 대한 전체 가이드
- **[베스트 프랙티스](../scripting/best-practices.md)** - 씬 교차 이벤트 아키텍처를 위한 패턴
```