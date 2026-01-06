---
sidebar_label: '10 トリガーイベント'
sidebar_position: 11
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 10 トリガーイベント：イベントの並列配信

<VideoGif src="/video/game-event-system/example/10-trigger-event.mp4" />

## 📋 概要

複雑なゲームにおいて、一つのアクション（例：「攻撃命令」）が複数の独立したシステム（戦闘ロジック、SE、UI更新、実績、分析など）をトリガーする必要があることは珍しくありません。これをコードだけで実装すると、関数が数十行にわたって肥大化してしまいます。**フローグラフ (Flow Graph)** は、これを**並列配信 (Parallel Dispatch)** として視覚化します。一つのルートイベントが複数の条件付きブランチに枝分かれし、それぞれが独自の優先度とフィルタリングロジックを持ちます。

:::tip 💡 学べること
- ビジュアルなイベントルーティングにフローグラフを使用する方法
- 並列実行とシーケンシャルな優先順位付けの違い
- ノード条件を使用した条件分岐
- トリガーノードにおける型変換と引数のフィルタリング
- トリガーイベントとチェーンイベントの違い

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/10_TriggerEvent/10_TriggerEvent.unity
```

### シーン構成

**視覚的要素:**
- 🔴 **Turret_A (左)** - 赤色の「スマート」タレット
  - 優先順位: バフ (100) → 発射 (50)
  - 結果: **クリティカルヒット**
  
- 🔵 **Turret_B (右)** - 青色の「不具合」タレット
  - 優先順位: 発射 (100) → バフ (30)
  - 結果: **通常ヒット** (バフの適用が遅すぎる)

- 🎯 **TargetDummy** - 中央のターゲット（カプセル）
  - 両方のタレットからダメージを受けます
  - 物理反応用の Rigidbody を保持しています

- 📺 **HoloDisplay** - 情報パネル
  - ダメージデータのログを表示します
  - デフォルトは「SYSTEM READY」を表示
  - トリガー時にダメージ情報を更新します

- 🚨 **AlarmVignette** - フルスクリーンの赤色オーバーレイ
  - グローバルアラーム発生時に点滅します
  - タレット固有のブランチとは独立しています

**UIレイヤー (Canvas):**
- 🎮 **2つのコマンドボタン** - 画面下部
  - 「Command A」➔ `TriggerEventRaiser.CommandTurretA()` を実行
  - 「Command B」➔ `TriggerEventRaiser.CommandTurretB()` を実行

**ゲームロジックレイヤー:**
- 📤 **TriggerEventRaiser** - 命令の発行者
  - **ただ一つの**ルートイベント `onCommand` のみを参照
  - 下流のイベントについては一切関知しません
  - 究極のデカップリングの実演

- 📥 **TriggerEventReceiver** - アクションの実行者
  - 5つの独立したアクションメソッドを保持
  - フローグラフがどのメソッドをいつ実行するかを管理
  - メソッドは異なるシグネチャ（void、単一引数、二重引数）を持ちます

---

## 🎮 操作方法

### 並列配信の実験

一つのルートイベント (`onCommand`) が、条件と優先度に基づいて複数の並列ブランチに分かれます。

---

### ステップ 1: プレイモードに入る

Unity の **Play** ボタンを押します。

**初期状態:**
- 2つのタレットが待機中（ゆっくりとした回転巡回）
- ホロディスプレイに「SYSTEM READY」と表示
- アラームビネットは非表示

---

### ステップ 2: スマートタレットのテスト (正しい優先度)

**「Command A」をクリック:**

**何が起きるか:**
1. 🎯 赤タレットがターゲットの方を向きます（高速トラッキング）
2. 🚀 弾丸が発射され、飛んでいきます
3. 💥 **着弾時** - `Turret_A` を送信元 (Sender) としてルートイベントが発行されます

**並列実行ブランチ:**

**ブランチ 1: Turret A 専用 (条件付き):**
- ✅ **onActiveBuff** (優先度 100)
  - 条件: `sender.name.Contains("Turret_A")` ➔ **TRUE**
  - 最優先のため「最初」に実行されます
  - タレットが**ゴールド**になり、バフオーラが生成されます
  - `_isBuffedA = true` を設定
  - コンソール: `[Receiver] (A) SYSTEM OVERCHARGE: Buff Activated for Turret_A.`
  
- ✅ **onTurretFire** (優先度 50)
  - 条件: `sender.name.Contains("Turret_A")` ➔ **TRUE**
  - 「二番目」に実行されます（バフより優先度が低いため）
  - `_isBuffedA` をチェック ➔ TRUE であることを確認
  - 結果: **CRIT! -500** ダメージ
  - オレンジ色の数値、爆発VFX、カメラシェイクが発生
  - コンソール: `[Receiver] (B) TURRET HIT: Critical Strike! (500 dmg)`

**ブランチ 2: グローバル (無条件):**
- ✅ **onHoloData** (優先度 1秒遅延)
  - 条件なし ➔ 常に実行されます
  - 型変換: `GameObject` 送信元を破棄し、`DamageInfo` のみを渡します
  - ホロディスプレイ更新: "Damage DATA Type: Physical, Target: 100"
  - コンソール: `[Receiver] (C) HOLO DATA: Recorded 100 damage packet.`
  
- ✅ **onGlobalAlarm** (優先度 即時, void)
  - 条件なし ➔ 常に実行されます
  - 型変換: すべての引数を破棄します
  - 画面が赤く3回点滅
  - アラーム音が再生
  - コンソール: `[Receiver] (D) ALARM: HQ UNDER ATTACK! EMERGENCY PROTOCOL!`
  
- ✅ **onSecretFire** (優先度 1秒遅延, 引数ブロック)
  - 条件なし ➔ 常に実行されます
  - **PassArgument = false** ➔ デフォルト値/nullを受け取ります
  - コンソール: `[Receiver] (E) SECURE LOG: Data transmission blocked by Graph.`

**結果:** ✅ ダメージ計算の「前」にバフが適用されたため、スマートタレットはクリティカルヒットを達成しました。

---

### ステップ 3: 不具合タレットのテスト (誤った優先度)

**「Command B」をクリック:**

**何が起きるか:**
1. 🎯 青タレットがターゲットの方を向きます
2. 🚀 弾丸が発射され、飛んでいきます
3. 💥 **着弾時** - `Turret_B` を送信元としてルートイベントが発行されます

**並列実行ブランチ:**

**ブランチ 1: Turret B 専用 (条件付き):**
- ❌ **onActiveBuff** (Turret A 用の条件)
  - 条件: `sender.name.Contains("Turret_A")` ➔ **FALSE**
  - **実行されません** - 条件によってフィルタリングされました

- ✅ **onTurretFire** (優先度 100) - *Turret A とは別のノード*
  - 条件: `sender.name.Contains("Turret_B")` ➔ **TRUE**
  - 「最初」に実行されます（Turret B ブランチ内で最高優先度）
  - `_isBuffedB` をチェック ➔ **FALSE** (バフがまだ実行されていない)
  - 結果: **-100** 通常ダメージ
  - グレーの数値、小さな爆発が発生
  - コンソール: `[Receiver] (B) TURRET HIT: Normal Hit. (100 dmg)`

- ✅ **onActiveBuff** (優先度 30) - *Turret A とは別のノード*
  - 条件: `sender.name.Contains("Turret_B")` ➔ **TRUE**
  - 「二番目」に実行されます（優先度が低いため）
  - タレットがゴールドになり、バフオーラが生成されます
  - `_isBuffedB = true` を設定。**遅すぎます！**
  - コンソール: `[Receiver] (A) SYSTEM OVERCHARGE: Buff Activated for Turret_B.`

**ブランチ 2: グローバル (無条件):**
- グローバルな3つのノード（onHoloData, onGlobalAlarm, onSecretFire）が同様に実行されます
- どちらのタレットが発射したかには依存しません

**結果:** ❌ バフが適用される「前」にダメージが計算されたため、不具合タレットは通常ヒットになりました。

:::note 🔑 重要な観察ポイント

どちらのタレットも同じルートイベント (`onCommand`) をトリガーしますが：

- **条件付きノード**が送信元名でフィルタリングを行います
- 各ブランチ内の**優先順位**が結果を左右します
- **グローバルノード**は送信元に関係なく実行されます
- すべてのブランチは**並列**（同じフレーム内）で評価されます

:::

---

## 🏗️ シーンのアーキテクチャ

### 並列実行 vs 直列実行

**従来の直列的なコード:**
```csharp
void OnAttackCommand(GameObject sender, DamageInfo info)
{
    if (sender.name == "Turret_A") ActivateBuff(sender, info);
    TurretHit(sender, info);
    if (sender.name == "Turret_A") ActivateBuff(sender, info); // 順序が間違い！
    HoloDamageData(info);
    GlobalAlarm();
    LogSecretAccess(sender, info);
}
```

**フローグラフによる並列配信:**
```
📡 ルート: onCommand.Raise(sender, info)
│
├─ 🔱 [ 条件ブランチ: Turret A ] ➔ 🛡️ ガード: `Sender == "Turret_A"`
│  ├─ 💎 [Prio: 100] ➔ onActiveBuff()   ✅ 最初に実行
│  └─ ⚡ [Prio: 50 ] ➔ onTurretFire()   ✅ 次に実行
│
├─ 🔱 [ 条件ブランチ: Turret B ] ➔ 🛡️ ガード: `Sender == "Turret_B"`
│  ├─ ⚡ [Prio: 100] ➔ onTurretFire()   ✅ 最初に実行
│  └─ 💎 [Prio: 30 ] ➔ onActiveBuff()   ✅ 次に実行
│
└─ 🌍 [ グローバルブランチ: 常に実行 ] ➔ 🟢 ガード: `なし (常にパス)`
   ├─ 📽️ onHoloData       ⏱️ 遅延: 1.0秒 | 🔢 単一引数
   ├─ 🚨 onGlobalAlarm    ⚡ 即時        | 🔘 Void (信号のみ)
   └─ 🕵️ onSecretFire     ⏱️ 遅延: 1.0秒 | 🛡️ 引数をブロック
