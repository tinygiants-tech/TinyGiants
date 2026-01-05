---
sidebar_label: '09 常駐イベント'
sidebar_position: 10
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 09 常駐イベント：シーンロードを跨ぐ生存

<!-- <VideoGif src="/video/game-event-system/09-persistent-event.mp4" /> -->

## 📋 概要

Unityでは、新しいシーンをロードすると、前のシーンにあったすべてのGameObject（およびそのイベントリスナー）が破棄されます。**常駐イベント (Persistent Events)** は、シーン遷移後も維持されるグローバルマネージャーにリスナーの紐付け（バインディング）を保存することで、この問題を解決します。これは、ミュージックコントローラー、インベントリマネージャー、実績トラッカーなどのグローバルシステムに不可欠な機能です。

:::tip 💡 学べること
- Unityにおけるシーン遷移時のクリーンアップ問題
- チェックボックス一つでイベントの常駐を有効にする方法
- 常駐イベントと通常イベントの挙動の違い
- シーンを跨ぐイベントシステムの設計パターン

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/09_PersistentEvent/09_PersistentEvent_1.unity
```

### シーン構成

**視覚的要素:**
- 🔴 **Turret_A (左)** - 赤色のタレット
  - **常駐 (Persistent)** イベント `OnTurretA` によって制御されます。
  - 回転ヘッド機構を持ちます。
  - シーンのリロード後も動作し続けます。
  
- 🔵 **Turret_B (右)** - 青色のタレット
  - **通常 (Non-Persistent)** イベント `OnTurretB` によって制御されます。
  - 機能はタレットAと同一です。
  - シーンのリロード後は動作しなくなります。

- 🎯 **TargetDummy** - 中央のターゲット（カプセル）
  - 両方のタレットはこのターゲットを狙って発射します。
  - ノックバック物理用の Rigidbody を保持しています。

- 📋 **HoloDisplay** - 情報パネル
  - 実験内容の説明テキストを表示します。
  - 常駐状態に関する情報を表示します。

**UIレイヤー (Canvas):**
- 🎮 **3つのボタン** - 画面下部
  - "Fire A" (白) ➔ `PersistentEventRaiser.FireTurretA()` を実行
  - "Fire B" (白) ➔ `PersistentEventRaiser.FireTurretB()` を実行
  - "Load Scene 2" (緑) ➔ 常駐をテストするためにシーンをリロード

**ゲームロジックレイヤー (デモスクリプト):**
- 📤 **PersistentEventRaiser** - 標準的なシーンベースの発行側
  - 両方のイベントへの参照を保持します。
  - シーンリロード時に破棄され、再生成されます。
  
- 📥 **PersistentEventReceiver** - **DontDestroyOnLoad** シングルトン
  - シーン遷移を跨いで生存します。
  - 両方のタレットの戦闘ロジックを保持します。
  - シーン参照の解決に**依存性の注入 (Dependency Injection)** パターンを使用します。

- 🔧 **Scene Setup** - 依存性注入のヘルパー
  - シーンロード時に実行されます。
  - 常駐している受信側（Receiver）に、新しいシーンのタレット参照を再注入します。
  - これにより、常駐した受信側が新しいシーンのオブジェクトを制御できるようになります。

---

## 🎮 操作方法

### 常駐実験の内容

このデモでは、シーンロード後も常駐イベントがバインディングを維持する一方で、通常イベントはクリアされることを証明します。

---

### ステップ 1: プレイモードに入る

Unityの **Play** ボタンを押します。

**初期状態:**
- シーン内に2つのタレット（赤と青）が待機しています。
- ホロディスプレイに説明文が表示されます。
- コンソールはクリアな状態です。

---

### ステップ 2: 初回の機能テスト

**"Fire A" をクリック:**
- 🎯 赤タレット（左）がターゲットの方を向きます。
- 🚀 弾丸が発射され、飛んでいきます。
- 💥 着弾時：
  - オレンジ色のテキスト「CRIT! -500」が表示
  - 巨大な爆発VFXが発生
  - カメラシェイクが発生
  - ターゲットがノックバック
- 📝 コンソール: `[Raiser] Broadcasting Command: Fire Turret A`
- 📝 コンソール: `[Receiver] Received Command A. Engaging...`

**"Fire B" をクリック:**
- 🎯 青タレット（右）がターゲットの方を向きます。
- 🚀 弾丸が発射されます。
- 💥 着弾時：
  - 白いテキスト「-200」が表示
  - 標準的な爆発VFXが発生
  - カメラシェイクなし（弱い攻撃）
  - ターゲットがノックバック
- 📝 コンソール: `[Raiser] Broadcasting Command: Fire Turret B`
- 📝 コンソール: `[Receiver] Received Command B. Engaging...`

**結果:** ✅ 初回のシーンでは、両方のタレットが完璧に動作します。

---

### ステップ 3: シーンのリロード（パージ）

**"Load Scene 2" をクリック:**

**舞台裏で起きていること:**
1. 🔄 Unity の `SceneManager.LoadScene()` が呼び出されます。
2. 💀 **シーン破棄フェーズ:**
   - シーン内のすべての GameObject が破棄されます：
     - ❌ Turret_A 破棄
     - ❌ Turret_B 破棄
     - ❌ TargetDummy 破棄
     - ❌ PersistentEventRaiser 破棄
   - 🗑️ GameEventManager が **通常 (Non-Persistent)** イベントのリスナーをクリーンアップします。
     - `OnTurretB` のリスナーがクリアされます。
     - `OnTurretA` のリスナーは **維持** されます（常駐フラグが有効なため）。

3. 🏗️ **シーン再生成フェーズ:**
   - 新しい Turret_A が生成されます。
   - 新しい Turret_B が生成されます。
   - 新しい TargetDummy が生成されます。
   - 新しい PersistentEventRaiser が生成されます。

4. ✨ **常駐オブジェクト:**
   - ✅ `PersistentEventReceiver` は **生存** します (DontDestroyOnLoad)。
   - ✅ その内部にある `OnTurretA` へのメソッドバインディングは **有効なまま** です。

5. 🔧 **依存性の注入:**
   - `PersistentEventSceneSetup.Start()` が実行されます。
   - `PersistentEventReceiver.UpdateSceneReferences()` を呼び出します。
   - 新しく生成されたシーン内のタレット参照を、常駐している受信側に注入します。

**視覚的な変化:**
- リロード中、一瞬画面が暗くなります。
- 同じ位置にタレットが再配置されます。
- UI ボタンは引き続き機能します。

---

### ステップ 4: リロード後の生存テスト

**リロード後に "Fire A" をクリック:**

**何が起きるか:**
1. 🎯 赤タレットが回転し、発射します（完璧に動作！）。
2. 💥 戦闘シーケンスがすべて実行されます。
3. 📝 コンソール: `[Receiver] Received Command A. Engaging...`

**なぜ動作するのか:**
```
ボタン ➔ fireAEvent.Raise() 
      ➔ GameEventManager が常駐バインディングを発見
      ➔ PersistentEventReceiver.OnFireCommandA() が実行
      ➔ 新しく注入されたタレット参照を使用
      ➔ タレットが発射
