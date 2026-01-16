---
sidebar_label: '05 優先度イベント'
sidebar_position: 6
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 05 優先度イベント：実行順序の重要性

<VideoGif src="/video/game-event-system/example/05-priority-event.mp4" />

## 📋 概要

ゲームロジックにおいて、**実行順序（シーケンス）は極めて重要**です。単一のイベントに対して複数のアクションが反応する場合、それらの実行順序が結果を劇的に変えてしまうことがあります。このデモでは、コードを一切変更することなく、エディタ上での視覚的な設定だけで「弱い攻撃」を「壊滅的なクリティカルヒット」に変える方法を実演します。

:::tip 💡 学べること
- 実行順序がゲームプレイロジックに与える影響
- Behavior Window（ビヘイビアウィンドウ）でのリスナー優先度の設定方法
- 実践的な「バフ ➔ 攻撃（Buff-Then-Attack）」パターンの動作
- 順序依存のロジック問題のデバッグ方法

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/05_PriorityEvent/05_PriorityEvent.unity
```

### シーン構成

**UIレイヤー (Canvas):**
- 🎮 **2つの攻撃ボタン** - 画面下部に配置
  - "Raise (Chaotic Hit)" ➔ `PriorityEventRaiser.FireChaoticSequence()` をトリガー（誤った順序）
  - "Raise (Ordered Hit)" ➔ `PriorityEventRaiser.FireOrderedSequence()` をトリガー（正しい順序）

**ゲームロジックレイヤー (デモスクリプト):**
- 📤 **PriorityEventRaiser** - 発行側スクリプトを持つGameObject
  - タレットの照準と弾の発射を管理
  - `OnChaoticHit` と `OnOrderedHit` の2つのイベント参照を保持
  - 両イベントとも同じ `GameObjectDamageInfoGameEvent` 型を使用

- 📥 **PriorityEventReceiver** - 受信側スクリプトを持つGameObject
  - 各イベントに紐付けられた「2つ」のリスナーメソッドを保持：
    - **ActivateBuff** - クリティカルダメージモードを有効化
    - **ResolveHit** - 現在のバフ状態に基づいてダメージを計算
  - これらのメソッドの実行順序が戦闘結果を決定します

**ビジュアルフィードバックレイヤー (デモオブジェクト):**
- 🎯 **SentryTurret** - 攻撃者
  - バフがかかるとグレーから**ゴールド**に変化
  - 有効化時にパーティクルのオーラエフェクトを生成
- 🎯 **TargetDummy** - 被害者（カプセル）
  - 物理ノックバック用の Rigidbody を保持
- 💥 **VFXシステム** - 通常ヒットとクリティカルヒットで異なるエフェクト
  - 通常：小さな煙のパフ
  - クリティカル：巨大な爆発 ＋ カメラシェイク
- 🏠 **Plane** - 地面

---

## 🎮 操作方法

### 実験のセットアップ

両方のボタンは同じ物理的な弾丸を発射しますが、**リスナーの実行順序設定が異なる**別々のイベントをトリガーします。

### ステップ 1: プレイモードに入る

Unityの **Play** ボタンを押します。

### ステップ 2: 誤った順序をテストする (Chaotic Hit)

**左側の "Raise (Chaotic Hit)" をクリック:**

**何が起きるか:**
1. 🎯 タレットが照準を合わせ、弾を発射
2. 💥 弾がターゲットに命中
3. 🔴 **問題点:** ダメージ計算が「最初」に行われる（ResolveHit が実行）
   - 結果： `-10` の弱いダメージ（グレーのテキスト）
   - エフェクト：小さな煙のVFX
4. ✨ バフの有効化が「二番目」に行われる（ActivateBuff が実行）
   - タレットがゴールドになり、パーティクルオーラが出る
   - **遅すぎます！** ダメージは既に計算された後です

**コンソール出力:**
```
[Receiver] (B) RESOLVE: バフは検出されませんでした。弱い攻撃です。(優先順位を確認してください！)
[Receiver] (A) BUFF ACTIVATED! システムが300%の出力で稼働中。
```

**結果:** ❌ ダメージ計算時にバフが有効でなかったため、通常ヒットになります。

---

### ステップ 3: 正しい順序をテストする (Ordered Hit)

**右側の "Raise (Ordered Hit)" をクリック:**

**何が起きるか:**
1. 🎯 タレットが照準を合わせ、弾を発射
2. 💥 弾がターゲットに命中
3. ✨ **正解:** バフの有効化が「最初」に行われる（ActivateBuff が実行）
   - タレットがゴールドになり、パーティクルオーラが出る
   - 内部の `_isBuffActive` フラグが `true` に設定される
4. 🔴 ダメージ計算が「二番目」に行われる（ResolveHit が実行）
   - バフフラグをチェック：**有効 (ACTIVE)!**
   - 結果： `CRIT! -50` （オレンジのテキスト、5倍のダメージ倍率）
   - エフェクト：巨大な爆発VFX ＋ カメラシェイク

**コンソール出力:**
```
[Receiver] (A) BUFF ACTIVATED! システムが300%の出力で稼働中。
[Receiver] (B) RESOLVE: バフを検出！クリティカル爆発を発生。
```

**結果:** ✅ ダメージ計算時にバフが既に有効だったため、クリティカルヒットになります。

---

## 🏗️ シーンのアーキテクチャ

### 「バフ ➔ 攻撃」問題

これはゲーム開発における一般的なパターンです：
```
⚡ イベント発行: OnHit
│
├─ 🥇 1番目のアクション: [Priority 10]
│  └─ 🛡️ ActivateBuff() ➔ `_isBuffActive = true` を設定 🟢
│
└─ 🥈 2番目のアクション: [Priority 5]
   └─ ⚔️ ResolveHit()  ➔ もし (_isBuffActive) ? 💥 CRIT : 🛡️ NORMAL
