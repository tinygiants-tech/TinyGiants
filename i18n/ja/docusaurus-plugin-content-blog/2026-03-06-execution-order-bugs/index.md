---
slug: listener-strategies-deep-dive
title: '実行順序のバグ：「誰が先に反応するか」に潜む危険'
authors: [tinygiants]
tags: [ges, unity, scripting, advanced, best-practices]
description: "UIがデータ更新より先にリフレッシュされたら、それは実行順序のバグです。C#イベントがこの問題を不可避にする理由と、決定論的なリスナーパイプラインで解決する方法を解説します。"
image: /img/home-page/game-event-system-preview.png
---

プレイヤーが25ダメージを受ける。ヘルスシステムが現在のHPからダメージを差し引く。UIがヘルスバーを更新する。...はずが、ヘルスバーに表示されるのは75ではなく100。20分間コードを見つめた末に気づく。UIのリスナーがヘルスシステムのリスナーより先に実行されていた。UIは古いHP値を読み取り、それを描画し、その後にヘルスシステムがデータを更新した。データが正しくなった頃には、フレームはすでに描画済みだった。

あなたが発見したのは実行順序バグだ。イベント駆動アーキテクチャで何かをリリースした経験があるなら、気づかないうちにこのバグをいくつも出荷している可能性が高い。テスト中はスクリプトがたまたま正しい順序で初期化されたから動いていただけで、本番環境ではUnityのロード順が変わって壊れる——そういう類のバグだ。

これはレアなエッジケースではない。ほとんどのイベントシステム——Unityの`UnityEvent`や標準のC# `event`デリゲートを含む——が持つ構造的な欠陥だ。そして一度理由を理解してしまうと、もう元には戻れない。

<!-- truncate -->

## 登録順序が最悪の実行戦略である理由

素のC#イベントシステムでは、リスナーは登録された順に実行される。先にサブスクライブしたものが先に呼ばれる。合理的に聞こえるが、「登録順序」が実際に何に依存しているかを考えると話が変わる。

Unityでは、ほとんどのサブスクリプションは`Awake()`か`OnEnable()`で行われる。これらの実行順序は以下に依存する：

1. **Script Execution Order** — Project Settingsで設定可能だが、30以上のスクリプトに対して実際にやっている人がいるだろうか？
2. **GameObjectの生成順序** — シーンのヒエラルキー位置に依存し、誰かがScene Viewで並べ替えるたびに変わる。
3. **Prefabのインスタンス化タイミング** — ランタイムで生成されたオブジェクトはシーンオブジェクトより遅くサブスクライブする。
4. **AddComponentの順序** — 動的に構築されたオブジェクトでは、コンポーネントの順序がライフサイクルのタイミングを決定する。

つまり、リスナーの実行順序はシーンヒエラルキー、インスタンス化タイミング、Script Execution Order設定、コンポーネントの順序に依存する。ヒエラルキーでGameObjectを移動したら？ 振る舞いが変わるかもしれない。Prefabのインスタンス化を1フレーム遅らせたら？ 実行順序が変わる。Prefabの代わりにAddComponentを使うようリファクタリングしたら？ すべてがずれる。

これが「UIが古いデータを表示する」バグが頻発する理由だ。コードが間違っているのではない——暗黙の順序が脆弱で、ロジックとは無関係な理由で変わってしまうのだ。

## 「データが先、ビューが後」——誰もが知っているのに誰も強制しない問題

すべてのゲーム開発者がこの原則を知っている：まずデータを更新し、それから描画する。モデルが先、ビューが後。状態変更が先、表示が後。コンピュータサイエンスの基本中の基本だ。

しかし、C#イベントでこれをどう強制するのか？

```csharp
// HealthSystem.cs内
private void OnEnable()
{
    onPlayerDamaged += ApplyDamage; // HPを変更
}

// HealthBarUI.cs内
private void OnEnable()
{
    onPlayerDamaged += RefreshHealthBar; // HPを読み取り
}
```

どちらが先に実行される？ `OnEnable()`が先に発火した方だ。どの`OnEnable()`が先に発火する？ Script Execution Orderに依存する。保証できる？ ある程度は——Project SettingsでScript Execution Orderを設定できる。2つのスクリプトなら。同じイベントを15のシステムがリッスンしている場合は？

