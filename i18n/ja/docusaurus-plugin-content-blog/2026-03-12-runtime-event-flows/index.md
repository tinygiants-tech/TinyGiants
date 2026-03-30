---
slug: programmatic-flow-api
title: 'ランタイムでイベントフローを構築する：ビジュアルエディタでは足りない時'
authors: [tinygiants]
tags: [ges, unity, scripting, flow-graph, advanced]
description: "プロシージャルダンジョン、動的AI、MODサポート——エディタ時点では設計できないイベントフローがある。コードだけでイベントグラフを構築・組み合わせ・破棄する方法を解説します。"
image: /img/home-page/game-event-system-preview.png
---

プロシージャルダンジョンジェネレータが3つの感圧板とスパイクトラップのある部屋を生成した。次の部屋にはロックされたドアに繋がるレバーパズル。その次の部屋はボスアリーナで、ボスのヘルスフェーズに応じて環境ハザードが起動する。これらのイベントリレーションシップはエディタ時点では存在しなかった。ダンジョンレイアウトはプレイヤーが30秒前に入力したシードで決定されたものだ。

イベントをどうワイヤリングする？

従来のアプローチでは、巨大なswitch文を書く。各部屋タイプごとに手動でイベントハンドラをサブスクライブ・アンサブスクライブする。各AIの難易度ごとに手動で異なる攻撃パターンをチェインする。各MODコンテンツごとに手動でコンフィグファイルをパースしてイベント接続に変換する。「手動」の部分が問題だ——ランタイムでトポロジーが変わるたびにイベントワイヤリングロジックを再実装している。

ビジュアルノードエディタはデザインタイムで分かっているフローに最適だ。しかしゲームが実行されるまで存在しないフローを根本的に扱えない。そしてますます、最も興味深いゲームシステムはイベントグラフが動的なものだ。

<!-- truncate -->

## プロシージャルコンテンツの問題

具体的に考えよう。ローグライクを作っている。各ランは部屋テンプレートのプールから15～25の部屋を生成する。各テンプレートは部屋内のインタラクティブオブジェクト——感圧板、レバー、ドア、トラップ、宝箱、敵スポナー——を定義する。しかしこれらのオブジェクト間の*接続*は、ジェネレータが生成する具体的なレイアウトに依存する。

部屋テンプレートAには感圧板とスパイクトラップがある。あるランでは、感圧板が1秒の遅延でスパイクをトリガーする。別のラン（異なる難易度）では、同じテンプレートが遅延なしで即座にスパイクをトリガーし、0.5秒前に警告音を追加する。テンプレートは同じ。イベントワイヤリングが異なる。

チームは通常どう対処するか？

### If-Elseアプローチ

```csharp
public void WireRoom(Room room, DifficultySettings difficulty)
{
    if (room.HasPressurePlate && room.HasSpikeTrap)
    {
        if (difficulty.level == Difficulty.Easy)
        {
            room.pressurePlate.onActivated += () =>
            {
                PlayWarningSound();
                StartCoroutine(DelayedSpikes(room.spikeTrap, 1.5f));
            };
        }
        else if (difficulty.level == Difficulty.Hard)
        {
            room.pressurePlate.onActivated += () =>
            {
                room.spikeTrap.Activate();
            };
        }
    }

    if (room.HasLever && room.HasDoor)
    {
        room.lever.onPulled += () => room.door.Open();

        if (difficulty.level == Difficulty.Hard)
        {
            room.lever.onPulled += () =>
            {
                StartCoroutine(ResetLever(room.lever, 5f));
            };
        }
    }

    // ... 他の組み合わせに対してさらに200行
}
```

小規模なゲームならこれで動く。30の部屋テンプレートと4つの難易度があるローグライクでは、数百行の条件付きワイヤリングコードになる。新しい部屋テンプレートを追加するたびにこのメソッドを更新。新しいインタラクティブオブジェクトタイプを追加するたびに再度更新。ラムダのサブスクリプションは？ 部屋が破棄された時にきれいにアンサブスクライブできない。メモリリークが構造に組み込まれている。

