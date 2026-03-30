---
slug: generic-serialization-and-codegen
title: 'Unityジェネリクスシリアライゼーションの壁：型安全なイベントにボイラープレート税は不要'
authors: [tinygiants]
tags: [ges, unity, architecture, codegen, tutorial]
description: "Unityはジェネリック型をシリアライズできない。つまり、イベント型ごとに具象クラスが必要。つまりボイラープレート地獄。ツールが全部生成してくれない限りは。"
image: /img/home-page/game-event-system-preview.png
---

`GameEvent<T>`を作った。クリーンで、型安全で、エレガント。ヘルス更新用に`GameEvent<float>`フィールドを作って`[SerializeField]`を付けた。Inspectorに切り替える。フィールドがない。ただ...消えている。Unityがゼロ除算を頼まれたかのように、空白のパネルでこっちを見つめている。

これはUnity最古のアーキテクチャ的な頭痛の種だ。シリアライゼーションシステムはジェネリクスを理解しない。今までずっとそうだった。型安全でデータ駆動のイベントシステムを作ろうとしたすべての開発者が、この壁に正面からぶつかっている。

些細な不便じゃない。アーキテクチャ全体を蝕む種類の制約だ。型安全性を諦めるか、ボイラープレートの海に溺れるか、美しいジェネリック設計がInspectorに触れることはないと受け入れるか。何年もの間、コミュニティの答えは「具象クラスを手書きしろ」だった。でも考えてみてほしい。ボイラープレートが100%予測可能なら、なぜ人間が書いているんだ？

<!-- truncate -->

## なぜUnityはジェネリクスをシリアライズできないのか

修正しようとする前に、実際に何が起きているのかを理解しよう。

Unityのシリアライゼーションシステム（Inspector、Prefab保存、シーンファイル、アセットストレージの裏方）は、C#ジェネリクスがゲーム開発で一般的になる前の時代に設計された。既知で固定されたメモリレイアウトを持つ具象型で動作する。シリアライザがフィールドに遭遇すると、メモリ確保、Inspector GUIの描画、ディスクへのデータ書き込みのために、コンパイル時に正確な型を知る必要がある。

Unityがこんなフィールドに出会ったとき：

```csharp
[SerializeField] private GameEvent<float> healthChanged;
```

何をすべきか分からない。ジェネリック型パラメータ`T`はシリアライザの観点からメモリレイアウトが固定されていないことを意味する。どのフィールドを表示すべきか分からないからInspectorドロワーを作れない。具象型が分からないからシーンファイルに参照を保存できない。だから唯一できること、つまりフィールドを完全に無視する。

フィールドはコンパイルされる。C#コードとしては存在する。UnityのInspectorとシリアライゼーションパイプラインに関する限り、存在しないだけだ。警告もエラーもなく、ただ沈黙。

つまり、Inspectorで実際に動く型安全なイベントが欲しいなら（ビジュアルワークフローの全ポイント）、使いたいすべての型に対して具象的な非ジェネリックサブクラスが必要になる：

```csharp
// You have to write one of these for EVERY type
[CreateAssetMenu]
public class FloatGameEvent : GameEvent<float> { }

[CreateAssetMenu]
public class Int32GameEvent : GameEvent<int> { }

[CreateAssetMenu]
public class StringGameEvent : GameEvent<string> { }

[CreateAssetMenu]
public class Vector3GameEvent : GameEvent<Vector3> { }
```

意味のある情報は1行分（型パラメータ）だけなのに、完全なクラス宣言で包まれている。毎回。毎回。

## ボイラープレートの算数

ちょっと不快になる計算をしてみよう。

適切なイベントシステムでは、各型に具象イベントクラスだけが必要なわけではない。ビジュアルワークフローがイベントとレスポンスを接続するためのバインディングフィールドも必要だ。1型あたり最低2つの生成コードが必要。

