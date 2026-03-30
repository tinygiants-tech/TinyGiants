---
slug: five-minute-quickstart
title: '5分で始める：ゼロから作る初めてのイベント駆動システム'
authors: [tinygiants]
tags: [ges, unity, tutorial, beginner]
description: "Game Event SystemをUnityプロジェクトで動かすまでの、速くて無駄のないガイド。インストールから最初のイベントが動くまで5分。"
image: /img/home-page/game-event-system-preview.png
---

「5分しかないんだけど、イベントシステムの動かし方だけ教えてくれない？」

了解。理論もアーキテクチャの深掘りも他のアプローチとの比較もなし。Unityプロジェクトでゼロから動くイベント駆動のインタラクションを作りたい、そしてそれを速くやりたい。いこう。

このガイドはUnityプロジェクトが開いている（2021.3 LTS以降）前提で、所要時間は約5分。終わるころには、ゲーム内で何かが起きたときに発火し、完全に別のGameObjectでレスポンスをトリガーするイベントが手に入る——両者の間に直接参照はゼロで。

<!-- truncate -->

## ステップ1：Asset StoreからGESをインストール（60秒）

Unity Asset StoreのGame Event Systemページを開く。「Add to My Assets」をクリック、UnityでPackage Manager（Window > Package Manager）を開き、「My Assets」からGESを見つけてImportを押す。

インポートが終わったら、プロジェクトに`TinyGiants`フォルダが見えるはず。コンパイラエラーが出たら、Unity 2021.3以降であることを確認してほしい。

![Installation Success](/img/game-event-system/intro/installation/install-step-3-success.png)

インストールはこれだけ。追加の依存関係なし、Assembly Definition Conflictの解決なし、セットアップウィザードなし。

## ステップ2：Dashboardを開いて初期化（30秒）

Unityのメニューバーから：**Tools > TinyGiants > Game Event System**。GES Dashboardが開く。

初回は「Uninitialized」状態が表示される。システムがコアScriptableObjectアセット（イベントマネージャーとデフォルトイベントデータベース）を作成する必要がある。

![Dashboard Uninitialized](/img/game-event-system/examples/00-quick-start/uninitialized.png)

**Initialize**ボタンをクリック。GESがプロジェクトに必要なアセットを作成し、デフォルト設定をセットアップする。ダッシュボードがイベントマネージャー準備完了の初期化済み状態に切り替わる。

![Dashboard Initialized](/img/game-event-system/examples/00-quick-start/initialized.png)

次に`GameEventManager`をシーンに追加する。マネージャーアセットをヒエラルキーにドラッグするか、空のGameObjectを作成して`GameEventManager`コンポーネントを追加すればいい。必要ならダッシュボードがガイドしてくれる。

![Manager Setup](/img/game-event-system/intro/installation/install-step-4-manager.png)

## ステップ3：最初のイベントを作成（45秒）

シンプルなvoidイベントを作ろう。データを持たずに「何かが起きた」と伝えるイベント。名前は「OnButtonPressed」にする。

GES Event Editor（ダッシュボードまたは**Tools > TinyGiants > Event Editor**からアクセス可能）で、**「+ New Event」**ボタンをクリック。Creator Windowが開く。イベントタイプとして**Parameterless (Void)**を選択。`OnButtonPressed`と名前を付けてCreateをクリック。

![Creator](/img/game-event-system/visual-workflow/game-event-creator/creator-parameterless.png)

システムが新しいScriptableObjectアセットを作成する。イベントがプロジェクト内のドラッグ可能で参照可能なアセットとして存在する。Event Editorウィンドウで、GUID、現在のリスナー数、設定オプションが確認できる。

## ステップ4：コードからイベントをRaise（90秒）

`ButtonPresser.cs`という新しいC#スクリプトを作成。このスクリプトがメソッド呼び出し時（またはUIボタンクリック時やトリガー時など）にイベントをRaiseする。

```csharp
using UnityEngine;
using TinyGiants.GES;

public class ButtonPresser : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent onButtonPressed;

    // Call this from a UI Button's OnClick, or from Update, or from anywhere
    public void PressTheButton()
    {
        Debug.Log("Button pressed! Raising event...");
        onButtonPressed.Raise();
    }

    // For testing: press Space to trigger
    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            PressTheButton();
        }
    }
}
```

シーンに新しい空のGameObjectを作成する。「EventSender」と名付ける。`ButtonPresser`コンポーネントを追加。

ここが重要な部分：Inspectorで`onButtonPressed`フィールドが**検索可能なドロップダウン**として表示される（`[GameEventDropdown]`のおかげ）。クリックすると、アクティブなデータベースからのすべてのvoidイベントのリストが表示される。`OnButtonPressed`を見つけて選択。Projectウィンドウを掘り返す必要も、手動ドラッグも不要。

