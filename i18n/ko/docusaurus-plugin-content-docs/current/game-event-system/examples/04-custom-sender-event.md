---
sidebar_label: '04 커스텀 Sender 이벤트'
sidebar_position: 5
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 04 커스텀 Sender 이벤트: 컨텍스트 인식 이벤트

<VideoGif src="/video/game-event-system/example/04-custom-sender-event.mp4" />

## 📋 개요

이전 데모에서 이벤트는 데이터를 전달했지만 익명이었습니다. 복잡한 게임에서는 **컨텍스트가 중요합니다**. 이 데모는 **Sender 인식 이벤트** (`GameEvent<TSender, TArgs>`)를 소개하여 receiver가 **누가** 이벤트를 트리거했는지 알 수 있게 하고, "공격자를 향해 보기" 또는 "공격자 프로필 표시"와 같은 컨텍스트 민감 로직을 가능하게 합니다.

:::tip 💡 배울 내용
- sender 정보가 있는 이중 제네릭 이벤트를 생성하는 방법
- GameObject sender와 순수 C# 클래스 sender의 차이점
- receiver가 공간적 및 논리적 반응을 위해 sender 컨텍스트를 사용하는 방법
- sender 인식 이벤트 vs 단순 이벤트를 사용해야 할 때

:::

---

## 🎬 데모 씬
```
Assets/TinyGiants/GameEventSystem/Demo/04_CustomSenderTypeEvent/04_CustomSenderTypeEvent.unity
```

### 씬 구성

**UI 레이어 (Canvas):**
- 🎮 **세 개의 공격 버튼** - 화면 하단에 위치
  - "Raise (Turret Damage)" → `CustomSenderTypeEventRaiser.RaiseTurretDamage()` 트리거
  - "Raise (Turret2 Damage)" → `CustomSenderTypeEventRaiser.RaiseTurret2Damage()` 트리거
  - "Raise (System Damage)" → `CustomSenderTypeEventRaiser.RaiseSystemDamage()` 트리거

**게임 로직 레이어 (Demo Scripts):**
- 📤 **CustomSenderTypeEventRaiser** - raiser 스크립트가 있는 GameObject
  - `GameEvent<GameObject, DamageInfo>`로 두 개의 물리적 포탑(빨강과 파랑) 관리
  - `GameEvent<PlayerStats, DamageInfo>`로 시스템 레벨 공격 처리
  - 포탑 조준, 발사체 발사 및 이벤트 발동 제어

- 📥 **CustomSenderTypeEventReceiver** - receiver 스크립트가 있는 GameObject
  - 시각적 바인딩을 통해 포탑 및 시스템 이벤트 모두 리스닝
  - sender 인식 로직 구현: 물리적 sender를 향한 회전, 논리적 sender의 프로필 표시

**시각적 피드백 레이어 (Demo Objects):**
- 🎯 **TargetDummy** - 중앙의 피해자 캡슐
  - 향하는 방향을 나타내는 녹색 "바이저" 보유
  - 넉백 물리를 위한 Rigidbody 포함
  - TextMeshPro를 통해 위에 공격자 이름/정보 표시
- 🔴 **SentryTurret_Red** - 왼쪽의 물리적 공격자
  - Head(조준을 위해 회전)와 MuzzlePoint(발사체 생성)로 구성
- 🔵 **SentryTurret_Blue** - 오른쪽의 물리적 공격자
  - 독립적인 조준 및 발사 시스템
- 🔥 **Projectile System** - 폭발 효과가 있는 시각적 발사체
- 🏠 **Plane** - 씬 컨텍스트를 위한 지면 표면

---

## 🎮 상호작용 방법

### 1단계: 플레이 모드 진입

Unity에서 **Play** 버튼을 누릅니다.

### 2단계: 다양한 공격 소스 테스트

**"Raise (Turret Damage)" 클릭:**
- 🎯 빨간 포탑이 더미를 빠르게 조준
- 🚀 발사체가 발사되어 목표를 향해 이동
- 💥 충돌 시: 
  - 더미가 **빨간 포탑을 향해 회전**
  - 정보 텍스트 표시: "SenderName: SentryTurret_Red"
  - 노란색 떠다니는 텍스트 "15" 표시
  - 물리 넉백 적용
- 📝 콘솔 로그: `[Sender1] Target acquired. Aiming...` → `[Receiver] Ouch! Hit by SentryTurret_Red.`

