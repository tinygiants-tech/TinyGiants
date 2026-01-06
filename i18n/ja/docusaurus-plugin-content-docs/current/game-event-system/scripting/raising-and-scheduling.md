---
sidebar_label: '発火&スケジューリング'
sidebar_position: 1
---

# 発火とスケジューリング

その核心において、Game Event Systemはシグナルの送信に関するものです。インスペクターがビジュアルバインディングを処理する一方で、**Runtime API**はプログラマーにこれらのシグナルが*いつ*、*どのように*発火されるかについての正確な制御を提供します。

このガイドでは、即座の実行、時間ベースのスケジューリング、および保留中のイベントのキャンセルをカバーします。

---

## 🚀 即座の実行(`Raise`)

`Raise()`メソッドは、イベントを発火する標準的な方法です。現在のフレームですべてのリスナー(インスペクター、コード、フローグラフ)を同期的に実行します。

### 1. Voidイベント
引数のないイベント。
```csharp
[GameEventDropdown] public GameEvent onPlayerJump;

void Update()
{
    if (Input.GetButtonDown("Jump"))
    {
        // 即座に発火
        onPlayerJump.Raise();
    }
}
```

### 2. 単一引数イベント

特定のデータペイロード(T)を運ぶイベント。
```csharp
[GameEventDropdown] public GameEvent<float> onHealthChanged;

public void TakeDamage(float damage)
{
    currentHealth -= damage;
    
    // 型安全な呼び出し
    onHealthChanged.Raise(currentHealth);
}
```

### 3. Sender + 引数イベント

イベントの**ソース**(TSender)を検証し、データ(TArgs)を運ぶイベント。
```csharp
// 型を定義: SenderはGameObject、ArgはDamageInfo
[GameEventDropdown] public GameEvent<GameObject, DamageInfo> onActorDamaged;

public void Hit()
{
    var info = new DamageInfo { amount = 50, type = DamageType.Fire };
    
    // 'this.gameObject'をsenderとして渡す
    onActorDamaged.Raise(this.gameObject, info);
}
```

