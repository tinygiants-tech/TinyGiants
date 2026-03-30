---
slug: visual-condition-logic
title: 'if-else 지옥 탈출: 비주얼 조건 로직의 올바른 접근법'
authors: [tinygiants]
tags: [ges, unity, condition-tree, visual-workflow, advanced]
description: "게임 조건은 단순하게 시작해서 괴물처럼 커집니다. 흩어진 if-else 체인, 결합된 데이터 소스, 디자이너 접근 불가. 비주얼 조건 로직이 이 문제를 어떻게 해결하는지 알아봅니다."
image: /img/home-page/game-event-system-preview.png
---

모든 게임은 기본적으로 거대한 조건의 더미입니다. "적이 면역이 아니고 AND 플레이어에게 화염 버프가 있고 AND 랜덤 크리티컬 체크를 통과할 때만 화염 데미지를 준다." 프로토타이핑할 때는 콜백에 if문 하나 넣고 넘어갑니다. 30초. 동작함. 생산적인 느낌.

그러다 프로토타입이 프로덕션에 들어갑니다. 30초짜리 if문들이 번식하기 시작합니다. 하나가 다섯이 되고, 다섯이 오십이 되고, 오십이 "두 번째 보스의 루트 드롭률을 제어하는 조건이 대체 어디있지?"가 됩니다. 그리고 디자이너가 뒤에 서서 데미지 임계값을 0.3에서 0.25로 바꿀 수 있냐고 물어보고 있고, 당신은 리컴파일이 필요하다고 설명하고 있습니다.

if-else 지옥에 오신 것을 환영합니다. 인구: 3개월 넘게 유지된 모든 Unity 프로젝트.

<!-- truncate -->

## 왜 if-else는 게임에서 확장되지 않는가

불편할 정도로 익숙할 수 있는 상황을 그려보겠습니다. 전투 시스템이 있습니다. 무언가가 맞으면 데미지 이벤트가 발생합니다. 조건을 추가하고 싶습니다: "데미지가 대상 최대 HP의 30%를 초과할 때만 경직 애니메이션을 재생." 쉽습니다:

```csharp
public void OnDamageReceived(DamageInfo info)
{
    float threshold = info.target.GetComponent<Health>().maxHP * 0.3f;
    if (info.damage > threshold)
    {
        PlayStaggerAnimation(info.target);
    }
}
```

끝. 출시. 다음으로.

2주 후, 디자이너가 들립니다. "대상이 방어 중이 아닌지도 체크할 수 있을까요? 그리고 이미 경직 상태가 아닌지? 아, 보스는 경직에 완전 면역이어야 해요."

```csharp
public void OnDamageReceived(DamageInfo info)
{
    float threshold = info.target.GetComponent<Health>().maxHP * 0.3f;
    var combat = info.target.GetComponent<CombatState>();
    var enemyData = info.target.GetComponent<EnemyData>();

    if (info.damage > threshold &&
        !combat.isBlocking &&
        !combat.isStaggered &&
        enemyData.rank != EnemyRank.Boss)
    {
        PlayStaggerAnimation(info.target);
    }
}
```

새로운 컴포넌트 의존성이 세 개. `DamageInfo`만 필요하던 메서드가 이제 `Health`, `CombatState`, `EnemyData`에 손을 뻗습니다. 이 컴포넌트 중 하나라도 리팩토링하면 깨집니다. 그리고 디자이너가 0.3을 0.25로 바꾸고 싶다면? IDE 열고, 파일 찾고, 리터럴 변경, 리컴파일, 테스트, 커밋. 숫자 하나 바꾸려고.

이건 **하나의 이벤트**에 있는 **하나의 조건**입니다. 실제 게임에는 수십 개가 있고, 큰 게임에는 수백 개가 있습니다.

### 데이터 소스 문제

조건이 진짜 복잡해지는 지점은 단순히 if문이 많은 것 이상입니다. 실제 게임 조건은 여러 독립적인 소스에서 데이터를 가져옵니다:

**이벤트 페이로드 데이터.** 데미지 양, 데미지 타입, 공격자 레퍼런스 — 이벤트 자체가 운반하는 데이터. 이걸 드릴다운해야 합니다: `damageInfo.attacker.stats.critChance`. 이벤트 인자에서 세 단계 프로퍼티 접근입니다.

