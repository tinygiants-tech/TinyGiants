---
sidebar_label: '08 リピートイベント'
sidebar_position: 9
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 08 リピートイベント：自動ループ

<VideoGif src="/video/game-event-system/example/08-repeating-event.mp4" />

## 📋 概要

通常、レーダーのスキャンや毒ダメージのような周期的なパルスを作成するには、C# で `InvokeRepeating` やコルーチンを使用してタイマーループを書く必要があります。GameEvent System では、このロジックを**イベントアセット**自体に移行できるため、コードによるループは不要です。エディタで一度設定すれば、`Raise()` を呼び出すだけで自動的にリピートが処理されます。

:::tip 💡 学べること
- Behavior Window でリピート間隔と回数を設定する方法
- 有限ループ（N回）と無限ループ（無期限）の違い
- `.Cancel()` を使用して無限ループを停止する方法
- リピートイベントと手動トリガーの使い分け

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/08_RepeatingEvent/08_RepeatingEvent.unity
```

### シーン構成

**視覚的要素:**
- 📡 **SonarBeacon** - 中央のタワービーコン
  - グレーのベースを持つ黒い円筒形のタワー
  - **RotatingCore** - 上部の回転エレメント（回転速度が現在のモードを示します）
  - パルス発生時に拡大するシアンの衝撃波リングを放出
  
- 🎯 **ScanTargets** - ビーコンの周囲に配置された4つの浮遊する緑のキューブ
  - デフォルトでは「?」テキストを表示
  - 衝撃波が当たると赤色のマテリアルに変化し、「DETECTED（検出）」と表示
  - 短時間のハイライト後に緑色にリセット

- 🔵 **Cyan Ring** - 大きな円形の境界線
  - 最大スキャン範囲（半径40ユニット）を表示
  - パルスが拡大する範囲の視覚的ガイド

**UIレイヤー (Canvas):**
- 🎮 **3つのボタン** - 画面下部
  - "Activate Beacon" (白) ➔ `RepeatingEventRaiser.ActivateBeacon()` をトリガー
  - "Toggle Mode (Finite[5])" ➔ `RepeatingEventRaiser.ToggleMode()` をトリガー
    - 有限モードと無限モードを切り替え
    - テキストが現在のモードに合わせて更新
  - "StopSignal" (白) ➔ `RepeatingEventRaiser.StopSignal()` をトリガー

**ゲームロジックレイヤー (デモスクリプト):**
- 📤 **RepeatingEventRaiser** - 発行側スクリプトを持つGameObject
  - `onFinitePulseEvent` と `onInfinitePulseEvent` の2つのイベントを管理
  - モードの切り替えとビーコンの回転速度を制御
  - `.Raise()` を一度呼び出すだけで、システムが自動的にリピートを処理

- 📥 **RepeatingEventReceiver** - 受信側スクリプトを持つGameObject
  - パルスイベントをリッスン
  - 衝撃波VFXの生成とソナー音の再生
  - 物理ベースのスキャンルーチンを実行してターゲットを検出

**視聴覚フィードバック:**
- 💫 **ShockwaveVFX** - 拡大するシアンのパーティクルリング
- 🔊 **Sonar Ping** - 各スキャン時のオーディオパルス
- 🎵 **Toggle/Stop Sounds** - UI操作のフィードバック音

---

## 🎮 操作方法

### 2つのループモード

このデモでは、2つの異なるループパターンを実演しています。

**有限モード (5回パルス):**
- 間隔: 1.5秒
- 回数: 5回リピート
- **挙動:** 自動的に5回実行された後、停止します。

**無限モード (連続):**
- 間隔: 1.0秒
- 回数: -1 (無限ループ)
- **挙動:** 手動でキャンセルされるまで永遠に実行され続けます。

---

### ステップ 1: プレイモードに入る

Unity の **Play** ボタンを押します。ビーコンのコアがゆっくり回転しています（待機状態）。

**UIの状態:**
- モード切替ボタンの表示: "Toggle Mode (Finite[5])"
- ビーコンの回転速度: 約20°/秒（待機速度）

---

### ステップ 2: 有限ループモードをテストする

**現在のモードを確認:**
ボタンに **"Toggle Mode (Finite[5])"** と表示されていることを確認します（デフォルト）。

**"Activate Beacon" をクリック:**

**何が起きるか:**
1. 🎯 ビーコンのコア回転が 150°/秒 に**加速**します。
2. 📡 **最初のパルス**が即座に発行されます。
   - シアンの衝撃波リングが生成され、外側へ拡大します。
   - ソナーのピング音が再生されます。
   - リングが到達すると、緑のキューブが一時的に赤くなります。
   - コンソール: `[Raiser] Beacon Activated. Mode: Finite (5x)`
   - コンソール: `[Receiver] Pulse #1 emitted.`

