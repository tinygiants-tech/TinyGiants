---
slug: zero-reflection-performance
title: 'ゼロリフレクション、ゼロGC：「高性能」イベントシステムの本当の意味'
authors: [tinygiants]
tags: [ges, unity, performance, architecture, advanced]
description: "すべてのイベントシステムが「高性能」を謳っている。実際にはどういう意味なのか——リアルなベンチマークデータ、Expression Treeの内部構造、最適化戦略とともに解説する。"
image: /img/home-page/game-event-system-preview.png
---

Unity Asset Storeのイベントシステムプラグインはどれも説明文のどこかに「高性能」と書いている。「使いやすい」と「完全なドキュメント付き」の間くらいに。でも考えてみてほしい。1msも0.001msも人間の感覚では両方とも速い。でも片方はもう片方の1000倍遅い。プラグインが「高性能」と言うとき、実際に何を意味している？何と比べて？どうやって計測した？

以前は気にしなかった。ほとんどの人がそうだ。イベントを配線して、開発マシンで問題なく動いて、出荷する。でもモバイルプロジェクトで何百ものエンティティがそれぞれ複数のイベントをリスンしている案件に携わったとき、「高性能」はマーケティングのチェックボックスではなくなった。60 FPSとスライドショーの違いだった。

この記事は、イベントシステムにとって「高性能」が実際に何を意味すべきか、なぜほとんどの実装が不十分なのか、GESがExpression Treeコンパイルを通じてどうゼロに近いオーバーヘッドを実現するのかについて。実際の数字で、手を振るのではなく。

<!-- truncate -->

## 計測の問題

質問：最後にイベントシステムのプロファイリングをしたのはいつ？

レンダリングパイプラインじゃない。物理じゃない。*イベントシステム*。ゲームロジックを繋いでいるもの。ほとんどの開発者はやらない。小さなプロジェクトではイベントのオーバーヘッドが見えないから。20のリスナー、フレームあたり5つのイベント。コストはゼロに丸められ、プロファイラは表示する手間すら取らない。

でもゲームはスケールする。20リスナーのかわいいプロトタイプが、500のイベント型と複数シーンに分散した数千のリスナーを持つ本番ゲームになる。モバイルゲーム、VR体験、大量のAIエンティティがいるゲーム。イベントシステムのオーバーヘッドが「実質無料」から「実際のフレームバジェットを食い始める」ポイントに達する。

ほとんどの開発者が計測しない理由は単純：デスクトップのパワフルなCPUでは、フレームバジェットの余裕に隠れてしまう。タイトなバジェットのプラットフォームをターゲットにしたときにだけ見えてくる。60 FPSモバイルで16.67ms、90 FPS Quest VRで11.1ms、120 FPS PSVR2で8.3ms。これらのプラットフォームでは、0.1msの差が重要だ。

## 誰も語らない隠れたコスト

では、あるイベントシステムを遅くし、別のものを速くするのは何か？パフォーマントなイベントシステムと遅いものを分ける4つの主要コストカテゴリがある。

### コスト1：リフレクション

これが一番大きい。.NETのリフレクション（`GetType()`、`GetProperty()`、`GetMethod()`、`Invoke()`の使用）は、操作によって直接メソッド呼び出しの約50〜1000倍遅い。

驚くべきこと：**UnityEventは毎回の呼び出しでリフレクションを使う**。セットアップ時だけじゃない。UnityEventをRaiseするたびに、内部的にリフレクションでターゲットメソッドを呼び出す。Unityは年々最適化しているが、根本的なオーバーヘッドは残っている。信じないならプロファイリングしてみてほしい。ディーププロファイラを開いて、UnityEventを数千回Raiseして、`System.Reflection`の呼び出しが積み上がるのを見てほしい。

```csharp
// What a typical reflection-based event plugin does behind the scenes
public bool EvaluateCondition(ConditionNode node)
{
    // Step 1: Get the target component via reflection
    var component = target.GetComponent(node.componentType);  // Reflection

    // Step 2: Get the property/field via reflection
    var property = component.GetType().GetProperty(node.propertyName);  // Reflection

    // Step 3: Get the value via reflection
    object value = property.GetValue(component);  // Reflection + boxing

    // Step 4: Compare via reflection
    return CompareValues(value, node.comparisonValue, node.comparisonType);  // Unboxing
}
```

