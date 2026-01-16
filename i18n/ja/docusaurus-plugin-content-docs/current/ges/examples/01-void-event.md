---
sidebar_label: '01 引数なしイベント'
sidebar_position: 2
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 01 引数なしイベント：デカップリングされたアーキテクチャ

<VideoGif src="/video/game-event-system/example/01-void-event.mp4" />

## 📋 概要

このデモは、Game Event Systemを使用したコアな**オブザーバーパターン**のワークフローを説明します。ここでの最大のポイントは、**送信側**（VoidEventRaiser）と**受信側**（VoidEventReceiver）のスクリプトが完全にデカップリングされている、つまりコード上で互いを一切参照していないということです。

:::tip 💡 学べること
- 引数なし（void）イベントの作成方法
- リスナーを特定せずにイベントを発行する方法
- Game Event Editorを使用してコールバックを視覚的に紐付ける方法
- デカップリングされたアーキテクチャの利点

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/01_VoidEvent/01_VoidEvent.unity
```

### シーン構成

**UIレイヤー (Canvas):**
- 🎮 **Button** - Canvas UIのボタン（中央下部に配置）
  - `OnClick()` イベントが `VoidEventRaiser.RaiseBasicEvent()` に接続されています。
  - これは標準的なUnity UIのイベントバインディングです。

**ゲームロジックレイヤー (デモスクリプト):**
- 📤 **VoidEventRaiser** - `VoidEventRaiser.cs` スクリプトを持つGameObject
  - `OnVoidEvent` ゲームイベントアセットへの参照を保持しています。
  - ボタンから `RaiseBasicEvent()` が呼び出されると、`voidEvent.Raise()` をトリガーします。
  - 同時にUIのオーディオフィードバックを再生します。
  
- 📥 **VoidEventReceiver** - `VoidEventReceiver.cs` スクリプトを持つGameObject
  - Game Event Editorでのビジュアルバインディングを通じて `OnVoidEvent` をリッスンします。
  - 青いキューブの Rigidbody を参照し、物理的なレスポンスを適用します。

**ビジュアルフィードバックレイヤー (デモオブジェクト):**
- 🎲 **青いキューブ** - シーン内の3Dオブジェクト
  - 物理シミュレーション用の Rigidbody コンポーネントを持っています。
  - イベントが発行されると、ジャンプと回転で反応します。
  - 着地用の地面（Ground Plane）が配置されています。

---

## 🎮 操作方法

### ステップ 1: プレイモードに入る

Unityの **Play** ボタンを押してデモを開始します。

### ステップ 2: "Raise" ボタンをクリックする

ゲームビューの下部にある **"Raise"** ボタンをクリックします。

**イベントの流れ:**
1. 🖱️ Unity UIボタンの `OnClick()` が発動 ➔ `VoidEventRaiser.RaiseBasicEvent()` を呼び出し
2. 🔊 VoidEventRaiser からオーディオフィードバックが再生
3. 📡 `voidEvent.Raise()` が GameEventManager を通じて信号をブロードキャスト
4. 📥 VoidEventReceiver の `OnEventReceived()` メソッドが自動的に呼び出し
5. 🎲 キューブがランダムな水平方向のドリフトと回転を伴って上方にジャンプ
6. 📝 コンソールログで各ステップを確認: `[VoidEvent] Raise()` ➔ `[VoidEvent] OnEventReceived()`

---

## 🏗️ シーンのアーキテクチャ

### イベント定義 (Event Definition)

**Game Event Editor** ウィンドウを開きます (`Tools → TinyGiants → Game Event Editor`):

![Game Event Editor](/img/game-event-system/examples/01-void-event/demo-01-editor.png)

**主要コンポーネント:**
- **Event Name**: `OnVoidEvent`
- **Event Type**: `void` (引数なし)
- **Database**: `GameEventDatabase_Void`
- **Behavior カラム**: コールバックのバインディングを示す緑色の **(void)** アイコンが表示されています。

この ScriptableObject は、送信側と受信側の間の**信号チャンネル**として機能します。

---

### 送信側の設定 (VoidEventRaiser)

ヒエラルキーで **VoidEventRaiser** GameObject を選択します (`Demo Scripts/VoidEventRaiser`):

![VoidEventRaiser Inspector](/img/game-event-system/examples/01-void-event/demo-01-inspector.png)

**設定内容:**
- **GameObject セクション**:
  - `Void Event` フィールドは `[GameEventDropdown]` 属性を使用しています。
  - `OnVoidEvent` アセットが設定されています。
  
- **Audio セクション**:
  - ボタンクリックのフィードバック用に `UI Clip` が割り当てられています。

このスクリプトは、ボタンからトリガーされた際に `voidEvent.Raise()` を呼び出すだけで、**誰がそれをリッスンしているかは関知しません**。

---

### 受信側のバインディング (Behavior 設定)

ここが**デカップリングの魔法**が起こる場所です！イベントとコールバックの接続は、すべてエディタ上で設定されます。

**設定手順:**

1. **Game Event Editor** ウィンドウで、イベントリストから `OnVoidEvent` を見つけます。
2. 右側の **Behavior** カラムを確認します。
3. 緑色の **(void)** アイコンをクリックして、**Behavior Window** を開きます。

![Behavior Window](/img/game-event-system/examples/01-void-event/demo-01-behavior.png)

**設定の詳細:**

**Event Action セクション:**
- **Mode**: `Runtime Only` (エディタ実行時ではなく、実行時のみ有効)
- **Target Object**: `VoidEventReceiver` GameObject
- **Method**: `VoidEventReceiver.OnEventReceived` (void メソッド)

このバインディングにより、GameEventManager は次のように動作します： *「`OnVoidEvent.Raise()` が呼ばれたら、自動的に `VoidEventReceiver.OnEventReceived()` を実行せよ」*

:::note 🎯 ビジュアルバインディングのメリット

- ✅ 送信側と受信側の間にコード上の参照が不要
- ✅ スクリプトを触らずにリスナーを簡単に追加・削除可能
- ✅ イベントとコールバックの関係を一目で視覚的に把握可能
- ✅ Runtime-only モードにより、エディタ上での誤動作を防止

:::

---

## 💻 コード解説

### 📤 VoidEventRaiser.cs (イベント送信側)
```csharp
using TinyGiants.GameEventSystem.Runtime;
using UnityEngine;