典型的な中規模のUnityプロジェクトでは、イベントに約15の異なる型を使う。プリミティブ（`int`、`float`、`bool`、`string`）、Unity型（`Vector3`、`Color`、`GameObject`、`Transform`）、そしてゲーム固有のカスタム構造体（`DamageInfo`、`ItemData`、`QuestProgress`）。

15型 x 2成果物 = ほぼ同一のボイラープレートコード30個。

さらにSenderバリアントを加える。Senderイベントは2つの型パラメータを持つ。誰が送ったかと何のデータかだ。エンティティごとのヘルスに`GameEvent<GameObject, float>`が欲しい？もう1つの具象クラスともう1つのバインディングフィールドだ。控えめなプロジェクトでも5〜10のSenderの組み合わせがあるかもしれない。

唯一の意味ある違いが型名だけの、40以上のボイラープレートコードを見ていることになる。そのすべてがコピペのチャンスだ。そのすべてがタイポの可能性だ。基底クラスのインターフェースが変更されたら、そのすべてを更新しなければならない。

そして誰も語らないこと：最初の作成だけの問題じゃない。メンテナンスの問題だ。誰かが基底イベントクラスをリファクタリングして3つの具象型の更新を忘れる。誰かが新しい型を追加して間違ったフォルダに置く。誰かが`IntGameEvent`をコピペして`FloatGameEvent`にリネームしたけど、中のジェネリックパラメータを変え忘れた。コードはコンパイルされ、テストは通り、2週間後にfloatイベントがずっとintにキャストされていたことに気づく。

仮定の話じゃない。実際のプロジェクトで常に起きていることだ。

## よくある回避策（そしてなぜすべて失敗するのか）

Unityコミュニティは創意工夫に富んでいる。試されてきたアプローチと、なぜどれも本当の解決にならないかを見ていこう。

### 手動ボイラープレート：「ただ書けばいい」

力業のアプローチ。すべての具象クラスを手で作る。技術的には動くが：

- 退屈でエラーが起きやすい。創造的な価値がゼロの機械的作業。
- 新しい型を追加するたびに複数のファイルを作る必要がある。1つ忘れると無言で壊れる。
- 基底クラスのリファクタリングは、すべての派生クラスに手を加えることを意味する。
- 誰も一貫してやらない。型がプロジェクト中に散在し、名前の付け方も整理の仕方もバラバラになる。6ヶ月後、3人の異なる人間が同じシステムを3通りのやり方で書いたようなコードベースになっている。実際にそうだから。

### 型安全性を放棄：`object`アプローチ

ジェネリックの問題を`object`を使って完全に回避するシステムもある：

```csharp
public class GenericEvent : ScriptableObject
{
    public void Raise(object data) { /* broadcast to listeners */ }
}

// Usage
scoreEvent.Raise(42);           // Boxed int — works
scoreEvent.Raise("oops");       // Wrong type — also compiles, breaks at runtime
scoreEvent.Raise(new Enemy());  // Also compiles. Also wrong. Also runtime.
```

おめでとう、最初にジェネリクスが欲しかった理由そのものを投げ捨てることで、シリアライゼーション問題を「解決」した。すべてのイベント呼び出しが潜在的な実行時エラー。すべてのリスナーで手動キャストとnullチェックが必要。C#の中にJavaScriptの型システムを再現したも同然だ。

boxing/unboxingのオーバーヘッドも良くない。特にイベントを頻繁にRaiseする場合。でも本当のコストは開発者の信頼性だ。すべてのコールサイトを読まない限り、イベントが正しい型を運んでいるか確信できない。

### T4テンプレート：正しいアイデア、間違った実行

T4テキストテンプレートやカスタムエディタスクリプトでボイラープレートを自動生成する開発者もいる。これは実は正しい直感だ。コードが予測可能であることを認識して自動化する。でもほとんどの実装は：

