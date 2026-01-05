---
sidebar_label: '13 ランタイム API'
sidebar_position: 14
---

import Tabs from '@theme/Tabs';

import TabItem from '@theme/TabItem';

import VideoGif from '@site/src/components/Video/VideoGif';



# 13 ランタイム API：コードファーストのワークフロー

<!-- <VideoGif src="/video/game-event-system/13-runtime-api.mp4" /> -->

## 📋 概要

これまでのデモ（01～11）では、インスペクターでのリスナー紐付け、Behavior ウィンドウでの条件設定、フローグラフの視覚的構築といった**ビジュアルワークフロー**を実演してきました。この手法はデザイナーや迅速なプロトタイピングに最適です。しかし、プログラマーは複雑なシステム、動的な挙動、あるいはビジュアルツールでは制限がある場合に、**コードによる完全な制御**を好むことがよくあります。

**デモ 13 では、重要な設計原則を証明します：** ビジュアルワークフローで紹介したすべての機能には、**完全で型安全な C# API** が用意されています。このデモでは、これまでの 11 のシナリオを再構築し、インスペクターのバインディングやグラフ設定をすべて削除して、ランタイムコードに置き換えます。

:::tip 💡 学べること
- プログラムによるリスナーの登録と削除 (`AddListener`, `RemoveListener`)
- 動的な優先度制御 (`AddPriorityListener`)
- ランタイムでの条件登録 (`AddConditionalListener`)
- スケジューリング API (`RaiseDelayed`, `RaiseRepeating`, `Cancel`)
- コードによるフローグラフの構築 (`AddTriggerEvent`, `AddChainEvent`)
- 常駐リスナーの管理 (`AddPersistentListener`)
- ライフサイクル管理 (`OnEnable`, `OnDisable`, クリーンアップパターン)

:::

---

## 🎬 デモの構造
```
📁 Assets/TinyGiants/GameEventSystem/Demo/13_RuntimeAPI/
│
├── 📁 01_VoidEvent             ➔ 🔘 [ コードベースの Void イベント紐付け ]
├── 📁 02_BasicTypesEvent       ➔ 🔢 [ ジェネリックイベントの登録 ]
├── 📁 03_CustomTypeEvent       ➔ 💎 [ カスタムクラスのバインディング ]
├── 📁 04_CustomSenderTypeEvent ➔ 👥 [ 二重ジェネリックリスナー ]
│
├── 📁 05_PriorityEvent         ➔ 🥇 [ コードによる優先度管理 ]
├── 📁 06_ConditionalEvent      ➔ 🛡️ [ 述語 (Predicate) ベースのフィルタリング ]
├── 📁 07_DelayedEvent          ➔ ⏱️ [ スケジューリングとキャンセル ]
├── 📁 08_RepeatingEvent        ➔ 🔄 [ ループ管理とコールバック ]
│
├── 📁 09_PersistentEvent       ➔ 🛡️ [ シーン跨ぎのリスナー生存 ]
├── 📁 10_TriggerEvent          ➔ 🕸️ [ コードによる並列グラフ構築 ]
└── 📁 11_ChainEvent            ➔ ⛓️ [ コードによる直列パイプライン構築 ]
```

**01～11 との決定的な違い：**
- **シーン設定：** 同一（タレット、ターゲット、UI ボタンは同じものを使用）
- **ビジュアル設定：** ❌ 削除（Behavior ウィンドウの設定やフローグラフは一切使用しません）
- **コード実装：** すべてのロジックを `OnEnable` / `OnDisable` およびライフサイクルメソッドに移行

---

## 🔄 ビジュアル vs コード：パラダイムシフト

| 機能 | ビジュアルワークフロー (01-11) | コードワークフロー (Demo 13) |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------ |
| **リスナーの紐付け** | Behavior ウィンドウでのドラッグ＆ドロップ | `OnEnable` 内での `event.AddListener(Method)` |
| **条件付きロジック** | インスペクターの条件ツリー | `event.AddConditionalListener(Method, Predicate)` |
| **実行優先度** | Behavior ウィンドウでの並べ替え | `event.AddPriorityListener(Method, priority)` |
| **遅延/リピート** | Behavior ウィンドウの遅延ノード | `event.RaiseDelayed(seconds)`, `event.RaiseRepeating(interval, count)` |
| **フローグラフ** | Flow Graph ウィンドウでの視覚的接続 | `event.AddTriggerEvent(target, ...)`, `event.AddChainEvent(target, ...)` |
| **クリーンアップ** | GameObject 破棄時に自動処理 | `OnEnable` / `OnDisable` での**手動処理** |