```

**結果:** ✅ **常駐イベントはシーンリロード後も生存しました！**

---

**リロード後に "Fire B" をクリック:**

**何が起きるか:**
1. 🔇 **何も起きません**
2. 📝 コンソール: `[Raiser] Broadcasting Command: Fire Turret B`
3. ❌ 受信側のログが出ません。
4. 青タレットは動きも発射もしません。

**なぜ失敗したのか:**
```
🔘 入力: ボタンクリック
│
🚀 イベント: fireBEvent.Raise()
│
🔍 登録簿: [ GameEventManager による検索 ]
│   
├─❓ 結果: 何も見つからない
│  └─ 🗑️ 理由: シーンリロード時にバインディングがクリアされたため
│
🌑 結末: 信号の霧散
│  └─ 👻 結果: 虚空に消える（受信側が呼び出されない）
│
📊 ステータス: 実行されたアクション 0 | ✅ システムは安全（NullRefは発生しない）
```

**結果:** ❌ **通常イベントのバインディングは破棄されました！**

:::danger 🔴 死んだイベント

`OnTurretB` のリスナーは、シーンがアンロードされた際にクリアされました。イベントアセット自体は存在し続けますが、`PersistentEventReceiver.OnFireCommandB()` との接続は**永久に断たれています**（コード経由で手動で再購読しない限り）。

:::

---

## 🏗️ シーンのアーキテクチャ

### シーン遷移の問題点

標準的な Unity のイベントシステムでは：
```
🖼️ シーン A: ロード済み
   └─ 🔗 リスナー: 購読中 (ローカルコンテキスト)
