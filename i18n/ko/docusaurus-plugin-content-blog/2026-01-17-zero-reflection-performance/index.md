---
slug: zero-reflection-performance
title: '제로 리플렉션, 제로 GC: "고성능" 이벤트 시스템의 진짜 의미'
authors: [tinygiants]
tags: [ges, unity, performance, architecture, advanced]
description: "모든 이벤트 시스템이 '고성능'을 주장한다. 진짜 의미가 뭔지 — 실제 벤치마크 데이터, Expression Tree 내부 구조, 최적화 전략과 함께 알아보자."
image: /img/home-page/game-event-system-preview.png
---

Unity Asset Store의 모든 이벤트 시스템 플러그인이 설명 어딘가에 "고성능"을 써놓는다. "쉬운 사용"과 "완벽한 문서" 사이 어딘가에. 그런데 1ms와 0.001ms는 둘 다 사람 기준으로는 빠르지만, 하나가 다른 것보다 천 배 느리다. 플러그인이 "고성능"이라고 할 때, 실제로 무슨 뜻일까? 뭐에 비해서? 어떻게 측정했는데?

예전엔 이걸 신경 안 썼다. 대부분이 안 쓴다. 이벤트 연결하고, 게임 잘 돌아가고, 출시한다. 그런데 수백 개의 엔티티가 각각 여러 이벤트를 수신하는 모바일 프로젝트를 하게 되면서, 갑자기 "고성능"이 마케팅 체크박스가 아니라 — 60 FPS와 슬라이드쇼의 차이가 됐다.

이 글은 이벤트 시스템에서 "고성능"이 실제로 무엇을 의미해야 하는지, 왜 대부분의 구현이 부족한지, 그리고 GES가 Expression Tree 컴파일을 통해 어떻게 거의 제로 오버헤드를 달성하는지에 대한 이야기다. 실제 수치로, 허풍 없이.

<!-- truncate -->

## 측정 문제

질문 하나: 마지막으로 이벤트 시스템을 프로파일링한 게 언제인가?

렌더링 파이프라인이 아니라. 물리가 아니라. *이벤트 시스템*을. 게임 로직을 연결하는 것을. 대부분의 개발자가 한 번도 안 해본다. 소규모 프로젝트에서 이벤트 오버헤드가 보이지 않기 때문이다. 리스너 20개, 프레임당 이벤트 5개 정도면 — 비용이 0으로 반올림되고 프로파일러도 보여주는 걸 귀찮아한다.

하지만 게임은 커진다. 리스너 20개의 귀여운 프로토타입이 이벤트 타입 500개에 여러 씬에 분산된 수천 개의 리스너를 가진 프로덕션 게임이 된다. 모바일 게임, VR 경험, AI 엔티티가 많은 게임 — 이런 것들이 이벤트 시스템 오버헤드가 "거의 공짜"에서 실제 프레임 예산을 잡아먹기 시작하는 지점에 도달한다.

대부분의 개발자가 측정하지 않는 이유는 간단하다: 강력한 CPU를 가진 데스크톱 하드웨어에서는 오버헤드가 프레임 예산 여유분 뒤에 숨겨진다. 빡빡한 예산의 플랫폼을 타겟할 때만 보인다 — 60 FPS 모바일 16.67ms, 90 FPS Quest VR 11.1ms, 120 FPS PSVR2 8.3ms. 이런 플랫폼에서는 0.1밀리초마다 중요하다.

## 아무도 말 안 하는 숨겨진 비용

무엇이 하나의 이벤트 시스템을 느리게 만들고 다른 것을 빠르게 만드는가? 성능 좋은 이벤트 시스템과 느린 것을 구분하는 네 가지 주요 비용 범주가 있다.

### 비용 #1: 리플렉션

가장 큰 것이다. .NET의 리플렉션 — `GetType()`, `GetProperty()`, `GetMethod()`, `Invoke()` 사용 — 은 직접 메서드 호출보다 대략 50-1000배 느리다, 연산에 따라 다르지만.

