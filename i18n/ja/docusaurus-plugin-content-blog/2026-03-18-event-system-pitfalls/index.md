---
slug: api-best-practices
title: 'リリース後に発覚するイベントシステムの罠：メモリリーク、データ汚染、再帰トラップ'
authors: [tinygiants]
tags: [ges, unity, scripting, best-practices, architecture]
description: "QAが30分プレイするまで現れないバグたち。孤立したデリゲートによるメモリリーク、セッション間で汚染されるデータ、クラッシュしない無限ループ——そしてこれらすべてを防ぐ方法。"
image: /img/home-page/game-event-system-preview.png
---

ゲームを5分間テストしてきた。快適に動作する。するとQAがレポートを上げてくる：「30分のプレイセッションでメモリ使用量が着実に増加。6シーンをロードした後、フレームレートが60から40に低下。」プロファイリングすると、本来12であるべきイベントに847のリスナーが登録されている。各シーンロードが新しいサブスクリプションを追加しつつ、古いものを削除していなかった。オブジェクトは破棄されていたが、デリゲート参照が残り続け、ガベージコレクタが手を出せない場所に死んだMonoBehaviourをピン留めしていた。

あるいはこっち：「2回目のPlay Modeセッションでヘルス値がおかしい。1回目は問題なし。」Playを押す。戦闘をテスト。停止。もう一度Play。プレイヤーのHPが100ではなく73でスタートする。前回のセッションのScriptableObjectの状態が持ち越されていた。誰もリセットしなかったから。

あるいは定番：3秒間ゲームがハングし、Unityがクラッシュする。イベントAのリスナーがイベントBを発火。イベントBのリスナーがイベントAを発火。スタックオーバーフロー。ただし、クラッシュしないこともある——目に見えるエラーを出さずにCPUを食い潰す無限ループでハングするだけ。

これらは仮定の話ではない。実際に本番ゲームで出荷されたのを見たバグだ。そしてすべて同じ根本原因を持つ：単独では正しく見えるが、スケールすると壊れるイベントシステムパターン。

<!-- truncate -->

## イベントシステムの7つの大罪

解決策の話の前に、障害モードをカタログ化しよう。すべてのイベントシステム——GESだけでなく、Unityのものだけでなく、あらゆる言語のすべてのpub/sub実装——にこれらの潜在的な落とし穴がある。出荷できるシステムとできないシステムの違いは、最初のQAパスの前にチームがこれらを知っているかどうかだ。

### 第1の罪：孤立したサブスクリプション

これは史上最も一般的なイベントシステムバグだ。`Awake()`でサブスクライブし、アンサブスクライブを忘れる。オブジェクトは破棄されるが、デリゲートがまだ参照を保持している。イベントのインボケーションリストにポインタがあるため、GCがMonoBehaviourを回収できない。

```csharp
public class BadExample : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onDamage;

    private void Awake()
    {
        onDamage.AddListener(HandleDamage);
        // 対応するRemoveListenerがどこにもない
    }

    private void HandleDamage(int amount)
    {
        // このメソッドはオブジェクトが「破棄」された後も呼ばれる
        // UnityはDestroyedフラグを立てるが、C#オブジェクトは
        // デリゲート参照がGCを妨げるため生き続ける
        transform.position += Vector3.up; // MissingReferenceException
    }
}
```

陰険なのは：最初のシーンでは問題なく動く。運が良ければ2番目のシーンでも。メモリリークは、孤立したデリゲートが数百蓄積するまで十分なシーンをロードする20分間のプレイまで見えない。

プロファイラでは、各シーンロードでマネージドメモリが着実に増加しているのが見える。リークしたオブジェクトはMonoBehaviourだけではない——それらが参照しているもの全て：テクスチャ、メッシュ、マテリアルが含まれる。リスナー1つのリークが数メガバイトのアセットをピン留めする可能性がある。

### 第2の罪：セッション間のデータ汚染

