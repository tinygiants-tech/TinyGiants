---
slug: five-minute-quickstart
title: '5분 만에 시작하기: 첫 번째 이벤트 드리븐 시스템 구축'
authors: [tinygiants]
tags: [ges, unity, tutorial, beginner]
description: "Game Event System을 Unity 프로젝트에서 빠르게 시작하는 실전 가이드. 설치부터 첫 번째 동작하는 이벤트까지 5분이면 충분하다."
image: /img/home-page/game-event-system-preview.png
---

"시간 5분밖에 없어요. 이벤트 시스템 동작하는 것만 보여주세요."

그래, 충분하다. 이론 없고, 아키텍처 딥다이브 없고, 다른 접근법과의 비교도 없다. Unity 프로젝트에서 제로부터 동작하는 이벤트 기반 인터랙션까지, 빠르게 하고 싶다. 가보자.

이 가이드는 Unity 프로젝트가 열려있고(2021.3 LTS 이상) 약 5분이 있다고 가정한다. 끝나면, 게임에서 뭔가 일어났을 때 발생하는 이벤트가 완전히 별개의 GameObject에서 응답을 트리거하는 것을 갖게 된다 — 둘 사이에 직접 참조 제로.

<!-- truncate -->

## Step 1: Asset Store에서 GES 설치 (60초)

Game Event System의 Unity Asset Store 페이지를 연다. "Add to My Assets"를 클릭한 다음, Unity에서 Package Manager를 열고(Window > Package Manager), "My Assets"에서 GES를 찾아 Import를 누른다.

임포트가 완료되면 프로젝트에 `TinyGiants` 폴더가 보일 것이다. 컴파일러 에러가 나면 Unity 2021.3 이상인지 확인하라.

![Installation Success](/img/game-event-system/intro/installation/install-step-3-success.png)

설치는 이게 끝이다. 추가 의존성 없고, assembly definition 충돌 해결 없고, 설정 마법사 없다.

## Step 2: Dashboard 열고 초기화 (30초)

Unity 메뉴 바에서: **Tools > TinyGiants > Game Event System**. GES Dashboard가 열린다.

처음 열면 "Uninitialized" 상태가 보인다. 시스템이 핵심 ScriptableObject 에셋 — 이벤트 매니저와 기본 이벤트 데이터베이스 — 를 생성해야 한다.

![Dashboard Uninitialized](/img/game-event-system/examples/00-quick-start/uninitialized.png)

**Initialize** 버튼을 클릭한다. GES가 프로젝트에 필요한 에셋을 생성하고 기본 설정을 구성한다. 대시보드가 이벤트 매니저가 준비된 초기화 상태로 전환되는 것을 볼 수 있다.

![Dashboard Initialized](/img/game-event-system/examples/00-quick-start/initialized.png)

이제 `GameEventManager`를 씬에 추가한다. 매니저 에셋을 하이어라키에 드래그하거나, 빈 GameObject를 만들고 `GameEventManager` 컴포넌트를 추가하면 된다. 필요하면 대시보드가 안내해줄 것이다.

![Manager Setup](/img/game-event-system/intro/installation/install-step-4-manager.png)

## Step 3: 첫 번째 이벤트 만들기 (45초)

간단한 void 이벤트를 만들자 — 데이터 없이 "뭔가 일어났다"라고 말하는 이벤트. "OnButtonPressed"라고 부르겠다.

GES Event Editor(대시보드에서 접근하거나 **Tools > TinyGiants > Event Editor**)에서 **"+ New Event"** 버튼을 클릭한다. Creator Window가 열린다. 이벤트 타입으로 **Parameterless (Void)**를 선택한다. 이름을 `OnButtonPressed`로 지정하고 Create를 클릭한다.

![Creator](/img/game-event-system/visual-workflow/game-event-creator/creator-parameterless.png)

시스템이 새 ScriptableObject 에셋을 생성한다 — 이벤트가 이제 프로젝트에서 드래그하고 참조할 수 있는 에셋으로 존재한다. Event Editor 창에서 GUID, 현재 리스너 수, 설정 옵션과 함께 볼 수 있다.

