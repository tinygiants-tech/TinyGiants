---
sidebar_label: '11 チェーンイベント'
sidebar_position: 12
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 11 チェーンイベント：直列実行パイプライン

<VideoGif src="/video/game-event-system/example/11-chain-event.mp4" />

## 📋 概要

トリガーイベントが条件付きフィルタリングを伴う**並列 (Parallel)** 実行を行うのに対し、チェーンイベントは**厳格な直列 (Sequential)** 順序、つまり製造ラインのように一歩ずつステップを実行します。チェーン内のいずれかのノードで条件に失敗したり、遅延が発生したり、エラーに遭遇したりすると、シーケンス全体が一時停止または終了します。これは、カットシーン、武器の発射シークエンス、チュートリアルのステップ、または順序が重要なあらゆるワークフローに最適です。

:::tip 💡 学べること
- チェーン（直列）実行とトリガー（並列）実行の違い
- 条件ノードを検証ゲートとして使用する方法
- シーケンス内での時間差一時停止のための遅延ノード
- 非同期操作のための「完了まで待機 (Wait for Completion)」
- 条件失敗時の早期終了パターン

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/11_ChainEvent/11_ChainEvent.unity
```

### シーン構成

**視覚的要素:**
- 🔴 **Turret_A (左)** - 赤色のランチャー
- 🔵 **Turret_B (右)** - 青色のランチャー
- 🎯 **TargetDummy** - 中央にあるターゲット（カプセル）
- 📺 **HoloDisplay** - ステータス表示パネル
  - セーフティがオフのとき「SAFELOCK READY」を表示
  - セーフティがオンのとき「SAFELOCK ACTIVED」を表示

**UIレイヤー (Canvas):**
- 🎮 **3つのボタン** - 画面下部
  - 「Launch A」➔ `ChainEventRaiser.RequestLaunchA()` を実行
  - 「Launch B」➔ `ChainEventRaiser.RequestLaunchB()` を実行
  - 「Toggle SafeLock」 (オレンジ) ➔ `ChainEventReceiver.ToggleSafetyLock()` を実行

**ゲームロジックレイヤー:**
- 📤 **ChainEventRaiser** - シーケンスの開始者
  - **ただ一つの**エントリポイント `0_StartSequence` のみを参照
  - 下流のパイプラインステップについては一切関知しません
  
- 📥 **ChainEventReceiver** - 各ステップの実行者
  - パイプラインの各ステージに対応する 5 つのメソッドを保持
  - 条件検証用の `IsSafetyCheckPassed` プロパティを公開
  - 切り替え可能な `isSafetyLockDisengaged` フラグを保持

---

## 🎮 操作方法

### 5ステップの発射プロトコル

一つのルートイベント (`0_StartSequence`) が、検証、遅延、非同期待機を伴う直列パイプラインをトリガーします。

---

### ステップ 1: プレイモードに入る

Unity の **Play** ボタンを押します。

**初期状態:**
- セーフティロック: **解除 (DISENGAGED)** (デフォルト)
- ホロディスプレイ: 「SAFELOCK READY」
- 両方のタレットが待機中

---

### ステップ 2: 発射成功テスト (セーフティ OFF)

**現在の状態確認:**
- ホロディスプレイに「SAFELOCK READY」と表示されていることを確認します。
- 表示されていない場合は、「Toggle SafeLock」をクリックしてセーフティを **OFF** にします。

**「Launch A」をクリック:**

**直列実行の流れ:**

**[Step 1: System Check (システムチェック)]** - 即時
- 🔍 条件ノードが `ChainEventReceiver.IsSafetyCheckPassed` プロパティを評価
- プロパティが `isSafetyLockDisengaged` フラグを確認
- 結果: **TRUE** ✅
- コンソール: `[Chain Step 1] Turret_A Checking...`
- **チェーンは Step 2 へ進行**

**[Step 2: Charge (チャージ)]** - 1.0秒の遅延
- ⏱️ 遅延ノードが実行を **1.0秒間** 一時停止
- VFX: タレットでチャージ用のパーティクルエフェクトが発生
- コンソール: `[Chain Step 2] Turret_A Charging...`
- グラフは次へ進む前に正確に 1.0秒待機
- **遅延後、チェーンは Step 3 へ進行**

**[Step 3: Fire (発射)]** - 即時
- 🚀 弾丸がインスタンス化され、ターゲットに向かって発射
- タレットでマズルフラッシュのVFXが発生
- コンソール: `[Chain Step 3] Turret_A FIRED payload: 500`
- 弾丸がターゲットへ到達
- **チェーンは即座に Step 4 へ進行**

**[Step 4: Cool Down (クールダウン)]** - 完了まで待機
- 💨 蒸気のVFXパーティクルが生成
- 🕐 **待機ノード** - グラフはVFXが完了するまで一時停止 (2.0秒)
- コンソール: `[Chain Step 4] Turret_A Cooldowning.`
- 遅延（固定時間）とは異なり、これは実際のVFXの終了を待ちます
- **蒸気が消えた後、チェーンは Step 5 へ進行**

**[Step 5: Archive (アーカイブ)]** - 即時 (引数ブロック)
- 📝 最終的なログ記録ステップ
- グラフで **PassArgument = FALSE** に設定されているため、デフォルト値/nullを受け取ります
- コンソール: `[Chain Step 5] Archived. Data Status: CLEAN`
- 次の使用のためにタレットがアンロック
- **チェーンが正常に完了 ✅**

**タイムライン:**
```
0.0s  ➔ Step 1: System Check (即時)
0.0s  ➔ Step 2: Charge 開始
1.0s  ➔ Step 3: Fire (チャージ遅延後)
1.0s  ➔ Step 4: CoolDown 開始
3.0s  ➔ Step 5: Archive (蒸気VFX完了後 ~2秒)
3.0s  ➔ シーケンス完了
```

**結果:** ✅ 5ステップの発射シーケンスがすべて正常に実行されました。

---

### ステップ 3: 発射失敗テスト (セーフティ ON)

**「Toggle SafeLock」をクリック:**
- セーフティフラグが変化: `isSafetyLockDisengaged = false`
- ホロディスプレイの更新: 「SAFELOCK ACTIVED」
- UIボタンの色がオレンジに変化（視覚的な警告）
- コンソール: `[Chain Settings] Safety Lock Disengaged: False`

**「Launch B」をクリック:**

**直列実行の流れ:**

**[Step 1: System Check]** - **失敗** ❌
- 🔍 条件ノードが `ChainEventReceiver.IsSafetyCheckPassed` を評価
- プロパティが `isSafetyLockDisengaged` を確認し、**FALSE** を検出
- プロパティが失敗時のフィードバックを実行:
  - 🚨 赤いアラームビネットが3回点滅
  - アラーム音が再生
  - コンソール: `[Chain Blocked] Safety Check Failed. Sequence stopped immediately.`
- 条件が **FALSE** を返す
- **🛑 チェーンはここで終了**

**[Steps 2-5]** - **一度も実行されません**
- ❌ チャージVFXなし
- ❌ 弾丸の発射なし
- ❌ 蒸気のクールダウンなし
- ❌ アーカイブログなし

**結果:** ❌ ゲート（Step 1）で発射が中止されました。Step 2～5は実行されませんでした。

:::danger 🔴 チェーン実行の重要な特性

チェーンノードの条件が失敗した場合：

1. **即時終了** - 実行はそのノードで止まります
2. **下流は実行されない** - 後続のノードは一切実行されません
3. **部分的な完了はなし** - 「全か無か」の挙動です
4. **早期のクリーンアップ** - リソースは即座に解放されます

これは、失敗した条件が個別のブランチのみをスキップし、他は継続するトリガーイベントとは根本的に異なります。

:::

---

## 🏗️ シーンのアーキテクチャ

### チェーン vs トリガー：根本的な違い

**トリガーイベント (並列):**
```
⚡ ルートイベント: OnInteraction
│
├─ 🔱 Branch A: [ 🛡️ ガード: `HasKey == true` ]
│  └─ 🚀 Action: OpenDoor() ➔ ✅ 条件パス: 実行中...
│
├─ 🔱 Branch B: [ 🛡️ ガード: `PlayerLevel >= 10` ]
│  └─ 🚀 Action: GrantBonusXP() ➔ ❌ 条件失敗: ブランチをスキップ
│
└─ 🔱 Branch C: [ 🛡️ ガード: `Always True` ]
   └─ 🚀 Action: PlaySound("Click") ➔ ✅ 条件パス: 実行中...
