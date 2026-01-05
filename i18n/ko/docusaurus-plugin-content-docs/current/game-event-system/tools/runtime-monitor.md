---
sidebar_label: '런타임 모니터'

sidebar_position: 2
---

# 런타임 모니터

**Game Event Monitor**는 런타임 중 이벤트 시스템의 동작에 대한 포괄적인 인사이트를 제공하는 강력한 실시간 디버깅 및 분석 도구입니다. 성능 병목 현상을 식별하고, 이벤트 흐름을 추적하며, 리스너 관계를 모니터링하고, 복잡한 이벤트 체인을 디버그하는 데 도움을 줍니다.

------

## 🎯 런타임 모니터를 사용하는 이유는?

### 강력한 기능

런타임 모니터는 이벤트 기반 게임 개발 및 디버깅 방식을 혁신합니다:

- **🔍 실시간 가시성** - 이벤트가 발생하는 시점과 방법을 정확히 확인
- **⚡ 성능 프로파일링** - 느린 리스너를 식별하고 실행 시간 최적화
- **📊 통계 분석** - 이벤트 빈도, 패턴 및 사용 추세 추적
- **🔗 플로우 시각화** - 복잡한 트리거 및 체인 관계를 한눈에 이해
- **⚠️ 자동 경고** - 성능 문제와 잠재적 문제를 조기에 포착
- **👂 리스너 검사기** - 모든 활성 구독 및 소스 모니터링
- **📝 이벤트 로그** - 디버깅을 위한 스택 추적이 포함된 완전한 실행 기록

### 개발에 대한 의미

:::tip 개발 이점

- **빠른 디버깅**: 어떤 이벤트가 어떤 순서로 발동되었는지 즉시 확인
- **성능 최적화**: 게임플레이에 영향을 미치기 전에 느린 리스너를 식별하고 수정
- **아키텍처 이해**: 이벤트 흐름을 시각화하여 깔끔한 시스템 설계 유지
- **사전 문제 감지**: 메모리 누수 및 재귀 호출과 같은 문제를 자동으로 포착
- **팀 협업**: 팀원들과 이벤트 흐름의 시각적 표현 공유

:::

------

## 🚀 모니터 열기

유틸리티는 **[Game Event System](../visual-workflow/game-event-system)** 내에 위치하며, 다음 방법을 통해 액세스할 수 있습니다:

**시스템 대시보드에서:**
```tex
Game Event System 창 → "Game Event Monitor" 클릭
```

![alt text](/img/game-event-system/tools/runtime-monitor/hub-core-tools.png)

:::info 창 관리

모니터 창은 플레이 모드 중 편리한 액세스를 위해 다른 Unity 에디터 창과 함께 도킹할 수 있습니다. Console 또는 Inspector 창 근처에 도킹하는 것을 권장합니다.

:::

------

## 📱 인터페이스 개요

### 초기 창 상태

Game Event Monitor를 처음 열면 **중지 상태**(플레이 모드가 아님)의 창이 표시됩니다:

![Monitor Window - Stopped State](/img/game-event-system/tools/runtime-monitor/monitor-stopped.png)

**중지 상태의 주요 요소:**

- **헤더 바** - Game Event System 로고 및 창 제목 표시
- **상태 표시기** - 회색으로 "○ Stopped" 표시(플레이 모드가 아님)
- **디버거 토글** - 이벤트 추적 활성화/비활성화 버튼
- **탭 탐색** - 8개의 메인 탭(플레이 모드까지 회색 표시)
- **플레이 모드 프롬프트** - 플레이 모드 진입을 안내하는 중앙 메시지

:::warning 플레이 모드 필요

런타임 모니터는 **플레이 모드** 중에만 데이터를 수집하고 표시합니다. 성능 오버헤드를 피하기 위해 편집 모드에서는 모든 모니터링 기능이 비활성화됩니다.

:::

------

### 창 구성요소

모니터 인터페이스는 여러 주요 영역으로 구성됩니다:

#### 1. 헤더 바

창 상단에 위치하며 다음을 포함합니다:

- **🎮 로고 및 제목** - 시각적 브랜딩 및 창 식별

- **상태 배지** - 현재 상태 표시:

  - **Running** (녹색) - 플레이 모드 활성, 이벤트 모니터링 중
  - **Stopped** (회색) - 편집 모드, 모니터링 없음

- **디버거 토글** - 이벤트 추적 여부 제어:

  - **Debugger ON** (녹색) - 이벤트 적극 기록 중
  - **Debugger OFF** (빨간색) - 기록 안 함(성능 절약)

#### 2. 탐색 도구 모음

헤더 아래에 메인 탐색 탭이 있습니다:

| 탭              | 아이콘 | 목적                              |
| --------------- | ------ | --------------------------------- |
| **Dashboard**   | 📊      | 모든 모니터링 데이터 개요         |
| **Performance** | ⚡      | 실행 시간 분석 및 프로파일링      |
| **Recent**      | 📝      | 시간순 이벤트 로그                |
| **Statistics**  | 📈      | 이벤트 빈도 및 사용 패턴          |
| **Warnings**    | ⚠      | 성능 문제 및 경고                 |
| **Listeners**   | 👂      | 활성 구독 개요                    |
| **Automation**  | 🔗      | 트리거 및 체인 플로우 시각화      |
| **Details**     | 🔍      | 선택된 이벤트에 대한 심층 분석    |

#### 3. 검색 및 제어

도구 모음 오른쪽:

- **검색 필드** - 모든 탭에서 이벤트 필터링
- **지우기 메뉴** - 다양한 데이터 타입을 지우는 옵션

------

## 📊 Dashboard 탭

**Dashboard**는 전체 이벤트 시스템의 상태와 활동에 대한 고수준 개요를 제공합니다.

![Dashboard Tab - Running State](/img/game-event-system/tools/runtime-monitor/monitor-dashboard.png)

### 메트릭 카드

상단에 네 개의 메트릭 카드가 주요 통계를 표시합니다:

#### 📊 Total Events

- **표시 내용**: 게임의 고유 이벤트 수
- **포함**: 모든 활성 데이터베이스의 모든 이벤트
- **사용 사례**: 이벤트 시스템의 규모 이해

#### 📝 Total Logs

- **표시 내용**: 기록된 이벤트 실행 수
- **업데이트**: 이벤트가 발동될 때 실시간으로
- **사용 사례**: 전체 시스템 활동 추적

#### ⚡ Monitored

- **표시 내용**: 성능 데이터가 있는 이벤트 수
- **기준**: 트리거된 이벤트만
- **사용 사례**: 프로파일링 정보가 있는 이벤트 확인

#### ⚠ Warnings

- **표시 내용**: 활성 성능 경고 수
- **색상**: 경고가 있으면 빨간색
- **사용 사례**: 빠른 문제 감지

### Active Databases 섹션

현재 로드된 모든 Game Event 데이터베이스를 표시합니다:
```tex
📁 Active Databases (2)
├─ CoreEvents          [42 Events]  [PRIMARY]
└─ UIEvents            [18 Events]
```

**표시되는 정보:**

- 데이터베이스 이름 및 에셋 참조
- 데이터베이스당 총 이벤트 수
- 메인 데이터베이스의 **PRIMARY** 배지
- 데이터베이스 이름을 클릭하여 프로젝트 창에서 선택

### Performance Overview

이벤트 실행 상태의 시각적 표현:

**성능 레벨:**

- **✓ Good** (녹색) - 실행 시간 < 1ms
- **⚠ Warning** (노란색) - 실행 시간 1-10ms
- **❌ Critical** (빨간색) - 실행 시간 > 10ms

**시각적 분석:**

- 분포를 보여주는 색상별 막대
- 각 카테고리의 이벤트 백분율
- 모든 이벤트의 평균 실행 시간
- "View All →" 클릭하여 Performance 탭으로 이동

:::tip 성능 목표

원활한 게임플레이를 위해 이벤트의 90% 이상을 "Good" 카테고리에 유지하는 것을 목표로 하세요. "Critical"에 있는 이벤트는 즉시 최적화해야 합니다.

:::

### Recent Activity

발동된 마지막 15개 이벤트를 표시합니다:

**각 항목 표시:**

- **[타임스탬프]** - 이벤트가 발동된 시간(HH:MM:SS.mmm)
- **이벤트 이름** - 트리거된 이벤트
- **이벤트 타입** - 제네릭 타입(예: `GameEvent<int>`)

**빠른 작업:**

- 항목을 클릭하여 전체 세부정보 보기
- 플레이 모드 중 항목이 실시간으로 업데이트됨
- "View All →" 클릭하여 완전한 기록 보기

### Quick Warnings

활성 경고가 있으면 하단에 표시됩니다:

**경고 타입:**

- 🔥 **Performance** - 이벤트 실행이 너무 느림
- ⚠️ **High Frequency** - 이벤트가 너무 자주 발동됨
- 💾 **Memory** - 잠재적 메모리 문제
- 🔄 **Recursive** - 무한 루프 가능성

**각 경고:**

- 심각도 표시기(색상별)
- 문제에 대한 명확한 설명
- 영향받는 이벤트 수
- "View All →" 클릭하여 전체 목록 보기

------

## ⚡ Performance 탭

트리거된 모든 이벤트에 대한 상세한 성능 프로파일링.

![Performance Tab - Running State](/img/game-event-system/tools/runtime-monitor/monitor-performance.png)

### 정렬 제어

탭 상단에서 성능 데이터를 정렬할 수 있습니다:

**정렬 옵션:**