│
🎯 結果: クリティカルヒット (更新された状態に基づいてロジックを解決)
```

**課題:**
もし `ResolveHit` が `ActivateBuff` よりも先に走ってしまうと、フラグがまだ設定されていないため、たとえバフが同じイベントに「紐付けられて」いても、結果は通常ダメージになってしまいます。

---

### イベント定義 (Event Definitions)

両方のイベントは同じ型を使用していますが、異なるビヘイビア設定を持っています：

![Game Event Editor](/img/game-event-system/examples/05-priority-event/demo-05-editor.png)

| イベント名      | 型                                  | リスナーの順序                        |
| -------------- | ----------------------------------- | ------------------------------------- |
| `OnChaoticHit` | `GameObjectDamageInfoGameEvent` | ❌ ResolveHit → ActivateBuff (誤り)   |
| `OnOrderedHit` | `GameObjectDamageInfoGameEvent` | ✅ ActivateBuff → ResolveHit (正しい) |

:::note 🔧 同じ型、異なる順序

どちらのイベントも `GameObjectDamageInfoGameEvent` です。唯一の違いは、[Behavior Window](../visual-workflow/game-event-behavior.md) で設定された**リスナーの実行順序**です。

:::

---

### ビヘイビア設定の比較

決定的な違いは、**Behavior Window** の設定にあります。

#### ❌ 誤った順序 (OnChaoticHit)

![Chaotic Behavior](/img/game-event-system/examples/05-priority-event/demo-05-behavior-chaotic.png)

**実行シーケンス:**
1. `ResolveHit` (一番上の位置 - 最初に実行)
2. `ActivateBuff` (一番下の位置 - 二番目に実行)

**結果:** バフが適用される前にダメージが計算される ➔ 通常ヒット

#### ✅ 正しい順序 (OnOrderedHit)

![Ordered Behavior](/img/game-event-system/examples/05-priority-event/demo-05-behavior-ordered.png)

**実行シーケンス:**
1. `ActivateBuff` (一番上の位置 - 最初に実行)
2. `ResolveHit` (一番下の位置 - 二番目に実行)

**結果:** ダメージが計算される前にバフが適用される ➔ クリティカルヒット

:::tip 🎯 ドラッグ＆ドロップによる並べ替え

Behavior Window 内の各リスナーの左側にあるハンドル (`≡`) を**ドラッグ**することで、実行順序を自由に変更できます。これはコードを一切変更せずにゲームプレイロジックを修正できる、視覚的な手法です！

:::

---

### 発行側の設定 (PriorityEventRaiser)

ヒエラルキーで **PriorityEventRaiser** GameObject を選択します：

![PriorityEventRaiser Inspector](/img/game-event-system/examples/05-priority-event/demo-05-inspector.png)

**イベントチャンネル:**
- `Ordered Hit Event`: `OnOrderedHit` (正しく設定済み)
  - ツールチップ: "バフ適用 ➔ その後、発射"
- `Chaotic Hit Event`: `OnChaoticHit` (誤って設定済み)
  - ツールチップ: "発射 ➔ その後、バフ適用 (遅すぎる！)"

**設定:**
- `Turret Head`: 照準用 Transform
- `Turret Muzzle Position`: 弾丸生成用 Transform
- `Projectile Prefab`: 弾丸のビジュアル
- `Muzzle Flash VFX`: 発射用パーティクル
- `Hit Target`: ターゲット（ダミー）の Transform

---

### 受信側の設定 (PriorityEventReceiver)

ヒエラルキーで **PriorityEventReceiver** GameObject を選択します：

![PriorityEventReceiver Inspector](/img/game-event-system/examples/05-priority-event/demo-05-receiver.png)

**ビジュアル設定:**
- `Turret Renderers`: タレット本体のレンダラー
- `Normal Mat`: グレーのマテリアル（初期状態）
- `Buffed Mat`: ゴールドのマテリアル（バフ状態）
- `Buff Aura Prefab`: バフを視覚化するシアンのパーティクル

**VFX設定:**
- `Hit Normal VFX`: 通常ヒット用の小さな煙
- `Hit Crit VFX`: クリティカル用の巨大な爆発
- `Floating Text Prefab`: ダメージ数値の表示

**ターゲット参照:**
- `Hit Target`: ターゲット（ダミー）
- `Target Rigidbody`: ノックバック用の Rigidbody

---

## 💻 コード解説

### 📤 PriorityEventRaiser.cs (発行側)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class PriorityEventRaiser : MonoBehaviour
{
    [Header("Event Channels")]
    [Tooltip("エディタで設定済み: バフ適用 -> その後、発射。")]
    [GameEventDropdown] public GameObjectDamageInfoGameEvent orderedHitEvent;

    [Tooltip("エディタで設定済み: 発射 -> その後、バフ適用 (遅すぎる！)。")]
    [GameEventDropdown] public GameObjectDamageInfoGameEvent chaoticHitEvent;

    private GameObjectDamageInfoGameEvent _pendingEvent;

    /// <summary>
    /// ボタン A: "Ordered" イベントをトリガーする攻撃シーケンスを開始。
    /// </summary>
    public void FireOrderedSequence()
    {
        if (orderedHitEvent == null) return;
        _pendingEvent = orderedHitEvent;
        _isAttacking = true;
        Debug.Log("[Sender] 秩序ある(Ordered)攻撃シーケンスを開始...");
    }

    /// <summary>
    /// ボタン B: "Chaotic" イベントをトリガーする攻撃シーケンスを開始。
    /// </summary>
    public void FireChaoticSequence()
    {
        if (chaoticHitEvent == null) return;
        _pendingEvent = chaoticHitEvent;
        _isAttacking = true;
        Debug.Log("[Sender] 混沌とした(Chaotic)攻撃シーケンスを開始...");
    }

    private void FireProjectile()
    {
        // ... 弾丸生成ロジック ...
        
        shell.Initialize(hitTarget.position, 15f, () => 
        {
            DamageInfo info = new DamageInfo(10f, false, DamageType.Physical, 
                                            hitTarget.position, "Sentry Turret");
            
            // 待機中のイベント (Ordered または Chaotic) を発行
            if(_pendingEvent != null) 
                _pendingEvent.Raise(this.gameObject, info);
            
            Debug.Log($"[Sender] 着弾！ イベント '{_pendingEvent?.name}' を発行しました。");
        });
    }
}
```