送信側はこれで完了。`PressTheButton()`が呼ばれると、イベントがRaiseされる。送信側は誰がリスンしているか知らないし、気にもしない。

## ステップ5：Inspectorでレスポンスをバインド（90秒）

次に、イベントに応答するものを作る。`ButtonResponder.cs`という別のスクリプトを作成：

```csharp
using UnityEngine;

public class ButtonResponder : MonoBehaviour
{
    public void RespondToButton()
    {
        Debug.Log("I heard the button press! Responding...");
        // Do anything here: play a sound, move an object, show UI, etc.
    }

    public void FlashColor()
    {
        var renderer = GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.material.color = Random.ColorHSV();
        }
    }
}
```

受信側をセットアップする：

1. シーンに**3D Cube**を作成（GameObject > 3D Object > Cube）。「Responder」と名付ける。
2. Cubeに`ButtonResponder`コンポーネントを追加。
3. `OnButtonPressed`イベントの**Behavior Window**を開く。Event Editorからイベントの Behaviorボタンをクリックすればいい。

Behavior Windowで**Event Action**を設定する：

- Cubeをターゲットオブジェクトスロットにドラッグし、`ButtonResponder > RespondToButton`を選択（ビジュアルなレスポンスが欲しければ`ButtonResponder > FlashColor`でも可）

![Hierarchy Setup](/img/game-event-system/visual-workflow/game-event-behavior/behavior-action-add.png)

ヒエラルキーはこうなっているはず：
- **EventSender**（`ButtonPresser`コンポーネント付き、イベントアセットを参照）
- **Responder**（`ButtonResponder`コンポーネント付き）

どちらのオブジェクトも相手への直接参照を持たない。共有イベントアセットだけを通じて通信する。

## ステップ6：Playして確認（15秒）

Playを押す。Spaceを押す（または設定したトリガーを実行）。次が表示されるはず：

1. コンソールに「Button pressed! Raising event...」が表示
2. コンソールに「I heard the button press! Responding...」が表示
3. `FlashColor`を使った場合、Cubeの色が変わる

以上。イベント駆動システムが動いている。送信側がイベントをRaiseした。受信側が応答した。お互いの存在を知らない。

### クイック確認チェックリスト

- イベントが発火してレスポンスがトリガーされる：動作中
- Responderオブジェクトを削除してSpaceを押す：送信側はまだ動く（null参照エラーなし、ただvoidに発火するだけ）
- Responderを複製：両方のコピーが同じイベントに応答する（自動マルチリスナーサポート）
- 別のシーンのオブジェクトにリスナーを追加（マルチシーン設定がある場合）：それでも動く（クロスシーン通信が無料で手に入る）

## さらにレスポンスを追加（コード変更なし）

ここでこのパターンのパワーが明らかになる。ボタンプレス時にサウンドエフェクトを追加したい？

1. 「AudioResponder」という新しい空のGameObjectを作成
2. `AudioSource`コンポーネントを追加
3. `OnButtonPressed`イベントの**Behavior Window**を開く
4. 新しいEvent Actionを追加：AudioResponder GameObjectをドラッグして`AudioSource.Play()`を選択

完了。`ButtonPresser.cs`に触っていない。Responder Cubeも変更していない。同じイベントのBehaviorに新しいアクションを追加しただけ。システムは完全に疎結合——新しいレスポンスの追加に既存コードの変更はゼロ。

パーティクルエフェクトを追加したい？同じ手順。カメラシェイク？同じ手順。アナリティクスログ？同じ手順。各新レスポンスは、同じイベントのBehavior Windowで設定される独立したEvent Action。

## イベントでデータを渡す

作ったばかりのvoidイベントは最もシンプルなタイプだ。しかし、ほとんどの実際のイベントはデータを運ぶ——「プレイヤーが25ダメージ受けた」とか「スコアが1500になった」とか。

型付きイベントのクイックプレビュー。GESには一般的なデータ用の事前生成型が同梱されている：

```csharp
using UnityEngine;
using TinyGiants.GES;

public class ScoreManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onScoreChanged;  // Pre-generated type

    private int currentScore;

    public void AddScore(int points)
    {
        currentScore += points;
        onScoreChanged.Raise(currentScore);  // Passes the int value with the event
    }
}
```

リスナー側では、レスポンスメソッドがデータを受け取る：

```csharp
public class ScoreDisplay : MonoBehaviour
{
    [SerializeField] private TMP_Text scoreText;

    // This method is wired up via the Behavior Window's Event Action
    public void UpdateDisplay(int newScore)
    {
        scoreText.text = $"Score: {newScore}";
    }
}
```

