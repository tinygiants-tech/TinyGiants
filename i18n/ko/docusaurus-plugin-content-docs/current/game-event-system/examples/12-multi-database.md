---
sidebar_label: '12 멀티 데이터베이스'
sidebar_position: 13
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 12 멀티 데이터베이스: 모듈형 이벤트 아키텍처

<!-- <VideoGif src="/video/game-event-system/12-multi-database.mp4" /> -->

## 📋 개요 (Overview)

수백 개의 이벤트가 포함된 대규모 프로젝트(RPG, MMO, 복잡한 시뮬레이션 등)에서 모든 이벤트를 하나의 거대한 데이터베이스 에셋에 저장하는 것은 유지보수 측면에서 매우 비효율적입니다. 이는 에디터 성능 저하, Git 병합 충돌, 조직화의 어려움을 초래합니다. **멀티 데이터베이스 시스템(Multi-Database System)**은 이벤트를 여러 개의 모듈형 스크립터블 오브젝트(ScriptableObject) 에셋(예: `Core_DB`, `Combat_DB`, `UI_DB`)으로 분리하여 독립적으로 관리할 수 있게 함으로써 이 문제를 해결합니다.

:::tip 💡 학습 내용
- 여러 개의 이벤트 데이터베이스를 생성하고 관리하는 방법
- 매니저가 런타임에 성능 부하 없이 데이터베이스를 병합하는 원리
- 플로우 그래프(Flow Graph)가 서로 다른 데이터베이스의 이벤트를 원활하게 연결하는 방법
- 팀 협업 및 버전 관리를 위한 조직화 전략

:::

---

## 🎬 데모 씬 (Demo Scene)
```
Assets/TinyGiants/GameEventSystem/Demo/12_MultiDatabase/12_MultiDatabase.unity
```

### 데모 시연 내용

이 데모는 **데모 11의 체인 이벤트 로직(5단계 발사 프로토콜)을 그대로 재사용**하지만, 아키텍처 측면에서 중요한 차이점이 있습니다.

**데모 11:** 모든 6개의 이벤트가 `GameEventDatabase_Chain.asset`이라는 단일 파일에 저장됨.

**데모 12:** 동일한 6개의 이벤트가 **3개의 별도 데이터베이스 파일로 분산 저장**됨:
- `GameEventDatabase_Core.asset` - 로직 흐름 관련 이벤트
- `GameEventDatabase_Combat.asset` - 액션 및 VFX 관련 이벤트
- `GameEventDatabase_System.asset` - 유틸리티 및 정리 관련 이벤트

**결과:** 런타임 동작은 동일하지만, 확장성을 위해 모듈식으로 조직화되었습니다.

---

## 🗂️ 데이터베이스 아키텍처

### 물리적 에셋 구조

![Project Assets](/img/game-event-system/examples/12-multi-database/demo-12-assets.png)

**프로젝트 창 구성:**
```
📂 12_MultiDatabase/
│
├── 🧠 GameEventDatabase_Core.asset      ➔ [ 📦 이벤트 2개 ]
│   ├── 🎬 0_StartSequence               ➔ 인트로 로직
│   └── ⚙️ 1_SystemCheck                 ➔ 초기화
│
├── ⚔️ GameEventDatabase_Combat.asset    ➔ [ 📦 이벤트 2개 ]
│   ├── ⚡ 2_Charge                      ➔ 스킬 시작
│   └── 🔥 3_Fire                        ➔ 투사체 로직
│
├── 🛠️ GameEventDatabase_System.asset    ➔ [ 📦 이벤트 2개 ]
│   ├── ⏳ 4_CoolDown                    ➔ 글로벌 타이머
│   └── 📁 5_Archive                     ➔ 지속성/저장
│
└── 🕸️ GameEventFlow_MultiDatabase.asset ➔ [ 🌐 플로우 그래프 ]
    └─ (위의 모든 데이터베이스에 있는 이벤트들을 연결)
```

**핵심 관찰 사항:**
각 데이터베이스는 프로젝트 내의 물리적인 `.asset` 파일인 **스크립터블 오브젝트(ScriptableObject) 에셋**입니다. 따라서 다음이 가능합니다:
- 다른 폴더로 이동 가능
- 서로 다른 팀원에게 할당 가능 (병합 충돌 방지!)
- 런타임에 동적으로 로드/언로드 가능
- 독립적인 버전 관리 가능

