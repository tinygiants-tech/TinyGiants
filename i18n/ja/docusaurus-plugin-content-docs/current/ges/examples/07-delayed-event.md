---
sidebar_label: '07 遅延イベント'
sidebar_position: 8
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 07 遅延イベント：タイムボム・シナリオ

<VideoGif src="/video/game-event-system/example/07-delayed-event.mp4" />

## 📋 概要

標準的なイベントは即座に実行されます（`Raise()` ➔ `Execute()`）。これに対し、遅延イベントは重要なギャップを導入します：`Raise()` ➔ **[保留状態]** ➔ `Execute()`。このデモでは、古典的な「ワイヤーカット」ミニゲームを通じて、**スケジューリングシステム**を実演します。遅延実行の設定方法、そして非常に重要な「実行前に保留中のイベントを**キャンセル**する方法」を学びます。

:::tip 💡 学べること
- Behavior Window でアクション遅延を設定する方法
- イベントスケジューリングシステムの内部動作
- `.Cancel()` を使用して保留中のイベントを取り消す方法
- 視覚的なタイマーと論理的なタイマーの違い

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/07_DelayedEvent/07_DelayedEvent.unity
```

### シーン構成

**視覚的要素:**
- 💣 **TimeBomb_TNT** - 中央にある円筒形の爆弾
  - 赤いキャップが付いた黒いシリンダー本体
  - 「04.046」といったカウントダウンを表示するオレンジ色のタイマー表示（リアルタイム更新）
  - 上部に赤と緑の2色のインジケーターライト
  - グレーの円形プラットフォームに設置
  

**UIレイヤー (Canvas):**
- 🎮 **3つのボタン** - 画面下部
  - "Arm Bomb" (白) ➔ `DelayedEventRaiser.ArmBomb()` をトリガー
  - "Cut RedWire" (赤/ピンク) ➔ `DelayedEventRaiser.CutRedWire()` をトリガー
  - "Cut GreenWire" (緑) ➔ `DelayedEventRaiser.CutGreenWire()` をトリガー

**ゲームロジックレイヤー (デモスクリプト):**
- 📤 **DelayedEventRaiser** - 発行側スクリプト
  - 爆弾の起動とワイヤー切断ロジックを管理
  - 毎ラウンド、どちらのワイヤーが安全かをランダムに決定
  - 視覚的なカウントダウンタイマーを制御（演出用）
  - 正しいワイヤーが切断されたときに `.Cancel()` を呼び出し

- 📥 **DelayedEventReceiver** - 受信側スクリプト
  - `onExplodeEvent` をリッスン
  - 爆発ロジックを実行：VFX、物理挙動、カメラシェイク
  - タイマーがゼロになった場合のみ（キャンセルされなかった場合のみ）呼び出し

**視聴覚フィードバック:**
- 🔊 **チクタク音** - カウントダウン中、1秒ごとに再生
- 💥 **爆発VFX** - 起爆時にパーティクルシステムを生成
- ⚡ **火花VFX** - ワイヤー切断時のパーティクルエフェクト
- 📹 **カメラシェイク** - 爆発時の激しい揺れ

---

## 🎮 操作方法

### 解除チャレンジ

正しいワイヤーを特定して切断するまでに **5秒間** の猶予があります。一方のワイヤーは **安全 (SAFE)** （イベントをキャンセル）で、もう一方は **罠 (TRAP)** （何もしない）です。

:::warning 🎲 ランダム選択

安全なワイヤーは、爆弾を起動するたびにランダムに選ばれます！コンソールログに注目するか、運に任せてください。

:::

---

### ステップ 1: プレイモードに入る

Unity の **Play** ボタンを押します。爆弾には白いテキストで「READY」と表示されます。

---

### ステップ 2: 爆弾を起動する

**"Arm Bomb" (白いボタン) をクリック:**

**何が起きるか:**
1. 🔊 チクタク音が始まります（1秒ごとにビープ音）
2. ⏱️ タイマーがオレンジ色で `05.000` からカウントダウンを開始
3. 🎲 システムがランダムに安全なワイヤー（赤または緑）を選択
4. 📝 **コンソールに正解が表示されます:** `[Game Logic] Bomb Armed! The SAFE wire is: Red`
5. 💣 イベントが **保留状態 (Pending State)** に入り、5秒後に実行されるよう予約されます

**視覚的な変化:**
- タイマーのテキストが白からオレンジに変わります
- タイマーはミリ秒単位の精度でカウントダウンします： `04.987`, `04.834`...
- 残り時間が少なくなると、色が徐々にオレンジから赤へと変化します

**舞台裏の動き:**
- `explodeEvent.Raise()` が呼び出されます
- Behavior Window で **Action Delay = 5s** が設定されているため
- イベントは GameEventManager のスケジューラーに **キュー登録** されます
- 内部的にカウントダウンタイマーが開始されます

---

### ステップ 3: 運命を選択する

ここから、結果の異なる3つの選択肢があります：

#### 選択肢 A：何もしない（爆発させる）

**アクション:** どのボタンもクリックせずに待ちます。

**タイムライン:**
- `04.000` - 2回目のチクタク音
- `03.000` - 音と共にタイマーがさらに赤くなります
- `02.000` - 緊迫感が高まります
- `01.000` - 最後のチクタク音
- `00.000` - **ドカーン！**

**結果:** 💥 **爆発**
- コンソール: `BOOM! The event executed.`
- 爆弾の位置に巨大な爆発VFXが生成されます
- 爆弾のシリンダーが物理演算（Kinetic）により空中に吹き飛びます
- カメラが激しく揺れます（0.5秒間、強さ0.8）
- 爆発音が再生されます
- タイマーのテキストが濃い赤色で「ERROR」に変わります

**理由:** 5秒の遅延が経過したため、スケジューラーによって `DelayedEventReceiver.OnExplode()` が呼び出されました。

---

#### 選択肢 B：間違ったワイヤーを切る

**アクション:** 安全ではない方のボタンをクリックします。

例：コンソールに `The SAFE wire is: Red` と表示されている場合、**"Cut GreenWire"** をクリック。

**何が起きるか:**
1. ⚡ ワイヤーから火花のVFXが発生
2. 🔊 ワイヤーを切る音が再生
3. 📝 コンソール: `[Player] Cutting Green Wire...`
4. 📝 コンソール: `Wrong wire! The clock is still ticking...`
5. ⏱️ **タイマーはカウントダウンを続けます**
6. 💣 イベントは **保留状態** のまま維持されます

**結果:** 何も変わりません。カウントダウンは続行されます。
- 数秒後： **ドカーン！** （選択肢 A と同じ結果）
- 間違った選択をした緊張感を味わうことになります

**理由:** コード内で `if (color == _safeWireColor)` をチェックしており、それが false のため、`.Cancel()` が呼び出されません。スケジューラーはそのまま動き続けます。

---

#### 選択肢 C：正しいワイヤーを切る（解除）

**アクション:** 安全なワイヤーと一致するボタンをクリックします。

例：コンソールに `The SAFE wire is: Red` と表示されている場合、**"Cut RedWire"** をクリック。

**何が起きるか:**
1. ⚡ ワイヤーから火花のVFXが発生
2. 🔊 ワイヤーを切る音
3. 📝 コンソール: `[Player] Cutting Red Wire...`
4. 🎯 **重要:** `explodeEvent.Cancel()` が呼び出されます
5. ⏱️ タイマーがその瞬間の数値（例: `03.247`）で **即座に停止** します
6. 📝 コンソール: `BOMB DEFUSED! Event Cancelled.`
7. ✅ タイマーテキストが **緑色** で「DEFUSED」に変わります
8. 🔕 解除成功のサウンドが再生されます
9. 💣 イベントが **保留状態** から削除されます

**結果:** 🟢 **成功 - 爆発なし**
- 爆弾は安全になりました
- `DelayedEventReceiver.OnExplode()` は **一度も呼び出されません**
- 爆弾を再度起動して別のラウンドを遊ぶことができます

**理由:** `.Cancel()` が GameEventManager の内部キューから予約されたイベントを削除します。5秒のタイマーが経過したとしても、実行すべき対象が存在しなくなります。

---

## 🏗️ シーンのアーキテクチャ

### スケジューリングシステム

遅延イベントは、GameEventManager によって管理される内部タイマーを使用します：
```
🚀 開始: Raise()
│
📦 [ イベントをキューに追加 + タイマー開始 ]
│
⏳ ステータス: 待機中...
│
├─ ⚡ 実行パス (タイマー満了)
│  └─► ✅ 実行() ➔ ロジックが呼び出される
│
└─ 🛑 中断パス (手動/条件による)
   └─► 🧹 キャンセル() ➔ [ キューから削除 ]