UnityのPlay Modeには微妙な罠がある。ScriptableObjectインスタンスはPlay Modeセッション間でメモリに残る。イベント（ScriptableObject）がランタイム状態——リスナーリスト、キャッシュされた値、スケジュールハンドル——を保持している場合、その状態はプレイ停止後も残り続ける。

Playを押す。5つのリスナーをサブスクライブする。停止。もう一度Play。5つのリスナーはまだScriptableObjectのメモリに「登録済み」...しかしそれらを所有していたMonoBehaviourは消えている。リストに5つの死んだデリゲートと、新しいセッションの新しい5つが存在する。10回Playと停止を繰り返したら？ 50の死んだデリゲート。

症状として現れるのは：
- イベントが予想以上の回数発火する（前のセッションのゴーストリスナー）
- 最初のイベント発火で`MissingReferenceException`（死んだデリゲートが呼び出しを試みる）
- 長い開発セッションでエディタパフォーマンスが徐々に劣化

staticフィールドの場合、問題はさらに深刻だ。staticフィールドは特定の設定（「Enter Play Mode Settings」の最適化を有効にした場合）でのみドメインリロードを生き延びる。生き延びる場合、すべてのstaticキャッシュ、レジストリ、状態がセッション間で汚染される。

### 第3の罪：再帰的なRaise

イベントAのリスナーがイベントBを発火。イベントBのリスナーがイベントAを発火。あるいはもっと単純：イベントAのリスナーがイベントAを発火。スタックオーバーフロー。

```csharp
// 無限再帰
private void HandleHealthChanged(int newHealth)
{
    // 「ヘルスが変わったことをみんなに通知しなきゃ」
    onHealthChanged.Raise(newHealth);
    // これがHandleHealthChangedを呼び、Raiseを呼び、それが...
}
```

直接的なバージョンは明白だ。間接的なバージョンは見つけにくい：

```
OnDamageDealt -> HandleDamage -> OnHealthChangedを発火
OnHealthChanged -> HandleHealthCheck -> OnDamageDealtを発火（反射ダメージ）
OnDamageDealt -> HandleDamage -> OnHealthChangedを発火
... 永遠に
```

2つのイベント、2つのリスナー、無限のサイクル。そして常にクラッシュするわけではない。何らかの状態条件（HPがゼロになるなど）でサイクルが最終的に終了する場合、再現しにくい数秒間のフリーズを引き起こすだけで、特定のゲーム状態に依存する。

### 第4の罪：失われたスケジュールハンドル

`RaiseRepeating()`を`count: -1`（無限）で呼んでハンドルを保存しない。イベントは永遠に発火し続ける。止められない。実行中のコルーチンに外部参照がない。ただ...動き続ける。

```csharp
private void StartAmbientEffect()
{
    // 「後でキャンセルしよう」
    // ナレーター：彼はキャンセルしなかった
    onAmbientPulse.RaiseRepeating(interval: 0.5f, count: -1);
}
```

ハンドルはメソッドが返した瞬間に破棄される。このメソッドがシーンロードごとに1回実行されると、シーンごとに1つずつ無限のリピーティングイベントが蓄積する。10シーン後には10個のアンビエントパルスが重なり、それぞれ毎秒2回発火する。本来2回であるべきものが毎秒20回のイベント発火になる。

### 第5の罪：ラムダの罠（再び）

リスナー戦略の記事でカバーしたが、イベントシステムで最も多く報告される「バグ」なのでこのリストに入れている。無名デリゲートはアンサブスクライブできない。

```csharp
private void OnEnable()
{
    onDamage.AddListener((int amount) => health -= amount);
}

private void OnDisable()
{
    // これは新しいラムダを生成する。上のものとは一致しない。
    onDamage.RemoveListener((int amount) => health -= amount);
    // 元のものはまだサブスクライブされている。メモリリーク。
}
```

言語が危険なパターンを自然に見せている。安全なパターンは冗長に見える。失敗のピットだ。

### 第6の罪：核のRemoveAllListeners

システムAがサブシステムのイベントを管理している。クリーンアップ時に`RemoveAllListeners()`を呼んで自分の登録をクリアする。ところが`RemoveAllListeners()`はすべてのリスナーを削除する——システムB、C、Dが登録したものも含めて。

