---
sidebar_label: '14 런타임 모니터'
sidebar_position: 15
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 14 런타임 모니터: 프로덕션 관측성(Observability)

<!-- <VideoGif src="/video/game-event-system/14-runtime-monitor.mp4" /> -->

## 📋 개요 (Overview)

실제 프로덕션 환경에서 이벤트는 초당 수천 번씩 발생할 수 있습니다. `Debug.Log()`는 가비지(Garbage)를 생성하고 콘솔을 어지럽힐 뿐만 아니라, 시스템 건전성에 대한 구조적인 통찰력을 제공하지 못합니다. 따라서 실시간 성능 프로파일링, 리스너 추적, 빈도 분석 및 무결성 경고를 포함한 **엔터프라이즈급 관측성(Observability)**이 필요합니다.

**게임 이벤트 모니터(Game Event Monitor)**는 다음과 같은 중요한 질문에 답을 주는 전문 디버깅 윈도우입니다:
- *"프레임 드랍을 유발하는 이벤트는 무엇인가?"*
- *"이 이벤트가 너무 자주 발생하고 있지는 않은가?"*
- *"현재 이 이벤트를 실제로 듣고 있는 리스너는 누구인가?"*
- *"체인 시퀀스가 중단된 이유는 무엇인가?"*

이 데모는 4개의 특수 테스트 유닛이 포함된 **고부하 스트레스 테스트 시설**을 시뮬레이션하며, 각 유닛은 모니터의 특정 탭에 진단 데이터를 채우도록 설계되었습니다.

:::tip 💡 학습 내용
- 런타임 모니터 윈도우를 열고 탐색하는 방법
- 성능 지표(평균/최소/최대 실행 시간) 읽기
- 이벤트 빈도 분석 및 스팸(Spam) 감지
- 리스너 수 조사 (인스펙터 바인딩 vs API 바인딩)
- 프로그래밍 방식의 플로우 그래프 시각화
- 무결성 문제 감지 (고스트 이벤트, 끊어진 체인)
- 경고 및 건전성 지표 해석 방법

:::

---

## 🎬 데모 씬 (Demo Scene)
```
Assets/TinyGiants/GameEventSystem/Demo/14_RuntimeMonitor/14_RuntimeMonitor.unity
```

### 씬 구성

**시각적 요소:**
- 🎯 **Test Console** - 4개의 테스트 유닛을 설명하는 정보 패널
- 🧊 **단순 지형** - Plane 및 Cube (최소한의 씬 구성)

**UI 레이어 (Canvas):**
- 🎮 **4개의 제어 버튼** - 화면 하단
  - "Toggle Spammer (Unit A)" → 고빈도 스팸 시작/중지
  - "Trigger Heavy Load (Unit B)" → 무거운(부하가 큰) 연산 실행
  - "Fire Chain Reaction (Unit C)" → 프로그래밍 방식의 체인 실행
  - "Fire Ghost Event (Unit D)" → 리스너가 없는 이벤트 발생

**게임 로직 레이어:**
- 📤 **RuntimeMonitorRaiser** - 테스트 오케스트레이터(조정자)
- 📥 **RuntimeMonitorReceiver** - 계측된 리스너를 통한 테스트 응답자

---

## 🧪 4가지 테스트 유닛

각 유닛은 모니터의 특정 하위 시스템을 테스트하도록 설계되었습니다:

### 유닛 A: 스패머 (빈도 테스트)

**목적:** Statistics(통계) 탭 테스트를 위해 고빈도 이벤트 스팸 생성

**구성:**
- **이벤트:** `OnSpammer` (void), `OnSpammerPersistent` (void)
- **동작:** 활성화된 동안 `Update()`에서 **초당 60회 이상** 발생
- **모니터 목표:** 고빈도 경고(High Frequency Warning) 감지

**예상 결과:**
- 📈 **Statistics 탭:** 초당 60회 이상 발생 표시 (빨간색 경고)
- ⚠️ **Warnings 탭:** `[High Frequency]` 문제 플래그 표시

---

### 유닛 B: 헤비 리프터 (성능 테스트)

**목적:** Performance(성능) 탭 테스트를 위해 부하가 큰 계산 시뮬레이션

**구성:**
- **이벤트:** `OnHeavyLoad`, `OnHeavyLoadCondition` (GameObject, DamageInfo)
- **동작:** 리스너가 `Thread.Sleep(6)`을 호출하여 6ms 이상의 지연 시뮬레이션
- **모니터 목표:** 성능 경고(Performance Warning) 트리거

**예상 결과:**
- ⚡ **Performance 탭:** 실행 시간이 6-12ms로 표시됨 (노란색/빨간색)
- 📊 **Dashboard:** 성능 바가 노란색/빨간색으로 변함

**코드 메커니즘:**
```csharp
public void OnHeavyExecution(GameObject sender, DamageInfo info)
{
    // 무거운 계산 시뮬레이션 (프로덕션에서는 금지되지만 테스트용으로는 완벽합니다!)
    Thread.Sleep(6);  // ← 6ms 실행 시간을 강제함
}
```

---

### 유닛 C: 체인 리액터 (자동화 테스트)

**목적:** 프로그래밍 방식의 플로우 그래프 시각화 시연

**구성:**
- **이벤트:** `OnChainStart` → `OnChainProcess` → `OnChainFinish` → `OnTriggerComplete`
- **동작:** 지연 및 조건이 포함된 코드 기반의 순차 파이프라인
- **모니터 목표:** Automation(자동화) 탭에서 동적 자동화 시각화