:::warning ⚠️ 重要なライフサイクルのルール

**手動で登録したものは、手動で解除する必要があります。** `OnEnable` で `AddListener` を呼び出した場合、必ず対応する `RemoveListener` を `OnDisable` で呼び出さなければなりません。クリーンアップを怠ると、以下の問題が発生します：

- メモリリーク
- リスナーの重複実行
- 破棄されたオブジェクト上でのリスナー実行 (NullReferenceException)

:::

---

## 📚 API シナリオ

### 01 Void Event：基本的な登録

**ビジュアル ➔ コードへの変換：**
- ❌ インスペクター：Behavior ウィンドウに `OnEventReceived` をドラッグ
- ✅ コード：`OnEnable` で `AddListener` を呼び出す

**RuntimeAPI_VoidEventRaiser.cs:**
```csharp
using TinyGiants.GameEventSystem.Runtime;

public class RuntimeAPI_VoidEventRaiser : MonoBehaviour
{
    [GameEventDropdown] 
    public GameEvent voidEvent;  // ← 引き続きアセット参照を使用

    public void RaiseBasicEvent()
    {
        if (voidEvent) voidEvent.Raise();  // ← ビジュアルワークフローと同じ呼び出し
    }
}
```

**RuntimeAPI_VoidEventReceiver.cs:**
```csharp
using TinyGiants.GameEventSystem.Runtime;

public class RuntimeAPI_VoidEventReceiver : MonoBehaviour
{
    [GameEventDropdown] 
    public GameEvent voidEvent;

    [SerializeField] private Rigidbody targetRigidbody;

    // ✅ 登録：有効化されたとき
    private void OnEnable()
    {
        voidEvent.AddListener(OnEventReceived);  // ← インスペクター設定の代わり
    }

    // ✅ 解除：無効化されたとき
    private void OnDisable()
    {
        voidEvent.RemoveListener(OnEventReceived);  // ← 解除は必須です
    }
    
    // リスナーメソッド（ビジュアルワークフローと同じ）
    public void OnEventReceived()
    {
        // 物理演算の適用...
        targetRigidbody.AddForce(Vector3.up * 5f, ForceMode.Impulse);
    }
}
```

**ポイント：**
- 🎯 **イベントアセット：** 引き続き `[GameEventDropdown]` で参照します。
- 🔗 **登録：** `OnEnable` で `AddListener(メソッド名)` を行います。
- 🧹 **クリーンアップ：** `OnDisable` で `RemoveListener(メソッド名)` を行います。
- ⚡ **シグネチャ：** メソッドはイベント型と一致する必要があります（`GameEvent` なら `void`）。

---

### 02 Basic Types：ジェネリックの登録

**実演内容：** ジェネリックイベントにおける型推論

**RuntimeAPI_BasicTypesEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<string> messageEvent;
[GameEventDropdown] public GameEvent<Vector3> movementEvent;
[GameEventDropdown] public GameEvent<GameObject> spawnEvent;
[GameEventDropdown] public GameEvent<Material> changeMaterialEvent;

public void RaiseString()
{
    messageEvent.Raise("Hello World");  // ← 型はイベントから推論されます
}

public void RaiseVector3()
{
    movementEvent.Raise(new Vector3(0, 2, 0));
}
```

**RuntimeAPI_BasicTypesEventReceiver.cs:**
```csharp
private void OnEnable()
{
    // コンパイラがメソッドのシグネチャから <string> や <Vector3> 等を推論します
    messageEvent.AddListener(OnMessageReceived);     // void(string)
    movementEvent.AddListener(OnMoveReceived);       // void(Vector3)
    spawnEvent.AddListener(OnSpawnReceived);         // void(GameObject)
    changeMaterialEvent.AddListener(OnMaterialReceived);  // void(Material)
}

private void OnDisable()
{
    messageEvent.RemoveListener(OnMessageReceived);
    movementEvent.RemoveListener(OnMoveReceived);
    spawnEvent.RemoveListener(OnSpawnReceived);
    changeMaterialEvent.RemoveListener(OnMaterialReceived);
}

