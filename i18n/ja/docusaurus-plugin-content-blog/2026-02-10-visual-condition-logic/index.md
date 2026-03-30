---
slug: visual-condition-logic
title: 'if-else地獄からの脱出：ビジュアル条件ロジックの正しいやり方'
authors: [tinygiants]
tags: [ges, unity, condition-tree, visual-workflow, advanced]
description: "ゲームの条件はシンプルに始まり、怪物のように成長する。散在するif-elseチェーン、結合したデータソース、デザイナーがアクセスできない。ビジュアル条件ロジックが何をできるか。"
image: /img/home-page/game-event-system-preview.png
---

すべてのゲームは基本的に条件の巨大な山だ。「敵が耐性を持っていない、かつプレイヤーが炎バフを持っている、かつランダムクリティカル判定をパスした場合にのみ炎ダメージを与える。」プロトタイプ中は、コールバックにif文を放り込んで先に進む。30秒。動く。生産性を感じる。

そしてプロトタイプがプロダクションに入る。その30秒のif文が増殖し始める。1つが5つに。5つが50に。50が「2体目のボスのルートドロップ率を制御する条件ってどこにあるの？」になる。そして今、デザイナーが後ろに立ってダメージ閾値を0.3から0.25に変更できるか聞いている。そして君は再コンパイルが必要だと説明している。

if-else地獄へようこそ。住民：3ヶ月以上続いたすべてのUnityプロジェクト。

<!-- truncate -->

## なぜif-elseはゲームでスケールしないか

おそらく不快なほど身に覚えのある絵を描いてみよう。戦闘システムがある。何かがヒットを受けるとダメージイベントが発火する。条件を追加したい：「ダメージがターゲットの最大HPの30%を超えた場合のみスタッガーアニメーションを再生。」簡単：

```csharp
public void OnDamageReceived(DamageInfo info)
{
    float threshold = info.target.GetComponent<Health>().maxHP * 0.3f;
    if (info.damage > threshold)
    {
        PlayStaggerAnimation(info.target);
    }
}
```

完了。出荷。次へ。

2週間後、デザイナーがやってくる。「ターゲットがブロッキング中じゃないかもチェックできる？あと、すでにスタッガー中じゃないかも？ああ、ボスはスタッガー完全耐性にしたい。」

```csharp
public void OnDamageReceived(DamageInfo info)
{
    float threshold = info.target.GetComponent<Health>().maxHP * 0.3f;
    var combat = info.target.GetComponent<CombatState>();
    var enemyData = info.target.GetComponent<EnemyData>();

    if (info.damage > threshold &&
        !combat.isBlocking &&
        !combat.isStaggered &&
        enemyData.rank != EnemyRank.Boss)
    {
        PlayStaggerAnimation(info.target);
    }
}
```

3つの新しいコンポーネント依存。`DamageInfo`だけで済んでいたメソッドが、今は`Health`、`CombatState`、`EnemyData`に手を伸ばしている。それらのコンポーネントをリファクタリングすればこれは壊れる。そしてデザイナーが0.3を0.25に変更したい時は？IDEを開き、ファイルを見つけ、リテラルを変更し、再コンパイルし、テストし、コミット。数値の変更のために。

これは**1つの条件**、**1つのイベント**だ。実際のゲームには何十もある。大規模なゲームには何百も。

### データソースの問題

ここで条件は、if文が多すぎるという以上に本当に複雑になる。実際のゲーム条件は複数の独立したソースからデータを引っ張る：

**イベントペイロードデータ。** ダメージ量、ダメージタイプ、攻撃者の参照——イベント自体が運ぶデータ。これを掘り下げる必要がある：`damageInfo.attacker.stats.critChance`。イベント引数から3階層のプロパティアクセス。

**シーンオブジェクトの状態。** プレイヤーの現在のHP、ドアがロックされているか、ゲーム難易度の設定。このデータはシーン内のGameObjectに存在し、イベントペイロードとは完全に独立している。条件はそれを取りに行く必要がある。

**ランダム値。** 「30%の確率でトリガー。」「このルートテーブルからランダムな要素を選ぶ。」確率とランダム性はゲーム条件のあらゆるところにある。

**固定閾値。** スタッガーの例の魔法の数字0.3。クエストのレベル要件。比較するenum値。デザイナーが調整する必要がある定数。

1つの現実の条件がこれら**すべて**のソースからのデータを必要とすることがある。「イベントのダメージタイプがFire（イベントペイロード）、かつターゲットの炎耐性が50未満（シーンオブジェクト）、かつランダムロールが0.7を超える（ランダム）、かつ難易度がHard以上（シーンオブジェクトと定数の比較）の場合。」