- **Avg Time** ⬇️ - 평균 실행 시간(기본값, 내림차순)
- **Max Time** - 최대 기록 실행 시간
- **Exec Count** - 실행 횟수
- **Listeners** - 평균 리스너 수

**정렬 방향:**

- ⬇️ 내림차순(높은 것에서 낮은 것으로)
- ⬆️ 오름차순(낮은 것에서 높은 것으로)
- 같은 버튼을 다시 클릭하여 방향 전환

### Performance 표

각 행은 단일 이벤트에 대한 포괄적인 메트릭을 표시합니다:

| 열              | 설명                      | 색상 코딩                              |
| --------------- | ------------------------- | -------------------------------------- |
| **Icon**        | 성능 레벨 표시기          | 🟢 Good / 🟡 Warning / 🔴 Critical        |
| **Event Name**  | 이벤트의 전체 이름        | 파란색(클릭 가능)                      |
| **Avg Time**    | 평균 실행 지속 시간       | 녹색 < 1ms, 노란색 1-10ms, 빨간색 > 10ms |
| **Min Time**    | 기록된 가장 빠른 실행     | 회색                                   |
| **Max Time**    | 기록된 가장 느린 실행     | > 10ms이면 빨간색                      |
| **Count**       | 총 실행 횟수              | 흰색                                   |
| **Listeners**   | 평균 리스너 수            | 흰색                                   |
| **GC**          | 가비지 컬렉션 할당        | > 0이면 빨간색, 0이면 회색             |
| **👂**          | 리스너 보기 버튼          | Listeners 탭 열기                      |

### 성능 데이터 읽기

**예시 행:**
```tex
🟢 PlayerHealthChanged  1.2ms  0.8ms  3.5ms  Count: 156  Listeners: 4  GC: 0  [👂]
```

**해석:**

- ✅ 이벤트가 잘 작동하고 있음(녹색 아이콘)
- 평균 1.2ms에 실행(허용 가능)
- 가장 빠른 실행은 0.8ms
- 가장 느린 실행은 3.5ms
- 156회 트리거됨
- 4개의 활성 리스너 보유
- GC 할당 없음(훌륭함!)

:::warning 성능 경고 신호

- **Avg Time > 5ms**: 최적화가 필요함
- **Max Time > 16ms**: 프레임 드롭을 유발할 것임
- **GC > 0**: 가비지 생성, 할당을 피하도록 리팩토링
- **높은 Listener Count**: 리스너 통합 고려

:::

### 빠른 작업

- **👂 버튼**: 이 특정 이벤트에 대한 Listeners 탭으로 이동
- **행 클릭**: Details 탭에서 볼 이벤트 선택
- **검색**: 이름으로 이벤트를 실시간 필터링

------

## 📝 Recent Events 탭

모든 이벤트 실행의 완전한 시간순 로그.

![Recent Events Tab - Running State](/img/game-event-system/tools/runtime-monitor/monitor-recent.png)

### 제어 옵션

탭 상단:

**토글 옵션:**

- ☑️ **Auto Scroll** - 최신 이벤트로 자동 스크롤
- ☐ **Show Stack Trace** - 각 이벤트에 대한 호출 스택 표시

**상태 표시기:**

- "Showing X of Y" - 표시되는 이벤트 수

**작업:**

- **🗑 Clear Logs** - 모든 로그된 이벤트 제거

### 로그 항목 형식

각 로그 항목은 다음을 표시합니다:
```tex
[14:23:45.123]  F:1250  PlayerTakeDamage  <GameEvent<GameObject, DamageInfo>>  [Details]
  📍 Called by: EnemyController.Attack()
```

**항목 구성요소:**

- **[타임스탬프]** - 정확한 실행 시간(HH:MM:SS.mmm)
- **F:####** - 이벤트가 발동된 프레임 번호
- **이벤트 이름** - 트리거된 이벤트의 이름
- **[타입]** - 제네릭 타입 시그니처
- **[Details]** - 전체 정보를 보는 버튼
- **📍 Caller Info** - 이벤트를 발동시킨 메서드

### Stack Trace 보기

**Show Stack Trace**가 활성화되면 각 항목이 확장되어 다음을 표시합니다:
```tex
at GameEventSystem.GameEvent.Raise()
at PlayerController.TakeDamage(float amount) in Assets/Scripts/Player.cs:line 45
at EnemyController.Attack() in Assets/Scripts/Enemy.cs:line 89
...
```

**사용 사례:**

- 이벤트가 트리거되는 위치 추적
- 예상치 못한 이벤트 호출 디버그
- 실행 흐름 이해
- 호출 코드의 성능 병목 현상 식별

### 검색 및 필터

검색 상자를 사용하여 다음을 기준으로 로그를 필터링합니다:

- 이벤트 이름(예: "Player")
- 이벤트 타입(예: "GameObject")
- 부분 일치 작동