### データドリブンアプローチ（良いが、まだ辛い）

一部のチームはデータドリブンモデルに移行する——接続を定義するJSONやScriptableObjectコンフィグ：

```json
{
    "room_type": "trap_room",
    "connections": [
        {
            "source": "pressure_plate",
            "target": "spike_trap",
            "delay": 1.0,
            "condition": "player_in_range"
        }
    ]
}
```

アーキテクチャ的にはクリーンだが、カスタムパーサー、カスタム接続マネージャー、カスタム条件評価、カスタムライフサイクル管理が必要になる。イベントシステムの上にミニイベントシステムを構築しているようなものだ。しかも静的な部分で使っているビジュアルエディタとは統合されない。

### 理想

本当に欲しいのは、ビジュアルイベントエディタと同じパワー——トリガー、チェイン、条件、遅延、引数受け渡し——をコードからアクセスできること。フローをプログラム的に構築し、ビジュアルフローと混在させ、完了したら破棄する。同じパイプライン、同じ実行保証、異なるインターフェース。

## AIビヘイビアの問題

プロシージャルレベルだけがユースケースではない。AIの振る舞いは本質的に動的だ。

イージーモードの敵：2秒間攻撃を予告し、攻撃し、3秒待ち、繰り返す。イベントチェインはシンプルで予測可能。

ハードモードの敵：0.5秒の予告、攻撃がコンボに繋がり、コンボフィニッシャーが環境ハザードをトリガーし、正確なコンボシーケンスはプレイヤーの位置と残りヘルスに依存する。イベントチェインは複雑で遭遇ごとに変わる。

ボス戦はさらに厄介だ。フェーズ1：シンプルな攻撃パターン。フェーズ2：新しい攻撃がアンロックされ、古いパターンが速くなる。フェーズ3：範囲攻撃ハザードにチェインする絶望技。各フェーズ遷移が攻撃イベントグラフ全体を再配線する。

各フェーズを個別のメソッドにハードコードすることは可能だが、イベント間の接続——「攻撃がヒットしたら0.2秒後に画面を揺らし、HPが30%以下なら1秒後に範囲ダメージをトリガー」——はまさにイベントフローシステムが扱うべきものだ。問題はフローのトポロジーがランタイムで変わることだ。

## MODサポートの問題

これはますます重要になっている。ゲームがMODをサポートする場合、プレイヤーはカスタムコンテンツ用にイベントリレーションシップを定義する必要がある。MODDERが新しいトラップタイプを作成した。既存のゲームイベントにワイヤリングする必要がある——例えば「プレイヤーがトリガーゾーンに入ったら、カスタムアニメーションを再生し、アニメーション完了後にダメージを与える」。

ビジュアルエディタは使えない（開発ツールであり、プレイヤー向けツールではない）。同じ機能を提供するコードまたはコンフィグインターフェースが必要だ。イベントシステムの機能がGUIの背後にロックされていると、MODDERは締め出される。

## GESのプログラマティックフローAPI

GESのビジュアルノードエディタで利用可能なすべての機能に、対応するコードAPIがある。完全な機能パリティだ。ビジュアルエディタは直接呼び出せるのと同じメソッドのGUIラッパーだ。つまりビジュアルエディタで学んだことはコードに1:1で変換でき、その逆も然り。

### トリガーの構築：並列ファンアウト

トリガーイベントとは：イベントAが発火したら、イベントBも（同時に）発火する。APIの全体像：

```csharp
[GameEventDropdown, SerializeField] private SingleGameEvent onDoorOpened;
[GameEventDropdown, SerializeField] private SingleGameEvent onLightsOn;
[GameEventDropdown, SerializeField] private SingleGameEvent onAlarmDisabled;

private void SetupRoom()
{
    // ドアが開くと、ライトとアラームが同時に反応
    TriggerHandle h1 = onDoorOpened.AddTriggerEvent(targetEvent: onLightsOn);
    TriggerHandle h2 = onDoorOpened.AddTriggerEvent(targetEvent: onAlarmDisabled);
}
```

