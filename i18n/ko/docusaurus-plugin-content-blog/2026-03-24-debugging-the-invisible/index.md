---
slug: debugging-the-invisible
title: '보이지 않는 것을 디버깅하기: 이벤트 시스템에 전용 관측 레이어가 필요한 이유'
authors: [tinygiants]
tags: [ges, unity, debugging, tools, performance]
description: "이벤트는 본질적으로 fire-and-forget이다. 문제가 생기면 step through도 안 되고, 누가 리스닝하는지도 보이지 않고, 체인을 추적할 수도 없다. 이벤트 시스템에 전용 디버깅 도구가 필요한 이유를 알아본다."
image: /img/home-page/game-event-system-preview.png
---

QA 테스터가 버그를 올린다: "플레이어가 열쇠를 줍는데 문이 열리지 않습니다."

간단하지? 아마 참조 누락이나 조건 오류일 것이다. 프로젝트를 열고, 열쇠를 줍고... 문이 잘 열린다. 내 컴퓨터에서는 동작한다. 테스터에게 재현 단계를 물어보니 "30% 정도의 확률로 발생하는데, 보통 세이브/로드 후에 그렇습니다"라고 한다.

이제 디버깅 지옥이다. 열쇠 획득 이벤트, 인벤토리 업데이트, 퀘스트 진행 확인, 문의 잠금 해제 조건을 잇는 체인 어딘가에서 간헐적으로 뭔가 실패하고 있다. 그런데 어느 링크에서? 이벤트가 Raise되지 않은 건가? Raise는 됐는데 리스너가 구독되지 않은 건가? 리스너는 구독됐는데 조건이 false로 평가된 건가? 조건은 맞았는데 로드 후 문의 상태가 오래된 건가?

<!-- truncate -->

알 수 없다. 그리고 이벤트 시스템은 알려주지 않는다. "fire and forget"이다 — *forget* 쪽에 방점이 찍힌.

이것이 모든 이벤트 기반 Unity 프로젝트가 결국 맞닥뜨리는 관측 가능성 갭이다. 단순한 디버깅 불편이 아니다 — 리팩토링을 위험하게 만들고, 성능 튜닝을 불가능하게 만들고, 새 팀원 온보딩을 고통스럽게 만드는 아키텍처적 사각지대다. 오늘은 이 갭이 왜 존재하는지, 실제로 얼마나 비용이 드는지, 제대로 된 해결책은 어떤 모습인지 이야기하고 싶다.

## "Raise됐나?" 질문

이벤트 시스템에서 가장 기본적인 디버깅 질문은 겉보기에 단순하다: 이벤트가 발동했나?

`PlayerCombat`이 `onDamageDealt.Raise(42)`를 호출하면, 이벤트 시스템은 리스너를 순회하고, 핸들러를 호출하고, 반환한다. 로그 없음. 트레이스 없음. 발생했다는 기록 없음. 정보는 Raise가 완료되는 순간 증발한다.

이것은 직접 메서드 호출과 근본적으로 다르다. `PlayerCombat.TakeDamage()`가 `HealthBar.UpdateDisplay()`를 직접 호출한다면, 호출 지점에 브레이크포인트를 설정하고, 코드를 단계별로 따라가며, 정확히 무슨 일이 일어나는지 볼 수 있다. 이벤트에서는 호출자가 누가 리스닝하는지 모른다. 리스너도 누가 호출하는지 모른다. 둘 사이의 연결은 런타임에만, 이벤트 시스템의 구독 목록 안에만, 디버거에게 보이지 않게 존재한다.

그래서 `Debug.Log`를 추가한다:

```csharp
private void HandleDamage(int amount)
{
    Debug.Log($"HandleDamage called with amount={amount}");
    // actual logic...
}
```

하나의 이벤트에는 동작한다. 이제 프로젝트의 모든 이벤트의 모든 리스너에 곱하라. 프레임당 500줄의 로그가 읽을 수 있는 속도보다 빠르게 콘솔에 스크롤된다. 검색어로 필터링하려 하지만, 세 곳의 로그에서 "Damage"를 다르게 적었다. 타임스탬프를 추가하고, 호출자 이름을 추가하고, 스택 트레이스를 추가한다. 각 `Debug.Log`가 한 줄의 실제 로깅을 감싸는 세 줄의 포매팅 코드가 된다.

