---
sidebar_label: 'APIリファレンス'
sidebar_position: 5
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

# APIリファレンス

GameEventシステムの完全なAPIリファレンスドキュメントです。すべてのイベント型は、イベント駆動アーキテクチャのための包括的な機能を備えた厳格な型安全インターフェースを実装しています。

:::info 名前空間

すべてのクラスとインターフェースは`TinyGiants.GameEventSystem.Runtime`名前空間に配置されています。

:::
```csharp
using TinyGiants.GameEventSystem.Runtime;
```

------

## イベント型の概要

GameEventシステムは3つのイベント型バリアントを提供します

| 型                              | 説明                                          |
| ------------------------------- | --------------------------------------------- |
| **`GameEvent`**                 | シンプルな通知のためのパラメータなしイベント  |
| **`GameEvent<T>`**              | 型付きデータを渡すための単一引数イベント      |
| **`GameEvent<TSender, TArgs>`** | 送信者を認識した通信のための二重引数イベント  |

以下のすべてのメソッドは、適切なパラメータのバリエーションを持ち、これらの型全体で使用できます。

------

## 🚀 イベントの発行とキャンセル

<details>
<summary>Raise()</summary>

イベントを即座にトリガーし、登録されたすべてのリスナーを実行順序で呼び出します。

**実行順序**: Basic → Priority → Conditional → Persistent → Triggers → Chains

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void Raise();
```

**使用例:**
```csharp
myEvent.Raise();
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void Raise(T argument);
```

**パラメータ:**

| 名前       | 型   | 説明                                      |
| ---------- | ---- | ----------------------------------------- |
| `argument` | `T`  | すべてのリスナーに渡されるデータペイロード |

**使用例:**
```csharp
// float値で発行
healthEvent.Raise(50.5f);

// カスタム型で発行
scoreEvent.Raise(new ScoreData { points = 100, combo = 5 });
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void Raise(TSender sender, TArgs args);
```

**パラメータ:**

| 名前     | 型        | 説明                                  |
| -------- | --------- | ------------------------------------- |
| `sender` | `TSender` | イベントをトリガーするソースオブジェクト |
| `args`   | `TArgs`   | リスナーに渡されるデータペイロード      |

**使用例:**
```csharp
// GameObjectの送信者とダメージデータで発行
damageEvent.Raise(this.gameObject, new DamageInfo(10));

// プレイヤーの送信者で発行
playerEvent.Raise(playerInstance, new PlayerAction { type = "Jump" });
```

</TabItem> </Tabs>

</details>

<details>
<summary>Cancel()</summary>

このイベントアセットに対して、Inspectorで設定されたアクティブなスケジュール実行(遅延または繰り返し)を停止します。
```csharp
void Cancel();
```

**使用例:**
```csharp
// Inspectorで設定された自動繰り返しを停止
myEvent.Cancel();
```

:::warning 適用範囲の制限

これはInspectorの「スケジュール設定」によって開始されたスケジュール**のみ**をキャンセルします。`RaiseDelayed()`または`RaiseRepeating()`で作成された手動スケジュールはキャンセル**されません**。それらには`CancelDelayed(handle)`または`CancelRepeating(handle)`を使用してください。

:::

</details>

## ⏱️ 時間ベースのスケジューリング

<details>
<summary>RaiseDelayed()</summary>

指定された遅延後に一度だけイベントを発行するようスケジュールします。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
ScheduleHandle RaiseDelayed(float delay);
```

**パラメータ:**

| 名前    | 型      | 説明                                  |
| ------- | ------- | ------------------------------------- |
| `delay` | `float` | イベント発行前の待機時間(秒)           |

**戻り値:** `ScheduleHandle` - キャンセル用のハンドル

**使用例:**
```csharp
// 5秒後に発行
ScheduleHandle handle = myEvent.RaiseDelayed(5f);

// 必要に応じてキャンセル
myEvent.CancelDelayed(handle);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
ScheduleHandle RaiseDelayed(T argument, float delay);
```

**パラメータ:**

| 名前       | 型      | 説明                                  |
| ---------- | ------- | ------------------------------------- |
| `argument` | `T`     | イベント実行時に渡されるデータ         |
| `delay`    | `float` | イベント発行前の待機時間(秒)           |

**戻り値:** `ScheduleHandle` - キャンセル用のハンドル

**使用例:**
```csharp
// 3秒後に敵をスポーン
ScheduleHandle handle = spawnEvent.RaiseDelayed(enemyType, 3f);

// スポーンをキャンセル
spawnEvent.CancelDelayed(handle);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
ScheduleHandle RaiseDelayed(TSender sender, TArgs args, float delay);
```

**パラメータ:**

| 名前     | 型        | 説明                                  |
| -------- | --------- | ------------------------------------- |
| `sender` | `TSender` | イベント実行時に渡される送信者         |
| `args`   | `TArgs`   | イベント実行時に渡されるデータ         |
| `delay`  | `float`   | イベント発行前の待機時間(秒)           |