フルシグネチャではビジュアルエディタのすべてのオプションが使える：

```csharp
TriggerHandle handle = sourceEvent.AddTriggerEvent(
    targetEvent: targetEvent,
    delay: 0f,                          // ターゲットが発火するまでの秒数
    condition: () => isNightTime,       // 条件ゲート
    passArgument: true,                 // ソースの引数をターゲットに転送
    argumentTransformer: null,          // 型間で引数を変換
    priority: 0                         // トリガー間の順序
);
```

**delay** — ソースが発火してからターゲットが発火するまでの待機時間。ゼロは同一フレーム。

```csharp
// ドアが開き、0.5秒後にライトが点灯
onDoorOpened.AddTriggerEvent(
    targetEvent: onLightsOn,
    delay: 0.5f
);
```

**condition** — セットアップ時ではなくRaise時に評価される条件。無条件の場合はnullを渡す。

```csharp
// 夜間の場合のみライトをトリガー
onDoorOpened.AddTriggerEvent(
    targetEvent: onLightsOn,
    condition: () => TimeOfDayManager.IsNight
);
```

**passArgument** — ソースイベントのデータをターゲットに転送。型の互換性が重要。

```csharp
// ソースがダメージ量でRaise、ターゲットも同じ値を受け取る
onPlayerHit.AddTriggerEvent(
    targetEvent: onDamageNumberSpawn,
    passArgument: true
);
```

**argumentTransformer** — ソースとターゲットの型が異なる場合、または値を変換する必要がある場合。

```csharp
// ソースはint型のダメージを送信、ターゲットはUI用のfloat型スケールを期待
onPlayerHit.AddTriggerEvent(
    targetEvent: onDamageScale,
    passArgument: true,
    argumentTransformer: (object arg) => (float)(int)arg / 100f
);
```

返されるTriggerHandleは後のクリーンアップ用の参照：

```csharp
// ハンドルを保存
TriggerHandle handle = sourceEvent.AddTriggerEvent(targetEvent: targetEvent);

// 後で: この特定の接続を削除
sourceEvent.RemoveTriggerEvent(handle);
```