**그래프 구조:**
```
🚀 [ 시작 ] OnChainStart (DamageInfo)
│   ➔ 페이로드: { amount: 75.0, type: Physical, ... }
│
├─ ⏱️ [ 1단계 ] ➔ 지연: 0.5초
│  └─► ⚙️ OnChainProcess (DamageInfo)      ✅ 데이터 전달됨
│
├─ ⚖️ [ 2단계 ] ➔ 지연: 0.2초 | 가드: `amount > 50`
│  └─► 🎯 OnChainFinish (DamageInfo)       ✅ 로직 통과 (75 > 50)
│
└─ 🧹 [ 3단계 ] ➔ 트리거 모드 | 인자 차단
   └─► 🏁 OnTriggerComplete (void)        ✅ 신호 정제됨
│
📊 결과: 파이프라인 완료 | 🛡️ 데이터 안전: 종료 지점에서 인자 차단됨
```

**예상 결과:**
- 🔗 **Automation 탭:** 타이밍/조건 배지가 포함된 계층형 트리 표시
- 📝 **Recent Events 탭:** 순차적인 발생 패턴 확인 가능

---

### 유닛 D: 고스트 (무결성 테스트)

**목적:** 리스너 없이 발생한 이벤트 감지

**구성:**
- **이벤트:** `OnGhost` (void)
- **동작:** 바인딩된 **리스너가 0개**인 상태에서 이벤트 발생
- **모니터 목표:** 무결성 경고(Integrity Warning) 트리거

**예상 결과:**
- ⚠️ **Warnings 탭:** `[No Listeners]` 경고 표시
- 📊 **Dashboard:** 경고 수 증가

---

## 🎮 테스트 방법 (단계별 가이드)

### 1단계: 준비

**모니터 윈도우 열기**
- **메뉴**

  이 유틸리티는 **[Game Event System](../visual-workflow/game-event-system)** 내에 위치하며 다음 방법으로 접근할 수 있습니다:

  **시스템 대시보드에서:**

  ```tex
  Game Event System Window → "Game Event Monitor" 클릭
  ```

- **윈도우 표시** 

  다른 Unity 에디터 윈도우처럼 원하는 위치에 도킹할 수 있습니다.

**플레이 모드 진입**
- Unity의 Play 버튼을 누릅니다.
- 플레이 중에도 모니터는 계속 표시됩니다.

---

### 2단계: 테스트 데이터 생성

**유닛 A (Spammer) 활성화**
- **"Toggle Spammer (Unit A)"** 버튼 클릭
- **관찰:** 버튼이 활성화 상태(ON)로 유지됨
- **효과:** `OnSpammer`가 초당 60회 이상 발생함

**유닛 B (Heavy Load) 활성화**
- **"Trigger Heavy Load (Unit B)"** 버튼을 **3-5회** 클릭
- **효과:** 클릭할 때마다 하나의 무거운 연산(6ms 지연)이 트리거됨

**유닛 C (Chain Reaction) 활성화**
- **"Fire Chain Reaction (Unit C)"** 버튼을 **한 번** 클릭
- **효과:** 4단계 순차 파이프라인 시작

**유닛 D (Ghost Event) 활성화**
- **"Fire Ghost Event (Unit D)"** 버튼을 **한 번** 클릭
- **효과:** 리스너가 없는 이벤트를 발생시킴 (무결성 위반)

:::tip ⏱️ 대기 시간

모든 유닛을 트리거한 후, 모니터 탭에 데이터가 쌓이도록 **5-10초** 정도 기다린 후 분석을 시작하세요.

:::

---

## 📊 모니터 윈도우 분석

### 탭 1: 🏠 Dashboard (시스템 건전성 개요)

첫 페이지로, 모든 하위 시스템의 지표를 하나의 건전성 보고서로 집계합니다.

![Monitor Dashboard](/img/game-event-system/examples/14-runtime-monitor/demo-14-dashboard.png)

**지표 카드 (상단):**

| 카드 | 의미 | 예상 값 |
| ---------------- | --------------------------------------- | ----------------- |
| **Total Events** | 로드된 이벤트 총수 | 9 |
| **Total Logs** | 플레이 시작 후 누적 발생 횟수 | 500+ (증가 중) |
| **Monitored** | 성능 추적 중인 활성 이벤트 수 | 4-6 |
| **Warnings** | 현재 발견된 문제 수 | 2+ (Spam + Ghost) |

**활성 데이터베이스 섹션:**
- 로드된 모든 데이터베이스 에셋 목록
- **PRIMARY** 배지는 메인 데이터베이스를 나타냄
- 데이터베이스 이름을 클릭하여 뷰 필터링 가능

**성능 개요 (신호등 바):**
- 🟢 **초록색:** 모든 이벤트 실행 시간 &lt;1ms (건강)
- 🟡 **노란색:** 일부 이벤트 1-5ms (주의)
- 🔴 **빨간색:** 5ms 초과 이벤트 감지됨 (심각)
- 퍼센트 분포 표시

**최근 활동 (미니 로그):**
- 마지막 15개 이벤트 발생 내역
- 형식: `[프레임] 이벤트이름 (인자)`
- 클릭 시 Details 탭으로 이동

**빠른 경고 (상위 3개):**
- 가장 심각한 알림 노출
- 심각도 아이콘: 🔵 정보, 🟡 경고, 🔴 치명적
- 클릭 시 Warnings 탭으로 이동

