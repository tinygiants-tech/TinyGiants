---
slug: event-organization-at-scale
title: '이벤트 200개 돌파: 이벤트 관리가 무너지는 이유'
authors: [tinygiants]
tags: [ges, unity, architecture, best-practices, tutorial]
description: "소규모 프로젝트는 이벤트 관리가 필요 없다. 대규모 프로젝트는 없으면 살아남지 못한다. 규모에서 조직이 왜 무너지는지, 전용 이벤트 매니저는 어떤 모습인지 알아보자."
image: /img/home-page/game-event-system-preview.png
---

새 Unity 프로젝트를 시작한다. 이벤트 10개를 만든다. `OnPlayerDeath`, `OnScoreChanged`, `OnLevelComplete`. 적절한 이름을 붙이고, 폴더에 넣고, 넘어간다. 인생이 좋다. 전체 이벤트 구조를 머릿속에 담을 수 있다.

6개월이 지났다. 이벤트가 200개다. Project 창은 ScriptableObject 파일의 벽이다. `OnPlayerHealthDepleted`가 필요한데 — 아니면 `OnPlayerHPLow`였나? 아니면 `OnPlayerHealthZero`? 전부 `OnPlayer`로 시작하는 이름들을 눈을 가늘게 뜨고 스크롤한다. 3분 후 포기하고 새로 하나 만든다, 원하는 이벤트가 이미 있는지조차 확신이 안 서니까.

모든 이벤트 기반 Unity 프로젝트가 결국 도달하는 곳이다. 이벤트 패턴이 잘못돼서가 아니라, 아무도 규모에서 이벤트를 관리하기 위한 도구를 만들지 않았기 때문이다. Unity는 Animation 창, Shader Graph, Timeline, Input System 디버거를 제공한다. 이벤트에는... Project 창뿐이다.

<!-- truncate -->

## 이벤트 조직 붕괴의 세 단계

이 패턴이 반복되는 걸 충분히 봐서 예측 가능하다는 걸 안다. 세 단계가 있고, 다음 단계로 넘어가기 전까지는 각 단계가 괜찮게 느껴진다.

### 1단계: 소규모 프로젝트 (이벤트 10-20개)

전부 외울 수 있다. 이 이벤트들을 만든 게 나다. 이름을 안다. 어떤 타입을 전달하는지 안다. 한눈에 전부 보이니까 Project 창이 완벽히 적절한 브라우저다.

네이밍 컨벤션? 불필요 — 전부 기억한다. 문서? 머릿속에 있다. 검색? 0.5초만 스크롤하면 된다.

이 단계는 솔로 프로젝트에서 2-3개월, 팀에서는 2-3주 정도 지속된다.

### 2단계: 중규모 프로젝트 (이벤트 50-100개)

이름이 헷갈리기 시작한다. 인벤토리 이벤트가 `OnItemPickedUp`이었나 `OnItemCollected`였나? 첫 번째를 잊어서 둘 다 만들었다. Project 창에서 이제 진짜 스크롤이 필요하고, 본능적으로 검색 바에 타이핑하기 시작한다.

네이밍 컨벤션을 도입한다. `On[주어][동사]` — `OnPlayerDamaged`, `OnEnemySpawned`, `OnUIMenuOpened`. 도움이 된다. 한동안.

이 단계의 진짜 고통은 메타데이터의 부재다. 폴더에 이벤트 파일 80개가 보인다. 어떤 것이 `SingleGameEvent`인가? 어떤 것이 `Int32GameEvent`인가? 어떤 것이 커스텀 페이로드 타입을 전달하는가? 파일 이름으로는 알 수 없다. 하나씩 클릭해서 Inspector를 확인해야 한다. 전투 관련 이벤트를 전부 찾아야 하는가? 일관되게 이름을 지었기를 바라라, 필터링할 다른 방법이 없으니까.

### 3단계: 대규모 프로젝트 (이벤트 200개 이상)

플랫 파일 목록이 이제 생산성에 적극적으로 적대적이다. 네이밍 컨벤션이 표류했다(개발자 3명, 미묘하게 다른 네이밍 스타일 3개). 폴더 조직이 어느 정도 도움이 되지만, 폴더는 타입 정보, 사용 현황, 크로스 레퍼런스를 제공하지 않는다.