コードでは、条件ハンドラーがイベント引数、複数のシーンコンポーネント、Random呼び出し、ハードコードされた定数に触手を伸ばすことになる。すべての触手が結合ポイント。すべての結合ポイントがリファクタリング中の潜在的な破壊。

### ディーププロパティアクセスの問題

UnityのシーンオブジェクトはコンポーネントベースだIsa。実際に必要なデータに到達するには、複数のレベルを経由する必要がある：

```csharp
// 欲しいもの：敵の現在の防御ステータス
float defense = info.target.GetComponent<EnemyController>()
    .statsManager
    .defenseStat
    .currentValue;
```

GameObjectから3階層深い。ビジュアルツールで「このターゲットのエネミーコントローラーのステータスマネージャーのdefenseStatのcurrentValue」を指定させるにはどうする？ほとんどのビジュアルスクリプティングツールはこの深さをサポートしていないか、不格好な回避策が必要だ。

そしてenumの問題がある。enumはゲームコードのあらゆるところにある——`DamageType.Fire`、`EnemyRank.Boss`、`GameDifficulty.Hard`。ビジュアル条件ツールはプロジェクトのenumについて知り、適切なドロップダウンを表示し、型安全性を処理する必要がある。`DamageType`を`string`と比較するのは、ランタイムのサプライズではなく、目に見えるエラーであるべきだ。

### イテレーションの税

本当に痛いコストは条件を書くことではない。変更することだ。

デザイナーが言う：「スタッガーの閾値を30%から25%に変更できる？」ワークフロー：

1. デザイナーがプログラマーに頼む
2. プログラマーがIDEを開き、正しいファイルを見つける
3. 数値を1つ変更
4. 再コンパイルを待つ
5. テスト
6. コミットしてプッシュ

数値の変更のために。これをゲーム内のすべての閾値、すべての確率、すべてのenum比較に掛け合わせよう。デザイナーにはアイデアがある。プログラマーにはビルドキューがある。イテレーション速度はコンパイルサイクルにボトルネックされている。

そして構造的な変更はさらに悪い。「ブロッキング中でないことを要求する代わりに、ORにしたい：ブロッキング中でないか、ダメージタイプがPiercingか。」これは値の変更ではない——ロジックの再構造化だ。デザイナーはブール論理の表記を理解しないとそれを正確に説明できないし、プログラマーは括弧が正しいか確認しながらネストしたif文を再構造化しなければならない。

他の業界はこれを解決した。データベース管理者はビジュアルクエリビルダーを使う。マーケティングチームはドラッグ&ドロップの条件ビルダーを使う。UnrealにはBlueprintブランチがある。Unityには... C#コンパイラがある。

## ビジュアル条件ツリー：コードなしのブールロジック

GESにはビジュアル条件ツリーが含まれている——Behavior Window内のノーコードブールロジックビルダーだ。C#でif-elseチェーンを書く代わりに、AND/ORグループと比較ノードを使って条件ツリーをビジュアルに構築する。

![Condition Tree Overview](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-overview.png)

Behavior Window内のすべてのEvent Actionにオプションの条件ツリーを持たせられる。イベントが発火すると、まずツリーが評価される。`true`を返せばアクションが実行される。`false`ならスキップされる。条件全体がビジュアルに設定される——コードなし、再コンパイルなし、プログラマーに数値変更を頼む必要なし。

### AND/ORグループ：無限のネスティング

条件ツリーは2つのグループノードタイプを使う：

- **ANDグループ**：すべての子が`true`でなければならない。古典的な`&&`ロジック。
- **ORグループ**：少なくとも1つの子が`true`でなければならない。古典的な`||`ロジック。

グループは他のグループの中に無制限の深さでネストできる。つまり、あらゆるブール式を表現できる：

```
AND
├── HP &lt; 50%
├── OR
│   ├── isCritical == true
│   └── damageType == "Fire"
└── targetTag == "Enemy"
```

これはこう読める：「HPが50%未満、かつ（クリティカルヒットまたは炎ダメージ）、かつターゲットがEnemy。」これを1つのif文できれいに表現してみてほしい。次に、C#を書かないデザイナーに説明してみてほしい。

ビジュアルツリーでは、AND/ORの階層が人間が複合条件について自然に考える方法にマッピングされる。追跡すべき括弧なし、覚えるべき演算子の優先順位なし、ネストのミスなし。

![Condition Tree Example](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-example.png)