:::note 🎯 대시보드 목적

자동차의 계기판처럼 시스템 건전성을 한눈에 확인하는 용도입니다. 여기서 빨간색이나 노란색이 보이면 진단을 위해 특정 탭으로 들어가야 합니다.

:::

---

### 탭 2: ⚡ Performance (실행 프로파일링)

**중점:** 실행 시간을 통해 성능 병목 지점 감지

![Monitor Performance](/img/game-event-system/examples/14-runtime-monitor/demo-14-performance.png)

**컬럼 설명:**

| 컬럼 | 의미 | 정상 범위 |
| -------------- | --------------------------- | ----------------- |
| **Event Name** | 이벤트 식별자 | - |
| **Avg Time** | 평균 실행 시간(ms) | &lt;1ms 🟢 |
| **Min Time** | 가장 빠른 실행 시간 | - |
| **Max Time** | 가장 느린 실행 시간 | &lt;5ms 🟡, >5ms 🔴 |
| **Listeners** | 발생당 평균 리스너 수 | - |
| **GC Alloc** | 발생당 생성된 가비지 메모리 | 0 KB 이상적 |

**색상 코드:**
- 🟢 **초록색:** 0-1ms (우수)
- 🟡 **노란색:** 1-5ms (모니터링 필요)
- 🔴 **빨간색:** >5ms (조사 필요)

**테스트 결과 (유닛 B):**
1. 테이블에서 `OnHeavyLoad` 이벤트 찾기
2. **Avg Time:** 약 6.00ms 표시 (🟡 노란색)
3. **Max Time:** 여러 번 클릭 시 약 12.00ms까지 표시될 수 있음 (🔴 빨간색)
4. **원인:** 리스너 코드에 포함된 `Thread.Sleep(6)`

**활용 방법:**
- "Avg Time"으로 정렬하여 최악의 성능을 내는 이벤트 찾기
- 이벤트 이름을 클릭하여 Details 탭 확인
- 리스너 수 비교—리스너가 많을수록 성능 리스크가 높음

:::warning ⚠️ 성능 예산 (Performance Budget)

일반적인 규칙: 평균 실행 시간을 1ms 미만으로 유지하세요. 전체 프레임 시간(60fps 기준 16ms)을 모든 시스템에 골고루 배분해야 합니다.

:::

---

### 탭 3: 📝 Recent Events (실시간 이벤트 로그)

**중점:** 모든 이벤트 발생의 시간순 스트림

![Monitor Recent](/img/game-event-system/examples/14-runtime-monitor/demo-14-recent.png)

**컬럼 설명:**

| 컬럼 | 의미 | 예시 |
| ------------- | ----------------------------- | --------------------------------------- |
| **Frame** | Unity 프레임 번호 | `F:1450` |
| **Time** | 플레이 시작 후 경과 시간 | `12.45s` |
| **Event** | 이벤트 이름 | `OnHeavyLoad` |
| **Arguments** | 페이로드 미리보기 | `<DamageInfo: 100>` |
| **Caller** | `.Raise()`를 호출한 메서드 | `RuntimeMonitorRaiser.TriggerHeavyLoad` |

**주요 기능:**
- 🔍 **검색:** 이벤트 이름으로 필터링
- 📋 **스택 트레이스:** 전체 호출 스택을 확인하도록 토글 가능
- 🔗 **상세 링크:** 이벤트를 클릭하여 심층 분석(Details) 확인

**테스트 결과 (전체 유닛):**
- **유닛 A:** `OnSpammer` 항목이 급격하게 연속적으로 기록됨 (초당 60회 이상)
- **유닛 C:** 순차적 패턴: `OnChainStart` → (지연) → `OnChainProcess` → `OnChainFinish` → `OnTriggerComplete`
- **유닛 D:** 단일 `OnGhost` 항목 기록됨

**활용 방법:**
- 이벤트 발생 순서 확인 (병렬 vs 순차)
- 예상치 못한 이벤트 트리거 디버깅
- 호출자(Caller) 메서드 조사 (누가 이 이벤트를 발생시키는가?)

:::tip 🎯 프로 팁

Unity 콘솔과 달리 이 로그는 **이벤트에 특화**되어 있습니다. 다른 Debug.Log의 소음이 없고, 구조화된 데이터 미리보기와 직접적인 호출자 정보를 제공합니다.

:::

---

### 탭 4: 📈 Statistics (빈도 분석)

**중점:** 장기적인 사용 패턴 및 발생 빈도 추적

![Monitor Statistics](/img/game-event-system/examples/14-runtime-monitor/demo-14-statistics.png)

**컬럼 설명:**

| 컬럼 | 의미 | 정상 범위 |
| ----------------- | ---------------------------- | ------------------------ |
| **Event Name** | 이벤트 식별자 | - |
| **Trigger Count** | 플레이 시작 후 총 발생 횟수 | - |
| **Freq/sec** | 초당 발생 횟수 | &lt;10 🟢, 10-30 🟡, >30 🔴 |
| **Avg Interval** | 발생 간 평균 간격(ms) | 100ms 이상 이상적 |
| **Last Trigger** | 마지막 발생 후 경과 시간 | - |

**테스트 결과 (유닛 A):**
1. `OnSpammer` 이벤트 찾기
2. **Trigger Count:** 빠르게 상승 (10초 후 1000회 이상)
3. **Freq/sec:** **>60/s** 표시 (🔴 빨간색 경고)
4. **Avg Interval:** **약 16ms** 표시 (60fps 기준 매 프레임 발생)