:::tip 디버깅 워크플로우

1. **Auto Scroll**을 활성화하여 이벤트가 발생하는 것을 확인
2. 문제를 발견하면 자동 스크롤을 비활성화
3. **Show Stack Trace**를 활성화하여 호출 계층 구조 확인
4. **Details**를 클릭하여 전체 이벤트 정보 보기
5. 이 데이터를 사용하여 문제를 추적하고 수정

:::

------

## 📈 Statistics 탭

시간에 따른 이벤트 사용 패턴과 빈도를 분석합니다.

![Statistics Tab - Running State](/img/game-event-system/tools/runtime-monitor/monitor-statistics.png)

### 정렬 제어

다양한 메트릭으로 통계를 정렬합니다:

**정렬 옵션:**

- **Count** ⬇️ - 총 트리거 수(기본값)
- **Frequency** - 초당 트리거
- **Last Trigger** - 가장 최근에 발동된 이벤트

### Statistics 표

각 행은 사용 메트릭을 표시합니다:

| 열               | 설명                | 해석                  |
| ---------------- | ------------------- | --------------------- |
| **Event Name**   | 이벤트 이름         | 파란색, 클릭 가능     |
| **Count**        | 총 실행 횟수        | 녹색, 높을수록 많이 사용 |
| **Freq/sec**     | 초당 트리거         | > 60/초이면 빨간색    |
| **Avg Interval** | 트리거 간 평균 시간 | 초 단위               |
| **Last Trigger** | 마지막 실행 이후 시간 | 상대 시간           |
| **View Logs**    | 이 이벤트의 모든 로그 보기 | Details 탭 열기  |

### 빈도 데이터 이해

**예시 행:**
```tex
PlayerMoved  Count: 2,450  Freq/sec: 30.2/s  Avg Interval: 0.033s  Last Trigger: 2s ago  [View Logs]
```

**분석:**

- 이벤트가 총 2,450회 발동됨
- 초당 약 30회 트리거(30 FPS에서 매 프레임)
- 트리거 간 평균 0.033초
- 2초 전에 마지막으로 발동됨

**빈도 해석:**

- **< 1/초**: 드문 이벤트(보스 생성, 레벨 전환)
- **1-10/초**: 정기적인 이벤트(능력 쿨다운, 픽업)
- **10-60/초**: 고빈도(이동, 입력 폴링)
- **> 60/초**: ⚠️ 매우 높음, 최적화 필요할 수 있음

:::warning 고빈도 경고

60/초 이상으로 발동되는 이벤트는 **빨간색**으로 표시됩니다. 이것이 항상 문제는 아니지만 다음을 나타낼 수 있습니다:

- 중복 이벤트 발동
- FixedUpdate()에 있어야 하는데 Update()에 있는 이벤트
- 일괄 처리할 수 있는 불필요한 이벤트 트래픽

:::

### 사용 사례

**사용되지 않는 이벤트 식별:**

- **Count**를 오름차순으로 정렬
- 낮은 카운트를 가진 이벤트는 죽은 코드일 수 있음

**성능 핫스팟 찾기:**

- **Frequency**를 내림차순으로 정렬
- 고빈도 이벤트는 높은 최적화가 필요함

**이벤트 타이밍 디버그:**

- **Avg Interval**을 확인하여 이벤트 패턴 이해
- 불규칙한 간격은 버그를 나타낼 수 있음

**최근 활동 추적:**

- **Last Trigger**를 내림차순으로 정렬
- 현재 활성화된 이벤트 확인

------

## ⚠️ Warnings 탭

성능 문제 및 잠재적 문제의 자동 감지.

![Warnings Tab - Running State](/img/game-event-system/tools/runtime-monitor/monitor-warnings.png)

### 경고 카테고리

시스템은 여러 유형의 문제를 자동으로 감지합니다:

#### 🔥 성능 문제

**느린 실행:**
```tex
❌ CRITICAL
Slow Event Execution
이벤트 실행이 너무 오래 걸립니다 (평균 > 10ms)
Affected Events (3): PlayerUpdate, EnemyAI, PhysicsSync
```

**감지 기준:**

- 평균 실행 시간 > 10ms
- 최대 실행 시간 > 16ms(60 FPS에서 1프레임)

**영향:** 프레임 드롭과 끊김 현상 유발 가능

**해결책:** 리스너 코드 최적화, 무거운 작업을 코루틴으로 이동

#### ⚡ 고빈도 경고

**과도한 트리거:**
```tex
⚠️ WARNING  
High Frequency Events
이벤트가 초당 60회 이상 발동되고 있습니다
Affected Events (2): OnMouseMove, OnColliderCheck
```

**감지 기준:**

- 초당 트리거 > 60

**영향:** CPU 오버헤드, 불필요한 작업 가능성