### 比較ノード：ソース、演算子、ターゲット

ツリーの各リーフノードは3つの部分からなる比較：

**ソース** → **演算子** → **ターゲット**

ソースとターゲットはそれぞれ独立して4つのデータソースタイプをサポートする。演算子は比較される型に基づいて適応する。この3部構成はすぐに理解できるほどシンプルだが、あらゆる比較を表現できるほど柔軟だ。

## 4つのデータソースタイプ

ここが条件ツリーを「いいビジュアルツール」から「本当に強力なシステム」に変えるところだ。各比較ノードは4つの異なるソースタイプから値を引っ張れ、比較のどちら側にも自由にミックスできる。

![Condition Node Types](/img/game-event-system/visual-workflow/visual-condition-tree/condition-node-types.png)

### 1. Event Argument：イベントペイロードからのデータ

最も一般的なソースタイプ。`Int32GameEvent`の場合、イベント引数は整数値。`SingleGameEvent`の場合、float値。`DamageInfo`のようなカスタムペイロード型の場合、ネストされたプロパティを掘り下げられる。

ここでの重要な機能は**5階層深いプロパティアクセス**だ。イベント引数を起点に、ネストされたオブジェクトをナビゲートできる：

```
damageInfo → attacker → stats → critChance → value
```

レベル1：`damageInfo`（イベントペイロード）
レベル2：`attacker`（DamageInfoのプロパティ）
レベル3：`stats`（attackerのプロパティ）
レベル4：`critChance`（statsのプロパティ）
レベル5：`value`（実際のfloat）

エディターはドロップダウンのチェーンを表示し、各レベルで利用可能なプロパティが表示される。型システムがついてくるので、`critChance`（`FloatStat`）を選択した後、次のドロップダウンには`FloatStat`で利用可能なプロパティのみが表示される。

これが先ほどの「ディーププロパティアクセス」の問題を解決する。ビジュアルインターフェースがナビゲーションを明示的かつ型安全にし、ドロップダウンチェーンが存在しないプロパティへのアクセスを防ぐ。

### 2. Scene Type：シーン内オブジェクトへの参照

イベントペイロードではなくシーンからのデータが必要な条件用。GameObjectまたはComponentを参照フィールドにドラッグし、同じドロップダウンチェーンでpublicプロパティをナビゲートする。

**publicプロパティ**は参照可能：`health.currentHP`、`combatState.isBlocking`、`gameManager.difficulty`。

**Boolメソッド**（パラメータなしで`bool`を返すメソッド）も表示される：`inventory.HasItem()`、`achievementManager.IsUnlocked()`。つまり、アダプターコードを書かずに条件ツリーからシンプルなクエリメソッドを呼べる。

Scene Typeは「プレイヤーのHPをチェック」や「ドアがアンロックか」のような条件に最適——イベントとは独立してシーンオブジェクトに存在するデータだ。

### 3. Random：確率とランダム選択

ランダムデータには2つのモード：

**Rangeモード。** minとmaxの間のランダム値を生成。`Random(0.0, 1.0) &lt; 0.3`と比較して「30%の確率でトリガー」条件を作成。コード内の`Random.value`呼び出し不要。

![Random Value Source](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-random-value.png)

**Listモード。** 事前定義されたリストからランダムな要素を選ぶ。「これらのダメージタイプからランダムに選択」や「ランダムなスポーンウェイトを選ぶ」に便利。リストは条件ノード内で直接設定する。

### 4. Constant：固定値とEnumドロップダウン

最もシンプルなソースタイプだが、生の数値以上のものを扱う。

**単一値。** 数値、文字列、ブール値を入力。スタッガーの例の閾値`0.5`。期待するタグ`"Enemy"`。

![Constant Value Source](/img/game-event-system/visual-workflow/visual-condition-tree/condition-tree-constant-value.png)

**リスト。** `In List`演算子で使用する値のセットを定義。`enemyType == Boss || enemyType == Elite`の代わりに`enemyType In List [Boss, Elite]`と書ける。よりクリーンで、デザイナーはロジックを再構造化せずに`MiniBoss`をリストに追加できる。

**Enumドロップダウン。** 比較の反対側がenum型の場合、Constantソースは自動的に適切なenumドロップダウンを表示する。文字列比較なし、マジックナンバーなし。タイポの可能性がある文字列`"Fire"`ではなく、ドロップダウンで`DamageType.Fire`が見える。

## 演算子システム：10以上の比較タイプ

利用可能な演算子は比較される型に依存する。システムが自動的にどの演算子が有効かを判定するので、意味のない比較は作れない。