```csharp
// CombatSystem.cs
private void OnDisable()
{
    // 「自分のリスナーをクリーンアップ」
    onPlayerDamaged.RemoveAllListeners();  // やっちまった：AudioManagerのリスナーも殺した
}
```

AudioManagerがヒットサウンドを再生しなくなり、AnalyticsTrackerがダメージイベントの記録を止め、AchievementSystemがマイルストーンの追跡を停止する。メスが必要な場面でハンマーを使ったシステムが1つあったせいで。

これはプロトタイプがそのまま本番コードになるケースで特に多い。`RemoveAllListeners()`は個々の参照を追跡するより書くのが速い。自分のシステムが唯一のリスナーなら問題なく動く。他のシステムが同じイベントにサブスクライブし始めると、無言で壊れる。

### 第7の罪：高コストなPredicate

Conditionalリスナーには、イベントが発火するたびに評価されるpredicateがある。イベントが毎秒60回発火し、predicateが`Physics.OverlapSphere`を実行すると、条件付きリスナー1つにつき毎秒60回のスフィアキャストになる。

```csharp
// 毎秒60回のスフィアキャスト、条件チェックだけのために
onPositionUpdate.AddConditionalListener(
    HandleNearbyEnemies,
    () => Physics.OverlapSphere(transform.position, 10f, enemyLayer).Length > 0,
    priority: 50
);
```

プロファイラが「条件評価」に時間がかかっていると表示し、イベントシステムが遅いのかと不思議に思う。イベントシステムは問題ない。安いブールチェックであるべきデリゲートの中で、物理システム丸ごとの仕事をpredicateがやっている。

## これらを防ぐGESのパターン

では解決策について話そう。一部はGESに組み込まれている。その他は規約で強制するパターンだ。

### 黄金律：OnEnable / OnDisable

このブログシリーズ全体から1つだけ覚えるなら、これにしてほしい：

```csharp
private void OnEnable()
{
    myEvent.AddListener(HandleEvent);
}

private void OnDisable()
{
    myEvent.RemoveListener(HandleEvent);
}
```

`Awake` / `OnDestroy`ではない。`Start` / `OnApplicationQuit`ではない。`OnEnable` / `OnDisable`。

このペアが重要な理由：

**OnEnable/OnDisableはアクティブ状態を追跡する。** GameObjectを非アクティブにすると`OnDisable`が発火し、リスナーが削除される。再アクティブ化すると`OnEnable`が発火し、リスナーが再追加される。無効なオブジェクトはイベントを受け取らない——ほぼ常に正しい振る舞いだ。

**Awake/OnDestroyは一度だけ発火する。** Awakeでサブスクライブしたオブジェクトを無効化して再有効化すると？ 無効の間もサブスクライブされたまま、処理すべきでないイベントを受け取る。

**Startにはタイミング問題がある。** 別のオブジェクトがAwakeでイベントを発火。Startでサブスクライブしたリスナーはそれを見逃す。OnEnableはライフサイクルの中でより早く実行される。

唯一の例外：`DontDestroyOnLoad`オブジェクトのPersistentリスナー。`OnEnable`で`AddPersistentListener`でサブスクライブし、`OnDestroy`で`RemovePersistentListener`で削除する（OnDisableではない。アクティブなオブジェクトのOnDisableはシーン遷移中に発火するため）。

```csharp
// 標準：シーンスコープのリスナー
private void OnEnable()
{
    myEvent.AddListener(HandleEvent);
    myEvent.AddPriorityListener(HandlePriority, 50);
}

private void OnDisable()
{
    myEvent.RemoveListener(HandleEvent);
    myEvent.RemovePriorityListener(HandlePriority);
}

// 例外：DontDestroyOnLoadのPersistentリスナー
private void OnEnable()
{
    myEvent.AddPersistentListener(HandleEvent, 0);
}

private void OnDestroy()
{
    myEvent.RemovePersistentListener(HandleEvent);
}
```