Script Execution Orderはスケールしない。新しいシステムを追加するたびに壊れる相対順序の悪夢のマトリクスが出来上がる。しかも`Awake`/`OnEnable`/`Start`の順序にしか影響せず、実際のデリゲート呼び出し順序（`+=`の呼び出し順に依存）には影響しない。

素のC#イベントでの本当の答えは：強制できない。ただ祈るだけだ。

## 条件付き実行：誰も語らないパフォーマンス問題

もっと微妙な問題がある。`FixedUpdate`ごとに発火するフィジックス関連のイベントがあるとする。`onCollisionDetected`や`onPositionUpdated`のようなもので、毎秒50回発火する。

このイベントを8つのシステムがリッスンしているが、ほとんどは特定の条件にしか関心がない：
- ダメージシステムは敵との衝突にしか関心がない
- サウンドシステムは衝撃力が閾値を超えた場合にしか関心がない
- パーティクルシステムは特定のマテリアルタイプにしか関心がない
- AIシステムはプレイヤーが関与している場合にしか関心がない

標準のC#イベントでは、8つのリスナーすべてが毎回実行される。各リスナーが内部で条件をチェックし、該当しなければ即座にリターンする。毎秒50回、8つのメソッド呼び出し、8つの条件チェック、8つの潜在的なキャッシュミス。イベントたった1つで。

```csharp
private void HandleCollision(CollisionData data)
{
    if (!data.InvolvesEnemy()) return; // ほとんどの呼び出しはここで終了

    // 実際にはめったに実行されない処理
    ApplyDamage(data);
}
```

チェック自体は安い。確かに。しかし「安い x 毎秒400回 x 8リスナー」は積み重なる。特にモバイルでは。「関数に入って、条件をチェックして、即座にリターン」というパターンは設計上無駄だ。何もしないために関数呼び出しのオーバーヘッドを払っている。

本当に欲しいのは「この条件がtrueでない限り呼び出すな」という仕組みだ。ポストフィルタではなくプリフィルタ。

## クロスシーンの永続化：AudioManagerの問題

すべてのUnityプロジェクトにAudioManagerがある。`DontDestroyOnLoad`オブジェクト上に存在する。すべてのシーンからのイベントに応じてサウンドを再生する必要がある。ヒットサウンド、デスサウンド、ピックアップサウンド——すべてゲームプレイイベントがトリガーだ。

標準のC#イベントでは、これが問題になる。新しいシーンをロードすると：

1. すべてのシーンオブジェクトが破棄され、イベントサブスクリプションも消える。
2. 新しいシーンオブジェクトが新しいイベントインスタンスで作成される。
3. AudioManagerのサブスクリプションは古いイベントインスタンスに対するものだった。消えてしまう。

つまりAudioManagerはシーンロードごとにイベントを再サブスクライブしなければならない。すべてのシーンのすべてのイベントについて知っている必要がある。あらゆるものへの参照を持つゴッドオブジェクトになってしまう。

あるいはstaticイベントを使うと、別の問題が生じる：AudioManagerはいつサブスクライブする？ `Awake()`でサブスクライブする場合、すべてのイベントはもう存在している？ まだロードされていないScriptableObjectで定義されたイベントは？ シーン固有のイベントインスタンスは同じIDで再生成される？

一般的な回避策——staticイベントバス、Service Locator、登録APIを持つシングルトンマネージャー——はどれも機能するが、アーキテクチャ的な重さが増す。AudioManagerがシーン管理について知る必要はないはずだ。「このイベントを永遠にリッスンしたい、どのシーンにいても」と言えるだけでいい。

## ラムダの罠：C#のサイレントメモリリーク

経験豊富なC#開発者でもハマるやつだ。

```csharp
private void OnEnable()
{
    onDamage += (int amount) => currentHealth -= amount;
}

private void OnDisable()
{
    // アンサブスクライブするには？ できない。
    onDamage -= (int amount) => currentHealth -= amount;
    // これは新しいデリゲートを生成する。元のものとは一致しない。
}
```