**戻り値:** `ScheduleHandle` - キャンセル用のハンドル

**使用例:**
```csharp
// 遅延ダメージ適用
ScheduleHandle handle = damageEvent.RaiseDelayed(
    attackerObject, 
    new DamageInfo(25), 
    2f
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RaiseRepeating()</summary>

固定間隔でイベントを繰り返し発行するようスケジュールします。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
ScheduleHandle RaiseRepeating(float interval, int repeatCount = -1);
```

**パラメータ:**

| 名前          | 型      | 説明                                                 |
| ------------- | ------- | ---------------------------------------------------- |
| `interval`    | `float` | 各実行間の秒数                                        |
| `repeatCount` | `int`   | 繰り返し回数。無限の場合は`-1`を使用(デフォルト: `-1`) |

**戻り値:** `ScheduleHandle` - キャンセル用のハンドル

**使用例:**
```csharp
// 10回繰り返し
ScheduleHandle handle = tickEvent.RaiseRepeating(1f, repeatCount: 10);

// 永久に繰り返し(無限ループ)
ScheduleHandle infinite = pulseEvent.RaiseRepeating(0.5f);

// 無限ループを停止
pulseEvent.CancelRepeating(infinite);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
ScheduleHandle RaiseRepeating(T argument, float interval, int repeatCount = -1);
```

**パラメータ:**

| 名前          | 型      | 説明                                                 |
| ------------- | ------- | ---------------------------------------------------- |
| `argument`    | `T`     | 各実行時に渡されるデータ                              |
| `interval`    | `float` | 各実行間の秒数                                        |
| `repeatCount` | `int`   | 繰り返し回数。無限の場合は`-1`を使用(デフォルト: `-1`) |

**戻り値:** `ScheduleHandle` - キャンセル用のハンドル

**使用例:**
```csharp
// 1秒ごとにダメージを与え、5回実行
ScheduleHandle poison = damageEvent.RaiseRepeating(5, 1f, repeatCount: 5);

// 30秒ごとに無限にウェーブをスポーン
ScheduleHandle waves = waveEvent.RaiseRepeating(waveData, 30f);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
ScheduleHandle RaiseRepeating(TSender sender, TArgs args, float interval, int repeatCount = -1);
```

**パラメータ:**

| 名前          | 型        | 説明                                                 |
| ------------- | --------- | ---------------------------------------------------- |
| `sender`      | `TSender` | 各実行時に渡される送信者                              |
| `args`        | `TArgs`   | 各実行時に渡されるデータ                              |
| `interval`    | `float`   | 各実行間の秒数                                        |
| `repeatCount` | `int`     | 繰り返し回数。無限の場合は`-1`を使用(デフォルト: `-1`) |

**戻り値:** `ScheduleHandle` - キャンセル用のハンドル

**使用例:**
```csharp
// 2秒ごとに体力を回復、10回実行
ScheduleHandle regen = healEvent.RaiseRepeating(
    playerObject,
    new HealInfo(5),
    2f,
    repeatCount: 10
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>CancelDelayed()</summary>

`RaiseDelayed()`で作成された特定の遅延イベントをキャンセルします。
```csharp
bool CancelDelayed(ScheduleHandle handle);
```

**パラメータ:**

| 名前     | 型               | 説明                                |
| -------- | ---------------- | ----------------------------------- |
| `handle` | `ScheduleHandle` | `RaiseDelayed()`から返されたハンドル |

**戻り値:** `bool` - 正常にキャンセルされた場合は`true`、既に実行済みまたは無効な場合は`false`

**使用例:**
```csharp
ScheduleHandle handle = explosionEvent.RaiseDelayed(5f);

// 爆発が起こる前にキャンセル
if (explosionEvent.CancelDelayed(handle))
{
    Debug.Log("爆発を解除しました!");
}
```

</details>

<details>
<summary>CancelRepeating()</summary>

`RaiseRepeating()`で作成された特定の繰り返しイベントをキャンセルします。
```csharp
bool CancelRepeating(ScheduleHandle handle);
```

**パラメータ:**

| 名前     | 型               | 説明                                  |
| -------- | ---------------- | ------------------------------------- |
| `handle` | `ScheduleHandle` | `RaiseRepeating()`から返されたハンドル |

**戻り値:** `bool` - 正常にキャンセルされた場合は`true`、既に終了済みまたは無効な場合は`false`

**使用例:**
```csharp
ScheduleHandle handle = tickEvent.RaiseRepeating(1f);

// 繰り返しを停止
if (tickEvent.CancelRepeating(handle))
{
    Debug.Log("タイマーを停止しました!");
}
```

</details>

## 🎧 リスナー管理

<details>
<summary>AddListener()</summary>

標準的な実行優先度を持つ基本リスナーを登録します。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddListener(UnityAction call);
```

**パラメータ:**

| 名前   | 型            | 説明                          |
| ------ | ------------- | ----------------------------- |
| `call` | `UnityAction` | パラメータなしのコールバックメソッド |

