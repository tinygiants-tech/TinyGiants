---
sidebar_label: '설치'
sidebar_position: 3
---

import Tabs from '@theme/Tabs';

import TabItem from '@theme/TabItem';

import VideoGif from '@site/src/components/Video/VideoGif';



# 설치

환영합니다! **Game Event System** 설정은 5초 이내에 완료하여 바로 시작할 수 있도록 설계된 간소화된 프로세스입니다.

 <VideoGif src="/video/game-event-system/installation.mp4" />

 :::tip 

위 비디오는 임포트부터 초기화까지의 전체 과정을 보여줍니다. 각 단계에 대한 자세한 설명은 아래 가이드를 참조하세요.

::: 

------

## ✅ 사전 요구 사항

설치하기 전에 프로젝트가 다음 최소 요구 사항을 충족하는지 확인하십시오.

| 요구 사항             | 최소 버전         | 권장 사양               |
| :-------------------- | :---------------- | :---------------------- |
| **Unity 버전**        | **2021.3 LTS**    | **2022.3 LTS** 이상      |
| **스크립팅 백엔드**   | Mono 또는 IL2CPP  | IL2CPP (프로덕션 용)     |
| **API 호환성**        | .NET Standard 2.1 | .NET Standard 2.1       |

---

## 1단계: 패키지 임포트

플러그인을 획득한 방법에 따라 적절한 임포트 방법을 선택하십시오.

<Tabs>
  <TabItem value="store" label="패키지 매니저를 통해" default>

  1.  Unity를 열고 **Window > Package Manager**로 이동합니다.
  2.  드롭다운에서 **"My Assets"**를 선택합니다.
  3.  **"Game Event System"**을 검색합니다.
  4.  **Download**를 클릭한 후 **Import**를 클릭합니다.
  5.  파일 목록이 나타나면 **모든 파일**이 선택되었는지 확인하고 **Import**를 클릭합니다.

  </TabItem>
  <TabItem value="custom" label=".unitypackage를 통해">

  1.  컴퓨터에서 `.unitypackage` 파일을 찾습니다.
  2.  파일을 Unity의 **Project View**로 직접 **드래그 앤 드롭**합니다.
  3.  (또는 **Assets > Import Package > Custom Package...**로 이동합니다.)
  4.  파일 목록이 나타나면 **모든 파일**이 선택되었는지 확인하고 **Import**를 클릭합니다.

  </TabItem>
</Tabs>

:::info 컴파일 시간
임포트 후 Unity에서 재컴파일이 시작됩니다. 이는 정상적인 과정입니다. 진행하기 전에 로딩 바가 끝날 때까지 기다려 주십시오.
:::

---

## 2단계: 시스템 대시보드 열기

임포트가 완료되면 Unity 툴바를 통해 메인 허브에 접속할 수 있습니다.

```text
Tools > TinyGiants > Game Event System
```

:::tip 자동 열기

최초 임포트 시 GameEventSystem 창이 자동으로 열립니다.

:::

### 🔍 자동 환경 체크

창을 열면 대시보드 하단에 위치한 **System Information** 패널이 프로젝트 환경을 자동으로 스캔합니다.

![alt text](/img/game-event-system/intro/installation/install-step-2-sysinfo.png)

다음과 같은 주요 호환성 지표를 실시간으로 확인합니다.

- **Unity Version**: 지원되는 버전인지 확인합니다 (2021.3 이상일 경우 녹색 체크).
- **Render Pipeline**: **Built-in**, **URP**, 또는 **HDRP**를 자동 감지합니다. 플러그인은 세 가지 모두와 호환됩니다.
- **Scripting Backend**: 현재 **Mono** 또는 **IL2CPP** 중 무엇으로 실행 중인지 표시합니다.

:::tip 스마트 감지
아무것도 수동으로 설정할 필요가 없습니다. 이 패널에 녹색 체크가 표시되면 환경이 준비된 것입니다.
:::

------

## 3단계: 시스템 초기화

창을 처음 열면 시스템이 씬에 필수 매니저가 누락되었음을 감지합니다.

### 1. "미초기화" 상태

대시보드 상단에 경고 배너가 표시됩니다.

> ⚠️ **먼저 시스템을 초기화해 주세요.**

*(실행 버튼은 **진한 파란색**으로 표시됩니다)*

![alt text](/img/game-event-system/intro/installation/install-step-3-uninitialized.png)