```

**主要コンセプト:**
- **保留状態 (Pending State):** `Raise()` と実行の間の期間
- **スケジューラーキュー:** タイマー付きイベントの内部リスト
- **キャンセル:** 実行前にキューからイベントを削除
- **アトミックな操作:** キャンセルされた場合、受信側のメソッドは決して実行されません

---

### イベント定義 (Event Definition)

![Game Event Editor](/img/game-event-system/examples/07-delayed-event/demo-07-editor.png)

| イベント名       | 型                 | 設定された遅延 |
| ---------------- | ------------------ | ---------------- |
| `onExplodeEvent` | `GameEvent` (void) | 5.0 秒          |

---

### 遅延を伴うビヘイビア設定

Behavior カラムの **(void)** アイコンをクリックして、Behavior Window を開きます：

![Behavior Settings](/img/game-event-system/examples/07-delayed-event/demo-07-behavior.png)

**スケジュールの設定セクション:**
- ⏱️ **アクション遅延 (Action Delay):** `5` 秒
  - `Raise()` から実行までの時間ギャップです
  - エディタ上でイベントごとに設定可能です
  - タイミングを調整するためにコードを修正する必要はありません

- 🔄 **リピート間隔 (Repeat Interval):** `0` (無効)
- 🔢 **リピート回数 (Repeat Count):** `Infinite Loop` (このデモでは不使用)
- 💾 **常駐イベント (Persistent Event):** チェックなし

**イベントアクション:**
- メソッド: `DelayedEventReceiver.OnExplode()`
- モード: Runtime Only

:::tip ⚙️ 簡単にタイミング調整

爆弾のカウントダウンを速くしたり遅くしたりしたいですか？このウィンドウの **Action Delay** の値を変えるだけです。難易度を上げるなら `3`、下げるなら `10` を試してみてください！

:::

---

### 発行側の設定 (DelayedEventRaiser)

**DelayedEventRaiser** GameObject を選択します：

![DelayedEventRaiser Inspector](/img/game-event-system/examples/07-delayed-event/demo-07-inspector.png)

**イベントチャンネル:**
- `Explode Event`: `onExplodeEvent`
  - ツールチップ: "設定: 開始遅延 = 5.0 秒"

**参照:**
- `Bomb Receiver`: DelayedEventReceiver (コールバックの連携用)

**ビジュアル:**
- `Timer Text`: カウントダウンを表示する TextMeshPro
- `Sparks VFX`: ワイヤー切断エフェクト用のパーティクルシステム

---

### 受信側の設定 (DelayedEventReceiver)

**DelayedEventReceiver** GameObject を選択します：

![DelayedEventReceiver Inspector](/img/game-event-system/examples/07-delayed-event/demo-07-receiver.png)

**参照:**
- `Bomb Raiser`: DelayedEventRaiser (状態のコールバック用)
- `Bomb Rigidbody`: 爆発の物理演算用 Rigidbody

**ビジュアル:**
- `Explosion VFX Prefab`: 爆発エフェクト用のパーティクルプレハブ

**オーディオ:**
- `Tick Clip`: 1秒ごとのビープ音
- `Explosion Clip`: 爆発音
- `Defuse Clip`: 解除成功音

---

## 💻 コード解説

### 📤 DelayedEventRaiser.cs (発行側)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;
using System.Collections;

public class DelayedEventRaiser : MonoBehaviour
{
    [Header("Event Channels")]
    [Tooltip("設定: 開始遅延 = 5.0 秒。")]
    [GameEventDropdown] public GameEvent explodeEvent;

    private bool _isArmed;
    private float _countDownTime = 5.0f;
    private string _safeWireColor; // 各ラウンドでランダムに決定

    /// <summary>
    /// ボタンアクション: 爆弾を起動し、遅延イベントを開始します。
    /// </summary>
    public void ArmBomb()
    {
        if (_isArmed || explodeEvent == null) return;

        _isArmed = true;
        
        // パズルの正解をランダム化
        _safeWireColor = Random.value > 0.5f ? "Red" : "Green";
        Debug.Log($"[Game Logic] 爆弾起動！ 安全なワイヤーは: " +
                  $"<color={_safeWireColor.ToLower()}>{_safeWireColor}</color>");

        // 重要: 遅延イベントを発行
        // これは即座には実行されません！
        // イベントは5秒間の「保留状態」に入ります
        explodeEvent.Raise();
        
        // 演出用のカウントダウンを開始（視覚効果のみ）
        StartCoroutine(CountdownRoutine());
    }

    /// <summary>
    /// ボタンアクション: プレイヤーが赤ワイヤーを切ろうとしたとき。
    /// </summary>
    public void CutRedWire() => ProcessCut("Red");

    /// <summary>
    /// ボタンアクション: プレイヤーが緑ワイヤーを切ろうとしたとき。
    /// </summary>
    public void CutGreenWire() => ProcessCut("Green");

    private void ProcessCut(string color)
    {
        if (!_isArmed) return;

        Debug.Log($"[Player] {color} ワイヤーを切断中...");

        // ワイヤー切断のVFXを再生...

        // 運命の分岐点
        if (color == _safeWireColor)
        {
            // 魔法の1行: 保留中のイベントをキャンセル
            // これによりスケジューラーのキューから削除されます
            // OnExplode() は一度も呼ばれなくなります
            explodeEvent.Cancel();
            
            DisarmSuccess();
        }
        else
        {
            // 間違ったワイヤー - イベントは保留のまま
            Debug.LogWarning("間違ったワイヤーです！ カウントダウンは続いています...");
        }
    }

    private void DisarmSuccess()
    {
        _isArmed = false;
        StopAllCoroutines(); // 視覚的なカウントダウンを停止
        
        // 成功のUI更新...
        Debug.Log("<color=green>爆弾解除成功！ イベントがキャンセルされました。</color>");
    }

    private IEnumerator CountdownRoutine()
    {
        // これは純粋に演出用です
        // 実際のタイマーは GameEventManager のスケジューラーが管理しています
        // このコルーチンが止まっても、爆弾は爆発します
        
        float _currentTimer = _countDownTime;
        
        while (_currentTimer > 0)
        {
            _currentTimer -= Time.deltaTime;
            if (_currentTimer < 0) _currentTimer = 0;

            // 視覚的なタイマーテキストを更新
            if (timerText)
            {
                timerText.text = _currentTimer.ToString("00.000");
                
                // オレンジから赤へ色を変化させ、緊迫感を演出
                float urgency = 1f - (_currentTimer / _countDownTime);
                timerText.color = Color.Lerp(new Color(1f, 0.5f, 0f), 
                                            Color.red, urgency);
            }
            
            yield return null;
        }
    }
}
```

