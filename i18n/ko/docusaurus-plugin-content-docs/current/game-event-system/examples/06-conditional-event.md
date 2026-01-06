---
sidebar_label: '06 조건부 이벤트'
sidebar_position: 7
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 06 조건부 이벤트: 비주얼 로직 빌더

<VideoGif src="/video/game-event-system/example/06-conditional-event.mp4" />

## 📋 개요

일반적으로 문이 열려야 하는지 확인하려면 `if (powerOn && (isAdmin || isLucky))`와 같은 코드가 필요합니다. 이 데모는 **비주얼 조건 트리 빌더**를 보여주며, 에디터에서 직접 복잡하고 중첩된 검증 규칙을 생성할 수 있어 스크립트에서 `if/else` 체크가 필요 없습니다.

:::tip 💡 배울 내용
- 코드 없이 복잡한 로직 트리를 구축하는 방법
- 조건에서 씬 객체를 참조하는 방법
- 분기 로직을 위해 AND/OR 그룹을 사용하는 방법
- 조건이 이벤트 콜백의 게이트키퍼 역할을 하는 방법

:::

---

## 🎬 데모 씬
```
Assets/TinyGiants/GameEventSystem/Demo/06_ConditionalEvent/06_ConditionalEvent.unity
```

### 씬 구성

**UI 레이어 (Canvas):**
- 🎮 **전원 토글 버튼** - 왼쪽 상단 모서리
  - "Toggle Power (On)" / "Toggle Power (Off)"
  - `ConditionalEventRaiser.TogglePower()` 트리거
  - 전역 `SecurityGrid.IsPowerOn` 상태 제어
  
- 🎮 **네 개의 액세스 카드 버튼** - 화면 하단
  - "Swipe GuestCard" → `ConditionalEventRaiser.SwipeGuestCard()` (레벨 1, Visitor 부서)
  - "Swipe StaffCard" → `ConditionalEventRaiser.SwipeStaffCard()` (레벨 3, Management 부서)
  - "Swipe AdminCard" → `ConditionalEventRaiser.SwipeAdminCard()` (레벨 5, Director 부서)
  - "Attempt Hacking" → `ConditionalEventRaiser.AttemptHacking()` (레벨 0, DarkWeb 부서)

**게임 로직 레이어 (Demo Scripts):**
- 📤 **ConditionalEventRaiser** - raiser 스크립트가 있는 GameObject
  - 다양한 자격 증명으로 `AccessCard` 객체 생성
  - 검증을 위해 `OnAccessCard` 이벤트 발동
  - 검증 로직 없음—단지 데이터 전달

- 📥 **ConditionalEventReceiver** - receiver 스크립트가 있는 GameObject
  - **제로** 조건 로직을 가진 `OpenVault()` 메서드 포함
  - 호출되면 단순히 문 애니메이션 재생
  - 호출되면 모든 조건이 통과했다고 가정

- 🔌 **SecurityGrid** - 시스템 상태를 보유한 씬 객체
  - 공개 속성: `IsPowerOn` (bool)
  - 조건 트리가 씬 인스턴스에서 이 값을 직접 읽음

**시각적 피드백 레이어 (Demo Objects):**
- 🚪 **VaultDoorSystem** - 거대한 이중 문
  - 왼쪽과 오른쪽 문이 슬라이드로 열림/닫힘
  - 상태 텍스트 표시: "LOCKED" / "ACCESS GRANTED" / "CLOSING..."
  - 문이 열릴 때 Steam VFX 재생
- 💡 **Power Indicator** - 녹색 구체 조명
  - 전원이 ON일 때 빛남
  - 전원이 OFF일 때 어두워짐
- 🖼️ **Screen Vignette** - 전체 화면 오버레이
  - 전원이 ON될 때 녹색 플래시
  - 전원이 OFF될 때 빨간색 플래시

---

## 🎮 상호작용 방법

### 로직 게이트 챌린지