**使用例:**
```csharp
myEvent.AddListener(OnEventTriggered);

void OnEventTriggered()
{
    Debug.Log("イベントが発行されました!");
}
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddListener(UnityAction<T> call);
```

**パラメータ:**

| 名前   | 型               | 説明                              |
| ------ | ---------------- | --------------------------------- |
| `call` | `UnityAction<T>` | 型付き引数を受け取るコールバックメソッド |

**使用例:**
```csharp
scoreEvent.AddListener(OnScoreChanged);

void OnScoreChanged(int newScore)
{
    Debug.Log($"スコア: {newScore}");
}
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddListener(UnityAction<TSender, TArgs> call);
```

**パラメータ:**

| 名前   | 型                            | 説明                                |
| ------ | ----------------------------- | ----------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 送信者と引数を受け取るコールバックメソッド |

**使用例:**
```csharp
damageEvent.AddListener(OnDamageDealt);

void OnDamageDealt(GameObject attacker, DamageInfo info)
{
    Debug.Log($"{attacker.name}が{info.amount}のダメージを与えました");
}
```

</TabItem> </Tabs>

:::tip 重複防止

リスナーが既に存在する場合、重複を防ぐために削除されてから再追加されます。

:::

</details>

<details>
<summary>RemoveListener()</summary>

イベントから基本リスナーの登録を解除します。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemoveListener(UnityAction call);
```

**パラメータ:**

| 名前   | 型            | 説明                          |
| ------ | ------------- | ----------------------------- |
| `call` | `UnityAction` | パラメータなしのコールバックメソッド |

**使用例:**
```csharp
myEvent.RemoveListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemoveListener(UnityAction<T> call);
```

**パラメータ:**

| 名前   | 型               | 説明                              |
| ------ | ---------------- | --------------------------------- |
| `call` | `UnityAction<T>` | 型付き引数を受け取るコールバックメソッド |

**使用例:**
```csharp
scoreEvent.RemoveListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemoveListener(UnityAction<TSender, TArgs> call);
```

**パラメータ:**

| 名前   | 型                            | 説明                                |
| ------ | ----------------------------- | ----------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 送信者と引数を受け取るコールバックメソッド |

**使用例:**
```csharp
damageEvent.RemoveListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemoveAllListeners()</summary>

イベントからすべてのBasic、Priority、Conditionalリスナーをクリアします。
```csharp
void RemoveAllListeners();
```

**使用例:**
```csharp
// すべてのリスナーをクリーンアップ
myEvent.RemoveAllListeners();
```

:::warning 適用範囲

安全上の理由から、Persistentリスナーやトリガー/チェーンイベントは削除**されません**。

:::

</details>

<details>
<summary>AddPriorityListener()</summary>

明示的な実行優先度を持つリスナーを登録します。優先度の値が高いほど先に実行されます。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddPriorityListener(UnityAction call, int priority);
```

**パラメータ:**

| 名前       | 型            | 説明                                           |
| ---------- | ------------- | ---------------------------------------------- |
| `call`     | `UnityAction` | コールバックメソッド                            |
| `priority` | `int`         | 実行優先度(高い = 早い、デフォルト: 0)          |

**使用例:**
```csharp
myEvent.AddPriorityListener(CriticalHandler, 100);
myEvent.AddPriorityListener(NormalHandler, 50);
myEvent.AddPriorityListener(LowPriorityHandler, 10);
// 実行順序: CriticalHandler → NormalHandler → LowPriorityHandler
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddPriorityListener(UnityAction<T> call, int priority);
```

**パラメータ:**

| 名前       | 型               | 説明                                           |
| ---------- | ---------------- | ---------------------------------------------- |
| `call`     | `UnityAction<T>` | コールバックメソッド                            |
| `priority` | `int`            | 実行優先度(高い = 早い、デフォルト: 0)          |

**使用例:**
```csharp
healthEvent.AddPriorityListener(UpdateUI, 100);
healthEvent.AddPriorityListener(PlaySound, 50);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddPriorityListener(UnityAction<TSender, TArgs> call, int priority);
```

**パラメータ:**

| 名前       | 型                            | 説明                                           |
| ---------- | ----------------------------- | ---------------------------------------------- |
| `call`     | `UnityAction<TSender, TArgs>` | コールバックメソッド                            |
| `priority` | `int`                         | 実行優先度(高い = 早い、デフォルト: 0)          |

**使用例:**
```csharp
attackEvent.AddPriorityListener(ProcessCombat, 100);
attackEvent.AddPriorityListener(ShowVFX, 50);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemovePriorityListener()</summary>