**해결책:** 업데이트 일괄 처리, 스로틀링 사용, 대체 패턴 고려

#### 💾 메모리 경고

**GC 할당:**
```tex
⚠️ WARNING
Garbage Collection Detected
이벤트가 실행 중 GC 할당을 발생시키고 있습니다
Affected Events (5): SpawnParticle, CreateUI, LoadAsset
```

**감지 기준:**

- 실행당 GC 할당 > 0

**영향:** 가비지 컬렉션 일시 정지, 프레임 드롭

**해결책:** 오브젝트 풀링 사용, 핫 패스에서 새 객체 생성 피하기

#### 🔄 재귀 호출 감지

**잠재적 무한 루프:**
```tex
❌ CRITICAL
Possible Recursive Event
이벤트가 자신을 트리거하여 루프를 생성할 수 있습니다
Affected Events (1): OnValueChanged
```

**감지 기준:**

- 자신의 리스너 내에서 이벤트 발동
- 스택 추적에 재귀 표시

**영향:** 스택 오버플로우, Unity 프리즈

**해결책:** 재귀 가드 추가, 이벤트 흐름 재설계

### 경고 카드 레이아웃

각 경고는 다음을 표시합니다:

**헤더:**

- 심각도를 나타내는 아이콘(🔥/⚠️/ℹ️)
- 경고 타입(예: "Slow Execution")
- 심각도 배지(CRITICAL / WARNING / INFO)

**본문:**

- 문제에 대한 명확한 설명
- 영향 설명
- 영향받는 이벤트 수

**이벤트 목록:**

- 최대 5개의 영향받는 이벤트 표시
- 각각 검사를 위한 **[View]** 버튼
- 5개 이상의 이벤트가 영향받으면 "...and X more"

### 심각도 레벨

| 레벨         | 색상     | 우선순위 | 필요한 조치         |
| ------------ | -------- | -------- | ------------------- |
| **CRITICAL** | 🔴 빨간색 | 즉시     | 출시 전 수정        |
| **WARNING**  | 🟡 노란색 | 중요     | 최적화해야 함       |
| **INFO**     | 🔵 파란색 | 선택     | 정보 제공용만       |

### 경고 없음 상태

모든 것이 잘 작동할 때:
```tex
✅ All Good!
성능 문제나 경고가 감지되지 않았습니다.
```

:::tip 모범 사례

개발 중 정기적으로 Warnings 탭을 확인하세요. 경고를 조기에 해결하면 성능 문제가 누적되어 나중에 수정하기 어려워지는 것을 방지할 수 있습니다.

:::

## 👂 Listeners 탭

모든 활성 이벤트 구독에 대한 포괄적인 개요.

![Listeners Tab - Running State](/img/game-event-system/tools/runtime-monitor/monitor-listeners.png)

### 리스너 카드

활성 리스너가 있는 각 이벤트는 확장 가능한 카드로 표시됩니다:

**카드 헤더:**
```tex
EventName  ⭐ (영구적인 경우)     Total: 12
```

- **Event Name**: 이벤트 이름(파란색, 굵게)
- **⭐ 아이콘**: 영구 이벤트에 표시(씬 로드에서 살아남음)
- **Total Count**: 모든 리스너 타입의 합계(녹색)

### 리스너 타입 분석

각 카드는 다양한 리스너 타입을 나타내는 6개의 블록을 표시합니다:

#### 시각적 레이아웃
```tex
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Basic(Insp) │ Basic(API)  │Priority(API)│ Cond(API)   │Persist(Insp)│Persist(API) │
│     3       │     2       │     4       │     1       │     0       │     2       │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 블록 타입

| 블록               | 설명                       | 소스               |
| ------------------ | -------------------------- | ------------------ |
| **Basic (Insp)**   | Inspector의 기본 리스너    | 🔵 파란색(Inspector) |
| **Basic (API)**    | 코드의 기본 리스너         | ⚫ 어두운색(API)    |
| **Priority (API)** | 코드의 우선순위 리스너     | ⚫ 어두운색(API)    |
| **Cond (API)**     | 코드의 조건부 리스너       | ⚫ 어두운색(API)    |
| **Persist (Insp)** | Inspector의 영구 리스너    | 🔵 파란색(Inspector) |
| **Persist (API)**  | 코드의 영구 리스너         | ⚫ 어두운색(API)    |

#### 색상 코딩

- **🔵 파란색 블록**: Unity Inspector에서 구성(GameEventManager)
- **⚫ 어두운 블록**: 코드를 통해 등록(`AddListener`, `AddPriorityListener` 등)
- **흐릿함/회색**: 이 타입의 리스너 없음(카운트 = 0)
- **흰색 숫자**: 활성 리스너 존재

### 데이터 이해하기

**예시 카드:**
```tex
PlayerHealthChanged     Total: 8