금고는 이 조건이 `true`로 평가될 때**만** 열립니다:
```
[⚡ 전원 ON]  AND  ([🏅 관리자] 레벨  OR  [🏷️ 유효한 부서]  OR  [🎲 운 좋은 해커])
```

### 1단계: 플레이 모드 진입

**Play** 버튼을 누릅니다. 금고는 빨간색으로 "LOCKED"를 표시해야 합니다.

---

### 2단계: 전원 ON으로 테스트 (올바른 설정)

**전원이 ON인지 확인:**
- 왼쪽 상단 버튼 확인: "Toggle Power (On)" 표시되어야 함
- 전원 표시기(녹색 구체) 확인: 빛나고 있어야 함
- ON으로 전환할 때 화면 비네트가 녹색으로 플래시

**"Swipe StaffCard" 클릭:**
- **자격 증명:** 레벨 3, 부서 "Management"
- **로직 경로:**
  - ✅ 전원 ON → 통과
  - ❌ 레벨 3 < 4 → 실패 (관리자 확인)
  - ✅ 부서 "Management"가 화이트리스트에 있음 → 통과
  - **결과:** OR 그룹에서 하나의 분기 통과
- **결과:** 🟢 **ACCESS GRANTED**
  - 상태 텍스트가 녹색으로 변경
  - 문 베이스에서 Steam VFX 분출
  - 문이 부드럽게 슬라이드로 열림
  - 2초 후 문 닫힘
- **콘솔:** `[Vault] ACCESS GRANTED to Staff_Alice. Opening doors.`

**"Swipe AdminCard" 클릭:**
- **자격 증명:** 레벨 5, 부서 "Director"
- **로직 경로:**
  - ✅ 전원 ON → 통과
  - ✅ 레벨 5 >= 4 → 통과 (관리자 확인이 즉시 성공)
  - **결과:** OR 그룹의 첫 번째 조건 통과
- **결과:** 🟢 **ACCESS GRANTED**

**"Swipe GuestCard" 클릭:**
- **자격 증명:** 레벨 1, 부서 "Visitor"
- **로직 경로:**
  - ✅ 전원 ON → 통과
  - ❌ 레벨 1 < 4 → 실패 (관리자 확인)
  - ❌ 부서 "Visitor"가 화이트리스트에 없음 → 실패
  - 🎲 중첩된 AND 그룹에서 Random(0-100) > 70 → ~30% 확률
  - **결과:** 대부분 모든 분기 실패
- **결과:** 🔴 **LOCKED** (90%의 경우)
  - 금고는 닫힌 상태 유지
  - 상태 텍스트는 빨간색 유지
- **콘솔:** (조건 실패로 receiver 로그 없음)

---

### 3단계: 전원 OFF로 테스트 (실패 사례)

**"Toggle Power" 클릭 (OFF로 전환):**
- 버튼 텍스트가 "Toggle Power (Off)"로 변경
- 전원 표시기가 어두워짐
- 화면 비네트가 빨간색으로 플래시

**"Swipe AdminCard" 클릭:**
- **자격 증명:** 레벨 5 (관리자 레벨)
- **로직 경로:**
  - ❌ 전원 OFF → **루트 AND 조건에서 실패**
  - 평가가 즉시 중지됨(단락)
- **결과:** 🔴 **LOCKED**
  - 관리자조차 전원 요구사항을 우회할 수 없음
  - Receiver 메서드가 **절대** 호출되지 않음
- **콘솔:** `[Terminal] Scanning...` (하지만 금고 로그 없음)

:::note 🔐 보안 설계

루트의 AND 로직은 **어떤 자격 증명도** 전원 요구사항을 우회할 수 없도록 보장합니다. 이것은 조건 트리가 어떻게 엄격한 요구사항을 강제할 수 있는지 보여줍니다.

:::

---

## 🏗️ 씬 아키텍처

### 조건 트리 구조