優先度リスナーの登録を解除します。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemovePriorityListener(UnityAction call);
```

**パラメータ:**

| 名前   | 型            | 説明                          |
| ------ | ------------- | ----------------------------- |
| `call` | `UnityAction` | パラメータなしのコールバックメソッド |

**使用例:**
```csharp
myEvent.RemovePriorityListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemovePriorityListener(UnityAction<T> call);
```

**パラメータ:**

| 名前   | 型               | 説明                              |
| ------ | ---------------- | --------------------------------- |
| `call` | `UnityAction<T>` | 型付き引数を受け取るコールバックメソッド |

**使用例:**
```csharp
scoreEvent.RemovePriorityListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemovePriorityListener(UnityAction<TSender, TArgs> call);
```

**パラメータ:**

| 名前   | 型                            | 説明                                |
| ------ | ----------------------------- | ----------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 送信者と引数を受け取るコールバックメソッド |

**使用例:**
```csharp
damageEvent.RemovePriorityListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>AddConditionalListener()</summary>

条件がtrueと評価された場合にのみ実行されるリスナーを登録します。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddConditionalListener(UnityAction call, Func<bool> condition, int priority = 0);
```

**パラメータ:**

| 名前        | 型            | 説明                                      |
| ----------- | ------------- | ----------------------------------------- |
| `call`      | `UnityAction` | コールバックメソッド                       |
| `condition` | `Func<bool>`  | 述語関数(null = 常に実行)                  |
| `priority`  | `int`         | 実行優先度(デフォルト: 0)                  |

**使用例:**
```csharp
myEvent.AddConditionalListener(
    OnHealthLow,
    () => playerHealth < 20,
    priority: 10
);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddConditionalListener(UnityAction<T> call, Func<T, bool> condition, int priority = 0);
```

**パラメータ:**

| 名前        | 型               | 説明                          |
| ----------- | ---------------- | ----------------------------- |
| `call`      | `UnityAction<T>` | コールバックメソッド           |
| `condition` | `Func<T, bool>`  | 引数を受け取る述語関数         |
| `priority`  | `int`            | 実行優先度(デフォルト: 0)      |

**使用例:**
```csharp
scoreEvent.AddConditionalListener(
    OnHighScore,
    score => score > 1000,
    priority: 5
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddConditionalListener(
    UnityAction<TSender, TArgs> call, 
    Func<TSender, TArgs, bool> condition,
    int priority = 0
);
```

**パラメータ:**

| 名前        | 型                            | 説明                              |
| ----------- | ----------------------------- | --------------------------------- |
| `call`      | `UnityAction<TSender, TArgs>` | コールバックメソッド               |
| `condition` | `Func<TSender, TArgs, bool>`  | 送信者と引数を受け取る述語関数     |
| `priority`  | `int`                         | 実行優先度(デフォルト: 0)          |

**使用例:**
```csharp
damageEvent.AddConditionalListener(
    OnCriticalHit,
    (attacker, info) => info.isCritical,
    priority: 10
);
```

</TabItem> </Tabs>

</details>

<details>
<summary>RemoveConditionalListener()</summary>

条件付きリスナーの登録を解除します。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemoveConditionalListener(UnityAction call);
```

**パラメータ:**

| 名前   | 型            | 説明                          |
| ------ | ------------- | ----------------------------- |
| `call` | `UnityAction` | パラメータなしのコールバックメソッド |

**使用例:**
```csharp
myEvent.RemoveConditionalListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemoveConditionalListener(UnityAction<T> call);
```

**パラメータ:**

| 名前   | 型               | 説明                              |
| ------ | ---------------- | --------------------------------- |
| `call` | `UnityAction<T>` | 型付き引数を受け取るコールバックメソッド |

**使用例:**
```csharp
scoreEvent.RemoveConditionalListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemoveConditionalListener(UnityAction<TSender, TArgs> call);
```

**パラメータ:**

| 名前   | 型                            | 説明                                |
| ------ | ----------------------------- | ----------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 送信者と引数を受け取るコールバックメソッド |

**使用例:**
```csharp
damageEvent.RemoveConditionalListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

<details>
<summary>AddPersistentListener()</summary>

シーン変更を超えて存続するグローバルリスナー(DontDestroyOnLoad)を登録します。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void AddPersistentListener(UnityAction call, int priority = 0);
```

**パラメータ:**

| 名前       | 型            | 説明                         |
| ---------- | ------------- | ---------------------------- |
| `call`     | `UnityAction` | コールバックメソッド          |
| `priority` | `int`         | 実行優先度(デフォルト: 0)     |

**使用例:**
```csharp
globalEvent.AddPersistentListener(OnGlobalAction, priority: 100);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void AddPersistentListener(UnityAction<T> call, int priority = 0);
```

**パラメータ:**

| 名前       | 型               | 説明                         |
| ---------- | ---------------- | ---------------------------- |
| `call`     | `UnityAction<T>` | コールバックメソッド          |
| `priority` | `int`            | 実行優先度(デフォルト: 0)     |

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void AddPersistentListener(UnityAction<TSender, TArgs> call, int priority = 0);
```

**パラメータ:**

| 名前       | 型                            | 説明                         |
| ---------- | ----------------------------- | ---------------------------- |
| `call`     | `UnityAction<TSender, TArgs>` | コールバックメソッド          |
| `priority` | `int`                         | 実行優先度(デフォルト: 0)     |

</TabItem> </Tabs>

:::info 永続性

Persistentリスナーはシーンのロード間もアクティブなままです。セーブ管理や分析などのグローバルシステムに使用してください。

:::

</details>

<details>
<summary>RemovePersistentListener()</summary>

永続的リスナーの登録を解除します。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
void RemovePersistentListener(UnityAction call);
```

**パラメータ:**

| 名前   | 型            | 説明                          |
| ------ | ------------- | ----------------------------- |
| `call` | `UnityAction` | パラメータなしのコールバックメソッド |

**使用例:**
```csharp
myEvent.RemovePersistentListener(OnEventTriggered);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
void RemovePersistentListener(UnityAction<T> call);
```

**パラメータ:**

| 名前   | 型               | 説明                              |
| ------ | ---------------- | --------------------------------- |
| `call` | `UnityAction<T>` | 型付き引数を受け取るコールバックメソッド |

**使用例:**
```csharp
scoreEvent.RemovePersistentListener(OnScoreChanged);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
void RemovePersistentListener(UnityAction<TSender, TArgs> call);
```

**パラメータ:**

| 名前   | 型                            | 説明                                |
| ------ | ----------------------------- | ----------------------------------- |
| `call` | `UnityAction<TSender, TArgs>` | 送信者と引数を受け取るコールバックメソッド |

**使用例:**
```csharp
damageEvent.RemovePersistentListener(OnDamageDealt);
```

</TabItem> </Tabs>

</details>

## ⚡ トリガーイベント(ファンアウトパターン)

<details>
<summary>AddTriggerEvent()</summary>

このイベントが発行されたときに自動的にトリガーされるターゲットイベントを登録します。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<bool> condition = null,
    int priority = 0
);
```

**パラメータ:**

| 名前          | 型              | 説明                                           |
| ------------- | --------------- | ---------------------------------------------- |
| `targetEvent` | `GameEventBase` | トリガーするイベント                            |
| `delay`       | `float`         | オプションの遅延(秒)(デフォルト: 0)             |
| `condition`   | `Func<bool>`    | 実行をゲートするオプションの述語                |
| `priority`    | `int`           | 他のトリガーに対する実行順序(デフォルト: 0)     |

**戻り値:** `TriggerHandle` - 安全な削除のための一意の識別子

**使用例:**
```csharp
// シンプルなトリガー: ドアが開く → ライトが点灯
doorOpenEvent.AddTriggerEvent(lightOnEvent);