すべてのステップにリフレクションが関わっている。そして実行時にプロパティをチェックするビジュアルコンディションシステム（「プレイヤーのヘルスが30以下か？」）があるなら、おそらくまさにこれを、毎フレーム、すべてのアクティブなリスナーで、複数回やっている。

### コスト2：ボクシングとアンボクシング

リフレクション呼び出しが値型（int、float、bool、Vector3）を`object`として返すとき、.NETはそれをラップする小さなヒープオブジェクトを確保する。これがボクシング。元にキャストするのがアンボクシング。確保自体は安いが、ガベージコレクタを養うことになる。

データを`object`型で渡すイベントシステム（「ジェネリック」であるために多くがそうしている）は、すべての値型パラメータをボクシングする。毎フレーム。毎イベント。毎リスナー。

### コスト3：GCアロケーション

モバイルのサイレントキラー。毎回のRaiseでメモリを確保するイベントシステムはガベージを生成する。そのガベージはGCがコレクションサイクルを実行するまで蓄積し、UnityのMonoランタイムでは目に見えるスタッター——プレイヤーがカクツキやフリーズとして認識するフレームスパイクを引き起こす。

問題は複合化する：イベントを多く発火するほどガベージが蓄積し、GCがより頻繁に実行され、スタッターが増える。ゲームが複雑になるほど悪化するデススパイラルだ。VRでは、1回のGCスパイクがドロップフレームを引き起こし、プレイヤーの吐き気の原因になる。文字通り。

### コスト4：文字列マッチング

文字列キーでイベントを識別するシステムもある。「OnPlayerDeath」「OnEnemySpawned」「OnHealthChanged」。イベントが発火するたびに、マッチするリスナーを見つけるために文字列比較（またはハッシュを含むディクショナリルックアップ）を行う。

少数のイベントならディクショナリハッシュによる文字列ベースのルックアップは十分速い。しかしコンパイラの型チェックを妨げ、安全なリネームができず、ルックアップキーの構築時にアロケーションが発生する（部分文字列操作、複合キーのための文字列結合など）。

## GC問題は独立したセクションに値する

なぜGCがイベントシステムに特に重要なのか、具体的に説明しよう。

60 FPSで動作するゲームで、フレームあたり50のイベントが発火するケースを考える。各イベントRaiseでたった64バイト（ボクシングされたfloat1つ、一時的なdelegate、小さな文字列）でも確保されたら、フレームあたり3,200バイト。小さく聞こえる？でも秒間192KB。MonoのGCのインクリメンタルコレクタはモバイルで約1〜4MBのアロケーションごとにコレクションをトリガーする。つまり5〜20秒ごとにGCスパイクが発生する。各スパイクは1〜5msで、60 FPSではドロップフレームを意味する。

プレイヤーはこれに気づく。テスターは「たまにカクつく」と報告する。QAはタイミングがアロケーションパターンに依存するため、誰も一貫して再現できないバグを出す。聞き覚えがある？

ゼロアロケーションのイベントシステムはこの問題カテゴリ全体を排除する。「削減」ではなく排除。ゼロバイトのアロケーションはイベントからのGCプレッシャーがゼロ。

## コンディション評価の問題

ここからが本当に面白い。コールバックをディスパッチするだけのイベントシステムは、比較的高速にしやすい。ネイティブC# events/delegatesはすでに速い。難しい問題は**ビジュアルシステムにおけるコンディション評価**だ。

ビジュアルイベントエディタはデザイナーがコンディションツリーを構築できる：「プレイヤーのヘルスが30以下 AND 接地している OR シールドを持っている場合にこのレスポンスを発火」。エディタでは美しい。しかし実行時には、それらのビジュアルノードが実際に*コンポーネントからプロパティを読み取り、比較を評価する*必要がある。

![Condition Tree](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-overview.png)

ほとんどのビジュアルシステムはこれにリフレクションを使う。毎フレーム、すべてのアクティブなコンディションで、`PropertyInfo.GetValue()`を呼んで現在の値を読み、ボクシングし、比較し、結果を返す。中程度に複雑なゲームでフレームあたり20〜50のコンディションを評価するかもしれない。議論したリフレクションオーバーヘッド（リフレクション呼び出しあたり約0.05〜0.08ms、コンディションあたり3〜4回）で、フレームあたり3〜16msをコンディションチェックだけに費やすことになる。