**ポイント:**
- 🎯 **共通の発行コード** - 両方のイベントで全く同じ Raise ロジックを使用
- 📦 **イベントの選択** - `_pendingEvent` がどのイベントを発行するかを決定
- 🔇 **順序に依存しない** - 発行側はリスナーの順序について一切関知しません

---

### 📥 PriorityEventReceiver.cs (リスナー)
```csharp
using UnityEngine;
using System.Collections;

public class PriorityEventReceiver : MonoBehaviour
{
    [SerializeField] private Renderer[] turretRenderers;
    [SerializeField] private Material buffedMat;
    [SerializeField] private ParticleSystem buffAuraPrefab;
    
    private bool _isBuffActive; // 重要な状態管理フラグ

    /// <summary>
    /// [リスナーメソッド A]
    /// バフ状態とビジュアルエフェクトを有効化します。
    /// 
    /// 優先度の影響:
    /// - ResolveHit より「上」に設定された場合: ダメージ計算の「前」にバフが適用される ➔ クリティカルヒット
    /// - ResolveHit より「下」に設定された場合: ダメージ計算の「後」にバフが適用される ➔ 通常ヒット
    /// </summary>
    public void ActivateBuff(GameObject sender, DamageInfo args)
    {
        _isBuffActive = true; // <-- ここで状態を変更
        
        // ビジュアルフィードバック: ゴールドマテリアル + パーティクルオーラ
        foreach (var r in turretRenderers) 
            if(r) r.material = buffedMat;

        if (buffAuraPrefab != null)
        {
            _activeBuffEffect = Instantiate(buffAuraPrefab, turretRoot.position, 
                                           Quaternion.identity);
            _activeBuffEffect.transform.SetParent(turretRoot);
            _activeBuffEffect.Play();
        }

        Debug.Log("<color=cyan>[Receiver] (A) BUFF ACTIVATED! システムが300%の出力で稼働中。</color>");
    }
    
    /// <summary>
    /// [リスナーメソッド B]
    /// 「現在」のバフ状態に基づいてダメージを計算し、VFXを生成します。
    /// 
    /// ロジック: 実行された「瞬間」の _isBuffActive をチェック。
    /// 正しい動作のためには、このメソッドの前に ActivateBuff が実行されている必要があります。
    /// </summary>
    public void ResolveHit(GameObject sender, DamageInfo args)
    {
        float finalDamage = args.amount;
        bool isCrit = false;
        ParticleSystem vfxToPlay;

        // まさにこの瞬間のフラグをチェック
        if (_isBuffActive)
        {
            // クリティカルルート
            finalDamage *= 5f; // ダメージ5倍
            isCrit = true;
            vfxToPlay = hitCritVFX;
            
            StartCoroutine(ShakeCameraRoutine(0.2f, 0.4f));
            Debug.Log("<color=green>[Receiver] (B) RESOLVE: バフを検出！クリティカル爆発。</color>");
        }
        else
        {
            // 通常ルート
            vfxToPlay = hitNormalVFX;
            Debug.Log("<color=red>[Receiver] (B) RESOLVE: バフは検出されませんでした。弱い攻撃です。(順序を確認！)</color>");
        }

        // 適切なVFXを生成
        if (vfxToPlay != null)
        {
            var vfx = Instantiate(vfxToPlay, args.hitPoint, Quaternion.identity);
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        // 物理挙動とUIフィードバックを適用
        ApplyPhysicsKnockback(args, isCrit);
        ShowFloatingText(finalDamage, isCrit, hitTarget.position);
        
        StartCoroutine(ResetRoutine());
    }
    
    private IEnumerator ResetRoutine()
    {
        yield return new WaitForSeconds(1.5f);
        _isBuffActive = false; // 次の攻撃のためにリセット
        // ... ビジュアルのリセット ...
    }
}
```