충격적인 건: **UnityEvent는 매 호출마다 리플렉션을 사용한다**. 설정할 때만이 아니라 — UnityEvent를 발생시킬 때마다 내부적으로 리플렉션으로 대상 메서드를 호출한다. Unity가 수년간 최적화했지만 근본적인 오버헤드는 남아있다. 믿기지 않으면 프로파일링해보라. 딥 프로파일러를 열고, UnityEvent를 수천 번 발생시켜보고, `System.Reflection` 호출이 쌓이는 걸 지켜봐라.

```csharp
// What a typical reflection-based event plugin does behind the scenes
public bool EvaluateCondition(ConditionNode node)
{
    // Step 1: Get the target component via reflection
    var component = target.GetComponent(node.componentType);  // Reflection

    // Step 2: Get the property/field via reflection
    var property = component.GetType().GetProperty(node.propertyName);  // Reflection

    // Step 3: Get the value via reflection
    object value = property.GetValue(component);  // Reflection + boxing

    // Step 4: Compare via reflection
    return CompareValues(value, node.comparisonValue, node.comparisonType);  // Unboxing
}
```

모든 단계가 리플렉션을 사용한다. 프로퍼티를 런타임에 확인하는 비주얼 조건 시스템 — "플레이어 체력이 30 이하인가?" — 이 있다면, 아마 정확히 이것을 하고 있다, 매 프레임, 모든 활성 리스너에서, 여러 번.

### 비용 #2: 박싱과 언박싱

리플렉션 호출이 값 타입(int, float, bool, Vector3)을 `object`로 반환할 때, .NET은 감싸기 위한 작은 힙 객체를 할당한다. 그게 박싱이다. 다시 캐스팅하면 언박싱이다. 할당 자체는 싸지만, 가비지 컬렉터를 먹인다.

데이터를 `object` 타입으로 전달하는 이벤트 시스템 — 많은 시스템이 "제네릭"으로 남기 위해 그렇게 한다 — 은 모든 값 타입 매개변수를 박싱한다. 매 프레임. 매 이벤트. 매 리스너.

### 비용 #3: GC 할당

모바일의 사일런트 킬러다. 매번 발생시킬 때마다 메모리를 할당하는 이벤트 시스템은 가비지를 만든다. 가비지가 쌓이다가 GC가 수집 사이클을 실행하면, Unity의 Mono 런타임에서는 눈에 보이는 끊김이 생긴다 — 플레이어가 버벅임이나 멈춤으로 느끼는 프레임 스파이크.

문제가 복합된다: 이벤트를 더 많이 발생시킬수록, 가비지가 더 쌓이고, GC가 더 자주 돌고, 끊김이 더 많아진다. 게임이 복잡해질수록 악화되는 데스 스파이럴이다. VR에서는 단일 GC 스파이크가 프레임 드롭을 유발할 수 있고, 그것이 플레이어를 메스껍게 만든다. 말 그대로.

### 비용 #4: 문자열 매칭

일부 이벤트 시스템은 문자열 키로 이벤트를 식별한다. "OnPlayerDeath", "OnEnemySpawned", "OnHealthChanged". 이벤트가 발생할 때마다 시스템이 매칭 리스너를 찾기 위해 문자열 비교(또는 해싱을 포함하는 딕셔너리 조회)를 한다.

딕셔너리 해싱을 쓴 문자열 기반 조회는 이벤트 수가 적으면 충분히 빠르다. 하지만 컴파일러의 타입 체크를 막고, 안전하게 이름을 바꿀 수 없고, 조회 키를 구성할 때 할당이 발생한다(부분 문자열 연산, 복합 키를 위한 문자열 연결 등).

## GC 문제는 별도 섹션을 받을 자격이 있다

이벤트 시스템에서 GC가 왜 그렇게 중요한지 구체적으로 말하겠다.

60 FPS로 실행되는 게임에서 프레임당 이벤트 50개가 발생한다고 해보자. 각 이벤트 발생이 64바이트만 할당해도(박싱된 float 하나, 임시 delegate 하나, 작은 문자열 하나), 프레임당 3,200바이트다. 작아 보이지? 하지만 초당 192KB다. 모바일의 Mono GC 증분 수집기는 대략 1-4MB 할당마다 수집을 트리거하는데, 5-20초마다 GC 스파이크가 발생한다는 뜻이다. 각 스파이크는 1-5ms이고, 60 FPS에서는 프레임 드롭을 의미한다.