Basic(Insp): 2  Basic(API): 1  Priority(API): 3  Cond(API): 1  Persist(Insp): 0  Persist(API): 1
```

**해석:**

- 이 이벤트에 총 8개의 리스너가 구독됨
- GameEventManager에서 구성된 2개의 기본 리스너
- 코드를 통해 추가된 1개의 기본 리스너
- 3개의 우선순위 리스너(코드 기반, 커스텀 우선순위 포함)
- 1개의 조건부 리스너(코드 기반, 조건부로 실행)
- 1개의 영구 리스너(코드 기반, 씬 변경에서 살아남음)

### 특수 표시기

**영구 이벤트 카드:**

- 이름 옆에 **⭐ 별 아이콘** 있음
- 툴팁: "Persistent Event"
- `Basic (Insp)` 카운트가 0으로 표시됨
- 대신 `Persist (Insp)`가 Inspector 리스너 카운트를 표시

**선택된 이벤트:**

- 카드에 파란색 하이라이트 배경
- 이 이벤트가 상세 보기를 위해 선택되었음을 나타냄

### 사용 사례

**구독 문제 디버깅:**

- 리스너가 제대로 등록되었는지 확인
- 리스너가 올바르게 제거되는지 확인
- 잊어버린 구독으로 인한 메모리 누수 식별

**아키텍처 분석:**

- Inspector 및 코드 기반 리스너 간의 균형 확인
- 최적화가 필요할 수 있는 많이 구독된 이벤트 식별
- 시스템 전체의 리스너 분포 이해

**성능 계획:**

- 높은 리스너 카운트는 이벤트당 더 많은 CPU 시간을 의미
- 여러 리스너를 하나로 통합하는 것 고려
- 모든 리스너가 필요한지 평가

:::tip 메모리 누수 감지

시간이 지남에 따라(특히 씬 전환 중) 리스너 카운트가 증가하면 메모리 누수가 있을 수 있습니다. 객체는 `OnDisable()` 또는 `OnDestroy()`에서 적절히 구독 해제해야 합니다.

:::

------

## 🔗 Automation 탭

트리거 및 체인 이벤트 흐름의 시각적 표현.

### 보기 모드

**토글 옵션:**

- ☑️ **Tree View** - 전체 계층 구조가 있는 루트 이벤트만 표시
- ☐ **Flat View** - 자동화가 있는 모든 이벤트를 계층 없이 표시

### Tree View (권장)

![Automation Tab - Full Tree](/img/game-event-system/tools/runtime-monitor/monitor-automation-tree.png)

루트 이벤트(다른 이벤트에 의해 트리거되지 않는 이벤트)부터 시작하는 자동화 흐름을 표시합니다:

**트리 구조**
```tex
▶ RootEvent                                      🎯 Source
  └─ 🕹️ ChildTrigger1                            
  └─ 🕹️ ChildTrigger2                            
  └─ 🔗 ChainNode1                                ⏱ 2s Wait
     └─ 🔗 ChainNode2                             ⏳ 1s Wait
        └─ 🔗 ChainNode3
```

### Flat View

![Automation Tab - Flat Tree](/img/game-event-system/tools/runtime-monitor/monitor-automation-flat.png)

자동화 흐름을 시간순 목록으로 표시하여 계층을 평평하게 만들어 이벤트를 선형으로 연결하여 표시합니다.

**평면 구조**
```tex
▶ RootEvent                                      🎯 Source
  └─ 🕹️ ChildTrigger1                            
        
▶ RootEvent                                      🎯 Source                       
  └─ 🕹️ ChildTrigger2                            

▶ RootEvent                                      🎯 Source                          
  └─ 🔗 ChainNode1                                ⏱ 2s Wait

▶ 🔗 ChainNode1                                      🎯 Source
  └─ 🔗 ChainNode2                                ⏳ 1s Wait                            

▶ 🔗 ChainNode2                                      🎯 Source
  └─ 🔗 ChainNode3                                
```

### 시각화 이해하기

#### 노드 타입

| 아이콘 | 타입    | 설명                                | 색상     |
| ------ | ------- | ----------------------------------- | -------- |
| **▶**  | Root    | 소스 이벤트(다른 것에 의해 트리거되지 않음) | 🔵 청록색 |
| **🕹️** | Trigger | 병렬 fan-out 노드                   | 🟢 녹색   |
| **🔗** | Chain   | 순차적 블로킹 노드                  | 🟠 주황색 |

#### 노드 정보

각 노드는 다음을 표시합니다:

**왼쪽:**

- 트리 연결선(└─)
- 타입 아이콘(▶/🕹️/🔗)
- 이벤트 이름(타입별 색상)
- 이벤트 GUID(흐릿함, 디버깅용)

**오른쪽 상태 아이콘:**

- **🎯 Source** - 이것은 루트 이벤트
- **🧩** - 조건 함수 있음
- **⏱ Xs Wait** - 실행 전 지연 있음
- **⏳ Xs Wait** - 실행 후 지속 시간 있음
- **⏩** - 비동기 완료 대기

### 플로우 패턴 읽기

#### 간단한 Fan-Out (트리거)
```tex
▶ ButtonClicked
  └─ 🕹️ PlaySound
  └─ 🕹️ ShowFeedback
  └─ 🕹️ LogAnalytics