│
📊 概要: 2つのパスを実行 | 1つのパスをスキップ | ⚡ タイミング: 同時進行
```

**チェーンイベント (直列):**
```
🏆 開始: ルートイベント
│
├─ 1️⃣ [ Step 1 ] ➔ 🛡️ ガード: `Condition A`
│  └─ ⏳ ステータス: 完了まで待機... ✅ 成功
│
├─ 2️⃣ [ Step 2 ] ➔ 🛡️ ガード: `Condition B`
│  └─ ⏳ ステータス: 完了まで待機... ✅ 成功
│
├─ 3️⃣ [ Step 3 ] ➔ 🛡️ ガード: `Condition C`
│  └─ ⏳ ステータス: 完了まで待機... ❌ 失敗！
│
└─ 🛑 [ 終了 ] ➔ ロジックチェーンが停止
   └─ ⏭️ Step 4: [ スキップ ]
│
📊 最終結果: Step 3 で中止 | ⏳ モード: 厳格なブロッキング
```

**使い分けの基準:**

| パターン | チェーンを使用 | トリガーを使用 |
| ----------------- | ---------------------------------- | -------------------- |
| **カットシーン** | ✅ シーケンシャルな演出 | ❌ 順序がバラバラになる |
| **戦闘システム** | ❌ 厳格な順序は不要 | ✅ システムの並列実行 |
| **チュートリアル** | ✅ Step 1 の後に Step 2 | ❌ ステップが重なる |
| **武器チャージ** | ✅ チャージ ➔ 発射 ➔ 冷却 | ❌ 順序が重要 |
| **実績解除** | ❌ 独立したチェック | ✅ 複数のトリガー |

---

### イベント定義 (Event Definitions)

![Game Event Editor](/img/game-event-system/examples/11-chain-event/demo-11-editor.png)

| イベント名        | 型                                  | 役割              | ステップ |
| ----------------- | ----------------------------------- | ----------------- | ----- |
| `0_StartSequence` | `GameObjectDamageInfoGameEvent` | **Root** (ゴールド) | 入口 |
| `1_SystemCheck`   | `GameObjectDamageInfoGameEvent` | **Chain** (グリーン) | 1     |
| `2_Charge`        | `GameObjectDamageInfoGameEvent` | **Chain** (グリーン) | 2     |
| `3_Fire`          | `GameObjectDamageInfoGameEvent` | **Chain** (グリーン) | 3     |
| `4_CoolDown`      | `GameObjectDamageInfoGameEvent` | **Chain** (グリーン) | 4     |
| `5_Archive`       | `GameObjectDamageInfoGameEvent` | **Chain** (グリーン) | 5     |

**重要な洞察:**
- **ルート (Root)** がチェーンを起動します
- **チェーンノード (Chain nodes)** は順番に自動トリガーされます
- コードはルートで `.Raise()` を呼ぶだけ。残りはグラフが処理します

---

### フローグラフの設定

直列パイプラインを視覚化するには **"Flow Graph"** ボタンをクリックします：

![Flow Graph Overview](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

**グラフ構造 (左から右へ):**

**Node 1: 0_StartSequence (Root, 赤)**
- コードから発行されるエントリポイント
- 型: `GameObjectDamageInfoGameEvent`
- 最初のリレーノードに接続

**Node 2: 1_SystemCheck (Chain, 緑)**
- ✅ **条件ノード** - ゲートキーパー
- **条件:** `ChainEventReceiver.IsSafetyCheckPassed == true`
  - 実行時にシーンオブジェクトのプロパティを評価
  - false の場合 ➔ **チェーンは即座に切断されます**
- **アクション:** `ChainEventReceiver.OnSystemCheck(sender, args)`
- 緑色のチェックマークアイコンは条件が有効であることを示します
- PassArgument: ✓ パス (すべてのデータを転送)

**Node 3: 2_Charge (Chain, 緑)**
- ⏱️ **遅延ノード** - 時間による一時停止
- **遅延:** `1.0` 秒 (⏱️ 1s アイコンとして表示)
- **アクション:** `ChainEventReceiver.OnStartCharging(sender, args)`
- グラフはここで正確に 1秒間停止します
- PassArgument: ✓ パス

**Node 4: 3_Fire (Chain, 緑)**
- 🎯 **アクションノード** - 標準的な実行
- **アクション:** `ChainEventReceiver.OnFireWeapon(sender, args)`
- 遅延なし、条件なし
- 前のステップの完了後、即座に実行されます
- PassArgument: ✓ パス

**Node 5: 4_CoolDown (Chain, 緑)**
- 🕐 **待機ノード** - 非同期完了待機
- **遅延:** `0.5s` (最小待機時間)
- **WaitForCompletion:** ✓ チェックあり (⏱️ 1s アイコンとして表示)
  - 受信側のコルーチンが終了するのをグラフが待ちます
  - 固定タイマーではなく、実際の完了信号を待ちます
- **アクション:** `ChainEventReceiver.OnCoolDown(sender, args)`
- PassArgument: ✓ パス

**Node 6: 5_Archive (Chain, 緑)**
- 🔒 **フィルターノード** - データのサニタイズ（浄化）
- **アクション:** `ChainEventReceiver.OnSequenceArchived(sender, args)`
- **PassArgument:** 🔴 静的 (引数をブロック)
  - 前のノードがすべてのデータを渡していても、このノードはデフォルト値/nullを受け取ります
  - チェーンの最後でのデータファイアウォールの実演
- 最終ステップ — この先にノードはありません

**接続線:**
- 🟢 **緑色の「CHAIN」ライン** - 直列フロー
  - 各出力ポートが次の入力ポートに接続されます
  - 線形トポロジー — 分岐はありません
  - 実行はラインに沿って左から右へ進みます

**凡例:**
- 🔴 **Root Node** - エントリポイント (コードから発行)
- 🟢 **Chain Node** - 順番に自動トリガーされるノード
- ✅ **チェックマークアイコン** - 条件が有効
- ⏱️ **時計アイコン** - 遅延または待機が設定済み
- 🔒 **南京錠アイコン** - 引数がブロックされている

:::tip 🎨 ビジュアルパイプラインの利点

チェーングラフは、以下の内容を即座に理解させてくれます：

- **直列順序** - 左から右への流れが正確な実行順序を示します
- **検証ゲート** - 条件ノードがチェックポイントとして機能します
- **タイミング制御** - 遅延/待機のアイコンが停止箇所を示します
- **データフロー** - PassArgument トグルがどこでデータがフィルタリングされるかを示します
- **失敗ポイント** - 条件ノードがどこでチェーンが切れるかを示します

これは、ネストされた `yield return` 文を含むコルーチンを読むよりも遥かにクリーンです！

:::

---

### 発行側の設定 (ChainEventRaiser)

**ChainEventRaiser** GameObject を選択します：

![ChainEventRaiser Inspector](/img/game-event-system/examples/11-chain-event/demo-11-inspector.png)

**チェーンエントリポイント:**
- `Sequence Start Event`: `0_StartSequence`
  - ツールチップ: "チェーングラフの開始ノード"
  - ルートのみを参照し、下流はグラフによって処理されます

**タレット:**
- **Turret A:** 本体と Head (Transform)
- **Turret B:** 本体と Head (Transform)

**ターゲット:**
- `Hit Target`: TargetDummy (Transform)

**重要なポイント:**
トリガーのデモと同様に、送信側は**ただ一つ**のイベントしか知りません。5ステップのパイプラインは、グラフの中に完全に抽象化されています。

---

### 受信側の設定 (ChainEventReceiver)

**ChainEventReceiver** GameObject を選択します：

![ChainEventReceiver Inspector](/img/game-event-system/examples/11-chain-event/demo-11-receiver.png)

**シーン参照:**
- `Chain Event Raiser`: アンロック用コールバックのための参照
- `Holo Text`: ロック状態を表示する TextMeshPro

**ターゲット参照:**
- `Target Dummy`, `Target Rigidbody`

**VFX & 弾丸:**
- `Projectile Prefab`: 弾丸プレハブ (TurretProjectile)
- `Charge VFX`: チャージ用エフェクト (Step 2)
- `Fire VFX`: 発射時マズルフラッシュ (Step 3)
- `Steam VFX`: クールダウン用蒸気 (Step 4)
- `Hit Normal/Crit VFX`, `Floating Text Prefab`

**オーディオ:**
- `Hit Clip`, `UI Clip`, `Alarm Clip`

**スクリーン効果:**
- `Screen Group`: 失敗時の赤いフラッシュ用 CanvasGroup

**シミュレーション設定:**
- ✅ `Is Safety Lock Disengaged`: TRUE (デフォルト)
  - Step 1 の条件をパスするかどうかを制御
  - 「Toggle SafeLock」ボタンで切り替え可能

---

## 💻 コード解説

### 📤 ChainEventRaiser.cs (発行側)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class ChainEventRaiser : MonoBehaviour
{
    [Header("Chain Entry Point")]
    [Tooltip("チェーングラフの開始ノード。")]
    [GameEventDropdown]
    public GameObjectDamageInfoGameEvent sequenceStartEvent;

    [Header("Turrets")] 
    public GameObject turretA;
    public GameObject turretB;
    // ... ヘッドのTransform参照 ...

    private bool _isBusyA;
    private bool _isBusyB;

    /// <summary>
    /// UI ボタン A: Turret A の発射プロトコルをリクエスト。
    /// 
    /// 重要：ここではルートイベントを発行するだけです。
    /// チェーングラフが下流の 5 つのステップをすべて自動的に調整します。
    /// </summary>
    public void RequestLaunchA()
    {
        if (sequenceStartEvent == null) return;

        Debug.Log("<color=cyan>[Raiser] 発射プロトコル A をリクエスト中...</color>");
        _isBusyA = true;

        // データペイロードの構築
        DamageInfo info = new DamageInfo(500f, true, DamageType.Physical, 
                                        hitTarget.position, "Commander");
        
        // 魔法の1行：単一の .Raise() で 5 ステップのチェーン全体が始まります。
        // グラフは以下を自動的に実行します：
        // 1. システムチェック (条件付き)
        // 2. チャージ (1秒の遅延付き)
        // 3. 発射 (即時)
        // 4. クールダウン (完了まで待機)
        // 5. アーカイブ (引数ブロック)
        sequenceStartEvent.Raise(turretA, info);
    }

    /// <summary>
    /// UI ボタン B: Turret B の発射プロトコルをリクエスト。
    /// 同じロジックで別のタレットを指定。
    /// </summary>
    public void RequestLaunchB()
    {
        if (sequenceStartEvent == null) return;

        Debug.Log("<color=orange>[Raiser] 発射プロトコル B をリクエスト中...</color>");
        _isBusyB = true;

        DamageInfo info = new DamageInfo(200f, false, DamageType.Physical, 
                                        hitTarget.position, "Commander");
        sequenceStartEvent.Raise(turretB, info);
    }

    // シーケンスの完了または失敗時に受信側から呼ばれるアンロックメソッド
    public void UnlockTurretA() => _isBusyA = false;
    public void UnlockTurretB() => _isBusyB = false;
}
```