플레이어가 이걸 느낀다. 테스터가 "가끔 끊김"을 보고한다. QA가 아무도 일관되게 재현할 수 없는 버그를 등록한다, 타이밍이 할당 패턴에 따라 달라지니까. 익숙한 이야기 아닌가?

제로 할당 이벤트 시스템은 이 범주의 문제 전체를 제거한다. "줄이는" 게 아니다 — 제거한다. 0바이트 할당은 이벤트로 인한 GC 압력이 제로라는 뜻이다, 끝.

## 조건 평가 문제

여기서 정말 흥미로워진다. 콜백을 디스패치하기만 하는 이벤트 시스템은 비교적 빠르게 만들기 쉽다 — 네이티브 C# 이벤트/delegate가 이미 빠르니까. 어려운 문제는 **비주얼 시스템의 조건 평가**다.

비주얼 이벤트 에디터로 디자이너가 조건 트리를 만든다: "플레이어 체력이 30 이하이고 접지 상태이거나 실드가 있을 때 이 응답을 실행". 에디터에서는 아름답다. 하지만 런타임에 그 비주얼 노드들이 실제로 *컴포넌트의 프로퍼티를 읽고 비교를 평가*해야 한다.

![Condition Tree](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-overview.png)

대부분의 비주얼 시스템이 이를 위해 리플렉션을 사용한다. 매 프레임, 모든 활성 조건에 대해 시스템이 `PropertyInfo.GetValue()`를 호출해서 현재 값을 읽고, 박싱하고, 비교하고, 결과를 반환한다. 적당히 복잡한 게임이라면 프레임당 20-50개의 조건을 평가할 수 있다. 위에서 논의한 리플렉션 오버헤드 — 리플렉션 호출당 대략 0.05-0.08ms에 조건당 3-4번 호출 — 로 조건 검사만으로 프레임당 3-16ms가 될 수 있다.

모바일에서는 게임 로직이 돌기도 전에 *전체 프레임 예산*이 날아갈 수 있다.

## "제로 오버헤드"가 실제로 뭘 의미해야 하는가

내 정의이고, 업계 표준이 되어야 한다고 생각한다:

**제로 오버헤드 이벤트 시스템은 직접 메서드 호출 + 리스너가 실제로 하는 작업보다 비용이 더 들지 않아야 한다.**

이것은 다음을 의미한다:
- 리스너 0명일 때 이벤트 발생은 본질적으로 비용 없음
- 리스너당 디스패치 비용은 delegate를 직접 호출하는 것과 동등
- 조건 평가는 수동 작성한 `if` 문만큼 빠름
- 이벤트 연산으로 인한 프레임당 GC 할당 0바이트
- 런타임에 리플렉션 없음. 절대로.

이 기준을 충족하지 못하는 이벤트 시스템은 "고성능"이 아니다 — 그냥 "데스크톱 하드웨어에서 아직 눈에 띄게 느리지 않은" 것일 뿐이다.

## 존재해서는 안 되는 타협

네이티브 C# 이벤트는 날것의 속도를 준다 — 직접 delegate 호출, 할당 없음, 리플렉션 없음. 하지만 그 외에는 아무것도 없다. 비주얼 에디터 없고, 조건 트리 없고, Flow Graph 없고, 런타임 디버깅 도구 없고. 그냥 코드가 코드를 코드에 연결할 뿐.

UnityEvent는 Inspector 통합, 비주얼 바인딩, 씬 레벨 이벤트 연결을 준다. 하지만 내부적으로 리플렉션을 사용한다. 더 느리다. 할당한다. 복잡한 조건 로직을 네이티브로 지원하지 않는다.

통념은 하나를 고르라는 것이다: 날것의 속도 또는 비주얼 편의. 둘 다 가질 수 없다. 하지만 이건 리플렉션을 비주얼 설정과 런타임 동작 사이의 브릿지 메커니즘으로 받아들일 때만 맞는 말이다.

비주얼 설정을 네이티브 코드로 컴파일할 수 있다면?

## Expression Tree 컴파일: 브릿지

