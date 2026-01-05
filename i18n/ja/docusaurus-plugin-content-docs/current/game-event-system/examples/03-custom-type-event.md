---
sidebar_label: '03 カスタム型イベント'
sidebar_position: 4
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 03 カスタム型イベント：自動コード生成

<!-- <VideoGif src="/video/game-event-system/03-custom-type-event.mp4" /> -->

## 📋 概要

実際のゲーム開発では、ダメージ量を単一の `float` で渡すだけでは不十分なことが多々あります。「誰が攻撃したか？」「クリティカルか？」「属性は？」「どこに当たったか？」といった情報をセットで扱う必要があります。このデモでは、**カスタムC#クラス**用のイベントを作成し、**自動コード生成システム**を活用して型安全性を維持する方法を解説します。

:::tip 💡 学べること
- カスタムデータクラスを使用したイベントの作成方法
- システムが独自の型に対して `GameEvent<T>` を自動生成する仕組み
- イベントを介して複雑なデータ構造を渡す方法
- 1つのイベントペイロードで複数のフィードバックシステムを駆動させる方法

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/03_CustomTypeEvent/03_CustomTypeEvent.unity
```

### シーン構成

**UIレイヤー (Canvas):**
- 🎮 **3つの攻撃ボタン** - 画面下部に配置
  - "Raise (Physical Damage)" ➔ `CustomEventRaiser.DealPhysicalDamage()` を実行
  - "Raise (Fire Damage)" ➔ `CustomEventRaiser.DealFireDamage()` を実行
  - "Raise (Critical Strike)" ➔ `CustomEventRaiser.DealCriticalStrike()` を実行

**ゲームロジックレイヤー (デモスクリプト):**
- 📤 **CustomTypeEventRaiser** - 発行側スクリプトを持つGameObject
  - 物理、火炎、クリティカル攻撃用の3つの `GameEvent<DamageInfo>` 参照を保持
  - プロパティの異なる `DamageInfo` オブジェクトを構築し、対応するイベントを発行

- 📥 **CustomTypeEventReceiver** - 受信側スクリプトを持つGameObject
  - Game Event Editorでのビジュアルバインディングを通じて、3つのダメージイベントすべてをリッスン
  - `DamageInfo` ペイロードを解析し、適切なビジュアル効果と物理フィードバックを実行

**ビジュアルフィードバックレイヤー (デモオブジェクト):**
- 🎯 **Capsule** - ダメージ対象（ダミー）
  - 物理的なノックバック用の Rigidbody を保持
  - 点滅エフェクト用の Renderer を保持
- 🔥 **パーティクルエフェクト** - 着弾点に生成される炎のVFX
- 💬 **フローティングテキスト** - カプセルの上に表示されるダメージ数値
- 🏠 **Plane** - シーンのコンテキスト用の地面

---

## 🎮 操作方法

### ステップ 1: プレイモードに入る

Unityの **Play** ボタンを押します。

### ステップ 2: 異なる攻撃タイプをテストする

**"Raise (Physical Damage)" をクリック:**
- ⚪ カプセルが白く点滅
- 💬 白いフローティングテキストで「10」を表示
- 🎯 小さなノックバックが発生
- 📝 コンソールログ: `[Combat Log] Dealt 10 (Physical) damage. Crit: False, Attacker: Player01`

**"Raise (Fire Damage)" をクリック:**
- 🟠 カプセルがオレンジに点滅
- 💬 オレンジのフローティングテキストでランダムなダメージ（15-25）を表示
- 🔥 着弾点に炎のパーティクルが生成
- 🎯 標準的なノックバックが発生
- 📝 コンソールに攻撃者「Player02」の火炎ダメージ詳細をログ出力

**"Raise (Critical Strike)" をクリック:**
- 🟣 カプセルが紫に点滅
- 💬 大きなフローティングテキストで高ダメージ（50-80）と「!」を表示
- 📹 演出としての**カメラシェイク**が発生
- 🎯 **強力なノックバック**が発生
- 📝 コンソールに攻撃者「Player03」のクリティカルヒット詳細をログ出力

---

## 🏗️ シーンのアーキテクチャ

### カスタムデータ構造

`DamageInfo` クラスは、戦闘に関連するすべてのデータを1つのパケットにまとめます：
```csharp
[Serializable]
public class DamageInfo
{
    public int amount;          // ダメージ値
    public bool isCritical;     // クリティカルヒットフラグ
    public DamageType type;     // 物理、火炎、または空(Void)
    public Vector3 hitPoint;    // VFX生成用の着弾位置
    public string attacker;     // ダメージソースの名前
}
```

**データをまとめる理由:**
- ✅ 1つのイベント呼び出しで必要なすべての情報を伝達できる
- ✅ 拡張が容易（イベントシグネチャを変えずに新しいプロパティを追加可能）
- ✅ 型安全なシリアライズとバリデーション
- ✅ 送信側と受信側の間のデータ契約が明確になる

---

### イベント定義 (Event Definitions)

**Game Event Editor** ウィンドウを開き、3つのダメージイベントを確認します：

![Game Event Editor](/img/game-event-system/examples/03-custom-type-event/demo-03-editor.png)

**データベース内のイベント:**

| イベント名         | 型                    | 用途                     |
| ------------------ | ----------------------- | ------------------------ |
| `OnPhysicalDamage` | `GameEvent<DamageInfo>` | 標準的な物理攻撃         |
| `OnFireDamage`     | `GameEvent<DamageInfo>` | 火炎魔法ダメージ         |
| `OnCriticalStrike` | `GameEvent<DamageInfo>` | 衝撃の大きいクリティカル |

**Behavior カラムに注目:**
3つのイベントすべてに型インジケーターとして **(DamageInfo)** と表示されています。これらの `GameEvent<DamageInfo>` クラスは、イベント作成時にプラグインによって**自動生成**されたものです。手動でコードを書く必要はありません！

:::note 🔧 コード生成

カスタム型を使用してイベントを Game Event Creator で作成すると、プラグインは自動的に以下の処理を行います：

1. `GameEvent<YourType>` クラスを生成
2. 対応するリスナーインターフェースを作成
3. インスペクターのドロップダウンやメソッドバインディングでの型安全性を確保

:::

---

### 送信側の設定 (CustomTypeEventRaiser)

ヒエラルキーで **CustomTypeEventRaiser** GameObject を選択します：

![CustomTypeEventRaiser Inspector](/img/game-event-system/examples/03-custom-type-event/demo-03-inspector.png)

**設定の詳細:**

**GameEvent セクション:**
- `Physical Damage Event` ➔ `OnPhysicalDamage`
- `Fire Damage Event` ➔ `OnFireDamage`
- `Critical Strike Event` ➔ `OnCriticalStrike`

**Settings セクション:**
- `Hit Target` ➔ Capsule (Transform) - ランダムな着弾点を計算するために使用

**型安全性の動作:**
- ドロップダウンには `GameEvent<DamageInfo>` アセットのみが表示されます。
- `GameEvent<string>` や `GameEvent<Vector3>` をこれらのスロットに割り当てることはできません。
- これにより、実行時の型不一致エラーが防止されます。

---

### 受信側の設定 (CustomTypeEventReceiver)

ヒエラルキーで **CustomTypeEventReceiver** GameObject を選択します：

![CustomTypeEventReceiver Inspector](/img/game-event-system/examples/03-custom-type-event/demo-03-receiver.png)

**参照設定:**
- `Floating Text Prefab` ➔ DamageFloatingText (GameObject)
- `Hit Particle Prefab` ➔ FireHitVFX (ParticleSystem)
- `Target Renderer` ➔ Capsule (Mesh Renderer)
- `Target Rigidbody` ➔ Capsule (Rigidbody)

**Behavior バインディング:**

3つのダメージイベントすべてが、**Behavior Window** を通じて同じ受信メソッドに紐付けられています：

| イベント            | 紐付けられたメソッド | シグネチャ               |
| ------------------ | ------------------ | ------------------------ |
| `OnPhysicalDamage` | `OnDamageReceived` | `void (DamageInfo info)` |
| `OnFireDamage`     | `OnDamageReceived` | `void (DamageInfo info)` |
| `OnCriticalStrike` | `OnDamageReceived` | `void (DamageInfo info)` |

**スマートルーティング:**
単一の受信メソッドが、`DamageInfo` のプロパティに基づいてフィードバックを賢く振り分けます。例えば、`type` をチェックして火炎パーティクルを出し、`isCritical` をチェックしてカメラシェイクを行う、といった具合です。

---

## 💻 コード解説

### 📤 CustomTypeEventRaiser.cs (送信側)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class CustomEventRaiser : MonoBehaviour
{
    [Header("GameEvent")]
    // 注目: GameEvent<DamageInfo> はプラグインによって自動生成されています
    [GameEventDropdown] public GameEvent<DamageInfo> physicalDamageEvent;
    [GameEventDropdown] public GameEvent<DamageInfo> fireDamageEvent;
    [GameEventDropdown] public GameEvent<DamageInfo> criticalStrikeEvent;

    [Header("Settings")]
    public Transform hitTarget;

    /// <summary>
    /// "Player01" からの標準的な物理攻撃をシミュレートします。
    /// Physical タイプの固定ダメージを送信します。
    /// </summary>
    public void DealPhysicalDamage()
    {
        SendDamage(physicalDamageEvent, 10f, false, DamageType.Physical, "Player01");
    }

    /// <summary>
    /// "Player02" からの火炎魔法をシミュレートします。
    /// ランダムなダメージ生成（15-25）の例です。
    /// </summary>
    public void DealFireDamage()
    {
        float dmg = Random.Range(15f, 25f);
        SendDamage(fireDamageEvent, dmg, false, DamageType.Fire, "Player02");
    }

    /// <summary>
    /// "Player03" からのクリティカルヒットをシミュレートします。
    /// isCritical フラグを立てて、特殊効果（カメラシェイク、大きなテキスト）をトリガーします。
    /// </summary>
    public void DealCriticalStrike()
    {
        float dmg = Random.Range(50f, 80f);
        SendDamage(criticalStrikeEvent, dmg, true, DamageType.Void, "Player03");
    }

    /// <summary>
    /// DamageInfo パケットを構築し、イベントを発行します。
    /// </summary>
    private void SendDamage(GameEvent<DamageInfo> gameEvent, float baseDamage, 
                           bool isCrit, DamageType type, string attacker)
    {
        if (gameEvent == null) return;
        
        // 着弾のバリエーションを出すためにランダムな着弾点を計算
        Vector3 randomPoint = hitTarget != null 
            ? hitTarget.position + Random.insideUnitSphere * 0.5f 
            : Vector3.zero;
        
        // データパケットの構築
        DamageInfo info = new DamageInfo(
            Mathf.RoundToInt(baseDamage), 
            isCrit, 
            type, 
            randomPoint, 
            attacker
        );

        // 複雑なオブジェクトを伴ってイベントを発行
        gameEvent.Raise(info);
        
        Debug.Log($"[Combat Log] Dealt {info.amount} ({info.type}) damage. " +
                  $"Crit: {info.isCritical}, Attacker: {info.attacker}");
    }
}
```