**ポイント:**
- 🎯 **関心の分離** - 視覚的なタイマー（コルーチン）と論理的なタイマー（スケジューラー）を分けています。
- 🎲 **ランダム選択** - ラウンドごとに `_safeWireColor` が決定されます。
- 🔴 **キャンセルAPI** - `.Cancel()` によりキューから保留中のイベントを削除します。
- ⏱️ **演出用カウントダウン** - UI の更新はイベントシステムとは独立して行われます。

---

### 📥 DelayedEventReceiver.cs (リスナー)
```csharp
using UnityEngine;
using System.Collections;

public class DelayedEventReceiver : MonoBehaviour
{
    [SerializeField] private Rigidbody bombRigidbody;
    [SerializeField] private ParticleSystem explosionVFXPrefab;
    
    private AudioSource _audioSource;
    private Camera _mainCamera;

    /// <summary>
    /// [イベントコールバック - 遅延実行]
    /// 
    /// このメソッドが呼ばれるのは以下の条件のときのみです：
    /// 1. explodeEvent.Raise() が呼ばれた
    /// 2. 5秒が経過した
    /// 3. その間に explodeEvent.Cancel() が呼ばれなかった
    /// 
    /// 正しいワイヤーが切られた場合、このメソッドは実行されません。
    /// </summary>
    public void OnExplode()
    {
        Debug.Log("<color=red><b>ドカーン！ イベントが実行されました。</b></color>");

        // 爆発VFXの生成
        if (explosionVFXPrefab != null)
        {
            ParticleSystem vfx = Instantiate(explosionVFXPrefab, 
                                            transform.position, 
                                            Quaternion.identity);
            vfx.Play();
            Destroy(vfx.gameObject, 3.0f);
        }

        // 爆弾の物理演算を有効化
        if (bombRigidbody)
        {
            bombRigidbody.isKinematic = false;
            
            // 爆発の力を適用（爆弾を上方に飛ばす）
            bombRigidbody.AddExplosionForce(2000f, 
                                           transform.position + Vector3.down * 0.5f, 
                                           5f);
            bombRigidbody.AddTorque(Random.insideUnitSphere * 100f, 
                                   ForceMode.Impulse);
        }
        
        // オーディオ + カメラシェイク
        if (explosionClip) _audioSource.PlayOneShot(explosionClip);
        StartCoroutine(ShakeCamera(0.5f, 0.8f));
    }

    private IEnumerator ShakeCamera(float duration, float magnitude)
    {
        if (_mainCamera == null) yield break;
        
        Vector3 originalPos = _mainCamera.transform.position;
        float elapsed = 0f;
        
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
}
```