이것이 GES의 핵심 기술 혁신이다. 런타임에 리플렉션을 통해 비주얼 조건을 해석하는 대신, GES는 초기화 시 .NET Expression Tree를 사용해 **네이티브 delegate로 컴파일**한다.

Expression Tree는 .NET 기능(`System.Linq.Expressions` 네임스페이스)으로, 코드를 데이터로 — 표현식 노드의 트리로 — 표현한 다음, JIT 컴파일러를 통해 실행 가능한 IL 코드로 컴파일할 수 있다. 결과물은 수동 작성 C#과 같은 속도로 실행되는 delegate다.

개념적 파이프라인은 이렇다:

**비주얼 조건 트리 &rarr; Expression Tree &rarr; IL 코드 &rarr; 컴파일된 Lambda**

간략화한 코드로 보면:

```csharp
// Instead of this (reflection every frame):
object value = propertyInfo.GetValue(target);  // Slow. Allocates. Every frame.

// GES builds an Expression Tree at initialization:
var targetParam = Expression.Parameter(typeof(MyComponent), "target");
var propertyAccess = Expression.Property(targetParam, "Health");
var lambda = Expression.Lambda<Func<MyComponent, float>>(propertyAccess, targetParam);

// Compiles it once to a native delegate:
Func<MyComponent, float> getHealth = lambda.Compile();

// Then calls it every frame — zero reflection:
float health = getHealth(myComponent);  // Same speed as: myComponent.Health
```

컴파일은 초기화 중 한 번 발생한다. 그 후 `getHealth`는 JIT 최적화된 네이티브 delegate다. 소스 코드에 `myComponent.Health`를 직접 쓰는 것과 기능적으로 동일하다. 트리 순회 없음. 해석 없음. 리플렉션 없음. IL로 컴파일된 직접 프로퍼티 접근일 뿐이다.

## 전체 컴파일 파이프라인

GES가 실제로 이것을 처음부터 끝까지 어떻게 처리하는지 살펴보자.

### 1단계: 비주얼 설정 (설계 시점)

GES 에디터에서 디자이너가 조건 트리를 시각적으로 만든다. 각 노드는 조건 — 프로퍼티, 비교 연산자, 값이다. 노드는 AND/OR/NOT 논리 연산자로 연결된다. 이 시점에서 모든 것은 직렬화된 데이터다. 코드는 실행되지 않는다.

### 2단계: Expression Tree 구축 (초기화)

게임이 시작되거나 리스너가 활성화되면, GES가 직렬화된 조건 데이터를 읽고 Expression Tree를 만든다:

```csharp
// Simplified version of GES internals
private Func<bool> CompileConditionTree(ConditionNodeData rootNode)
{
    Expression body = BuildExpression(rootNode);
    var lambda = Expression.Lambda<Func<bool>>(body);
    return lambda.Compile();
}

private Expression BuildExpression(ConditionNodeData node)
{
    if (node.isLogicalOperator)
    {
        var left = BuildExpression(node.children[0]);
        var right = BuildExpression(node.children[1]);

        return node.operatorType switch
        {
            LogicalOp.And => Expression.AndAlso(left, right),  // Short-circuit AND
            LogicalOp.Or  => Expression.OrElse(left, right),   // Short-circuit OR
            LogicalOp.Not => Expression.Not(left),
            _ => throw new InvalidOperationException()
        };
    }
    else
    {
        var target = Expression.Constant(node.targetComponent);
        var property = Expression.Property(target, node.propertyName);
        var compareValue = Expression.Constant(node.compareValue);

        return node.comparisonType switch
        {
            Comparison.Equals      => Expression.Equal(property, compareValue),
            Comparison.GreaterThan => Expression.GreaterThan(property, compareValue),
            Comparison.LessThan    => Expression.LessThan(property, compareValue),
            // ... etc
        };
    }
}
```

`Expression.AndAlso`와 `Expression.OrElse`의 사용에 주목하라 — 이것들은 C# 컴파일러가 `&&`와 `||`에 대해 생성하는 것과 동일한 단락 평가(short-circuit evaluation)로 컴파일된다. AND의 왼쪽이 false면 오른쪽은 평가되지 않는다. 규모가 커지면 이게 중요하다.

