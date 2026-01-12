---
sidebar_label: 'リスニング（受信）戦略'
sidebar_position: 2
---

# リスニング（受信）戦略

イベントの発行が「信号の送信」であるのに対し、**リスニング（受信）**こそが実際のゲームロジックが実行される場所です。

Game Event System は階層化されたリスニングアーキテクチャを提供しており、「何が」反応するかだけでなく、「いつ」「どのような条件下で」反応するかを制御することができます。

---

## 🚦 実行パイプライン

イベントが発行されると、リスナーは厳密で確定的（デターミニスティック）な順序で実行されます。このパイプラインを理解することは、依存関係の管理（例：UI の前にデータを確実に更新するなど）において非常に重要です。

1.  **基本リスナー** (コードによる実装)
2.  **インスペクターバインディング** (シーン上の視覚的な設定)
3.  **優先度付きリスナー** (ソートされたコード)
4.  **条件付きリスナー** (フィルタリングされたコード)
5.  **常駐リスナー** (グローバル/シーンを跨ぐ設定)
6.  **フローグラフ** (トリガーとチェーン)

---

## 1. 基本リスナー (Standard)

これはロジックをバインドする最も一般的な方法です。標準的な C# イベントや `UnityEvent` と全く同じように動作します。

### 使用例
他のリスナーとの実行順序を気にする必要がない、標準的で非クリティカルなゲームプレイロジックに使用します。

```csharp
public class PlayerHealth : MonoBehaviour
{
    [GameEventDropdown] public Int32GameEvent onTakeDamage;

    private void OnEnable()
    {
        // 購読 (Subscribe)
        onTakeDamage.AddListener(OnDamageReceived);
    }

    private void OnDisable()
    {
        // 購読解除 (Unsubscribe) - メモリリークを防ぐために不可欠です！
        onTakeDamage.RemoveListener(OnDamageReceived);
    }

    private void OnDamageReceived(int amount)
    {
        Debug.Log($"痛い！ {amount} ダメージを受けました。");
    }
}
```

:::warning 匿名関数 (ラムダ式)
購読解除の必要がないことが確実でない限り、ラムダ式（例：AddListener(() => DoThing())）の使用は避けてください。匿名インスタンスの参照が失われるため、後から特定のラムダリスナーを解除することは**できません**。
:::

------

## 2. 優先度付きリスナー (Sorted)

複数のスクリプトが同じイベントをリッスンしている場合、通常、実行順序は不定です。**優先度付きリスナー**は、整数の重み（Weight）を指定することでこの問題を解決します。

### 実行ルール

- **数値が高い** = **早く**実行される。
- **数値が低い** = **遅く**実行される。

### 使用例

**データロジック**と**表示（View）ロジック**を分離するのに最適です。

```csharp
// 1. データシステム (高優先度)
// 新しい体力値を計算するために、最初に実行される必要があります。
onPlayerHit.AddPriorityListener(CalculateHealth, 100);

// 2. UI システム (低優先度)
// 後で実行されます。更新済みの体力値を安全に読み取ることができます。
onPlayerHit.AddPriorityListener(UpdateHealthBar, 0);
```

### Sender と引数のサポート

優先度付きリスナーは、ジェネリック型および Sender ペイロードを完全にサポートしています。

```csharp
// 優先度を指定してリッスンし、Sender と Args の両方を受け取る
onCombatEvent.AddPriorityListener(OnCombatLog, 10);

void OnCombatLog(GameObject sender, DamageInfo info) { ... }
```

------

## 3. 条件付きリスナー (Predicates)

イベントをリッスンしたいが、特定の基準を満たした場合のみロジックを実行したい場合があります。すべてのコールバック内に if 文を書く代わりに、**述語（Predicate）**を登録できます。

### ロジックフロー

1. イベントが発行される。
2. システムが登録された**条件関数（Condition Function）**を呼び出す。
3. true が返された場合 ➔ リスナーを実行。
4. false が返された場合 ➔ リスナーをスキップ。

### 使用例

高頻度で発生するイベントから不要なノイズをフィルタリングするのに適しています。

```csharp
// 体力が実際に 0 になった時だけ「死亡」ロジックをトリガーする
onHealthChanged.AddConditionalListener(
    OnDeath, 
    condition: (currentHealth) => currentHealth <= 0
);

// 送信元（Sender）が Player の場合のみ反応する
onInteraction.AddConditionalListener(
    OpenMenu, 
    condition: (sender, args) => sender.CompareTag("Player")
);
```

------

## 4. 常駐リスナー (Global)

標準的なリスナーは、その GameObject が破棄される（新しいシーンがロードされるなど）と破棄されます。**常駐リスナー**はグローバルマネージャー（DontDestroyOnLoad）に登録され、シーンの遷移を跨いで生存します。

### 使用例