- 脆い。T4テンプレートはちょっと見ただけで壊れる。
- 不透明。設定した開発者が辞め、テンプレート構文を理解する人がいなくなる。
- 外部的。通常のUnityワークフローの外にあるので、存在を忘れる。
- 手動。生成ステップを実行することを覚えておく必要がある。

### コピペ：正直な答え

正直に言おう。実際にほとんどの人がやっていること。既存の具象クラスをコピーして、型名を変えて、ジェネリックパラメータを変えて、保存。問題が起きるまでは動く。そして起きるのは：

- 間違ったテンプレートをコピーして、間違った基底クラスを継承した
- リネームを忘れてクラス名が重複した
- 間違ったnamespaceにペーストした
- 30回やって15回目あたりで目がかすんできた

みんなやっている。みんないつか後悔する。

## 他の言語はどうしているか

この問題はUnity固有ではないが、ほとんどの他のエコシステムは解決している。

**Rust**には`#[derive(...)]`マクロがあり、コンパイル時にトレイトのボイラープレートを自動実装する。構造体を定義し、deriveアトリビュートを付けて、終わり。

**Go**には`go generate`がある。言語ツールチェインに組み込まれたファーストクラスのコード生成ツールだ。ジェネレータを一度書き、コメントで参照すれば、ツールチェインが残りを処理する。

**C#自体**にはRoslynソースジェネレータがあり、既存の型に基づいてコンパイル時にコードを生成できる。理論的には完璧な解決策。実際には、Unityのコンパイラパイプラインのソースジェネレータサポートは限定的で、デバッグ体験も荒く、ツーリングがまだ追いついている段階。良くなってきているが、「ただ動く」領域にはまだない。

これらすべての解決策に共通するパターン：**ボイラープレートが予測可能なら、マシンが書くべき**。`public class FloatGameEvent : GameEvent<float> { }`を人間がタイプするのは、変数が1つだけのテンプレートで表現できる作業だ。それはまさにコンパイラの仕事だ。

根本的な問いにたどり着く。イベントのボイラープレートは100%予測可能。具象クラス名はパターンに従う。ジェネリックパラメータが唯一の変数。バインディングフィールドも同じパターン。なぜ人間がどれかを書いているのか？

## 3つのイベントタイプ、1つのシステム

GESがコード生成をどう扱うかを見る前に、提供される3つのイベントアーキテクチャを理解しよう。それぞれが特定のコミュニケーションパターンに対応している。

### Voidイベント：`GameEvent`

最もシンプルな形。データペイロードなしのイベント。「何かが起きた」——メッセージはそれだけ。

![Creator Parameterless](/img/game-event-system/visual-workflow/game-event-creator/creator-parameterless.png)

```csharp
[GameEventDropdown, SerializeField] private GameEvent onLevelComplete;

public void CompleteLevel()
{
    onLevelComplete.Raise();
}
```

ジェネリックパラメータなし、シリアライゼーションの問題なし、コード生成不要。ScriptableObjectアセットを作って使うだけ。ゲーム開始、ゲームオーバー、一時停止、再開、チェックポイント到達——発生自体がメッセージ全体であるシグナル。

### 単一パラメータイベント：`GameEvent<T>`の具象化

型付きデータを1つ運ぶイベント。「何かが起きた、そして関連情報はこれ」。

![Creator Single](/img/game-event-system/visual-workflow/game-event-creator/creator-single.png)

ここでシリアライゼーションの壁にぶつかる。`GameEvent<float>`をInspectorで直接使えない。GESは`SingleGameEvent`、`Int32GameEvent`、`BooleanGameEvent`などの具象型でこれを解決する：

```csharp
[GameEventDropdown, SerializeField] private Int32GameEvent onScoreChanged;

public void AddScore(int points)
{
    currentScore += points;
    onScoreChanged.Raise(currentScore);
}
```

注意：フィールドの型は`Int32GameEvent`であり、`GameEvent<int>`ではない。Unityがシリアライズ、表示、保存できる具象的な非ジェネリッククラスだ。内部的には`GameEvent<int>`を継承しているが、Unityはジェネリックを見ない。具象サブクラスだけを見る。