금고의 액세스 로직은 Behavior Window에서 시각적 트리로 구현됩니다:
```
🟦 ROOT (AND) ➔ 두 가지 주요 분기 모두 통과해야 함
│
├─ ⚡ SecurityGrid.IsPowerOn == true      ➔ [전원 상태 확인]
│
└─ 🟧 분기 2 (OR) ➔ 아래 중 최소 하나 통과해야 함
   │
   ├─ 🏅 Arg.securityLevel >= 4          ➔ [높은 권한]
   ├─ 🏷️ Arg.department ∈ [Mgmt, IT]     ➔ [부서 검증]
   ├─ 🎲 Random(0-100) > 90              ➔ [10% 행운 통과]
   │
   └─ 🟦 중첩된 그룹 (AND) ➔ 결합된 낮은 레벨 확인
      ├─ 🔢 Arg.securityLevel >= 1       ➔ [기본 액세스]
      └─ 🎲 Random(0-100) > 70           ➔ [30% 행운 통과]
```

---

### 이벤트 정의

![Game Event Editor](/img/game-event-system/examples/06-conditional-event/demo-06-editor.png)

| 이벤트 이름    | 타입                    | 목적                                    |
| -------------- | ----------------------- | --------------------------------------- |
| `OnAccessCard` | `GameEvent<AccessCard>` | 조건 트리를 통해 카드 자격 증명 검증    |

**AccessCard 데이터 구조:**
```csharp
[System.Serializable]
public class AccessCard
{
    public string holderName;        // "Staff_Alice", "Admin_Root" 등
    public int securityLevel;        // 1=게스트, 3=직원, 5=관리자
    public string department;        // "Management", "IT", "Visitor" 등
}
```

---

### 조건 트리를 사용한 Behavior 구성

Behavior 열의 **(AccessCard)** 아이콘을 클릭하여 Behavior Window를 엽니다:

![Condition Tree](/img/game-event-system/examples/06-conditional-event/demo-06-condition-tree.png)

**루트 AND 그룹:**
- **조건 1:** 씬 객체 참조
  - 소스: 씬의 `SecurityGrid` GameObject
  - 속성: `IsPowerOn` (bool)
  - 연산자: `==` (같음)
  - 타겟: `true`
  - **목적:** 엄격한 요구사항—전원이 ON이어야 함

**중첩된 OR 그룹:**
OR 그룹은 액세스를 위한 여러 유효한 경로를 제공합니다:

- **조건 A:** 이벤트 인수 확인
  - 소스: `Arg.securityLevel` (AccessCard의 int)
  - 연산자: `>=` (크거나 같음)
  - 타겟: `4`
  - **목적:** 관리자 레벨 자격 증명

- **조건 B:** 목록 멤버십 확인
  - 소스: `Arg.department` (AccessCard의 string)
  - 연산자: `In List` (포함됨)
  - 타겟: 상수 목록 `["Management", "IT"]`
  - **목적:** 화이트리스트 부서

- **조건 C:** 무작위 확률
  - 소스: `Random Value` (0-100 범위)
  - 연산자: `>` (보다 큼)
  - 타겟: `90`
  - **목적:** 해커를 위한 10% 행운 우회

- **중첩된 AND 그룹:** 게스트 액세스 로직
  - 하위 조건 1: `Arg.securityLevel >= 1` (유효한 카드)
  - 하위 조건 2: `Random(0-100) > 70` (30% 확률)
  - **목적:** 게스트는 낮은 확률을 가지지만 유효한 카드가 있어야 함

:::tip 🎨 드래그 앤 드롭 빌딩

Behavior Window에서 이 트리를 시각적으로 구축할 수 있습니다:

1. **"+ Condition"** 클릭하여 개별 확인 추가
2. **"+ Group"** 클릭하여 AND/OR 컨테이너 추가
3. `≡` 핸들을 드래그하여 조건 재정렬
4. 그룹 레이블을 클릭하여 AND/OR 로직 전환

:::

---

### Sender 설정 (ConditionalEventRaiser)