3. ⏱️ **1.5秒後** - 2回目のパルス
   - コンソール: `[Receiver] Pulse #2 emitted.`
   - 再び衝撃波が拡大し、ターゲットが赤く点滅します。

4. ⏱️ **パルス 3, 4, 5** と、1.5秒間隔で続きます。
   - コンソールに `[Receiver] Pulse #5 emitted.` までカウントされます。

5. ✅ **5回目のパルス後** - 自動停止
   - ビーコンのコア回転が 20°/秒（待機速度）に**減速**します。
   - それ以上のパルスは発行されません。
   - 手動の操作なしで、システムが自動的に停止しました。

**タイムライン:**
```
🖼️ T+0.0s | 開始
⚡ パルス #1 (最初のトリガー)
│
┆  (Δ 1.5s ループ)
▼
🖼️ T+1.5s | リピート 1
⚡ パルス #2
│
┆  (Δ 1.5s ループ)
▼
🖼️ T+3.0s | リピート 2
⚡ パルス #3
│
┆  (Δ 1.5s ループ)
▼
🖼️ T+4.5s | リピート 3
⚡ パルス #4
│
┆  (Δ 1.5s ループ)
▼
🖼️ T+6.0s | リピート 4
⚡ パルス #5 (最終)
│
┆  (Δ 1.5s の隙間)
▼
🛑 T+7.5s | ライフサイクル終了
🏁 [ 自動停止: パルス #6 は発生しません ]
```

**結果:** ✅ イベントは正確に5回リピートされ、その後自動的に終了しました。

---

### ステップ 3: 無限ループモードをテストする

**"Toggle Mode" をクリック:**
- ボタンテキストが "Toggle Mode (Infinite)" に変わります。
- 切り替え音が再生されます。
- ビーコンが動作中だった場合は、一旦停止します。

**"Activate Beacon" をクリック:**

**何が起きるか:**
1. 🎯 ビーコンのコア回転が 300°/秒 に**加速**します（有限モードより速い！）。
2. 📡 **連続パルス**が始まります。
   - 最初のパルスが即座に発行されます。
   - コンソール: `[Raiser] Beacon Activated. Mode: Infinite`
   - コンソール: `[Receiver] Pulse #1 emitted.`

3. ⏱️ **1.0秒ごと** - 新しいパルス
   - 有限モードよりも短い間隔（1.5秒 ➔ 1.0秒）。
   - パルスが次々と発生します: #2, #3, #4, #5...
   - カウンターが際限なく増加します。

4. ⚠️ **自動的には停止しません**
   - パルス #10, #20, #100...
   - 手動でキャンセルされるまで続行されます。
   - その間、ビーコンは高速で回転し続けます。

**観察:**
10秒ほど放置して、自動停止しないことを確認してください。コンソールのパルスカウントが増え続けます。

---

### ステップ 4: 手動でのキャンセル

**無限モードが動作している間に:**

**"StopSignal" をクリック:**

**何が起きるか:**
1. 🛑 パルスが**即座に停止**します。
   - 現在のパルス処理は完了しますが、新しいパルスは予約されません。
   - ビーコンのコア回転が待機速度（20°/秒）に減速します。
   - コンソール: `[Raiser] Signal Interrupted manually.（信号が手動で中断されました）`