:::warning 自動スケジューリングロジック
特定のイベントアセットのインスペクターで**Action Delay**または**Repeat**設定を構成している場合、Raise()を呼び出すと、これらの設定が自動的に尊重されます(例: 実際に発火する前に2秒待つ可能性があります)。
以下の[インスペクター統合](#-inspector-integration)を参照してください。
:::

------

## ⏱️ 遅延実行(RaiseDelayed)

コルーチンを使用せずに、将来のイベントをスケジュールしたい場合があります。システムは組み込みスケジューラーを提供します。

すべてのスケジューリングメソッドは`ScheduleHandle`を返します。これは、発火前にイベントをキャンセルする必要がある場合に重要です。
```csharp
[GameEventDropdown] public GameEvent onBombExplode;

public void PlantBomb()
{
    Debug.Log("爆弾を設置...");
    
    // 5.0秒後にイベントを発火
    ScheduleHandle handle = onBombExplode.RaiseDelayed(5.0f);
}
```

### 遅延付きで引数を渡す

APIは遅延呼び出しのためのジェネリクスを完全にサポートします。
```csharp
// 1.5秒待機してから、float値'100f'を送信
onScoreAdded.RaiseDelayed(100f, 1.5f);

// 0.5秒待機してから、SenderとArgsを渡す
onItemPickup.RaiseDelayed(this, itemData, 0.5f);
```

------

## 🔄 繰り返し実行(RaiseRepeating)

これを使用して、イベントシステム内で完全にループ、タイマー、またはポーリングメカニズムを作成します。

| パラメータ   | 説明                                         |
| ----------- | --------------------------------------------------- |
| interval    | 各発火間の時間(秒)。                   |
| repeatCount | 何回発火するか? **無限**の場合は-1に設定。 |

### 例: 毒エフェクト

1秒ごとに5回、プレイヤーにダメージを与える。
```csharp
[GameEventDropdown] public GameEvent<int> onTakeDamage;

private void ApplyPoison()
{
    // 即座に発火(オプション)、その後1秒ごとに5回繰り返す
    // 注意: RaiseRepeatingはデフォルトで最初の発火前にインターバルを待機します
    onTakeDamage.RaiseRepeating(10, interval: 1.0f, repeatCount: 5);
}
```

### 例: レーダースキャン(無限)

2秒ごとに永遠にレーダーイベントをピング。
```csharp
private ScheduleHandle _radarHandle;

void Start()
{
    // -1はキャンセルされるまで永遠に実行することを意味します
    _radarHandle = onRadarPing.RaiseRepeating(2.0f, repeatCount: -1);
}
```

------

## 🔔 モニタリング&ライフサイクルコールバック

`ScheduleHandle`はキャンセルのためだけではありません。スケジュールされたタスクの状態を監視できる3つの組み込みコールバックを提供します。これは、UIプログレスバーの更新、フォローアップロジックのトリガー、またはリソースのクリーンアップに不可欠です。
```csharp
[GameEventDropdown] public GameEvent onStatusUpdate;

private void StartTrackedLoop()
{
    // 1秒ごとに5回繰り返すタスクを開始
    ScheduleHandle handle = onStatusUpdate.RaiseRepeating(interval: 1.0f, repeatCount: 5);

    // 1. 各ティック(ステップ)でトリガー
    handle.OnStep += (remainingCount) => 
    {
        Debug.Log($"[Schedule] 実行ステップ! 残りサイクル: {remainingCount}");
    };

    // 2. タスクが自然に終了したときにトリガー
    handle.OnCompleted += () => 
    {
        Debug.Log("[Schedule] タスクが正常に完了しました。");
    };

    // 3. タスクがコードで手動停止された場合にトリガー
    handle.OnCancelled += () => 
    {
        Debug.Log("[Schedule] タスクはユーザーによってキャンセルされました。");
    };
}
```

### コールバック定義

| コールバック        | 呼び出しタイミング                                            | 典型的な使用例                                             |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **OnStep**      | 各イベント実行の直後に発火。残りのrepeatCountを渡します。 | カウントダウンタイマーまたは「進捗」UIの更新。                  |
| **OnCompleted** | タスクがrepeatCountに達して自然に終了したときに発火。 | 「クールダウン終了」または「コンボ終了」ロジックのトリガー。     |
| **OnCancelled** | CancelDelayedまたはCancelRepeatingが呼び出されたときに特に発火。 | 関連するVFX/SFXの停止またはキャラクターの状態のリセット。 |

:::tip ハンドルの破棄
これらのコールバックから手動で登録解除する必要はありません。ScheduleHandleは、タスクが終了状態(CompletedまたはCancelled)に達すると、内部スケジューラーによって自動的にクリーンアップされます。
:::

------

## 🛑 キャンセル

保留中のイベントを停止することは、それらを開始することと同じくらい重要です。開始方法に応じて、イベントをキャンセルする2つの異なる方法があります。

### 1. 手動スケジュールのキャンセル
`RaiseDelayed`または`RaiseRepeating`を使用した場合、**ScheduleHandle**を受け取ります。その特定のタスクを停止するには、このハンドルを使用する必要があります。

#### 遅延呼び出しのキャンセル
```csharp
public void DefuseBomb()
{
    // 保留中の遅延実行を停止
    if (_bombHandle != null)
    {
        // 正常にキャンセルされた場合trueを返す
        bool success = onBombExplode.CancelDelayed(_bombHandle); 
    }
}
```

#### 繰り返しループのキャンセル
```csharp
public void StopRadar()
{
    // 手動ループを停止
    if (_radarHandle != null)
    {
        onRadarPing.CancelRepeating(_radarHandle);
    }
}
```

### 2. 自動(インスペクター)スケジュールのキャンセル

イベントが**インスペクター構成**(Behaviorウィンドウ)のためにループまたは遅延している場合、パラメータなしのCancel()メソッドを使用します。

- **ターゲット**: このイベントアセット上の**アクティブな**自動シーケンス(DelayまたはLoop)を停止します。
- **安全性**: Raise()は、重複するループを防ぐために、新しい自動シーケンスを開始する前に内部的にCancel()を自動的に呼び出します。
```csharp
// 以前の.Raise()呼び出しによってトリガーされた
// 現在実行中の「Action Delay」または「Repeat」ロジックを停止
onEvent.Cancel();
```

:::danger 重要な区別
**Cancel()はリスナーを削除しません。**

- **Cancel()**: 時間ベースの実行を停止(保留中のタイマー/ループ)。イベントは発火されなかったかのように動作します。
- **RemoveAllListeners()**: すべてのスクリプトの登録を解除し、今後のイベントを受信しないようにします。
  :::

------

## 🔌 インスペクター統合

コードが**ビジュアルビヘイビア構成**とどのように相互作用するかを理解することが重要です。

コードでRaise()を呼び出すと、システムは[Game Event Behavior Window](../visual-workflow/game-event-behavior.md)で定義された**Schedule Configuration**をチェックします:

1. **コード**: myEvent.Raise()が呼び出される。
2. **システムチェック**: このイベントにインスペクターでAction Delay > 0がありますか?
   - **はい**: システムは暗黙的にこれをRaiseDelayedに変換します。
   - **いいえ**: 即座に発火します。
3. **システムチェック**: このイベントにRepeat Interval > 0がありますか?
   - **はい**: システムは自動的にループを開始します。

:::tip ベストプラクティス
**純粋なコード制御**が必要な場合は、インスペクターのSchedule設定を0のままにします。
**デザイナーにタイミングを調整させたい**場合は、Raise()を使用し、インスペクターに遅延を制御させます。
:::

------

## 🔇 ビジュアルのミュート(SetInspectorListenersActive)

複雑なシステムでは、**ゲームロジック**(データ)と**ゲームフィール**(ビジュアル/サウンド)を分離したいことがよくあります。

SetInspectorListenersActive(false)を使用して、「ロジック/コード」レイヤーを実行したまま「ビジュアル/シーン」レイヤーをミュートします。

### 使用例: 早送りまたはロード

セーブファイルをロードすることを想像してください。インベントリを埋めるためにOnItemAddedを100回発火する必要がありますが、100個のサウンドエフェクトを再生したり、100個のUIポップアップを生成したりは**したくありません**。
```csharp
public void LoadSaveData(List<Item> items)
{
    // 1. 「派手な」もの(インスペクターバインディング)をミュート
    onItemAdded.SetInspectorListenersActive(false);

    // 2. ロジックを処理(データリスナーはまだ実行!)
    foreach(var item in items)
    {
        // これはバックエンドインベントリデータを更新
        // しかしエディターで構成されたUI/サウンドをスキップ
        onItemAdded.Raise(item); 
    }

    // 3. ビジュアルを再有効化
    onItemAdded.SetInspectorListenersActive(true);
    
    // 4. UIを一度更新
    onInventoryUpdated.Raise();
}
```

------

## 📜 APIサマリー

| メソッドシグネチャ                                             | 戻り値          | 説明                                                  |
| :----------------------------------------------------------- | :--------------- | :----------------------------------------------------------- |
| **即座の実行**                                      |                  |                                                              |
| `Raise()`                                                    | `void`           | Voidイベントを即座に発火。                              |
| `Raise(T argument)`                                          | `void`           | 単一引数イベントを即座に発火。                   |
| `Raise(TSender sender, TArgs args)`                          | `void`           | Sender+引数イベントを即座に発火。                   |
| **遅延実行**                                        |                  |                                                              |
| `RaiseDelayed(float delay)`                                  | `ScheduleHandle` | `delay`秒後にVoidイベントを発火するようスケジュール。        |
| `RaiseDelayed(T arg, float delay)`                           | `ScheduleHandle` | `delay`秒後に型付きイベントを発火するようスケジュール。       |
| `RaiseDelayed(TSender s, TArgs a, float delay)`              | `ScheduleHandle` | `delay`秒後にSenderイベントを発火するようスケジュール。      |
| **繰り返し実行**                                      |                  |                                                              |
| `RaiseRepeating(float interval, int count)`                  | `ScheduleHandle` | 繰り返しループを開始。無限の場合は`count`を-1に設定。     |
| `RaiseRepeating(T arg, float interval, int count)`           | `ScheduleHandle` | 繰り返し型付きループを開始。                               |
| `RaiseRepeating(TSender s, TArgs a, float interval, int count)` | `ScheduleHandle` | 繰り返しSenderループを開始。                              |
| **キャンセル&コントロール**                                   |                  |                                                              |
| `Cancel()`                                                   | `void`           | このイベントの**インスペクター構成**自動ループ/遅延を停止。 |
| `CancelDelayed(ScheduleHandle handle)`                       | `bool`           | 特定の手動遅延タスクをキャンセル。成功した場合trueを返す。 |
| `CancelRepeating(ScheduleHandle handle)`                     | `bool`           | 特定の手動繰り返しタスクをキャンセル。成功した場合trueを返す。 |
| `SetInspectorListenersActive(bool isActive)`                 | `void`           | 実行時にシーンベースの`UnityEvent`リスナーをミュートまたはアンミュート。 |