すべてのラムダ式は新しいデリゲートインスタンスを生成する。コードが文字単位で同一であっても、`RemoveListener`はメモリ上で別のオブジェクトなのでマッチできない。元のデリゲートはまだサブスクライブされたままで、MonoBehaviourへの参照を保持し続け、GCはどちらも回収できない。

10のシステムで5つのシーンにまたがってこれをやると、20～30分のプレイ後にようやく顕在化するメモリリークが発生する。ロードされたシーンの数と順序に依存するため、QAが安定して再現できない類のリークだ。

修正は知ってしまえば明白——デリゲートをキャッシュするかメソッド参照を使う——だが、言語が危険なバージョンを自然に見せ、安全なバージョンを冗長に見せている。成功のピットではなく、失敗のピットだ。

## リスナーシステムに本当に求められるもの

一歩引いて要件を整理しよう：

1. **決定論的な順序**: データロジックがビューロジックより先に実行される。常に。登録タイミングに関係なく。
2. **条件付きフィルタリング**: 関心のないリスナーは呼び出さない。ポストフィルタではなくプリフィルタ。
3. **クロスシーンの永続化**: 一部のリスナーはシーンロードをまたいで、再サブスクリプションなしに永続化する必要がある。
4. **クリーンなライフサイクル**: サブスクライブ、アンサブスクライブ、ダングリングリファレンスなし、サイレントリークなし。
5. **コンポーザビリティ**: 同じイベント上で異なるリスナー戦略を衝突なく混在させる。

標準のC#イベントは注意深く使えば#4だけ提供し、他は何も提供しない。UnityEventはインスペクターサポート付きの#4を提供するが、他は同様にない。このギャップをGESのリスナーシステムが埋める。

## GESの4つのリスナータイプ

GESは4つの異なるリスナー戦略を提供し、それぞれ特定のアーキテクチャ上のニーズに対応する。決定論的な6レイヤーパイプラインで実行されるため、順序は常に保証される。

### レイヤー1：Basic Listeners（FIFO）

デフォルト。サブスクライブして、コールバックを受け取って、終了。

```csharp
[GameEventDropdown, SerializeField] private Int32GameEvent onPlayerDamaged;

private void OnEnable()
{
    onPlayerDamaged.AddListener(HandleDamage);
}

private void OnDisable()
{
    onPlayerDamaged.RemoveListener(HandleDamage);
}

private void HandleDamage(int amount)
{
    currentHealth -= amount;
}
```

Basicリスナーはデリゲートの登録順序であるFIFO順で実行される——先にサブスクライブしたものが先に呼ばれる。順序を本当に気にしない場合に使う。同じイベントへの独立したリアクション：ヒットフラッシュ、痛みの効果音、カメラシェイク。互いの状態を読み取らないので、相対的な順序は重要でない。

### レイヤー2：Priority Listeners（明示的な順序）

ここで実行順序問題が解決される。Priorityリスナーは、どのリスナーが先に実行されるかを明示的に宣言できる。

```csharp
// 数字が大きいほど先に実行される
onPlayerDamaged.AddPriorityListener(ApplyDamageReduction, priority: 100);
onPlayerDamaged.AddPriorityListener(UpdateHealthData, priority: 50);
onPlayerDamaged.AddPriorityListener(RefreshHealthUI, priority: 25);
onPlayerDamaged.AddPriorityListener(PlayHitSound, priority: 10);
onPlayerDamaged.AddPriorityListener(LogDamageAnalytics, priority: 0);
```

`ApplyDamageReduction`は常に最初に実行される（priority 100）。常に。どのスクリプトが先にロードされたか、どのGameObjectが先に作成されたか、シーンヒエラルキーの順序に関係なく。次に`UpdateHealthData`（50）。そして`RefreshHealthUI`（25）。UIは常にダメージ軽減後、データ変更後のHP値を参照する。

![Priority Behavior Ordered](/img/game-event-system/examples/05-priority-event/demo-05-behavior-ordered.png)

明示的な順序付けがない場合と比較すると——初期化タイミングに基づくカオスな実行になる：

![Priority Behavior Chaotic](/img/game-event-system/examples/05-priority-event/demo-05-behavior-chaotic.png)

#### スケールするPriority規約