**ConditionalEventRaiser** GameObject를 선택하세요:

![ConditionalEventRaiser Inspector](/img/game-event-system/examples/06-conditional-event/demo-06-inspector.png)

**이벤트 채널:**
- `Request Access Event`: `OnAccessCard`

**씬 참조:**
- `Security Grid`: SecurityGrid GameObject (전원 토글 기능용)
- `Screen Vignette`: 시각적 전원 피드백용 UI 오버레이

**카드 작동 방식:**
```csharp
// 게스트 카드 (행운에 의존)
SwipeGuestCard() → AccessCard("Guest_Bob", 1, "Visitor")

// 직원 카드 (유효한 부서)
SwipeStaffCard() → AccessCard("Staff_Alice", 3, "Management")

// 관리자 카드 (높은 레벨)
SwipeAdminCard() → AccessCard("Admin_Root", 5, "Director")

// 해커 (순수 무작위성)
AttemptHacking() → AccessCard("Unknown_Hacker", 0, "DarkWeb")
```

---

### Receiver 설정 (ConditionalEventReceiver)

**ConditionalEventReceiver** GameObject를 선택하세요:

![ConditionalEventReceiver Inspector](/img/game-event-system/examples/06-conditional-event/demo-06-receiver.png)

**금고 비주얼:**
- `Door ROOT`: VaultDoorSystem (Transform)
- `Left Door`: DoorLeft (Transform) - 열릴 때 왼쪽으로 슬라이드
- `Right Door`: DoorRight (Transform) - 열릴 때 오른쪽으로 슬라이드
- `Steam VFX Prefab`: 문 열림 효과용 파티클 시스템

**피드백:**
- `Status Text`: StatusText (TextMeshPro) - 액세스 상태 표시

**Behavior 바인딩:**
- 이벤트: `OnAccessCard`
- 메서드: `ConditionalEventReceiver.OpenVault(AccessCard card)`
- **조건 트리:** 게이트키퍼 역할(위에서 구성됨)

:::note 🎯 제로 로직 Receiver

`OpenVault()` 메서드는 조건부 확인을 **포함하지 않습니다**. 조건 트리가 `true`로 평가될 때**만** 호출됩니다. 이것은 검증 로직(데이터 레이어)을 액션 로직(동작 레이어)과 분리합니다.

:::

---

## 💻 코드 분석

### 📤 ConditionalEventRaiser.cs (Sender)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class ConditionalEventRaiser : MonoBehaviour
{
    [Header("Event Channel")]
    [GameEventDropdown] public GameEvent<AccessCard> requestAccessEvent;

    [Header("Scene Reference")]
    [SerializeField] private SecurityGrid securityGrid;

    public void SwipeGuestCard()
    {
        // 레벨 1, 부서 "Visitor"
        // 레벨 확인 실패, 부서 확인 실패
        // 중첩된 AND 그룹의 Random > 70에 의존 (~30% 확률)
        SendRequest("Guest_Bob", 1, "Visitor");
    }

    public void SwipeStaffCard()
    {
        // 레벨 3, 부서 "Management"
        // 레벨 확인 실패 (3 < 4)
        // 부서 확인 통과 (Management가 화이트리스트에 있음)
        SendRequest("Staff_Alice", 3, "Management");
    }

    public void SwipeAdminCard()
    {
        // 레벨 5
        // 레벨 확인 즉시 통과 (5 >= 4)
        SendRequest("Admin_Root", 5, "Director");
    }

    public void AttemptHacking()
    {
        // 레벨 0
        // Random > 90에 순수 의존 (10% 확률)
        SendRequest("Unknown_Hacker", 0, "DarkWeb");
    }

    private void SendRequest(string name, int level, string dept)
    {
        if (requestAccessEvent == null) return;

        // 데이터 패킷 구성
        AccessCard card = new AccessCard(name, level, dept);
        
        // 이벤트 발동
        // 조건 트리는 receiver를 호출하기 전에 평가됨
        requestAccessEvent.Raise(card);
        
        Debug.Log($"[Terminal] Scanning... Name: {name} | Lv: {level} | Dept: {dept}");
    }
}
```

**핵심 포인트:**
- 🎯 **검증 없음** - Sender는 단지 데이터를 생성하고 이벤트를 발동
- 📦 **데이터 구성** - 각 버튼이 고유한 자격 증명 프로필 생성
- 🔇 **제로 로직** - 어떤 조건을 충족해야 하는지에 대한 지식 없음

---

### 📥 ConditionalEventReceiver.cs (Listener)
```csharp
using UnityEngine;
using TMPro;
using System.Collections;