```

**実行の振る舞い:**
- すべてのブランチが同時に評価されます（並列）
- 条件によってどのノードが実行されるかフィルタリングされます
- 優先度によってパスしたブランチ内の順序が決まります
- 型変換はノードごとに自動的に行われます

---

### イベント定義 (Event Definitions)

![Game Event Editor](/img/game-event-system/examples/10-trigger-event/demo-10-editor.png)

| イベント名      | 型                                  | 役割     | カラー |
| --------------- | ----------------------------------- | -------- | ----- |
| `onCommand`     | `GameEvent<GameObject, DamageInfo>` | **ルート** | ゴールド |
| `onActiveBuff`  | `GameEvent<GameObject, DamageInfo>` | トリガー  | グリーン |
| `onTurretFire`  | `GameEvent<GameObject, DamageInfo>` | トリガー  | グリーン |
| `onHoloData`    | `GameEvent<DamageInfo>`             | トリガー  | グリーン |
| `onGlobalAlarm` | `GameEvent` (void)                  | トリガー  | グリーン |
| `onSecretFire`  | `GameEvent<GameObject, DamageInfo>` | トリガー  | グリーン |

**重要な洞察:**
- **ルートイベント**（ゴールド）：コードから直接発行される唯一のイベント
- **トリガーイベント**（グリーン）：フローグラフによって自動的にトリガーされるイベント
- コード側は `onCommand` しか知りません。下流のロジックからは完全にデカップリングされています。

---

### フローグラフの設定

Game Event Editor の **"Flow Graph"** ボタンをクリックして、ビジュアルグラフを開きます：

![Flow Graph Overview](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

**グラフ構造:**

**ルートノード (左側, 赤):**
- `onCommand <GameObject, DamageInfo>`
- グラフ全体の入り口
- コードから発行される唯一のノード

**Turret A ブランチ (右上, 緑):**
- `onActiveBuff` (優先度: ★100, 条件: Turret_A, Pass: ✓)
  - ブランチ内で最高優先度
  - 送信元が Turret_A の場合のみ実行
- `onTurretFire` (優先度: ★50, 条件: Turret_A, Pass: ✓)
  - 優先順位2位
  - 送信元が Turret_A の場合のみ実行

**Turret B ブランチ (中央右, 緑):**
- `onTurretFire` (優先度: ★100, 条件: Turret_B, Pass: ✓)
  - ブランチ内で最高優先度
  - 送信元が Turret_B の場合のみ実行
- `onActiveBuff` (優先度: ★30, 条件: Turret_B, Pass: ✓)
  - 低優先度（発射の「後」に実行！）
  - 送信元が Turret_B の場合のみ実行

**グローバルブランチ (右下, 黄/緑):**
- `onHoloData` (遅延: ⏱️1秒, Pass: 🔴 単一引数のみ)
  - 型変換: `<GameObject, DamageInfo>` ➔ `<DamageInfo>`
  - 黄色の線は型互換性の警告を示しています
- `onGlobalAlarm` (Pass: ⭕ Void)
  - 型変換: `<GameObject, DamageInfo>` ➔ `(void)`
  - すべての引数を破棄します
- `onSecretFire` (遅延: ⏱️1秒, Pass: 🔒 静的/ブロック済み)
  - PassArgument = false
  - デフォルト値/nullを受け取ります

**凡例:**
- 🟢 **緑線:** 型が一致（互換性あり）
- 🟡 **黄線:** 型変換（データ損失があるが互換性あり）
- 🔴 **赤線:** 型の互換性なし（接続不可）

:::tip 🎨 ビジュアルグラフの利点

フローグラフは以下のような内容を即座に視覚的に理解させてくれます：

- どのイベントがどの下流イベントをトリガーするか
- 各ブランチ内での実行優先順位
- 型変換と引数の受け渡し状況
- 条件付きルーティングロジック
- 並列実行の構造

:::

---

### 発行側の設定 (TriggerEventRaiser)

**TriggerEventRaiser** GameObject を選択します：

![TriggerEventRaiser Inspector](/img/game-event-system/examples/10-trigger-event/demo-10-inspector.png)

**ゲームイベント:**
- `Command Event`: `onCommand`
  - ツールチップ: "グラフ全体をトリガーする『唯一』のイベント"
  - 型: `GameEvent<GameObject, DamageInfo>`

**Turret A (Smart):**
- `Turret A`: Turret_A (GameObject)
- `Turret Head A`: Head (Transform)
- `Turret Muzzle A`: MuzzlePoint (Transform)

**Turret B (Rushed):**
- `Turret B`: Turret_B (GameObject)
- `Turret Head B`: Head (Transform)
- `Turret Muzzle B`: MuzzlePoint (Transform)

**共有リソース:**
- `Projectile Prefab`, `Muzzle Flash VFX`, `Hit Target`

**重要なポイント:**
スクリプトは**ただ一つ**のイベントしか参照していません。下流にある5つのイベントについては**一切関知していません**。これこそが究極のデカップリングであり、フローグラフがすべてのルーティングロジックを処理しています。

---

### 受信側の設定 (TriggerEventReceiver)

**TriggerEventReceiver** GameObject を選択します：

![TriggerEventReceiver Inspector](/img/game-event-system/examples/10-trigger-event/demo-10-receiver.png)

**ターゲット参照:**
- `Target Dummy`, `Target Rigidbody`

**ビジュアルリソース:**
- `Buff VFX Prefab`: TurretBuffAura (Particle System)
- `Hit Normal VFX`, `Hit Crit VFX`, `Floating Text Prefab`

**アラームVFX:**
- `Alarm Screen Group`: AlarmVignette (Canvas Group)
- `Holo Text`: LogText (Text Mesh Pro)

**タレット設定:**
- **Turret A:** レンダラー配列, 通常マテリアル
- **Turret B:** レンダラー配列, 通常マテリアル
- **共通:** バフ用マテリアル (ゴールド)

---

## 💻 コード解説

### 📤 TriggerEventRaiser.cs (発行者)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class TriggerEventRaiser : MonoBehaviour
{
    [Header("Game Event")]
    [Tooltip("グラフ全体をトリガーする唯一のイベント。")]
    [GameEventDropdown]
    public GameEvent<GameObject, DamageInfo> commandEvent;

    [Header("Turret A (Smart)")] 
    public GameObject turretA;
    // ... タレットの参照 ...

    private bool _isAttackingA;
    private bool _isAttackingB;

    /// <summary>
    /// ボタン A: Turret A に攻撃を指示。
    /// 照準シーケンスを開始し、最終的にルートイベントを発行します。
    /// </summary>
    public void CommandTurretA()
    {
        if (commandEvent == null || turretA == null) return;
        _isAttackingA = true; // 回転/発射シーケンスの開始
    }

    /// <summary>
    /// ボタン B: Turret B に攻撃を指示。
    /// </summary>
    public void CommandTurretB()
    {
        if (commandEvent == null || turretB == null) return;
        _isAttackingB = true;
    }

    private void FireProjectile(GameObject senderTurret, Transform muzzle)
    {
        // マズルフラッシュ生成、弾丸発射...
        
        var shell = Instantiate(projectilePrefab, muzzle.position, muzzle.rotation);
        shell.Initialize(hitTarget.position, 20f, () =>
        {
            Vector3 hitPos = hitTarget.position;
            DamageInfo info = new DamageInfo(100f, false, DamageType.Physical, 
                                            hitPos, "Commander");

            // 重要: この「一つ」のルートイベントを発行するだけ
            // それ以外のことはフローグラフが決定します：
            // - どの日和見イベントをトリガーするか
            // - どのような優先順位で行うか
            // - どのような引数を渡すか
            commandEvent.Raise(senderTurret, info);

            Debug.Log($"[Sender] {senderTurret.name} からの着弾を確認。" +
                     "イベントを発行しました。");
        });
    }
}
```