## Step 4: 코드에서 이벤트 발생시키기 (90초)

`ButtonPresser.cs`라는 새 C# 스크립트를 만든다. 이 스크립트가 메서드를 호출할 때(또는 UI 버튼 클릭이나 트리거 등 원하는 대로) 이벤트를 발생시킬 것이다.

```csharp
using UnityEngine;
using TinyGiants.GES;

public class ButtonPresser : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent onButtonPressed;

    // Call this from a UI Button's OnClick, or from Update, or from anywhere
    public void PressTheButton()
    {
        Debug.Log("Button pressed! Raising event...");
        onButtonPressed.Raise();
    }

    // For testing: press Space to trigger
    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            PressTheButton();
        }
    }
}
```

씬에 빈 GameObject를 만든다. "EventSender"라 부른다. `ButtonPresser` 컴포넌트를 추가한다.

중요한 부분: Inspector에서 `onButtonPressed` 필드가 **검색 가능한 드롭다운**으로 표시된다(`[GameEventDropdown]` 덕분에). 클릭하면 활성 데이터베이스의 모든 void 이벤트 목록이 보인다. `OnButtonPressed`를 찾아서 선택 — 끝. Project 창을 뒤질 필요도, 수동 드래그도 없다.

송신 측은 이것으로 끝이다. `PressTheButton()`이 호출되면 이벤트가 발생한다. 송신자는 누가 듣고 있는지 모르고, 신경 쓰지도 않는다.

## Step 5: Inspector에서 응답 바인딩 (90초)

이벤트에 응답하는 것을 만들자. `ButtonResponder.cs`라는 스크립트를 만든다:

```csharp
using UnityEngine;

public class ButtonResponder : MonoBehaviour
{
    public void RespondToButton()
    {
        Debug.Log("I heard the button press! Responding...");
        // Do anything here: play a sound, move an object, show UI, etc.
    }

    public void FlashColor()
    {
        var renderer = GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.material.color = Random.ColorHSV();
        }
    }
}
```

수신자를 설정한다:

1. 씬에 **3D Cube**를 만든다(GameObject > 3D Object > Cube). "Responder"라고 이름 짓는다.
2. Cube에 `ButtonResponder` 컴포넌트를 추가한다.
3. `OnButtonPressed` 이벤트의 **Behavior Window**를 연다. Event Editor에서 이벤트의 Behavior 버튼을 클릭하면 된다.

Behavior Window에서 **Event Action**을 설정한다:

- Cube를 대상 오브젝트 슬롯에 드래그하고, `ButtonResponder > RespondToButton`(또는 시각적 응답을 원하면 `ButtonResponder > FlashColor`)을 선택한다

![Hierarchy Setup](/img/game-event-system/visual-workflow/game-event-behavior/behavior-action-add.png)

하이어라키는 이제 이런 모습이어야 한다:
- **EventSender** (`ButtonPresser` 컴포넌트, 이벤트 에셋 참조)
- **Responder** (`ButtonResponder` 컴포넌트)

두 오브젝트 모두 서로에 대한 직접 참조가 없다. 공유 이벤트 에셋을 통해서만 통신한다.

## Step 6: Play 누르고 확인 (15초)

Play를 누른다. Space를 누른다(또는 설정한 트리거). 이런 것이 보여야 한다:

1. 콘솔에 "Button pressed! Raising event..." 출력
2. 콘솔에 "I heard the button press! Responding..." 출력
3. `FlashColor`를 사용했다면 큐브 색이 변경

끝이다. 동작하는 이벤트 기반 시스템이 완성됐다. 송신자가 이벤트를 발생시켰다. 수신자가 응답했다. 둘 다 상대방의 존재를 모른다.

### 빠른 검증 체크리스트

