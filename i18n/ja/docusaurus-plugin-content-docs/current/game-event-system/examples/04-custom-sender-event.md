---
sidebar_label: '04 カスタム送信元イベント'
sidebar_position: 5
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 04 カスタム送信元イベント：コンテキストを認識するイベント

<VideoGif src="/video/game-event-system/example/04-custom-sender-event.mp4" />

## 📋 概要

これまでのデモでは、イベントはデータを運んでいましたが、送信元は匿名でした。複雑なゲームでは、**「コンテキスト（文脈）」が重要**になります。このデモでは、**送信元を認識するイベント (Sender-Aware Events)** (`GameEvent<TSender, TArgs>`) を紹介します。これにより、受信側は「**誰が**」イベントをトリガーしたかを知ることができ、「攻撃者の方を向く」や「攻撃者のプロフィールを表示する」といった、コンテキストに応じたロジックが可能になります。

:::tip 💡 学べること
- 送信元情報を持つ二重ジェネリックイベントの作成方法
- GameObject 送信元と純粋な C# クラス送信元の違い
- 受信側が送信元のコンテキストを空間的・論理的な反応に利用する方法
- 送信元認識イベントと単純なイベントの使い分け

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/04_CustomSenderTypeEvent/04_CustomSenderTypeEvent.unity
```

### シーン構成

**UIレイヤー (Canvas):**
- 🎮 **3つの攻撃ボタン** - 画面下部に配置
  - "Raise (Turret Damage)" ➔ `CustomSenderTypeEventRaiser.RaiseTurretDamage()` を実行
  - "Raise (Turret2 Damage)" ➔ `CustomSenderTypeEventRaiser.RaiseTurret2Damage()` を実行
  - "Raise (System Damage)" ➔ `CustomSenderTypeEventRaiser.RaiseSystemDamage()` を実行

**ゲームロジックレイヤー (デモスクリプト):**
- 📤 **CustomSenderTypeEventRaiser** - 発行側スクリプトを持つGameObject
  - `GameEvent<GameObject, DamageInfo>` を使用して、2台の物理的なタレット（赤と青）を管理
  - `GameEvent<PlayerStats, DamageInfo>` を使用して、システムレベルの攻撃を処理
  - タレットの照準、弾の発射、イベントの発行を制御

- 📥 **CustomSenderTypeEventReceiver** - 受信側スクリプトを持つGameObject
  - ビジュアルバインディングを通じて、タレットとシステムの両方のイベントをリッスン
  - 送信元認識ロジックを実装：物理的な送信元への回転、論理的な送信元のプロフィール表示

**ビジュアルフィードバックレイヤー (デモオブジェクト):**
- 🎯 **TargetDummy** - 中央にある被害者のカプセル
  - 向いている方向を示す緑色の「バイザー」を保持
  - ノックバック物理用の Rigidbody を保持
  - TextMeshPro を介して攻撃者の名前/情報を上部に表示
- 🔴 **SentryTurret_Red** - 左側の物理的な攻撃者
  - Head（照準のために回転）と MuzzlePoint（弾の生成点）で構成
- 🔵 **SentryTurret_Blue** - 右側の物理的な攻撃者
  - 独立した照準および発射システム
- 🔥 **Projectile System** - 爆発エフェクトを伴う視覚的な弾丸
- 🏠 **Plane** - シーンのコンテキスト用の地面

---

## 🎮 操作方法

### ステップ 1: プレイモードに入る

Unityの **Play** ボタンを押します。

### ステップ 2: 異なる攻撃ソースをテストする

**"Raise (Turret Damage)" をクリック:**
- 🎯 赤いタレットが素早くダミーに狙いを定めます。
- 🚀 弾丸が発射され、ターゲットに向かって進みます。
- 💥 着弾時：
  - ダミーが**赤いタレットの方を向くように回転**します。
  - 情報テキストに "SenderName: SentryTurret_Red" と表示されます。
  - 黄色のフローティングテキスト "15" が表示されます。
  - 物理的なノックバックが適用されます。
- 📝 コンソールログ: `[Sender1] Target acquired. Aiming...` ➔ `[Receiver] Ouch! Hit by SentryTurret_Red.`

**"Raise (Turret2 Damage)" をクリック:**
- 🎯 青いタレットが素早くダミーに狙いを定めます。
- 🚀 右側から弾丸が発射されます。
- 💥 着弾時：
  - ダミーが**青いタレットの方を向くように回転**します。
  - 情報テキストに "SenderName: SentryTurret_Blue" と表示されます。
  - 黄色のフローティングテキスト "15" が表示されます。
- 📝 ダミーがどのタレットから攻撃されたかを明確に追跡していることがわかります。

**"Raise (System Damage)" をクリック:**
- 💥 即座にダメージが発生します（弾丸なし）。
- 🎯 ダミーは**回転しません**（向き合うべき物理的な送信元がないため）。
- 情報テキストに "SenderName: DragonSlayer_99" と表示されます。
  - これは GameObject ではなく、`PlayerStats` クラスからの情報です。
- 🟣 マゼンタ色のフローティングテキスト "50!" が表示されます。
- 📹 カメラシェイクエフェクトが発生します（クリティカルダメージ）。
- 📝 コンソールログ: `[Receiver] Logical attack received from DragonSlayer_99. FactionID: 1`

---

## 🏗️ シーンのアーキテクチャ

### 2種類の送信元認識イベント

このデモでは、2つの異なるシナリオを通じて送信元システムの柔軟性を示します。

#### シナリオ A: 物理的な送信元 (GameObject)
```csharp
GameEvent<GameObject, DamageInfo>
```

**ユースケース:** 送信元がシーン内に物理的に存在する場合
- **送信元タイプ:** Unity `GameObject` (タレット)
- **利用可能なコンテキスト:** Transform、位置、回転、コンポーネント
- **受信側のロジック:** 空間的な反応（注視する、近づく、軌道線を描く）

#### シナリオ B: 論理的な送信元 (純粋な C# クラス)
```csharp
GameEvent<PlayerStats, DamageInfo>
```

**ユースケース:** 送信元がシーン表現を持たないデータオブジェクトである場合
- **送信元タイプ:** カスタム C# クラス `PlayerStats`
- **利用可能なコンテキスト:** プレイヤー名、レベル、派閥ID、カスタムプロパティ
- **受信側のロジック:** データ駆動型の反応（プロフィールの表示、派閥のチェック、補正値の適用）

---

### PlayerStats クラス

送信元が `MonoBehaviour` を継承する必要がないことを示す純粋な C# クラスです：
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

**ポイント:** これは、イベントシステムが Unity オブジェクトだけでなく、**あらゆるシリアライズ可能な型**で動作することを証明しています。

---

### イベント定義 (Event Definitions)

**Game Event Editor** ウィンドウを開き、二重ジェネリックイベントを確認します：

![Game Event Editor](/img/game-event-system/examples/04-custom-sender-event/demo-04-editor.png)

**データベース内のイベント:**

| イベント名                 | 型                                 | 用途                          |
| -------------------------- | ------------------------------------ | ---------------------------- |
| `OnGameObjectDamageInfo`   | `GameEvent<GameObject, DamageInfo>`  | 赤いタレットの物理攻撃         |
| `OnGameObjectDamageInfo_1` | `GameEvent<GameObject, DamageInfo>`  | 青いタレットの物理攻撃         |
| `OnPlayerStatsDamageInfo`  | `GameEvent<PlayerStats, DamageInfo>` | システムレベルの論理ダメージ   |

**Behavior カラムに注目:**
- 最初の2つのイベントは **(GameObject,DamageInfo)** と表示されています（物理的な送信元用）。
- 3番目のイベントは **(PlayerStats,DamageInfo)** と表示されています（論理的な送信元用）。

これらの複雑なジェネリッククラスは、送信元認識イベントの作成時にプラグインによって**自動生成**されたものです。

:::note 🔧 送信元イベントの作成

Game Event Creator でイベントを作成する際：

1. **Event Mode** を **"With Sender"** に設定します。
2. **Sender Type**: 物理的なオブジェクトには `GameObject` を選択するか、`PlayerStats` のようなカスタムクラスを検索して選択します。
3. **Argument Type**: データペイロードの型（例: `DamageInfo`）を選択します。
4. システムが `GameEvent<TSender, TArgs>` クラスを自動的に生成します。

:::

---

### 発行側の設定 (CustomSenderTypeEventRaiser)

ヒエラルキーで **CustomSenderTypeEventRaiser** GameObject を選択します：

![CustomSenderTypeEventRaiser Inspector](/img/game-event-system/examples/04-custom-sender-event/demo-04-inspector.png)

**タレットの設定内容:**

**タレット 1 (Red):**
- `Name`: "Sender1"
- `Attack Event`: `OnGameObjectDamageInfo` (GameObject 送信元)
- `Head`: SentryTurret_Red/Head (照準用 Transform)
- `Muzzle Position`: Head/MuzzlePoint (弾丸生成用 Transform)

**タレット 2 (Blue):**
- `Name`: "Sender2"
- `Attack Event`: `OnGameObjectDamageInfo_1` (GameObject 送信元)
- `Head`: SentryTurret_Blue/Head
- `Muzzle Position`: Head/MuzzlePoint

**グローバルシステムイベント:**
- `Global System Event`: `OnPlayerStatsDamageInfo` (PlayerStats 送信元)

**共有リソース:**
- `Hit Target`: TargetDummy (Transform)
- `Projectile Prefab`: 視覚効果用の弾丸プレハブ
- `Muzzle Flash VFX`: 発射エフェクト用のパーティクルシステム

**動作の仕組み:**
1. ボタンクリックでタレットの攻撃シーケンスが開始されます。
2. タレットがターゲットに向かって回転します（スムーズなトラッキング）。
3. 向きが合うと弾丸が生成され、飛んでいきます。
4. 着弾時、**タレットの GameObject を送信元**とし、DamageInfo をデータとしてイベントが発行されます。
5. システムダメージの場合、`PlayerStats` インスタンスが作成され、送信元として使用されます。

---

### 受信側の設定 (CustomSenderTypeEventReceiver)

ヒエラルキーで **CustomSenderTypeEventReceiver** GameObject を選択します：

![CustomSenderTypeEventReceiver Inspector](/img/game-event-system/examples/04-custom-sender-event/demo-04-receiver.png)

**参照設定:**
- `Floating Text Prefab`: ダメージ数値用 Text Mesh Pro
- `Target Renderer`: TargetDummy (点滅エフェクト用 Mesh Renderer)
- `Target Rigidbody`: TargetDummy (物理用 Rigidbody)
- `Attacker Info Text`: LogText (送信元名表示用 Text Mesh Pro)

**Behavior バインディング:**

異なる送信元タイプを処理するために、2つの別々の受信メソッドが用意されています：

| イベント                      | 紐付けられたメソッド        | シグネチャ                                    |
| -------------------------- | ------------------------ | -------------------------------------------- |
| `OnGameObjectDamageInfo`   | `OnTurretAttackReceived` | `void (GameObject sender, DamageInfo args)`  |
| `OnGameObjectDamageInfo_1` | `OnTurretAttackReceived` | `void (GameObject sender, DamageInfo args)`  |
| `OnPlayerStatsDamageInfo`  | `OnSystemAttackReceived` | `void (PlayerStats sender, DamageInfo args)` |

**コンテキスト認識ロジック:**
- **物理的な送信元:** 空間的な回転のために `sender.transform.position` を使用します。
- **論理的な送信元:** 表示のために `sender.playerName` や `sender.level` を使用します。

---

## 💻 コード解説

### 📤 CustomSenderTypeEventRaiser.cs (発行側)
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

    [Header("タレット設定")]
    [SerializeField] private TurretConfig turret1;
    [SerializeField] private TurretConfig turret2;

    [Header("グローバルシステムイベント")]
    [GameEventDropdown] public GameEvent<PlayerStats, DamageInfo> globalSystemEvent;

    private PlayerStats _localPlayerStats;

    private void Start()
    {
        // 論理的な送信元を作成（GameObjectとしての表現を持たない）
        _localPlayerStats = new PlayerStats("DragonSlayer_99", 99, 1);
    }

    /// <summary>
    /// タレットダメージボタンから呼び出されます。
    /// 攻撃シーケンスを開始：照準 ➔ 発射 ➔ 着弾 ➔ GameObject送信元を伴うイベント発行
    /// </summary>
    public void RaiseTurretDamage()
    {
        InitiateAttack(turret1);
    }

    /// <summary>
    /// Turret2ダメージボタンから呼び出されます。
    /// </summary>
    public void RaiseTurret2Damage()
    {
        InitiateAttack(turret2);
    }

    private void InitiateAttack(TurretConfig turret)
    {
        if (turret.attackEvent == null) return;
        
        turret.isAttacking = true;
        Debug.Log($"[{turret.name}] ターゲット捕捉。照準中...");
    }

    private void OnProjectileHit(TurretConfig turret)
    {
        if (turret.attackEvent == null) return;

        Vector3 hitPos = hitTarget.position;
        DamageInfo info = new DamageInfo(15f, false, DamageType.Physical, hitPos, "Sentry Turret");

        // 重要: タレットの GameObject を送信元として渡す
        GameObject turretRoot = turret.head.parent.gameObject;
        turret.attackEvent.Raise(turretRoot, info);
        
        Debug.Log($"[{turret.name}] 弾丸着弾！イベントを発行しました。");
    }

    /// <summary>
    /// 論理エンティティからのシステムレベルの攻撃をシミュレートします。
    /// </summary>
    public void RaiseSystemDamage()
    {
        if (globalSystemEvent == null) return;

        Vector3 hitPos = hitTarget != null ? hitTarget.position : Vector3.zero;
        DamageInfo info = new DamageInfo(50f, true, DamageType.Void, hitPos, "GameMaster");
        
        // 重要: PlayerStats インスタンスを送信元として渡す（GameObjectではない）
        globalSystemEvent.Raise(_localPlayerStats, info);
        
        Debug.Log("[GameMaster] グローバルシステムダメージイベントを発行しました。");
    }
}
```