아무도 빠르게 답할 수 없는 질문들:
- 리스너가 0개인 이벤트는? (정신적 공간을 낭비하는 죽은 이벤트)
- 발생되지만 아무도 듣지 않는 이벤트는? (고아 브로드캐스트)
- Combat 모듈이 실제로 소유한 이벤트가 몇 개인가?
- 지난 스프린트에서 변경된 이벤트는?

스프레드시트를 관리하기 시작한다. 또는 위키 페이지. 또는 README. 크런치 중에 아무도 문서를 업데이트하지 않기 때문에 일주일 안에 상해진다.

팀이라면? Git 병합 충돌. 이벤트를 추가하거나 수정하는 모든 개발자가 같은 컨테이너 에셋을 건드린다. Unity의 직렬화된 YAML에서 병합 충돌을 해결하는 것은 지루하고, 에러가 쉽고, 가끔 데이터를 손상시킨다.

## 기존 솔루션 (그리고 왜 상해지는가)

팀은 멍청하지 않다. 이걸 해결하려 시도한다. 내가 본 것들:

**네이밍 컨벤션.** 유용하지만 불충분하다. 컨벤션은 이벤트의 이름을 알려준다. 타입, 상태, 리스너, 소유 모듈은 알려주지 않는다. 그리고 컨벤션은 표류한다 — 신입이 스타일 가이드를 안 읽고, 갑자기 `OnEnemyDied` 옆에 `OnEnemyDeath` 옆에 `OnEnemyKilled`가 있다.

**폴더 구조.** 낫다. `Events/Combat/`, `Events/UI/`, `Events/Audio/`. 하지만 폴더는 정적이다. 이벤트를 폴더 간에 이동하면 참조가 깨질 수 있다(직렬화 방식에 따라). 타입별 필터링, 폴더 간 빠른 검색, 상태 한눈에 보기가 여전히 불가능하다.

**README / 스프레드시트 문서.** 상해진다. 항상. "이벤트 생성"과 "스프레드시트 업데이트" 사이의 간격은 정확히 하나의 인간 판단이고, 그 판단은 "나중에 하지." 나중은 오지 않는다.

**커스텀 ScriptableObject 컨테이너.** 일부 팀이 모든 이벤트를 참조하는 단일 MonoBehaviour나 ScriptableObject를 만든다. 접근을 중앙화하지만 병목을 만든다 — 모두가 같은 파일을 편집한다. 그리고 이것도 그냥 다른 형태의 플랫 리스트일 뿐이다.

근본 문제는 Unity가 이벤트를 다른 에셋과 같이 취급한다는 것이다. 하지만 이벤트는 다른 에셋과 다르다. 이벤트는 게임의 신경 시스템이다. 애니메이션이 Animation 창을 갖고 셰이더가 Shader Graph를 갖는 것처럼 자체 관리 도구가 필요하다.

## Multi-Database 아키텍처: 분할 정복

GES는 조직 문제를 구조적 수준에서 해결한다. Multi-Database 아키텍처다. 관리 불가능해질 때까지 커지는 이벤트 컨테이너 하나 대신, 이벤트를 여러 독립 데이터베이스로 분할한다 — 각각이 자체 컬렉션을 관리하는 별도의 ScriptableObject 에셋이다.

![Multi Database Manager](/img/game-event-system/examples/12-multi-database/demo-12-manager.png)

C#의 네임스페이스처럼 생각하면 된다. 각 데이터베이스가 경계다:

- **Core** — 게임 라이프사이클 (시작, 일시정지, 저장, 로드) — 이벤트 15-20개
- **UI** — 메뉴, HUD, 대화상자, 툴팁 — 이벤트 30-40개
- **Audio** — 음악, SFX, 앰비언트, 볼륨 변경 — 이벤트 15-20개
- **Combat** — 데미지, 사망, 스폰, 버프, 디버프 — 이벤트 20-25개
- **Inventory** — 획득, 버리기, 장착, 제작 — 이벤트 15-20개
- **Quest** — 수락, 진행, 완료, 실패 — 이벤트 10-15개

