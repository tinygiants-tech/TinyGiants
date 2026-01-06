---
sidebar_label: '03 커스텀 타입 이벤트'
sidebar_position: 4
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 03 커스텀 타입 이벤트: 자동 코드 생성

<VideoGif src="/video/game-event-system/example/03-custom-type-event.mp4" />

## 📋 개요

실제 게임에서 데미지 처리를 위해 단일 `float` 값을 전달하는 것만으로는 충분하지 않은 경우가 많습니다. "누가 공격했는가?", "크리티컬인가?", "데미지 속성은 무엇인가?", "어디에 맞았는가?"와 같이 데이터를 묶어서 전달해야 할 때가 많기 때문입니다. 이 데모는 **커스텀 C# 클래스**에 대한 이벤트를 생성하고, **자동 코드 생성** 시스템을 활용하여 타입 안정성을 유지하는 방법을 보여줍니다.

:::tip 💡 배울 내용
- 커스텀 데이터 클래스를 사용하여 이벤트를 생성하는 방법
- 시스템이 사용자의 타입에 맞춰 `GameEvent<T>`를 자동 생성하는 방식
- 이벤트를 통해 복잡한 데이터 구조를 전달하는 방법
- 하나의 이벤트 페이로드가 어떻게 여러 피드백 시스템을 구동하는지

:::

---

## 🎬 데모 씬
```
Assets/TinyGiants/GameEventSystem/Demo/03_CustomTypeEvent/03_CustomTypeEvent.unity
```

### 씬 구성

**UI 레이어 (Canvas):**
- 🎮 **세 개의 공격 버튼** - 화면 하단에 위치
  - "Raise (Physical Damage)" ➔ `CustomEventRaiser.DealPhysicalDamage()` 트리거
  - "Raise (Fire Damage)" ➔ `CustomEventRaiser.DealFireDamage()` 트리거
  - "Raise (Critical Strike)" ➔ `CustomEventRaiser.DealCriticalStrike()` 트리거

**게임 로직 레이어 (데모 스크립트):**
- 📤 **CustomTypeEventRaiser** - 발생기(Raiser) 스크립트가 포함된 게임 오브젝트
  - 물리(Physical), 화염(Fire), 크리티컬(Critical) 공격을 위한 3개의 `GameEvent<DamageInfo>` 참조를 보유합니다.
  - 서로 다른 속성을 가진 `DamageInfo` 오브젝트를 생성하고 해당 이벤트를 발생시킵니다.

- 📥 **CustomTypeEventReceiver** - 수신기(Receiver) 스크립트가 포함된 게임 오브젝트
  - 게임 이벤트 에디터의 시각적 바인딩을 통해 3개의 데미지 이벤트를 모두 리스닝합니다.
  - `DamageInfo` 페이로드를 파싱하여 적절한 시각적 및 물리적 피드백을 트리거합니다.

**시각적 피드백 레이어 (데모 오브젝트):**
- 🎯 **Capsule** - 데미지 타겟 (더미)
  - 물리적 노크백을 위한 리지드바디(Rigidbody)를 가집니다.
  - 컬러 플래시 효과를 위한 렌더러(Renderer)를 가집니다.
- 🔥 **Particle Effects** - 충격 지점에 생성되는 화염 히트 VFX
- 💬 **Floating Text** - 캡슐 위에 표시되는 데미지 숫자
- 🏠 **Plane** - 씬 배경을 위한 바닥

---

## 🎮 상호작용 방법

### 1단계: 플레이 모드 진입

유니티의 **Play** 버튼을 누릅니다.

### 2단계: 다양한 공격 타입 테스트

**"Raise (Physical Damage)" 클릭:**
- ⚪ 캡슐에 흰색 컬러 플래시 효과 발생
- 💬 흰색으로 "10" 데미지 플로팅 텍스트 표시
- 🎯 작은 노크백 힘 적용
- 📝 콘솔 로그: `[Combat Log] Dealt 10 (Physical) damage. Crit: False, Attacker: Player01`