public void OnMessageReceived(string msg) { /* ... */ }
public void OnMoveReceived(Vector3 pos) { /* ... */ }
public void OnSpawnReceived(GameObject prefab) { /* ... */ }
public void OnMaterialReceived(Material mat) { /* ... */ }
```

**ポイント：**
- ✅ **型安全性：** シグネチャが一致することをコンパイラが保証します。
- ✅ **自動推論：** 型を手動で指定する必要はありません。
- ⚠️ **不一致エラー：** `void(int)` メソッドを `GameEvent<string>` にバインドすることはできません。

---

### 03 Custom Type：複雑なデータの紐付け

**実演内容：** 自動生成されたジェネリッククラスの使用

**RuntimeAPI_CustomTypeEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<DamageInfo> physicalDamageEvent;
[GameEventDropdown] public GameEvent<DamageInfo> fireDamageEvent;
[GameEventDropdown] public GameEvent<DamageInfo> criticalStrikeEvent;

public void DealPhysicalDamage()
{
    DamageInfo info = new DamageInfo(10f, false, DamageType.Physical, hitPoint, "Player01");
    physicalDamageEvent.Raise(info);  // ← カスタムクラスを引数として渡す
}
```

**RuntimeAPI_CustomTypeEventReceiver.cs:**
```csharp
private void OnEnable()
{
    // 複数のイベントを同じハンドラにバインド
    physicalDamageEvent.AddListener(OnDamageReceived);
    fireDamageEvent.AddListener(OnDamageReceived);
    criticalStrikeEvent.AddListener(OnDamageReceived);
}

private void OnDisable()
{
    physicalDamageEvent.RemoveListener(OnDamageReceived);
    fireDamageEvent.RemoveListener(OnDamageReceived);
    criticalStrikeEvent.RemoveListener(OnDamageReceived);
}

public void OnDamageReceived(DamageInfo info)
{
    // カスタムクラスのフィールドを解析
    float damage = info.amount;
    DamageType type = info.type;
    bool isCrit = info.isCritical;
    
    // データに基づいたロジックの適用...
}
```

**ポイント：**
- 📦 **自動生成：** `GameEvent<DamageInfo>` クラスはプラグインによって自動生成されています。
- 🔗 **複数バインド：** 単一のメソッドで複数のイベントをリッスンできます。
- ⚡ **データアクセス：** カスタムクラスのプロパティにフルアクセス可能です。

---

### 04 Custom Sender：二重ジェネリックリスナー

**実演内容：** イベント発生元のコンテキストへのアクセス

**RuntimeAPI_CustomSenderTypeEventRaiser.cs:**
```csharp
// 物理的送信元: GameObject
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> turretEvent;

// 論理的送信元: カスタムクラス
[GameEventDropdown] public GameEvent<PlayerStats, DamageInfo> systemEvent;

public void RaiseTurretDamage()
{
    DamageInfo info = new DamageInfo(15f, false, DamageType.Physical, hitPoint, "Turret");
    turretEvent.Raise(this.gameObject, info);  // ← 送信元を第1引数として渡す
}

public void RaiseSystemDamage()
{
    PlayerStats admin = new PlayerStats("DragonSlayer_99", 99, 1);
    DamageInfo info = new DamageInfo(50f, true, DamageType.Void, hitPoint, "Admin");
    systemEvent.Raise(admin, info);  // ← カスタムクラスを送信元として渡す
}
```

**RuntimeAPI_CustomSenderTypeEventReceiver.cs:**
```csharp
private void OnEnable()
{
    turretEvent.AddListener(OnTurretAttackReceived);      // (GameObject, DamageInfo)
    systemEvent.AddListener(OnSystemAttackReceived);      // (PlayerStats, DamageInfo)
}

private void OnDisable()
{
    turretEvent.RemoveListener(OnTurretAttackReceived);
    systemEvent.RemoveListener(OnSystemAttackReceived);
}

// シグネチャ: void(GameObject, DamageInfo)
public void OnTurretAttackReceived(GameObject sender, DamageInfo args)
{
    Vector3 attackerPos = sender.transform.position;  // ← 送信元の GameObject にアクセス
    // 物理的な攻撃者への反応...
}

// シグネチャ: void(PlayerStats, DamageInfo)
public void OnSystemAttackReceived(PlayerStats sender, DamageInfo args)
{
    string attackerName = sender.playerName;  // ← 送信元のデータにアクセス
    int factionId = sender.factionId;
    // 論理的な攻撃者への反応...
}
```

**ポイント：**
- 🎯 **コンテキスト認識：** リスナーは「誰が」イベントをトリガーしたかを知ることができます。
- 🔀 **柔軟な送信元：** GameObject または任意のカスタムクラスを使用可能です。
- ⚡ **シグネチャの一致：** メソッド引数はイベントのジェネリック型と厳密に一致する必要があります。

---

### 05 Priority：実行順序の制御

**ビジュアル ➔ コードへの変換：**
- ❌ インスペクター：Behavior ウィンドウでリスナーをドラッグして並べ替え
- ✅ コード：`priority` パラメータを指定（数値が大きいほど早い）