UI 개발자가 이벤트 드롭다운을 열면 UI 이벤트 30개가 보인다 — 게임의 모든 시스템에서 온 200개가 아니다. 인지 부하가 한 차수만큼 줄어든다.

![Database Assets](/img/game-event-system/examples/12-multi-database/demo-12-assets.png)

### GUID 기반 참조: 재조직은 항상 안전하다

전체 Multi-Database 아키텍처는 하나의 핵심 기능에 기반한다: 모든 이벤트가 어떤 데이터베이스에 속하든, 이름이 뭐든, 프로젝트 어디에 파일이 있든 절대 변하지 않는 전역 고유 식별자를 가진다.

이것은 재조직이 무서운 작업이 아니라 일상적인 유지보수가 된다는 뜻이다:

- **비대해진 데이터베이스 분할:** "Gameplay"가 이벤트 80개로 커졌다면? "Player," "Combat," "World"로 분할. 이벤트를 옮기면 모든 리스너 참조가 살아남는다.
- **세분화된 데이터베이스 병합:** "Weather"와 "TimeOfDay"가 각각 5개 이벤트면? "World"로 병합. 모든 참조가 살아남는다.
- **명확성을 위한 이름 변경:** `OnEvt_PlrHP_Chg`가 `OnPlayerHealthChanged`가 된다. 모든 참조가 살아남는다.
- **폴더 재조직:** `Assets/Events/`를 `Assets/Data/GameEvents/`로 이동. 모든 참조가 살아남는다.

GUID 보호 없이 200개 이벤트를 재조직하면 수백 개의 리스너 바인딩이 깨질 수 있다. GUID가 있으면 자유롭게 구조를 변경할 수 있다.

### 동적 런타임 로딩

모든 데이터베이스가 항상 메모리에 있을 필요는 없다. 로비 화면에는 전투 이벤트가 필요 없다. 컷씬에는 인벤토리 이벤트가 필요 없다. GES는 런타임에 데이터베이스 로딩/언로딩을 지원한다:

```csharp
public class SceneEventLoader : MonoBehaviour
{
    [SerializeField] private GameEventManager eventManager;
    [SerializeField] private GameEventDatabase combatDatabase;

    public void OnEnterCombatScene()
    {
        eventManager.LoadDatabase(combatDatabase);
    }

    public void OnExitCombatScene()
    {
        eventManager.UnloadDatabase(combatDatabase);
    }
}
```

이것은 모듈식 콘텐츠도 가능하게 한다. DLC가 자체 `DragonEvents.asset` 데이터베이스를 추가하면 — 코드 변경 없이 기본 게임의 이벤트 시스템과 매끄럽게 통합된다.

### 팀 협업: 병합 충돌 제로

별도의 데이터베이스로, 4명의 개발자가 동시에 작업해도 4개의 다른 파일을 건드린다:

```
Developer A: adds OnQuestAccepted to QuestEvents.asset
Developer B: adds OnItemCrafted to InventoryEvents.asset
Developer C: modifies OnPlayerDamaged in CombatEvents.asset
Developer D: adds OnNPCDialogueStarted to SocialEvents.asset
```

충돌 제로. 4명 모두가 같은 파일을 수정해서 3명이 직렬화된 YAML의 병합 충돌을 겪는 단일 컨테이너와 비교해보라.

![Manager Databases](/img/game-event-system/visual-workflow/game-event-manager/manager-databases.png)

## Event Editor: 전용 관리 도구

이벤트를 데이터베이스로 분할하면 구조적 문제가 해결된다. 하지만 개별 이벤트를 효율적으로 찾고, 검사하고, 관리할 방법이 여전히 필요하다. 여기서 Event Editor가 등장한다 — 규모에서의 이벤트 관리를 위해 전용으로 만들어진 창이다.

![Event Editor Full Window](/img/game-event-system/visual-workflow/game-event-editor/editor-window-full.png)

### 3중 필터링

Event Editor의 툴바는 서로 조합되는 세 개의 독립 필터를 제공한다:

![Editor Toolbar](/img/game-event-system/visual-workflow/game-event-editor/editor-toolbar.png)