:::note 📦 에셋으로서의 데이터베이스

이벤트 데이터베이스는 스크립터블 오브젝트이므로 다음과 같은 특징을 가집니다:

- 프로젝트 내에 `.asset` 파일로 존재함
- 씬에서 참조될 수 있음
- 도메인 리로드(Domain Reload) 시에도 데이터가 유지됨
- 독립적으로 직렬화됨

이는 단일 JSON 설정 파일이나 씬 내에 내장되어 이벤트를 저장하는 시스템과 근본적으로 다릅니다.

:::

---

## 🎮 상호작용 방법

### 런타임 동작 테스트

이 씬은 시각적으로 데모 11과 동일합니다. 터렛, 버튼, 발사 시퀀스가 모두 같습니다.

**1단계: 플레이 모드 진입**

**2단계: 일반 발사 테스트**
- **"Launch A"** 클릭
- **관찰:** 5단계 시퀀스가 완벽하게 실행됨
  - System Check → Charge (1초 지연) → Fire → CoolDown → Archive
- **백그라운드:** 실행 신호가 3개의 데이터베이스를 넘나듭니다:
  - 1단계(`SystemCheck`)는 `Core` DB 소속
  - 3단계(`Fire`)는 `Combat` DB 소속
  - 5단계(`Archive`)는 `System` DB 소속

**결과:** ✅ 원활한 교차 데이터베이스 실행

---

### 데이터베이스 로딩 검증

모듈형 로딩 시스템이 작동함을 증명하는 테스트입니다:

**3단계: 전투 데이터베이스 비활성화**
1. Hierarchy에서 **Game Event Manager** 선택
2. 인스펙터의 **Databases** 리스트 확장
3. `GameEventDatabase_Combat` 항목 찾기
4. "Active" 토글 **체크 해제**

**4단계: 비활성화된 데이터베이스 테스트**
- **"Launch A"** 클릭
- **결과:** ❌ 2단계(Charge)에서 시퀀스가 멈춤
  - 콘솔에 누락된 이벤트에 대한 오류 표시됨
  - 3~5단계가 절대 실행되지 않음

**5단계: 전투 데이터베이스 다시 활성화**
- "Active" 토글을 다시 **체크**
- **"Launch A"** 클릭
- **결과:** ✅ 시퀀스가 다시 정상 작동함

**증명된 사실:**
- 데이터베이스를 런타임에 동적으로 활성화/비활성화할 수 있습니다.
- 데이터베이스가 누락되면 예상대로 실행이 중단됩니다.
- "자동 로드" 마술이 아니며, 사용자가 로드할 항목을 직접 제어합니다.

---

## 🏗️ 멀티 데이터베이스 구성

### 런타임: 매니저 설정

Hierarchy에서 **Game Event Manager**를 선택하여 멀티 데이터베이스 구성을 확인하십시오:

![Manager Databases](/img/game-event-system/examples/12-multi-database/demo-12-manager.png)

**Databases 리스트 (3개 항목):**
1. ✅ `GameEventDatabase_Core` - 활성
2. ✅ `GameEventDatabase_Combat` - 활성
3. ✅ `GameEventDatabase_System` - 활성

**런타임 병합 원리:**
```
🚀 시스템 초기화
│
├── 📂 1단계: 탐색 (Discovery)
│   └── 📚 매니저가 모든 활성 데이터베이스를 스캔하고 읽음
│
├── 🧩 2단계: 통합 (Consolidation)
│   └── 🛠️ 모든 이벤트를 글로벌 조회 테이블(LUT)로 병합
│       ├── 🧬 키(Key):   이벤트 GUID (고유 식별자)
│       └── 📦 값(Value): 이벤트 참조 (직접 포인터)
│
└── 🔗 3단계: 연결 (Linking)
    └── 🕸️ FlowGraph 참조가 GUID를 통해 확인됨
```

**성능 특성:**
- **조회 속도:** O(1) - 단일 데이터베이스와 동일함
- **메모리 오버헤드:** 무시할 수 있는 수준 (단순 사전 포인터)
- **초기화:** 시작 시 한 번 데이터베이스가 병합됨
- **런타임 비용:** 없음 - 이미 병합된 상태