**RuntimeAPI_PriorityEventReceiver.cs:**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> orderedHitEvent;
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> chaoticHitEvent;

private void OnEnable()
{
    // ✅ 秩序ある(ORDERED)実行：高い優先度が先に実行される
    orderedHitEvent.AddPriorityListener(ActivateBuff, priority: 100);  // 1番目
    orderedHitEvent.AddPriorityListener(ResolveHit, priority: 50);     // 2番目
    
    // ❌ 混沌とした(CHAOTIC)実行：あえて間違った順序に設定
    chaoticHitEvent.AddPriorityListener(ResolveHit, priority: 80);     // 1番目（早すぎる！）
    chaoticHitEvent.AddPriorityListener(ActivateBuff, priority: 40);   // 2番目（遅すぎる！）
}

private void OnDisable()
{
    // 優先度付きリスナーは専用の解除メソッドが必要です
    orderedHitEvent.RemovePriorityListener(ActivateBuff);
    orderedHitEvent.RemovePriorityListener(ResolveHit);
    
    chaoticHitEvent.RemovePriorityListener(ResolveHit);
    chaoticHitEvent.RemovePriorityListener(ActivateBuff);
}

public void ActivateBuff(GameObject sender, DamageInfo args)
{
    _isBuffActive = true;  // ← ResolveHit の前に実行される必要がある
}

public void ResolveHit(GameObject sender, DamageInfo args)
{
    float damage = _isBuffActive ? args.amount * 5f : args.amount;  // ← バフ状態をチェック
}
```

**ポイント：**
- 🔢 **優先度値：** 数値が大きいほど、早く実行されます。
- ⚠️ **順序の重要性：** `ActivateBuff(100) → ResolveHit(50)` ならクリティカルヒットになります。
- ❌ **誤った順序：** `ResolveHit(80) → ActivateBuff(40)` だと通常ヒットになります。
- 🧹 **クリーンアップ：** `RemovePriorityListener` を使用します（`RemoveListener` ではありません）。

---

### 06 Conditional：述語ベースのフィルタリング

**ビジュアル ➔ コードへの変換：**
- ❌ インスペクター：Behavior ウィンドウのビジュアル条件ツリー
- ✅ コード：`AddConditionalListener` に判定用関数を渡す

**RuntimeAPI_ConditionalEventReceiver.cs:**
```csharp
[GameEventDropdown] public GameEvent<AccessCard> requestAccessEvent;

private void OnEnable()
{
    // 判定用関数（Predicate）と共に登録
    // OpenVault は CanOpen が true を返したときのみ呼び出される
    requestAccessEvent.AddConditionalListener(OpenVault, CanOpen);
}

private void OnDisable()
{
    requestAccessEvent.RemoveConditionalListener(OpenVault);
}

// ✅ 判定用関数 (Predicate)
// ビジュアル条件ツリーの代わりとなるロジック
public bool CanOpen(AccessCard card)
{
    return securityGrid.IsPowerOn && (
        card.securityLevel >= 4 || 
        departments.Contains(card.department) ||
        (card.securityLevel >= 1 && Random.Range(0, 100) > 70)
    );
}

// ✅ アクション（条件をパスしたときのみ実行）
public void OpenVault(AccessCard card)
{
    // すべての条件を満たしていると仮定して処理
    Debug.Log($"アクセス許可：{card.holderName}");
    StartCoroutine(OpenDoorSequence());
}
```

**ポイント：**
- ✅ **述語関数 (Predicate)：** `bool` を返し、イベント引数を受け取る関数です。
- 🔒 **ゲートキーパー：** 述語が `true` を返したときのみアクションが実行されます。
- 🧹 **クリーンアップ：** `RemoveConditionalListener` を使用します。
- ⚡ **評価タイミング：** 述語はアクションメソッドが呼ばれる「前」に評価されます。

---

### 07 Delayed：スケジューリングとキャンセル

**ビジュアル ➔ コードへの変換：**
- ❌ Behavior：インスペクターで "Action Delay = 5.0s" を設定
- ✅ コード：`event.RaiseDelayed(5f)` を呼び出し、`ScheduleHandle` を受け取る

**RuntimeAPI_DelayedEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent explodeEvent;

private ScheduleHandle _handle;  // ← スケジュールされたタスクを追跡

public void ArmBomb()
{
    // 5秒後にイベントをスケジュール
    _handle = explodeEvent.RaiseDelayed(5f);  // ← ハンドルを返す
    
    Debug.Log("爆弾がセットされました！解除まで残り5秒...");
}

public void CutRedWire() => ProcessCut("Red");
public void CutGreenWire() => ProcessCut("Green");

private void ProcessCut(string color)
{
    if (color == _safeWireColor)
    {
        // 予約された爆発をキャンセル
        explodeEvent.CancelDelayed(_handle);  // ← ハンドルを使用して取り消す
        Debug.Log("解除成功！イベントをキャンセルしました。");
    }
    else
    {
        Debug.LogWarning("ワイヤーが違います！カウントダウン継続中...");
    }
}
```