**"Raise (Turret2 Damage)" 클릭:**
- 🎯 파란 포탑이 더미를 빠르게 조준
- 🚀 오른쪽에서 발사체 발사
- 💥 충돌 시:
  - 더미가 **파란 포탑을 향해 회전**
  - 정보 텍스트 표시: "SenderName: SentryTurret_Blue"
  - 노란색 떠다니는 텍스트 "15" 표시
- 📝 더미가 어떤 포탑이 공격했는지 명확히 추적

**"Raise (System Damage)" 클릭:**
- 💥 즉시 데미지(발사체 없음)
- 🎯 더미가 **회전하지 않음**(향할 물리적 sender 없음)
- 정보 텍스트 표시: "SenderName: DragonSlayer_99"
  - 이것은 GameObject가 아닌 `PlayerStats` 클래스에서 옴
- 🟣 마젠타색 떠다니는 텍스트 "50!" 표시
- 📹 카메라 흔들림 효과(치명적 데미지)
- 📝 콘솔 로그: `[Receiver] Logical attack received from DragonSlayer_99. FactionID: 1`

---

## 🏗️ 씬 아키텍처

### 두 가지 타입의 Sender 인식 이벤트

이 데모는 두 가지 뚜렷한 시나리오로 sender 시스템의 유연성을 보여줍니다:

#### 시나리오 A: 물리적 Sender (GameObject)
```csharp
GameEvent<GameObject, DamageInfo>
```

**사용 사례:** sender가 씬에서 물리적 존재를 가질 때
- **Sender 타입:** Unity `GameObject` (포탑)
- **사용 가능한 컨텍스트:** Transform, position, rotation, 컴포넌트
- **Receiver 로직:** 공간적 반응(보기, 이동, 궤적선 그리기)

#### 시나리오 B: 논리적 Sender (순수 C# 클래스)
```csharp
GameEvent<PlayerStats, DamageInfo>
```

**사용 사례:** sender가 씬 표현 없이 데이터 객체일 때
- **Sender 타입:** 커스텀 C# 클래스 `PlayerStats`
- **사용 가능한 컨텍스트:** 플레이어 이름, 레벨, 파벌 ID, 커스텀 속성
- **Receiver 로직:** 데이터 기반 반응(프로필 표시, 파벌 확인, 수정자 적용)

---

### PlayerStats 클래스

sender가 `MonoBehaviour`를 상속할 필요가 없음을 보여주는 순수 C# 클래스:
```csharp
[System.Serializable]
public class PlayerStats
{
    public string playerName;
    public int level;
    public int factionId;

    public PlayerStats(string name, int lvl, int faction)
    {
        playerName = name;
        level = lvl;
        factionId = faction;
    }
}
```

**핵심 포인트:** 이것은 이벤트 시스템이 Unity 객체뿐만 아니라 **모든 직렬화 가능한 타입**과 함께 작동함을 증명합니다.

---

### 이벤트 정의

**Game Event Editor** 창을 열어 이중 제네릭 이벤트를 확인하세요:

![Game Event Editor](/img/game-event-system/examples/04-custom-sender-event/demo-04-editor.png)

**데이터베이스의 이벤트:**

| 이벤트 이름                | 타입                                 | 목적                         |
| -------------------------- | ------------------------------------ | ---------------------------- |
| `OnGameObjectDamageInfo`   | `GameEvent<GameObject, DamageInfo>`  | 빨간 포탑 물리적 공격        |
| `OnGameObjectDamageInfo_1` | `GameEvent<GameObject, DamageInfo>`  | 파란 포탑 물리적 공격        |
| `OnPlayerStatsDamageInfo`  | `GameEvent<PlayerStats, DamageInfo>` | 시스템 레벨 논리적 데미지    |

**Behavior 열 주목:**
- 처음 두 이벤트는 **(GameObject,DamageInfo)** 표시 - 물리적 sender용
- 세 번째 이벤트는 **(PlayerStats,DamageInfo)** 표시 - 논리적 sender용

이러한 복잡한 제네릭 클래스는 sender 인식 이벤트를 생성할 때 플러그인에 의해 **자동으로 생성**되었습니다.

:::note 🔧 Sender 이벤트 생성

Game Event Creator에서 이벤트를 생성할 때:

1. **Event Mode**를 **"With Sender"**로 설정
2. **Sender Type**: 물리적 객체의 경우 `GameObject`를 선택하거나 `PlayerStats`와 같은 커스텀 클래스를 검색
3. **Argument Type**: 데이터 페이로드 타입 선택(예: `DamageInfo`)
4. 시스템이 완전한 `GameEvent<TSender, TArgs>` 클래스를 자동으로 생성