// 遅延トリガー: 2秒後に爆発
fuseEvent.AddTriggerEvent(explosionEvent, delay: 2f);

// 条件付きトリガー
doorOpenEvent.AddTriggerEvent(
    alarmEvent,
    condition: () => isNightTime
);

// 優先順位付きトリガー
bossDefeatedEvent.AddTriggerEvent(stopMusicEvent, priority: 100);
bossDefeatedEvent.AddTriggerEvent(victoryMusicEvent, priority: 90);
bossDefeatedEvent.AddTriggerEvent(showRewardsEvent, priority: 50);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<T, bool> condition = null,
    bool passArgument = true,
    Func<T, object> argumentTransformer = null,
    int priority = 0
);
```

**パラメータ:**

| 名前                  | 型                | 説明                                           |
| --------------------- | ----------------- | ---------------------------------------------- |
| `targetEvent`         | `GameEventBase`   | トリガーするイベント                            |
| `delay`               | `float`           | オプションの遅延(秒)(デフォルト: 0)             |
| `condition`           | `Func<T, bool>`   | 引数を受け取るオプションの述語                  |
| `passArgument`        | `bool`            | ターゲットにデータを渡すかどうか(デフォルト: true) |
| `argumentTransformer` | `Func<T, object>` | データを変換するオプションの関数                |
| `priority`            | `int`             | 実行優先度(デフォルト: 0)                       |

**戻り値:** `TriggerHandle` - 安全な削除のための一意の識別子

**使用例:**
```csharp
// 引数を直接渡す
GameEvent<int> scoreEvent;
GameEvent<int> updateUIEvent;
scoreEvent.AddTriggerEvent(updateUIEvent, passArgument: true);

// 引数を変換: int → string
GameEvent<int> scoreEvent;
GameEvent<string> notificationEvent;
scoreEvent.AddTriggerEvent(
    notificationEvent,
    passArgument: true,
    argumentTransformer: score => $"スコア: {score}"
);