ユースケース：スコア変更（`Int32GameEvent`）、ヘルス更新（`SingleGameEvent`）、ダメージ量（`SingleGameEvent`）、アイテム数、クールダウンタイマーなど、1つのデータで全ストーリーが語れるもの。

### Senderイベント：`GameEvent<TSender, TArgs>`の具象化

送信者のアイデンティティとイベントデータの両方を運ぶイベント。「この特定のオブジェクトにこの特定のことが起きた、詳細はこちら」。

![Creator Sender](/img/game-event-system/visual-workflow/game-event-creator/creator-sender.png)

2つのジェネリックパラメータは、手動システムではさらに多くのボイラープレートを意味する。GESは`GameObjectDamageInfoGameEvent`のような具象型を生成する：

```csharp
[GameEventDropdown, SerializeField] private GameObjectDamageInfoGameEvent onDamageTaken;

public void TakeDamage(DamageInfo info)
{
    currentHealth -= info.amount;
    onDamageTaken.Raise(gameObject, info);
}
```

Senderパラメータは、複数のインスタンスが同じイベント型を共有する場合に重要だ。10体の敵が同じ`onDamageTaken`イベントを発火する場合、Senderパラメータにより「ボスがダメージを受けた」と「雑魚がダメージを受けた」を追加の配線なしで区別できる。

ユースケース：戦闘イベント（誰が誰を、どれだけ）、インタラクションイベント（どのNPC、どのダイアログ）、物理イベント（どのオブジェクト、どの力）。「誰が」が「何が」と同じくらい重要なとき。

## ほとんどのプロジェクトをカバーする32の事前生成型

GESには32の一般的な型の具象実装が同梱されている。ほとんどのプロジェクトでは、何も生成する必要がない。

![Basic Types](/img/game-event-system/examples/02-basic-types-event/demo-02-editor.png)

事前生成セットには以下が含まれる：

- **プリミティブ：** `int`、`float`、`bool`、`string`、`byte`、`double`、`long`
- **Unity数学：** `Vector2`、`Vector3`、`Vector4`、`Quaternion`
- **Unityビジュアル：** `Color`、`Color32`
- **Unity参照：** `GameObject`、`Transform`、`Component`、`Object`
- **Unity構造体：** `Rect`、`Bounds`、`Ray`、`RaycastHit`
- **コレクションなど**

実際には、これらの事前生成型が典型的なプロジェクトのイベントニーズの70〜80%を処理する。スコア追跡、ヘルスシステム、UI更新、位置ブロードキャスト、基本的なゲームステート——コードジェネレータに触れずにすべてカバーされる。

残りの20〜30%は、ゲームが面白くなるところだ。`DamageInfo`、`QuestProgress`、`InventorySlot`、`DialogueLine`のようなカスタム構造体。そこでCreatorの出番だ。

## Creator：イベント作成時のコード生成

GESの設計における重要な洞察：コード生成は別のステップではない。カスタム型のイベント作成時に自動的に行われる。

![Creator Single](/img/game-event-system/visual-workflow/game-event-creator/creator-single.png)

Game Event Creatorを開いて、まだ具象イベントクラスのない型を選択すると、GESはその場で生成する。別のコード生成ツールを開く必要はない。コマンドを実行する必要はない。ボイラープレートのことを一切考えない。「`DamageInfo`を運ぶイベントが欲しい」と言えば、具象クラスが現れる。

### 何が生成されるのか

カスタム型の単一パラメータイベントの場合、Creatorは2つのものを生成する：

**1. 具象イベントクラス：**

```csharp
// Auto-generated by GES
public class DamageInfoGameEvent : GameEvent<DamageInfo> { }
```

**2. partialバインディングクラス：**