그리고 출시할 때? 모두 제거해야 한다. 아니면 `#if UNITY_EDITOR` 블록으로 감싸야 한다. 아니면 그냥 두고 프레임당 500개의 로그 메시지 문자열 포매팅의 성능 히트를 아무도 모르기를 바란다.

`Debug.Log`는 양동이가 배관 전략인 것과 같은 의미에서 디버깅 전략이다. 긴급 상황에서는 동작하지만, 집을 그것 중심으로 설계하진 않을 것이다.

## Unity 프로파일러: 잘못된 도구

Unity 프로파일러는 "어떤 메서드가 얼마나 오래 걸렸나"에 대답하는 데는 탁월하다. "어떤 이벤트가, 언제, 어떤 데이터로, 누가 응답했나"에 대답하는 데는 형편없다.

프로파일러에서 스파이크를 본다. 어떤 콜백 메서드에 있다 — `HandleDamage`. 콜 스택을 파고든다. 호출한 것은... 이벤트 시스템의 디스패치 루프다. 어떤 이벤트? 프로파일러는 모른다. 그냥 제네릭 디스패치 함수에서의 메서드 호출을 볼 뿐이다. 어떤 리스너가 느렸나? 각각 개별적으로 인스트루먼테이션해야 한다. 어떤 데이터가 전달됐나? 프로파일러는 인자를 캡처하지 않는다.

프로파일러는 시간이 어디에 소비됐는지 알려준다. 이벤트 시스템이 왜 그렇게 동작했는지는 알려주지 않는다. 근본적으로 다른 질문이다.

`OnPlayerDamaged`의 8개 리스너 중 하나가 4ms를 소비한다. 프로파일러는 이벤트 시스템의 디스패치 메서드에서 스파이크를 보여준다. 좋다. 8개 중 어떤 리스너가 범인인가? 각 리스너를 `Stopwatch`로 감싸고 결과를 로그할 수 있다. 8개의 리스너에 대해. 하나의 이벤트에서. 60개의 이벤트가 있다. 480줄의 타이밍 코드이고, 아직 디버깅을 시작하지도 않았다.

## 의존성 질문

아키텍트를 밤잠 못 자게 하는 질문: "이 이벤트를 누가 사용하고 있나?"

`OnPlayerDeath`를 `OnPlayerDefeated`로 이름을 바꾸고 싶다. 게임 디자인이 변경되어 "사망"은 더 이상 없고 — 플레이어가 "기절"당하는 것으로 변했기 때문이다. 간단한 이름 변경이지?

프로젝트에서 Ctrl+F: `OnPlayerDeath`. 12개의 코드 참조를 찾았다. 모두 이름을 바꾼다. 출시한다.

그러다 버그 리포트를 받는다: 애널리틱스 시스템이 플레이어 패배 추적을 중단했다. 왜? 애널리틱스 MonoBehaviour가 인스펙터에 **직렬화된 필드**로 이전 `OnPlayerDeath` ScriptableObject를 참조하고 있었다. Ctrl+F는 코드 참조만 찾는다. 인스펙터 바인딩은 찾지 못한다. Behavior Window 구독도 찾지 못한다. `.cs` 파일이 아닌 직렬화된 Unity 에셋에 존재하는 참조는 찾지 못한다.

그래서 아무도 이벤트를 삭제하지 않는다. 아무도 이벤트 이름을 바꾸지 않는다. 아무도 이벤트 계층을 리팩토링하지 않는다. 전체 그림을 아는 사람이 없기 때문이다. "이 이벤트를 누가 사용하나?"는 표준 Unity 도구로는 답할 수 없는 질문이다. 그래서 이벤트가 쌓인다. 죽은 이벤트가 프로젝트에 영원히 남는다. 이벤트 데이터베이스가 커진다. 새 개발자는 200개의 이벤트를 보고 어떤 것이 활성인지 전혀 알지 못한다.

리팩토링에 대한 두려움은 현실이며, 관측 가능성 갭이 직접적으로 야기한다.