**ポイント:**
- 🎯 **単一イベント参照** - ルートイベントしか知りません。
- 🔇 **下流の知識ゼロ** - 5つのトリガーイベントの存在すら知りません。
- 📡 **シンプルな API** - 単に `.Raise(sender, data)` を呼ぶだけ。
- 🏗️ **最大のデカップリング** - フローグラフがすべてのルーティングを担います。

---

### 📥 TriggerEventReceiver.cs (実行者)
```csharp
using UnityEngine;
using System.Collections;

public class TriggerEventReceiver : MonoBehaviour
{
    private bool _isBuffedA;
    private bool _isBuffedB;

    /// <summary>
    /// [アクション A] バフの有効化
    /// フローグラフ内のトリガーノードに紐付け（Turret A と B で個別のノード）。
    /// 
    /// 優先度の影響:
    /// - Turret A: 優先度 100 ➔ ダメージ計算の「前」に実行（正解）
    /// - Turret B: 優先度 30 ➔ ダメージ計算の「後」に実行（不正解！）
    /// </summary>
    public void ActivateBuff(GameObject sender, DamageInfo args)
    {
        if (sender == null) return;
        bool isA = sender.name.Contains("Turret_A");

        // クリティカルフラグを設定
        if (isA) _isBuffedA = true;
        else _isBuffedB = true;

        // ビジュアルフィードバック: ゴールドマテリアル + パーティクルオーラ
        Renderer[] targetRenderers = isA ? renderersA : renderersB;
        foreach (var r in targetRenderers)
            if (r) r.material = mat_Buffed;

        if (buffVFXPrefab)
        {
            var vfx = Instantiate(buffVFXPrefab, sender.transform.position, 
                                 Quaternion.identity);
            vfx.transform.SetParent(sender.transform);
            vfx.Play();
            
            if (isA) _auraA = vfx;
            else _auraB = vfx;
        }

        Debug.Log($"[Receiver] (A) SYSTEM OVERCHARGE: {sender.name} のバフを有効化しました。");
    }

    /// <summary>
    /// [アクション B] タレット命中
    /// フローグラフ内のトリガーノードに紐付け。
    /// 
    /// 実行された「瞬間」のバフ状態をチェックします。
    /// 優先度によって、バフが既に有効かどうかが決まります。
    /// </summary>
    public void TurretHit(GameObject sender, DamageInfo args)
    {
        if (sender == null) return;

        // 現在バフが有効かどうかを確認
        bool isBuffed = sender.name.Contains("Turret_A") ? _isBuffedA : _isBuffedB;

        float finalDamage = args.amount;
        bool isCrit = false;
        ParticleSystem vfxToPlay;

        if (isBuffed)
        {
            // クリティカルルート: バフが有効だった
            finalDamage *= 5f; // 500 ダメージ
            isCrit = true;
            vfxToPlay = hitCritVFX;
            
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
            Debug.Log($"[Receiver] (B) TURRET HIT: クリティカル！ ({finalDamage} ダメージ)");
        }
        else
        {
            // 通常ルート: バフがまだ有効ではなかった
            vfxToPlay = hitNormalVFX;
            Debug.Log($"[Receiver] (B) TURRET HIT: 通常ヒット。 ({finalDamage} ダメージ)");
        }

        // VFX生成、物理適用、数値表示...
        StartCoroutine(ResetRoutine(sender, isBuffed));
    }

    /// <summary>
    /// [アクション C] ホロ・ダメージデータ
    /// 型変換（TYPE CONVERSION）を伴うトリガーノードに紐付け。
    /// 
    /// グラフ設定:
    /// - 入力: GameEvent<GameObject, DamageInfo>
    /// - 出力: GameEvent<DamageInfo>
    /// - 結果: Sender が破棄され、データのみが渡されます
    /// </summary>
    public void HoloDamageData(DamageInfo info)
    {
        if (holoText)
        {
            holoText.text = $"Damage DATA\nType: {info.type}, Target: {info.amount}";
        }

        Debug.Log($"[Receiver] (C) HOLO DATA: {info.amount} ダメージパケットを記録しました。");
        StartCoroutine(ClearLogRoutine());
    }

    /// <summary>
    /// [アクション D] グローバルアラーム
    /// VOID への型変換を伴うトリガーノードに紐付け。
    /// 
    /// グラフ設定:
    /// - 入力: GameEvent<GameObject, DamageInfo>
    /// - 出力: GameEvent (void)
    /// - 結果: すべての引数が破棄されます
    /// </summary>
    public void GlobalAlarm()
    {
        Debug.Log("[Receiver] (D) ALARM: 本部が攻撃を受けています！緊急プロトコル発動！");

        StopCoroutine(nameof(AlarmRoutine));
        if (alarmScreenGroup) StartCoroutine(AlarmRoutine());
    }

    /// <summary>
    /// [アクション E] シークレットログ
    /// PassArgument = FALSE のトリガーノードに紐付け。
    /// 
    /// 「引数のブロッキング」の実演：
    /// ルートイベントがデータを持っていても、このノードはデフォルト値/nullを受け取ります。
    /// セキュリティ、デバッグ、またはデータの隔離に有用です。
    /// </summary>
    public void LogSecretAccess(GameObject sender, DamageInfo data)
    {
        bool isBlocked = (data == null || (data.amount == 0 && data.attacker == null));

        if (isBlocked)
            Debug.Log("<color=lime>[Receiver] (E) SECURE LOG: " +
                     "グラフによってデータ送信がブロックされました。</color>");
        else
            Debug.Log("<color=red>[Receiver] (E) SECURE LOG: " +
                     "データ漏洩！ ({data.amount})</color>");
    }

    private IEnumerator AlarmRoutine()
    {
        int flashes = 3;
        float flashDuration = 0.5f;

        for (int i = 0; i < flashes; i++)
        {
            if (alarmClip) _audioSource.PlayOneShot(alarmClip);

            // サイン波によるアルファアニメーション
            float t = 0f;
            while (t < flashDuration)
            {
                t += Time.deltaTime;
                float alpha = Mathf.Sin((t / flashDuration) * Mathf.PI);
                alarmScreenGroup.alpha = alpha * 0.8f;
                yield return null;
            }

            alarmScreenGroup.alpha = 0f;
            yield return new WaitForSeconds(0.1f);
        }
    }
}
```