**씬 오브젝트 상태.** 플레이어의 현재 HP, 문이 잠겨있는지, 게임 난이도 설정. 이 데이터는 이벤트 페이로드와 완전히 독립적으로 씬의 GameObject에 존재합니다. 조건에서 이걸 꺼내와야 합니다.

**랜덤 값.** "30% 확률로 트리거." "이 루트 테이블에서 랜덤 요소 선택." 확률과 무작위성은 게임 조건 어디에나 있습니다.

**고정 임계값.** 경직 예제의 매직 넘버 0.3. 퀘스트의 레벨 요구사항. 비교 대상 enum 값. 디자이너가 조정해야 하는 상수들.

하나의 실제 조건에 이 소스들이 전부 필요할 수 있습니다. "이벤트의 데미지 타입이 Fire이고(이벤트 페이로드) AND 대상의 화염 저항이 50 미만이고(씬 오브젝트) AND 랜덤 굴림이 0.7을 넘고(랜덤) AND 난이도가 Hard 이상일 때(씬 오브젝트와 상수 비교)."

코드에서는 조건 핸들러가 이벤트 인자, 여러 씬 컴포넌트, Random 호출, 하드코딩된 상수에 촉수를 뻗게 됩니다. 모든 촉수가 결합 지점입니다. 모든 결합 지점이 리팩토링 시 잠재적 파손 지점입니다.

### 깊은 프로퍼티 접근 문제

Unity의 씬 오브젝트는 컴포넌트 기반입니다. 실제로 필요한 데이터에 도달하려면 여러 단계를 탐색해야 하는 경우가 많습니다:

```csharp
// 원하는 것: 적의 현재 방어력 스탯
float defense = info.target.GetComponent<EnemyController>()
    .statsManager
    .defenseStat
    .currentValue;
```

GameObject에서 세 단계 깊이. 비주얼 도구에서 "이 대상의 적 컨트롤러의 스탯 매니저의 방어력 스탯의 현재 값"을 어떻게 지정할 수 있을까요? 대부분의 비주얼 스크립팅 도구는 이 깊이를 지원하지 않거나 불편한 우회 방법을 요구합니다.

그리고 enum 문제가 있습니다. Enum은 게임 코드 어디에나 있습니다 — `DamageType.Fire`, `EnemyRank.Boss`, `GameDifficulty.Hard`. 비주얼 조건 도구는 프로젝트의 enum을 인지하고, 적절한 드롭다운을 보여주고, 타입 안전성을 처리해야 합니다. `DamageType`을 `string`과 비교하는 것은 런타임 서프라이즈가 아니라 눈에 보이는 에러여야 합니다.

### 이터레이션 세금

진짜 아픈 비용은 조건을 작성하는 게 아닙니다. 변경하는 겁니다.

디자이너 왈: "경직 임계값을 30%에서 25%로 바꿀 수 있어요?" 워크플로우:

1. 디자이너가 프로그래머에게 요청
2. 프로그래머가 IDE를 열고 파일을 찾음
3. 숫자 하나 변경
4. 리컴파일 대기
5. 테스트
6. 커밋하고 푸시

숫자 하나 바꾸려고. 이걸 게임의 모든 임계값, 모든 확률, 모든 enum 비교에 곱하세요. 디자이너에게는 아이디어가 있고, 프로그래머에게는 빌드 큐가 있습니다. 이터레이션 속도는 컴파일 사이클에 의해 병목됩니다.

구조적 변경은 더 나쁩니다. "방어 중이 아닌 것 대신, OR로 바꾸고 싶어요: 방어 중이 아니거나 OR 데미지 타입이 관통일 때." 이건 값 변경이 아니라 — 로직 재구성입니다. 디자이너는 불리언 논리 표기법을 이해하지 않고서는 정확히 설명할 수 없고, 프로그래머는 괄호가 맞는지 확인하면서 중첩 if문을 재구성해야 합니다.

다른 산업에서는 이걸 해결했습니다. 데이터베이스 관리자는 비주얼 쿼리 빌더를 사용합니다. 마케팅 팀은 드래그 앤 드롭 조건 빌더를 사용합니다. Unreal에는 Blueprint 분기가 있습니다. Unity에는... C# 컴파일러가 있습니다.

## Visual Condition Tree: 코드 없는 불리언 로직

GES에는 Visual Condition Tree가 포함되어 있습니다 — Behavior Window 안에 있는 노코드 불리언 로직 빌더입니다. C#에서 if-else 체인을 작성하는 대신, AND/OR 그룹과 비교 노드를 사용해 조건 트리를 시각적으로 구성합니다.