**数値演算子（6つ）：** `==`、`!=`、`>`、`&lt;`、`>=`、`&lt;=`
`int`、`float`、`double`、および任意の`IComparable`数値型で動作。

**文字列演算子（5つ）：** `==`、`!=`、`StartsWith`、`EndsWith`、`Contains`
デフォルトで大文字小文字区別あり。文字列比較は直球——正規表現なし、グロブなし、ゲーム条件が実際に必要とする操作のみ。

**Enum演算子：** `==`、`!=`、`In List`
Enum比較は型安全。`DamageType`を`WeaponType`と比較するとエディターで目に見えるエラーになり、ランタイムのサプライズにはならない。

**In List演算子：** 任意の型で動作。ソース値がターゲットリストに存在するか（またはその逆）をチェック。`||`比較のチェーンを1つのクリーンなチェックに置き換える。

### リアルタイム型バリデーション

これがビジュアル条件構築を実用的にするセーフティネットだ。エディターは設定時に型を検証する——ランタイムではない。

**赤い警告インジケーター**が型が一致しない時に即座に表示される。`string`を`float`と比較しようとすると、比較ノードが説明付きで赤くハイライトされる。Scene Type参照を変更してプロパティチェーンが無効になった場合（誰かがコンポーネントをリファクタリングしたため）、影響を受けるノードが赤い警告を表示する。

「エディターでは条件が動いたのにランタイムでキャスト例外を投げる」はもうない。ビジュアルフィードバックがPlayを押す前に型の不一致をキャッチする。

## Expression Treeコンパイル：なぜこれが遅くないか

ビジュアル条件ツリーはパフォーマンスの懸念に聞こえるかもしれない。イベント発火のたびにツリー走査、リフレクション、辞書ルックアップ？それは正当な問題だろう。

GESはランタイムでツリーを解釈しない。初期化時に、ビジュアルツリー全体が.NET Expression Treeにコンパイルされ、ネイティブデリゲートになる——本質的に、if文を手書きした時と同じコンパイル済みコードだ。

**一回限りのコンパイルコスト：** ツリーあたり通常2ms以下。
**評価ごとのコスト：** 約0.001ms——手書きのC#と実質的に同一。

ゲームプレイ中のリフレクションなし。辞書ルックアップなし。解釈オーバーヘッドなし。ビジュアルツリーはネイティブコードにコンパイルされて消えるデザイン時の抽象化だ。

## 最適化：評価順序が重要

コンパイル済みExpression Treeでも、条件の順序はパフォーマンスに影響する。2つのヒント：

**ORグループはショートサーキットする。** ORグループの最初の子が`true`なら、残りの子は評価されない。最もコストが低いか、最もtrueになりやすいチェックを最初に。

**ANDグループもショートサーキットする。** 最初の子が`false`なら、残りはスキップされる。最もコストが低いか、最もfalseになりやすいチェックを最初に。

実践では：

```
AND
├── Constant比較（ほぼゼロコスト）              ← まずこれをチェック
├── Event Argumentプロパティアクセス（低コスト）  ← 次にこれ
├── Scene Typeディーププロパティチェーン（中コスト）← 次にこれ
└── Random比較（低コストだが上が失敗すれば不要）
```

グループ内のノードをドラッグ&ドロップで並べ替えられる。頻繁にショートサーキットする低コストのチェックを上に。

## ビフォー&アフター：実際のパターン

### ルートドロップ条件

**ビフォー（コード）：**

```csharp
public void OnEnemyKilled(EnemyDeathInfo info)
{
    if (info.enemy.enemyType == EnemyType.Boss ||
        info.enemy.enemyType == EnemyType.Elite)
    {
        if (info.killer.GetComponent<PlayerStats>().luckModifier > 0.5f ||
            GameManager.Instance.currentDifficulty >= Difficulty.Hard)
        {
            DropRareLoot(info.enemy.lootTable);
        }
    }
}
```

**アフター（ビジュアルツリー）：**

```
AND
├── Event Argument: enemy.enemyType In List Constant: [Boss, Elite]
└── OR
    ├── Scene Type: playerStats.luckModifier > Constant: 0.5
    └── Scene Type: gameManager.currentDifficulty >= Constant: Hard
```

同じロジック。でもデザイナーはIDEを開かずに敵タイプリストに`MiniBoss`を追加したり、運の閾値を調整したりできる。

### チュートリアルゲート

**ビフォー：**