```

**패턴**: 병렬 실행 **동작**: 버튼 클릭 시 세 이벤트가 동시에 발동 **사용 사례**: 독립적인 부작용

#### 순차 체인
```tex
▶ StartCutscene
  └─ 🔗 FadeOut        ⏱ 0s Wait  ⏳ 1s Wait
     └─ 🔗 LoadScene   ⏱ 0s Wait  ⏳ 2s Wait
        └─ 🔗 FadeIn   ⏱ 0.5s Wait
```

**패턴**: 지연이 있는 순차적 **동작**:

1. FadeOut 실행, 1초 대기
2. LoadScene 실행, 2초 대기
3. 0.5초 지연 후 FadeIn 실행

**사용 사례**: 컷씬, 튜토리얼, 로딩 시퀀스

#### 복잡한 하이브리드
```tex
▶ EnemyDefeated
  └─ 🕹️ StopMusic
  └─ 🕹️ PlayVictorySound
  └─ 🔗 ShowRewards     ⏱ 1s Wait
     └─ 🔗 SaveGame     
  └─ 🕹️ SpawnLoot       🧩
```

**패턴**: 병렬과 순차의 혼합 **동작**:

- 음악/사운드 효과가 즉시 발동(병렬)
- 1초 후 보상 표시, 그 다음 게임 저장(순차적)
- 전리품이 조건부로 생성(조건이 있는 병렬)

### 이벤트 플로우 분석

**실제 플로우 예시:**
```tex
▶ OnPlayerDeath
  └─ 🕹️ StopPlayerInput
  └─ 🕹️ DisablePlayerCollider
  └─ 🔗 PlayDeathAnimation    ⏳ 2s Wait
     └─ 🔗 ShowDeathUI         ⏱ 0.5s Wait  ⏳ 3s Wait
        └─ 🔗 RespawnPlayer    🧩
           └─ 🕹️ ResetPlayerState
           └─ 🕹️ UpdateCheckpoint
```

**플로우 분석:**

1. **즉시 작업** (트리거):
   - 플레이어 입력 중지
   - 충돌 비활성화
2. **죽음 애니메이션** (체인):
   - 애니메이션 재생
   - 애니메이션 완료를 위해 2초 대기
3. **UI 표시** (체인):
   - 0.5초 대기(전환 지연)
   - 죽음 화면 표시
   - 3초 대기(플레이어가 화면을 볼 수 있음)
4. **조건부 리스폰** (조건이 있는 체인 🧩):
   - 플레이어에게 남은 생명이 있는 경우에만
   - 체크포인트에서 플레이어 리스폰
5. **정리** (트리거):
   - 플레이어 스탯 재설정
   - 새 체크포인트 저장

### 상태 아이콘 참조

| 아이콘       | 의미        | 세부사항                                      |
| ------------ | ----------- | --------------------------------------------- |
| **🎯 Source** | 루트 이벤트 | 다른 이벤트에 의해 트리거되지 않음            |
| **🧩**        | 조건부      | 조건 확인이 있음(실행되지 않을 수 있음)       |
| **⏱ Xs**     | 시작 지연   | 실행하기 전에 X초 대기                        |
| **⏳ Xs**     | 지속 시간 대기 | 실행 후 X초 대기(체인 블록)                |
| **⏩**        | 비동기 대기 | 코루틴/비동기 완료 대기                       |

### 재귀 감지

이벤트가 자신을 트리거하는 경우(직접 또는 간접적으로) 무한 표시를 방지하기 위해 트리가 재귀 노드에서 중지됩니다:
```tex
▶ OnValueChanged
  └─ 🔗 UpdateValue
     └─ 🔗 OnValueChanged  ⚠️ (Recursive - stopped)