**ポイント：**
- ⏱️ **スケジューリング：** `RaiseDelayed(seconds)` でイベントをキューに追加します。
- 📍 **ハンドル：** 後でキャンセルするために戻り値を保存しておきます。
- 🛑 **キャンセル：** `CancelDelayed(handle)` でキューから削除します。
- ⚠️ **タイミング：** キャンセルされない限り、指定時間後に実行されます。

---

### 08 Repeating：ループ管理とコールバック

**ビジュアル ➔ コードへの変換：**
- ❌ Behavior：インスペクターで "Repeat Interval = 1.0s, Repeat Count = 5" を設定
- ✅ コード：`event.RaiseRepeating(interval, count)` を呼び出し、コールバックを利用

**RuntimeAPI_RepeatingEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent finitePulseEvent;

private ScheduleHandle _handle;

public void ActivateBeacon()
{
    // 1秒間隔で5回繰り返すループを開始
    _handle = finitePulseEvent.RaiseRepeating(interval: 1.0f, count: 5);
    
    // ✅ フック：各イテレーション（繰り返し）ごとに実行
    _handle.OnStep += (currentCount) => 
    {
        Debug.Log($"パルス #{currentCount} を送信");
    };
    
    // ✅ フック：ループが自然に終了したときに実行
    _handle.OnCompleted += () => 
    {
        Debug.Log("ビーコンのシーケンスが完了しました");
        UpdateUI("IDLE");
    };
    
    // ✅ フック：手動でキャンセルされたときに実行
    _handle.OnCancelled += () => 
    {
        Debug.Log("ビーコンが中断されました");
        UpdateUI("ABORTED");
    };
}

public void StopSignal()
{
    if (_handle != null)
    {
        finitePulseEvent.CancelRepeating(_handle);  // ← ループを停止
    }
}
```

**ポイント：**
- 🔁 **有限ループ：** `RaiseRepeating(1.0f, 5)` で1秒間隔・5回のパルス。
- ∞ **無限ループ：** `RaiseRepeating(1.0f, -1)` でキャンセルされるまで継続。
- 📡 **コールバック：** `OnStep`, `OnCompleted`, `OnCancelled` イベントが利用可能。
- 🛑 **手動停止：** 無限ループなどは `CancelRepeating(handle)` で停止させます。

---

### 09 Persistent：シーン跨ぎのリスナー生存

**ビジュアル ➔ コードへの変換：**
- ❌ インスペクター：Behavior ウィンドウの "Persistent Event" にチェック
- ✅ コード：`Awake` で `AddPersistentListener` を呼び出し + `DontDestroyOnLoad`

**RuntimeAPI_PersistentEventReceiver.cs:**
```csharp
[GameEventDropdown] public GameEvent fireAEvent;  // 常駐設定
[GameEventDropdown] public GameEvent fireBEvent;  // 標準設定

private void Awake()
{
    DontDestroyOnLoad(gameObject);  // ← シーンロードを跨いで生存
    
    // ✅ 常駐リスナー (シーンのリロードを跨いで生存)
    fireAEvent.AddPersistentListener(OnFireCommandA);
}

private void OnDestroy()
{
    // 常駐リスナーは手動で解除する必要があります
    fireAEvent.RemovePersistentListener(OnFireCommandA);
}

private void OnEnable()
{
    // ❌ 標準リスナー (シーンと共に消滅)
    fireBEvent.AddListener(OnFireCommandB);
}

private void OnDisable()
{
    fireBEvent.RemoveListener(OnFireCommandB);
}

public void OnFireCommandA() 
{ 
    Debug.Log("常駐リスナーはシーンリロード後も生存しています"); 
}