**경고 임계값:**
- 🟡 **노란색:** 초당 10-30회 발생
- 🔴 **빨간색:** 초당 30회 초과 발생 (잠재적 성능 문제)

**활용 방법:**
- 이벤트 스팸 식별 (너무 잦은 호출)
- 유휴 이벤트 감지 (한 번도 발생하지 않음)
- 시간에 따른 발생 패턴 분석

:::warning 🚨 빈도 관련 레드 플래그
- **>60/sec:** 매 프레임 발생 중일 확률이 높음—배칭(Batching) 고려 필요
- **불규칙한 스파이크:** 로직 버그의 징후일 수 있음
- **빈도 0:** 죽은 코드이거나 잘못 구성된 이벤트

:::

---

### 탭 5: ⚠️ Warnings (무결성 및 건전성 알림)

**중점:** 소음을 제거하고 비판적인 문제 노출

![Monitor Warnings](/img/game-event-system/examples/14-runtime-monitor/demo-14-warnings.png)

**심각도 레벨:**

| 아이콘 | 레벨 | 의미 |
| ---- | ------------ | -------------------------------- |
| 🔵 | **정보(Info)** | 권고 알림 (참고용) |
| 🟡 | **경고(Warning)** | 비치명적 문제 (모니터링 필요) |
| 🔴 | **심각(Critical)** | 중대한 문제 (즉시 수정 권장) |

**경고 유형:**

| 경고 내용 | 트리거 조건 | 심각도 |
| ------------------ | ----------------------------------- | ---------- |
| `[No Listeners]` | 이벤트가 발생했지만 바인딩된 리스너가 없음 | 🔵 정보 |
| `[High Frequency]` | 초당 30회 이상 발생 시 | 🟡 경고 |
| `[Performance]` | 실행 시간이 5ms 초과 시 | 🔴 심각 |
| `[GC Pressure]` | 발생당 가비지 할당이 1KB 초과 시 | 🟡 경고 |

**테스트 결과:**
- **유닛 A:** `OnSpammer - [High Frequency] Firing at 62/sec`
- **유닛 D:** `OnGhost - [No Listeners] Event raised with zero subscribers`

**활용 방법:**
- 주요 기능 추가 후 체크
- 스트레스 테스트 중 모니터링
- 예상된 경고(예: 디버그 전용 이벤트)는 무시 가능

:::note 🎓 고스트 이벤트 (Ghost Events)

`[No Listeners]` 경고는 대개 다음과 같은 버그입니다:

1. 리스너 등록 실패 (`OnEnable` 확인)
2. 이벤트 에셋 참조 오류
3. 죽은 코드 (불필요한 `.Raise()` 호출 제거 필요)

:::

---

### 탭 6: 👂 Listeners (구독 정보 인스펙터)

**중점:** 누가 리스닝하고 있는지에 대한 세부 내역

![Monitor Listeners](/img/game-event-system/examples/14-runtime-monitor/demo-14-listeners.png)

**이벤트 선택** (예: `OnHeavyLoad`) 시 상세 내역이 표시됩니다:

**리스너 카테고리:**

| 카테고리 | 의미 | 아이콘 |
| --------------- | ----------------------------------------- | ---- |
| **Basic** | 표준 `AddListener` | 📌 |
| **Priority** | 우선순위가 포함된 `AddPriorityListener` | 🔢 |
| **Conditional** | 프레디케이트가 포함된 `AddConditionalListener` | ✅ |
| **Persistent** | 씬 교차 생존형 `AddPersistentListener` | 🧬 |

**내역 예시:**
```
📊 총 활성 리스너: 5
│
├─ 🔗 기본 리스너 (1)
│  ├─ 📦 인스펙터 바인딩: 0
│  └─ 💻 API 바인딩: 1
│     └─ ⚙️ RuntimeMonitorReceiver.OnHeavyExecution
│
├─ ⚖️ 우선순위 큐 (3)
│  ├─ 🥇 높은 우선순위 (100): 1
│  │  └─ ⚙️ RuntimeMonitorReceiver.OnHeavyPreCheck
│  ├─ 🥈 일반 우선순위 (0): 1
│  │  └─ ⚙️ RuntimeMonitorReceiver.OnHeavyExecution
│  └─ 🥉 낮은 우선순위 (-100): 1
│     └─ ⚙️ RuntimeMonitorReceiver.OnHeavyPostCheck
│
├─ 🛡️ 조건부 가드 (1)
│  └─ 💎 [우선순위: 50] RuntimeMonitorReceiver.OnHeavyCriticalWarning
│     └─ 🔍 프레디케이트: (sender, info) => info.isCritical
│
└─ 💎 지속성 레지스트리 (0)
   └─ (현재 활성화된 씬 교차 리스너 없음)
```

**테스트 결과 (유닛 B):**
- **총합:** 4-5개 리스너
- **우선순위 분포:** 높음(1), 일반(1), 낮음(1)
- **조건부:** 1개 (프레디케이트 미리보기 포함)

**활용 방법:**
- 코드 기반 등록이 정상 작동하는지 확인
- 리스너 실행 순서(우선순위 값) 확인
- 누락된 리스너 디버깅 (예상 수치 vs 실제 수치)
- 지속성 리스너 감사 (메모리 누수 방지)