:::tip ⚡ 성능 부하 없음 (Zero Performance Cost)

데이터베이스가 1개이든 100개이든 **런타임 성능 차이는 없습니다**. 매니저가 시작 시 모든 데이터베이스를 단일 조회 테이블로 병합하기 때문입니다. 데이터베이스 개수는 성능이 아닌 조직화 요구 사항에 맞춰 결정하십시오.

:::

---

### 디자인 타임: 에디터 데이터베이스 전환

**Game Event Editor**를 열어 여러 데이터베이스의 이벤트를 관리합니다:

![Editor Database Dropdown](/img/game-event-system/examples/12-multi-database/demo-12-editor-dropdown.png)

**데이터베이스 드롭다운 (툴바):**
사용 가능한 모든 데이터베이스를 보여줍니다:
- `GameEventDatabase_Core` (선택됨)
- `GameEventDatabase_Combat`
- `GameEventDatabase_System`

**작업 흐름:**
1. **데이터베이스 선택:** 편집할 데이터베이스를 선택합니다.
2. **이벤트 보기:** 에디터는 선택된 데이터베이스의 이벤트만 표시합니다.
3. **이벤트 생성:** 새로운 이벤트는 현재 선택된 데이터베이스에 추가됩니다.
4. **컨텍스트 전환:** 드롭다운을 통해 빠르게 다른 데이터베이스로 이동할 수 있습니다.

**예시 - Core 데이터베이스 보기:**
- 드롭다운: `GameEventDatabase_Core`
- 표시된 이벤트: `0_StartSequence`, `1_SystemCheck` (총 2개)
- 숨겨진 이벤트: 다른 모든 데이터베이스의 이벤트

**예시 - Combat 데이터베이스 보기:**
- 드롭다운: `GameEventDatabase_Combat`
- 표시된 이벤트: `2_Charge`, `3_Fire` (총 2개)
- 숨겨진 이벤트: 다른 모든 데이터베이스의 이벤트

:::note 🔄 컨텍스트 전환

에디터는 시각적 혼란을 줄이기 위해 한 번에 하나의 데이터베이스만 보여줍니다. 드롭다운을 사용하여 데이터베이스 간을 전환하십시오. 이는 런타임에 영향을 주지 않으며, 활성화된 모든 데이터베이스는 여전히 병합된 상태입니다.

:::

---

### 인스펙터: 교차 데이터베이스 이벤트 선택

인스펙터의 스크립트에 이벤트를 할당할 때, **GameEventDropdown**은 **모든 활성 데이터베이스**의 이벤트를 보여줍니다:

![Inspector Dropdown](/img/game-event-system/examples/12-multi-database/demo-12-inspector-dropdown.png)

**드롭다운 구조:**
이벤트는 데이터베이스 및 카테고리별로 그룹화됩니다:
```
⚔️ GameEventDatabase_Combat / Default
├─ ⚡ 2_Charge
└─ ⚡ 3_Fire

🧠 GameEventDatabase_Core / Default
├─ 📍 🎬 0_StartSequence        ➔ [ 현재 선택됨 ]
└─ ⚙️ 1_SystemCheck

🛠️ GameEventDatabase_System / Default
├─ ⏳ 4_CoolDown
└─ 💾 5_Archive
```

**주요 동작:**
- **모든 활성 데이터베이스:** 드롭다운에는 매니저에 로드된 모든 데이터베이스의 이벤트가 포함됩니다.
- **데이터베이스 레이블:** 명확성을 위해 이벤트 이름 앞에 데이터베이스 이름이 접두사로 붙습니다.
- **카테고리 그룹화:** 각 데이터베이스 내에서 이벤트가 카테고리별로 정리됩니다.
- **타입 필터링:** 필드의 타입 시그니처와 일치하는 이벤트만 표시됩니다.

**할당 예시:**
```csharp
[GameEventDropdown] 
public GameEvent<GameObject, DamageInfo> sequenceStartEvent;
```

드롭다운 표시:
- ✅ `0_StartSequence` (Core DB 소속) - 호환되는 타입
- ❌ 타입이 일치하지 않는 다른 이벤트들은 숨겨짐

:::tip 🎯 스마트 필터링

드롭다운은 다음 조건에 따라 자동으로 필터링합니다:

1. **타입 호환성** - 필드 타입과 일치하는 이벤트만 표시
2. **활성 데이터베이스** - 매니저가 로드한 데이터베이스의 이벤트만 표시
3. **데이터베이스/카테고리** - 쉬운 탐색을 위한 그룹화

이를 통해 타입 오류를 방지하고 대규모 프로젝트에서도 쉽게 이벤트를 찾을 수 있습니다.

:::

---

## 🔑 멀티 데이터베이스의 장점

### 팀 협업 (Team Collaboration)

**문제점:** 10명의 개발자가 모두 `GlobalDatabase.asset` 하나를 편집하는 경우
- 지속적인 Git 병합 충돌 발생
- 로딩 시 에디터가 길게 멈춤
- 소유권 경계가 불분명함

**해결책:** 모듈 기반의 데이터베이스 소유권 분리
```
📂 Databases/
│
├── 🧠 Core_DB.asset         ➔ 💻 [ 소유자: 리드 프로그래머 ]
│   └─ 전역 상태, 초기화 및 저수준 트리거.
│
├── ⚔️ Combat_DB.asset       ➔ 🤺 [ 소유자: 전투 팀 ]
│   └─ 공격 시퀀스, AI 동작 및 데미지 로직.
│
├── 🖥️ UI_DB.asset           ➔ 🎨 [ 소유자: UI 팀 ]
│   └─ 메뉴 전환, HUD 업데이트 및 버튼 피드백.
│
├── 🔊 Audio_DB.asset        ➔ 🎧 [ 소유자: 오디오 팀 ]
│   └─ 앰비언트 루프, SFX 트리거 및 음악 상태 전환.
│
├── 🗺️ Level1_DB.asset       ➔ 📐 [ 소유자: 레벨 디자이너 A ]
│   └─ 레벨 1 전용 퍼즐, 트리거 및 이벤트.
│
└── 🗺️ Level2_DB.asset       ➔ 📐 [ 소유자: 레벨 디자이너 B ]
    └─ 레벨 2 전용 퍼즐, 트리거 및 이벤트.
```

**결과:**
- ✅ 충돌 없는 병렬 작업 가능
- ✅ 명확한 모듈 소유권 확립
- ✅ 더 빠른 Git 작업 (작은 변경 사항 차이)
- ✅ 용이한 코드 리뷰 (작은 단위의 변경 세트)

---

### 논리적 조직화 (Logical Organization)

**문제점:** 하나의 데이터베이스에 500개의 이벤트가 있는 경우
- 특정 이벤트를 찾기 어려움
- 시스템 간 경계가 모호함
- 의존성 이해가 어려움

**해결책:** 도메인 주도 데이터베이스 설계
```
⚔️ Combat_DB             ➔ [ 이벤트 50개 ]
   └─ 공격, 방어 및 고빈도 데미지 로직.

🏃 Movement_DB           ➔ [ 이벤트 30개 ]
   └─ 걷기, 점프, 대시 및 물리 기반 상태 변화.

🎒 Inventory_DB          ➔ [ 이벤트 80개 ]
   └─ 아이템 습득, 사용, 버리기 및 내구도 메커니즘.

📜 Quest_DB              ➔ [ 이벤트 100개 ]
   └─ 시작, 진행 및 복잡한 완료 마일스톤.

🖥️ UI_DB                 ➔ [ 이벤트 70개 ]
   └─ 메뉴 전환, HUD 업데이트 및 대화 시스템.

🔊 Audio_DB              ➔ [ 이벤트 40개 ]
   └─ 동적 음악 레이어 및 위치 기반 SFX 트리거.

🗺️ Level_Specific_DB     ➔ [ 이벤트 130개 ]
   └─ 레벨별 고유 환경 및 퍼즐 이벤트.
```

**결과:**
- ✅ 명확한 개념적 경계
- ✅ 관련 이벤트 위치 파악 용이
- ✅ 의존성 파악 가능
- ✅ 모듈식 테스트 가능 (필요한 DB만 로드)

---

### 동적 로딩 (Dynamic Loading)

**활용 사례:** 여러 레벨이 있는 모바일 게임

**문제점:** 시작 시 1000개의 이벤트를 모두 로드하면 메모리가 낭비됨