![Condition Tree Overview](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-overview.png)

Behavior Window의 모든 Event Action에는 선택적 조건 트리가 있을 수 있습니다. 이벤트가 발생하면 트리가 먼저 평가됩니다. `true`를 반환하면 액션이 실행됩니다. `false`면 건너뜁니다. 전체 조건이 시각적으로 설정됩니다 — 코드 없음, 리컴파일 없음, 프로그래머에게 숫자 변경 요청 없음.

### AND/OR 그룹: 무제한 중첩

조건 트리는 두 가지 그룹 노드 타입을 사용합니다:

- **AND 그룹**: 모든 자식이 `true`여야 합니다. 클래식 `&&` 로직.
- **OR 그룹**: 하나 이상의 자식이 `true`면 됩니다. 클래식 `||` 로직.

그룹은 다른 그룹 안에 무제한으로 중첩됩니다. 이는 어떤 불리언 표현식도 나타낼 수 있다는 뜻입니다:

```
AND
├── HP &lt; 50%
├── OR
│   ├── isCritical == true
│   └── damageType == "Fire"
└── targetTag == "Enemy"
```

읽으면: "HP 50% 미만 AND (크리티컬 히트 OR 화염 데미지) AND 대상이 Enemy." 이걸 하나의 if문에서 깔끔하게 표현해보세요. 그리고 C#을 작성하지 않는 디자이너에게 설명해보세요.

비주얼 트리에서는 AND/OR 계층이 인간이 복합 조건에 대해 자연스럽게 생각하는 방식에 매핑됩니다. 추적할 괄호 없음, 기억할 연산자 우선순위 없음, 중첩 실수 없음.

![Condition Tree Example](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-example.png)

### 비교 노드: Source, Operator, Target

트리의 각 리프 노드는 세 부분으로 이루어진 비교입니다:

**Source** → **Operator** → **Target**

Source와 Target 모두 독립적으로 네 가지 데이터 소스 타입을 지원합니다. Operator는 비교되는 타입에 따라 자동으로 적응합니다. 이 세 부분 구조는 즉시 이해할 수 있을 만큼 간단하면서도 어떤 비교든 표현할 수 있을 만큼 유연합니다.

## 네 가지 데이터 소스 타입

조건 트리가 "괜찮은 비주얼 도구"에서 "진짜 강력한 시스템"으로 넘어가는 부분입니다. 각 비교 노드는 네 가지 소스 타입에서 값을 가져올 수 있고, 비교의 양쪽에서 자유롭게 혼합할 수 있습니다.

![Condition Node Types](/img/game-event-system/visual-workflow/visual-condition-tree/condition-node-types.png)

### 1. Event Argument: 이벤트 페이로드의 데이터

가장 일반적인 소스 타입. `Int32GameEvent`의 경우 이벤트 인자는 정수 값입니다. `SingleGameEvent`의 경우 float입니다. `DamageInfo` 같은 커스텀 페이로드 타입의 경우 중첩된 프로퍼티까지 드릴다운할 수 있습니다.

핵심 기능은 **5단계 깊이 프로퍼티 접근**입니다. 이벤트 인자에서 시작하여 중첩된 오브젝트를 탐색할 수 있습니다:

```
damageInfo → attacker → stats → critChance → value
```

Level 1: `damageInfo` (이벤트 페이로드)
Level 2: `attacker` (DamageInfo의 프로퍼티)
Level 3: `stats` (attacker의 프로퍼티)
Level 4: `critChance` (stats의 프로퍼티)
Level 5: `value` (실제 float 값)

에디터는 드롭다운 체인을 보여주며, 각 드롭다운은 해당 레벨에서 사용 가능한 프로퍼티로 채워집니다. 타입 시스템이 따라오므로, `critChance`(`FloatStat`)를 선택한 후 다음 드롭다운은 `FloatStat`에서 사용 가능한 프로퍼티만 보여줍니다.

이것이 앞서 언급한 "깊은 프로퍼티 접근" 문제를 해결합니다. 비주얼 인터페이스가 탐색을 명시적이고 타입 안전하게 만들며, 드롭다운 체인이 존재하지 않는 프로퍼티에 접근하는 것을 방지합니다.

### 2. Scene Type: 씬 오브젝트에 대한 참조

이벤트 페이로드가 아닌 씬의 데이터가 필요한 조건용. 레퍼런스 필드에 GameObject나 Component를 드래그한 다음, 같은 드롭다운 체인을 사용해 public 프로퍼티를 탐색합니다.