:::tip 🔍 인스펙터 vs API
- **인스펙터 바인딩:** 비헤이비어 윈도우에서 구성됨
- **API 바인딩:** 코드의 `AddListener`를 통해 등록됨
- 두 방식 모두 여기에 표시되므로 하이브리드 접근 방식의 유효성을 검증할 수 있습니다.

:::

---

### 탭 7: 🔗 Automation (프로그래밍 방식 흐름 시각화)

**중점:** 코드로 구축된 트리거/체인 그래프 시각화

![Monitor Automation](/img/game-event-system/examples/14-runtime-monitor/demo-14-automation.png)

**트리 뷰 구조:**
```
▼ OnChainStart (Root, <DamageInfo>)
  │
  ├─ 🔗 Chain → OnChainProcess
  │   ├─ ⏱️ 지연: 0.5초
  │   ├─ ✅ 인자 전달
  │   └─ 타입: <DamageInfo>
  │
  └─ (OnChainProcess 확장됨)
      │
      ├─ 🔗 Chain → OnChainFinish
      │   ├─ ⏱️ 지연: 0.2초
      │   ├─ 🧩 조건: info.amount > 50
      │   ├─ ✅ 인자 전달
      │   └─ 타입: <DamageInfo>
      │
      └─ (OnChainFinish 확장됨)
          │
          └─ 🕹️ Trigger → OnTriggerComplete
              ├─ ❌ 인자 차단
              └─ 타입: (void)
```

**배지 범례:**

| 배지 | 의미 |
| -------- | ------------------------ |
| ⏱️ `0.5s` | 지연 시간 설정됨 |
| 🧩 | 조건 활성화됨 |
| ✅ | 인자 전달 활성화됨 |
| ❌ | 인자 차단됨 |
| 🔗 | 체인 노드 (순차 실행) |
| 🕹️ | 트리거 노드 (병렬 실행) |

**테스트 결과 (유닛 C):**
- **루트:** `OnChainStart`
- **깊이:** 3단계 (Start → Process → Finish → Complete)
- **혼합 타입:** 체인(순차) + 트리거(병렬) 조합 확인

**활용 방법:**
- 프로그래밍 방식의 그래프가 올바르게 구축되었는지 확인
- 끊어진 체인(누락된 노드) 디버깅
- 플로우 그래프 윈도우를 열지 않고도 복잡한 자동화 시각화
- 코드로 구축한 그래프와 비주얼로 구축한 그래프 비교

:::note 🎨 코드 vs 비주얼 그래프
- **이 탭:** **코드로 구축된** 그래프(`AddChainEvent`, `AddTriggerEvent`)를 보여줍니다.
- **Flow Graph 윈도우:** UI를 통해 생성된 **비주얼 구축** 그래프를 보여줍니다.
- 두 방식 모두 유효하며 디버깅 가능합니다.

:::

---

### 탭 8: 🔍 Event Details (심층 분석)

**중점:** 단일 이벤트 분석 및 히스토리

![Monitor Details](/img/game-event-system/examples/14-runtime-monitor/demo-14-details.png)

다른 탭에서 "Details" 또는 "View"를 클릭하여 진입할 수 있습니다.

**섹션 구성:**

**1. 메타데이터:**
- **GUID:** 고유 식별자 (변경 불가능)
- **Type:** 전체 제네릭 시그니처
- **Category:** 조직화 태그
- **Database:** 소스 에셋 파일

**2. 성능 요약:**
- **Avg/Min/Max Time:** 성능 탭과 동일
- **GC Allocation:** 메모리 프로필
- **Listener Count:** 현재 구독자 수

**3. 빈도 요약:**
- **Total Fires:** 플레이 시작 후 총 횟수
- **Fires/Sec:** 현재 발생 속도
- **Avg Interval:** 발생 간 간격
- **Last Fire:** 마지막 발생 시점

**4. 최근 활동 (필터링됨):**
- 해당 이벤트 전용 로그 스트림
- 이 이벤트의 히스토리만 표시
- 전체 스택 트레이스 사용 가능

**5. 자동화 (해당하는 경우):**
- 플로우 그래프 내에서 이 이벤트의 위치 표시
- 상위/하위 연결 상태

**활용 방법:**
- 포괄적인 단일 이벤트 분석
- 최적화 전/후 비교
- 팀 리뷰를 위한 데이터 내보내기

---

## 🏗️ 씬 아키텍처 (Scene Architecture)

### 이벤트 조직화

게임 이벤트 에디터에서 테스트 유닛별로 조직화된 이벤트:

![Game Event Editor](/img/game-event-system/examples/14-runtime-monitor/demo-14-editor.png)

| 카테고리 | 이벤트 이름 | 타입 | 용도 |
| ---------- | ---------------------- | ----------------------------------- | ---------------------- |
| **Unit A** | `OnSpammer` | `GameEvent` | 고빈도 스팸 |
| **Unit A** | `OnSpammerPersistent` | `GameEvent` | 지속성 스팸 |
| **Unit B** | `OnHeavyLoad` | `GameEvent<GameObject, DamageInfo>` | 성능 테스트 |
| **Unit B** | `OnHeavyLoadCondition` | `GameEvent<GameObject, DamageInfo>` | 조건부 테스트 |
| **Unit C** | `OnChainStart` | `GameEvent<DamageInfo>` | 루트 (골드) |
| **Unit C** | `OnChainProcess` | `GameEvent<DamageInfo>` | 체인 1단계 |
| **Unit C** | `OnChainFinish` | `GameEvent<DamageInfo>` | 체인 2단계 |
| **Unit C** | `OnTriggerComplete` | `GameEvent` | 체인 3단계 (트리거) |
| **Unit D** | `OnGhost` | `GameEvent` | 무결성 테스트 |