**"Raise (Fire Damage)" 클릭:**
- 🟠 캡슐에 주황색 컬러 플래시 효과 발생
- 💬 주황색으로 무작위 데미지(15-25) 플로팅 텍스트 표시
- 🔥 히트 지점에 화염 파티클 효과 생성
- 🎯 표준 노크백 힘 적용
- 📝 콘솔에 "Player02" 공격자의 화염 데미지 상세 로그 출력

**"Raise (Critical Strike)" 클릭:**
- 🟣 캡슐에 보라색 컬러 플래시 효과 발생
- 💬 큰 폰트의 플로팅 텍스트로 높은 데미지(50-80)와 "!" 접미사 표시
- 📹 역동적인 연출을 위한 **카메라 흔들림 효과** 발생
- 🎯 **강력한 노크백 힘** 적용
- 📝 콘솔에 "Player03" 공격자의 크리티컬 히트 상세 로그 출력

---

## 🏗️ 씬 아키텍처

### 커스텀 데이터 구조

`DamageInfo` 클래스는 모든 전투 관련 데이터를 단일 패킷으로 묶습니다.
```csharp
[Serializable]
public class DamageInfo
{
    public int amount;          // 데미지 수치
    public bool isCritical;     // 크리티컬 여부
    public DamageType type;     // 물리, 화염 또는 보이드(Void)
    public Vector3 hitPoint;    // VFX 생성을 위한 충격 지점
    public string attacker;     // 데미지 소스 이름
}
```

**데이터를 묶는 이유는?**
- ✅ 한 번의 이벤트 호출로 필요한 모든 정보를 전달 가능
- ✅ 확장 용이성 (이벤트 시그니처를 변경하지 않고 새 프로퍼티 추가 가능)
- ✅ 타입 안전한 직렬화 및 검증
- ✅ 송신자와 수신자 사이의 명확한 데이터 계약

---

### 이벤트 정의 (Event Definitions)

**게임 이벤트 에디터** 창을 열어 미리 구성된 3개의 데미지 이벤트를 확인하십시오.

![Game Event Editor](/img/game-event-system/examples/03-custom-type-event/demo-03-editor.png)

**데이터베이스 내 이벤트:**

| 이벤트 이름 | 타입 | 용도 |
| ------------------ | ----------------------- | ------------------------- |
| `OnPhysicalDamage` | `GameEvent<DamageInfo>` | 표준 물리 공격 |
| `OnFireDamage` | `GameEvent<DamageInfo>` | 화염 기반 마법 데미지 |
| `OnCriticalStrike` | `GameEvent<DamageInfo>` | 충격이 큰 크리티컬 히트 |

**Behavior 열 확인:**
세 이벤트 모두 타입 인지자로 **(DamageInfo)**를 표시합니다. 이 `GameEvent<DamageInfo>` 클래스들은 이벤트를 생성할 때 플러그인에 의해 **자동으로 생성**되었습니다. 수동 코딩이 전혀 필요하지 않습니다!

:::note 🔧 코드 생성

게임 이벤트 생성기(Creator)에서 커스텀 타입을 가진 이벤트를 생성하면 플러그인이 자동으로 다음을 수행합니다.

1. `GameEvent<YourType>` 클래스 생성
2. 대응하는 리스너 인터페이스 생성
3. 인스펙터 드롭다운 및 메서드 바인딩에서의 타입 안정성 보장

:::

---

### 송신자 설정 (CustomTypeEventRaiser)

하이어라키에서 **CustomTypeEventRaiser** 게임 오브젝트를 선택하십시오.

![CustomTypeEventRaiser Inspector](/img/game-event-system/examples/03-custom-type-event/demo-03-inspector.png)

**설정 세부 사항:**

**GameEvent 섹션:**
- `Physical Damage Event` ➔ `OnPhysicalDamage`
- `Fire Damage Event` ➔ `OnFireDamage`
- `Critical Strike Event` ➔ `OnCriticalStrike`

**Settings 섹션:**
- `Hit Target` ➔ Capsule (Transform) - 무작위 히트 지점 계산에 사용됩니다.