:::

---

### Sender 설정 (CustomSenderTypeEventRaiser)

Hierarchy에서 **CustomSenderTypeEventRaiser** GameObject를 선택하세요:

![CustomSenderTypeEventRaiser Inspector](/img/game-event-system/examples/04-custom-sender-event/demo-04-inspector.png)

**포탑 구성:**

**Turret 1 (빨강):**
- `Name`: "Sender1"
- `Attack Event`: `OnGameObjectDamageInfo` (GameObject sender)
- `Head`: SentryTurret_Red/Head (조준용 Transform)
- `Muzzle Position`: Head/MuzzlePoint (발사체 생성용 Transform)

**Turret 2 (파랑):**
- `Name`: "Sender2"
- `Attack Event`: `OnGameObjectDamageInfo_1` (GameObject sender)
- `Head`: SentryTurret_Blue/Head
- `Muzzle Position`: Head/MuzzlePoint

**글로벌 시스템 이벤트:**
- `Global System Event`: `OnPlayerStatsDamageInfo` (PlayerStats sender)

**공유 리소스:**
- `Hit Target`: TargetDummy (Transform)
- `Projectile Prefab`: 시각 효과용 발사체 프리팹
- `Muzzle Flash VFX`: 발사 효과용 파티클 시스템

**작동 방식:**
1. 버튼 클릭이 포탑 공격 시퀀스 시작
2. 포탑이 목표를 향해 회전(부드러운 추적)
3. 정렬되면 발사체가 생성되어 이동
4. 충돌 시 **포탑 GameObject를 sender로**, DamageInfo를 데이터로 하여 이벤트 발동
5. 시스템 데미지의 경우 `PlayerStats` 인스턴스가 생성되어 sender로 사용됨

---

### Receiver 설정 (CustomSenderTypeEventReceiver)

Hierarchy에서 **CustomSenderTypeEventReceiver** GameObject를 선택하세요:

![CustomSenderTypeEventReceiver Inspector](/img/game-event-system/examples/04-custom-sender-event/demo-04-receiver.png)

**참조 구성:**
- `Floating Text Prefab`: DamageFloatingText (Text Mesh Pro)
- `Target Renderer`: TargetDummy (플래시 효과용 Mesh Renderer)
- `Target Rigidbody`: TargetDummy (물리용 Rigidbody)
- `Attacker Info Text`: LogText (sender 이름 표시용 Text Mesh Pro)

**Behavior 바인딩:**

두 개의 별도 receiver 메서드가 다른 sender 타입을 처리합니다:

| 이벤트                     | 바인딩된 메서드          | 시그니처                                     |
| -------------------------- | ------------------------ | -------------------------------------------- |
| `OnGameObjectDamageInfo`   | `OnTurretAttackReceived` | `void (GameObject sender, DamageInfo args)`  |
| `OnGameObjectDamageInfo_1` | `OnTurretAttackReceived` | `void (GameObject sender, DamageInfo args)`  |
| `OnPlayerStatsDamageInfo`  | `OnSystemAttackReceived` | `void (PlayerStats sender, DamageInfo args)` |

**컨텍스트 인식 로직:**
- **물리적 sender:** 공간적 회전을 위해 `sender.transform.position` 사용
- **논리적 sender:** 표시를 위해 `sender.playerName`과 `sender.level` 사용

---

## 💻 코드 분석