## 게임을 멈추는 재귀 루프

Event A가 B를 Raise한다. B의 리스너가 C를 Raise한다. C의 리스너가 A를 Raise한다. 게임이 멈춘다. 에디터가 응답하지 않는다. Unity를 강제 종료하고, 저장하지 않은 씬 변경 사항을 잃고, 20분 동안 코드를 들여다보며 순환이 어디서 시작되는지 파악하려 한다.

재귀 이벤트 루프는 이벤트 기반 시스템에서 가장 골치 아픈 버그 중 하나다. 디자인 타임에는 보이지 않는다 — 세 이벤트가 모두 올바른 리스너와 함께 동시에 활성화될 때만 순환이 나타난다. 코드 리뷰에서도 잡히지 않는다. 각 스크립트는 단지 다른 이벤트에 응답하여 하나의 이벤트를 Raise할 뿐이다. 개별적으로는 완벽히 합리적이다. 조합되면 치명적이다.

자동 감지 없이는, 이런 루프를 어려운 방법으로 발견한다: 멈춘 에디터와 스택 오버플로우.

## DevOps가 가진 것 (그리고 우리에게 없는 것)

백엔드 개발 세계는 이 문제를 몇 년 전에 해결했다. 분산 트레이싱(Jaeger, Zipkin)으로 15개의 마이크로서비스를 거치는 요청을 따라가며 정확히 어디서 시간이 소비됐는지 볼 수 있다. 메트릭 대시보드(Grafana, Datadog)로 요청률, 에러율, 레이턴시 퍼센타일을 실시간으로 본다. 로그 집계(ELK 스택, Splunk)로 수백만 로그 항목을 구조화된 쿼리로 검색한다. 알림 시스템(Prometheus, PagerDuty)이 사용자가 불만을 제기하기 전에 알려준다.

게임 이벤트는 마이크로서비스 메시지와 아키텍처적으로 유사하다. 이벤트가 발동하고(요청이 전송되고), 여러 리스너가 응답하고(여러 서비스가 처리하고), 결과가 다운스트림으로 전파된다(추가 이벤트를 트리거한다). 같은 관측 가능성 기법이 적용된다.

하지만 Unity의 도구 상자는... 프로파일러와 `Debug.Log`를 제공한다. 더 나은 것을 누릴 자격이 있다.

## GES의 답: 두 가지 상호 보완적 도구

GES는 전체 개발 라이프사이클을 커버하는 두 가지 전용 도구로 관측 가능성 갭을 해결한다: 에디트 타임 의존성 분석을 위한 **Event Finder**와 플레이 타임 관측 가능성을 위한 **Runtime Monitor**. 함께하면, 표준 Unity 도구로는 답할 수 없는 모든 질문에 답한다.

## Event Finder: 이 이벤트를 누가 사용하나?

Event Finder는 의존성 질문에 결정적으로 답하는 에디터 윈도우다. 이벤트 에셋을 선택하고, Scan을 클릭하면, 해당 이벤트를 참조하는 **씬의 모든 MonoBehaviour**를 찾는다 — public 필드, private 직렬화 필드, 중첩된 참조를 통해. 리플렉션을 사용하여 컴포넌트 필드를 스캔하므로, Ctrl+F가 절대 찾지 못할 참조도 잡아낸다.

### List 뷰

![Event Finder List View](/img/game-event-system/visual-workflow/game-event-finder/game-event-finder-list.png)

List 뷰는 모든 참조를 평면 목록으로 보여준다. 각 항목은 GameObject 이름, 컴포넌트 타입, 필드 이름, 상태 표시기를 표시한다:

- **녹색** — 참조가 유효하고 컴포넌트가 활성
- **빨간색** — 참조가 깨짐 (null 이벤트, 누락된 컴포넌트, 비활성화된 오브젝트)

항목을 클릭하면 Hierarchy에서 **Ping** (선택하지 않고 하이라이트), **Focus** (선택하고 Scene 뷰에서 프레이밍), **Frame** (Scene 카메라를 오브젝트 중심으로 이동)할 수 있다.

### Grouped 뷰

![Event Finder Grouped View](/img/game-event-system/visual-workflow/game-event-finder/game-event-finder-grouped.png)