### Auto Static Reset：GES組み込みのデータ汚染防止

GESはAuto Static Resetメカニズムで、ScriptableObjectの永続化問題に対処する。エディタでPlay Modeを終了すると、GESは自動的にクリアする：

- すべてのstaticイベントキャッシュ
- すべてのリスナー登録
- すべてのスケジュールイベントハンドル
- ランタイムで作成されたすべてのトリガーとチェイン接続

Playを押すたびにイベントがクリーンな状態でスタートする。手動のリセットメソッド不要。`[RuntimeInitializeOnLoadMethod]`ハック不要。イベントアセット自体（名前、型、インスペクター設定）はデザインタイムデータなので永続化される。ランタイム状態（リスナー、スケジュール、フロー接続）はプレイタイムデータなのでワイプされる。

この分離は意図的だ。デザインタイムデータはセッション間で永続化されるべき——テストのたびにイベントを再設定したくないから。ランタイムデータは永続化されるべきでない——前のセッションのゴーストリスナーは不要だから。

イベントのサブクラスにカスタム状態（独自のプロパティやフィールド）を保存している場合は、そのリセットを自分で処理する必要がある。Auto Resetが扱うのはGESの内部状態であり、拡張部分は含まない。自分のstaticには`[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]`を使おう。

### 再帰ガードパターン

GESは再帰サイクルを自動的に中断しない。なぜなら、再入的なRaiseが意図的な場合もあるからだ（稀だが、ある）。代わりにガードフラグを使う：

```csharp
private bool _isProcessingHealth;

private void HandleHealthChange(int newHealth)
{
    if (_isProcessingHealth) return;
    _isProcessingHealth = true;

    try
    {
        // ヘルスロジックを処理...

        // 安全：ガードのおかげで再帰しない
        onHealthChanged.Raise(newHealth);
    }
    finally
    {
        _isProcessingHealth = false;
    }
}
```

`try/finally`が重要だ。これがないと、処理ロジック中の例外で`_isProcessingHealth`がtrueのまま永久に固定される。ハンドラはセッションの残りで二度と発火しなくなる。

間接サイクル（AがBをRaise、BがAをRaise）では、両方のハンドラにガードを設けるか、サイクルがフィードバックしない別のイベントを使うよう再構造化する：

```
// 変更前（サイクル）：
OnDamage -> HandleDamage -> OnHealthChangedを発火
OnHealthChanged -> HandleHealth -> OnDamageを発火（反射）

// 変更後（サイクルなし）：
OnDamage -> HandleDamage -> OnHealthChangedを発火
OnHealthChanged -> HandleHealth -> OnReflectedDamageを発火（別イベント）
OnReflectedDamage -> HandleReflected -> OnHealthChangedは発火しない
```

Runtime MonitorのWarningsタブは、処理中に発火されたイベントをフラグ付けする。テスト中に再帰警告が出たら、ガードが必要なサイクルがある。

![Monitor Warnings](/img/game-event-system/tools/runtime-monitor/monitor-warnings.png)

### ハンドル管理：必ず保存し、必ずキャンセル

`RaiseDelayed()`と`RaiseRepeating()`はすべてScheduleHandleを返す。必ず保存する。必ずOnDisableでキャンセルする。

```csharp
// アンチパターン：ハンドルが永遠に失われる
private void StartPoison()
{
    onPoisonTick.RaiseRepeating(10, interval: 1f, count: -1);
    // キャンセルできない。アプリケーション終了まで動き続ける。
}

// 正しい：保存して管理
private ScheduleHandle _poisonHandle;

private void StartPoison()
{
    _poisonHandle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: -1);
}

private void CurePoison()
{
    if (_poisonHandle.IsActive)
        _poisonHandle.Cancel();
}

private void OnDisable()
{
    if (_poisonHandle.IsActive)
        _poisonHandle.Cancel();
}
```

複数の同時スケジュールの場合：