**ポイント:**
- 🎯 **5つの独立したメソッド** - 各メソッドが一つのアクションを担当。
- 🔀 **異なるシグネチャ** - void、単一引数、二重引数に対応。
- 📊 **状態への依存** - `TurretHit` が `_isBuffedA/B` フラグを読み取ります。
- ⏱️ **優先度が重要** - 順序によってバフが有効かどうかが決まります。
- 🎨 **型に依存しない** - メソッド側は型変換が行われていることを知りません。

---

## 🔑 重要なまとめ

| コンセプト                | 実装内容                                        |
| ------------------------- | ----------------------------------------------- |
| 🌳 **フローグラフ**          | 肥大化したコードを置き換える視覚的な並列配信      |
| 🎯 **トリガーノード**       | 自動的に下流イベントを発火させる仕組み            |
| 📋 **条件付きルーティング** | ノード条件によって実行をフィルタリング            |
| ⏱️ **優先順位付け**         | ブランチ内での実行シーケンスを制御                |
| 🔀 **型変換**              | ノードごとに引数を自動的に適応                    |
| 🔒 **引数のブロッキング**    | PassArgument フラグによるデータ送信の制御        |
| 📡 **並列実行**            | すべてのブランチを同時に評価                      |

:::note 🎓 設計の洞察