**ポイント:**
- 🎯 **カスタム型のサポート** - `GameEvent<DamageInfo>` が複雑なオブジェクトを処理します。
- 🏗️ **データの構築** - 関連するすべてのプロパティを持つパケットを作成します。
- 📦 **単一の呼び出し** - `.Raise(info)` でデータ構造全体を渡します。
- 🔇 **デカップリング** - どのようなビジュアルエフェクトがトリガーされるかを送信側は関知しません。

---

### 📥 CustomTypeEventReceiver.cs (受信側)
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
    /// GameEvent<DamageInfo> のリスナーメソッド。
    /// 複雑なデータを解析して、複数のフィードバックシステムをトリガーします。
    /// </summary>
    public void OnDamageReceived(DamageInfo info)
    {
        // 1. ビジュアル: ダメージタイプに基づいた色の点滅
        Color effectColor = GetColorByType(info.type);
        StartCoroutine(FlashColorRoutine(effectColor));

        // 2. UI: ダメージ数値のフローティングテキスト
        if (floatingTextPrefab != null)
        {
            ShowFloatingText(info, effectColor);
        }
        
        // 3. VFX: 火炎ダメージの場合の炎パーティクル
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

        // 4. 物理: ノックバック（クリティカル時はより強力に）
        if (targetRigidbody != null)
        {
            Vector3 forceDir = (info.hitPoint - transform.position).normalized * -1f;
            float forceStrength = info.isCritical ? 5f : 2f;
            targetRigidbody.AddForce(forceDir * forceStrength + Vector3.up * 2f, 
                                    ForceMode.Impulse);
            targetRigidbody.AddTorque(Random.insideUnitSphere * forceStrength, 
                                     ForceMode.Impulse);
        }
        
        // 5. カメラ: クリティカルヒット時のスクリーンシェイク
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
            // クリティカルヒット時は「!」を付与し、フォントサイズを大きくする
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

**ポイント:**
- 🎯 **プロパティベースのルーティング** - `info.type` や `info.isCritical` をチェックしてアクションを決定します。
- 🎨 **複数のフィードバックシステム** - 色の点滅、数値テキスト、VFX、物理、カメラシェイク。
- 📍 **空間データの活用** - `info.hitPoint` が VFX の生成場所を決定します。
- 🔇 **デカップリング** - どのボタンや発行者がイベントをトリガーしたかを気にする必要はありません。

---

## 🔑 重要なまとめ

| コンセプト            | 実装内容                                                     |
| ---------------------- | ------------------------------------------------------------ |
| 🎯 **カスタム型**       | `GameEvent<YourClass>` はシリアライズ可能な任意のC#クラスをサポート |
| 🏭 **自動生成**         | プラグインがイベントクラスを自動生成するため、手動コーディング不要 |
| 📦 **データのバンドル** | 複数のプロパティを持つ複雑なオブジェクトを1回の呼び出しで送信可能 |
| 🔀 **スマートルーティング** | 単一の受信メソッドが、データに基づいて異なるロジックパスを処理可能 |
| 🎨 **豊かな演出**       | 1つのイベントペイロードが、調整された複数のシステムを駆動     |

:::note 🎓 設計の洞察

カスタム型イベントは、戦闘、会話、インベントリなどの複雑なゲームシステムに最適です。5つの別々のイベント（`OnDamage`, `OnDamageType`, `OnCritical` など）を飛ばす代わりに、**すべてのデータを含んだ1つのイベント**を飛ばすことで、イベントシステムをクリーンで効率的に保つことができます。

:::

---

## 🎯 次のステップは？

カスタムデータ型をマスターしました。次は、イベントソースを追跡するために**カスタム送信元（Sender）情報**を追加する方法を見ていきましょう。

**次の章**: 送信元の追跡について学ぶ **[04 カスタム送信元イベント](./04-custom-sender-event.md)**

---

## 📚 関連ドキュメント

- **[Game Event Creator](../visual-workflow/game-event-creator.md)** - カスタム型を使用したイベントの作成方法
- **[コード生成](../tools/codegen-and-cleanup.md)** - 自動コード生成システムの理解
- **[APIリファレンス](../scripting/api-reference.md)** - カスタム型用のジェネリックイベントAPI