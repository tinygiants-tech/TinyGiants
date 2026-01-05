---
sidebar_label: '코드 생성 및 정리'
sidebar_position: 1
---

# 코드 생성 및 유지관리

최고의 성능과 **완벽한 유니티 인스펙터 통합**을 위해, **게임 이벤트 시스템**은 특정 데이터 타입에 맞는 구체적인 C# 클래스를 사용합니다.

`GameEvent<T>`는 강력하지만, 유니티 인스펙터(`UnityEvent`)는 제네릭 타입을 직접 직렬화할 수 없습니다. 이 도구 세트는 이러한 래퍼(wrapper) 클래스의 생성을 자동화하여, 여러분이 단 한 줄의 보일러플레이트 코드를 작성하지 않고도 커스텀 데이터 타입(구조체, 클래스, 열거형)이 인스펙터에 네이티브하게 나타나도록 보장합니다.

## 🚀 도구 접속 방법

이 유틸리티들은 **[게임 이벤트 시스템 대시보드](../visual-workflow/game-event-system)** 내에 위치하며, 다음 방법을 통해 접속할 수 있습니다:

**시스템 대시보드에서:**

```
Game Event System Window → "Generate/Clean Game Event Code" 또는 "Clean All Game Event Code" 클릭
```

![alt text](/img/game-event-system/tools/codegen-and-cleanup/hub-code-tools.png)

---

## 📂 아키텍처

도구를 사용하기 전에, 코드가 어디에 저장되는지 이해하는 것이 중요합니다. 시스템은 플러그인을 업그레이드할 때 생성된 파일이 손실되지 않도록 **코어 로직(Core Logic)**과 **사용자 데이터(User Data)**를 엄격하게 분리합니다.

```text
Assets/
├── 📁 TinyGiants/                  # [코어 로직] 변경 불가능한 플러그인 루트
│   └── 📁 GameEventSystem/
│
└── 📁 TinyGiantsData/              # [사용자 데이터] 여러분이 생성한 콘텐츠의 보호 구역
    └── 📁 GameEventSystem/
        └── 📁 CodeGen/             # 💾 자동 생성된 C# 클래스
            ├── 📁 Basic/           # 🛡️ 기본 타입 (시스템 필수 파일)
            └── 📁 Custom/          # 💾 커스텀 타입 (도구에 의해 관리됨)
```

:::info **프로젝트 구조**

전체 프로젝트 디렉토리 구조에 대한 자세한 이해는 이전 장인 **[프로젝트 구조](../intro/project-structure.md)**를 참조하십시오.

:::

:::danger 'Basic' 폴더를 수정하지 마십시오
`TinyGiantsData/GameEventSystem/CodeGen/Basic` 폴더에는 필수 시스템 타입(Int, Float, Bool, String 등)이 포함되어 있습니다.

**이 폴더의 파일을 수동으로 삭제하거나 수정하지 마십시오.** 

실수로 Basic 폴더를 삭제했거나 시스템에서 기본 타입(예: Int32GameEvent)이 누락되었다고 보고하는 경우, 환경을 자체 복구할 수 있습니다.

1. **게임 이벤트 시스템** 창을 엽니다 (`Tools > TinyGiants > Game Event System`).
2. 창 상단의 **Initialize Event System** 버튼을 클릭합니다.
3. 시스템이 다음 작업을 수행합니다:
   - 디렉토리 구조 재생성.
   - 누락된 모든 기본 타입 코드 재생성.

:::

------

## 📝 생성된 코드 이해하기

특정 타입(예: int 또는 커스텀 `DamageInfo` 구조체)에 대한 코드를 생성하면, 도구는 두 가지 핵심 부분을 포함하는 파일을 생성합니다:

1. **이벤트 클래스**: `GameEvent<T>`를 상속받는 구체적인 래퍼 클래스 (예: Int32GameEvent).
2. **바인딩 필드**: 인스펙터가 리플렉션을 통해 리스너를 바인딩할 수 있도록 `UnityEvent<T>` 필드를 추가하는 `GameEventManager`용 partial 클래스 확장.

### 예시: 기본 타입 (Int32)

```csharp
// =============================================================
// BASIC GAME EVENT - AUTO GENERATED
// =============================================================
using UnityEngine;
using UnityEngine.Events;

namespace TinyGiants.GameEventSystem.Runtime
{
    // 1. ScriptableObject 클래스
    public class Int32GameEvent : GameEvent<int> { }
    
    // 2. 인스펙터 바인딩
    public partial class GameEventManager
    {
        public partial class EventBinding
        {
            [HideInInspector]
            public UnityEvent<int> Int32GameEventAction;
        }
    }
}
```

### 예시: 커스텀 송신자 타입

**송신자(Sender)**와 **인자(Arguments)**를 모두 포함하는 이벤트의 경우:

```csharp
// =============================================================
// CUSTOM SENDER GAME EVENT - AUTO GENERATED
// =============================================================
using UnityEngine;
using UnityEngine.Events;

namespace TinyGiants.GameEventSystem.Runtime
{
    // 1. ScriptableObject 클래스
    public class GameObjectDamageInfoGameEvent : GameEvent<UnityEngine.GameObject, DamageInfo> { }
    
    // 2. 인스펙터 바인딩
    public partial class GameEventManager
    {
        public partial class EventBinding
        {
            [HideInInspector]
            public UnityEvent<UnityEngine.GameObject, DamageInfo> GameObjectDamageInfoGameEventAction;
        }
    }
}
```