### 3단계: IL 컴파일 (일회성 비용)

`lambda.Compile()` 호출은 .NET Expression Tree 컴파일러를 호출하여 IL 바이트코드를 방출하고 JIT 컴파일한다. 이것이 비용이 큰 단계다 — 복잡도에 따라 트리당 대략 0.1-2ms. 하지만 정확히 한 번 발생한다.

이런 복합 조건 트리의 경우:

```
AND
  ├── Health &lt; 30
  └── OR
      ├── IsGrounded == true
      └── HasShield == true
```

컴파일된 delegate는 기능적으로 다음과 동등하다:

```csharp
(health < 30f) && (isGrounded || hasShield)
```

같은 IL. 같은 성능. 같은 단락 평가 동작. 수동 작성 코드 대신 비주얼 데이터에서 생성됐을 뿐이다.

### 4단계: 런타임 실행 (매 프레임)

런타임에 조건 평가는 delegate 호출 하나다:

```csharp
if (compiledCondition())  // One call. No reflection. No traversal. No allocation.
{
    ExecuteResponse();
}
```

이게 전부다. 전체 비주얼 조건 트리 — 중첩된 AND/OR 로직과 여러 프로퍼티 비교를 가진 노드 10개일 수도 있다 — 가 동등한 수동 작성 `if` 문만큼 빠른 단일 delegate 호출이다.

## 실제로 의미하는 바

컴파일된 조건은 순진한 구현을 곤란하게 만드는 엣지 케이스를 처리한다:

**Null 안전성** — 파괴된 컴포넌트 참조는 try/catch 블록이 아니라 컴파일된 null 가드로 체크된다. null 체크가 delegate에 분기 명령어로 베이킹된다.

**박싱 없음** — 값 타입 프로퍼티(int, float, bool, Vector3)는 컴파일된 delegate를 통해 직접 접근된다. `object` 래퍼 없음, 힙 할당 없음, GC 압력 없음.

**깊은 프로퍼티 접근** — `player.Inventory.ActiveWeapon.Damage &gt; 50`을 체크할 수 있고, 전체 체인이 C#에서 쓴 것과 마찬가지로 IL에서 순차적 프로퍼티 로드로 컴파일된다.

## 실제 벤치마크 데이터

이론은 충분하다. 통제된 벤치마크에서 나온 실제 GES 성능 수치다.

### 이벤트 발생 성능

| 시나리오 | 시간 | GC 할당 |
|----------|------|---------|
| 이벤트 발생, 리스너 0명 | ~0.001ms | 0 bytes |
| 이벤트 발생, 리스너 1명 | ~0.003ms | 0 bytes |
| 이벤트 발생, 리스너 10명 | ~0.02ms | 0 bytes |
| 이벤트 발생, 리스너 100명 | ~0.15ms | 0 bytes |
| 이벤트 발생, 리스너 1000명 | ~1.2ms | 0 bytes |

모든 경우에서 GC 할당 제로. 박싱 없음, 임시 객체 없음, 가비지 압력 없음. 리스너 수에 관계없이.

### 조건 평가 성능

| 시나리오 | 시간 | GC 할당 |
|----------|------|---------|
| 단순 조건 (노드 1개) | ~0.001ms | 0 bytes |
| 복합 조건 (노드 5개, AND/OR) | ~0.003ms | 0 bytes |
| 깊은 조건 트리 (노드 10개 이상) | ~0.005ms | 0 bytes |

리플렉션 기반 평가와 비교: 5노드 조건 트리가 Expression Tree로 ~0.003ms vs 리플렉션으로 ~0.75ms. **250배 개선**.

### Flow Node 실행

| 시나리오 | 시간 | GC 할당 |
|----------|------|---------|
| 단일 flow node | ~0.01ms | 0 bytes |
| Flow 체인 (노드 5개) | ~0.05ms | 0 bytes |
| Flow 체인 (노드 10개) | ~0.09ms | 0 bytes |

### Monitor Window (에디터 전용)

| 시나리오 | 시간 |
|----------|------|
| 모니터 대시보드 새로고침 | ~0.3ms |

Monitor Window는 에디터 도구다 — 이 비용은 개발 중에만 존재하며 빌드에는 영향 없다.