│
🚚 [ シーン B をロード中... ]
│
🧹 クリーンアップ: メモリのパージ
   └─ ❌ 結果: すべてのリスナーが登録簿から削除される
│
🖼️ シーン B: アクティブ
   └─ 🌑 状態: イベントは「空」（受信側がいない）
```

これにより、シーンを跨いで存続する必要があるグローバルシステムが機能しなくなります。

### 常駐イベントによる解決策
```
🖼️ シーン A: ロード済み
   └─ 🛡️ リスナー: 購読中 (グローバルコンテキスト)
│
🚚 [ シーン B をロード中... ]
│
💎 保持: 引き継ぎ成功
   └─ ✅ 結果: バインディングはグローバル常駐登録簿に保存される
│
🖼️ シーン B: アクティブ
   └─ 🔥 状態: イベントは「ホット」（リスナーは準備完了のまま）
```

常駐イベントは、イベントロジックにおける `DontDestroyOnLoad` のように振る舞います。

---

### 設計パターン：依存性の注入 (Dependency Injection)

このデモでは、シーン参照を処理するために高度なパターンを使用しています：

**課題:**
- `PersistentEventReceiver` は生存します (DontDestroyOnLoad)。
- しかし、タレットはシーンロードのたびに破棄され、再生成されます。
- 受信側は、新しいタレットインスタンスへの参照を必要とします。

**解決策:**
1. **常駐受信側**が戦闘ロジックを保持します。
2. **Scene Setup スクリプト**がシーンロードごとに実行されます。
3. Setup スクリプトが新しいシーンの参照を受信側に注入します。
4. 受信側は新しいタレットを制御できるようになります。
```
🛡️ 常駐レイヤー (生存者)
┃  └─ 💎 PersistentEventReceiver [シーンロードを跨いで生存]
┃        ▲
┃        ║ 💉 依存性注入 (参照の再結合)
┃        ╚══════════════════════════════════════╗
┃                                               ║
🖼️ シーンレイヤー (コンテキスト)                  ║
┃  └─ ⚙️ PersistentEventSceneSetup [再生成]     ║
┃        │                                      ║
┃        └── 🔍 参照を検索して渡す ➔ ════════════╝
┃              │
┃              ├── 🤖 新しい Turret_A [シーンインスタンス]
┃              └── 🤖 新しい Turret_B [シーンインスタンス]
```

---

### イベント定義 (Event Definitions)

![Game Event Editor](/img/game-event-system/examples/09-persistent-event/demo-09-editor.png)

| イベント名  | 型                 | 常駐フラグ (Persistent) |
| ----------- | ------------------ | --------------- |
| `OnTurretA` | `GameEvent` (void) | ✅ チェックあり       |
| `OnTurretB` | `GameEvent` (void) | ❌ チェックなし       |

**同一のイベント、異なる運命:**
どちらも同じ設定の Void イベントですが、生存を決定するのはたった一つのチェックボックスです。

---

### ビヘイビア設定

#### 常駐イベント (OnTurretA)

`OnTurretA` の **(void)** アイコンをクリックして、Behavior Window を開きます：

![Persistent Behavior](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

**重要な設定:**
- 💾 **常駐イベント (Persistent Event):** ✅ **チェックを入れる**

**警告メッセージ:**
> 「イベントは DontDestroyOnLoad のように振る舞います。」

**これが意味すること:**
- リスナーのバインディングはグローバル常駐マネージャーに保存されます。
- シーン遷移中にクリアされません。
- 明示的に削除されるか、ゲームが終了するまで生存します。
- シーンを跨ぐシステムには必須の設定です。

---

#### 通常イベント (OnTurretB)

以下の点を除き、同じ設定です：
- 💾 **常駐イベント (Persistent Event):** ❌ **チェックを外す**

**結果:**
- 標準的な Unity のライフサイクルに従います。
- シーンアンロード時にリスナーがクリアされます。
- 新しいシーンで必要な場合は、再購読が必要です。

---

### 発行側の設定 (PersistentEventRaiser)

**PersistentEventRaiser** GameObject を選択します：

![PersistentEventRaiser Inspector](/img/game-event-system/examples/09-persistent-event/demo-09-inspector.png)

**ゲームイベント:**
- `Fire A Event`: `OnTurretA` (常駐)
  - ツールチップ: "エディタで 'Persistent Event' をチェック済み"
- `Fire B Event`: `OnTurretB` (通常)
  - ツールチップ: "エディタで 'Persistent Event' のチェックを外した状態"

**ライフサイクル:**
- ❌ シーンリロード時に破棄。
- ✅ 新しいシーンと共に再生成。
- 新しいイベント参照を保持（アセット自体は永続的な ScriptableObject です）。

---

### 受信側の設定 (PersistentEventReceiver)

**PersistentEventReceiver** GameObject を選択します：

![PersistentEventReceiver Inspector](/img/game-event-system/examples/09-persistent-event/demo-09-receiver.png)

**戦闘リソース:**
- `Projectile Prefab`: タレット弾丸プレハブ
- `Fire VFX`: 発射時のマズルフラッシュ

**フィードバック:**
- `Hit Normal VFX`: 通常ヒットエフェクト
- `Hit Crit VFX`: クリティカルエフェクト
- `Floating Text Prefab`: ダメージ数値表示
- `Hit Clip`: 爆発音

**動的参照 (隠し項目):**
これらは Scene Setup によって実行時に注入されます：
- `turretA`, `headA` (タレット A の参照)
- `turretB`, `headB` (タレット B の参照)
- `targetDummy`, `targetRigidbody` (ターゲットの参照)

---

### シーンセットアップの設定

**Scene Setup** GameObject を選択します：

![Scene Setup Inspector](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

**現在のシーン内のオブジェクト:**
- `Turret A`: シーン内の Turret_A インスタンス
- `Head A`: 回転の軸となる Transform
- `Turret B`: シーン内の Turret_B インスタンス
- `Head B`: 同上
- `Target Dummy`: ターゲットの Transform
- `Target Rigidbody`: ターゲットの Rigidbody

**目的:**
`Start()` 実行時に、このスクリプトが常駐受信側を見つけ、これらの参照を注入します。これにより、常駐ロジックが新しいシーンのオブジェクトを制御できるようになります。

---

## 💻 コード解説

### 📤 PersistentEventRaiser.cs (発行側)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class PersistentEventRaiser : MonoBehaviour
{
    [Header("Game Events")]
    [Tooltip("エディタ設定: 'Persistent Event' をチェック済み。")]
    [GameEventDropdown] public GameEvent fireAEvent;
    
    [Tooltip("エディタ設定: 'Persistent Event' のチェックなし。")]
    [GameEventDropdown] public GameEvent fireBEvent;

    /// <summary>
    /// UI ボタン: タレット A に発射を命じます。
    /// 
    /// 'fireAEvent' は常駐設定のため、このバインディングはシーンロードを跨いで生存します。
    /// リロード後も、常駐受信側が引き続き反応します。
    /// </summary>
    public void FireTurretA()
    {
        if (fireAEvent == null) return;
        
        fireAEvent.Raise();
        Debug.Log("<color=cyan>[Raiser] 指令をブロードキャスト: タレット A 発射</color>");
    }

    /// <summary>
    /// UI ボタン: タレット B に発射を命じます。
    /// 
    /// 'fireBEvent' は常駐設定ではないため、このバインディングはシーンロード後に「切断」されます。
    /// イベントは発行されますが、誰もリッスンしていません。
    /// </summary>
    public void FireTurretB()
    {
        if (fireBEvent == null) return;
        
        fireBEvent.Raise();
        Debug.Log("<color=orange>[Raiser] 指令をブロードキャスト: タレット B 発射</color>");
    }
}
```