**작동 중인 타입 안정성:**
- 드롭다운에는 오직 `GameEvent<DamageInfo>` 에셋만 표시됩니다.
- 이 슬롯에 `GameEvent<string>`이나 `GameEvent<Vector3>`를 할당할 수 없습니다.
- 이를 통해 런타임 타입 불일치 에러를 방지합니다.

---

### 수신자 설정 (CustomTypeEventReceiver)

하이어라키에서 **CustomTypeEventReceiver** 게임 오브젝트를 선택하십시오.

![CustomTypeEventReceiver Inspector](/img/game-event-system/examples/03-custom-type-event/demo-03-receiver.png)

**참조 설정:**
- `Floating Text Prefab` ➔ DamageFloatingText (GameObject)
- `Hit Particle Prefab` ➔ FireHitVFX (ParticleSystem)
- `Target Renderer` ➔ Capsule (Mesh Renderer)
- `Target Rigidbody` ➔ Capsule (Rigidbody)

**Behavior 바인딩:**

세 개의 데미지 이벤트는 모두 **Behavior 창**을 통해 동일한 수신자 메서드에 바인딩되어 있습니다.

| 이벤트 | 바인딩된 메서드 | 시그니처 |
| ------------------ | ------------------ | ------------------------ |
| `OnPhysicalDamage` | `OnDamageReceived` | `void (DamageInfo info)` |
| `OnFireDamage` | `OnDamageReceived` | `void (DamageInfo info)` |
| `OnCriticalStrike` | `OnDamageReceived` | `void (DamageInfo info)` |

**스마트 라우팅:**
단일 수신자 메서드는 `DamageInfo` 프로퍼티를 기반으로 피드백을 지능적으로 라우팅합니다. 예를 들어, `type`을 확인하여 화염 파티클을 재생하거나, `isCritical`을 확인하여 카메라를 흔드는 식입니다.

---

## 💻 코드 분석

### 📤 CustomTypeEventRaiser.cs (송신자)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class CustomEventRaiser : MonoBehaviour
{
    [Header("GameEvent")]
    // 참고: GameEvent<DamageInfo>는 플러그인에 의해 자동으로 생성되었습니다.
    [GameEventDropdown] public GameEvent<DamageInfo> physicalDamageEvent;
    [GameEventDropdown] public GameEvent<DamageInfo> fireDamageEvent;
    [GameEventDropdown] public GameEvent<DamageInfo> criticalStrikeEvent;

    [Header("Settings")]
    public Transform hitTarget;

    /// <summary>
    /// "Player01"의 표준 물리 공격을 시뮬레이션합니다.
    /// 물리(Physical) 타입의 고정 데미지를 보냅니다.
    /// </summary>
    public void DealPhysicalDamage()
    {
        SendDamage(physicalDamageEvent, 10f, false, DamageType.Physical, "Player01");
    }

    /// <summary>
    /// "Player02"의 화염 마법을 시뮬레이션합니다.
    /// 무작위 데미지 생성(15-25)을 보여줍니다.
    /// </summary>
    public void DealFireDamage()
    {
        float dmg = Random.Range(15f, 25f);
        SendDamage(fireDamageEvent, dmg, false, DamageType.Fire, "Player02");
    }

    /// <summary>
    /// "Player03"의 크리티컬 히트를 시뮬레이션합니다.
    /// 특수 효과(카메라 흔들림, 큰 텍스트)를 트리거하기 위해 isCritical 플래그를 설정합니다.
    /// </summary>
    public void DealCriticalStrike()
    {
        float dmg = Random.Range(50f, 80f);
        SendDamage(criticalStrikeEvent, dmg, true, DamageType.Void, "Player03");
    }

    /// <summary>
    /// DamageInfo 패킷을 구성하고 이벤트를 발생시킵니다.
    /// </summary>
    private void SendDamage(GameEvent<DamageInfo> gameEvent, float baseDamage, 
                           bool isCrit, DamageType type, string attacker)
    {
        if (gameEvent == null) return;
        
        // 충격의 변화를 시뮬레이션하기 위해 무작위 히트 지점 계산
        Vector3 randomPoint = hitTarget != null 
            ? hitTarget.position + Random.insideUnitSphere * 0.5f 
            : Vector3.zero;
        
        // 데이터 패킷 구성
        DamageInfo info = new DamageInfo(
            Mathf.RoundToInt(baseDamage), 
            isCrit, 
            type, 
            randomPoint, 
            attacker
        );

        // 복잡한 오브젝트를 인자로 하여 이벤트 발생
        gameEvent.Raise(info);
        
        Debug.Log($"[Combat Log] Dealt {info.amount} ({info.type}) damage. " +
                  $"Crit: {info.isCritical}, Attacker: {info.attacker}");
    }
}
```

**핵심 포인트:**
- 🎯 **커스텀 타입 지원** - `GameEvent<DamageInfo>`가 복잡한 오브젝트를 처리합니다.
- 🏗️ **데이터 구성** - 모든 관련 속성을 포함하는 패킷을 빌드합니다.
- 📦 **단일 호출** - `.Raise(info)`가 전체 데이터 구조를 전달합니다.
- 🔇 **디커플링** - 어떤 시각 효과가 트리거될지 송신자는 알지 못합니다.

---

### 📥 CustomTypeEventReceiver.cs (리스너)
```csharp
using UnityEngine;
using TMPro;
using System.Collections;