public class VoidEventRaiser : MonoBehaviour
{
    [Header("GameObject")]
    [GameEventDropdown] public GameEvent voidEvent; // インスペクターでイベントを選択

    [Header("Audio")]
    [SerializeField] private AudioClip UIClip;

    private AudioSource _audioSource;

    private void Start()
    {
        _audioSource = gameObject.AddComponent<AudioSource>();
    }

    /// <summary>
    /// [入力トリガー]
    /// このメソッドはボタンの OnClick() イベントから呼び出されます（インスペクターで設定）。
    /// リスナーが誰であるかを知ることなく、イベント信号をブロードキャストします。
    /// </summary>
    public void RaiseBasicEvent()
    {
        if (UIClip) _audioSource.PlayOneShot(UIClip);
        
        if (voidEvent == null)
        {
            Debug.LogWarning("[VoidEvent] VoidEventRaiser に GameEvent が割り当てられていません。");
            return;
        }
        
        // イベントを発行
        voidEvent.Raise();
        Debug.Log("[VoidEvent] GameEvent の Raise() が呼び出されました。");
    }
}
```

**ポイント:**
- 🎯 **`[GameEventDropdown]`** - インスペクターでイベントをドロップダウン選択できるようにします。
- 🔊 **オーディオフィードバック** - イベント発行前に音を鳴らします。
- 📢 **`voidEvent.Raise()`** - 1行のコードですべてのリスナーに通知します。
- 🔇 **完全な非結合** - VoidEventReceiver やキューブへの参照は一切ありません。

---

### 📥 VoidEventReceiver.cs (イベントリスナー)
```csharp
using UnityEngine;

public class VoidEventReceiver : MonoBehaviour
{
    [SerializeField] private Rigidbody targetRigidbody;
    
    private float jumpForce = 5.0f;
    private float horizontalRandomness = 1.0f;
    private float spinStrength = 5.0f;
    