------

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## ⚡ 코드 생성기 도구 (Code Generator Tool)

**게임 이벤트 코드 생성기**는 탭 인터페이스를 제공하여 단순한 단일 매개변수 이벤트와 복잡한 송신자-인자 이벤트 사이를 전환할 수 있습니다. 두 모드 모두 **일괄 대기열 처리(batch queuing)**를 지원하므로 여러 타입을 설정하고 한 번에 모두 생성할 수 있습니다.

<Tabs>
  <TabItem value="single" label="단일 매개변수 (Single Parameter)" default>

  ![Code Generator - Single Parameter](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

  단일 데이터 페이로드를 전달하는 이벤트(예: `GameEvent<float>` 또는 `GameEvent<MyClass>`)에 이 모드를 사용합니다.

  1.  **빠른 추가(Quick Add)**: 드롭다운을 사용하여 표준 C# 타입(Double, Long, Vector3 등)을 빠르게 추가합니다.
  2.  **커스텀 타입 검색**: 프로젝트 내의 클래스, 구조체 또는 열거형 이름을 입력합니다.
  3.  **대기열 시스템**: **Add**를 클릭하여 타입을 "Selected Queue"로 이동시킵니다.
  4.  **일괄 생성**: 녹색 **Generate Code(s)** 버튼을 클릭하여 대기열에 있는 모든 타입의 파일을 동시에 생성합니다.

  </TabItem>
  <TabItem value="sender" label="송신자 포함 (With Sender)">

  ![Code Generator - With Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_sender.png)

  이벤트가 발생한 **대상**과 **발생한 일**을 모두 알아야 하는 이벤트(예: `Player`가 `DamageInfo`를 보냄)에 이 모드를 사용합니다.

  1.  **송신자 타입 선택**: 주로 `GameObject` 또는 특정 스크립트(예: `PlayerController`)입니다.
  2.  **인자 타입 선택**: 데이터 페이로드(예: `DamageInfo`)입니다.
  3.  **쌍 추가(Add Pair)**: 특정 조합(예: `GameObject` → `DamageInfo`)을 생성하고 대기열에 추가합니다.
  4.  **일괄 생성**: 정의된 모든 쌍을 한 번의 작업으로 생성합니다.

  </TabItem>
</Tabs>

:::tip 자동 컴파일
"Generate"를 클릭하면 유니티가 스크립트 재컴파일을 트리거합니다. 컴파일이 완료되면 새로운 이벤트 타입들을 **Create 에셋 메뉴**와 **이벤트 에디터**에서 즉시 사용할 수 있습니다.
:::

---

## 🧹 코드 정리 도구 (Code Cleaner Tool)

프로젝트가 발전함에 따라 오래된 구조체를 삭제하거나 코드를 리팩토링하여 사용하지 않는 GameEvent 클래스가 남을 수 있습니다. **코드 정리 도구**는 생성기 인터페이스와 대칭을 이루며, 더 이상 사용되지 않는 파일들을 안전하게 필터링하고 일괄 삭제할 수 있게 해줍니다.

이 도구는 **Custom 폴더**(`TinyGiantsData/.../Custom`)**만 대상으로 합니다.** 시스템 무결성을 보호하기 위해 `Basic` 폴더의 파일은 절대로 표시하거나 삭제하지 않습니다.

<Tabs>
  <TabItem value="single" label="단일 매개변수 (Single Parameter)" default>

  ![Code Cleaner - Single Parameter](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_single.png)

  `GameEvent<T>`를 위해 생성된 모든 커스텀 파일 목록을 보여줍니다.

  *   **검색 및 필터링**: 타입 이름으로 파일을 찾습니다 (예: "Damage" 검색 시 `DamageInfoGameEvent.cs` 검색).
  *   **모두 선택 / 해제**: 대규모 목록을 빠르게 관리합니다.
  *   **다중 선택**: 개별 파일 옆에 체크하거나 "Select All"을 사용합니다.
  *   **삭제**: 빨간색 **Delete All Selected Files** 버튼은 체크된 모든 항목의 `.cs` 파일과 해당 `.meta` 파일을 제거합니다.

  </TabItem>
  <TabItem value="sender" label="송신자 포함 (With Sender)">

  ![Code Cleaner - With Sender](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_sender.png)

  `GameEvent<Sender, Args>`를 위해 생성된 모든 커스텀 파일 목록을 보여줍니다.

  *   **복합 필터링**: 송신자 이름 또는 인자 이름으로 검색할 수 있습니다.
  *   **파일 검사**: 파일 옆의 **오브젝트 아이콘** 📦을 클릭하여 삭제하기 전에 프로젝트 창에서 해당 스크립트를 강조(ping) 표시합니다 (참조 확인 시 유용).
  *   **일괄 삭제**: 한 번의 클릭으로 여러 송신자-이벤트 정의를 안전하게 제거합니다.

  </TabItem>
</Tabs>

------

## ☢️ 모든 코드 삭제 (리셋)

**Clean All Game Event Code** 버튼은 "최종 수단" 옵션입니다.

- **동작**: `TinyGiantsData/GameEventSystem/CodeGen/Custom` 폴더 내의 **모든** 커스텀 파일을 삭제합니다.
- **보존**: Basic 폴더는 **보존**합니다.
- **사용 사례**: 커스텀 이벤트를 완전히 초기화하고 싶을 때나, 대량의 타입을 리팩토링한 후 현재 필요한 것만 다시 생성하고 싶을 때 사용하십시오.