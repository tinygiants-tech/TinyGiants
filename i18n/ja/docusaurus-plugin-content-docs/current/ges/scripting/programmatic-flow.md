---
sidebar_label: 'プログラマティックフロー'
sidebar_position: 3
---

# プログラムによる実行フロー

**ビジュアルフローグラフ**は静的な設計時ロジックに優れていますが、ゲーム開発では**実行時に動的に**イベントの関係を構築する必要があることがよくあります。

**Programmatic Flow API**を使用すると、トリガー(ファンアウト)とチェーン(シーケンス)を完全にC#コードで構築できます。これは以下の場合に不可欠です:

*   **プロシージャル生成:** 実行時に生成されたオブジェクトのイベントを配線。
*   **動的クエスト:** プレイヤーの選択に基づいてロジックステップを作成。
*   **一時的なステータスエフェクト:** 期限切れになるダメージティックやバフをチェーン。

---

## ⚡ コアコンセプト: トリガー vs チェーン

コーディングの前に、内部マネージャー(`GameEventTriggerManager`と`GameEventChainManager`)が処理する2つのフロータイプの違いを理解することが重要です。

| 機能              | ⚡ トリガー(ファンアウト)                   | 🔗 チェーン(シーケンス)                            |
| :------------------- | :------------------------------------- | :--------------------------------------------- |
| **実行モード**   | **並列**(Fire-and-Forget)         | **順次**(ブロッキング)                      |
| **失敗処理** | 独立(Aが失敗してもBは実行される) | 厳格(Aが失敗するとチェーンが停止)           |
| **タイミング**           | 同期(`delay`が使用されない限り)   | コルーチンベース(`wait`と`duration`をサポート) |
| **順序**         | **優先度**でソート                 | **追加順**で実行              |
| **使用例**         | VFX、実績、UI更新          | カットシーン、チュートリアル、ターンロジック               |

---

## 1. トリガー(並列実行)

`AddTriggerEvent`を使用して、あるイベントが自動的に他のイベントを発火するようにします。すべての登録されたトリガーは、ソースイベントが発火されたときに即座に(または個別の遅延後に)実行されます。

### 基本的な使用法

`onPlayerDeath`が発火すると、自動的に`onPlayDeathSound`と`onShowGameOverUI`を発火します。
```csharp
[GameEventDropdown] public GameEvent onPlayerDeath;
[GameEventDropdown] public GameEvent onPlayDeathSound;
[GameEventDropdown] public GameEvent onShowGameOverUI;

void Awake()
{
    // これらは事実上同時に発生
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound);
    onPlayerDeath.AddTriggerEvent(onShowGameOverUI);
}
```

### 高度な構成(優先度と条件)

イベント自体を変更せずに、接続にロジックを注入できます。
```csharp
// 1. 高優先度: 最初にヒール
onPotionUsed.AddTriggerEvent(
    targetEvent: onRegenHealth,
    priority: 100 // 高い数値が最初に実行される
);

// 2. 低優先度: ロジック開始後にサウンドを再生
onPotionUsed.AddTriggerEvent(
    targetEvent: onPlaySound,
    delay: 0.2f, // オプションの遅延
    priority: 10
);

// 3. 条件付き: グラフィック設定が許可する場合のみパーティクルをトリガー
onPotionUsed.AddTriggerEvent(
    targetEvent: onParticleEffect,
    condition: () => GameSettings.EnableParticles
);
```

:::info 自動引数渡し
デフォルト(passArgument: true)では、トリガーはソースからターゲットへデータを渡そうとします。型が一致する場合(例: intからint)、自動的に流れます。型が一致しない場合は、**Transformer**が必要です(以下を参照)。
:::

------

## 2. チェーン(順次実行)

`AddChainEvent`を使用して、単一のイベントに厳密に順序付けられた実行リストを構築します。

### シーケンスロジック(キュー)

**同じソースイベント**に複数のチェーンノードを追加すると、それらは**キュー**を形成します。システムは一つずつ実行し、次のノードを開始する前に前のノードの`duration`が終了するのを待ちます。

これにより、ソースイベントによって完全に管理される複雑なタイムライン(A → 待機 → B → 待機 → C)をオーケストレートでき、BをCに直接リンクする必要はありません。
```csharp
[GameEventDropdown] public GameEvent onTurnStart;
[GameEventDropdown] public GameEvent onDrawCard;
[GameEventDropdown] public GameEvent onRefreshMana;

void Awake()
{
    // --- 「ターン開始」タイムライン ---
    
    // ステップ1: カードを引く
    // 'duration'を設定することは: 「これを実行し、リストの次のアイテムを処理する前に0.5秒待つ」ことを意味します。
    onTurnStart.AddChainEvent(onDrawCard, duration: 0.5f);
    
    // ステップ2: マナをリフレッシュ
    // これはステップ1が終了した後(そして0.5秒のdurationが経過した後)に自動的に実行されます。
    onTurnStart.AddChainEvent(onRefreshMana);
    
    // 注意: 両方を'onTurnStart'にアタッチします。
    // ステップ2を'onDrawCard'にアタッチしません。なぜなら、
    // スペルからカードを引くことで誤ってマナリフレッシュをトリガーしたくないからです。
}
```

### 非同期待機(waitForCompletion)

イベントリスナーがコルーチンまたは非同期タスクを起動する場合、チェーンにそれらを待機させることができます。
```csharp
// チェーンはここで一時停止し、'onPlayCutscene'のすべてのリスナーが
// 作業を終了するまで待機します(yield return null)。
onLevelEnd.AddChainEvent(onPlayCutscene, waitForCompletion: true);

// これはカットシーンが完全に処理された後にのみ実行されます
onLevelEnd.AddChainEvent(onLoadNextLevel);
```