**ポイント:**
- 🎯 **条件付き実行** - キャンセルされなかった場合のみ実行されます。
- 💥 **爆発ロジック** - VFX、物理、オーディオ、カメラシェイク。
- 🎬 **純粋な反応** - タイマーやキャンセルについては関知しません。
- ⏱️ **遅延呼び出し** - キャンセルされない限り、`Raise()` の5秒後に呼ばれます。

---

## 🔑 重要なまとめ

| コンセプト            | 実装内容                                                 |
| ---------------------- | -------------------------------------------------------- |
| ⏱️ **アクション遅延**   | Behavior Window で実行遅延を設定（コード不要）           |
| 📋 **保留状態**         | 発行から実行までの間、イベントはスケジューラーのキューで待機 |
| 🔴 **キャンセルAPI**    | `.Cancel()` で実行前にイベントをキューから削除           |
| 🎯 **アトミックな実行** | キャンセルされたイベントはコールバックを一切呼び出さない |
| 🎨 **視覚 vs 論理**    | 演出用のタイマーとイベントシステムのタイマーを分離する   |

:::note 🎓 設計の洞察

遅延イベントは以下のようなケースに最適です：

- **時間制限付きアビリティ** - クールダウン、キャスト時間、チャネリング
- **カウントダウンメカニクス** - 爆弾、バフの期限切れ、援軍の到着
- **キャンセル可能なアクション** - 詠唱の中断、解除メカニクス
- **ターンベースの遅延** - 次のアクションの前にアニメーションを待つ
- **予約されたイベント** - 昼夜サイクルのトリガー、周期的なスポーン

`.Cancel()` API はインタラクティブなゲームプレイにおいて不可欠です。危険なアクションをプレイヤーが中断できるようにすることで、緊張感とプレイヤーの主体性（エージェンシー）を高めることができます！

:::

---

## 🎯 次のステップは？

遅延実行とキャンセルをマスターしました。次は、周期的な動作のための**リピートイベント**を見ていきましょう。

**次の章**: リピート間隔について学ぶ **[08 リピートイベント](./08-repeating-event.md)**

---

## 📚 関連ドキュメント

- **[ゲームイベントビヘイビア](../visual-workflow/game-event-behavior.md)** - スケジュール設定の完全ガイド
- **[イベントの発行と予約](../scripting/raising-and-scheduling.md)** - `.Raise()` と `.Cancel()` の API リファレンス
- **[ベストプラクティス](../scripting/best-practices.md)** - 時間ベースのゲームプレイパターンの設計