```csharp
public void OnPlayerAction(PlayerActionInfo action)
{
    if (!tutorialComplete && currentStep == TutorialStep.Movement &&
        action.actionType == ActionType.Move && action.duration > 1.0f)
    {
        AdvanceTutorial();
    }
}
```

**アフター：**

```
AND
├── Scene Type: tutorialManager.tutorialComplete == Constant: false
├── Scene Type: tutorialManager.currentStep == Constant: Movement
├── Event Argument: action.actionType == Constant: Move
└── Event Argument: action.duration > Constant: 1.0
```

4つのクリーンで読みやすいチェック。デザイナーはより速いテストのためにdurationチェックを無効にしたり、必要なステップを変更したりできる——コードなし、再コンパイルなし。

### 実績トリガー

**ビフォー：**

```csharp
public void OnScoreChanged(int newScore)
{
    if (newScore >= 10000 && !AchievementManager.HasAchievement("score_master"))
    {
        if (GameTimer.ElapsedTime < 300f)
        {
            UnlockAchievement("speed_scorer");
        }
        UnlockAchievement("score_master");
    }
}
```

**アフター（2つの別々のEvent Action、それぞれ独自の条件ツリー付き）：**

Score Master：
```
AND
├── Event Argument: newScore >= Constant: 10000
└── Scene Type: achievementManager.HasAchievement("score_master") == Constant: false
```

Speed Scorer：
```
AND
├── Event Argument: newScore >= Constant: 10000
├── Scene Type: achievementManager.HasAchievement("speed_scorer") == Constant: false
└── Scene Type: gameTimer.elapsedTime &lt; Constant: 300
```

各実績が独立して設定可能。閾値、制限時間、前提条件——すべてデザイナーがアクセスできる。

### フルソースミックスの炎ダメージ

4つすべてのソースタイプを1つのツリーで使う条件：

```
AND
├── Event Argument: damageInfo.damageType == Constant: DamageType.Fire
├── Scene Type: enemy.stats.fireResistance &lt; Constant: 50
├── Scene Type: gameSettings.difficulty >= Constant: Difficulty.Hard
└── Random(0.0, 1.0) &lt; Constant: 0.3
```

「ダメージタイプがFire、かつ敵の炎耐性が50未満、かつ難易度がHard以上、かつ30%のランダムチェックをパスした場合に炎ボーナスを適用。」4つの異なるデータソース、1つのビジュアルツリー、ゼロ行のコード。

![Conditional Event Demo](/img/game-event-system/examples/06-conditional-event/demo-06-condition-tree.png)

## 実践で重要な編集機能

条件ツリーは静的な設定パネルではない。実際の開発で重要な機能を備えた適切な編集ツールだ：

**ドラッグ&ドロップ並べ替え。** グループ内のノードを並べ替えてショートサーキット評価を最適化。低コストのチェックを最初に。

**個別ノードの有効/無効切り替え。** 削除せずに任意の条件をオン/オフ切り替え。ボス耐性なしでスタッガーチェックが機能するかテスト？そのノードを無効に。コード変更なし、行のコメントアウトなし、コメント解除し忘れのリスクなし。

**折りたたみ/展開ビュー。** 展開ビューは完全な設定詳細を表示——ソースタイプ、演算子、値、ネスト構造。折りたたみビューは各比較を1行の要約に圧縮。検証済みのサブグループを折りたたんでトップレベルのロジックを見やすく。

**デフォルトにリセット。** 実験してめちゃくちゃになった？任意のノードをデフォルト状態にリセット。

## ビジュアルツリーが適切な場合（そうでない場合）

条件ツリーはイベントレベルのゲーティング用に特別に設計されている——「このイベントが発火した時、このEvent Actionは実行すべきか？」

**ビジュアル条件ツリーを使うべき時：**
- 条件がEvent Actionの実行をゲートする
- デザイナーが条件を確認または変更する必要がある
- ロジックが比較とブール演算子（アルゴリズムではない）
- 再コンパイルなしのイテレーションが欲しい

**コードを使うべき時：**
- ロジックに複雑な計算が含まれる（パスファインディング、物理、マルチステップアルゴリズム）
- 条件が時間をかけて蓄積された状態に依存する
- デザイナーが触らない純粋にプログラマーの関心事
- パフォーマンスクリティカルなホットパスでの細かい制御が必要

実践では、典型的なゲームのイベント条件の約70-80%が「ビジュアルツリー」タイプ——閾値チェック、型比較、状態フラグ、確率ロール。残りの20-30%はコードに属する本当に複雑なロジック。条件ツリーが一般的なケースを処理するので、プログラマーは面白いケースに集中できる。

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