---

### 플로우 그래프 구성

코드로 구축된 프로그래밍 방식 체인:

![Flow Graph](/img/game-event-system/examples/14-runtime-monitor/demo-14-graph.png)

**그래프 구조:**
- 🔴 **OnChainStart (Root, 빨간색)** - 진입점
- 🟢 **OnChainProcess (Chain, 녹색)** - 1단계 (지연: 0.5s)
- 🟢 **OnChainFinish (Chain, 녹색)** - 2단계 (지연: 0.2s, 조건: amount > 50)
- 🟡 **OnTriggerComplete (Trigger, 노란색)** - 3단계 (인자 차단됨)

**연결 타입:**
- 🟢 **녹색 "CHAIN" 라인** - 순차 실행
- 🟡 **노란색 "TRIGGER" 라인** - 병렬 실행

---

### 레이저 설정 (RuntimeMonitorRaiser)

![RuntimeMonitorRaiser Inspector](/img/game-event-system/examples/14-runtime-monitor/demo-14-raiser.png)

**Unit A: 빈도 테스트**
- `On Spam Event`: OnSpammer
- `On Spam Persistent Event`: OnSpammerPersistent

**Unit B: 성능 테스트**
- `On Heavy Load Event`: OnHeavyLoad
- `On Heavy Load Condition Event`: OnHeavyLoadCondition

**Unit C: 자동화 테스트 (Roots)**
- `On Chain Start`: OnChainStart

**Unit C: 자동화 테스트 (Targets)**
- `On Chain Process`: OnChainProcess
- `On Chain Finish`: OnChainFinish
- `On Trigger Complete`: OnTriggerComplete

**Unit D: 무결성 테스트**
- `On Ghost Event`: OnGhost

---

### 리시버 설정 (RuntimeMonitorReceiver)

![RuntimeMonitorReceiver Inspector](/img/game-event-system/examples/14-runtime-monitor/demo-14-receiver.png)

**이벤트 (에셋 참조):**
- 레이저와 동일한 이벤트들

**체인 이벤트 (인스펙터 바인딩용):**
- `On Chain Process`, `On Chain Finish`, `On Trigger Complete`
- 이들은 **인스펙터 기반 리스너**를 가집니다 (비헤이비어 윈도우에서 드래그 앤 드롭).
- 코드 기반 API 리스너를 보완하는 역할을 합니다.

---

## 💻 코드 분석 (Code Breakdown)

### 성능 문제 시뮬레이션 (Unit B)

**RuntimeMonitorReceiver.cs - Heavy Execution:**
```csharp
public void OnHeavyExecution(GameObject sender, DamageInfo info)
{
    // ⚠️ 테스트를 위한 의도적인 랙(Lag) 발생
    // 프로덕션 환경에서 게임 로직에 Thread.Sleep을 절대 사용하지 마세요!
    // 모니터 경고를 트리거하기 위해 실행 시간을 5ms 이상으로 강제합니다.
    Thread.Sleep(6);  // ← 무거운 연산 시뮬레이션
    
    Debug.Log($"[Receiver] Processed heavy data. Latency: 6ms (simulated)");
}
```

**작동 원리:**
- `Thread.Sleep(6)`는 메인 스레드를 6ms 동안 차단합니다.
- 모니터의 Performance 탭은 리스너당 실행 시간을 추적합니다.
- 6ms는 5ms 임계값을 초과하므로 🟡 노란색 경고를 트리거합니다.
- 버튼을 두 번 클릭하여 `Thread.Sleep(12)`가 되면 🔴 빨간색 치명적 경고가 발생합니다.

---

### 프로그래밍 방식 자동화 구축 (Unit C)

**RuntimeMonitorRaiser.cs - Awake() 그래프 구축:**
```csharp
private ChainHandle _chainProcessHandle;
private ChainHandle _chainFinishHandle;
private TriggerHandle _triggerCompleteHandle;

private void Awake()
{
    // ✅ 코드로 체인 구축 (비주얼 그래프가 아닙니다!)
    
    // 1단계: Start → (지연 0.5s) → Process
    _chainProcessHandle = onChainStart.AddChainEvent(
        targetEvent: onChainProcess,
        delay: 0.5f,           // ← 0.5초 대기
        passArgument: true     // ← DamageInfo 전달
    );
    
    // 2단계: Process → (조건 + 지연 0.2s) → Finish
    _chainFinishHandle = onChainProcess.AddChainEvent(
        targetEvent: onChainFinish,
        delay: 0.2f,
        condition: (info) => info.amount > 50f,  // ← 데미지가 높을 때만 계속 진행
        passArgument: true
    );
    
    // 3단계: Finish → (트리거, 인자 차단) → Complete
    _triggerCompleteHandle = onChainFinish.AddTriggerEvent(
        targetEvent: onTriggerComplete,
        passArgument: false    // ← 인자 차단 (void 타입으로 변환)
    );
}

private void OnDestroy()
{
    // ✅ 정리: 동적 그래프에는 필수 작업
    onChainStart.RemoveChainEvent(_chainProcessHandle);
    onChainProcess.RemoveChainEvent(_chainFinishHandle);
    onChainFinish.RemoveTriggerEvent(_triggerCompleteHandle);
}
```