**ポイント:**
- 🎯 **単一イベント参照** - ルートイベントしか知りません。
- 📡 **パイプラインの知識ゼロ** - 5つのステップの中身は知りません。
- 🔓 **アンロック用コールバック** - 受信側が完了/失敗を通知。
- 🎬 **最大のデカップリング** - すべてのシーケンスロジックはグラフ内にあります。

---

### 📥 ChainEventReceiver.cs (リスナー)
```csharp
using UnityEngine;
using System.Collections;

public class ChainEventReceiver : MonoBehaviour
{
    [Header("Simulation Settings")]
    [Tooltip("TRUEならチェックをパス。FALSEなら Step 1 でチェーンが切れます。")]
    public bool isSafetyLockDisengaged = true;

    /// <summary>
    /// '1_SystemCheck' ノード条件からアクセスされるプロパティ。
    /// 
    /// グラフ設定: Scene Object ➔ Property ➔ IsSafetyCheckPassed
    /// 
    /// 重要：これはノードアクションが実行される「前」に評価されます。
    /// これが false を返すと、チェーンは即座に終了します。
    /// </summary>
    public bool IsSafetyCheckPassed
    {
        get
        {
            bool result = true;

            if (!isSafetyLockDisengaged)
            {
                // 失敗ルート：セーフティロックがかかっている
                result = false;
                
                Debug.LogWarning(
                    "<color=red>[Chain Blocked] 安全性チェックに失敗しました。 " +
                    "シーケンスを即座に停止します。</color>");
                
                // 失敗時の視覚的フィードバック
                StopCoroutine(nameof(ScreenRoutine));
                if (screenGroup) StartCoroutine(ScreenRoutine());
            }

            return result;
        }
    }

    /// <summary>
    /// セーフティロックの状態を切り替えます。UIボタンにバインド。
    /// </summary>
    public void ToggleSafetyLock()
    {
        if (UIClip) _audioSource.PlayOneShot(UIClip);
        
        isSafetyLockDisengaged = !isSafetyLockDisengaged;
        
        // UIの更新
        string text = isSafetyLockDisengaged ? "SAFELOCK READY" : "SAFELOCK ACTIVED";
        if (holoText) holoText.text = text;

        Debug.Log($"[Chain Settings] Safety Lock Disengaged: {isSafetyLockDisengaged}");
    }

    /// <summary>
    /// [Chain Step 1] System Check
    /// チェーンノード '1_SystemCheck' に紐付け。
    /// 
    /// 注：このアクションは条件をパスした「後」に実行されます。
    /// 条件が失敗した場合、このメソッドは実行されません。
    /// </summary>
    public void OnSystemCheck(GameObject sender, DamageInfo args)
    {
        bool isA = sender != null && sender.name.Contains("Turret_A");
        
        // ここに到達したということは条件をパスしているはずですが、
        // 万が一のケースも念のため考慮しておきます。
        if (!IsSafetyCheckPassed)
        {
            // シーケンスが失敗したためタレットを解放
            if (isA) chainEventRaiser.UnlockTurretA();
            else chainEventRaiser.UnlockTurretB();
        }

        Debug.Log($"[Chain Step 1] {sender.name} チェック中...");
    }

    /// <summary>
    /// [Chain Step 2] Charge
    /// 1.0秒の遅延が設定されたノード '2_Charge' に紐付け。
    /// 
    /// グラフはこのメソッドを呼び出す「前」に1秒間待機します。
    /// これが実行されたとき、既に1.0秒が経過しています。
    /// </summary>
    public void OnStartCharging(GameObject sender, DamageInfo args)
    {
        if (chargeVFX)
        {
            var vfx = Instantiate(chargeVFX, sender.transform.position + Vector3.up * 1.5f, 
                                 Quaternion.identity);
            vfx.transform.SetParent(sender.transform);
            vfx.Play();
            Destroy(vfx.gameObject, 1.2f);
        }

        Debug.Log($"[Chain Step 2] {sender.name} チャージ中...");
    }

    /// <summary>
    /// [Chain Step 3] Fire
    /// チェーンノード '3_Fire' に紐付け。
    /// 
    /// 弾丸を生成しターゲットへ飛ばします。
    /// Step 2 の完了直後に実行されます。
    /// </summary>
    public void OnFireWeapon(GameObject sender, DamageInfo args)
    {
        // マズルフラッシュの生成
        if (fireVFX)
        {
            Vector3 spawnPos = sender.transform.position + 
                             sender.transform.forward * 1.5f + Vector3.up * 1.5f;
            var vfx = Instantiate(fireVFX, spawnPos, sender.transform.rotation);
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        // 弾丸の発射
        if (projectilePrefab != null)
        {
            var muzzlePos = sender.transform.Find("Head/Barrel/MuzzlePoint");
            var shell = Instantiate(projectilePrefab, muzzlePos.position, 
                                   sender.transform.rotation);

            shell.Initialize(args.hitPoint, 20f, () =>
            {
                // 着弾時コールバック
                if (hitClip) _audioSource.PlayOneShot(hitClip);
                
                // ヒットエフェクト、数値表示、物理適用など...
                ParticleSystem vfxToPlay = args.isCritical ? hitCritVFX : hitNormalVFX;
                
                if (args.isCritical)
                    StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
                
                // ... (VFX, 物理, テキストロジック) ...
            });
        }

        Debug.Log($"[Chain Step 3] {sender.name} 発射。ペイロード: {args.amount}");
    }

    /// <summary>
    /// [Chain Step 4] Cool Down
    /// 「完了まで待機」が設定されたノード '4_CoolDown' に紐付け。
    /// 
    /// グラフは、このコルーチンが終了するのを待ってから Step 5 へ進みます。
    /// 固定時間待機とは異なり、タスクの実際の完了を待ちます。
    /// </summary>
    public void OnCoolDown(GameObject sender, DamageInfo args)
    {
        if (steamVFX)
        {
            var vfx = Instantiate(steamVFX, sender.transform.position + Vector3.up, 
                                 Quaternion.Euler(-90, 0, 0));
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        Debug.Log($"[Chain Step 4] {sender.name} クールダウン中。");
    }

    /// <summary>
    /// [Chain Step 5] Archive
    /// PassArgument = FALSE が設定されたノード '5_Archive' に紐付け。
    /// 
    /// 重要：前のステップまですべてのデータを渡していましたが、
    /// グラフ設定により、このノードはデフォルト値/NULLを受け取ります。
    /// 
    /// チェーンの最後で機密データをサニタイズする「データ・ファイアウォール」の実演です。
    /// </summary>
    public void OnSequenceArchived(GameObject sender, DamageInfo args)
    {
        bool isA = sender != null && sender.name.Contains("Turret_A");

        // 次の使用のためにタレットを解放
        if (isA) chainEventRaiser.UnlockTurretA();
        else chainEventRaiser.UnlockTurretB();

        // データが正常にブロックされたか確認
        bool isClean = (args == null || args.amount == 0);
        string logMsg = isClean ? "<color=cyan>CLEAN</color>" : "<color=red>LEAKED</color>";

        Debug.Log($"[Chain Step 5] アーカイブ完了。データステータス: {logMsg}");
    }

    private IEnumerator ScreenRoutine()
    {
        // 失敗時の赤いアラームフラッシュアニメーション
        int flashes = 3;
        float flashDuration = 0.5f;

        for (int i = 0; i < flashes; i++)
        {
            if (alarmClip) _audioSource.PlayOneShot(alarmClip);
            
            float t = 0f;
            while (t < flashDuration)
            {
                t += Time.deltaTime;
                float alpha = Mathf.Sin((t / flashDuration) * Mathf.PI);
                screenGroup.alpha = alpha * 0.8f;
                yield return null;
            }

            screenGroup.alpha = 0f;
            yield return new WaitForSeconds(0.1f);
        }
    }
}
```