    /// <summary>
    /// [イベントコールバック]
    /// このメソッドは VoidEventRaiser から直接呼び出されるわけではありません。
    /// Game Event Editor の Behavior Window を通じて 'OnVoidEvent' に紐付けられています。
    /// 
    /// 効果: 垂直速度をリセットした後、ジャンプ + ランダムなドリフト + 回転を適用します。
    /// </summary>
    public void OnEventReceived()
    {
        Debug.Log("[VoidEvent] GameEvent の OnEventReceived() が呼び出されました。");
        
        if (targetRigidbody != null)
        {
            // 一貫したジャンプの高さのために垂直速度をリセット
            Vector3 currentVel;
#if UNITY_6000_0_OR_NEWER
            currentVel = targetRigidbody.linearVelocity;
#else
            currentVel = targetRigidbody.velocity;
#endif
            currentVel.y = 0;
            
#if UNITY_6000_0_OR_NEWER
            targetRigidbody.linearVelocity = currentVel;
#else
            targetRigidbody.velocity = currentVel;
#endif
            
            // ジャンプとランダムな水平ドリフトを適用
            Vector2 randomCircle = Random.insideUnitCircle * horizontalRandomness;
            Vector3 sideForce = new Vector3(randomCircle.x, 0, randomCircle.y);
            Vector3 finalForce = (Vector3.up * jumpForce) + sideForce;
            targetRigidbody.AddForce(finalForce, ForceMode.Impulse);

            // ランダムな回転を適用
            Vector3 randomTorque = Random.insideUnitSphere * spinStrength;
            targetRigidbody.AddTorque(randomTorque, ForceMode.Impulse);
        }
        else
        {
            Debug.LogWarning("VoidEventReceiver: インスペクターで targetRigidbody を割り当ててください！");
        }
    }
}
```

**ポイント:**
- 🎲 **速度のリセット** - ジャンプの高さを一定にするために、まずY軸の速度をゼロにします。
- 🎯 **物理レスポンス** - 上方へのインパルス ＋ ランダムな水平移動 ＋ ランダムなトルクを組み合わせます。
- 🔇 **完全な非結合** - VoidEventRaiser やボタンへの参照は一切ありません。
- 🔄 **Unityバージョンの互換性** - 従来の物理APIと Unity 6 の新しいAPIの両方に対応しています。

---

## 🔑 重要なまとめ

| コンセプト            | 実装内容                                                     |
| ---------------------- | ------------------------------------------------------------ |
| 🎯 **デカップリング**   | 送信側と受信側は互いを一切参照しない                         |
| 📡 **ブロードキャスト** | 1つの `Raise()` 呼び出しですべてのリスナーに通知             |
| 🎨 **ビジュアルバインディング** | コールバックの設定はコードではなく Behavior Window で行う    |
| 🔗 **レイヤーの分離**   | UI ➔ ロジック(送信) ➔ イベントシステム ➔ ロジック(受信) ➔ 視覚効果 |
| 🔄 **拡張性**           | 送信側のコードを修正することなく受信側を自由に追加可能       |

:::note 🧠 デザインパターン

これは典型的な**オブザーバーパターン**の実装例です。被写体（イベント）は、強い結合を持つことなく観察者（リスナー）に通知を送ります。ボタンは VoidEventRaiser のみを知り、VoidEventRaiser は GameEvent のみを知り、VoidEventReceiver はエディタのバインディングを通じて GameEvent のみを知っています。これこそが完璧なデカップリングです！

:::

---

## 🎯 次のステップは？

引数なしのイベントを理解したところで、次はシステム間で**データを渡す**方法を見ていきましょう。

**次の章**: イベントでパラメータを送信する方法を学ぶ **[02 基本型イベント](./02-basic-types-event.md)**

---

## 📚 関連ドキュメント

- **[Game Event Editor](../visual-workflow/game-event-editor.md)** - イベント設定の詳細ガイド
- **[Game Event Behavior](../visual-workflow/game-event-behavior.md)** - コールバックの設定方法
- **[イベントの発行](../scripting/raising-and-scheduling.md)** - 実行時にイベントをトリガーするためのAPI
- **[リスニング戦略](../scripting/listening-strategies.md)** - イベントに反応するための様々な手法