チーム全体で共有するPriority定数を定義すると非常に便利だ：

```csharp
public static class EventPriority
{
    public const int CRITICAL    = 200;  // バリデーション、セキュリティ、サニティチェック
    public const int HIGH        = 100;  // 状態変更、データ変更
    public const int NORMAL      = 50;   // ゲームロジック、行動リアクション
    public const int LOW         = 25;   // UI更新、ビジュアルエフェクト
    public const int BACKGROUND  = 10;   // オーディオ、パーティクル、非重要フィードバック
    public const int CLEANUP     = 0;    // ロギング、アナリティクス、テレメトリ
}
```

```csharp
onPlayerDamaged.AddPriorityListener(ValidateInput, EventPriority.CRITICAL);
onPlayerDamaged.AddPriorityListener(ApplyDamage, EventPriority.HIGH);
onPlayerDamaged.AddPriorityListener(CheckDeathCondition, EventPriority.NORMAL);
onPlayerDamaged.AddPriorityListener(UpdateHealthBar, EventPriority.LOW);
onPlayerDamaged.AddPriorityListener(PlayHitSound, EventPriority.BACKGROUND);
onPlayerDamaged.AddPriorityListener(TrackDamageMetrics, EventPriority.CLEANUP);
```

新しいシステムが同じイベントをリッスンする必要がある場合、適切なティアを選んでスロットに入れるだけだ。他のすべてのリスナーの登録順序を監査する必要はない。Script Execution Orderの調整も不要。ティアを選ぶだけでいい。

同じPriorityのリスナーはそのティア内でFIFO順に実行される——これは正しいフォールバックだ。なぜならティア内では順序は重要でないはずだから。重要なら、異なるPriorityを割り当てればいい。

### レイヤー3：Conditional Listeners（プリフィルタ実行）

Conditionalリスナーは条件ゲートを追加する。イベントが発火した瞬間に条件がtrueの場合のみリスナーが実行される。

```csharp
// シールドが下がっている時だけダメージに反応
onPlayerDamaged.AddConditionalListener(
    call: HandleDamage,
    condition: () => !isShielded,
    priority: 50
);
```

条件はリスナーロジックの実行前に評価される。falseを返した場合、リスナーは完全にスキップされる——条件評価のコスト以外、メソッド呼び出しもオーバーヘッドもない。

型付きイベントでは、条件で引数を検査できる：

```csharp
// クリティカルヒット（ダメージ > 50）にのみ反応
onPlayerDamaged.AddConditionalListener(
    call: HandleCriticalHit,
    condition: (int damage) => damage > 50,
    priority: 75
);
```

Senderイベントでは、両方を検査できる：

```csharp
// ボスからのダメージにのみ反応
onDamageFromSource.AddConditionalListener(
    call: HandleBossDamage,
    condition: (GameObject sender, int damage) => sender.CompareTag("Boss"),
    priority: 75
);
```

これが高頻度イベント問題を解決する。毎秒50回、8つのリスナーが実行されて即座にリターンする代わりに、条件を満たすリスナーだけが実際に実行される。残りは条件評価レベルでスキップされる——完全なメソッド呼び出しよりはるかに安い。

Conditionalリスナーもpriorityでソートされるため、フィルタリングと順序付けの両方を単一のサブスクリプションで実現できる。シールドチェックをpriority 100で、アーマー軽減をpriority 50で、それぞれの条件に基づいて。

### レイヤー4：Persistent Listeners（クロスシーン永続化）