Grouped 뷰는 참조를 컴포넌트 타입별로 정리한다. 모든 `HealthSystem` 참조를 함께, 모든 `DamagePopup` 참조를 함께. "어떤 오브젝트가 참조하나?"보다 "어떤 시스템이 이 이벤트를 사용하나?"에 답할 때 원하는 뷰다.

### 안전한 리팩토링 워크플로우

Event Finder가 "이 이벤트를 누가 사용하나?"를 답할 수 없는 질문에서 30초 조회로 바꾸는 방법:

1. Event Finder를 열고, 이름 변경/삭제/수정하려는 이벤트를 선택
2. Scan 클릭 — 완전한 참조 목록을 얻음
3. List 뷰에서 모든 참조를 검토 (예상치 못한 소비자가 있는지 확인)
4. Grouped 뷰로 전환하여 영향을 받는 시스템을 파악
5. 자신있게 변경
6. 다시 스캔하여 깨진 것이 없는지 확인 (모두 녹색 상태)

추측 없음. "다 커버한 것 같다"가 없음. 인스펙터 바인딩을 놓쳐서 2주 후에 버그 리포트가 오는 일 없음. Event Finder는 의존성을 가시화해서 리팩토링을 안전하게 만든다.

## Runtime Monitor: 전용 이벤트 관측 가능성

Runtime Monitor는 8개의 특화된 탭이 있는 에디터 윈도우로, 각각 특정 카테고리의 디버깅 질문에 답하도록 설계되었다. 이벤트, 리스너, 조건, 타이밍, 플로우 그래프를 네이티브하게 이해한다 — 이벤트 시스템에 내장되어 있기 때문이지, 사후에 덧붙인 것이 아니다.

`Tools > TinyGiants > Game Event System > Runtime Monitor`에서 열거나, GES Hub에서 찾을 수 있다. 모니터는 Play Mode 동안 최소한의 오버헤드로 데이터를 수집한다. 에디터 전용 코드로, 빌드에서 완전히 제거된다. 출시 게임에 미치는 영향 제로.

8개의 탭을 모두 살펴보자.

### 탭 1: Dashboard — 건강 점검

Dashboard가 시작점이다. 한 눈에 보고 이벤트 시스템이 건강한지 아니면 불타고 있는지 즉시 알 수 있다.

![Monitor Dashboard](/img/game-event-system/tools/runtime-monitor/monitor-dashboard.png)

**메트릭 카드**가 상단에 큰 그림을 보여준다: 프로젝트 총 이벤트 수, 이 세션의 활성 이벤트 (한 번 이상 Raise된), 총 리스너 구독 수, Play Mode 시작 이후 누적 Raise 횟수.

**성능 바**는 색상으로 구분된다. 녹색은 모든 이벤트가 평균 1ms 미만으로 처리 — 괜찮다. 노란색은 일부 이벤트가 평균 1-10ms — 확인할 가치가 있다. 빨간색은 10ms 초과 — 멈추고 조사하라. 바는 평균이 아닌 최악 이벤트를 반영한다. 하나의 문제가 전체 바를 노란색으로 만든다. 의도적이다 — 이상치를 알고 싶으니까.

**최근 활동**은 마지막 몇 번의 이벤트 Raise가 실시간으로 스크롤되는 것을 보여준다: 이벤트 이름, 타임스탬프, 리스너 수, 실행 시간. 게임플레이 중에 이벤트 시스템이 무엇을 하고 있는지 라이브 맥박을 보여준다.

**빠른 경고**가 감지된 문제를 요약한다: 높은 실행 시간, 높은 리스너 수, 재귀 Raise, 메모리 할당. 경고 뱃지를 클릭하면 해당 상세 탭으로 이동한다.

Dashboard가 답하는 것: "내 이벤트 시스템이 지금 건강한가?" 예라면, 하던 일을 계속하라. 아니라면, 다른 탭이 왜인지 알려준다.

### 탭 2: Performance — 숫자

뭔가 느리게 느껴지고 느낌이 아닌 데이터가 필요할 때 가는 곳이다.

![Monitor Performance](/img/game-event-system/tools/runtime-monitor/monitor-performance.png)