**그래프 실행 흐름:**
```
🖱️ 사용자 상호작용: 버튼 클릭
│
🚀 [ 시작 ] ➔ onChainStart.Raise(DamageInfo)
│   📦 페이로드: { amount: 100, isCritical: true }
│
⏳ [ 스케줄링 ] ➔ 시스템이 0.5초간 대기
│   └─► ⚙️ onChainProcess.Raise(DamageInfo)
│
⚖️ [ 평가 ] ➔ 게이트: `100 > 50` 인가? 
│   └─► ✅ 결과: 예 (조건 통과)
│
⏳ [ 스케줄링 ] ➔ 시스템이 0.2초간 대기
│   └─► 🎯 onChainFinish.Raise(DamageInfo)
│
🧪 [ 정제 ] ➔ 파라미터 스트리핑: `DamageInfo` ➔ `void`
│   └─► 🏁 onTriggerComplete.Raise()
│
📊 최종 결과: 파이프라인 완료 | ⚡ 타이밍: 총 0.7초 지연
```

**모니터 가시성:**
- **Automation 탭:** 이 정확한 트리 구조를 보여줍니다.
- **Recent Events 탭:** 타이밍과 함께 순차적인 발생 패턴을 보여줍니다.
- **Performance 탭:** 각 단계의 실행 시간을 추적합니다.

---

### 다중 우선순위 리스너 등록 (Unit B)

**RuntimeMonitorReceiver.cs - OnEnable():**
```csharp
private void OnEnable()
{
    // ✅ 다양한 방식으로 리스너 탭을 채웁니다.
    
    // 기본 리스너 (우선순위 없음)
    onSpamEvent.AddListener(OnSpamReceived);
    
    // 우선순위 리스너 (실행 순서 제어)
    onHeavyLoadEvent.AddPriorityListener(OnHeavyPreCheck, priority: 100);   // 1순위 실행
    onHeavyLoadEvent.AddPriorityListener(OnHeavyExecution, priority: 0);    // 2순위 실행 (랙 유발)
    onHeavyLoadEvent.AddPriorityListener(OnHeavyPostCheck, priority: -100); // 3순위 실행
    
    // 우선순위가 포함된 조건부 리스너
    onHeavyLoadConditionEvent.AddConditionalListener(
        OnHeavyCriticalWarning,
        predicate: (sender, info) => info.isCritical,  // ← 크리티컬일 때만
        priority: 50
    );
}

private void OnDisable()
{
    // ✅ 정리 작업
    onSpamEvent.RemoveListener(OnSpamReceived);
    
    onHeavyLoadEvent.RemovePriorityListener(OnHeavyPreCheck);
    onHeavyLoadEvent.RemovePriorityListener(OnHeavyExecution);
    onHeavyLoadEvent.RemovePriorityListener(OnHeavyPostCheck);
    
    onHeavyLoadConditionEvent.RemoveConditionalListener(OnHeavyCriticalWarning);
}
```

**모니터 가시성:**
- **Listeners 탭:** `OnHeavyLoad`에 대해 4개의 리스너를 보여줍니다.
  - 우선순위 내역: 높음(1), 일반(1), 낮음(1)
  - 조건부(1) 및 프레디케이트 미리보기
- **Performance 탭:** 누적 실행 시간(모든 리스너의 합계)을 추적합니다.

---

### 지속성 리스너 관리 (Unit A)

**RuntimeMonitorReceiver.cs - Awake/OnDestroy:**
```csharp
private void Awake()
{
    // ✅ 지속성 리스너 (씬 리로드 후에도 생존)
    // Awake에서 등록하고 OnDestroy에서 정리함
    onSpamPersistentEvent.AddPersistentListener(OnSpamPersistentLog, priority: -10);
}

private void OnDestroy()
{
    // ✅ 지속성 정리
    onSpamPersistentEvent.RemovePersistentListener(OnSpamPersistentLog);
}

public void OnSpamPersistentLog()
{
    // 빈 메서드—모니터 카운팅 확인을 위해 존재
    // 백그라운드 추적(예: 분석, 업적)을 시뮬레이션함
}
```

**모니터 가시성:**
- **Listeners 탭:** `OnSpammerPersistent`에 대해 "Persistent Listeners: 1"로 표시됨
- **Dashboard:** 지속성 리스너 건전성을 추적함

---

## 🎯 프로덕션 디버깅 워크플로우

### 시나리오 1: 전투 중 프레임 드랍 발생

**증상:**
- 전투 중 FPS가 60에서 30으로 급락함
- Unity Profiler에서 명확한 스파이크가 보이지 않음

**디버깅 단계:**
1. **Performance 탭** 열기
2. "Avg Time"으로 내림차순 정렬
3. 실행 시간이 2ms 이상인 이벤트 찾기
4. 이벤트 클릭 → **Details 탭** → 호출자(Caller) 메서드 확인
5. 무거운 리스너를 최적화하거나 발생 빈도를 줄임

---

### 시나리오 2: 이벤트가 발생하지 않음

**증상:**
- UI 버튼을 클릭해도 아무 반응이 없음
- 예상된 동작이 일어나지 않음

**디버깅 단계:**
1. **Recent Events 탭** 열기
2. 예상되는 이벤트 이름 검색
3. **항목이 있는 경우:** 이벤트는 발생하고 있으나 리스너가 응답하지 않음
   - **Listeners 탭**으로 이동 → 리스너 수 확인
   - 메서드 이름이 일치하는지 확인