ゲーム全体を通して存在する **AudioManager**、**Analytics**、**SaveSystem** などのグローバルマネージャーに最適です。

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onLevelStart;

    void Awake()
    {
        DontDestroyOnLoad(this);
        
        // このリスナーはシーンが変わった後も動作し続けます
        onLevelStart.AddPersistentListener(PlayLevelMusic);
    }
    
    // 注意: このオブジェクト自体が実際に破棄される場合は、手動で解除する必要があります
    void OnDestroy()
    {
        onLevelStart.RemovePersistentListener(PlayLevelMusic);
    }
}
```

:::danger ターゲットの安全性
常駐リスナーのターゲットオブジェクト（通常の敵など）が破棄された場合、システムは null 参照を検出し、実行をスキップして警告を表示します。常駐リスナーは必ず OnDestroy で登録を解除してください。
:::

------

## 🧹 安全性とメンテナンス

### リスナーの削除

Add 呼び出しは、必ず Remove 呼び出しとペアにしてください。API は、すべてのリスナータイプに対して対称的な削除メソッドを提供しています。

- RemoveListener(action)
- RemovePriorityListener(action)
- RemoveConditionalListener(action)
- RemovePersistentListener(action)

### 最終手段 (RemoveAllListeners)

稀なケース（プーリングのリセットやゲームの終了時など）において、イベントを完全にクリアしたい場合に使用します。

```csharp
// 基本、優先度付き、および条件付きリスナーをクリアします。
// 安全のため、常駐リスナー（Persistent）はクリアされません。
myEvent.RemoveAllListeners();
```

------

## 🧩 まとめ：どの戦略を使うべきか？

| 要件 | 戦略 | 理由 |
| ------------------------------------------ | --------------- | ------------------------------------------------- |
| **「起きたことだけ知りたい。」** | **基本 (Basic)** | 最小のオーバーヘッド、標準的な挙動。 |
| **「UI が更新される『前』に実行したい。」** | **優先度付き (Priority)** | 実行順序を保証（高優先度が先）。 |
| **「体力が 0 未満の時だけ実行したい。」** | **条件付き (Conditional)** | クリーンなコード。ソース元でロジックをフィルタリング。 |
| **「次のシーンでも受信し続けたい。」** | **常駐 (Persistent)** | シーンのロード/アンロードを跨いで生存。 |

---

## 📜 API サマリー

| メソッドシグネチャ | 戻り値 | 説明 |
| :----------------------------------------------------------- | :------ | :----------------------------------------------------------- |
| **基本リスナー** | | |
| `AddListener(UnityAction call)` | `void` | 基本的な void リスナーを追加します。 |
| `AddListener(UnityAction<T> call)` | `void` | 引数を 1 つ持つ基本的なリスナーを追加します。 |
| `AddListener(UnityAction<TSender, TArgs> call)` | `void` | Sender と引数を持つ基本的なリスナーを追加します。 |
| `RemoveListener(UnityAction call)` | `void` | 基本的な void リスナーを削除します。 |
| `RemoveListener(UnityAction<T> call)` | `void` | 引数を 1 つ持つ基本的なリスナーを削除します。 |
| `RemoveListener(UnityAction<TSender, TArgs> call)` | `void` | Sender と引数を持つ基本的なリスナーを削除します。 |
| **優先度付きリスナー** | | |
| `AddPriorityListener(UnityAction call, int priority)` | `void` | 実行優先度を指定して void リスナーを追加します。 |
| `AddPriorityListener(UnityAction<T> call, int priority)` | `void` | 実行優先度を指定して型付きリスナーを追加します。 |
| `AddPriorityListener(UnityAction<TSender, TArgs> call, int priority)` | `void` | 実行優先度を指定して Sender リスナーを追加します。 |
| `RemovePriorityListener(UnityAction call)` | `void` | void の優先度付きリスナーを削除します。 |
| `RemovePriorityListener(UnityAction<T> call)` | `void` | 型付きの優先度付きリスナーを削除します。 |
| `RemovePriorityListener(UnityAction<TSender, TArgs> call)` | `void` | Sender の優先度付きリスナーを削除します。 |
| **条件付きリスナー** | | |
| `AddConditionalListener(UnityAction call, Func<bool> condition, int priority)` | `void` | 条件によって保護された void リスナーを追加します。 |
| `AddConditionalListener(UnityAction<T> call, Func<T, bool> condition, int priority)` | `void` | 条件によって保護された型付きリスナーを追加します。 |
| `AddConditionalListener(UnityAction<TSender, TArgs> call, Func<TSender, TArgs, bool> condition, int priority)` | `void` | 条件によって保護された Sender リスナーを追加します。 |
| `RemoveConditionalListener(UnityAction call)` | `void` | void の条件付きリスナーを削除します。 |
| `RemoveConditionalListener(UnityAction<T> call)` | `void` | 型付きの条件付きリスナーを削除します。 |
| `RemoveConditionalListener(UnityAction<TSender, TArgs> call)` | `void` | Sender の条件付きリスナーを削除します。 |
| **常駐リスナー** | | |
| `AddPersistentListener(UnityAction call, int priority)` | `void` | グローバルな void リスナーを追加します (DontDestroyOnLoad)。 |
| `AddPersistentListener(UnityAction<T> call, int priority)` | `void` | グローバルな型付きリスナーを追加します。 |
| `AddPersistentListener(UnityAction<TSender, TArgs> call, int priority)` | `void` | グローバルな Sender リスナーを追加します。 |
| `RemovePersistentListener(UnityAction call)` | `void` | グローバルな void リスナーを削除します。 |
| `RemovePersistentListener(UnityAction<T> call)` | `void` | グローバルな型付きリスナーを削除します。 |
| `RemovePersistentListener(UnityAction<TSender, TArgs> call)` | `void` | グローバルな Sender リスナーを削除します。 |
| **一括クリーンアップ** | | |
| `RemoveAllListeners()` | `void` | **基本**、**優先度付き**、および**条件付き**リスナーをすべてクリアします。<br/>*(注意: 安全のため常駐リスナーはクリアされません)。* |