### 📤 CustomSenderTypeEventRaiser.cs (Sender)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class CustomSenderTypeEventRaiser : MonoBehaviour
{
    [System.Serializable]
    private class TurretConfig
    {
        public string name;
        [GameEventDropdown] public GameEvent<GameObject, DamageInfo> attackEvent;
        public Transform head;
        public Transform muzzlePosition;
        [HideInInspector] public bool isAttacking;
    }

    [Header("Turret Configurations")]
    [SerializeField] private TurretConfig turret1;
    [SerializeField] private TurretConfig turret2;

    [Header("Global System Event")]
    [GameEventDropdown] public GameEvent<PlayerStats, DamageInfo> globalSystemEvent;

    private PlayerStats _localPlayerStats;

    private void Start()
    {
        // 논리적 sender 생성(GameObject 표현 없음)
        _localPlayerStats = new PlayerStats("DragonSlayer_99", 99, 1);
    }

    /// <summary>
    /// Turret Damage 버튼에 의해 호출됨.
    /// 공격 시퀀스 시작: Aim → Fire → Hit → GameObject sender로 이벤트 발동
    /// </summary>
    public void RaiseTurretDamage()
    {
        InitiateAttack(turret1);
    }

    /// <summary>
    /// Turret2 Damage 버튼에 의해 호출됨.
    /// </summary>
    public void RaiseTurret2Damage()
    {
        InitiateAttack(turret2);
    }

    private void InitiateAttack(TurretConfig turret)
    {
        if (turret.attackEvent == null) return;
        
        turret.isAttacking = true;
        Debug.Log($"[{turret.name}] Target acquired. Aiming...");
    }

    private void OnProjectileHit(TurretConfig turret)
    {
        if (turret.attackEvent == null) return;

        Vector3 hitPos = hitTarget.position;
        DamageInfo info = new DamageInfo(15f, false, DamageType.Physical, hitPos, "Sentry Turret");

        // 핵심: 포탑의 GameObject를 sender로 전달
        GameObject turretRoot = turret.head.parent.gameObject;
        turret.attackEvent.Raise(turretRoot, info);
        
        Debug.Log($"[{turret.name}] Projectile Impact! Event Raised.");
    }

    /// <summary>
    /// 논리적 엔티티로부터의 시스템 레벨 공격을 시뮬레이션.
    /// </summary>
    public void RaiseSystemDamage()
    {
        if (globalSystemEvent == null) return;

        Vector3 hitPos = hitTarget != null ? hitTarget.position : Vector3.zero;
        DamageInfo info = new DamageInfo(50f, true, DamageType.Void, hitPos, "GameMaster");
        
        // 핵심: PlayerStats 인스턴스를 sender로 전달(GameObject 아님)
        globalSystemEvent.Raise(_localPlayerStats, info);
        
        Debug.Log("[GameMaster] Global system damage event raised.");
    }
}
```

**핵심 포인트:**
- 🎯 **이중 제네릭 구문** - `GameEvent<TSender, TArgs>`는 두 개의 타입 매개변수 필요
- 🏗️ **Sender 유연성** - `GameObject` 또는 커스텀 C# 클래스를 전달 가능
- 📦 **`.Raise(sender, data)`** - 두 매개변수 메서드가 컨텍스트와 페이로드 모두 제공
- 🎮 **물리적 Sender** - 공간적 컨텍스트를 위해 실제 씬 GameObject 사용
- 💡 **논리적 Sender** - 비공간적 컨텍스트를 위해 데이터 클래스 사용

---

### 📥 CustomSenderTypeEventReceiver.cs (Listener)
```csharp
using UnityEngine;
using TMPro;
using System.Collections;

public class CustomSenderTypeEventReceiver : MonoBehaviour
{
    [SerializeField] private TextMeshPro floatingTextPrefab;
    [SerializeField] private Renderer targetRenderer;
    [SerializeField] private Rigidbody targetRigidbody;
    [SerializeField] private TextMeshPro attackerInfoText;

    /// <summary>
    /// 바인딩 대상: GameEvent<GameObject, DamageInfo>
    /// 씬 존재가 있는 물리적 공격자를 처리.
    /// </summary>
    /// <param name="sender">공격한 GameObject (포탑)</param>
    /// <param name="args">데미지 세부정보</param>
    public void OnTurretAttackReceived(GameObject sender, DamageInfo args)
    {
        // 공간적 로직을 위해 sender의 Transform 사용
        if (sender != null)
        {
            // 공격자를 향해 부드럽게 회전
            StartCoroutine(SmoothLookAtRoutine(sender.transform.position));
            Debug.Log($"[Receiver] Ouch! Hit by {sender.name}.");
        }

        // sender의 GameObject 이름 표시
        if (attackerInfoText != null)
        {
            attackerInfoText.text = $"SenderName : <color=yellow>{sender.name}</color>";
        }

        // 공통 피드백: 떠다니는 텍스트, 플래시, 넉백
        ProcessCommonFeedback(args, Color.yellow);
    }