Persistentリスナーは`SceneManager.LoadScene()`の呼び出しを生き延びる。再サブスクリプションなしで、シーン遷移をまたいでイベントを受け取り続ける。

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private SingleGameEvent onPlayerDamaged;
    [GameEventDropdown, SerializeField] private SingleGameEvent onEnemyDied;
    [GameEventDropdown, SerializeField] private SingleGameEvent onItemPickedUp;

    private void OnEnable()
    {
        onPlayerDamaged.AddPersistentListener(PlayHitSound, priority: 10);
        onEnemyDied.AddPersistentListener(PlayDeathSound, priority: 10);
        onItemPickedUp.AddPersistentListener(PlayPickupSound, priority: 10);
    }

    private void OnDestroy()
    {
        onPlayerDamaged.RemovePersistentListener(PlayHitSound);
        onEnemyDied.RemovePersistentListener(PlayDeathSound);
        onItemPickedUp.RemovePersistentListener(PlayPickupSound);
    }

    private void PlayHitSound() { /* ... */ }
    private void PlayDeathSound() { /* ... */ }
    private void PlayPickupSound() { /* ... */ }
}
```

![Persistent Behavior](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

AudioManagerは一度サブスクライブしたら完了。シーンロード後の再サブスクリプション不要。どのイベントがどのシーンに存在するかを追跡する必要もない。ゴッドオブジェクトパターンも不要。

これはAnalytics、SaveSystem、AchievementTrackerにも同様に有効だ——セッション全体にわたって存在し、すべてのシーンからのイベントを受け取る必要があるものすべてに。

![Persistent Scene Setup](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

#### 重要：手動での削除が必要

Persistentリスナーはシーンアンロード時に自動的に削除されない。それが目的だからだ。しかしこれは、所有オブジェクトが破棄される時に手動で削除しなければ、ダングリングデリゲートが残ることを意味する。

Persistentリスナーは常に`OnDestroy()`で削除すること。`OnDisable()`ではない。`DontDestroyOnLoad`オブジェクトの場合、`OnDisable()`はシーン遷移中に発火するため、タイミングが早すぎる。

```csharp
// NG: DontDestroyOnLoadオブジェクトではシーン遷移中に発火する
private void OnDisable()
{
    onEvent.RemovePersistentListener(MyHandler);
}

// OK: オブジェクトが実際に破棄される時に発火する
private void OnDestroy()
{
    onEvent.RemovePersistentListener(MyHandler);
}
```

#### RemoveAllListeners()は意図的に制限されている

`RemoveAllListeners()`を呼ぶと、Basic、Priority、Conditionalリスナーがクリアされる。Persistentリスナーには触れない。

これは意図的な設計だ。`RemoveAllListeners()`はクリーンアップ操作——シーン遷移、システムリセット、テストのティアダウン——に使うものだ。Persistentリスナーはシーンスコープのクリーンアップを明示的にオプトアウトしている。削除したい場合は、`RemovePersistentListener()`で1つずつ削除する。意図的な決定には意図的な摩擦を。

## 6レイヤー実行パイプライン

GESイベントで`Raise()`が呼ばれると、すべてのリスナーは6つのレイヤーにまたがる厳密で決定論的な順序で実行される：

1. **Basic Listeners** — FIFO順
2. **Priority Listeners** — Priority数値が高い順
3. **Conditional Listeners** — 条件でフィルタリング後、Priorityでソート
4. **Persistent Listeners** — クロスシーン、Priorityあり
5. **Trigger Events** — 他のイベントへの並列ファンアウト
6. **Chain Events** — 逐次ブロッキング実行

レイヤー1は常にレイヤー2より先に実行される。レイヤー2はレイヤー3より先。常に。各レイヤー内では、内部の順序ルールが適用される。この決定論性が「なぜUIがデータより先に更新されたのか」という類のバグを排除する。

実際には、1つのイベントが複数のリスナータイプを同時に使うことが多い：

```csharp
// データレイヤー：Priorityリスナー、最初に実行
onPlayerDamaged.AddPriorityListener(ApplyDamage, EventPriority.HIGH);

// UIレイヤー：Basicリスナー、相互の順序は重要でない
onPlayerDamaged.AddListener(UpdateHealthBar);
onPlayerDamaged.AddListener(FlashDamageIndicator);

// アナリティクス：Persistent、シーン遷移を生き延びる
onPlayerDamaged.AddPersistentListener(TrackDamage, EventPriority.CLEANUP);