**ポイント:**
- 🎯 **標準コンポーネント** - 常駐せず、シーンごとに再生成されます。
- 📡 **イベント参照** - ScriptableObject アセット（永続的）。
- 🔇 **ライフサイクル非認識** - リスナーが生存しているかどうかは関知しません。

---

### 📥 PersistentEventReceiver.cs (受信側 - シングルトン)
```csharp
using UnityEngine;
using System.Collections;

public class PersistentEventReceiver : MonoBehaviour
{
    [Header("Combat Resources")]
    [SerializeField] private TurretProjectile projectilePrefab;
    [SerializeField] private ParticleSystem fireVFX;
    // ... その他のリソース ...

    // 実行時に注入されるシーン参照
    [HideInInspector] public GameObject turretA;
    [HideInInspector] public Transform headA;
    [HideInInspector] public GameObject turretB;
    [HideInInspector] public Transform headB;
    [HideInInspector] public Transform targetDummy;
    [HideInInspector] public Rigidbody targetRigidbody;

    private bool _isFiringA;
    private bool _isFiringB;

    // 常駐のためのシングルトンパターン
    private static PersistentEventReceiver _instance;
    public static PersistentEventReceiver Instance => _instance;

    private void Awake()
    {
        // 重要: DontDestroyOnLoad によりシーン遷移を跨いで生存します
        if (_instance == null)
        {
            _instance = this;
            DontDestroyOnLoad(gameObject);
            Debug.Log("[PersistentReceiver] DontDestroyOnLoad で初期化されました。");
        }
        else if (_instance != this)
        {
            // シーンリロード時に重複するのを防ぎます
            Destroy(gameObject);
        }
    }

    private void Update()
    {
        // 注入された参照を使用してタレットを制御します
        HandleTurretRotation(turretA, headA, ref _isFiringA);
        HandleTurretRotation(turretB, headB, ref _isFiringB);
    }

    /// <summary>
    /// [イベントコールバック - 常駐バインディング]
    /// 常駐フラグをチェックした 'OnTurretA' に紐付け。
    /// 
    /// このメソッドバインディングはシーンリロードを跨いで「生存」します。
    /// リロード後も、fireAEvent.Raise() が実行されるとこれが呼び出されます。
    /// </summary>
    public void OnFireCommandA()
    {
        Debug.Log("<color=cyan>[Receiver] 指令 A を受信。攻撃開始...</color>");
        _isFiringA = true;
    }

    /// <summary>
    /// [イベントコールバック - 通常バインディング]
    /// 常駐フラグを外した 'OnTurretB' に紐付け。
    /// 
    /// このメソッドバインディングはシーンリロード時に「クリア」されます。
    /// リロード後は、二度と呼び出されません（結合が失われます）。
    /// </summary>
    public void OnFireCommandB()
    {
        Debug.Log("<color=orange>[Receiver] 指令 B を受信。攻撃開始...</color>");
        _isFiringB = true;
    }
    
    /// <summary>
    /// シーンロードごとに PersistentEventSceneSetup から呼び出されます。
    /// 新しいシーンオブジェクトの参照を常駐受信側に注入します。
    /// </summary>
    public void UpdateSceneReferences(
        GameObject tA, Transform hA, 
        GameObject tB, Transform hB, 
        Transform target, Rigidbody rb)
    {
        this.turretA = tA;
        this.headA = hA;
        this.turretB = tB;
        this.headB = hB;
        this.targetDummy = target;
        this.targetRigidbody = rb;
        
        Debug.Log("[PersistentReceiver] シーン参照を更新しました。");
    }

    private void HandleTurretRotation(GameObject turret, Transform head, ref bool isFiring)
    {
        if (head == null || targetDummy == null) return;

        // 待機時の揺れ、またはアクティブなターゲティング
        Quaternion targetRot;
        float speed = isFiring ? 10f : 2f;

        if (isFiring)
        {
            // ターゲットを狙う
            Vector3 dir = targetDummy.position - head.position;
            dir.y = 0;
            if (dir != Vector3.zero) 
                targetRot = Quaternion.LookRotation(dir);
            else 
                targetRot = head.rotation;
        }
        else
        {
            // 待機中の巡回（パトロール）
            float angle = Mathf.Sin(Time.time * 0.5f) * 30f;
            targetRot = Quaternion.Euler(0, 180 + angle, 0);
        }

        head.rotation = Quaternion.Slerp(head.rotation, targetRot, speed * Time.deltaTime);

        // 照準が合ったら発射
        if (isFiring && Quaternion.Angle(head.rotation, targetRot) < 5f)
        {
            PerformFireSequence(turret);
            isFiring = false;
        }
    }

    private void PerformFireSequence(GameObject turret)
    {
        // マズルフラッシュ生成、弾丸発射など
        // ... (戦闘ロジック) ...
    }
}
```