**ポイント:**
- 🎯 **5つの独立したメソッド** - 各メソッドがパイプラインの1ステージを担当。
- ✅ **条件判定用のプロパティ** - グラフから評価される `IsSafetyCheckPassed`。
- ⏱️ **タイミングを意識しない** - メソッド側は遅延の存在を知りません。
- 🔒 **データファイアウォール** - Step 5 ではクリーンなデータのみを受け取ります。
- 🎬 **完了コールバック** - 成功/失敗にかかわらずタレットをアンロック。

---

## 🔑 重要なまとめ

| コンセプト              | 実装内容                                     |
| -------------------------- | ----------------------------------------- |
| 🔗 **直列実行**         | ノードが厳格な順序で一つずつ実行される         |
| ✅ **検証ゲート**       | 条件失敗時にチェーンを即座に切断するノード     |
| ⏱️ **遅延ノード**       | ステップ間の固定時間の停止                   |
| 🕐 **待機ノード**       | 非同期処理の完了を待機（固定時間ではない）     |
| 🔒 **データフィルタリング** | ノードごとに引数の受け渡しを制御             |
| 🛑 **早期終了**         | 条件を満たさない場合にチェーン全体を停止       |
| 🎯 **全か無か**         | チェーンが完走するか、途中で中止されるかの二択 |