**레이어 1: 카테고리.** 모든 이벤트는 데이터베이스 내에서 카테고리를 태깅할 수 있다. 전투 이벤트에는 "Damage," "Death," "Spawn," "Buffs" 같은 카테고리가 있을 수 있다. 툴바의 카테고리를 클릭하면 해당 카테고리의 이벤트만 보인다. 카테고리가 플랫 리스트를 탐색 가능한 트리로 바꾼다.

**레이어 2: 타입.** 이벤트 타입으로 필터링 — `SingleGameEvent`만, `Int32GameEvent`만, 커스텀 페이로드 타입만 보기. float 이벤트가 필요한데 이름이 기억 안 날 때, 타입 필터링 한 번이면 찾을 수 있다.

**레이어 3: 검색.** 보이는 모든 이벤트에 걸친 퍼지 텍스트 검색. "plyr dmg"를 치면 `OnPlayerDamaged`를 찾는다. "boss die"를 치면 `OnBossDeath`를 찾는다. 검색은 서브밀리초이고 관대하다 — 정확한 이름이 필요 없다.

이 세 레이어가 조합된다: 카테고리 "Combat" AND 타입 "SingleGameEvent" AND 검색 "crit"가 200개 이벤트를 찾는 2-3개로 즉시 좁힌다.

![Editor Dropdown](/img/game-event-system/examples/12-multi-database/demo-12-editor-dropdown.png)

### 색상 코딩된 Behavior 상태

에디터의 각 이벤트 행은 Behavior 설정에 대한 색상 코딩된 상태 표시기를 보여준다:

- **초록색:** 이벤트에 활성 Behavior가 설정됨 — 리스너가 설정되어 준비됨
- **파란색:** 이벤트가 존재하지만 Behavior가 아직 없음 — 정의됐지만 연결 안 됨
- **주황색:** 이벤트에 Behavior가 있지만 일부에 경고나 불완전한 설정이 있음

한눈에 데이터베이스를 스캔하고 주의가 필요한 이벤트를 발견할 수 있다. Behavior가 없는 파란색 이벤트는 쓸데없는 무게일 수 있다. 주황색 이벤트는 설정 수정이 필요하다. 초록색 이벤트는 정상이다.

### 데이터베이스 전환

툴바의 데이터베이스 스위처로 즉시 데이터베이스를 전환할 수 있다. Combat에서 작업하면서 Audio 데이터베이스의 뭔가를 확인해야 할 때? 한 번 클릭. 필터 상태가 데이터베이스별로 유지되므로 돌아가면 이전 뷰가 복원된다.

![Database Switch](/img/game-event-system/visual-workflow/game-event-editor/editor-database-switch.png)

### 배치 작업

규모에서 재조직할 때 개별 작업은 너무 느리다. Event Editor는 여러 이벤트에 걸친 배치 모드를 지원한다:

![Batch Operations](/img/game-event-system/visual-workflow/game-event-editor/editor-batch-mode.png)

여러 이벤트를 선택한 다음 일괄 작업 적용: 카테고리 변경, 다른 데이터베이스로 이동, 미사용 이벤트 삭제. 개별 Inspector 패널을 클릭하면 30분 걸릴 일이 배치 모드에서 30초다.

## 이것이 가능하게 하는 일상 워크플로우

이 도구가 갖춰졌을 때 이벤트 관리가 어떤 모습인지 실전으로 그려보자.

**아침 스탠드업에서 새로운 "콤보 시스템" 기능을 언급한다.** Event Editor를 열고, Combat 데이터베이스로 전환하고, 기존 이벤트를 확인한다. 이미 `OnPlayerAttack`과 `OnDamageDealt`가 있다. `OnComboStarted`, `OnComboHit`, `OnComboFinished`가 필요하다. 에디터에서 만들고, "Combo" 카테고리를 할당한다. 60초면 끝.

**디자이너가 "플레이어가 데미지를 받을 때 어떤 이벤트가 발생하나요?"라고 묻는다.** Event Editor를 연다. "damage"를 검색한다. 모든 데이터베이스에 걸친 데미지 관련 이벤트가 전부 보인다. 하나를 클릭하면 Behavior 설정이 보인다 — 뭐가 듣고 있는지, 어떤 조건이 응답을 제한하는지. 코드 파일을 grep하는 대신 15초면 답이 나온다.