public void OnFireCommandB() 
{ 
    Debug.Log("標準リスナー（リロード後は動作しません）"); 
}
```

**ポイント：**
- 🧬 **シングルトンパターン：** `DontDestroyOnLoad` と常駐リスナーの組み合わせ。
- ✅ **リロード対応：** `AddPersistentListener` はグローバルな登録簿にバインドされます。
- ❌ **標準型は消滅：** `AddListener` によるバインドはシーンと共に破棄されます。
- 🧹 **クリーンアップ：** 常駐型は `OnDestroy`、標準型は `OnDisable` で解除します。

---

### 10 Trigger Event：コードによる並列グラフ構築

**ビジュアル ➔ コードへの変換：**
- ❌ フローグラフ：視覚的なノードと接続
- ✅ コード：`OnEnable` で `AddTriggerEvent(target, ...)` を呼び出す

**RuntimeAPI_TriggerEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onCommand;      // ルート
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onActiveBuff;   // ブランチ A
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onTurretFire;   // ブランチ B
[GameEventDropdown] public GameEvent<DamageInfo> onHoloData;                 // ブランチ C (型変換あり)
[GameEventDropdown] public GameEvent onGlobalAlarm;                          // ブランチ D (void)

private TriggerHandle _buffAHandle;
private TriggerHandle _fireAHandle;
private TriggerHandle _holoHandle;
private TriggerHandle _alarmHandle;

private void OnEnable()
{
    // ✅ コードによる並列グラフの構築
    
    // ブランチ A: バフ (優先度 100, 条件付き)
    _buffAHandle = onCommand.AddTriggerEvent(
        targetEvent: onActiveBuff,
        delay: 0f,
        condition: (sender, args) => sender == turretA,  // ← Turret A のみ対象
        passArgument: true,
        priority: 100  // ← 高優先度
    );
    
    // ブランチ B: 発射 (優先度 50, 条件付き)
    _fireAHandle = onCommand.AddTriggerEvent(
        targetEvent: onTurretFire,
        delay: 0f,
        condition: (sender, args) => sender == turretA,
        passArgument: true,
        priority: 50  // ← 低優先度（バフの後に実行）
    );
    
    // ブランチ C: ホロデータ (型変換、遅延あり)
    _holoHandle = onCommand.AddTriggerEvent(
        targetEvent: onHoloData,  // ← GameEvent<DamageInfo> (送信元なし)
        delay: 1f,  // ← 1秒の遅延
        passArgument: true
    );
    
    // ブランチ D: グローバルアラーム (Void への変換)
    _alarmHandle = onCommand.AddTriggerEvent(
        targetEvent: onGlobalAlarm  // ← GameEvent (引数なし)
    );
    
    // ✅ フック：トリガーが発火したときのコールバック
    _buffAHandle.OnTriggered += () => Debug.Log("コードグラフ経由でバフがトリガーされました");
}

private void OnDisable()
{
    // ✅ 解除：動的トリガーには必須です
    onCommand.RemoveTriggerEvent(_buffAHandle);
    onCommand.RemoveTriggerEvent(_fireAHandle);
    onCommand.RemoveTriggerEvent(_holoHandle);
    onCommand.RemoveTriggerEvent(_alarmHandle);
}
```

**グラフの視覚化（コード定義）：**
```
📡 ルート: onCommand.Raise(sender, info)
│
├─ 🔱 [ ブランチ: ユニット A ] ➔ 🛡️ ガード: `Sender == Turret_A`
│  ├─ 💎 [Prio: 100] ➔ 🛡️ onActiveBuff()      ✅ 高優先度の同期処理
│  └─ ⚡ [Prio: 50 ] ➔ 🔥 onTurretFire()      ✅ 順次実行アクション
│
├─ 🔱 [ ブランチ: 分析用 ] ➔ 🔢 シグネチャ: `<DamageInfo>`
│  └─ ⏱️ [ Delay: 1.0s ] ➔ 📽️ onHoloData()    ✅ 遅延データ中継
│
└─ 🔱 [ ブランチ: グローバル ] ➔ 🔘 シグネチャ: `<void>`
   └─ 🚀 [ 即時 ] ➔ 🚨 onGlobalAlarm()         ✅ 即時シグナル
```

**ポイント：**
- 🌳 **並列実行：** すべてのブランチが同時に評価されます。
- 🔢 **優先度：** 通過したブランチ内での実行順序を制御します。
- ✅ **条件：** 判定用関数（Predicate）で送信元や引数をフィルタリングします。
- 🔄 **型変換：** 引数をノードに合わせて自動的に適応させます。
- 📡 **コールバック：** ハンドルごとに `OnTriggered` イベントが利用可能です。
- 🧹 **クリーンアップ：** `RemoveTriggerEvent(handle)` が**必須**です。

---

### 11 Chain Event：コードによる直列パイプライン構築

**ビジュアル ➔ コードへの変換：**
- ❌ フローグラフ：直線的なノードシーケンス
- ✅ コード：`OnEnable` で `AddChainEvent(target, ...)` を呼び出す