![Trigger Flow Graph](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

### チェインの構築：逐次ブロッキング実行

チェインイベントとは：イベントAが発火し、遅延後にイベントBが発火し、Bのリスナーが完了した後にイベントCが発火する。逐次的、順序付き、タイミング制御付き。

```csharp
ChainHandle handle = sourceEvent.AddChainEvent(
    targetEvent: targetEvent,
    delay: 1f,                    // このステップが発火するまでの間隔
    duration: 2f,                 // このステップが「アクティブ」な時間
    condition: null,              // 条件ゲート
    passArgument: true,           // 引数を転送
    argumentTransformer: null,    // 引数を変換
    waitForCompletion: false      // リスナー完了まで待機？
);
```

チェイン固有のパラメータ：

**delay** — ソースが発火してからこのチェインステップが実行されるまでの間隔。

**duration** — このステップが「アクティブ」と見なされる時間。複数のチェインが連続接続されている場合、全体のフロータイミングに影響する。

**waitForCompletion** — trueの場合、チェインシステムはターゲットイベントのすべてのリスナーが完了するまで待機してから後続のステップに進む。これが「ブロッキング」の部分だ。

```csharp
// ボスシーケンス：アニメーション再生（完了を待つ）、その後敵をスポーン
onBossPhaseStart.AddChainEvent(
    targetEvent: onPlayBossAnimation,
    delay: 0f,
    duration: 3f,
    waitForCompletion: true
);

onPlayBossAnimation.AddChainEvent(
    targetEvent: onSpawnAdds,
    delay: 0.5f,
    duration: 0f,
    waitForCompletion: false
);
```

![Chain Flow Graph](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

### ビジュアルとプログラマティックフローの混在

ここでアーキテクチャの真価が発揮される。基本のフローグラフをビジュアルに設計し——デザインタイムで既知の静的な接続を。そしてランタイムで動的な接続をその上にレイヤリングする。すべて同じパイプラインで実行される。

```csharp
public class DifficultyFlowManager : MonoBehaviour
{
    [Header("Base Events (connected visually in editor)")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemySpawned;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemyAttackWindup;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemyAttackStrike;

    [Header("Hard Mode Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onComboFollowUp;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnvironmentHazard;

    private List<TriggerHandle> _hardModeHandles = new List<TriggerHandle>();

    public void EnableHardMode()
    {
        _hardModeHandles.Add(onEnemyAttackStrike.AddTriggerEvent(
            targetEvent: onComboFollowUp,
            delay: 0.3f,
            condition: () => Random.value > 0.5f
        ));

        _hardModeHandles.Add(onComboFollowUp.AddTriggerEvent(
            targetEvent: onEnvironmentHazard,
            delay: 0.1f
        ));
    }

    public void DisableHardMode()
    {
        foreach (var handle in _hardModeHandles)
            handle.Source.RemoveTriggerEvent(handle);
        _hardModeHandles.Clear();
    }
}
```

ビジュアルエディタの接続は常に存在する——アセットに組み込まれている。プログラマティックな接続はその上にレイヤリングされ、ビジュアルグラフに影響を与えずに追加・削除できる。「設計された振る舞い」と「動的な振る舞い」がきれいに分離される。

## ハンドルベースのクリーンアップパターン

複雑な動的フローを構築すると、ハンドルが蓄積される。リークした接続を防ぐために、きれいに管理することが不可欠だ。本番環境で機能するパターンを紹介する。

### パターン1：リストコレクション

一括で追加・削除される接続のセット用：

```csharp
private List<TriggerHandle> _triggerHandles = new List<TriggerHandle>();
private List<ChainHandle> _chainHandles = new List<ChainHandle>();

private void BuildFlow()
{
    _triggerHandles.Add(eventA.AddTriggerEvent(targetEvent: eventB));
    _triggerHandles.Add(eventA.AddTriggerEvent(targetEvent: eventC));
    _chainHandles.Add(eventB.AddChainEvent(targetEvent: eventD, delay: 1f));
}

private void TearDownFlow()
{
    foreach (var h in _triggerHandles)
        h.Source.RemoveTriggerEvent(h);
    foreach (var h in _chainHandles)
        h.Source.RemoveChainEvent(h);

    _triggerHandles.Clear();
    _chainHandles.Clear();
}
```

### パターン2：フローコンテキストオブジェクト

構造化されたライフサイクル管理が必要な複雑なフロー用：

```csharp
public class EventFlowContext : System.IDisposable
{
    private List<TriggerHandle> _triggers = new List<TriggerHandle>();
    private List<ChainHandle> _chains = new List<ChainHandle>();

    public void AddTrigger(TriggerHandle handle) => _triggers.Add(handle);
    public void AddChain(ChainHandle handle) => _chains.Add(handle);

    public void Dispose()
    {
        foreach (var h in _triggers)
            h.Source.RemoveTriggerEvent(h);
        foreach (var h in _chains)
            h.Source.RemoveChainEvent(h);
        _triggers.Clear();
        _chains.Clear();
    }
}
```

```csharp
private EventFlowContext _currentPhaseFlow;

private void SetupBossPhase(int phase)
{
    _currentPhaseFlow?.Dispose();
    _currentPhaseFlow = new EventFlowContext();

    switch (phase)
    {
        case 1:
            _currentPhaseFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onShieldPulse, delay: 0.5f));
            break;
        case 2:
            _currentPhaseFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onRageSwipe,
                condition: () => bossHealth < 0.5f));
            _currentPhaseFlow.AddChain(onRageSwipe.AddChainEvent(
                targetEvent: onSummonAdds, delay: 2f));
            break;
        case 3:
            _currentPhaseFlow.AddTrigger(onBossAttack.AddTriggerEvent(
                targetEvent: onDesperationBlast));
            _currentPhaseFlow.AddTrigger(onDesperationBlast.AddTriggerEvent(
                targetEvent: onScreenFlash));
            _currentPhaseFlow.AddChain(onDesperationBlast.AddChainEvent(
                targetEvent: onAreaDamage, delay: 1f, waitForCompletion: true));
            break;
    }
}

private void OnDestroy()
{
    _currentPhaseFlow?.Dispose();
}
```

各ボスフェーズ遷移が前のフローをDisposeして新しいものを構築する。リークした接続はない。フェーズ1の古いイベントワイヤリングがフェーズ3の間に残ることもない。

## 完全な例：プロシージャルダンジョンのイベントワイヤリング

イントロダクションのローグライクダンジョンシステムを構築しよう。各部屋タイプが独自のイベントワイヤリングを持ち、すべてランタイムで決定される。

```csharp
public class DungeonRoom
{
    public RoomType Type;
    public SingleGameEvent OnPlayerEntered;
    public SingleGameEvent OnPlayerExited;
    public SingleGameEvent OnRoomCleared;
    public Int32GameEvent OnDamageInRoom;
    public List<SingleGameEvent> RoomSpecificEvents;
}

public class DungeonEventWiring : MonoBehaviour
{
    [Header("Shared Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onDungeonStarted;
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayerDied;
    [GameEventDropdown, SerializeField] private Int32GameEvent onPlayerDamaged;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBossDefeated;

    [Header("Effect Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayTrapSound;
    [GameEventDropdown, SerializeField] private SingleGameEvent onSpawnTreasureParticles;
    [GameEventDropdown, SerializeField] private SingleGameEvent onStartBossMusic;
    [GameEventDropdown, SerializeField] private SingleGameEvent onStopBossMusic;
    [GameEventDropdown, SerializeField] private SingleGameEvent onScreenShake;

    private Dictionary<DungeonRoom, EventFlowContext> _roomFlows
        = new Dictionary<DungeonRoom, EventFlowContext>();

    public void WireRoom(DungeonRoom room)
    {
        var flow = new EventFlowContext();

        switch (room.Type)
        {
            case RoomType.Trap:
                WireTrapRoom(room, flow);
                break;
            case RoomType.Treasure:
                WireTreasureRoom(room, flow);
                break;
            case RoomType.Boss:
                WireBossRoom(room, flow);
                break;
            case RoomType.Safe:
                break;
        }

        _roomFlows[room] = flow;
    }

    private void WireTrapRoom(DungeonRoom room, EventFlowContext flow)
    {
        // プレイヤーが入る -> 1秒後にトラップ発動（部屋クリア前のみ）
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: room.OnDamageInRoom,
            delay: 1f,
            condition: () => !room.OnRoomCleared.HasFired()
        ));

        // 部屋ダメージ -> 画面シェイク + トラップ音
        flow.AddTrigger(room.OnDamageInRoom.AddTriggerEvent(
            targetEvent: onScreenShake
        ));
        flow.AddTrigger(room.OnDamageInRoom.AddTriggerEvent(
            targetEvent: onPlayTrapSound,
            delay: 0.1f
        ));

        // 部屋ダメージをプレイヤーダメージシステムに転送
        flow.AddTrigger(room.OnDamageInRoom.AddTriggerEvent(
            targetEvent: onPlayerDamaged,
            passArgument: true
        ));
    }

    private void WireTreasureRoom(DungeonRoom room, EventFlowContext flow)
    {
        // プレイヤーが入る -> キラキラパーティクル
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: onSpawnTreasureParticles
        ));

        // チェイン：入室 -> 2秒待機 -> 部屋クリア
        flow.AddChain(room.OnPlayerEntered.AddChainEvent(
            targetEvent: room.OnRoomCleared,
            delay: 2f
        ));
    }

    private void WireBossRoom(DungeonRoom room, EventFlowContext flow)
    {
        // 入室 -> ボスBGM
        flow.AddTrigger(room.OnPlayerEntered.AddTriggerEvent(
            targetEvent: onStartBossMusic
        ));

        // ボス撃破 -> チェイン：BGM停止 -> シェイク -> 部屋クリア
        flow.AddChain(onBossDefeated.AddChainEvent(
            targetEvent: onStopBossMusic,
            delay: 0.5f,
            waitForCompletion: true
        ));
        flow.AddChain(onStopBossMusic.AddChainEvent(
            targetEvent: onScreenShake,
            delay: 0.2f
        ));
        flow.AddChain(onScreenShake.AddChainEvent(
            targetEvent: room.OnRoomCleared,
            delay: 1f
        ));

        // セーフティネット：ボス部屋を出たらBGM停止
        flow.AddTrigger(room.OnPlayerExited.AddTriggerEvent(
            targetEvent: onStopBossMusic
        ));
    }

    public void UnwireRoom(DungeonRoom room)
    {
        if (_roomFlows.TryGetValue(room, out var flow))
        {
            flow.Dispose();
            _roomFlows.Remove(room);
        }
    }

    public void UnwireAllRooms()
    {
        foreach (var flow in _roomFlows.Values)
            flow.Dispose();
        _roomFlows.Clear();
    }

    private void OnDestroy()
    {
        UnwireAllRooms();
    }
}
```

![Monitor Automation Tree](/img/game-event-system/tools/runtime-monitor/monitor-automation-tree.png)

これが何をもたらすか見てほしい。プロシージャルジェネレータが部屋を作成し`WireRoom()`を呼ぶ。各部屋は必要なイベント接続を正確に取得する。部屋がアンロードされるかランが終了すると、`UnwireRoom()`か`UnwireAllRooms()`がすべてをクリーンアップする。リークしたデリゲートなし、孤立した接続なし、どのラムダがどこでサブスクライブされたかの手動追跡なし。

部屋固有のイベント（`OnPlayerEntered`、`OnDamageInRoom`）はグローバル共有イベント（`onPlayerDamaged`、`onScreenShake`）と共存する。ローカルスコープとグローバルスコープが動的にワイヤリングされ、同じハンドルベースのクリーンアップパターンで管理される。

## 条件はリーンに保つ

条件付きの動的フローを構築する際の重要な注意点。条件の述語はソースイベントが発火するたびに実行される。セットアップ時だけではない。高頻度イベントでは、述語のコストが重要になる。

```csharp
// 良い: シンプルなフィールド比較、コストほぼゼロ
condition: () => isAlive && currentPhase == BossPhase.Rage

// 悪い: 述語内でのアロケーション、イベント発火ごとに実行される
condition: () => GetAllEnemies().Where(e => e.IsAlive).Count() > 5

// より良い: 結果をキャッシュし、キャッシュをチェック
condition: () => aliveEnemyCount > 5
```

プロシージャルダンジョンのワイヤリングでは、部屋のイベントが毎秒60回発火することはないので、これが問題になることは稀だ。しかしフィジックスやムーブメントイベント用の動的フローを構築する場合は、述語をシンプルなフィールド読み取りに留めよう。

## ビジュアル vs プログラマティックの使い分け

**ビジュアルエディタ**を使う場合：
- フローがデザインタイムで分かっている
- デザイナーが読み取りや修正をする必要がある
- リコンパイルなしで素早くイテレーションしたい
- 接続がビルド間で安定している

**プログラマティックAPI**を使う場合：
- フローがランタイムの状態に依存する
- プロシージャル生成がグラフを決定する
- AIシステムが動的にビヘイビアを合成する
- 他のコードシステムとの密結合が必要
- フローが一時的——ゲームプレイ中に作成・破棄される

**両方を混在**させる場合：
- 安定したベース（ビジュアル）に動的拡張（コード）がある
- 一部の接続はデザイナー向け、他はプログラマー向け
- 静的な部分のビジュアルな明快さと、動的な部分のコードの柔軟性が欲しい

プログラマティックAPIはビジュアルエディタの代替ではない。同じシステムのもう半分だ。合わせて、「デザイナーがエディタでワイヤーをドラッグする」から「AIディレクターがプレイヤーのスキル分析に基づいてランタイムで攻撃グラフ全体を再配線する」まで、全スペクトラムをカバーする。

同じパイプライン。同じ実行保証。同じハンドルベースのライフサイクル。グラフを構築する方法が異なるだけだ。

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