### 2. 원클릭 설정

**"Initialize Event System"** 버튼을 클릭합니다.

시스템은 다음과 같은 자동화된 작업을 수행합니다.

1. 씬에 **Game Event Manager** GameObject(싱글톤)를 생성합니다.
2. 기본 **GameEventDatabase** 에셋을 생성합니다(누락된 경우).
3. 기본 **FlowContainer** 에셋을 생성합니다(누락된 경우).
4. 필요한 C# 제네릭 타입을 컴파일합니다.

### 3. 성공!

버튼이 **녹색**으로 바뀌고 상태 텍스트에 **"System Ready"**라고 표시됩니다.

![alt text](/img/game-event-system/intro/installation/install-step-3-success.png)

---

## 4단계: 하이어라키 및 컴포넌트 확인

모든 것이 올바르게 작동하는지 확인하려면 **Scene Hierarchy**를 확인하십시오. 새로운 GameObject가 표시되어야 합니다.

> **🔹 Game Event Manager**

![alt text](/img/game-event-system/intro/installation/install-step-4-managers.png)

### 컴포넌트 스택

이 오브젝트를 선택하십시오. 인스펙터(Inspector)에서 일련의 매니저 컴포넌트들이 미리 구성된 것을 볼 수 있습니다. 각 컴포넌트는 이벤트 라이프사이클의 특정 부분을 담당하는 싱글톤 기반 매니저입니다.

![alt text](/img/game-event-system/intro/installation/install-step-4-manager.png)

| 컴포넌트                       | 책임 범위            | 주요 기능                                                    |
| :----------------------------- | :------------------- | :----------------------------------------------------------- |
| **GameEventManager**           | 👑 **핵심 두뇌**      | 데이터베이스 로드, 이벤트 조회, 정적 상태 리셋을 관리합니다. 유일한 필수 컴포넌트입니다. |
| **GameEventPersistentManager** | **지속성**           | `DontDestroyOnLoad`를 통해 씬 전환 시에도 유지되어야 하는 "Persistent" 마킹 이벤트를 관리합니다. |
| **GameEventFlowManager**       | **비주얼 스크립팅**  | 플로우 그래프(Flow Graph)의 실행 엔진입니다. 트리거(Trigger)와 체인(Chain) 사이의 로직을 조정합니다. |
| **GameEventSchedulerManager**  | **시간 로직**        | `RaiseDelayed` 및 `RaiseRepeating`과 같은 시간 기반 작업을 처리합니다. |
| **GameEventTriggerManager**    | **팬아웃 로직**      | "Trigger" 노드를 관리합니다. 하나의 이벤트가 발생할 때 여러 타겟 이벤트를 동시에 트리거할 수 있습니다(병렬). |
| **GameEventChainManager**      | **순차 로직**        | "Chain" 노드를 관리합니다. 대기 시간 및 조건부 중단을 지원하며 일련의 이벤트를 순서대로 실행합니다(직렬). |

:::warning 모듈성 및 안전성
이 아키텍처는 모듈식입니다. 기술적으로는 씬의 점유 공간을 최소화하기 위해 특정 매니저를 **삭제할 수 있습니다** (예: 플로우 그래프를 사용하지 않는 경우 Flow, Trigger, Chain 매니저 제거 가능).

하지만 **전체 스택을 유지하는 것을 강력히 권장**합니다. 이 컴포넌트들은 다음과 같은 특징이 있습니다.
1. 유휴 상태일 때 **오버헤드가 전혀 없습니다** (Update 루프 없음).
2. **Visual Workflow**가 작동하는 데 필수적입니다.
3. 나중에 지연 발생(Delayed Raise)이나 플로우 그래프를 사용하기로 결정했을 때 "Missing Component" 런타임 에러가 발생하는 것을 방지합니다.

:::

------

## 🏁 시작 준비 완료!

이제 시스템이 완전히 초기화되었으며 실제 제작에 사용할 준비가 되었습니다.

### 다음 단계는?

- **🎮 첫 번째 이벤트 만들기**: **[Game Event Creator](../visual-workflow/game-event-creator.md)** 가이드를 확인하세요.
- **👀 작동 데모 보기**: **[00 Quick Start](../examples/00-quick-start.md)** 예제 씬을 열어보세요.
- **📚 도구 이해하기**: **[Game Event System](../visual-workflow/game-event-system.md)**에 대해 읽어보세요.
```