**RuntimeAPI_ChainEventRaiser.cs:**
```csharp
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnStartSequenceEvent;  // ルート
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnSystemCheckEvent;    // Step 1
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnChargeEvent;         // Step 2
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnFireEvent;           // Step 3
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnCoolDownEvent;       // Step 4
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> OnArchiveEvent;        // Step 5

private ChainHandle _checkHandle;
private ChainHandle _chargeHandle;
private ChainHandle _fireHandle;
private ChainHandle _cooldownHandle;
private ChainHandle _archiveHandle;

private void OnEnable()
{
    // ✅ コードによる直列チェーンの構築
    
    // Step 1: システムチェック (条件付きゲート)
    _checkHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnSystemCheckEvent,
        delay: 0f,
        duration: 0f,
        condition: (sender, args) => chainEventReceiver.IsSafetyCheckPassed,  // ← ゲート
        passArgument: true,
        waitForCompletion: false
    );
    
    // Step 2: チャージ (1秒間の継続時間)
    _chargeHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnChargeEvent,
        delay: 0f,
        duration: 1f,  // ← チェーンはここで1秒間一時停止する
        passArgument: true
    );
    
    // Step 3: 発射 (即時)
    _fireHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnFireEvent,
        passArgument: true
    );
    
    // Step 4: クールダウン (0.5s遅延 + 1s継続 + 完了まで待機)
    _cooldownHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnCoolDownEvent,
        delay: 0.5f,  // ← 実行前の遅延
        duration: 1f,  // ← アクション後の継続時間
        passArgument: true,
        waitForCompletion: true  // ← リスナーのコルーチン終了を待機
    );
    
    // Step 5: アーカイブ (引数をブロック)
    _archiveHandle = OnStartSequenceEvent.AddChainEvent(
        targetEvent: OnArchiveEvent,
        passArgument: false  // ← 下流には null/デフォルト値が渡される
    );
}

private void OnDisable()
{
    // ✅ 解除：動的チェーンには必須です
    OnStartSequenceEvent.RemoveChainEvent(_checkHandle);
    OnStartSequenceEvent.RemoveChainEvent(_chargeHandle);
    OnStartSequenceEvent.RemoveChainEvent(_fireHandle);
    OnStartSequenceEvent.RemoveChainEvent(_cooldownHandle);
    OnStartSequenceEvent.RemoveChainEvent(_archiveHandle);
    
    // または一括削除: OnStartSequenceEvent.RemoveAllChainEvents();
}
```

**パイプラインの視覚化（コード定義）：**
```
🚀 [ ルート ] OnStartSequenceEvent
│
├─ 🛡️ [ ガード ] ➔ 安全チェック
│  └─► ⚙️ OnSystemCheckEvent             ✅ 条件通過
│
├─ ⏱️ [ 床時間 ] ➔ 継続時間: 1.0s
│  └─► ⚡ OnChargeEvent                  ✅ 最小ペースを維持
│
├─ 🚀 [ 即時 ] ➔ 即時トリガー
│  └─► 🔥 OnFireEvent                    ✅ 実行済み
│
├─ ⌛ [ 非同期 ] ➔ 遅延: 0.5s | 継続: 1.0s | 待機: ON
│  └─► ❄️ OnCoolDownEvent                ✅ 非同期リカバリ完了
│
└─ 🧹 [ フィルタ ] ➔ 引数をブロック
   └─► 💾 OnArchiveEvent                 ✅ データを消去して保存
```

**ポイント：**
- 🔗 **直列実行：** ステップは並列ではなく、一つずつ実行されます。
- ✅ **条件ゲート：** 条件に失敗するとチェーン全体がそこで終了します。
- ⏱️ **継続時間 (Duration)：** 指定された時間だけチェーンを一時停止させます。
- 🕐 **完了まで待機：** 受信側のコルーチンが終わるまでブロックします。
- 🔒 **引数のブロッキング：** `passArgument: false` でデフォルト値を送信します。
- 🧹 **クリーンアップ：** `RemoveChainEvent(handle)` または `RemoveAllChainEvents()` が**必須**です。

---

## 🔑 API リファレンス・サマリー

### リスナーの登録

| メソッド | ユースケース | 解除メソッド |
| ------------------------------------------- | ------------------------- | ----------------------------------- |
| `AddListener(method)` | 標準的な紐付け | `RemoveListener(method)` |
| `AddPriorityListener(method, priority)` | 実行順序の制御 | `RemovePriorityListener(method)` |
| `AddConditionalListener(method, predicate)` | 判定用関数によるフィルタリング | `RemoveConditionalListener(method)` |
| `AddPersistentListener(method)` | シーンを跨ぐ生存 | `RemovePersistentListener(method)` |