**분기별 정리.** 상태로 필터링: 파란색 (Behavior 없음). 존재하지만 아무것도 듣지 않는 이벤트다. 각각 검토한다 — 미래 기능을 위해 계획된 것인가, 제거된 시스템의 잔해인가? 죽은 것들을 일괄 삭제한다. 이벤트 아키텍처가 군더더기 없이 유지된다.

**새 팀원 온보딩.** "Event Editor를 열어보세요. 각 데이터베이스를 전환해보세요. 카테고리 구조가 각 모듈에 어떤 이벤트가 있는지 보여줍니다. 아무 이벤트나 클릭하면 Behavior 설정이 보입니다. 초록은 활성, 파란은 미사용, 주황은 주의 필요." 5분이면 이벤트 아키텍처를 이해한다. "Project 창에서 200개의 ScriptableObject 에셋을 읽어보고 네이밍 컨벤션이 이해가 되길 바라세요"와 비교해보라.

## 스케일링 전략

프로젝트가 커짐에 따라 잘 작동하는 패턴들:

**데이터베이스 2-3개로 시작하고, 필요할 때 분할하라.** 첫날부터 10개를 만들지 마라. Core, UI, Gameplay로 시작하라. Gameplay가 40개를 넘으면 Combat, Inventory, Quest로 분할하라. GUID 참조가 분할을 고통 없게 만든다.

**데이터베이스 소유권을 팀 구조에 맞춰라.** 전투 프로그래머가 CombatEvents를 소유한다. UI 개발자가 UIEvents를 소유한다. 새 이벤트가 필요하면 어떤 데이터베이스에 속하는지, 누구와 조율해야 하는지 안다.

**카테고리를 서브 네임스페이스로 사용하라.** 카테고리가 있는(Damage, Death, Spawn, Buffs, Status) 40개 이벤트 Combat 데이터베이스는 카테고리 없는 10개 이벤트 데이터베이스만큼 탐색하기 쉽다.

**이벤트 사용 현황을 정기적으로 점검하라.** Event Editor의 상태 표시기가 이것을 쉽게 만든다. 주기적으로 죽은 이벤트(파란색 상태, 발생되지 않음), 고아 리스너(이벤트가 발생되지만 응답 없음), 중복(같은 목적의 이벤트 두 개)을 스캔하라. 아키텍처를 가볍게 유지하라.

**크로스 데이터베이스 의존성을 문서화하라.** Player 데이터베이스의 `OnPlayerDeath`가 Combat, UI, Audio, Quest에서 응답을 트리거한다. GES는 모듈 경계를 강제하지 않는다 — 어떤 리스너든 로딩된 어떤 데이터베이스의 어떤 이벤트를 참조할 수 있다 — 하지만 교차 관심사를 아는 것이 유지보수에 도움이 된다.

## 조직이 만드는 차이

200개 이벤트 프로젝트가 관리 가능한 것과 악몽인 것의 차이는 이벤트 수가 아니다. 이벤트 관리 전용으로 만들어진 구조와 도구가 있느냐, Project 창과 네이밍 컨벤션과 희망에 의존하느냐의 차이다.

Multi-Database 아키텍처가 구조를 제공한다: 모듈식 경계, 안전한 재조직, 병합 충돌 제로, 동적 로딩. Event Editor가 도구를 제공한다: 3중 필터링, 퍼지 검색, 색상 코딩된 상태, 배치 작업, 즉시 데이터베이스 전환.

소규모 프로젝트에는 이 중 어떤 것도 필요 없다. 하지만 이벤트 에셋의 플랫 리스트를 스크롤하면서 "더 나은 방법이 있을 텐데"라고 생각한 적이 있다면 — 있다. 그리고 가장 좋은 점은 점진적으로 도입할 수 있다는 것이다. 데이터베이스 하나로 시작하라. 감당이 안 될 때 분할하라. GUID 시스템이 초기 조직에 갇히지 않게 해준다.

200개 이벤트 프로젝트를 유지보수하는 미래의 자신이 감사할 것이다. 이벤트 아키텍처를 이해하려는 팀원들은 더더욱.

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