public class CustomTypeEventReceiver : MonoBehaviour
{
    [Header("Reference")]
    [SerializeField] private GameObject floatingTextPrefab;
    [SerializeField] private ParticleSystem hitParticlePrefab;
    [SerializeField] private Renderer targetRenderer;
    [SerializeField] private Rigidbody targetRigidbody;

    private Camera _mainCamera;

    /// <summary>
    /// GameEvent<DamageInfo>를 위한 리스너 메서드입니다.
    /// 복잡한 데이터를 파싱하여 여러 피드백 시스템을 트리거합니다.
    /// </summary>
    public void OnDamageReceived(DamageInfo info)
    {
        // 1. 시각 효과: 데미지 타입에 따른 컬러 플래시
        Color effectColor = GetColorByType(info.type);
        StartCoroutine(FlashColorRoutine(effectColor));

        // 2. UI: 플로팅 데미지 텍스트
        if (floatingTextPrefab != null)
        {
            ShowFloatingText(info, effectColor);
        }
        
        // 3. VFX: 화염 데미지일 경우 화염 파티클 생성
        if (info.type == DamageType.Fire && hitParticlePrefab != null)
        {
            Vector3 centerToHitDir = (info.hitPoint - transform.position).normalized;
            Vector3 spawnPos = info.hitPoint + (centerToHitDir * 0.2f);
            
            var vfxInstance = Instantiate(hitParticlePrefab, spawnPos, 
                                         Quaternion.LookRotation(centerToHitDir));
            var main = vfxInstance.main;
            main.startColor = effectColor;
            vfxInstance.Play();
            Destroy(vfxInstance.gameObject, 2.0f);
        }

        // 4. 물리 효과: 노크백 힘 (크리티컬일 때 더 강력함)
        if (targetRigidbody != null)
        {
            Vector3 forceDir = (info.hitPoint - transform.position).normalized * -1f;
            float forceStrength = info.isCritical ? 5f : 2f;
            targetRigidbody.AddForce(forceDir * forceStrength + Vector3.up * 2f, 
                                    ForceMode.Impulse);
            targetRigidbody.AddTorque(Random.insideUnitSphere * forceStrength, 
                                     ForceMode.Impulse);
        }
        
        // 5. 카메라: 크리티컬 히트 시 화면 흔들림
        if (info.isCritical)
        {
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
        }
    }
    
    private void ShowFloatingText(DamageInfo info, Color color)
    {
        GameObject go = Instantiate(floatingTextPrefab, info.hitPoint + Vector3.up, 
                                   Quaternion.identity);
        var tmp = go.GetComponent<TextMeshPro>();
        
        if (tmp != null)
        {
            // 크리티컬 히트는 "!" 접미사가 붙고 더 큰 폰트로 표시됩니다.
            tmp.text = info.isCritical ? $"{info.amount}!" : info.amount.ToString();
            tmp.color = color;
            tmp.fontSize = info.isCritical ? 10 : 6;
        }
        
        if (Camera.main) 
            go.transform.rotation = Camera.main.transform.rotation;

        StartCoroutine(AnimateText(go.transform));
    }