2. 🔄 システム状態のリセット
   - パルスカウンターが 0 にリセットされます。
   - パワーダウン音が再生されます。
   - ビーコンがスタンバイ状態に戻ります。

**結果:** ✅ `.Cancel()` API を介して無限ループが正常にキャンセルされました。

:::note 🔑 決定的な違い
- **有限モード:** 指定された回数（N回）の実行後に自動停止。
- **無限モード:** 停止させるには手動で `.Cancel()` を呼ぶ必要がある。

:::

---

## 🏗️ シーンのアーキテクチャ

### リピートイベントシステムの仕組み

一度待機して一度実行する「遅延イベント」とは異なり、リピートイベントは**タイマーループ**を使用します：
```
🚀 開始: Raise()
│
▼ ❮━━━ ループサイクル ━━━┐
⚡ [ アクション実行 ]      │
│                        │
⏳ [ 間隔待機 ]            │ (Δ Delta Time)
│                        │
🔄 [ リピートチェック ] ━━━┘ (残り回数 > 0 の場合)
│
🛑 [ 停止条件到達 ] ➔ 🏁 ライフサイクル完了
```

**停止条件:**
1. **リピート回数到達:** 有限モードでは N 回の実行後に自動停止。
2. **手動キャンセル:** `.Cancel()` により無限ループを即座に終了。
3. **シーンのアンロード:** 保留中のすべてのイベントがクリーンアップされます。

**内部スケジューリング:**
- GameEventManager がスケジューラーキューを維持します。
- 各リピートイベントは内部タイマーを持っています。
- 正確な間隔を維持するために、各実行後にタイマーがリセットされます。

---

### イベント定義 (Event Definitions)

![Game Event Editor](/img/game-event-system/examples/08-repeating-event/demo-08-editor.png)

| イベント名             | 型                 | リピート間隔 | リピート回数 |
| ---------------------- | ------------------ | --------------- | ------------- |
| `onFinitePulseEvent`   | `GameEvent` (void) | 1.5 秒          | 5             |
| `onInfinitePulseEvent` | `GameEvent` (void) | 1.0 秒          | -1 (無限)     |

**同じ受信メソッド:**
両方のイベントは `RepeatingEventReceiver.OnPulseReceived()` に紐付けられています。受信側はどのイベントがトリガーしたかを気にする必要はなく、各パルスに対して反応するだけです。

---

### ビヘイビア設定の比較

#### 有限ループの設定

`onFinitePulseEvent` の **(void)** アイコンをクリックして、Behavior Window を開きます：

![Finite Behavior](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-finite.png)

**スケジュールの設定:**
- ⏱️ **アクション遅延 (Action Delay):** `0`（最初の遅延なし）
- 🔄 **リピート間隔 (Repeat Interval):** `1.5` 秒
  - 各パルス実行の間の時間。
- 🔢 **リピート回数 (Repeat Count):** `5`
  - パルスの合計回数。
  - 5回目の実行後に自動停止。

---

#### 無限ループの設定

`onInfinitePulseEvent` の **(void)** アイコンをクリックして、Behavior Window を開きます：

![Infinite Behavior](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-infinite.png)

**スケジュールの設定:**
- ⏱️ **アクション遅延 (Action Delay):** `0`
- 🔄 **リピート間隔 (Repeat Interval):** `1` 秒（有限モードより速い）
- 🔢 **リピート回数 (Repeat Count):** `Infinite Loop` ♾️
  - 特殊な値 `-1` は、無制限を意味します。
  - 自動的に停止することはありません。

:::tip ⚙️ 無限ループの設定方法

無限リピートを設定するには、リピート回数の横にある **Infinite Loop** トグルボタン（♾️ アイコン）をクリックします。これにより、値が自動的に `-1` に設定されます。

:::

---

### 発行側の設定 (RepeatingEventRaiser)

**RepeatingEventRaiser** GameObject を選択します：

![RepeatingEventRaiser Inspector](/img/game-event-system/examples/08-repeating-event/demo-08-inspector.png)