// 引数チェック付き条件付き
GameEvent<float> healthEvent;
GameEvent lowHealthWarningEvent;
healthEvent.AddTriggerEvent(
    lowHealthWarningEvent,
    condition: health => health < 20f,
    passArgument: false
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
TriggerHandle AddTriggerEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    Func<TSender, TArgs, bool> condition = null,
    bool passArgument = true,
    Func<TSender, TArgs, object> argumentTransformer = null,
    int priority = 0
);
```

**パラメータ:**

| 名前                  | 型                             | 説明                                           |
| --------------------- | ------------------------------ | ---------------------------------------------- |
| `targetEvent`         | `GameEventBase`                | トリガーするイベント                            |
| `delay`               | `float`                        | オプションの遅延(秒)(デフォルト: 0)             |
| `condition`           | `Func<TSender, TArgs, bool>`   | 送信者と引数を受け取るオプションの述語          |
| `passArgument`        | `bool`                         | ターゲットにデータを渡すかどうか(デフォルト: true) |
| `argumentTransformer` | `Func<TSender, TArgs, object>` | オプションの変換関数                            |
| `priority`            | `int`                          | 実行優先度(デフォルト: 0)                       |

**戻り値:** `TriggerHandle` - 安全な削除のための一意の識別子

**使用例:**
```csharp
// 送信者と引数を別の送信者イベントに渡す
GameEvent<GameObject, DamageInfo> damageEvent;
GameEvent<GameObject, DamageInfo> logEvent;
damageEvent.AddTriggerEvent(logEvent, passArgument: true);

// 変換: ダメージ値のみを抽出
GameEvent<GameObject, DamageInfo> damageEvent;
GameEvent<int> damageNumberEvent;
damageEvent.AddTriggerEvent(
    damageNumberEvent,
    passArgument: true,
    argumentTransformer: (sender, info) => info.amount
);

// 送信者と引数に基づく条件付き
GameEvent<GameObject, DamageInfo> damageEvent;
GameEvent criticalHitEvent;
damageEvent.AddTriggerEvent(
    criticalHitEvent,
    condition: (sender, info) => 
        info.isCritical && sender.CompareTag("Player"),
    passArgument: false
);
```

</TabItem> </Tabs>

:::tip ファンアウトパターン

トリガーは**並列**に実行されます - 各トリガーは独立しています。1つのトリガーの条件が失敗したり例外をスローしても、他のトリガーは実行されます。

:::

</details>

<details>
<summary>RemoveTriggerEvent() (ハンドルによる)</summary>

一意のハンドルを使用して特定のトリガーを安全に削除します。
```csharp
void RemoveTriggerEvent(TriggerHandle handle);
```

**パラメータ:**

| 名前     | 型              | 説明                                    |
| -------- | --------------- | --------------------------------------- |
| `handle` | `TriggerHandle` | `AddTriggerEvent()`から返されたハンドル |

**使用例:**
```csharp
TriggerHandle handle = doorEvent.AddTriggerEvent(lightEvent);

// 特定のトリガーを削除
doorEvent.RemoveTriggerEvent(handle);
```

:::tip 推奨

これは特定のトリガーインスタンスのみを削除するため、**最も安全な**削除方法です。

:::

</details>

<details>
<summary>RemoveTriggerEvent() (ターゲットによる)</summary>

特定のターゲットイベントを指すトリガーを**すべて**削除します。
```csharp
void RemoveTriggerEvent(GameEventBase targetEvent);
```

**パラメータ:**

| 名前          | 型              | 説明                        |
| ------------- | --------------- | --------------------------- |
| `targetEvent` | `GameEventBase` | 切断するターゲットイベント   |

**使用例:**
```csharp
doorEvent.RemoveTriggerEvent(lightEvent);
```

:::warning 広範囲への影響

これは、このイベントをターゲットとする**すべての**トリガーを削除します。他のシステムによって登録されたものも含まれます。正確性のために`RemoveTriggerEvent(handle)`を使用してください。

:::

</details>

<details>
<summary>RemoveAllTriggerEvents()</summary>

このイベントからすべてのトリガーイベントを削除します。
```csharp
void RemoveAllTriggerEvents();
```

**使用例:**
```csharp
myEvent.RemoveAllTriggerEvents();
```

</details>

## 🔗 チェーンイベント(シーケンシャルパターン)

<details>
<summary>AddChainEvent()</summary>

チェーンで順次実行されるターゲットイベントを登録します。

<Tabs> <TabItem value="void" label="GameEvent" default>
```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<bool> condition = null,
    bool waitForCompletion = false
);
```

**パラメータ:**

| 名前                | 型              | 説明                                         |
| ------------------- | --------------- | -------------------------------------------- |
| `targetEvent`       | `GameEventBase` | チェーンで実行するイベント                    |
| `delay`             | `float`         | このノードを実行する前の遅延(デフォルト: 0)   |
| `duration`          | `float`         | このノードを実行した後の遅延(デフォルト: 0)   |
| `condition`         | `Func<bool>`    | オプションの述語 - falseの場合チェーンが中断   |
| `waitForCompletion` | `bool`          | 実行後に1フレーム待機(デフォルト: false)      |

**戻り値:** `ChainHandle` - 安全な削除のための一意の識別子

**使用例:**
```csharp
// シンプルなシーケンス: A → B → C
eventA.AddChainEvent(eventB);
eventB.AddChainEvent(eventC);