    private IEnumerator FlashColorRoutine(Color color)
    {
        if (targetRenderer != null)
        {
            Color original = targetRenderer.material.color;
            targetRenderer.material.color = color * 1.5f;
            yield return new WaitForSeconds(0.1f);
            targetRenderer.material.color = original;
        }
    }

    private IEnumerator ShakeCameraRoutine(float duration, float magnitude)
    {
        if (_mainCamera == null) yield break;
        
        Vector3 originalPos = _mainCamera.transform.position;
        float elapsed = 0.0f;
        
        while (elapsed < duration)
        {
            float x = Random.Range(-1f, 1f) * magnitude;
            float y = Random.Range(-1f, 1f) * magnitude;
            _mainCamera.transform.position = originalPos + new Vector3(x, y, 0);
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        _mainCamera.transform.position = originalPos;
    }

    private Color GetColorByType(DamageType type)
    {
        switch (type)
        {
            case DamageType.Physical: return Color.white;
            case DamageType.Fire: return new Color(1f, 0.5f, 0f);
            case DamageType.Void: return new Color(0.8f, 0f, 1f);
            default: return Color.grey;
        }
    }
}
```

**핵심 포인트:**
- 🎯 **속성 기반 라우팅** - `info.type` 및 `info.isCritical`을 확인하여 액션을 결정합니다.
- 🎨 **다중 피드백 시스템** - 컬러 플래시, 플로팅 텍스트, VFX, 물리 효과, 카메라 흔들림을 모두 제어합니다.
- 📍 **공간 데이터 활용** - `info.hitPoint`가 VFX 생성 위치를 결정합니다.
- 🔇 **디커플링** - 어떤 버튼이나 발생기가 이벤트를 트리거했는지 알 필요가 없습니다.

---

## 🔑 핵심 요약

| 개념 | 구현 방식 |
| --------------------- | ------------------------------------------------------------ |
| 🎯 **커스텀 타입** | `GameEvent<YourClass>`는 직렬화 가능한 모든 C# 클래스를 지원함 |
| 🏭 **자동 생성** | 플러그인이 이벤트 클래스를 자동으로 생성함 — 수동 코딩 불필요 |
| 📦 **데이터 묶기** | 여러 프로퍼티를 가진 복잡한 오브젝트를 한 번의 호출로 전달 |
| 🔀 **스마트 라우팅** | 단일 수신자 메서드가 데이터를 기반으로 서로 다른 로직 경로를 처리 가능 |
| 🎨 **풍부한 피드백** | 하나의 이벤트 페이로드가 협력하는 여러 시스템을 동시에 구동 |

:::note 🎓 디자인 인사이트

커스텀 타입 이벤트는 전투, 대화 또는 인벤토리와 같은 복잡한 게임 시스템에 적합합니다. 5개의 개별 이벤트(`OnDamage`, `OnDamageType`, `OnCritical` 등)를 발생시키는 대신, **모든 데이터를 포함한 하나의 이벤트**를 발생시키면 이벤트 시스템을 깔끔하고 효율적으로 유지할 수 있습니다!

:::

---

## 🎯 다음 단계는?

커스텀 데이터 타입을 마스터했습니다. 이제 이벤트 소스를 추적하기 위해 **커스텀 송신자(Sender) 정보**를 추가하는 방법을 살펴보겠습니다.

**다음 장**: **[04 커스텀 송신자 이벤트](./04-custom-sender-event.md)**에서 송신자 추적에 대해 배워보세요.

---

## 📚 관련 문서

- **[게임 이벤트 생성기](../visual-workflow/game-event-creator.md)** - 커스텀 타입을 사용하여 이벤트를 생성하는 방법
- **[코드 생성](../tools/codegen-and-cleanup.md)** - 자동 코드 생성 시스템 이해하기
- **[API 레퍼런스](../scripting/api-reference.md)** - 커스텀 타입을 위한 제네릭 이벤트 API