モバイルでは潜在的に*フレームバジェット全体*を、ゲームロジックが走る前に使い切る。

## 「ゼロオーバーヘッド」が本当に意味すべきこと

これが私の定義で、業界標準であるべきだと思う：

**ゼロオーバーヘッドのイベントシステムは、直接メソッド呼び出しとリスナーが行う実際の作業以上のコストがかからない。**

つまり：
- リスナーゼロのイベントRaiseはほぼコストゼロ
- リスナーあたりのディスパッチコストはdelegateの直接呼び出しと同等
- コンディション評価は手書きの`if`文と同じ速さ
- イベント操作からのフレームあたりのGCアロケーションがゼロバイト
- 実行時のリフレクションなし。一切。

これらの基準を満たせないイベントシステムは「高性能」ではない。「デスクトップハードウェアではまだ目に見えて遅くない」だけだ。

## 存在すべきでないトレードオフ

ネイティブC# eventsは生の速度を与える。直接delegate呼び出し、アロケーションなし、リフレクションなし。しかしそれ以外は何も与えない。ビジュアルエディタなし、コンディションツリーなし、フローグラフなし、ランタイムデバッグツールなし。コードがコードにコードを配線するだけ。

UnityEventsはInspector統合、ビジュアルバインディング、シーンレベルのイベント配線を提供する。しかし内部でリフレクションを使う。遅い。アロケーションする。複雑なコンディションロジックをネイティブにサポートしない。

従来の常識は、どちらかを選ぶ：生の速度か、ビジュアルの便利さか。両方は持てない。しかしそれは、ビジュアル設定をランタイム動作に橋渡しするメカニズムとしてリフレクションを受け入れた場合だけの話だ。

ビジュアル設定をネイティブコードにコンパイルできるとしたら？

## Expression Treeコンパイル：橋渡し

これがGESのコア技術イノベーションだ。実行時にリフレクションを通じてビジュアルコンディションを解釈する代わりに、GESは初期化時に.NET Expression Treesを使ってネイティブdelegateに**コンパイル**する。

Expression Treesは.NETの機能（`System.Linq.Expressions`名前空間）で、コードをデータとして（式ノードのツリーとして）表現し、そのツリーをJITコンパイラ経由で実行可能なILコードにコンパイルできる。結果は手書きのC#と同じ速度で動くdelegateだ。

コンセプトのパイプライン：

**ビジュアルコンディションツリー &rarr; Expression Tree &rarr; ILコード &rarr; コンパイル済みLambda**

簡略化したコードではこうなる：

```csharp
// Instead of this (reflection every frame):
object value = propertyInfo.GetValue(target);  // Slow. Allocates. Every frame.

// GES builds an Expression Tree at initialization:
var targetParam = Expression.Parameter(typeof(MyComponent), "target");
var propertyAccess = Expression.Property(targetParam, "Health");
var lambda = Expression.Lambda<Func<MyComponent, float>>(propertyAccess, targetParam);

// Compiles it once to a native delegate:
Func<MyComponent, float> getHealth = lambda.Compile();

// Then calls it every frame — zero reflection:
float health = getHealth(myComponent);  // Same speed as: myComponent.Health
```

コンパイルは初期化時に一度だけ行われる。その後、`getHealth`はJIT最適化されたネイティブdelegateだ。ソースコードで`myComponent.Health`と直接書くのと機能的に同一。ツリー走査なし。解釈なし。リフレクションなし。ILにコンパイルされた直接プロパティアクセスだ。

## 完全なコンパイルパイプライン

GESが実際にこれをエンドツーエンドでどう処理するか見ていこう。

### ステージ1：ビジュアル設定（デザイン時）

GESエディタで、デザイナーがビジュアルにコンディションツリーを構築する。各ノードはコンディション——プロパティ、比較演算子、値。ノードはAND/OR/NOTの論理演算子で接続される。この段階では、すべてはシリアライズされたデータ。コードは実行されない。

### ステージ2：Expression Tree構築（初期化時）