**イベントチャンネル:**
- `Finite Pulse Event`: `onFinitePulseEvent`
  - ツールチップ: "Interval = 1.5s, Count = 5"
- `Infinite Pulse Event`: `onInfinitePulseEvent`
  - ツールチップ: "Interval = 1.0s, Count = -1 (Infinite)"

**参照:**
- `Repeating Event Receiver`: RepeatingEventReceiver (連携用)

**視覚的参照:**
- `Rotating Core`: 動作状態を示すための回転体
- `Mode Text`: 現在のモードを表示する UI テキスト

---

### 受信側の設定 (RepeatingEventReceiver)

**RepeatingEventReceiver** GameObject を選択します：

![RepeatingEventReceiver Inspector](/img/game-event-system/examples/08-repeating-event/demo-08-receiver.png)

**設定:**
- `Beacon Origin`: パルスの生成点（SonarBeacon）

**視覚的リソース:**
- `Shockwave Prefab`: 拡大するリングエフェクト（Particle System）
- `Scanned Material`: ターゲットが強調表示された際のマテリアル
- `Default Material`: ターゲットの通常時のマテリアル

**オーディオ:**
- `Sonar Ping Clip`: パルス音
- `Power Down Clip`: 停止時の音

---

## 💻 コード解説

### 📤 RepeatingEventRaiser.cs (発行側)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;
using TMPro;

public class RepeatingEventRaiser : MonoBehaviour
{
    [Header("Event Channels")]
    [Tooltip("エディタで設定済み: Interval = 1.5s, Count = 5.")]
    [GameEventDropdown] public GameEvent finitePulseEvent;

    [Tooltip("エディタで設定済み: Interval = 1.0s, Count = -1 (Infinite).")]
    [GameEventDropdown] public GameEvent infinitePulseEvent;

    [SerializeField] private Transform rotatingCore;
    [SerializeField] private TextMeshProUGUI modeText;
    
    private bool _isInfiniteMode = false;
    private bool _isActive = false;
    private GameEvent _currentEvent;

    private void Update()
    {
        // ビジュアルフィードバック: 回転速度で状態を表示
        if (rotatingCore != null)
        {
            float speed = _isActive 
                ? (_isInfiniteMode ? 300f : 150f)  // 動作中: 高速または中速
                : 20f;                              // 待機中: 低速
            rotatingCore.Rotate(Vector3.up, speed * Time.deltaTime);
        }
    }

    /// <summary>
    /// ボタンアクション: リピートイベントループを開始します。
    /// 
    /// 重要：ここでは Raise() を一度だけ呼び出しています。
    /// イベントシステムのススケジューラーが、エディタで設定された
    /// リピート間隔と回数に基づいて、自動的にすべての繰り返しを処理します。
    /// </summary>
    public void ActivateBeacon()
    {
        if (_isActive) return;

        _isActive = true;
        
        // 現在のモードに基づいて使用するイベントを選択
        _currentEvent = _isInfiniteMode ? infinitePulseEvent : finitePulseEvent;

        if (_currentEvent != null)
        {
            // 魔法の1行: 一度の Raise() 呼び出しでループ全体が始まります。
            // システムがイベントのリピート設定を確認し、
            // 将来の実行をすべて自動的にスケジューリングします。
            _currentEvent.Raise();
            
            Debug.Log($"[Raiser] ビーコン起動。モード: " +
                     $"{(_isInfiniteMode ? "無限" : "有限 (5回)")}");
        }
    }
    
    /// <summary>
    /// ボタンアクション: 有限モードと無限モードを切り替えます。
    /// 切り替え前に動作中のループがあれば停止させます。
    /// </summary>
    public void ToggleMode()
    {
        if (_isActive) StopSignal();

        _isInfiniteMode = !_isInfiniteMode;
        UpdateUI();
    }

