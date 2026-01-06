---
sidebar_label: '00 빠른 시작'
sidebar_position: 1
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 🚀 빠른 시작

<VideoGif src="/video/game-event-system/example/00-quick-start.mp4" />

## 📋 개요

이 입문용 씬은 프로젝트에서 Game Event System을 활성화하는 데 필요한 **일회성 설정** 과정을 안내합니다. 데모를 본격적으로 살펴보기 전에 핵심 프레임워크 컴포넌트를 초기화해야 합니다.

:::tip 💡 배울 내용
- **Game Event System 대시보드**를 여는 방법
- 클릭 한 번으로 시스템을 초기화하는 방법
- 설정 과정에서 생성되는 컴포넌트 확인

:::

---

## 🎬 데모 씬
```
Assets/TinyGiants/GameEventSystem/Demo/00_QuickStart/00_QuickStart.unity
```

초기화 프로세스를 시작하려면 이 씬을 여십시오.

---

## 🤔 왜 초기화가 필요한가요?

Game Event System은 모든 이벤트 작업을 조정하기 위해 **상주 매니저(persistent manager)**인 `GameEventManager`에 의존합니다. 이 매니저가 없으면 이벤트를 발생시키거나 리스닝할 수 없습니다. 

초기화 프로세스는 다음 항목들을 자동으로 설정합니다:

| 컴포넌트 | 설명 |
| ---------------------- | ------------------------------------------------------------ |
| 🎮 **GameEventManager** | 싱글톤 매니저 (`DontDestroyOnLoad`로 표시됨) |
| 📚 **이벤트 데이터베이스** | 이벤트 정의를 저장하기 위한 기본 에셋 |
| 🔗 **플로우 컨테이너** | 이벤트 오케스트레이션을 위한 시각적 로직 그래프 |
| ⚙️ **생성된 코드** | 내장 이벤트 타입(void, int, float 등)을 위한 C# 클래스 |

---

## 📖 단계별 설정 지침

### 1️⃣ 대시보드 열기

유니티 상단 메뉴에서 다음 경로로 이동하십시오:
```
Tools → TinyGiants → Game Event System
```

그러면 이벤트, 데이터베이스 및 플로우 그래프를 관리하는 중앙 허브인 **Game Event System** 창이 열립니다.

---

### 2️⃣ 시스템 상태 확인

창에서 **"Initialize System"** 섹션을 찾으십시오:

#### 🔵 초기화 전

![System Uninitialized](/img/game-event-system/examples/00-quick-start/uninitialized.png)

- 파란색 **"Initialize Event System"** 버튼이 보입니다.
- ⚠️ 경고: "Please initialize the system first (시스템을 먼저 초기화하십시오)"

#### 🟢 초기화 후

![System Initialized](/img/game-event-system/examples/00-quick-start/initialized.png)

- 상태 바가 **녹색**으로 변하며 "✓ System Initialized"라고 표시됩니다.
- ✅ 확인: "Core managers, database and codes are ready (핵심 매니저, 데이터베이스 및 코드가 준비되었습니다)"

---

### 3️⃣ 초기화 클릭

**"Initialize Event System"** 버튼을 누르십시오. 플러그인이 자동으로 다음 작업을 수행합니다:

| 작업 | 결과 |
| --------------------- | ------------------------------------------------------------ |
| **매니저 생성** | 씬에 `GameEventManager` 게임 오브젝트 추가 (상주형) |
| **데이터베이스 생성** | 프로젝트에 `DefaultEventDatabase.asset` 생성 |
| **플로우 그래프 설정** | 시각적 로직을 위한 `DefaultFlowContainer.asset` 생성 |
| **코드 컴파일** | 타입 안정성이 보장된 C# 이벤트 클래스 생성 |

콘솔에 **🎉 GameEvent initialization complete** 문구가 표시됩니다.

---

## ✅ 설정 확인

초기화가 완료되면 설정을 확인하십시오:

1. **하이어라키 확인** 🔍  

   루트 레벨에 `GameEventManager` 게임 오브젝트가 나타나야 합니다.

2. **인스펙터 확인** 👀  
   
   매니저를 선택하여 할당된 데이터베이스(Database)와 플로우 컨테이너(Flow Container) 참조를 확인하십시오.
   
3. **콘솔 확인** 📝  
   
   초기화 성공을 확인하는 메시지를 찾으십시오.

![GameEventManager in Hierarchy](/img/game-event-system/examples/00-quick-start/hierarchy.png)

:::info 🔔 씬 레벨 설정

각 씬이 정상 작동하려면 자체적인 **GameEventManager**가 필요합니다. 매니저는 해당 씬에서 어떤 **이벤트 데이터베이스**와 **플로우 그래프**가 활성화될지 결정합니다. 데이터베이스 자체(ScriptableObject 에셋)는 영구적이며 여러 씬에서 재사용할 수 있지만, 각 씬은 어떤 데이터베이스를 사용할지 명시적으로 바인딩해야 합니다.

:::

---

## 🎯 다음 단계는?

환경이 준비되었으므로 이제 프레임워크의 핵심 기능을 탐색할 수 있습니다.

**다음 장**: **[01 Void 이벤트](./01-void-event.md)**에서 첫 번째 이벤트를 생성하고 트리거하는 방법을 배워보십시오.

:::note 📚 심화 학습

초기화 프로세스 및 수동 설정 옵션에 대한 기술적 상세 내용은 **[설치 가이드](../intro/installation.md)**를 참조하십시오.

:::