### イベントの発行

| メソッド | ユースケース | 戻り値 |
| --------------------------------- | -------------------- | ---------------- |
| `Raise()` | 即時実行 | `void` |
| `Raise(arg)` | 単一引数を伴う実行 | `void` |
| `Raise(sender, arg)` | 送信元コンテキストを伴う実行 | `void` |
| `RaiseDelayed(seconds)` | スケジュール実行 | `ScheduleHandle` |
| `RaiseRepeating(interval, count)` | ループ実行 | `ScheduleHandle` |

### スケジュールの管理

| メソッド | ユースケース |
| ------------------------- | -------------------------- |
| `CancelDelayed(handle)` | 保留中の遅延イベントを停止 |
| `CancelRepeating(handle)` | 動作中のループを停止 |
| `handle.OnStep` | ループの各ステップ時のコールバック |
| `handle.OnCompleted` | ループ完了時のコールバック |
| `handle.OnCancelled` | キャンセル時のコールバック |

### フローグラフの構築

| メソッド | ユースケース | 戻り値 |
| ------------------------------ | --------------- | --------------- |
| `AddTriggerEvent(target, ...)` | 並列ブランチの追加 | `TriggerHandle` |
| `RemoveTriggerEvent(handle)` | ブランチの削除 | `void` |
| `AddChainEvent(target, ...)` | 直列ステップの追加 | `ChainHandle` |
| `RemoveChainEvent(handle)` | ステップの削除 | `void` |
| `RemoveAllChainEvents()` | 全ステップの一括削除 | `void` |

---

## ⚠️ 重要なベストプラクティス

### ✅ 推奨される書き方
```csharp
private void OnEnable()
{
    myEvent.AddListener(OnReceived);  // ← 登録
}

private void OnDisable()
{
    myEvent.RemoveListener(OnReceived);  // ← 必ず解除する
}
```

### ❌ 避けるべき書き方
```csharp
private void Start()
{
    myEvent.AddListener(OnReceived);  // ← Start で登録して...
}
// ❌ OnDisable での解除がない ➔ メモリリークの原因になります
```

### ハンドルの管理
```csharp
private ScheduleHandle _handle;

public void StartLoop()
{
    _handle = myEvent.RaiseRepeating(1f, -1);
}

public void StopLoop()
{
    if (_handle != null) myEvent.CancelRepeating(_handle);  // ← 保存したハンドルを使用
}
```

### ライフサイクルパターン

| ライフサイクルメソッド | 用途 |
| ---------------- | ------------------------------------------ |
| `Awake` | 常駐リスナー + `DontDestroyOnLoad` |
| `OnEnable` | 標準リスナー、トリガー、チェーンの登録 |
| `OnDisable` | 標準リスナー等の解除 |
| `OnDestroy` | 常駐リスナーの解除 |

---

## 🎯 コード vs ビジュアル：どちらを選ぶべきか

### ビジュアルワークフローを選ぶべき時：
- ✅ デザイナーが直接制御する必要がある
- ✅ 迅速なイテレーションが優先される
- ✅ ロジックが比較的静的である
- ✅ ビジュアルデバッグが有用である
- ✅ 職種を跨いだチーム開発を行う

### コードワークフローを選ぶべき時：
- ✅ ロジックが極めて動的である（実行時にグラフを構築する等）
- ✅ 条件判定に複雑な C# コードが必要
- ✅ 既存のコードベースのシステムと統合したい
- ✅ 高度なスケジューリングパターンが必要
- ✅ プログラムによるリスナー管理を行いたい
- ✅ ロジックのバージョン管理を厳密に行いたい（.asset よりコードの差分の方が明確）

### ハイブリッドアプローチ：

- 🎨 **ビジュアル：** イベント定義、シンプルな紐付け
- 💻 **コード：** 複雑な条件、動的なグラフ、ランタイムスケジューリング
- **例：** イベント定義は視覚的に行い、プロシージャル（手続き型）システムのために Trigger/Chain グラフをコードで構築する。

---

## 📚 関連ドキュメント

- **[イベントの発行と予約](../scripting/raising-and-scheduling.md)** - スケジューリング API の完全ガイド
- **[リスニング戦略](../scripting/listening-strategies.md)** - リスナーのパターンとベストプラクティス
- **[プログラムによるフロー制御](../scripting/programmatic-flow.md)** - コードによる Trigger/Chain グラフの構築
- **[ベストプラクティス](../scripting/best-practices.md)** - 推奨されるパターンとアンチパターン
- **[API リファレンス](../scripting/api-reference.md)** - すべてのメソッドシグネチャ