ゲーム開始時またはリスナーがアクティブになったとき、GESはシリアライズされたコンディションデータを読み、Expression Treesを構築する：

```csharp
// Simplified version of GES internals
private Func<bool> CompileConditionTree(ConditionNodeData rootNode)
{
    Expression body = BuildExpression(rootNode);
    var lambda = Expression.Lambda<Func<bool>>(body);
    return lambda.Compile();
}

private Expression BuildExpression(ConditionNodeData node)
{
    if (node.isLogicalOperator)
    {
        var left = BuildExpression(node.children[0]);
        var right = BuildExpression(node.children[1]);

        return node.operatorType switch
        {
            LogicalOp.And => Expression.AndAlso(left, right),  // Short-circuit AND
            LogicalOp.Or  => Expression.OrElse(left, right),   // Short-circuit OR
            LogicalOp.Not => Expression.Not(left),
            _ => throw new InvalidOperationException()
        };
    }
    else
    {
        var target = Expression.Constant(node.targetComponent);
        var property = Expression.Property(target, node.propertyName);
        var compareValue = Expression.Constant(node.compareValue);

        return node.comparisonType switch
        {
            Comparison.Equals      => Expression.Equal(property, compareValue),
            Comparison.GreaterThan => Expression.GreaterThan(property, compareValue),
            Comparison.LessThan    => Expression.LessThan(property, compareValue),
            // ... etc
        };
    }
}
```

`Expression.AndAlso`と`Expression.OrElse`の使用に注目。これらはショートサーキット評価にコンパイルされ、C#コンパイラが`&&`と`||`に対して生成するものと同一。ANDの左辺がfalseなら、右辺は評価されない。スケール時にこれが重要になる。

### ステージ3：ILコンパイル（一回限りのコスト）

`lambda.Compile()`呼び出しが.NET Expression Treeコンパイラを起動し、ILバイトコードを発行してJITコンパイルする。これがコストの高いステップで、複雑さに応じてツリーあたり約0.1〜2ms。しかし正確に一度だけ実行される。

こんな複雑なコンディションツリーの場合：

```
AND
  ├── Health &lt; 30
  └── OR
      ├── IsGrounded == true
      └── HasShield == true
```

コンパイル済みdelegateは機能的にこれと同等：

```csharp
(health < 30f) && (isGrounded || hasShield)
```

同じIL。同じパフォーマンス。同じショートサーキット動作。手書きコードの代わりにビジュアルデータから生成されただけ。

### ステージ4：ランタイム実行（毎フレーム）

実行時のコンディション評価はdelegate呼び出し1回：

```csharp
if (compiledCondition())  // One call. No reflection. No traversal. No allocation.
{
    ExecuteResponse();
}
```

以上。ビジュアルコンディションツリー全体（ネストされたAND/ORロジックと複数のプロパティ比較を持つ10ノードかもしれない）が、同等の手書き`if`文と同じ速さの単一delegate呼び出しになる。

## 実践での意味

コンパイル済みコンディションはナイーブな実装を引っ掛けるエッジケースを処理する：

**Null安全** — 破棄されたコンポーネント参照はtry/catchブロックではなく、コンパイル済みnullガードでチェックされる。nullチェックは分岐命令としてdelegateに埋め込まれる。

**ボクシングなし** — 値型プロパティ（int、float、bool、Vector3）はコンパイル済みdelegateを通じて直接アクセスされる。`object`ラッパーなし、ヒープアロケーションなし、GCプレッシャーなし。

**ディープなプロパティアクセス** — `player.Inventory.ActiveWeapon.Damage &gt; 50`をチェックでき、チェーン全体がILの連続プロパティロードにコンパイルされる。C#で書くのと同様に。

## 実際のベンチマークデータ

理論は十分。制御されたベンチマークからの実際のGESパフォーマンス数値を見よう。

### イベントRaiseパフォーマンス

| シナリオ | 時間 | GCアロケーション |
|----------|------|---------------|
| イベントRaise、リスナー0 | ~0.001ms | 0バイト |
| イベントRaise、リスナー1 | ~0.003ms | 0バイト |
| イベントRaise、リスナー10 | ~0.02ms | 0バイト |
| イベントRaise、リスナー100 | ~0.15ms | 0バイト |
| イベントRaise、リスナー1000 | ~1.2ms | 0バイト |