```csharp
public partial class GameEventManager
{
    /// <summary>
    /// The field name MUST match the Event Class Name + "Action"
    /// This allows the EventBinding system to find it via reflection.
    /// </summary>
    public partial class EventBinding
    {
        [HideInInspector]
        public UnityEvent<DamageInfo> DamageInfoGameEventAction;
    }
}
```

バインディングクラスはビジュアルワークフローを可能にするもの。Behavior Windowがイベントとレスポンスメソッドを接続するために使い、配線コードを書く必要がない。`partial`キーワードにより、これらの生成ファイルはコンパイル時にGESフレームワークの残りとクリーンにマージされる。

Senderイベントの場合、2つの型パラメータで同じパターンが適用される：

```csharp
// Auto-generated by GES
public class GameObjectDamageInfoGameEvent : GameEvent<UnityEngine.GameObject, DamageInfo> { }

public partial class GameEventManager
{
    public partial class EventBinding
    {
        [HideInInspector]
        public UnityEvent<UnityEngine.GameObject, DamageInfo> GameObjectDamageInfoGameEventAction;
    }
}
```

クリーンで、最小限で、正確。タイポなし。アトリビュートの漏れなし。不整合なし。命名規則は自動：型名 + `GameEvent`がクラス名、型名 + `GameEvent` + `Action`がバインディングフィールド名。すべての生成ファイルがまったく同じパターンに従う。

## CodeGenツール：作成ではなくメンテナンス

![Code Tools](/img/game-event-system/tools/codegen-and-cleanup/hub-code-tools.png)

疑問に思うかもしれない。Creatorが自動的に生成するなら、別のCodeGenツールは何のためにある？

CodeGenツールはメンテナンスシナリオのために存在する：