```csharp
private List<ScheduleHandle> _activeSchedules = new List<ScheduleHandle>();

private void ScheduleSomething()
{
    var handle = onEvent.RaiseDelayed(2f);
    _activeSchedules.Add(handle);
}

private void CancelAll()
{
    foreach (var handle in _activeSchedules)
    {
        if (handle.IsActive) handle.Cancel();
    }
    _activeSchedules.Clear();
}

private void OnDisable() => CancelAll();
```

### SetInspectorListenersActive：バッチミューティング

GESイベントはBehavior Windowでビジュアルに設定されたリスナーを持てる。これらはコードリスナーと並行して発火する。バッチ操作中——100アイテムのロード、大量データの処理、状態のリセット——に、パーティクル、サウンド、UIアニメーションをトリガーするビジュアルリスナーが実行されると大変なことになる。

```csharp
myEvent.SetInspectorListenersActive(false);
try
{
    for (int i = 0; i < 100; i++)
    {
        myEvent.Raise(processedItems[i]);
    }
}
finally
{
    myEvent.SetInspectorListenersActive(true);
}

// ビジュアルフィードバック付きの最終Raise
myEvent.Raise(summary);
```

コードリスナーは通常通り発火する。インスペクターで設定されたビジュアルレスポンスだけがミュートされる。`try/finally`によりバッチ処理が例外を投げても確実に再有効化される。

### 外科的な削除：クリーンアップにRemoveAllListenersを使わない

各コンポーネントは自分のリスナーだけを削除すべきだ：

```csharp
// NG: 全員のサブスクリプションを破壊
private void OnDisable()
{
    myEvent.RemoveAllListeners();
}

// OK: 自分が所有するものだけを削除
private void OnDisable()
{
    myEvent.RemoveListener(MyHandler);
    myEvent.RemovePriorityListener(MyOtherHandler);
}
```

`RemoveAllListeners()`が適切なのはグローバルな状態リセットだけ——完全に新しいゲームセッションのロード、テスト後のリセット。Basic、Priority、Conditionalリスナーを削除するが、Persistentリスナーは意図的に残す（それらがクリーンアップを明示的にオプトアウトしているため）。

### デリゲートをキャッシュする

リスナーに対して最も安全なパターンはメソッド参照だ：

```csharp
// NG: 無名ラムダ、削除不可能
onDamage.AddListener((int amount) => health -= amount);

// OK: メソッド参照、安定したアイデンティティ
onDamage.AddListener(HandleDamage);
private void HandleDamage(int amount) => health -= amount;

// これもOK: クロージャが必要な場合のキャッシュされたデリゲート
private System.Action<int> _handler;
private void OnEnable()
{
    _handler = (amount) => health -= amount;
    onDamage.AddListener(_handler);
}
private void OnDisable()
{
    onDamage.RemoveListener(_handler);
}
```

これはすべてのリスナータイプに適用される。削除を予定しているリスナーには安定したデリゲート参照が必要だ。

### Predicateは安く保つ

Conditionalリスナーのpredicateは計算ではなくフィールド読み取りであるべきだ：

```csharp
// NG: イベント発火のたびにフィジックスクエリ
onPositionUpdate.AddConditionalListener(
    HandleNearby,
    () => Physics.OverlapSphere(transform.position, 10f).Length > 0,
    priority: 50
);

// OK: 定期的にキャッシュを更新し、安く読み取る
private bool _hasNearbyEnemies;

private void FixedUpdate()
{
    _hasNearbyEnemies = Physics.OverlapSphere(
        transform.position, 10f, enemyLayer).Length > 0;
}

onPositionUpdate.AddConditionalListener(
    HandleNearby,
    () => _hasNearbyEnemies,
    priority: 50
);
```

FixedUpdateあたり1回のフィジックスクエリ vs イベント発火あたり1回。フレーム内で複数回発火するイベントでは、スムーズなゲームプレイとカクつく地獄の違いになる。

## アーキテクチャパターン：サービスイベントインターフェース

大規模プロジェクトでは、各サブシステムのイベントワイヤリングを専用のインターフェースクラスに集約する：