どのリスナー数でもGCアロケーションゼロ。ボクシングなし、一時オブジェクトなし、ガベージプレッシャーなし。

### コンディション評価パフォーマンス

| シナリオ | 時間 | GCアロケーション |
|----------|------|---------------|
| シンプルなコンディション（1ノード） | ~0.001ms | 0バイト |
| 複雑なコンディション（5ノード、AND/OR） | ~0.003ms | 0バイト |
| ディープなコンディションツリー（10+ノード） | ~0.005ms | 0バイト |

リフレクションベースの評価との比較：5ノードのコンディションツリーでExpression Treesなら~0.003ms、リフレクションなら~0.75ms。**250倍の改善**。

### Flow Node実行

| シナリオ | 時間 | GCアロケーション |
|----------|------|---------------|
| 単一フローノード | ~0.01ms | 0バイト |
| フローチェーン（5ノード） | ~0.05ms | 0バイト |
| フローチェーン（10ノード） | ~0.09ms | 0バイト |

### Monitor Window（エディタのみ）

| シナリオ | 時間 |
|----------|------|
| Monitorダッシュボードリフレッシュ | ~0.3ms |

Monitor Windowはエディタツールだ。このコストは開発中にのみ存在し、ビルドには影響しない。

![Monitor Performance](/img/game-event-system/tools/runtime-monitor/monitor-performance.png)

## 比較：GES vs その他すべて

| 特徴 | GES | ネイティブC# Events | UnityEvent | 文字列ベースシステム |
|---------|-----|-------------------|------------|---------------------|
| Raiseオーバーヘッド（10リスナー） | ~0.02ms | ~0.01ms | ~0.15ms | ~0.08ms |
| Raiseあたりのアロケーション | 0バイト | 0バイト | 32-128バイト | 64-256バイト |
| ビジュアルコンディションエディタ | あり | なし | 限定的 | 様々 |
| コンディション評価速度 | ~0.003ms | N/A（手動コード） | N/A | ~0.5ms（リフレクション） |
| ランタイムリフレクション | なし | なし | あり | あり |
| 型安全性 | 完全 | 完全 | 部分的 | なし |
| ランタイムデバッグツール | あり | なし | 限定的 | 様々 |

パターンは明確：GESはネイティブC# eventの速度に匹敵しつつ、C# eventsが提供できないビジュアルツーリングを提供する。そしてリフレクションベースのシステムを速度とアロケーションの両方で圧倒する。

## プロダクション検証

これらは真空で実行された合成ベンチマークではない。GESはプロダクションシナリオで検証されている：

- 単一プロジェクトで**500以上の同時イベント型**がアクティブ
- 複数シーンに分散した**10,000以上のリスナー**
- イベントシステムに起因する**フレームドロップゼロ**
- ゲームプレイ中のイベント操作からの**GCスパイクゼロ**

![Stress Test](/img/game-event-system/examples/14-runtime-monitor/demo-14-performance.png)

初期化コスト（Expression Treeコンパイル）はシーンロード時にすべてのコンディションツリーを合わせて通常50〜200ms。ローディング画面中に行われ、プレイヤーには知覚されない。遅延コンパイルにより、ツリーはシーン開始時に一括ではなく、リスナーが最初にアクティブになったときにコンパイルされるため、コストは自然に分散される。

## 実際に機能するスケーリング戦略

生の数値を知ることは有用だが、スケール時にそれを低く保つ方法を知ることのほうが有用だ。大規模プロジェクトでGESがサポートする具体的な戦略を紹介する。

### データベースパーティショニング

1つの巨大なイベントレジストリの代わりに、ドメインごとにイベントを分割する：戦闘イベント、UIイベント、オーディオイベント、AIイベント。各パーティションは独自のリスナーリストを持つので、戦闘イベントをRaiseしてもUIリスナーを走査しない。合計リスナー数に関係なく、Raiseあたりのコストが一定に保たれる。

### コンディショナルリスナー

すべてのリスナーがコンディションをチェックして大半がfalseを返すのではなく、GESはリスナーを呼び出す*前に*コンディションを評価する。コンディションがfalseのリスナーは完全にスキップされる。delegate呼び出しなし、関数呼び出しのオーバーヘッドなし。100のリスナーが存在するが5つだけがtrueのコンディションを持つシナリオでは、100ではなく5回の呼び出しのコストだけ支払う。