// 遅延を伴うカットシーン
fadeOutEvent.AddChainEvent(loadSceneEvent, delay: 1f);
loadSceneEvent.AddChainEvent(fadeInEvent, delay: 0.5f);

// 条件付きチェーン: 条件が満たされた場合のみ続行
combatEndEvent.AddChainEvent(
    victoryEvent,
    condition: () => playerHealth > 0
);

// 非同期操作のためのフレーム待機付きチェーン
showDialogEvent.AddChainEvent(
    typeTextEvent,
    waitForCompletion: true
);
```

</TabItem> <TabItem value="t" label="GameEvent&lt;T&gt;">
```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<T, bool> condition = null,
    bool passArgument = true,
    Func<T, object> argumentTransformer = null,
    bool waitForCompletion = false
);
```

**パラメータ:**

| 名前                  | 型                | 説明                                         |
| --------------------- | ----------------- | -------------------------------------------- |
| `targetEvent`         | `GameEventBase`   | チェーンで実行するイベント                    |
| `delay`               | `float`           | このノードを実行する前の遅延(デフォルト: 0)   |
| `duration`            | `float`           | このノードを実行した後の遅延(デフォルト: 0)   |
| `condition`           | `Func<T, bool>`   | 引数を受け取るオプションの述語                |
| `passArgument`        | `bool`            | ターゲットにデータを渡すかどうか(デフォルト: true) |
| `argumentTransformer` | `Func<T, object>` | オプションの変換関数                          |
| `waitForCompletion`   | `bool`            | 実行後に1フレーム待機(デフォルト: false)      |

**戻り値:** `ChainHandle` - 安全な削除のための一意の識別子

**使用例:**
```csharp
// 引数を渡すチェーン
GameEvent<int> damageEvent;
GameEvent<int> applyDamageEvent;
GameEvent<int> updateHealthBarEvent;

damageEvent.AddChainEvent(applyDamageEvent, passArgument: true);
applyDamageEvent.AddChainEvent(updateHealthBarEvent, passArgument: true);

// 変換を伴うチェーン
GameEvent<int> damageEvent;
GameEvent<float> healthPercentEvent;

damageEvent.AddChainEvent(
    healthPercentEvent,
    passArgument: true,
    argumentTransformer: damage => 
        (float)(currentHealth - damage) / maxHealth
);

// 引数チェック付き条件付きチェーン
GameEvent<int> damageEvent;
GameEvent deathEvent;

damageEvent.AddChainEvent(
    deathEvent,
    condition: damage => (currentHealth - damage) <= 0,
    passArgument: false
);
```

</TabItem> <TabItem value="sender" label="GameEvent&lt;TSender, TArgs&gt;">
```csharp
ChainHandle AddChainEvent(
    GameEventBase targetEvent,
    float delay = 0f,
    float duration = 0f,
    Func<TSender, TArgs, bool> condition = null,
    bool passArgument = true,
    Func<TSender, TArgs, object> argumentTransformer = null,
    bool waitForCompletion = false
);
```

**パラメータ:**

| 名前                  | 型                             | 説明                                         |
| --------------------- | ------------------------------ | -------------------------------------------- |
| `targetEvent`         | `GameEventBase`                | チェーンで実行するイベント                    |
| `delay`               | `float`                        | このノードを実行する前の遅延(デフォルト: 0)   |
| `duration`            | `float`                        | このノードを実行した後の遅延(デフォルト: 0)   |
| `condition`           | `Func<TSender, TArgs, bool>`   | 送信者と引数を受け取るオプションの述語        |
| `passArgument`        | `bool`                         | ターゲットにデータを渡すかどうか(デフォルト: true) |
| `argumentTransformer` | `Func<TSender, TArgs, object>` | オプションの変換関数                          |
| `waitForCompletion`   | `bool`                         | 実行後に1フレーム待機(デフォルト: false)      |

**戻り値:** `ChainHandle` - 安全な削除のための一意の識別子

**使用例:**
```csharp
// 攻撃シーケンスチェーン
GameEvent<GameObject, AttackData> attackStartEvent;
GameEvent<GameObject, AttackData> playAnimationEvent;
GameEvent<GameObject, AttackData> dealDamageEvent;

attackStartEvent.AddChainEvent(playAnimationEvent, delay: 0f);
playAnimationEvent.AddChainEvent(dealDamageEvent, delay: 0.5f);

// ダメージ値を抽出
GameEvent<GameObject, AttackData> dealDamageEvent;
GameEvent<int> showDamageNumberEvent;

dealDamageEvent.AddChainEvent(
    showDamageNumberEvent,
    passArgument: true,
    argumentTransformer: (attacker, data) => data.damage
);

// 条件付き勝利チェーン
GameEvent<GameObject, AttackData> attackEndEvent;
GameEvent<GameObject, VictoryData> victoryEvent;