프로젝트의 모든 이벤트가 행으로 표시된다:

- **Event Name** — ScriptableObject 에셋 이름
- **Raise Count** — 이 세션에서 발동한 횟수
- **Listener Count** — 현재 활성 구독자
- **Avg/Min/Max Time** — 모든 리스너에 걸친 Raise당 실행 시간
- **GC Alloc** — Raise당 가비지 컬렉션 할당

시간 셀은 색상으로 구분된다: 녹색(&lt;1ms)은 정상, 노란색(1-10ms)은 주의, 빨간색(>10ms)은 위험. 어떤 열로든 정렬 — "Max Time"으로 정렬하면 스파이크 범인을 찾고, "GC Alloc"으로 정렬하면 할당 핫스팟을 찾고, "Raise Count"로 정렬하면 고빈도 이벤트를 식별한다.

Performance 탭을 강력하게 만드는 통찰: **이벤트 실행 시간은 모든 리스너 작업을 포함한다.** 이벤트가 50개의 리스너로 평균 5ms를 보이면, 리스너당 ~0.1ms — 정상이다. 2개의 리스너로 5ms를 보이면, 그 중 하나가 비싼 일을 하고 있는 것이다. 숫자가 즉시 문제가 "리스너가 너무 많은 것"인지 "한 리스너가 느린 것"인지 알려준다.

### 탭 3: Recent Events — 타임라인

모든 이벤트 Raise의 시간순 로그. 이벤트 시스템의 비행 기록기다.

![Monitor Recent](/img/game-event-system/tools/runtime-monitor/monitor-recent.png)

각 항목은 다음을 보여준다: 타임스탬프(게임 시간), 이벤트 이름, 인자 값(문자열로 표시), `Raise()`를 호출한 스크립트와 메서드, Raise 시점의 리스너 수, 실행 시간.

항목을 클릭하면 전체 콜 스택을 볼 수 있다. "누가 이것을 Raise했나?"에 대답할 때 유용하다 — 특히 여러 시스템이 같은 이벤트를 Raise할 수 있을 때:

```
PlayerCombat.TakeDamage() at PlayerCombat.cs:47
  -> Int32GameEvent.Raise(42)
```

이제 데미지 이벤트가 PlayerCombat 시스템의 47번째 줄에서, 인자 42로 온 것을 안다.

**이벤트 이름으로 필터링**하여 특정 이벤트를 실시간으로 관찰한다. `OnKeyPickedUp`으로 설정하고 열쇠 획득 시퀀스를 플레이한다. 있나? 언제 발동했나? 어떤 인자? 없으면, 문제는 업스트림이다 — Raiser가 `Raise()`를 호출하지 않은 것이다. 올바른 데이터와 함께 있으면, 문제는 다운스트림이다 — Listeners 탭을 확인하라.

**시간 범위로 필터링** (마지막 N초) 또는 최소 실행 시간으로 필터링 (스파이크만 표시).

Recent 탭이 "이 이벤트가 실제로 발동했나?"를 추측 게임에서 조회로 바꾼다.

### 탭 4: Statistics — 패턴

Recent가 개별 이벤트를 보여주는 반면, Statistics는 시간에 걸친 집계 동작을 보여준다.

**빈도 분석:** 초당 총 이벤트(실시간), 이벤트별 빈도(초당 및 분당 Raise 수), 분포 히스토그램.

**사용 패턴:** 가장 활발한 이벤트(총 Raise 수 정렬), 가장 비활성인 이벤트(0번 발동 — 가능한 죽은 코드), 가장 바쁜 순간(최고 활동 시간대), 세션 동안의 리스너 증가.

이 탭은 스팟 체크로는 절대 발견하지 못할 것들을 드러낸다. 예를 들어 "가끔" 이벤트라고 생각했던 `OnPositionUpdated`가 실제로는 20개의 리스너와 함께 초당 60회 발동하는 것을 발견한다. 초당 1,200번의 리스너 실행이다. 각각 0.01ms라도, 초당 12ms의 CPU 시간이 하나의 이벤트에 쓰이는 것이다. 모바일에서는 중요하다.