**ポイント:**
- 🎯 **DontDestroyOnLoad** - シーン遷移を跨いで生存。
- 🔀 **シングルトンパターン** - グローバルにただ一つのインスタンス。
- 📍 **依存性の注入** - 実行時にシーン参照を流し込む。
- 🎭 **二重バインディング** - 常駐型 (A) と通常型 (B) メソッド。

---

### 🔧 PersistentEventSceneSetup.cs (依存性注入スクリプト)
```csharp
using UnityEngine;

public class PersistentEventSceneSetup : MonoBehaviour
{
    [Header("Current Scene Objects")]
    public GameObject turretA;
    public Transform headA;
    public GameObject turretB;
    public Transform headB;
    public Transform targetDummy;
    public Rigidbody targetRigidbody;

    private void Start()
    {
        // 常駐している受信側を探す（DontDestroyOnLoad シーンに存在）
        var receiver = PersistentEventReceiver.Instance;
        
        if (receiver != null)
        {
            // このシーンのオブジェクト参照を注入
            receiver.UpdateSceneReferences(
                turretA, headA, 
                turretB, headB, 
                targetDummy, targetRigidbody
            );
            
            Debug.Log("[SceneSetup] 常駐受信側へのシーン参照注入に成功しました。");
        }
        else
        {
            Debug.LogWarning("[SceneSetup] PersistentEventReceiver が見つかりません！");
        }
    }
}
```