- 이벤트가 발생하고 응답이 트리거됨: 동작
- Responder 오브젝트를 삭제하고 Space를 누름: 송신자가 여전히 동작(null reference 에러 없음, 그냥 허공에 발생)
- Responder를 복제: 두 복사본 모두 같은 이벤트에 응답(자동 멀티 리스너 지원)
- 다른 씬의 오브젝트에 리스너를 추가(멀티 씬 설정이 있다면): 여전히 동작(크로스 씬 통신 무료)

## 추가 응답 추가 (코드 변경 없이)

이 패턴의 위력이 분명해지는 부분이다. 버튼을 누를 때 사운드 이펙트를 추가하고 싶다면?

1. "AudioResponder"라는 빈 GameObject를 만든다
2. `AudioSource` 컴포넌트를 추가한다
3. `OnButtonPressed` 이벤트의 **Behavior Window**를 연다
4. 새 Event Action 추가: AudioResponder GameObject를 드래그하고 `AudioSource.Play()`를 선택

끝. `ButtonPresser.cs`를 건드리지 않았다. Responder 큐브를 수정하지 않았다. 같은 이벤트의 behavior에 새 액션을 추가했을 뿐이다. 시스템이 완전히 디커플링되어 있다 — 새 응답 추가가 기존 코드의 변경 제로를 요구한다.

파티클 이펙트를 추가하고 싶다면? 같은 프로세스. 카메라 흔들림? 같은 프로세스. 애널리틱스 로깅? 같은 프로세스. 각 새 응답은 같은 이벤트의 Behavior Window에서 설정하는 독립적인 Event Action이다.

## 이벤트에 데이터 전달하기

방금 만든 void 이벤트는 가장 단순한 타입이다. 하지만 대부분의 실제 이벤트는 데이터를 전달한다 — "플레이어가 25 데미지를 받았다" 또는 "점수가 이제 1500이다."

타입 이벤트를 간단히 미리보자. GES는 일반적인 데이터에 대한 사전 생성 타입을 제공한다:

```csharp
using UnityEngine;
using TinyGiants.GES;

public class ScoreManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onScoreChanged;  // Pre-generated type

    private int currentScore;

    public void AddScore(int points)
    {
        currentScore += points;
        onScoreChanged.Raise(currentScore);  // Passes the int value with the event
    }
}
```

리스너 측에서 응답 메서드가 데이터를 받는다:

```csharp
public class ScoreDisplay : MonoBehaviour
{
    [SerializeField] private TMP_Text scoreText;

    // This method is wired up via the Behavior Window's Event Action
    public void UpdateDisplay(int newScore)
    {
        scoreText.text = $"Score: {newScore}";
    }
}
```

타입 이벤트의 응답도 Behavior Window에서 동일한 방식으로 설정한다. 응답 메서드가 타입이 지정된 매개변수를 자동으로 받는다.

## 흔한 첫 질문들

**Q: 모든 씬에 GameEventManager가 필요한가요?**
A: 첫 번째 로딩 씬에 하나 필요하다. 지속 "Bootstrap" 씬이나 DontDestroyOnLoad 패턴을 쓴다면 거기에 넣으면 된다. 단일 씬 게임이면 그 씬에 추가하면 된다.

**Q: 리스너가 없는 이벤트를 발생시키면 어떻게 되나요?**
A: 아무 일도 안 일어난다. 에러 없고, 경고 없고, 성능 비용 없다. 이벤트가 발생하고 아무도 응답하지 않는다. 의도된 설계다 — 리스너가 존재하기 전에 안전하게 시스템에 이벤트를 추가할 수 있다는 뜻이다.

**Q: Behavior Window 대신 코드에서 이벤트를 수신할 수 있나요?**
A: 물론이다. `AddListener`/`RemoveListener`로 프로그래밍 방식으로 리스너를 등록할 수 있다:

```csharp
[GameEventDropdown, SerializeField] private GameEvent onButtonPressed;

private void OnEnable()
{
    onButtonPressed.AddListener(OnButtonPressed);
}

private void OnDisable()
{
    onButtonPressed.RemoveListener(OnButtonPressed);
}

private void OnButtonPressed()
{
    Debug.Log("Button pressed!");
}
```