![CodeGen Tool](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

- **VCSマージ後。** 2人の開発者が異なるブランチでイベントを生成した。マージで新しいイベントアセットが入ったが、生成コードは入っていない。CodeGenツールが具象クラスの欠落したイベントをスキャンして再生成する。
- **GESアップグレード後。** 新バージョンで生成コードテンプレートが変わるかもしれない。CodeGenツールですべての具象クラスを新テンプレートに合わせて再生成できる。
- **不要な型のクリーンアップ。** イベントが生成されたカスタム構造体を削除した。CodeGenツールのクリーンアップモードが孤立した生成ファイルを見つけて削除する。

こう考えるといい：Creatorは日常のワークフロー。CodeGenツールは四半期ごとのメンテナンスパス。ほとんどの開発者はCreatorを常に使い、CodeGenツールはめったに使わない。

## 完全ウォークスルー：カスタム構造体から動作するイベントまで

現実的なシナリオを最初から最後まで見ていこう。「カスタムイベントが必要」から「ゲームで動いている」まで何ステップかかるか。

**シナリオ：** 戦闘システムを作っている。エンティティがダメージを受けたとき、誰がヒットされたか、ダメージ量、ダメージタイプ、ヒット地点をブロードキャストする必要がある。

### ステップ1：データ構造体を定義する

```csharp
namespace MyGame.Combat
{
    [Serializable]
    public struct DamageInfo
    {
        public float amount;
        public DamageType type;
        public Vector3 hitPoint;
        public bool isCritical;
    }
}
```

これはGESに関係なく書くゲームコード。GES固有のものは何もない。

### ステップ2：Creatorでイベントを作成する

Game Event Creatorを開く。イベントタイプとして「Single Parameter」を選択。パラメータ型として`DamageInfo`を選択または入力。イベントアセットの名前を`OnDamageTaken`にする。Createをクリック。

GESが`DamageInfoGameEvent`とそのバインディングフィールドを自動生成する。イベントアセットが作成され、使用可能。所要時間：約5秒。

### ステップ3：送信側を配線する

```csharp
using MyGame.Combat;
using UnityEngine;

public class Health : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private DamageInfoGameEvent onDamageTaken;

    private float currentHealth = 100f;

    public void TakeDamage(DamageInfo info)
    {
        currentHealth -= info.amount;
        onDamageTaken.Raise(info);
    }
}
```

Inspectorで`onDamageTaken`フィールドにプロジェクト内のすべての`DamageInfoGameEvent`アセットのドロップダウンが表示される。`OnDamageTaken`を選択。完了。

### ステップ4：受信側を配線する

ここが通常、リスナークラスの記述やコールバックの登録、サブスクリプションの管理が必要な部分だ。GESでは、Behavior Windowでビジュアルに設定する：

1. Game Event Editorで`OnDamageTaken`イベントを見つける
2. Behavior Windowを開く
3. アクションを追加：ダメージ数字UI、ヒット効果音、カメラシェイク、アナリティクスログ
4. 各アクションはGameObjectとメソッドをターゲットにする——コードの結合なし

受信側スクリプトは、publicメソッドを持つ普通のMonoBehaviourだ：

```csharp
public class DamageNumbersUI : MonoBehaviour
{
    public void ShowDamageNumber(DamageInfo info)
    {
        // Spawn floating text at info.hitPoint
        // Color based on info.isCritical
        // Size based on info.amount
    }
}
```

### ステップ5：コンパイル時の安全性を享受する

```csharp
// All of these are caught at compile time, not runtime:
onDamageTaken.Raise(42f);           // Error: float is not DamageInfo
onDamageTaken.Raise("damage");      // Error: string is not DamageInfo
onDamageTaken.Raise(null);          // Error: DamageInfo is a struct, can't be null
```

手で書いたボイラープレート：ゼロ。生成されたコード：小さなファイル2つ、自動的に。「ダメージイベントが必要」から「動いている」までの合計時間：1分以内。

## どのイベントタイプをいつ使うか

| シナリオ | イベントタイプ | 具体例 |
|----------|-----------|-----------------|
| 純粋なシグナル、データ不要 | `GameEvent`（void） | ゲーム一時停止、レベル完了 |
| データを1つブロードキャスト | 単一パラメータ | スコア用`Int32GameEvent`、ヘルス用`SingleGameEvent` |
| 複数の関連フィールド | 単一パラメータ + カスタム構造体 | 戦闘データ用`DamageInfoGameEvent` |
| 誰が送ったか知る必要がある | Sender | エンティティごとのヘルス用`GameObjectSingleGameEvent` |
| インスタンスごとの追跡 + リッチデータ | Sender + カスタム構造体 | `GameObjectDamageInfoGameEvent` |
| システム全体への通知 | `GameEvent`（void） | シーン遷移開始、セーブ完了 |

**一般的なルール：** voidイベントから始める。データが必要になったら、単一パラメータイベントを使う。1フィールド以上なら構造体でラップ。Senderイベントは、リスナーがどの特定のインスタンスがイベントを発火したか本当に知る必要があるときだけ使う。

## まとめ

Unityのジェネリックシリアライゼーション制約は現実にあり、厄介で、なくなる気配もない。でも、あなたの問題である必要はない。

パターンは明確：ボイラープレートが予測可能なら、ツールが書くべき。GESはこれを論理的帰結まで突き詰めている。コード生成と直接やり取りする必要がない。Creatorでイベントを作れば、具象クラスが現れる。フィールドに`[GameEventDropdown, SerializeField]`を使えば、Inspectorがそのまま動く。CodeGenツールがチーム協業とバージョン管理で生じるエッジケースを処理する。

計算は単純だ。手動アプローチ：ほぼ同一のコード40以上のファイル、手動メンテナンス、コピペエラーが起きやすく、新しいイベント型が必要なすべての開発者の速度を落とす。GESアプローチ：手書きボイラープレートゼロ、作成時の自動生成、エンドツーエンドの型安全性、そして生成コードのリフレッシュが必要なまれな機会のためのメンテナンスツール。

ボイラープレートが100%予測可能なら、人間が書くべきではない。それは怠惰じゃない——それがエンジニアリングだ。

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