// 特殊ケース：Conditional、ボス戦中のみ
onPlayerDamaged.AddConditionalListener(
    ApplyBossModifier,
    () => isBossFight,
    EventPriority.CRITICAL
);
```

パイプラインは登録タイミングに関係なく、これらすべてが正しい順序で実行されることを保証する：Conditional (CRITICAL) -> Priority (HIGH) -> Basic (FIFO) -> Persistent (CLEANUP) -> Triggers -> Chains。

![Monitor Listeners](/img/game-event-system/tools/runtime-monitor/monitor-listeners.png)

Runtime MonitorのListenersタブは、各イベントのすべてのアクティブなサブスクリプションをタイプ別に表示する。リスナー設定が正しいか確認する必要がある時のデバッグに非常に役立つ。

## ラムダの罠：解決済み

C#イベントでのラムダ問題を覚えているだろうか？ GESも同じ制約がある——デリゲートは削除のために参照可能でなければならない。しかしパターンは明快だ：

```csharp
// NG: 削除できない
onDamage.AddListener((int amount) => health -= amount);

// OK: メソッド参照、常に安定
onDamage.AddListener(HandleDamage);
private void HandleDamage(int amount) => health -= amount;

// これもOK: キャッシュされたデリゲート
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

メソッド参照が最も安全なパターンだ。`HandleDamage`は同じインスタンスに対して常に同じデリゲートを参照する。ラムダが必要な特別な理由がない限り、すべてのリスナーサブスクリプションにこれを使おう。

## 実践パターン：PriorityティアによるMVC

MVCにきれいにマッピングされ、イベントシステム自体で強制するパターンを紹介する：

```csharp
public static class EventPriority
{
    public const int VALIDATION  = 200;  // 不正データの拒否
    public const int MODEL       = 100;  // 状態の変更
    public const int CONTROLLER  = 50;   // 状態変化への反応
    public const int VIEW        = 25;   // ビジュアルの更新
    public const int SIDE_EFFECT = 10;   // オーディオ、アナリティクス
}
```

```csharp
// Model
onItemPurchased.AddPriorityListener(DeductCurrency, EventPriority.MODEL);
onItemPurchased.AddPriorityListener(AddToInventory, EventPriority.MODEL);

// Controller
onItemPurchased.AddPriorityListener(CheckForAchievements, EventPriority.CONTROLLER);
onItemPurchased.AddPriorityListener(TriggerTutorialHint, EventPriority.CONTROLLER);

// View
onItemPurchased.AddPriorityListener(RefreshShopUI, EventPriority.VIEW);
onItemPurchased.AddPriorityListener(PlayPurchaseAnimation, EventPriority.VIEW);

// Side effects
onItemPurchased.AddPriorityListener(PlayCashRegisterSound, EventPriority.SIDE_EFFECT);
onItemPurchased.AddPersistentListener(LogPurchaseAnalytics, EventPriority.SIDE_EFFECT);
```

データバリデーションが最初。状態変更が2番目。ゲームロジックが3番目。UIは常に最終状態を参照する。副作用は最後。この順序はパイプラインによって強制される——スクリプトが正しい順序で初期化されることを祈るのではなく。

Modelリスナーはpriority 100を共有するため、そのティア内でFIFO順に実行される。それで問題ない——`DeductCurrency`と`AddToInventory`は独立した操作で、コントローラーレイヤーが反応する前に両方が完了する必要がある。相互のタイミング依存はない。

## 適切な戦略の選択

| 質問 | 回答 | 使用するもの |
|------|------|-------------|
| 実行順序を気にする？ | いいえ | `AddListener`（Basic） |
| 実行順序を気にする？ | はい | `AddPriorityListener` |
| このリスナーはスキップされることがある？ | はい | `AddConditionalListener` |
| このリスナーはシーンロードを生き延びる？ | はい | `AddPersistentListener` |
| フィルタリングと順序付けの両方が必要？ | はい | `AddConditionalListener` + priority |
| クロスシーンかつ順序付き？ | はい | `AddPersistentListener` + priority |

判断はコンテキストから大抵明白だ。独立したビジュアルリアクション？ Basic。データ優先のビュー順序？ Priority。高頻度フィルタリング？ Conditional。セッション全体のサービス？ Persistent。

ほとんどのプロジェクトのほとんどのイベントは、これらを組み合わせて使う。6レイヤーパイプラインが相互作用の影響を考えることなく、すべてをうまく共存させてくれる。実行順序は偶発的ではなく構造的だ。

次にUIで古いデータを見かけたら、リスナーのPriorityを確認しよう。修正は大抵1行で済む。

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