**해결책:** 런타임 데이터베이스 관리
```csharp
void LoadLevel(int levelIndex)
{
    // 이전 레벨의 이벤트 언로드
    manager.UnloadDatabase("Level" + (levelIndex - 1));
    
    // 현재 레벨의 이벤트 로드
    manager.LoadDatabase("Level" + levelIndex);
    
    // 핵심 시스템은 항상 로드된 상태 유지
    // (Core_DB, Combat_DB, UI_DB는 활성 상태 유지)
}
```

**결과:**
- ✅ 낮은 메모리 점유율
- ✅ 더 빠른 레벨 전환
- ✅ 저사양 기기에서 성능 향상
- ✅ 모듈형 콘텐츠 업데이트 (단일 DB만 패치 가능)

---

## 🛠️ 코드 아키텍처

### 위치 독립적 코드 (Location-Agnostic Code)

데모 12의 코드는 데모 11과 **동일**합니다. 스크립트는 이벤트가 어떤 데이터베이스에 있는지 알 필요도 없고 신경 쓰지도 않습니다.

**MultidatabaseRaiser.cs:**
```csharp
[GameEventDropdown]
public GameEvent<GameObject, DamageInfo> sequenceStartEvent;

public void RequestLaunchA()
{
    // 이 이벤트가 어느 데이터베이스에 있든 상관없이 작동합니다.
    // Core_DB, Combat_DB 또는 다른 어떤 데이터베이스에 있어도 무방합니다.
    sequenceStartEvent.Raise(turretA, info);
}
```

**MultidatabaseReceiver.cs:**
```csharp
// 서로 다른 데이터베이스의 이벤트에 바인딩된 메서드들
public void OnSystemCheck(GameObject sender, DamageInfo args)    // Core_DB 소속
public void OnStartCharging(GameObject sender, DamageInfo args)  // Combat_DB 소속
public void OnFireWeapon(GameObject sender, DamageInfo args)     // Combat_DB 소속
public void OnCoolDown(GameObject sender, DamageInfo args)       // System_DB 소속
public void OnSequenceArchived(GameObject sender, DamageInfo args) // System_DB 소속
```

**핵심 인사이트:**
스크립트는 데이터베이스 경로가 아니라 **GUID**(직렬화된 필드에 저장됨)를 통해 이벤트를 참조합니다. 매니저는 런타임에 GUID를 이벤트 인스턴스로 해석하며, 이때 해당 이벤트가 어느 데이터베이스에 포함되어 있는지는 중요하지 않습니다.

---

### 플로우 그래프의 교차 데이터베이스 연결

플로우 그래프는 서로 다른 데이터베이스의 이벤트를 매끄럽게 연결합니다:

**시각적 흐름 (데모 11과 동일):**
```
🧠 [ Core_DB ] ➔ 초기화 레이어
│  ├─ 🎬 0_StartSequence   ➔ 🔘 루트 (점화)
│  └─ ⚙️ 1_SystemCheck     ➔ 🛡️ 조건 (보안 검사)
│
       ▼ (신호 전달)
│
⚔️ [ Combat_DB ] ➔ 액션 레이어
│  ├─ ⚡ 2_Charge           ➔ ⏱️ 지연 (준비)
│  └─ 🔥 3_Fire             ➔ 🚀 액션 (실행)
│
       ▼ (신호 전달)
│
🛠️ [ System_DB ] ➔ 유지보수 레이어
│  ├─ ⏳ 4_CoolDown         ➔ ⌛ 대기 (회복)
│  └─ 💾 5_Archive          ➔ 🧹 필터 (정리)
```

**백그라운드 원리:**
- 각 노드는 이벤트의 **GUID**를 저장합니다.
- 매니저는 런타임에 GUID를 실제 이벤트로 해석합니다.
- 이벤트가 데이터베이스 간에 이동하더라도 연결은 유지됩니다.
- 재조직화 시에도 "연결 끊김"이 발생하지 않습니다.

:::tip 🔗 GUID 기반 참조

이벤트는 파일 경로가 아닌 변경 불가능한 GUID를 통해 참조됩니다. 따라서 다음 작업이 가능합니다:

- 데이터베이스 간에 이벤트 이동
- 데이터베이스 파일 이름 변경
- 폴더 구조 재정리

이벤트의 GUID가 변경되지 않는 한 모든 참조는 유효하게 유지됩니다.