```

:::warning 재귀 경고

재귀 이벤트 흐름은 **Warnings** 탭에 잠재적 무한 루프로 표시됩니다. 실제 재귀를 방지하기 위해 코드에서 항상 가드를 사용하세요.

:::

------

## 🔍 Details 탭

개별 이벤트 정보 및 실행 기록에 대한 심층 분석.

![Details Tab - Log View](/img/game-event-system/tools/runtime-monitor/monitor-details-log.png)

### 탐색

Details 탭은 다음 경우에 자동으로 열립니다:

- Recent Events에서 **[Details]** 버튼 클릭
- Statistics에서 **[View Logs]** 버튼 클릭
- Warnings에서 **[View]** 버튼 클릭

상단:

- **← Back to [Previous Tab]** - 이전 위치로 돌아가기

### 로그 세부정보 보기

특정 로그 항목을 볼 때:

**이벤트 정보 카드:**

| 필드           | 설명                                    |
| -------------- | --------------------------------------- |
| **Event Name** | 이벤트의 전체 이름                      |
| **Event Type** | 제네릭 타입(예: `GameEvent<float>`)     |
| **Time**       | 정확한 타임스탬프(HH:MM:SS.mmm)         |
| **Frame**      | 실행된 프레임 번호                      |
| **Arguments**  | 전달된 인수 값                          |
| **Called By**  | 이벤트를 발동시킨 메서드                |

**Stack Trace 섹션:**
```tex
Stack Trace:
at TinyGiants.GameEventSystem.Runtime.GameEvent`1.Raise(T argument)
at PlayerController.TakeDamage(Int32 damage) in Assets/Scripts/PlayerController.cs:line 142
at EnemyController.Attack() in Assets/Scripts/EnemyController.cs:line 89
at EnemyController.Update() in Assets/Scripts/EnemyController.cs:line 52
...
```

**사용 사례:**

- 이벤트가 발생하는 위치 추적
- 예상치 못한 이벤트 호출 디버그
- 호출 체인 이해
- 성능 병목 현상 식별

### 이벤트 통계 보기

![Details Tab - Statistics View](/img/game-event-system/tools/runtime-monitor/monitor-details-stats.png)

특정 이벤트의 모든 로그를 볼 때:

**헤더:**
```tex
Event: PlayerHealthChanged     Total: 245 triggers
```

**사용 통계 카드:**

| 메트릭            | 설명                       |
| ----------------- | -------------------------- |
| **Trigger Count** | 총 실행 횟수               |
| **Frequency**     | 초당 트리거                |
| **Avg Interval**  | 트리거 간 시간             |
| **Last Trigger**  | 마지막 실행 이후 상대 시간 |

**성능 메트릭 카드** (사용 가능한 경우):

| 메트릭       | 설명               | 색상             |
| ------------ | ------------------ | ---------------- |
| **Avg Time** | 평균 실행 지속 시간 | 녹색/노란색/빨간색 |
| **Max Time** | 가장 느린 실행     | 흰색             |
| **Min Time** | 가장 빠른 실행     | 회색             |
| **GC Alloc** | 가비지 컬렉션      | > 0이면 빨간색   |

**Recent Logs:**

이 이벤트의 마지막 50개 실행을 역시간순으로 표시합니다:
```tex
[14:52:33.145]  F:3201  PlayerHealthChanged  <GameEvent<float>>  [Details]
  📍 Called by: DamageSystem.ApplyDamage()

[14:52:31.089]  F:3180  PlayerHealthChanged  <GameEvent<float>>  [Details]
  📍 Called by: HealthRegen.Tick()

...
```

### 사용 사례

**이벤트 문제 디버깅:**

1. Recent Events 탭으로 이동
2. 문제가 있는 이벤트 실행 찾기
3. **[Details]** 클릭하여 스택 추적 보기
4. 호출 코드 식별
5. 문제 수정

**성능 분석:**

1. Statistics 탭으로 이동
2. 느린 이벤트에서 **[View Logs]** 클릭
3. 성능 메트릭 검토
4. 실행 패턴 확인
5. 데이터 기반 최적화

**이벤트 플로우 이해:**

1. 이벤트 체인 트리거
2. 각 이벤트에 대한 로그 보기
3. 실행 순서 확인
4. 이벤트 간 타이밍 확인
5. 동작 검증

------

## 🛠️ 고급 기능

### 디버거 제어

**디버거 토글 버튼**(헤더에 있음):

- **● Debugger ON** (녹색) - 모든 이벤트 데이터를 적극 기록 중
- **○ Debugger OFF** (빨간색) - 기록 안 함(성능 절약)

**비활성화 시기:**

- 성능이 중요한 게임플레이 테스트 중
- 게임플레이 영상 녹화 시
- 에디터 오버헤드를 줄이기 위해
- 모니터링이 필요하지 않을 때

:::info 성능 영향

디버거는 최소한의 오버헤드(이벤트당 약 0.1-0.5ms)를 가지고 있지만, 최종 성능 테스트 중에 비활성화하면 가장 정확한 메트릭을 얻을 수 있습니다.

:::

### 데이터 지우기 옵션

**🗑 Clear** 버튼을 클릭하여 옵션에 액세스:

**지우기 메뉴:**

- **Clear Logs Only** - 이벤트 실행 기록 제거
- **Clear Statistics Only** - 트리거 카운트 및 빈도 데이터 재설정
- **Clear Performance Data** - 실행 시간 측정 재설정
- **Clear All Data** - 완전한 재설정(확인 필요)