```csharp
public class CombatEventInterface : MonoBehaviour
{
    [Header("Outgoing Events")]
    [GameEventDropdown, SerializeField] private Int32GameEvent onDamageDealt;
    [GameEventDropdown, SerializeField] private SingleGameEvent onCombatStarted;
    [GameEventDropdown, SerializeField] private SingleGameEvent onCombatEnded;

    [Header("Incoming Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayerDied;
    [GameEventDropdown, SerializeField] private Int32GameEvent onHealReceived;

    private CombatSystem _combat;

    private void OnEnable()
    {
        _combat = GetComponent<CombatSystem>();
        onPlayerDied.AddPriorityListener(_combat.HandlePlayerDeath, 100);
        onHealReceived.AddPriorityListener(_combat.HandleHeal, 100);
    }

    private void OnDisable()
    {
        onPlayerDied.RemovePriorityListener(_combat.HandlePlayerDeath);
        onHealReceived.RemovePriorityListener(_combat.HandleHeal);
    }

    public void NotifyDamageDealt(int amount) => onDamageDealt.Raise(amount);
    public void NotifyCombatStarted() => onCombatStarted.Raise();
    public void NotifyCombatEnded() => onCombatEnded.Raise();
}
```

CombatSystem自体はGESについて何も知らない。CombatEventInterfaceのメソッドを呼ぶだけだ。これにより戦闘システムがイベントなしでテスト可能になり、イベントワイヤリングが1つのファイルで監査可能になる。何か問題が起きた時、戦闘システムが触れるすべてのイベントを1つのクラスで確認できる。

## リリース前チェックリスト

イベントアーキテクチャが本番対応と見なす前に、これらを確認しよう：

1. すべての`AddListener`に対応する`RemoveListener`が反対のライフサイクルメソッドにある
2. すべての`AddPersistentListener`に`RemovePersistentListener`が`OnDestroy`にある
3. すべての`RaiseDelayed` / `RaiseRepeating`ハンドルが保存され、`OnDisable`でキャンセルされている
4. 削除が必要なリスナーにラムダが使われていない（デリゲートキャッシュかメソッド参照のみ）
5. ガードフラグなしの再帰イベントパターンがない
6. `RemoveAllListeners()`はグローバルリセットのみに使用、コンポーネントごとのクリーンアップには使わない
7. Conditionalのpredicateが安い（フィールド読み取り、計算ではない）
8. 高頻度イベントのリスナー数が最小限
9. バッチ操作中にインスペクターリスナーがミュートされている
10. フルプレイスルー中にRuntime Monitorが警告を表示しない

この10のチェックで、イベントシステムバグの95%をプレイヤーに届く前にキャッチできる。残りの5%はイベントシステムの問題ではなくゲームコードのロジックバグ——そしてRuntime Monitorがそれらの発見も助けてくれる。

これらすべてに共通するパターンは同じだ：イベントシステムは物事を分離するからこそパワフルだ。しかし分離は、結合なら明白にしてくれるミスをコンパイラがキャッチできないことを意味する。規律を自分で強制するか、あるいは強制してくれるシステムを使うか——それが問われている。

---

🚀 グローバル開発者サービス

**🇨🇳 中国開発者コミュニティ**
- 🛒 [Unity 中国アセットストア](https://tinygiants.tech/ges/cn)
- 🎥 [Bilibili動画チュートリアル](https://tinygiants.tech/bilibili)
- 📘 [技術ドキュメント](https://tinygiants.tech/docs/ges)
- 💬 QQグループ (1071507578)

**🌐 グローバル開発者コミュニティ**
- 🛒 [Unity Global Asset Store](https://tinygiants.tech/ges)
- 💬 [Discord コミュニティ](https://tinygiants.tech/discord)
- 🎥 [YouTube チャンネル](https://tinygiants.tech/youtube)
- 🎮 [Unity フォーラム](https://tinygiants.tech/forum/ges)
- 🐙 [GitHub](https://github.com/tinygiants-tech/TinyGiants)

**📧 サポート**
- 🌐 [TinyGiants Studio](https://tinygiants.tech)
- ✉️ [サポートメール](mailto:support@tinygiants.tech)