### ORショートサーキット評価

コンパイル済みExpression Treesは`OrElse`を使い、ショートサーキットする：ORグループの最初のコンディションがtrueなら、残りはスキップされる。ORブランチでは最もtrueになりやすいコンディションを最初に配置して、評価作業を最小化しよう。

### バッチ操作用SetInspectorListenersActive

カットシーン、ローディング遷移、メニューオーバーレイ中に大量のリスナーを一時的に無効にする場合、個別にリスナーをトグルするのではなく`SetInspectorListenersActive(false)`を使う。コンポーネント上のすべてのInspector設定リスナーの評価を防ぐ単一の呼び出しで、1つずつ走査するオーバーヘッドを回避する。

### プロファイリング用Monitorダッシュボード

開発中にGES Monitor Windowを使って、ホットなイベントチャンネル（最も頻繁に発火するイベント、最もリスナーが多いイベント、最も評価コストの高いコンディション）を特定する。それらを最初に最適化しよう。

![Monitor Dashboard](/img/game-event-system/tools/runtime-monitor/monitor-dashboard.png)

## モバイルとVRでなぜ重要か

具体的なフレームバジェット数値を示そう。

### モバイル（iOS/Android）

モバイルCPUはデスクトップの5〜10倍遅い。デスクトップでの0.5msのイベントオーバーヘッドがモバイルでは2.5〜5msになる。60 FPSターゲット（16.67msバジェット）で、バジェットの15〜30%をイベントオーバーヘッドだけに費やす。GESなら同じワークロードがモバイルで0.02〜0.05ms。その差が出荷できるかできないかの差だ。

### VR（Quest、PSVR2）

VRはフレームバジェットにおいて最も厳しいプラットフォーム。Questは90 FPS必須（フレームあたり11.1ms）。PSVR2は120 FPSを目標（フレームあたり8.3ms）。そしてVRゲームは本質的にイベントが多い。ハンドトラッキングがイベントを生成し、ゲイズトラッキングがイベントを生成し、物理インタラクションがイベントを生成し、空間オーディオトリガーがイベントを生成する。VRでのリフレクションベースのイベントシステムは確実なパフォーマンスボトルネックだ。ゼロリフレクションのシステムはイベントレイヤーをプロファイラで見えなくする。それがまさにあるべき姿だ。

### モバイルでのGCの観点

特に強調したい。モバイル（Monoランタイム）でのUnityのガベージコレクタは非世代的でstop-the-world型。実行されるとすべてが止まる。コレクションをトリガーする閾値は様々だが、フレームあたりのアロケーションがサイクルを加速させる。VRでは、ヘッドトラッキング中のGCポーズが目に見えるスタッターを引き起こし、モーションシックネスを誘発する可能性がある。フレームあたりゼロガベージのイベントシステムは最適化ではない。VR出荷のためのハード要件だ。

## 結論

「高性能」は機能ではない。計測可能な特性だ。誰かがイベントシステムは速いと主張するとき、正しい質問は：

- Nリスナーでの1回のRaiseあたりの何マイクロ秒？
- フレームあたり何バイトのアロケーション？
- 実行時にリフレクションを使うか？何のために？
- コンディションはどう評価される？リフレクションか、コンパイル済みコードか？

GESの答え：サブマイクロ秒のRaise、ゼロアロケーション、ゼロランタイムリフレクション、手書きC#と同じ速さで動くExpression Treeコンパイル済みコンディション。

ゼロリフレクションのアプローチは単なるパフォーマンス最適化ではない。ビジュアルイベント編集をプロダクションゲームで実用的にするもの。開発マシンでは問題なく動いて200のアクティブエンティティがいるQuest 3で崩壊するプロトタイプではなく。イベントシステムのパフォーマンスについて一度も考えなくていいとき、より自由に使えるようになる。フレームバジェットを心配せずに、より多くのイベント、コンディション、リスナーを追加する。そしてその「恐れなくアーキテクチャを設計する自由」こそが、実際にゲームをより良くする。

パフォーマンスは贅沢な機能ではない。他のすべてがその上に構築される基盤だ。

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