トリガーイベントは以下のようなケースに最適です：

- **ファンアウト・アーキテクチャ** - 一つのアクションが多くのシステムをトリガーする
- **条件付きルーティング** - 送信元やデータに基づいた異なるロジックパス
- **優先度管理** - 実行順序を視覚的に制御する
- **型の適応** - 互換性のないイベントシグネチャを接続する
- **デカップリング** - 発行側が下流の複雑さを意識しなくて済む

**トリガーイベント vs チェーンイベント:**
- **トリガー (並列):** 条件によってフィルタリングされつつ、全ノードが同時に評価される
- **チェーン (直列):** ノードが厳格な線形順序で、一つずつ順番に実行される

条件分岐を伴う並列処理（例：異なる攻撃者に反応する戦闘システム）が必要な場合は **トリガー** を使用してください。確実な実行順序の保証（例：チュートリアルのステップ、カットシーン）が必要な場合は **チェーン** を使用してください。

:::

:::warning ⚠️ 優先度の注意点

1. **同一優先度:** 複数のノードが同じ優先度を持つ場合、実行順序は不定です。
2. **ブランチを跨ぐ優先度:** 優先度は「同じ条件ブランチ内」でのみ意味を持ちます。
3. **遅延の影響:** 遅延設定されたノードは、優先度に関わらず非遅延ノードの後に実行される可能性があります。
4. **状態の変更:** 状態の変更には注意してください。後のノードは、先のノードによる変更結果を参照することになります。

:::

---

## 🎯 次のステップは？

並列トリガーイベントをマスターしました。次は、確実な連続実行のための**チェーンイベント**を見ていきましょう。

**次の章**: 直列チェーンについて学ぶ **[11 チェーンイベント](./11-chain-event.md)**

---

## 📚 関連ドキュメント

- **[フローグラフエディタ](../flow-graph/game-event-node-editor.md)** - ノードフローグラフの編集
- **[ノードとコネクタ](../flow-graph/game-event-node-connector.md)** - グラフの視覚言語を理解する
- **[ノードの振る舞い](../flow-graph/game-event-node-behavior.md)** - ノードの設定と条件
- **[高度なロジックパターン](../flow-graph/advanced-logic-patterns.md)** - システムがトリガーとチェーンをどう実行するか
- **[プログラムによるフロー制御](../scripting/programmatic-flow.md)** - FlowGraph API によるプロセス制御の実装
- **[ベストプラクティス](../scripting/best-practices.md)** - 複雑なシステムの設計パターン