    /// <summary>
    /// 바인딩 대상: GameEvent<PlayerStats, DamageInfo>
    /// 씬 표현 없이 논리적 공격자를 처리.
    /// </summary>
    /// <param name="sender">프로필 데이터가 있는 PlayerStats 객체</param>
    /// <param name="args">데미지 세부정보</param>
    public void OnSystemAttackReceived(PlayerStats sender, DamageInfo args)
    {
        // 데이터 기반 로직을 위해 sender의 속성 사용
        if (attackerInfoText != null)
        {
            attackerInfoText.text = $"SenderName : <color=yellow>{sender.playerName}</color>";
        }
        
        Debug.Log($"[Receiver] Logical attack from {sender.playerName}. " +
                  $"FactionID: {sender.factionId}");
        
        // 시스템 데미지를 위한 다른 색상의 공통 피드백
        ProcessCommonFeedback(args, Color.magenta);
    }
    
    private void ProcessCommonFeedback(DamageInfo args, Color color)
    {
        // 떠다니는 데미지 텍스트
        if (floatingTextPrefab)
        {
            string text = args.isCritical ? $"{args.amount}!" : args.amount.ToString();
            ShowFloatingText(text, color, args.hitPoint);
        }
        
        // 색상 플래시
        StartCoroutine(FlashColorRoutine(Color.red));

        // 물리 넉백(크리티컬에 더 강함)
        ApplyPhysicsKnockback(args);
        
        // 크리티컬 히트의 카메라 흔들림
        if (args.isCritical)
        {
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
        }
    }
    
    private IEnumerator SmoothLookAtRoutine(Vector3 targetPos)
    {
        Vector3 direction = targetPos - transform.position;
        direction.y = 0;
        
        if (direction != Vector3.zero)
        {
            Quaternion targetRot = Quaternion.LookRotation(direction);
            float time = 0f;
            Quaternion startRot = transform.rotation;
            
            // 시간에 따른 부드러운 회전
            while(time < 1f)
            {
                time += Time.deltaTime * 5f;
                transform.rotation = Quaternion.Slerp(startRot, targetRot, time);
                yield return null;
            }
        }
    }
}
```

**핵심 포인트:**
- 🎯 **시그니처 매칭** - 각 메서드 시그니처는 이벤트의 제네릭 타입과 일치해야 함
- 🧭 **공간적 로직** - `GameObject` sender가 위치 기반 반응 가능(회전, 거리 확인)
- 📊 **데이터 로직** - `PlayerStats` sender가 프로필 기반 반응 가능(이름 표시, 파벌 확인)
- 🔀 **통합 피드백** - 공통 효과(플래시, 넉백)가 두 sender 타입에 모두 적용됨
- 🎨 **컨텍스트별 동작** - 회전은 물리적 sender에만 발생

---

## 🔑 핵심 요점

| 개념                      | 구현                                                         |
| ------------------------- | ------------------------------------------------------------ |
| 🎯 **이중 제네릭 이벤트**  | `GameEvent<TSender, TArgs>`가 sender 컨텍스트와 데이터 페이로드 모두 제공 |
| 🏗️ **Sender 유연성**      | Unity GameObject와 순수 C# 클래스 모두 지원                  |
| 🧭 **공간적 컨텍스트**     | GameObject sender가 위치/회전 기반 로직 가능                 |
| 📊 **데이터 컨텍스트**     | 커스텀 클래스 sender가 프로필/속성 기반 로직 가능            |
| 🔀 **통합 처리**           | 하나의 receiver가 여러 sender 타입을 지능적으로 처리 가능    |

:::note 🎓 설계 인사이트

Sender 인식 이벤트는 **누가 이벤트를 트리거했는지**가 **무슨 일이 일어났는지**만큼 중요할 때 완벽합니다. 공간적 반응(향하기, 타겟팅, 거리)에는 GameObject sender를 사용하고 데이터 기반 로직(프로필, 파벌, 스탯)에는 커스텀 클래스 sender를 사용하세요. 이 패턴은 전투 시스템, AI 반응 및 멀티플레이어 귀속에 이상적입니다!

:::

---

## 🎯 다음 단계

sender 인식 이벤트를 마스터했습니다. 이제 우선순위 시스템으로 **이벤트 실행 순서를 제어**하는 방법을 탐색해 봅시다.

**다음 챕터**: **[05 Priority Event](./05-priority-event.md)**에서 이벤트 우선순위에 대해 배우기

---

## 📚 관련 문서

- **[Game Event Creator](../visual-workflow/game-event-creator.md)** - sender 인식 이벤트를 생성하는 방법
- **[Raising Events](../scripting/raising-and-scheduling.md)** - `.Raise(sender, args)`에 대한 API
- **[Listening Strategies](../scripting/listening-strategies.md)** - 고급 콜백 패턴
- **[API Reference](../scripting/api-reference.md)** - 완전한 이중 제네릭 이벤트 API