혹은 보스전을 포함한 전체 플레이스루 후에 `OnBossDied`가 0번 Raise된 것을 발견한다. 이벤트가 올바르게 와이어링되지 않았거나, 죽은 코드다. 어쨌든 알고 싶은 것이다.

### 탭 5: Warnings — 자동 건강 점검

Warnings 탭은 이벤트 시스템을 감시하고 문제를 자동으로 플래그한다. 무엇을 찾아야 하는지 알 필요 없다 — 시스템이 안다.

![Monitor Warnings](/img/game-event-system/tools/runtime-monitor/monitor-warnings.png)

**성능 경고:**
- 실행 시간 > 10ms인 이벤트 (빨간색)
- 실행 시간 > 5ms인 이벤트 (노란색)
- Conditional 리스너 없이 초당 100번 이상 Raise되는 이벤트 (노란색)

**리스너 경고:**
- 50개 이상의 리스너가 있는 이벤트 (노란색)
- 100개 이상의 리스너가 있는 이벤트 (빨간색)
- DontDestroyOnLoad이 아닌 오브젝트의 Persistent 리스너 (노란색)

**메모리 경고:**
- GC 할당을 유발하는 이벤트 Raise (노란색)
- GC 할당이 있는 고빈도 이벤트 (빨간색)

**재귀 경고:**
- 이미 처리 중인 이벤트가 다시 Raise됨 (빨간색)
- 순환 트리거/체인 의존성 감지 (빨간색)

각 경고에는 이벤트 이름, 트리거한 특정 메트릭, 제안하는 조치가 포함된다. 단순히 "이건 나쁘다"가 아니라 "실행 횟수를 줄이기 위해 conditional 리스너 추가를 고려하라" 또는 "누락된 RemoveListener 호출을 확인하라" 같은 것이다.

재귀 감지만으로도 값어치가 있다. Event A가 B를 Raise하고 B가 A를 Raise하고... 는 이벤트 기반 시스템에서 가장 골치 아픈 버그 중 하나다. 자동 감지 없이는, 게임이 멈추고 스택이 오버플로우될 때 발견한다. Warnings 탭은 발생하는 즉시 잡아내고 정확히 어떤 이벤트가 관여하는지 알려준다.

### 탭 6: Listeners — 구독 맵

이 탭은 이벤트별, 리스너 타입별로 정리된 모든 활성 리스너 구독을 보여준다.

![Monitor Listeners](/img/game-event-system/tools/runtime-monitor/monitor-listeners.png)

이벤트를 펼쳐서 레이어별로 그룹화된 리스너를 본다:

```
OnPlayerDamaged (12 listeners)
+-- Basic (4)
|   +-- HealthSystem.HandleDamage
|   +-- HitFlash.ShowFlash
|   +-- CameraShake.OnDamage
|   +-- SoundManager.PlayHitSound
+-- Priority (3)
|   +-- [200] ArmorSystem.ReduceDamage
|   +-- [100] HealthSystem.ApplyDamage
|   +-- [25]  HealthUI.RefreshBar
+-- Conditional (2)
|   +-- [cond] BossModifier.ApplyBossMultiplier
|   +-- [cond] CriticalHit.CheckCritical
+-- Persistent (1)
|   +-- AnalyticsManager.TrackDamage
+-- Triggers (1)
|   +-- -> OnScreenShake (delay: 0s)
+-- Chains (1)
    +-- -> OnDamageNumber (delay: 0.1s, duration: 0.5s)
```

**구독 감사:** 예상한 리스너가 실제로 구독되어 있는지 확인. "왜 히트 사운드가 안 나지?" 여기서 확인 — `SoundManager.PlayHitSound`가 나열되어 있나? 없다면, 구독이 누락된 것이다 (아마 라이프사이클 이슈 — 오브젝트가 파괴되고 재생성됐는데 재구독되지 않은 것).

**Priority 확인:** 실행 순서가 맞는지 확인. UI 업데이트(priority 25)가 데이터 변경(priority 100)보다 먼저 처리되고 있다면, priority 값이 뒤집힌 것이다.

**누수 감지:** 파괴됐어야 할 오브젝트에 대한 리스너가 나타나면, 구독 누수를 찾은 것이다. 리스너의 타겟이 오래됐고, `OnDisable`이나 `OnDestroy`에서 `RemoveListener` 호출이 누락된 것이다.