**ポイント:**
- 🎯 **二重ジェネリック構文** - `GameEvent<TSender, TArgs>` は2つの型パラメータを必要とします。
- 🏗️ **送信元の柔軟性** - `GameObject` またはカスタム C# クラスを渡すことができます。
- 📦 **`.Raise(sender, data)`** - 2つのパラメータを持つメソッドにより、コンテキストとペイロードの両方を提供します。
- 🎮 **物理的送信元** - 空間的なコンテキスト（位置など）のために実際のシーン内の GameObject を使用します。
- 💡 **論理的送信元** - 非空間的なコンテキストのためにデータクラスを使用します。

---

### 📥 CustomSenderTypeEventReceiver.cs (リスナー)
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
    /// GameEvent<GameObject, DamageInfo> に紐付け。
    /// シーン内に存在する物理的な攻撃者を処理します。
    /// </summary>
    /// <param name="sender">攻撃した GameObject (タレット)</param>
    /// <param name="args">ダメージの詳細</param>
    public void OnTurretAttackReceived(GameObject sender, DamageInfo args)
    {
        // 送信元の Transform を空間ロジックに使用
        if (sender != null)
        {
            // 攻撃者の方をスムーズに向く
            StartCoroutine(SmoothLookAtRoutine(sender.transform.position));
            Debug.Log($"[Receiver] 痛っ！ {sender.name} に撃たれました。");
        }

        // 送信元の GameObject 名を表示
        if (attackerInfoText != null)
        {
            attackerInfoText.text = $"SenderName : <color=yellow>{sender.name}</color>";
        }

        // 共通フィードバック：数値表示、点滅、ノックバック
        ProcessCommonFeedback(args, Color.yellow);
    }

    /// <summary>
    /// GameEvent<PlayerStats, DamageInfo> に紐付け。
    /// シーン表現を持たない論理的な攻撃者を処理します。
    /// </summary>
    /// <param name="sender">プロフィールデータを持つ PlayerStats オブジェクト</param>
    /// <param name="args">ダメージの詳細</param>
    public void OnSystemAttackReceived(PlayerStats sender, DamageInfo args)
    {
        // 送信元のプロパティをデータ駆動ロジックに使用
        if (attackerInfoText != null)
        {
            attackerInfoText.text = $"SenderName : <color=yellow>{sender.playerName}</color>";
        }
        
        Debug.Log($"[Receiver] {sender.playerName} からの論理攻撃。FactionID: {sender.factionId}");
        
        // システムダメージ用の異なる色で共通フィードバックを処理
        ProcessCommonFeedback(args, Color.magenta);
    }
    
    private void ProcessCommonFeedback(DamageInfo args, Color color)
    {
        // ダメージ数値の表示
        if (floatingTextPrefab)
        {
            string text = args.isCritical ? $"{args.amount}!" : args.amount.ToString();
            ShowFloatingText(text, color, args.hitPoint);
        }
        
        // 色の点滅
        StartCoroutine(FlashColorRoutine(Color.red));

        // 物理ノックバック（クリティカル時はより強力に）
        ApplyPhysicsKnockback(args);
        
        // クリティカルヒット時のカメラシェイク
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
            
            // 時間をかけてスムーズに回転
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

**ポイント:**
- 🎯 **シグネチャの一致** - 各メソッドのシグネチャは、対応するイベントのジェネリック型と一致する必要があります。
- 🧭 **空間ロジック** - `GameObject` 送信元により、位置に基づいた反応（回転、距離チェックなど）が可能になります。
- 📊 **データロジック** - `PlayerStats` 送信元により、プロフィールに基づいた反応（名前表示、派閥チェックなど）が可能になります。
- 🔀 **統合されたフィードバック** - 点滅やノックバックなどの共通エフェクトを両方の送信元タイプに適用しています。
- 🎨 **コンテキスト固有の挙動** - 回転は物理的な送信元の場合にのみ発生します。

---

## 🔑 重要なまとめ

| コンセプト                | 実装内容                                                     |
| ------------------------- | ------------------------------------------------------------ |
| 🎯 **二重ジェネリックイベント** | `GameEvent<TSender, TArgs>` は送信元のコンテキストとデータの両方を提供 |
| 🏗️ **送信元の柔軟性**      | Unity の GameObject と純粋な C# クラスの両方をサポート       |
| 🧭 **空間的コンテキスト**    | GameObject 送信元により、位置/回転に基づいたロジックが可能   |
| 📊 **データコンテキスト**    | カスタムクラス送信元により、プロフィール/プロパティに基づいたロジックが可能 |
| 🔀 **統合された処理**      | 1つの受信側で複数の送信元タイプをインテリジェントに処理可能 |

:::note 🎓 設計の洞察

送信元認識イベントは、「何が起きたか」と同じくらい「**誰がイベントをトリガーしたか**」が重要な場合に最適です。空間的な反応（向きを変える、ターゲットにする、距離を測る）には GameObject 送信元を使い、データ駆動型のロジック（プロフィール、派閥、ステータス）にはカスタムクラス送信元を使用してください。このパターンは、戦闘システム、AI の反応、マルチプレイヤーでの属性付与などに理想的です！

:::

---

## 🎯 次のステップは？

送信元認識イベントをマスターしました。次は、優先度システムを使用して**イベントの実行順序を制御**する方法を見ていきましょう。

**次の章**: イベントの優先度について学ぶ **[05 優先度イベント](./05-priority-event.md)**

---

## 📚 関連ドキュメント

- **[Game Event Creator](../visual-workflow/game-event-creator.md)** - 送信元認識イベントの作成方法
- **[イベントの発行](../scripting/raising-and-scheduling.md)** - `.Raise(sender, args)` のAPI
- **[リスニング戦略](../scripting/listening-strategies.md)** - 高度なコールバックパターン
- **[APIリファレンス](../scripting/api-reference.md)** - 完全な二重ジェネリックイベントAPI