:::note 🎓 設計の洞察

チェーンイベントは以下のようなケースに最適です：

- **カットシーン** - ショット 1 ➔ ショット 2 ➔ ショット 3 と正確な順序で再生。
- **武器シーケンス** - チャージ ➔ 発射 ➔ クールダウン ➔ リロード。
- **チュートリアル** - ステップ N を完了しないと Step N+1 に進めない。
- **クラフトのレシピ** - 順番通りの材料投入。
- **ボスフェーズ** - 検証を伴うフェーズ移行。
- **魔法の詠唱** - チャネリング ➔ 発動 ➔ 効果 ➔ 硬直。

**チェーン vs コルーチン:**
以下のようなコードを書く代わりに：
```csharp
IEnumerator LaunchSequence()
{
    if (!SafetyCheck()) yield break;
    Charge();
    yield return new WaitForSeconds(1.0f);
    Fire();
    yield return StartCoroutine(CoolDown());
    Archive();
}
```

チェーングラフを使用すると：
- タイミングが**可視化**され、デザイナーが編集可能になります。
- 条件が隠れた `if` 文ではなく、**視覚的なチェックポイント**になります。
- 非同期待機がハードコードされず、**設定可能**になります。
- パイプライン全体がグラフとして**デバッグ可能**になります。