型付きイベントでも、Behavior Windowを通じて同じようにレスポンスを設定する。レスポンスメソッドが型付きパラメータを自動的に受け取る。

## よくある初回の質問

**Q：GameEventManagerはすべてのシーンに必要？**
A：最初にロードされるシーンに1つ必要。永続的な「Bootstrap」シーンやDontDestroyOnLoadパターンを使っているなら、そこに置く。シングルシーンゲームなら、そのシーンに追加するだけ。

**Q：リスナーがいないイベントをRaiseしたらどうなる？**
A：何も起きない。エラーなし、警告なし、パフォーマンスコストなし。イベントが発火して誰も応答しない。これは設計上の意図——リスナーが存在する前にシステムにイベントを追加しても安全。

**Q：Behavior Windowの代わりにコードでイベントをリスンできる？**
A：もちろん。`AddListener`/`RemoveListener`でプログラムからリスナーを登録できる：

```csharp
[GameEventDropdown, SerializeField] private GameEvent onButtonPressed;

private void OnEnable()
{
    onButtonPressed.AddListener(OnButtonPressed);
}

private void OnDisable()
{
    onButtonPressed.RemoveListener(OnButtonPressed);
}

private void OnButtonPressed()
{
    Debug.Log("Button pressed!");
}
```

Behavior Windowアプローチはより可視的でデバッグしやすいためほとんどのケースで推奨されるが、動的なシナリオではコードベースのリスナーも完全にサポートされている。

**Q：コードなしでInspectorからイベントをRaiseできる？**
A：できる。イベントアセットのInspectorに「Raise」ボタンがある。テストに最適——実際のゲーム条件を再現しなくても、ゲーム実行中に手動で任意のイベントをトリガーしてリスナーの応答を確認できる。

**Q：どのイベントが発火しているかデバッグするには？**
A：GESにはRuntime Monitorツールがあり、すべてのアクティブイベント、リスナー数、Raise/受信操作のライブログを表示する。ゲーム実行中にGES Dashboardから開ける。

## 次のステップ：学習パス

基本が動いたら、さらに深く掘り下げるための推奨順序：

### 第1週：基本をマスター
- ゲームのコアインタラクション用にvoidイベントを5〜10個作成（ゲーム開始、ゲームオーバー、一時停止、再開、レベル完了）
- パターンを練習：イベントアセット + 送信側 + リスナー
- Inspectorワークフローに慣れる

### 第2週：型付きイベント
- データを運ぶイベントに事前生成型（int、float、string、Vector3）を使用
- ヘルスシステムを構築：ヘルス変更に`FloatGameEvent`、死亡に`GameEvent`
- スコアシステムを構築：スコア更新に`IntGameEvent`

### 第3週：カスタム型
- ゲーム固有のイベント用にカスタムデータ構造体を定義
- Event Editorを開き、「+ New Event」をクリック、Creatorでカスタム型を選択——必要なコードが自動生成される
- カスタム型付きイベントを使って完全な機能を実装

### 第4週：コンディションツリーとビジュアルフロー
- リスナーにコンディションを追加：「プレイヤーが生きている場合のみ応答」
- AND/ORロジックでビジュアルコンディションツリーを構築
- マルチステップイベントレスポンスにフローシステムを使用

### 第5週：スケールでの組織
- プロジェクトモジュール用のマルチデータベースアーキテクチャをセットアップ
- カテゴリベースの組織を導入
- シーン固有イベント用のデータベース動的ローディングを設定

### 継続的：プロダクションパターン
- プレイモードでのイベントフローデバッグにRuntime Monitorを使用
- インスタンスごとの追跡にSenderイベントを実装
- クロスシーン通信パターンを構築
- GESパフォーマンスツールでプロファイリングと最適化

## 5分間のまとめ

やったこと全部、順番に：

1. Asset StoreからGESを**インストール**
2. Dashboardでシステムを**初期化**
3. voidイベントアセット（`OnButtonPressed`）を**作成**
4. イベントをRaiseする**送信側スクリプトを作成**
5. Behavior Windowを使って同じイベントにEvent Actionを設定する**受信側を構築**
6. **Playして**動作確認

合計時間：約5分。合計コード行数：約15行（送信側スクリプト）。送信側と受信側の間の直接参照：ゼロ。

これがGESによるイベント駆動アーキテクチャのコアだ。他のすべて——型付きイベント、コンディション、ビジュアルフロー、マルチデータベース組織——はこの同じ基本パターンの上に構築される：**イベントアセットが送信側と受信側の間に座り、どちらも相手の存在を知らない。**

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