public class ConditionalEventReceiver : MonoBehaviour
{
    [Header("Vault Visuals")]
    [SerializeField] private Transform doorROOT;
    [SerializeField] private Transform leftDoor;
    [SerializeField] private Transform rightDoor;
    [SerializeField] private ParticleSystem steamVFXPrefab;

    [Header("Feedback")]
    [SerializeField] private TextMeshPro statusText;

    private Vector3 _leftClosedPos;
    private Vector3 _rightClosedPos;

    private void Start()
    {
        // 애니메이션을 위한 닫힌 위치 저장
        if(leftDoor) _leftClosedPos = leftDoor.localPosition;
        if(rightDoor) _rightClosedPos = rightDoor.localPosition;
        
        UpdateStatusText("LOCKED", Color.red);
    }

    /// <summary>
    /// [이벤트 콜백 - 조건 제어됨]
    /// 
    /// 중요: 이 메서드는 검증 로직을 포함하지 않습니다!
    /// 
    /// GameEvent 조건 트리가 게이트키퍼 역할을 합니다.
    /// 이 메서드가 실행되면 모든 조건이 TRUE로 평가되었음을 의미합니다:
    /// - 전원이 ON
    /// - AND 다음 중 최소 하나: 관리자 레벨, 유효한 부서 또는 행운의 무작위
    /// 
    /// 이러한 분리를 통해 디자이너는 코드를 건드리지 않고
    /// 에디터에서 액세스 규칙을 수정할 수 있습니다.
    /// </summary>
    public void OpenVault(AccessCard card)
    {
        if (_isOpen) return;

        Debug.Log($"<color=green>[Vault] ACCESS GRANTED to {card.holderName}. " +
                  "Opening doors.</color>");
        
        StartCoroutine(OpenSequenceRoutine(card.holderName));
    }

    private IEnumerator OpenSequenceRoutine(string name)
    {
        _isOpen = true;
        UpdateStatusText("ACCESS GRANTED", Color.green);

        // Steam VFX 생성
        if (doorROOT != null && steamVFXPrefab != null)
        {
            Vector3 spawnPos = doorROOT.position;
            spawnPos.y -= 2.6f;
            
            var vfxInstance = Instantiate(steamVFXPrefab, spawnPos, Quaternion.identity);
            vfxInstance.Play();
            Destroy(vfxInstance.gameObject, 2.0f);
        }
        
        // 문 열기 (밖으로 슬라이드)
        float t = 0;
        while(t < 1f)
        {
            t += Time.deltaTime * 2f;
            if(leftDoor) 
                leftDoor.localPosition = Vector3.Lerp(_leftClosedPos, 
                                                      _leftClosedPos + Vector3.left * 1.2f, t);
            if(rightDoor) 
                rightDoor.localPosition = Vector3.Lerp(_rightClosedPos, 
                                                       _rightClosedPos + Vector3.right * 1.2f, t);
            yield return null;
        }
        
        yield return new WaitForSeconds(2.0f);
        UpdateStatusText("CLOSING...", Color.yellow);
        
        // 문 닫기 (뒤로 슬라이드)
        t = 0;
        while(t < 1f)
        {
            t += Time.deltaTime * 2f;
            if(leftDoor) 
                leftDoor.localPosition = Vector3.Lerp(_leftClosedPos + Vector3.left * 1.2f, 
                                                      _leftClosedPos, t);
            if(rightDoor) 
                rightDoor.localPosition = Vector3.Lerp(_rightClosedPos + Vector3.right * 1.2f, 
                                                       _rightClosedPos, t);
            yield return null;
        }

        _isOpen = false;
        UpdateStatusText("LOCKED", Color.red);
    }