    /// <summary>
    /// ボタンアクション: 動作中のループを手動でキャンセルします。
    /// 
    /// 無限ループの場合、自動で止まらないためこの処理が不可欠です。
    /// 有限ループの場合、途中で強制終了させるために使用できます。
    /// </summary>
    public void StopSignal()
    {
        if (!_isActive || _currentEvent == null) return;

        // 重要な API: Cancel によりスケジューラーからイベントを削除します。
        // タイマーが即座に停止し、それ以上のパルスは発行されません。
        _currentEvent.Cancel();
        
        _isActive = false;
        UpdateUI();
        
        Debug.Log("[Raiser] 信号を手動で中断しました。");
    }

    private void UpdateUI()
    {
        if (modeText) 
            modeText.text = _isInfiniteMode 
                ? "モード切替\n<b>(無限)</b>" 
                : "モード切替\n<b>(有限[5回])</b>";
    }
}
```

**ポイント:**
- 🎯 **一度の Raise()** - ループ全体を開始するために一度呼ぶだけ。
- 🔀 **モード選択** - 設定の異なる2つのイベントを使い分け。
- 🛑 **キャンセルAPI** - 無限ループの停止や有限ループの早期終了。
- 🎨 **視覚的演出** - 回転速度で動作状態とモードを表現。

---

### 📥 RepeatingEventReceiver.cs (リスナー)
```csharp
using UnityEngine;
using System.Collections;

public class RepeatingEventReceiver : MonoBehaviour
{
    [Header("Configuration")]
    public Transform beaconOrigin;

    [Header("Visual Resources")]
    public ParticleSystem shockwavePrefab;
    public Material scannedMaterial;
    public Material defaultMaterial;

    [Header("Audio")]
    public AudioClip sonarPingClip;
    
    private AudioSource _audioSource;
    private int _pulseCount = 0;

    /// <summary>
    /// [イベントコールバック - リピート実行]
    /// 
    /// 'onFinitePulseEvent' と 'onInfinitePulseEvent' 両方に紐付け。
    /// 
    /// このメソッドが実行されるタイミング:
    /// - Raise() が呼ばれた直後（最初のパルス）
    /// - その後、設定されたリピート間隔ごと
    /// - リピート回数に達するまで（有限）、または Cancel() されるまで（無限）
    /// 
    /// 受信側は「ステートレス（状態を持たない）」です。
    /// 何回目のパルスか、ループがいつ終わるかなどを管理する必要はなく、
    /// 各トリガーに対して反応するだけで済みます。
    /// </summary>
    public void OnPulseReceived()
    {
        _pulseCount++;
        Debug.Log($"[Receiver] パルス #{_pulseCount} を送信しました。");

        Vector3 spawnPos = beaconOrigin != null 
            ? beaconOrigin.position 
            : transform.position;

        // 衝撃波VFXの生成
        if (shockwavePrefab != null)
        {
            var vfx = Instantiate(shockwavePrefab, spawnPos, Quaternion.identity);
            vfx.Play();
            Destroy(vfx.gameObject, 2.0f);
        }

        // ソナー音をピッチを少し変えて再生
        if (sonarPingClip) 
        {
            _audioSource.pitch = Random.Range(0.95f, 1.05f);
            _audioSource.PlayOneShot(sonarPingClip);
        }

        // 物理ベースのターゲットスキャンを開始
        StartCoroutine(ScanRoutine(spawnPos));
    }

    public void OnPowerDown()
    {
        _pulseCount = 0; // システム停止時にカウンターをリセット
    }

    /// <summary>
    /// ビーコン中心から目に見えない球体を拡大させます。
    /// 拡大する波面に触れたターゲットをハイライトします。
    /// </summary>
    private IEnumerator ScanRoutine(Vector3 center)
    {
        float maxRadius = 40f;      // シアンのリングサイズに合わせる
        float speed = 10f;          // 拡大速度
        float currentRadius = 0f;

        while (currentRadius < maxRadius)
        {
            currentRadius += speed * Time.deltaTime;
            
            // 物理演算の球体判定でターゲットを探す
            Collider[] hits = Physics.OverlapSphere(center, currentRadius);
            
            foreach (var hit in hits)
            {
                if (hit.name.Contains("ScanTarget"))
                {
                    var rend = hit.GetComponent<Renderer>();
                    if (rend && rend.sharedMaterial != scannedMaterial)
                    {
                        float dist = Vector3.Distance(center, hit.transform.position);
                        
                        // 波面の縁（1ユニット以内）にいる場合のみハイライト
                        if (dist <= currentRadius && dist > currentRadius - 1.0f)
                        {
                            StartCoroutine(HighlightTarget(rend));
                        }
                    }
                }
            }
            
            yield return null;
        }
    }