Behavior Window 방식이 대부분의 경우 권장되는데, 더 가시적이고 디버그하기 쉽기 때문이다. 하지만 동적 시나리오를 위한 코드 기반 리스너도 완전 지원된다.

**Q: 코드 없이 Inspector에서 이벤트를 발생시킬 수 있나요?**
A: 가능하다. 이벤트 에셋의 Inspector에 "Raise" 버튼이 있다. 테스트에 좋다 — 실제 게임 조건을 재현하지 않고도 게임 실행 중 아무 이벤트나 수동으로 트리거해서 리스너가 어떻게 응답하는지 볼 수 있다.

**Q: 어떤 이벤트가 발생하는지 어떻게 디버그하나요?**
A: GES에 모든 활성 이벤트, 리스너 수, 발생/수신 작업의 라이브 로그를 보여주는 Runtime Monitor 도구가 포함되어 있다. 게임 플레이 중 GES 대시보드에서 열 수 있다.

## 다음 단계: 학습 경로

기본이 동작하니, 더 깊이 들어가기 위한 권장 순서다:

### 1주차: 기본 마스터
- 게임의 핵심 인터랙션을 위한 void 이벤트 5-10개 만들기(게임 시작, 게임 오버, 일시정지, 재개, 레벨 완료)
- 패턴 연습: 이벤트 에셋 + 송신자 + 리스너
- Inspector 워크플로우에 익숙해지기

### 2주차: 타입 이벤트
- 데이터를 전달하는 이벤트에 사전 생성 타입(int, float, string, Vector3) 사용
- 체력 시스템 만들기: 체력 변경에 `FloatGameEvent`, 사망에 `GameEvent`
- 점수 시스템 만들기: 점수 업데이트에 `IntGameEvent`

### 3주차: 커스텀 타입
- 게임 전용 이벤트를 위한 커스텀 데이터 struct 정의
- Event Editor를 열고, "+ New Event"를 클릭하고, Creator에서 커스텀 타입 선택 — 필요한 코드를 자동 생성
- 커스텀 타입 이벤트를 사용한 완전한 기능 구현

### 4주차: 조건 트리와 비주얼 플로우
- 리스너에 조건 추가: "플레이어가 살아있을 때만 응답"
- AND/OR 로직으로 비주얼 조건 트리 만들기
- 다단계 이벤트 응답을 위한 flow 시스템 사용

### 5주차: 규모에서의 조직
- 프로젝트 모듈을 위한 Multi-Database 아키텍처 설정
- 카테고리 기반 조직 구현
- 씬 전용 이벤트를 위한 동적 데이터베이스 로딩 설정

### 지속: 프로덕션 패턴
- 플레이 모드에서 이벤트 흐름 디버깅에 Runtime Monitor 사용
- 인스턴스별 추적을 위한 Sender 이벤트 구현
- 크로스 씬 통신 패턴 구축
- GES 성능 도구로 프로파일링 및 최적화

## 5분 요약

우리가 한 모든 것을 순서대로:

1. Asset Store에서 GES **설치**
2. Dashboard를 통해 시스템 **초기화**
3. void 이벤트 에셋 **생성** (`OnButtonPressed`)
4. 이벤트를 발생시키는 **송신자** 스크립트 작성
5. Behavior Window에서 같은 이벤트에 대한 Event Action을 설정하여 **수신자** 구성
6. **Play** 누르고 동작 확인

총 시간: 약 5분. 총 코드 줄 수: 약 15줄(송신자 스크립트). 송신자와 수신자 사이의 직접 참조: 제로.

이것이 GES를 사용한 이벤트 기반 아키텍처의 핵심이다. 나머지 모든 것 — 타입 이벤트, 조건, 비주얼 플로우, Multi-Database 조직 — 은 이 동일한 기본 패턴 위에 구축된다: **이벤트 에셋이 송신자와 수신자 사이에 위치하고, 양쪽 모두 상대방의 존재를 모른다.**

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