![Monitor Performance](/img/game-event-system/tools/runtime-monitor/monitor-performance.png)

## 비교: GES vs 나머지 전부

| 기능 | GES | 네이티브 C# Events | UnityEvent | 문자열 기반 시스템 |
|------|-----|-------------------|------------|-------------------|
| 발생 오버헤드 (리스너 10명) | ~0.02ms | ~0.01ms | ~0.15ms | ~0.08ms |
| 발생당 GC | 0 bytes | 0 bytes | 32-128 bytes | 64-256 bytes |
| 비주얼 조건 에디터 | 있음 | 없음 | 제한적 | 경우에 따라 |
| 조건 평가 속도 | ~0.003ms | N/A (수동 코드) | N/A | ~0.5ms (리플렉션) |
| 런타임 리플렉션 | 없음 | 없음 | 있음 | 있음 |
| 타입 안전성 | 완전 | 완전 | 부분적 | 없음 |
| 런타임 디버깅 도구 | 있음 | 없음 | 제한적 | 경우에 따라 |

패턴이 명확하다: GES는 네이티브 C# 이벤트 속도에 매칭하면서 C# 이벤트가 제공할 수 없는 비주얼 도구를 제공한다. 그리고 리플렉션 기반 시스템을 속도와 할당 모두에서 압도한다.

## 프로덕션 검증

이것은 진공 상태에서 돌린 합성 벤치마크가 아니다. GES는 프로덕션 시나리오에서 검증됐다:

- **500개 이상의 동시 이벤트 타입**이 단일 프로젝트에서 활성
- **10,000개 이상의 리스너**가 여러 씬에 분산
- 이벤트 시스템에 기인하는 **프레임 드롭 제로**
- 게임플레이 중 이벤트 연산으로 인한 **GC 스파이크 제로**

![Stress Test](/img/game-event-system/examples/14-runtime-monitor/demo-14-performance.png)

초기화 비용 — Expression Tree 컴파일 — 은 씬 로드 시 일반적으로 총 50-200ms이며, 모든 조건 트리에 걸쳐 분산된다. 로딩 화면 동안 발생하고 플레이어에게는 감지할 수 없다. 지연 컴파일이란 리스너가 처음 활성화될 때 트리가 컴파일된다는 뜻이므로, 비용이 자연스럽게 분산된다.

## 실제로 동작하는 스케일링 전략

원시 수치를 아는 것도 유용하지만, 규모에서 수치를 낮게 유지하는 방법을 아는 것이 더 유용하다. 대규모 프로젝트를 위해 GES가 지원하는 구체적인 전략이다.

### 데이터베이스 파티셔닝

하나의 거대한 이벤트 레지스트리 대신, 도메인별로 이벤트를 파티셔닝하라: 전투 이벤트, UI 이벤트, 오디오 이벤트, AI 이벤트. 각 파티션이 자체 리스너 목록을 가지므로, 전투 이벤트 발생 시 UI 리스너를 순회하지 않는다. 총 리스너 수에 관계없이 발생당 비용이 일정하게 유지된다.

### 조건부 리스너

모든 리스너가 조건을 체크하고 대부분이 false를 반환하는 대신, GES는 리스너 호출 *전에* 조건을 평가한다. 조건이 실패한 리스너는 완전히 건너뛴다 — delegate 호출 없음, 함수 호출 오버헤드 없음. 리스너 100개가 있지만 조건이 true인 것이 5개뿐인 시나리오에서, 100번이 아니라 5번의 호출만 지불한다.

### OR 단락 평가

컴파일된 Expression Tree는 `OrElse`를 사용하여 단락 평가한다: OR 그룹의 첫 번째 조건이 true면 나머지는 건너뛴다. 평가 작업을 최소화하려면 OR 분기에서 true일 확률이 가장 높은 조건을 처음에 배치하라.

### 배치 연산을 위한 SetInspectorListenersActive

대규모 리스너 그룹을 일시 비활성화해야 할 때 — 컷씬, 로딩 전환, 메뉴 오버레이 동안 — 개별 리스너를 토글하는 대신 `SetInspectorListenersActive(false)`를 사용하라. 컴포넌트의 모든 inspector 설정 리스너의 평가를 방지하는 단일 호출이다, 하나씩 순회하는 오버헤드 없이.