:::warning チェーン中断
条件がfalseを返すか、チェーンノードで例外が発生した場合、**その後のチェーン全体が停止します**。これは条件ロジックに便利です(例: 「敵がブロックした場合、コンボ攻撃を停止」)。
:::

------

## 🔄 データフロー&トランスフォーマー

Programmatic Flowの最も強力な機能は**引数変換**です。これにより、互換性のない型のイベントをブリッジしたり、複雑なオブジェクトから特定のデータを抽出したりできます。

### 1. 複雑からVoid(フィルター)

特定のデータのみに基づいて汎用イベントをトリガー。
```csharp
// ソース: ダメージイベント(float amount)
// ターゲット: クリティカルヒットイベント(Void)
onDamageTaken.AddTriggerEvent(
    targetEvent: onCriticalHitEffect,
    condition: (amount) => amount > 50f, // ダメージが50を超える場合のみ
    passArgument: false // ターゲットはvoid、floatを渡さない
);
```

### 2. シンプルな変換(型キャスト)

複雑なオブジェクトイベントをシンプルなプリミティブイベントにマップ。

- **ソース:** `EnemyGameEvent (OnEnemyKilled)`
- **ターゲット:** `public Int32GameEvent (OnAddXP)`
```csharp
[GameEventDropdown] public EnemyGameEvent onEnemyKilled;
[GameEventDropdown] public Int32GameEvent onAddXP;

void Awake()
{
    // Enemyオブジェクトから'xpValue'を抽出し、intイベントに渡す
    onEnemyKilled.AddTriggerEvent(
        targetEvent: onAddXP,
        passArgument: true,
        argumentTransformer: (enemy) => enemy.xpValue 
    );
}
```

### 3. Sender&引数変換

`GameEvent<TSender, TArgs>`の場合、トランスフォーマーは両方のパラメータを受け取ります。
```csharp
// ソース: プレイヤーがアイテムをピックアップ(Sender: Player、Args: ItemData)
// ターゲット: 通知(string)
onItemPickup.AddTriggerEvent(
    targetEvent: onShowNotification,
    passArgument: true,
    argumentTransformer: (player, item) => $"{player.Name}が{item.Rarity}アイテムを見つけました!"
);
```

------

## 🧹 ライフサイクル管理

標準のリスナー(AddListener)とは異なり、動的トリガーとチェーンは**ハンドル**を返します。特にオブジェクトプーリング時に、メモリリークや不要なロジックの永続化を防ぐために、これらのハンドルを管理する必要があります。

### ハンドルの使用
```csharp
private TriggerHandle _triggerHandle;

void OnEnable()
{
    // ハンドルを保存
    _triggerHandle = onDoorOpen.AddTriggerEvent(onLightOn);
}

void OnDisable()
{
    // ハンドルを使用してこの特定のリンクのみを削除
    if (_triggerHandle != null)
    {
        onDoorOpen.RemoveTriggerEvent(_triggerHandle);
        _triggerHandle = null;
    }
}
```

### 一括クリーンアップ

オブジェクトが破棄されるか、プールに返される場合、イベントに関連するすべての動的ロジックを一掃できます。
```csharp
void OnDestroy()
{
    // このイベントをターゲットとするすべての動的トリガーを削除
    myEvent.RemoveAllTriggerEvents();
    
    // このイベントをターゲットとするすべての動的チェーンを削除
    myEvent.RemoveAllChainEvents();
}
```

## 📜 APIサマリー

| メソッドシグネチャ                                             | 戻り値         | 説明                          |
| ------------------------------------------------------------ | --------------- | ------------------------------------ |
| **トリガー登録**                                     |                 | *並列 / Fire-and-Forget*         |
| `AddTriggerEvent(GameEventBase target, float delay, Func<bool> condition, int priority)` | `TriggerHandle` | Voidイベントにトリガーを追加。      |
| `AddTriggerEvent(GameEventBase target, float delay, Func<T, bool> condition, bool passArg, Func<T, object> transformer, int priority)` | `TriggerHandle` | 型付きイベントにトリガーを追加。     |
| `AddTriggerEvent(GameEventBase target, float delay, Func<TSender, TArgs, bool> condition, bool passArg, Func<TSender, TArgs, object> transformer, int priority)` | `TriggerHandle` | Senderイベントにトリガーを追加。    |
| **チェーン登録**                                       |                 | *順次 / ブロッキング*              |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<bool> condition, bool wait)` | `ChainHandle`   | Voidイベントにチェーンステップを追加。   |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<T, bool> condition, bool passArg, Func<T, object> transformer, bool wait)` | `ChainHandle`   | 型付きイベントにチェーンステップを追加。  |
| `AddChainEvent(GameEventBase target, float delay, float duration, Func<TSender, TArgs, bool> condition, bool passArg, Func<TSender, TArgs, object> transformer, bool wait)` | `ChainHandle`   | Senderイベントにチェーンステップを追加。 |
| **クリーンアップ**                                                  |                 | *削除*                            |
| `RemoveTriggerEvent(TriggerHandle handle)`                   | `void`          | 特定のトリガーノードを削除。     |
| `RemoveChainEvent(ChainHandle handle)`                       | `void`          | 特定のチェーンノードを削除。       |
| `RemoveAllTriggerEvents()`                                   | `void`          | すべての動的トリガーをクリア。         |
| `RemoveAllChainEvents()`                                     | `void`          | すべての動的チェーンをクリア。           |