**ポイント:**
- 🔧 **シーンロード時に実行** - シーン初期化時に `Start()` が走ります。
- 🔍 **シングルトンを特定** - 静的インスタンス経由で受信側にアクセス。
- 💉 **参照の注入** - 新しいシーンのオブジェクトを常駐ロジックに渡します。
- 🏗️ **シーン跨ぎ制御の実現** - 常駐ロジックと一時的なシーンオブジェクトを橋渡しします。

---

## 🔑 重要なまとめ

| コンセプト                | 実装内容                                                     |
| -------------------------- | ------------------------------------------------------------ |
| 💾 **常駐イベント**         | Behavior Window のチェックボックス一つで、シーン跨ぎのバインディングを実現 |
| 🗑️ **クリーンアップ挙動**   | 通常イベントはシーンアンロード時に自動的にクリアされる       |
| 🔄 **DontDestroyOnLoad**    | 常駐イベントを機能させるには、受信側自体も生存させる必要がある |
| 💉 **依存性の注入**         | 常駐ロジックを新しいシーンオブジェクトに結びつけるための重要パターン |
| 🎯 **ワンクリック設定**      | エディタ上の設定一つで、シーン遷移の運命が決まる             |

:::note 🎓 設計の洞察

常駐イベントは、以下のような用途に最適です：

- **ミュージックシステム** - 複数のレベルを跨いで流れ続ける BGM コントローラー
- **インベントリマネージャー** - シーン遷移中も保持されるプレイヤーの持ち物
- **実績トラッカー** - すべてのシーンを監視するグローバルな実績リスナー
- **分析システム** - 中断されることのないイベントログの送信
- **UI システム** - 体力、スコアなどを表示し続ける常駐 HUD コントローラー

**推奨されるアーキテクチャパターン:**
```
[常駐レイヤー - DontDestroyOnLoad]
- グローバルマネージャー
- イベント受信側
- シーンを跨ぐロジック

[シーンレイヤー - 再生成される]
- レベル固有のオブジェクト
- シーンセットアップスクリプト（依存性注入）
- UI ボタンや発行側
```

この分離により、手動での再購読を必要としない、クリーンなシーン跨ぎアーキテクチャが可能になります。

:::

:::warning ⚠️ 重要な注意事項

1. **受信側も生存させる必要がある:** 「常駐イベント」にチェックを入れるのは、バインディング（繋がり）を維持するためです。受信側の GameObject 自体も `DontDestroyOnLoad` を使用して生存させる必要があります。
2. **シーン参照の断絶:** バインディングは維持されますが、破棄された前のシーンのオブジェクトへの参照は null になります。依存性注入を使用して、常に新しい参照に更新してください。
3. **メモリ管理:** 常駐イベントはゲーム終了までアクティブなままです。長時間プレイされるゲームでは、バインディングが際限なく蓄積されないよう注意してください。
4. **初期シーンの要件:** 常駐受信側は、最初にロードされるシーンに存在する必要があります。受信側がいない状態で次のシーンに進んでしまうと、常駐イベントは機能しません。

:::

---

## 🎯 次のステップは？

シーンを跨ぐシステムのための常駐イベントをマスターしました。次は、衝突判定に基づいたインタラクションのための**トリガーイベント**を見ていきましょう。

**次の章**: 衝突トリガーについて学ぶ **[10 トリガーイベント](./10-trigger-event.md)**

---

## 📚 関連ドキュメント

- **[ゲームイベントビヘイビア](../visual-workflow/game-event-behavior.md)** - 常駐設定の完全ガイド
- **[ベストプラクティス](../scripting/best-practices.md)** - シーンを跨ぐイベントアーキテクチャのパターン
```