### 프로파일링을 위한 Monitor Dashboard

개발 중 GES Monitor Window를 사용하여 핫 이벤트 채널을 식별하라 — 어떤 이벤트가 가장 빈번하게 발생하는지, 어떤 것이 리스너가 가장 많은지, 어떤 조건이 평가 비용이 가장 높은지. 그것들부터 먼저 최적화하라.

![Monitor Dashboard](/img/game-event-system/tools/runtime-monitor/monitor-dashboard.png)

## 모바일과 VR에서 이것이 중요한 이유

구체적인 프레임 예산 수치를 대입해보겠다.

### 모바일 (iOS/Android)

모바일 CPU는 데스크톱보다 5-10배 느리다. 데스크톱에서 0.5ms 이벤트 오버헤드가 모바일에서 2.5-5ms가 된다. 60 FPS 목표(16.67ms 예산)에서 이벤트 오버헤드만으로 예산의 15-30%다. GES로는 같은 작업량이 모바일에서 0.02-0.05ms다. 그 차이가 출시할 수 있느냐 없느냐의 차이다.

### VR (Quest, PSVR2)

VR은 프레임 예산에서 가장 까다로운 플랫폼이다. Quest는 90 FPS(프레임당 11.1ms)를 요구한다. PSVR2는 120 FPS(프레임당 8.3ms)를 목표로 한다. 그리고 VR 게임은 본질적으로 이벤트가 많다 — 핸드 트래킹이 이벤트를 생성하고, 게이즈 트래킹이 이벤트를 생성하고, 물리 인터랙션이 이벤트를 생성하고, 공간 오디오 트리거가 이벤트를 생성한다. VR에서 리플렉션 기반 이벤트 시스템은 확정적인 성능 병목이다. 제로 리플렉션 시스템은 이벤트 레이어를 프로파일러에서 보이지 않게 만든다, 정확히 그래야 하는 대로.

### 모바일에서의 GC 관점

이건 특별히 강조할 필요가 있다. 모바일의 Unity 가비지 컬렉터(Mono 런타임)는 세대별이 아니고 stop-the-world다. 실행되면 모든 것이 멈춘다. 수집 트리거 임계값은 다양하지만, 프레임당 할당은 사이클을 가속시킨다. VR에서 헤드 트래킹 중 GC 일시정지는 눈에 보이는 끊김을 유발하여 멀미를 일으킬 수 있다. 프레임당 가비지를 제로로 생성하는 이벤트 시스템은 최적화가 아니다 — VR 출시의 필수 요건이다.

## 결론

"고성능"은 기능이 아니다 — 측정 가능한 속성이다. 누군가 자신의 이벤트 시스템이 빠르다고 주장할 때, 올바른 질문은:

- 리스너 N명일 때 발생당 몇 마이크로초인가?
- 프레임당 몇 바이트가 할당되는가?
- 런타임에 리플렉션을 사용하는가? 무엇을 위해?
- 조건은 어떻게 평가하는가? 리플렉션으로? 컴파일된 코드로?

GES의 답: 서브마이크로초 발생, 제로 할당, 제로 런타임 리플렉션, 그리고 수동 작성 C#만큼 빠르게 실행되는 Expression Tree 컴파일 조건.

제로 리플렉션 접근법은 단순한 성능 최적화가 아니다. 비주얼 이벤트 편집이 프로덕션 게임에서 — 개발 머신에서는 잘 돌아가지만 200개 활성 엔티티의 Quest 3에서 무너지는 프로토타입이 아니라 — 실현 가능하게 만드는 것이다. 이벤트 시스템의 성능을 생각할 필요가 없을 만큼 빠르면, 더 자유롭게 사용하게 된다. 프레임 예산 걱정 없이 더 많은 이벤트, 더 많은 조건, 더 많은 리스너를 추가하게 된다. 그리고 두려움 없이 아키텍처를 설계하는 자유가 실제로 게임을 더 좋게 만든다.

성능은 럭셔리 기능이 아니다. 다른 모든 것이 올라서는 토대다.

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