**ポイント:**
- 🎯 **状態への依存** - `ResolveHit` の挙動は完全に `_isBuffActive` フラグに依存
- ⏱️ **タイミングが命** - フラグはダメージ計算の「前」に設定されなければなりません
- 🔀 **順序依存のロジック** - 同じコードでも、実行順序によって異なる結果を生む典型例
- 🎨 **視覚的な区別** - ルートに応じて異なるVFX、数値サイズ、演出を適用

---

## 🔑 重要なまとめ

| コンセプト            | 実装内容                                                     |
| ---------------------- | ------------------------------------------------------------ |
| 🎯 **実行順序**         | リスナーの順序はゲームプレイロジックに直接影響する           |
| 🎨 **視覚的な設定**     | Behavior Window でドラッグ＆ドロップするだけ。コード修正は不要 |
| 🔀 **状態管理**         | リスナーが共有状態を更新する場合、順序が決定的な差を生む     |
| 🐛 **デバッグパターン** | コンソールログを使用して、順序に関連したバグを容易に特定可能 |
| 🔄 **ゲームデザイン**   | 順序の制御により、コンボ、バフのスタック等を容易に実現可能   |

:::note 🎓 設計の洞察

実行順序は以下のようなケースで不可欠です：

- **バフシステム** - 効果を計算する前に、補正値をすべて適用する
- **コンボチェーン** - 次のアクションをトリガーする前に、前提条件を検証する
- **シールドメカニクス** - ダメージを適用する前に、吸収量をチェックする
- **トリガーシーケンス** - 依存関係のあるロジックを実行する前に、前提が整っているか確認する

常に両方の順序を試し、ロジックが意図通りに動作することを確認しましょう！

:::

---

## 🎯 次のステップは？

実行順序のマスターになりました。次は、イベントをよりスマートにするための**条件付きイベントトリガー**について見ていきましょう。

**次の章**: 条件付きロジックを学ぶ **[06 条件付きイベント](./06-conditional-event.md)**

---

## 📚 関連ドキュメント

- **[Game Event Behavior](../visual-workflow/game-event-behavior.md)** - リスナー設定の詳細ガイド
- **[ベストプラクティス](../scripting/best-practices.md)** - 順序依存ロジックのパターン
- **[リスニング戦略](../scripting/listening-strategies.md)** - 高度なコールバックパターン