**Public 프로퍼티**를 탐색할 수 있습니다: `health.currentHP`, `combatState.isBlocking`, `gameManager.difficulty`.

**Bool 메서드**(파라미터 없이 `bool`을 반환하는 메서드)도 나타납니다: `inventory.HasItem()`, `achievementManager.IsUnlocked()`. 이는 어댑터 코드를 작성하지 않고도 조건 트리에서 간단한 쿼리 메서드를 호출할 수 있다는 뜻입니다.

Scene Type은 "플레이어의 HP를 확인" 또는 "문이 잠겨있나" 같은 조건에 적합합니다 — 이벤트와 독립적으로 씬 오브젝트에 존재하는 데이터.

### 3. Random: 확률과 랜덤 선택

랜덤 데이터를 위한 두 가지 모드:

**Range 모드.** 최소값과 최대값 사이의 랜덤 값을 생성합니다. `Random(0.0, 1.0) &lt; 0.3`으로 "30% 확률로 트리거" 조건을 만들 수 있습니다. 코드에서 `Random.value` 호출 필요 없음.

![Random Value Source](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-random-value.png)

**List 모드.** 미리 정의된 리스트에서 랜덤 요소를 선택합니다. "데미지 타입 중 랜덤으로 하나 선택" 또는 "랜덤 스폰 가중치 선택"에 유용합니다. 리스트는 조건 노드에서 직접 설정됩니다.

### 4. Constant: 고정 값과 Enum 드롭다운

가장 간단한 소스 타입이지만, 단순 숫자 이상을 처리합니다.

**단일 값.** 숫자, 문자열, 불리언을 입력합니다. 경직 예제의 임계값 `0.5`. 기대하는 태그 `"Enemy"`.

![Constant Value Source](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-constant-value.png)

**리스트.** `In List` 연산자와 함께 사용할 값 집합을 정의합니다. `enemyType == Boss || enemyType == Elite` 대신 `enemyType In List [Boss, Elite]`로 작성합니다. 더 깔끔하고, 디자이너가 로직 재구성 없이 리스트에 `MiniBoss`를 추가할 수 있습니다.

**Enum 드롭다운.** 비교의 다른 쪽이 enum 타입이면, Constant 소스가 자동으로 적절한 enum 드롭다운을 보여줍니다. 문자열 비교 없음, 매직 넘버 없음. 오타가 있을 수 있는 문자열 `"Fire"`가 아니라, 드롭다운에서 `DamageType.Fire`를 봅니다.

## 연산자 시스템: 10+ 비교 타입

사용 가능한 연산자는 비교되는 타입에 따라 달라집니다. 시스템이 어떤 연산자가 유효한지 자동으로 결정하므로, 무의미한 비교를 만들 수 없습니다.

**숫자 연산자 (6개):** `==`, `!=`, `>`, `&lt;`, `>=`, `&lt;=`
`int`, `float`, `double`, 그리고 모든 `IComparable` 숫자 타입에 동작합니다.

**문자열 연산자 (5개):** `==`, `!=`, `StartsWith`, `EndsWith`, `Contains`
기본적으로 대소문자를 구분합니다. 문자열 비교는 직관적입니다 — 정규식도, 글로빙도 없이, 게임 조건에 실제로 필요한 연산만.

**Enum 연산자:** `==`, `!=`, `In List`
Enum 비교는 타입 안전합니다. `DamageType`을 `WeaponType`과 비교하면 런타임 서프라이즈가 아니라 에디터에서 눈에 보이는 에러가 발생합니다.

**In List 연산자:** 모든 타입에서 동작합니다. 소스 값이 타겟 리스트에 존재하는지(또는 그 반대) 확인합니다. `||` 비교 체인을 하나의 깔끔한 체크로 대체합니다.

### 실시간 타입 검증

비주얼 조건 구성을 실용적으로 만드는 안전망입니다. 에디터가 런타임이 아닌 설정 시점에 타입을 검증합니다.

타입이 일치하지 않으면 **빨간색 경고 표시**가 즉시 나타납니다. `string`을 `float`과 비교하려 하면, 비교 노드가 설명과 함께 빨갛게 하이라이트됩니다. Scene Type 레퍼런스를 변경해서 프로퍼티 체인이 유효하지 않게 되면(누군가 컴포넌트를 리팩토링해서), 영향받는 노드에 빨간 경고가 표시됩니다.