4. **항목이 없는 경우:** 이벤트 자체가 발생하지 않음
   - 레이저 코드의 `.Raise()` 호출 여부 확인
   - 인스펙터에서 이벤트 에셋 참조 확인

---

### 시나리오 3: 메모리 누수 의심

**증상:**
- 시간이 지날수록 메모리 사용량이 증가함
- GC 스파이크 빈도가 높아짐

**디버깅 단계:**
1. **Performance 탭** 열기
2. "GC Alloc" 컬럼 확인
3. 발생당 0 KB를 초과하여 할당하는 이벤트 찾기
4. 이벤트 클릭 → **Listeners 탭** → 클로저 할당 여부 확인
5. 발생 시 할당이 일어나지 않도록 리팩토링

---

### 시나리오 4: 고스트 이벤트 (죽은 코드)

**증상:**
- Warnings 탭에 `[No Listeners]` 경고가 나타남

**디버깅 단계:**
1. **Warnings 탭** 열기
2. 고스트 이벤트 식별
3. **A안:** 디버그 전용 이벤트인 경우 → 경고 무시
4. **B안:** 리스너 등록 실패
   - `OnEnable`에서 `AddListener` 호출 여부 확인
   - 이벤트 에셋 참조 일치 여부 확인
5. **C안:** 죽은 코드 → 불필요한 `.Raise()` 호출 제거

---

## 🔑 모니터 베스트 프랙티스 (Best Practices)

### ✅ 권장 사항 (DO)

**개발 단계에서:**
- 보조 모니터에 모니터 창을 항상 열어두세요.
- 새로운 이벤트를 추가한 후 즉시 확인하세요.
- 리스너 수가 예상과 일치하는지 검증하세요.
- 최적화 전후의 프로필을 비교하세요.

**스트레스 테스트 중:**
- 본 데모처럼 높은 부하를 생성해보세요.
- Performance 탭에서 1ms를 초과하는 이벤트가 있는지 확인하세요.
- Warnings 탭에서 무결성 이슈를 체크하세요.
- 팀 리뷰를 위해 지표 데이터를 내보내세요.

**프로덕션 빌드에서:**
- 개발 빌드(Development Builds)에서는 모니터를 활성화하세요.
- 타겟 기기(모바일, 콘솔 등)에서 테스트하세요.
- 실제 사용 시나리오에서 프로파일링하세요.
- 성능 베이스라인을 문서화하세요.

---

### ❌ 금지 사항 (DON'T)

**성능 안티 패턴:**
- 배칭(Batching) 없이 매 프레임 이벤트를 발생시키는 것 (>60/sec)
- 리스너 내부에서 메모리를 할당하는 것 (클로저, LINQ 등)
- 무거운 연산을 동기적으로 호출하는 것

**디버깅 안티 패턴:**
- 노란색 경고를 그냥 무시하는 것 ("단순한 경고일 뿐이야")
- 이벤트 디버깅에 오로지 `Debug.Log`에만 의존하는 것
- 리스너 정리(`OnDisable`)를 빠뜨리는 것
- 테스트용 이벤트를 프로덕션 빌드에 남겨두는 것

---

## 📊 모니터 vs Unity Profiler

| 기능 | 게임 이벤트 모니터 | Unity Profiler |
| ---------------------- | ------------------ | ------------------- |
| **중점 사항** | 이벤트 시스템 전용 | 엔진 전체 |
| **정밀도** | 이벤트별 지표 | 메서드 호출 단위 |
| **리스너 추적** | ✅ 내장 기능 | ❌ 수동 필요 |
| **빈도 분석** | ✅ 내장 기능 | ⚠️ 간접 확인 |
| **흐름 시각화** | ✅ Automation 탭 | ❌ 지원 안 함 |
| **자동 경고** | ✅ 자동 감지 | ❌ 수동 분석 필요 |
| **학습 곡선** | 낮음 (쉬움) | 높음 (어려움) |
| **최적 용도** | 이벤트 디버깅 | 전반적인 성능 분석 |

**권장 워크플로우:**
1. **모니터:** 문제가 되는 이벤트 식별
2. **Unity Profiler:** 리스너 메서드 내부로 딥다이브
3. **모니터:** 수정 후 실행 시간이 줄어들었는지 검증

---

## 🎯 다음 단계

이제 기본 이벤트부터 엔터프라이즈급 관측성까지 `GameEventSystem` 워크플로우를 완벽하게 마스터하셨습니다. 모든 예제 섹션이 완료되었습니다!

**향후 단계:**
- 고급 기능을 위해 **[Tools & Support](../tools/codegen-and-cleanup.md)**를 탐색하세요.
- 프로덕션 패턴을 위해 **[Best Practices](../scripting/best-practices.md)**를 검토하세요.
- 도움이 필요하면 **[Community & Support](../tools/community-and-support.md)**를 확인하세요.

---

## 📚 관련 문서

- **[런타임 모니터 도구](../tools/runtime-monitor.md)** - 전체 모니터 문서
- **[베스트 프랙티스](../scripting/best-practices.md)** - 성능 최적화 패턴
- **[프로그래밍 방식의 흐름 제어](../scripting/programmatic-flow.md)** - 코드로 그래프 구축하기
- **[API 참조](../scripting/api-reference.md)** - 전체 메서드 시그니처
```