:::

:::warning ⚠️ チェーンの注意点

1. **ブロッキングの挙動:** もし Step 3 にバグがあり完了しない場合、Step 4-5 は永遠に実行されません。
2. **条件評価のタイミング:** 条件はノードアクションの「前」に評価されます。アクションによって発生した副作用を、同じノードの条件に使うことはできません。
3. **並列ブランチなし:** Step 2A と Step 2B を同時に実行することはできません（それにはトリガーイベントを使用してください）。
4. **遅延の累積:** 複数の遅延は加算されます。1秒の遅延ノードが3つあれば、合計3秒の待機になります。
5. **早期終了時のクリーンアップ:** 条件失敗パスでリソースのアンロック等を忘れないようにしてください。

:::

---

## 🎯 次のステップは？

直列チェーン実行をマスターしました。デモシリーズはさらに高度なパターンへと続きます。

**次の章**: 高度なデモ **[12 マルチデータベース](./12-multi-database.md)** を見ていきましょう。

---

## 📚 関連ドキュメント

- **[フローグラフエディタ](../flow-graph/game-event-node-editor.md)** - ノードフローグラフの編集
- **[ノードとコネクタ](../flow-graph/game-event-node-connector.md)** - グラフの視覚言語を理解する
- **[ノードの振る舞い](../flow-graph/game-event-node-behavior.md)** - ノードの設定と条件
- **[高度なロジックパターン](../flow-graph/advanced-logic-patterns.md)** - システムがトリガーとチェーンをどう実行するか
- **[プログラムによるフロー制御](../scripting/programmatic-flow.md)** - FlowGraph API によるプロセス制御の実装
- **[ベストプラクティス](../scripting/best-practices.md)** - 複雑なシステムの設計パターン