    private void UpdateStatusText(string text, Color col)
    {
        if (statusText)
        {
            statusText.text = text;
            statusText.color = col;
        }
    }
}
```

**핵심 포인트:**
- 🎯 **제로 조건 로직** - 자격 증명을 확인하는 `if` 문 없음
- 🔓 **신뢰 기반 실행** - 호출되면 모든 조건이 이미 통과됨
- 🎨 **순수 프레젠테이션** - 단지 문 애니메이션과 VFX 재생
- 🏗️ **관심사 분리** - 검증(데이터) vs 액션(동작)

---

### 🔌 SecurityGrid.cs (씬 상태)
```csharp
using UnityEngine;

public class SecurityGrid : MonoBehaviour
{
    // 이 공개 속성은 조건 트리에 의해 읽힘
    public bool IsPowerOn = true;

    public void TogglePower()
    {
        IsPowerOn = !IsPowerOn;
        
        // 비주얼 업데이트...
        Debug.Log($"[Environment] Power System is now: {(IsPowerOn ? "ONLINE" : "OFFLINE")}");
    }
}
```

**핵심 포인트:**
- 🔌 **공개 상태** - `IsPowerOn`이 조건 트리에 접근 가능
- 📍 **씬 객체** - 조건이 이 특정 GameObject 인스턴스를 참조
- 🎮 **런타임 변경** - 전원 토글이 즉시 조건 평가에 영향

---

## 🔑 핵심 요점

| 개념                     | 구현                                               |
| ------------------------ | -------------------------------------------------- |
| 🎯 **비주얼 로직**        | 코드 작성 없이 복잡한 조건 구축                    |
| 🌳 **트리 구조**          | AND/OR 그룹이 중첩된 분기 로직 허용                |
| 📍 **씬 참조**            | 씬의 GameObject에서 직접 속성 읽기                 |
| 🎲 **무작위 조건**        | 확률 기반 로직을 위한 내장 무작위 값 소스          |
| 🔀 **인수 액세스**        | 조건에서 이벤트 데이터 속성 참조                   |
| 🚪 **게이트키퍼 패턴**    | 조건이 콜백 실행 여부 제어                         |

:::note 🎓 설계 인사이트

비주얼 조건 트리는 다음에 완벽합니다:

- **액세스 제어 시스템** - 문, 터미널, 제한 구역
- **퀘스트 요구사항** - 퀘스트 완료 전 여러 조건 확인
- **버프 활성화** - 전제 조건이 충족되는 경우에만 효과 적용
- **AI 동작** - 적 반응을 위한 의사 결정 트리
- **전리품 시스템** - 드롭 조건 검증(레벨, 행운, 위치)

로직을 데이터(조건 트리 에셋)로 이동함으로써 **디자이너**가 프로그래머 개입 없이 게임플레이 규칙을 조정할 수 있게 합니다!

:::

---

## 🎯 다음 단계

조건부 로직을 마스터했습니다. 이제 지연 및 스케줄링을 통한 **시간 기반 이벤트 제어**를 탐색해 봅시다.

**다음 챕터**: **[07 Delayed Event](./07-delayed-event.md)**에서 지연된 실행에 대해 배우기

---

## 📚 관련 문서

- **[Visual Condition Tree](../visual-workflow/visual-condition-tree.md)** - 조건 빌더에 대한 완전한 가이드
- **[Game Event Behavior](../visual-workflow/game-event-behavior.md)** - 액션 조건을 구성하는 방법
- **[Best Practices](../scripting/best-practices.md)** - 데이터 기반 설계를 위한 패턴