attackEndEvent.AddChainEvent(
    victoryEvent,
    condition: (attacker, data) => data.targetHealth <= 0,
    argumentTransformer: (attacker, data) => 
        new VictoryData { winner = attacker }
);
```

</TabItem> </Tabs>

:::warning 順次実行

チェーンは**順次**(A → B → C)実行されます。いずれかのノードの条件が`false`を返すか例外をスローした場合、チェーン全体がその時点で**停止**します。

:::

:::tip トリガー vs チェーン

- **トリガー** = 並列(A → [B, C, D]) - すべて独立して実行
- **チェーン** = 順次(A → B → C) - 厳密な順序、失敗時に停止

:::

</details>

<details>
<summary>RemoveChainEvent() (ハンドルによる)</summary>

一意のハンドルを使用して特定のチェーンノードを安全に削除します。
```csharp
void RemoveChainEvent(ChainHandle handle);
```

**パラメータ:**

| 名前     | 型            | 説明                                  |
| -------- | ------------- | ------------------------------------- |
| `handle` | `ChainHandle` | `AddChainEvent()`から返されたハンドル |

**使用例:**
```csharp
ChainHandle handle = eventA.AddChainEvent(eventB);

// 特定のチェーンノードを削除
eventA.RemoveChainEvent(handle);
```

</details>

<details>
<summary>RemoveChainEvent() (ターゲットによる)</summary>

特定のターゲットイベントを指すチェーンノードを**すべて**削除します。
```csharp
void RemoveChainEvent(GameEventBase targetEvent);
```

**パラメータ:**

| 名前          | 型              | 説明                        |
| ------------- | --------------- | --------------------------- |
| `targetEvent` | `GameEventBase` | 切断するターゲットイベント   |

**使用例:**
```csharp
eventA.RemoveChainEvent(eventB);
```

:::warning 広範囲への影響

これは、このイベントをターゲットとする**すべての**チェーンノードを削除します。正確性のために`RemoveChainEvent(handle)`を使用してください。

:::

</details>

<details>
<summary>RemoveAllChainEvents()</summary>

このイベントからすべてのチェーンイベントを削除します。
```csharp
void RemoveAllChainEvents();
```

**使用例:**
```csharp
myEvent.RemoveAllChainEvents();
```

</details>

## 🔧 設定とユーティリティ

<details>
<summary>SetInspectorListenersActive()</summary>

イベントが発行されたときにInspectorで設定されたリスナーを実行するかどうかを制御します。
```csharp
void SetInspectorListenersActive(bool isActive);
```

**パラメータ:**

| 名前       | 型     | 説明                                                      |
| ---------- | ------ | --------------------------------------------------------- |
| `isActive` | `bool` | Inspectorリスナーを有効にする場合は`true`、ミュートする場合は`false` |

**使用例:**
```csharp
// Inspectorで設定されたUI/オーディオエフェクトをミュート
damageEvent.SetInspectorListenersActive(false);

// イベントはコードで登録されたリスナーのみをトリガー
damageEvent.Raise(10);

// Inspectorリスナーを再度有効化
damageEvent.SetInspectorListenersActive(true);
```

**ユースケース:**

- カットシーン中に一時的にビジュアル/オーディオエフェクトを無音化
- UI更新をトリガーせずにバックエンド計算を実行
- ロード画面中にシーン固有の動作を無効化
- テスト/デバッグモードでゲームロジックをシミュレート

:::info 適用範囲

この設定は、GameEventManagerを介してUnity **Inspector**で設定されたリスナーにのみ影響します。コードで`AddListener()`を介して登録されたリスナーは**影響を受けず**、常に実行されます。

:::

</details>

------

## 📊 クイックリファレンステーブル

### メソッドカテゴリ

| カテゴリ                | メソッド                                                     | 目的                                     |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| **実行**                | `Raise()`, `Cancel()`                                        | イベントのトリガーとスケジュール実行の停止 |
| **スケジューリング**    | `RaiseDelayed()`, `RaiseRepeating()`, `CancelDelayed()`, `CancelRepeating()` | 時間ベースのイベント実行                  |
| **基本リスナー**        | `AddListener()`, `RemoveListener()`, `RemoveAllListeners()`  | 標準的なコールバック登録                  |
| **優先度リスナー**      | `AddPriorityListener()`, `RemovePriorityListener()`          | 順序付きコールバック実行                  |
| **条件付きリスナー**    | `AddConditionalListener()`, `RemoveConditionalListener()`    | ゲート付きコールバック実行                |
| **永続的リスナー**      | `AddPersistentListener()`, `RemovePersistentListener()`      | シーン非依存のコールバック                |
| **トリガーイベント**    | `AddTriggerEvent()`, `RemoveTriggerEvent()`, `RemoveAllTriggerEvents()` | 並列イベントチェーン                      |
| **チェーンイベント**    | `AddChainEvent()`, `RemoveChainEvent()`, `RemoveAllChainEvents()` | 順次イベントチェーン                      |
| **設定**                | `SetInspectorListenersActive()`                              | ランタイム動作制御                        |