    private IEnumerator HighlightTarget(Renderer target)
    {
        // 一時的に赤色に
        target.material = scannedMaterial;
        
        var tmp = target.GetComponentInChildren<TMPro.TextMeshPro>();
        if(tmp) tmp.text = "DETECTED";

        yield return new WaitForSeconds(0.4f);

        // デフォルトに戻す
        target.material = defaultMaterial;
        if(tmp) tmp.text = "?";
    }
}
```

**ポイント:**
- 🎯 **ステートレスな受信側** - ループ回数やタイミングを意識しなくて良い。
- 📡 **物理スキャン** - 拡大する球体判定でターゲットを検出。
- 🎨 **波面検出** - 衝撃波の縁に合わせてターゲットを光らせる。
- 🔢 **パルスカウンター** - 受信したパルス数を記録（演出用）。

---

## 🔑 重要なまとめ

| コンセプト              | 実装内容                                                 |
| ------------------------- | --------------------------------------------------------- |
| 🔄 **リピート間隔**       | 実行ごとの待機時間（エディタで設定）                      |
| 🔢 **リピート回数**       | 繰り返しの回数（`N` で有限、`-1` で無限）                 |
| 🎯 **一度の Raise()**      | 一度の呼び出しで全ループが開始、手動トリガーは不要          |
| ✅ **自動停止**           | 有限ループは N 回の実行後に自動的に終了する               |
| 🛑 **手動キャンセル**     | 無限ループを止めるには `.Cancel()` が必要                 |
| 🎨 **ステートレスな受信** | コールバック側でループの状態を管理する必要がない           |

:::note 🎓 設計の洞察

リピートイベントは以下のようなケースに最適です：

- **周期的なアビリティ** - 毒ダメージ、自動回復、エリア拒否
- **環境エフェクト** - 溶岩の泡、蒸気の噴出、灯台の光
- **スポーンシステム** - 敵のウェーブ、アイテムドロップ、パーティクルの間欠放出
- **レーダー/検出** - ソナーパルス、セキュリティスキャン、近接アラート
- **ゲームプレイループ** - ターンタイマー、チェックポイントのオートセーブ、周期イベント

回数が明確に決まっている場合（例：「3発撃つ」）は**有限**ループを。特定の条件を満たすまで続く効果（例：「エリアを出るまでパルスを出す」）には**無限**ループを使用してください。

:::

:::tip 💻 プログラムからの制御

インスペクターの設定を無視して、完全にコードからループを設定することも可能です：

```csharp
// インスペクターの設定を一時的に上書きしてリピート実行
myEvent.RaiseRepeating(interval: 0.5f, repeatCount: 10);

// またはインスペクターのデフォルト設定で実行
myEvent.Raise();
```

これにより、難易度設定やパワーアップ状態に合わせて、ランタイムに動作を動的に調整できます。

:::

---

## 🎯 次のステップは？

自動ループのためのリピートイベントをマスターしました。次は、シーン遷移を跨いで生存する**常駐イベント**について見ていきましょう。

**次の章**: シーンを跨ぐイベントについて学ぶ **[09 常駐イベント](./09-persistent-event.md)**

---

## 📚 関連ドキュメント

- **[ゲームイベントビヘイビア](../visual-workflow/game-event-behavior.md)** - スケジュール設定の完全ガイド
- **[イベントの発行と予約](../scripting/raising-and-scheduling.md)** - `.Raise()`, `.RaiseRepeating()`, `.Cancel()` の API リファレンス
- **[ベストプラクティス](../scripting/best-practices.md)** - 周期的なゲームプレイメカニクスのパターン