더 이상 "에디터에서는 조건이 동작했는데 런타임에 캐스트 예외가 발생"하는 일이 없습니다. 비주얼 피드백이 Play 버튼을 누르기 전에 타입 불일치를 잡아냅니다.

## Expression Tree 컴파일: 왜 느리지 않은가

비주얼 조건 트리는 성능 우려처럼 들릴 수 있습니다. 매번 이벤트가 발생할 때마다 트리 탐색, 리플렉션, 딕셔너리 조회? 그건 진짜 문제가 될 겁니다.

GES는 런타임에 트리를 해석하지 않습니다. 초기화 시, 전체 비주얼 트리가 .NET Expression Tree로 컴파일되고, 이는 네이티브 delegate가 됩니다 — 본질적으로 if문을 직접 작성했을 때와 같은 컴파일된 코드입니다.

**일회성 컴파일 비용:** 트리당 일반적으로 2ms 미만.
**평가당 비용:** 약 0.001ms — 수작업 C#과 사실상 동일.

게임플레이 중 리플렉션 없음. 딕셔너리 조회 없음. 해석 오버헤드 없음. 비주얼 트리는 네이티브 코드로 컴파일되어 사라지는 디자인 타임 추상화입니다.

## 최적화: 평가 순서가 중요하다

컴파일된 Expression Tree에서도 조건의 순서가 성능에 영향을 미칩니다. 두 가지 팁:

**OR 그룹은 단축 평가합니다.** OR 그룹의 첫 번째 자식이 `true`면, 나머지 자식은 평가되지 않습니다. 가장 저렴하거나 true일 가능성이 가장 높은 체크를 먼저 놓으세요.

**AND 그룹도 단축 평가합니다.** 첫 번째 자식이 `false`면, 나머지는 건너뜁니다. 가장 저렴하거나 false일 가능성이 가장 높은 체크를 먼저 놓으세요.

실전에서는:

```
AND
├── Constant 비교 (거의 비용 없음)              ← 이것부터 체크
├── Event Argument 프로퍼티 접근 (저렴)        ← 그다음 이것
├── Scene Type 깊은 프로퍼티 체인 (보통)        ← 그다음 이것
└── Random 비교 (저렴하지만 위가 실패하면 불필요)
```

그룹 내에서 노드를 드래그 앤 드롭으로 재정렬할 수 있습니다. 자주 단축 평가되는 저렴한 체크를 상단에 놓으세요.

## Before와 After: 실제 패턴들

### 루트 드롭 조건

**Before (코드):**

```csharp
public void OnEnemyKilled(EnemyDeathInfo info)
{
    if (info.enemy.enemyType == EnemyType.Boss ||
        info.enemy.enemyType == EnemyType.Elite)
    {
        if (info.killer.GetComponent<PlayerStats>().luckModifier > 0.5f ||
            GameManager.Instance.currentDifficulty >= Difficulty.Hard)
        {
            DropRareLoot(info.enemy.lootTable);
        }
    }
}
```

**After (비주얼 트리):**

```
AND
├── Event Argument: enemy.enemyType In List Constant: [Boss, Elite]
└── OR
    ├── Scene Type: playerStats.luckModifier > Constant: 0.5
    └── Scene Type: gameManager.currentDifficulty >= Constant: Hard
```

같은 로직. 하지만 디자이너가 IDE를 열지 않고도 적 타입 리스트에 `MiniBoss`를 추가하거나 행운 임계값을 조정할 수 있습니다.

### 튜토리얼 게이트

**Before:**

```csharp
public void OnPlayerAction(PlayerActionInfo action)
{
    if (!tutorialComplete && currentStep == TutorialStep.Movement &&
        action.actionType == ActionType.Move && action.duration > 1.0f)
    {
        AdvanceTutorial();
    }
}
```

**After:**

```
AND
├── Scene Type: tutorialManager.tutorialComplete == Constant: false
├── Scene Type: tutorialManager.currentStep == Constant: Movement
├── Event Argument: action.actionType == Constant: Move
└── Event Argument: action.duration > Constant: 1.0
```

깔끔하고 읽기 쉬운 네 개의 체크. 디자이너가 빠른 테스트를 위해 duration 체크를 비활성화하거나, 필요한 단계를 변경할 수 있습니다 — 코드 없이, 리컴파일 없이.

### 업적 트리거

**Before:**