:::

---

## 📊 베스트 프랙티스 (Best Practices)

### 여러 데이터베이스를 만들어야 하는 시점

**권장 사유:**
- ✅ **팀별 소유권** - 서로 다른 팀이 서로 다른 시스템을 작업할 때
- ✅ **논리적 도메인** - 개념적 경계가 명확할 때 (전투, UI, 오디오 등)
- ✅ **동적 로딩** - 레벨이나 모드별로 이벤트를 로드/언로드해야 할 때
- ✅ **버전 관리** - 병합 충돌을 줄이고 싶을 때
- ✅ **테스트** - 특정 테스트를 위해 관련 데이터베이스만 로드하고 싶을 때

**피해야 할 사유:**
- ❌ **성능** - 멀티 DB는 런타임 비용이 없으므로 성능 때문에 나눌 필요는 없습니다.
- ❌ **단순 이벤트 개수** - 한 DB에 50개 정도는 괜찮습니다. 너무 세분화하지 마세요.
- ❌ **조기 최적화** - 하나의 DB로 시작하고, 관리상의 불편함이 느껴질 때 나누세요.

---

### 권장 데이터베이스 구조

**소규모 프로젝트 (이벤트 100개 미만):**
```
📂 Databases/
└─ 🧠 GameEventDatabase_Main.asset   ➔ [ 📦 올인원 ]
   └─ (모든 전투, UI, 시스템 이벤트가 여기에 위치)
```

**중규모 프로젝트 (이벤트 100~300개):**
```
📂 Databases/
├─ 🧠 Core_DB.asset         ➔ [ ⚙️ 기초 시스템 ]
├─ 🎮 Gameplay_DB.asset     ➔ [ ⚔️ 주요 메커니즘 ]
└─ 🖥️ UI_DB.asset           ➔ [ 🎨 메뉴 및 HUD ]
```

**대규모 프로젝트 (이벤트 300개 이상):**
```
📂 Databases/
├─ 🧠 Core_DB.asset         ➔ 💻 [ 글로벌 시스템 ]
├─ ⚔️ Combat_DB.asset       ➔ 🤺 [ 전투 메커니즘 ]
├─ 🏃 Movement_DB.asset     ➔ 🤸 [ 캐릭터 이동 ]
├─ 🎒 Inventory_DB.asset    ➔ 📦 [ 아이템 및 가방 관리 ]
├─ 📜 Quest_DB.asset        ➔ 📖 [ 미션 및 스토리 로직 ]
├─ 🖥️ UI_DB.asset           ➔ 🎨 [ 전역 인터페이스 ]
├─ 🔊 Audio_DB.asset        ➔ 🎧 [ 동적 사운드스케이프 ]
│
└─ 🗺️ Level_Specific/        ➔ 📐 [ 레벨별 고유 이벤트 ]
   ├─ Level_01_DB.asset
   ├─ Level_02_DB.asset
   └─ ...
```

---

### 명명 규칙 (Naming Conventions)

**데이터베이스 파일:**
- `GameEventDatabase_[모듈명].asset` (에디터 툴을 위한 필수 접두사)
- 예: `GameEventDatabase_Combat.asset`, `GameEventDatabase_UI.asset`

**이벤트 이름:**
- 단계/우선순위 접두사: `0_StartSequence`, `1_SystemCheck`
- 또는 모듈 접두사: `Combat_AttackStart`, `UI_MenuOpen`
- 일반적인 이름 지양: `Event1`, `MyEvent` (검색하기 어려움)

---

## 🎯 다음 단계

확장성과 협업을 위해 이벤트를 여러 데이터베이스로 조직화하는 방법을 배웠습니다. 다음으로는 런타임 API 사용법에 대해 알아보겠습니다.

**다음 장**: **[13 런타임 API](./13-runtime-api.md)**에서 런타임 이벤트 조작을 확인하세요.

---

## 📚 관련 문서

- **[게임 이벤트 매니저](../visual-workflow/game-event-manager.md)** - 데이터베이스 로딩 및 관리
- **[게임 이벤트 에디터](../visual-workflow/game-event-editor.md)** - 멀티 데이터베이스 편집 워크플로우
- **[베스트 프랙티스](../scripting/best-practices.md)** - 대규모 프로젝트를 위한 조직화 패턴
```