### 탭 7: Automation — 플로우 맵

이 탭은 이벤트 간 연결 — 트리거와 체인 — 을 의존성 그래프로 시각화한다.

![Monitor Automation Tree](/img/game-event-system/tools/runtime-monitor/monitor-automation-tree.png)

트리 뷰에서 각 이벤트를 루트로, 나가는 연결을 자식으로 보여준다:

```
OnBossDefeated
+-- [trigger] -> OnPlayVictoryMusic (delay: 0s)
+-- [trigger] -> OnShowVictoryUI (delay: 1s)
+-- [chain] -> OnSaveProgress (delay: 2s)
    +-- [chain] -> OnLoadNextLevel (delay: 0.5s)
```

"보스가 죽으면 무슨 일이 일어나지?"에 답하기 좋다. 트리를 따라가며 전체 전파 경로를 본다.

두 뷰 모두 Node Editor에서 비주얼하게 설정된 연결("visual" 표시)과 런타임에 프로그래밍 방식으로 생성된 연결("runtime" 표시)을 보여준다. 플로우가 동작하지 않으면, 예상한 연결이 존재하는지 확인하라. "visual"은 있는데 "runtime"이 없다면, 설정은 맞지만 런타임 초기화를 방해하는 무언가가 있는 것이다.

### 탭 8: Details — 딥 다이브

다른 탭에서 어떤 이벤트든 클릭하면 Details 탭이 그 단일 이벤트의 포괄적인 뷰를 연다.

총 Raise 수, 평균/최소/최대 실행 시간, 타입별 현재 리스너 수, Raise당 GC 할당, 마지막 60초간의 빈도, 마지막 Raise 타임스탬프와 인자. 하나의 이벤트 동작을 한눈에 이해하는 데 필요한 모든 것.

핵심 추가 기능: **리스너별 분석.** Performance 탭이 이벤트별 집계 시간을 보여주는 반면, Details 탭은 단일 이벤트 내의 리스너별 시간을 보여준다.

`OnPlayerDamaged`가 10개의 리스너로 평균 3ms라면, Details 탭은 `ArmorSystem.ReduceDamage`가 2.5ms이고 나머지 9개 리스너가 각각 0.05ms라고 알려준다. 이제 정확히 어디를 최적화해야 하는지 안다. 추측 없음, 모든 핸들러에 `Stopwatch` 인스트루먼테이션 추가 없음, `Debug.Log` 타이밍 코드 없음.

리스너 이력 섹션은 시간에 걸친 추가와 제거를 보여준다:

```
[0.0s]  + AddListener: HealthSystem.HandleDamage
[0.0s]  + AddPriorityListener: ArmorSystem.ReduceDamage (200)
[15.3s] - RemoveListener: HealthSystem.HandleDamage
[15.3s] + AddListener: HealthSystem.HandleDamage
[45.0s] + AddConditionalListener: BossModifier.Apply (100)
```

이것은 "팬텀 리스너" 이슈를 디버깅하는 데 도움이 된다 — 오브젝트 라이프사이클 이벤트(씬 로드, 오브젝트 풀링, 활성화/비활성화 순환)로 인해 나타났다 사라지는 리스너.

## 완전한 디버깅 워크플로우

처음의 문 버그로 돌아가 보자. 두 도구를 함께 사용하면, 조사는 이렇게 진행된다:

**단계 1: 재현.** 세이브/로드 후 열쇠를 줍는다. 문이 안 열린다.

**단계 2: Recent Events 확인.** Runtime Monitor의 Recent 탭을 열고, `OnKeyPickedUp`으로 필터링. 있나? **있다** — 타임스탬프 23.4초에 올바른 키 ID와 함께 발동됐다. Raise는 정상이다. 문제는 다운스트림이다.

**단계 3: Listeners 확인.** Listeners 탭으로 전환, `OnKeyPickedUp`을 찾는다. 문의 리스너가 구독되어 있나? **없다** — 빠져있다. 세이브/로드 전에는 있었지만 지금은 없다.