```csharp
public void OnScoreChanged(int newScore)
{
    if (newScore >= 10000 && !AchievementManager.HasAchievement("score_master"))
    {
        if (GameTimer.ElapsedTime < 300f)
        {
            UnlockAchievement("speed_scorer");
        }
        UnlockAchievement("score_master");
    }
}
```

**After (각각 고유한 조건 트리를 가진 두 개의 별도 Event Action):**

Score Master:
```
AND
├── Event Argument: newScore >= Constant: 10000
└── Scene Type: achievementManager.HasAchievement("score_master") == Constant: false
```

Speed Scorer:
```
AND
├── Event Argument: newScore >= Constant: 10000
├── Scene Type: achievementManager.HasAchievement("speed_scorer") == Constant: false
└── Scene Type: gameTimer.elapsedTime &lt; Constant: 300
```

각 업적이 독립적으로 설정 가능합니다. 임계값, 시간 제한, 선행 조건 — 모두 디자이너가 접근할 수 있습니다.

### 네 가지 소스를 모두 혼합한 화염 데미지

하나의 트리에서 네 가지 소스 타입을 모두 사용하는 조건입니다:

```
AND
├── Event Argument: damageInfo.damageType == Constant: DamageType.Fire
├── Scene Type: enemy.stats.fireResistance &lt; Constant: 50
├── Scene Type: gameSettings.difficulty >= Constant: Difficulty.Hard
└── Random(0.0, 1.0) &lt; Constant: 0.3
```

"데미지 타입이 Fire이고 AND 적의 화염 저항이 50 미만이고 AND 난이도가 Hard 이상이고 AND 30% 랜덤 체크를 통과하면 화염 보너스 적용." 네 가지 다른 데이터 소스, 하나의 비주얼 트리, 코드 한 줄도 없음.

![Conditional Event Demo](/img/game-event-system/examples/06-conditional-event/demo-06-condition-tree.png)

## 실전에서 중요한 편집 기능들

조건 트리는 정적인 설정 패널이 아닙니다. 실제 개발 중에 중요한 기능을 갖춘 본격적인 편집 도구입니다:

**드래그 앤 드롭 재정렬.** 그룹 내에서 노드를 재배치하여 단축 평가를 최적화합니다. 저렴한 체크를 먼저 놓으세요.

**개별 노드 활성화/비활성화.** 삭제하지 않고 어떤 조건이든 켜거나 끌 수 있습니다. 보스 면역 없이 경직 체크가 동작하는지 테스트? 그 노드를 비활성화하세요. 코드 변경 없음, 주석 처리 없음, 주석 해제 잊을 위험 없음.

**접힌/펼친 뷰.** 펼친 뷰는 전체 설정 상세를 보여줍니다 — 소스 타입, 연산자, 값, 중첩 구조. 접힌 뷰는 각 비교를 한 줄 요약으로 압축합니다. 검증된 하위 그룹을 접어서 최상위 로직을 볼 수 있게 하세요.

**기본값으로 리셋.** 실험하다가 엉망이 됐나요? 어떤 노드든 기본 상태로 리셋하세요.

## 비주얼 트리가 적합한 경우 (그리고 아닌 경우)

조건 트리는 이벤트 레벨 게이팅 — "이 이벤트가 발생했을 때 이 Event Action이 실행되어야 하나?"를 위해 특별히 설계되었습니다.

**비주얼 조건 트리를 사용할 때:**
- 조건이 Event Action의 실행을 게이트할 때
- 디자이너가 조건을 보거나 수정해야 할 때
- 로직이 비교와 불리언 연산자일 때 (알고리즘이 아닌)
- 리컴파일 없이 이터레이션하고 싶을 때

**코드를 사용할 때:**
- 로직이 복잡한 계산을 포함할 때 (길찾기, 물리, 다단계 알고리즘)
- 조건이 시간에 걸쳐 축적된 상태에 의존할 때
- 디자이너가 절대 건드리지 않는 순수한 프로그래머 관심사일 때
- 성능이 중요한 핫 패스에서 세밀한 제어가 필요할 때

실전에서 일반적인 게임의 이벤트 조건 중 대략 70-80%는 "비주얼 트리" 종류입니다 — 임계값 체크, 타입 비교, 상태 플래그, 확률 굴림. 나머지 20-30%는 코드에 속하는 진짜 복잡한 로직입니다. 조건 트리가 일반적인 경우를 처리하므로 프로그래머는 흥미로운 것에 집중할 수 있습니다.

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