**단계 4: 근본 원인 파악.** 문의 리스너는 `OnEnable`에서 등록된다. 로드 후, 문 오브젝트가 파괴되고 재생성됐지만, 이벤트 데이터베이스가 로딩을 마치기 전에 `OnEnable`이 실행됐다. 리스너가 null 이벤트 참조에 구독하려 한 것이다.

**단계 5: 수정 확인.** 초기화 순서를 고친 후, Event Finder로 `OnKeyPickedUp`을 스캔하고 문의 참조가 녹색(유효)인지 확인. 세이브/로드 순환을 다시 플레이한다. Recent Events 확인 — 이벤트가 발동한다. Listeners 확인 — 문이 구독되어 있다. 문이 열린다. 버그 수정됨.

**총 조사 시간:** 약 90초. `Debug.Log` 없음. 추측 없음. "내 컴퓨터에서는 동작하는데" 없음.

## 에디트 타임 + 플레이 타임 = 완전한 커버리지

Event Finder와 Runtime Monitor는 개발의 서로 다른 단계를 커버하기 때문에 완벽하게 상호 보완적이다:

| 도구 | 단계 | 답하는 질문 |
|------|------|------------|
| **Event Finder** | 에디트 타임 | "이 이벤트를 누가 참조하나?" "이름 변경/삭제해도 안전한가?" "모든 바인딩이 유효한가?" |
| **Monitor Dashboard** | 플레이 타임 | "내 이벤트 시스템이 지금 건강한가?" |
| **Monitor Performance** | 플레이 타임 | "어떤 이벤트가 느리고 왜 그런가?" |
| **Monitor Recent** | 플레이 타임 | "방금 무슨 일이, 어떤 순서로 일어났나?" |
| **Monitor Statistics** | 플레이 타임 | "장기적인 사용 패턴은?" |
| **Monitor Warnings** | 플레이 타임 | "무엇을 걱정해야 하나?" |
| **Monitor Listeners** | 플레이 타임 | "지금 누가 무엇을 리스닝하고 있나?" |
| **Monitor Automation** | 플레이 타임 | "이벤트가 서로 어떻게 연결되어 있나?" |
| **Monitor Details** | 플레이 타임 | "이 하나의 이벤트에 대해 모든 것을 알려줘." |

Event Finder는 리팩토링에 대한 자신감을 준다. Runtime Monitor는 실행 중인 게임이 올바르게 동작하고 있다는 자신감을 준다. 함께하면, 이벤트 기반 아키텍처를 디버깅하기 좌절스럽게 만드는 관측 가능성 갭을 메운다.

이벤트 기반 아키텍처는 강력하다. 하지만 가시성 없는 힘은 찾을 수 없는 버그를 만드는 더 멋진 방법일 뿐이다. 이 도구들이 가시성을 준다. 개발 중에 Dashboard를 열어두라. 리팩토링 세션 전에 Event Finder를 실행하라. 뭔가 이상하게 느껴지면, 어떤 탭을 확인해야 하는지 정확히 알게 될 것이다 — 그리고 답이 기다리고 있을 것이다, 500줄의 `Debug.Log` 출력에 묻혀 있는 것이 아니라.

---

🚀 글로벌 개발자 서비스

**🇨🇳 중국 개발자 커뮤니티**
- 🛒 [Unity 중국 에셋 스토어](https://tinygiants.tech/ges/cn)
- 🎥 [Bilibili 동영상 튜토리얼](https://tinygiants.tech/bilibili)
- 📘 [기술 문서](https://tinygiants.tech/docs/ges)
- 💬 QQ 그룹 (1071507578)

**🌐 글로벌 개발자 커뮤니티**
- 🛒 [Unity Global Asset Store](https://tinygiants.tech/ges)
- 💬 [Discord 커뮤니티](https://tinygiants.tech/discord)
- 🎥 [YouTube 채널](https://tinygiants.tech/youtube)
- 🎮 [Unity 포럼](https://tinygiants.tech/forum/ges)
- 🐙 [GitHub](https://github.com/tinygiants-tech/TinyGiants)

**📧 지원**
- 🌐 [TinyGiants Studio](https://tinygiants.tech)
- ✉️ [지원 이메일](mailto:support@tinygiants.tech)
