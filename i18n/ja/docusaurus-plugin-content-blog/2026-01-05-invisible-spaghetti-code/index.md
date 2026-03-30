---
slug: invisible-spaghetti-code
title: 'さよなら見えないスパゲッティ：あなたのイベントシステムがプロジェクトを壊している理由'
authors: [tinygiants]
tags: [ges, unity, architecture, decoupling, beginner]
description: "従来のUnityイベントシステムは、実行時に壊れる見えない依存関係を生み出します。ScriptableObjectベースのイベントとGUID保護がこの問題を根本的に解決する方法を紹介します。"
image: /img/home-page/game-event-system-preview.png
---

メソッド名を1つだけ変えた。`OnPlayerDied`を`OnPlayerDefeated`に。ゲームデザイナーから「表現をもう少しソフトにして」と頼まれたから。Playを押す。何も起きない。コンパイルエラーなし。警告なし。Inspectorで紐づけていた10個のシーンオブジェクトのUnityEventが、ただ...動かなくなった。無言で。そしてそのことに気づくのは、3日後にQAが報告してくれたとき。最悪の場合、プレイヤーが気づくことになる。

心当たりがあるなら、おめでとう。あなたは「見えないスパゲッティコード」に出会っている。IDEにも表示されない。コンパイラ警告も出ない。依存関係グラフにも出てこない。ただそこに潜んでいて、最悪のタイミングで壊れるのを待っている。

これはスキルの問題じゃない。アーキテクチャの問題だ。そして、ほとんどのUnity開発者が認めたがらないほどよくある話だ。

<!-- truncate -->

## 誰も語らない3つの致命的な問題

何年もUnityプロジェクトを作ってきた中で、イベント駆動のUnityプロジェクトをほぼ例外なく悩ませる3つの問題を特定した。従来の意味での「バグ」ではない。時間とともに複合化する構造的な欠陥だ。

### 問題1：見えない依存関係（誰がリスンしているのか？）

こんなシナリオを考えてみよう。`GameManager`がプレイヤーのレベルアップ時にイベントを発火する。プロジェクトのどこかで、UIがレベル表示を更新するために、オーディオシステムがファンファーレを鳴らすために、実績システムがマイルストーンをチェックするために、アナリティクスシステムがイベントをログするためにリスンしている。

じゃあ聞くけど、プロジェクト内のすべてのスクリプトを検索せずに、今そのイベントにどのシステムがサブスクライブしているか分かる？

分からないよね。全検索しない限り。それが問題なんだ。

従来のC# eventやdelegateでは、サブスクリプションは数十のファイルに散らばったコードの中で行われる。全体像を把握できる場所が1つもない。接続は見えない。実行時のメモリ上にのみ存在するdelegateチェーンとして存在し、プレイを止めた瞬間に消える。

```csharp
// GameManager.cs
public static event Action OnPlayerLevelUp;

// Somewhere in LevelUI.cs
GameManager.OnPlayerLevelUp += UpdateLevelDisplay;

// Somewhere in AudioManager.cs
GameManager.OnPlayerLevelUp += PlayLevelUpFanfare;

// Somewhere in AchievementTracker.cs
GameManager.OnPlayerLevelUp += CheckLevelMilestones;

// Somewhere in AnalyticsService.cs
GameManager.OnPlayerLevelUp += LogLevelUpEvent;
```

4つの異なるファイル。4つのサブスクリプションポイント。どこか1箇所からの可視性はゼロ。これを実際のプロジェクトの50個のイベントに掛け合わせてみてほしい。

### 問題2：リネームで実行時に壊れる

これは本当にタチが悪い。UnityEventはメソッド名を文字列としてシリアライズする。もう一度言う：**文字列として**。Inspectorで紐づけたメソッドの名前を変えても、Unityは知らない。シリアライズされたデータは古い名前を指したまま。コンパイルエラーなし。警告なし。実行時にただ沈黙するだけ。

```csharp
// Before: works fine
public void OnPlayerDied() { /* ... */ }

// After: renamed for clarity
public void OnPlayerDefeated() { /* ... */ }
// Every Inspector binding to "OnPlayerDied" is now broken.
// Zero compiler warnings. Zero runtime errors. Just... nothing happens.
```

文字列ベースのイベントシステムも同じ問題を抱えているが、もっと深刻だ。UnityEventの場合は少なくとも、シーン内のすべてのオブジェクトをクリックすれば、どのGameObjectに紐づけがあるか確認できる。

```csharp
// String-based event system
EventBus.Subscribe("player_died", HandlePlayerDeath);
EventBus.Publish("player_died"); // Works

// Someone "fixes" the naming convention
EventBus.Subscribe("PlayerDied", HandlePlayerDeath);
EventBus.Publish("player_died"); // Still uses old string. Silent failure.
```

### 問題3：クロスシーンイベント地獄

Unityのシーンシステムとイベントシステムは根本的に相性が悪い。staticイベントはシーンロードを跨いで残るので、破棄されたオブジェクトからのゴーストサブスクリプションが発生する。インスタンスベースのイベントはシーンと一緒に消えるので、シーン間通信ができない。

```csharp
// Static event approach: ghost subscription problem
public class EnemySpawner : MonoBehaviour
{
    void OnEnable()
    {
        GameManager.OnWaveStart += SpawnWave;
    }

    // If you forget OnDisable, or the object is destroyed
    // without OnDisable firing, you get a null reference
    // on the NEXT scene load when the event fires
    void OnDisable()
    {
        GameManager.OnWaveStart -= SpawnWave;
    }
}
```

定番の「修正」は`OnDisable`や`OnDestroy`で解除すること。でも、たった1つの解除漏れ、通常のライフサイクルを経ずにオブジェクトが破棄されるエッジケース1つで、`MissingReferenceException`やメモリリークが発生する。しかも20分のプレイ後にようやく現れたりする。

## 従来のアプローチ（そしてなぜどれも不十分なのか）

ほとんどのUnity開発者が手を伸ばすツールについて、正直に話そう。

### 素のC# Events / Delegates

**メリット：** 型安全、高速、C#開発者にとって馴染みがある。
**致命的な欠点：** 可視性ゼロ。Inspector統合なし。サブスクリプションがコードベース中に散在。プロジェクト全体をgrepしない限り、誰がリスンしているか分からない。

### UnityEvents

**メリット：** Inspectorで紐づけが見える。デザイナーがコードなしで配線できる。
**致命的な欠点：** 文字列ベースのメソッドシリアライゼーション。メソッド名を変えると無言で壊れる。毎回の呼び出しでリフレクションのパフォーマンスオーバーヘッド。すべてのシーンをまたいだリスナー一覧を確認する方法がない。

### Singletonイベントマネージャー

**メリット：** 単一アクセスポイント。理解しやすい。
**致命的な欠点：** Singletonへの密結合。テストしにくい。ロード順の問題。すべてが1つのGodオブジェクトに依存し、メンテナンスの悪夢になる。

```csharp
// The singleton pattern that starts simple and grows into a monster
public class EventManager : MonoBehaviour
{
    public static EventManager Instance;

    // Month 1: just a few events
    public event Action OnPlayerDied;
    public event Action<int> OnScoreChanged;

    // Month 6: the file is 800 lines long
    public event Action<Enemy, Vector3, float> OnEnemyDamaged;
    public event Action<string, int, bool, ItemData> OnInventoryChanged;
    // ... 40 more events ...
}
```

### 文字列ベースのイベントバス

**メリット：** 完全に疎結合。新しいイベントの追加が簡単。
**致命的な欠点：** 型安全性なし。タイポがサイレントな失敗を引き起こす。オートコンプリートなし。リファクタリングサポートなし。実質的にC#の中でJavaScriptの型システムを再発明しているようなもの。

これらのソリューションはどれも、3つの問題を同時に解決しない。1つを直すと別のものが悪化する。

## ScriptableObjectイベントパターン：アセットとしてのイベント

ここからが面白い。もしイベントがコードの一行ではなく、**モノ**だったら？プロジェクト内に存在し、アイデンティティを持ち、どのシーンのどのオブジェクトからも参照できるアセットだったら？

それがGame Event System（GES）の核心的なアイデアだ。イベントはScriptableObjectアセット。`.asset`ファイルとしてプロジェクト内に存在する。作成し、命名し、フォルダに整理し、Inspectorから参照する。

![GES Architecture](/img/game-event-system/intro/overview/architecture.png)

これでイベント通信の仕組みが根本的に変わる：

**送信側** → Event Assetを参照 → **受信側**も同じEvent Assetを参照

送信側は受信側を知らない。受信側も送信側を知らない。両方ともイベントだけを知っている。これが本物の疎結合だ。「すべてが依存するSingletonを介した疎結合」ではなく、本当のアーキテクチャ的分離だ。

```csharp
// Sender: raises the event. Doesn't know or care who's listening.
public class PlayerHealth : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent onPlayerDefeated; // Drag the asset in

    public void TakeDamage(float damage)
    {
        currentHealth -= damage;
        if (currentHealth <= 0f)
        {
            onPlayerDefeated.Raise(); // That's it. Done.
        }
    }
}
```

受信側では、コードを書く必要がない。Behavior Windowでアクションを設定するだけだ。

![Action Behavior](/img/game-event-system/visual-workflow/game-event-behavior/behavior-window-full.png)

### ビジュアルバインディングの力

GESを使えば、すべてが見える。イベントアセットをクリックすると、Inspectorにそのアセットを参照しているすべてのオブジェクト（送信側と受信側の両方）が表示される。Event Editorウィンドウを開けば、イベントアーキテクチャ全体を俯瞰できる。

![Event Editor](/img/game-event-system/visual-workflow/game-event-editor/editor-window-full.png)

これは単なる便利機能じゃない。イベント駆動コードのデバッグとメンテナンスの方法を根本的に変えるものだ。何か問題が起きたとき、ファイルをgrepするのではなく、イベントアセットをクリックして関係者を一目で確認できる。

![Inspector Binding](/img/game-event-system/visual-workflow/game-event-finder/game-event-finder-grouped.png)

## GUID保護の仕組み

ここでGESがリネーム問題を恒久的に解決する。すべてのイベントアセットにはGUIDがある。アセット作成時にUnityが割り当てる一意の識別子だ。コンポーネントがイベントを参照するとき、名前やパスで参照しているのではない。GUIDで参照している。

実際にはどういう意味か？

- **イベントアセットをリネーム？** 参照は生きている。GUIDは変わらない。
- **アセットを別のフォルダに移動？** 参照は生きている。同じGUID。
- **リスナーのフィールド名をリネーム？** 関係ない。紐づけはアセットに対してであり、文字列に対してではない。
- **プロジェクト構造を全面的にリファクタリング？** `.asset`ファイルが存在する限り、すべての参照はそのまま。

これはUnityがすべてのアセット参照（Prefab、マテリアル、テクスチャ）に使っているのと同じ仕組みを、イベントアーキテクチャに適用したもの。カスタムハックではなく、Unityのシリアライゼーションシステムを設計どおりに活用している。

従来のアプローチと比較してみよう：

```csharp
// Traditional: rename "OnPlayerDied" to "OnPlayerDefeated" and everything breaks
UnityEvent onPlayerDied; // String-serialized method bindings are now invalid

// GES: rename the asset from "PlayerDied" to "PlayerDefeated"
// Result: every reference updates automatically. Nothing breaks. Ever.
```

## 疎結合アーキテクチャの実践

実際の例を見ていこう。RPGを作っている。プレイヤーがボスを倒した。以下のことが起きる必要がある：

1. 勝利のファンファーレを再生
2. 「ボス撃破！」のUIポップアップを表示
3. 次のエリアを解放
4. 実績を付与
5. アナリティクスイベントをログ
6. ゲームをセーブ

従来のアプローチ：`BossEnemy`スクリプトが6つの異なるシステムへの直接参照（またはイベントサブスクリプション）を持つ。どれか1つを変えるだけで、ボス戦が壊れるかもしれない。

GESアプローチ：`BossEnemy`スクリプトが持つ参照は1つだけ。`BossDefeated`イベントアセットへの参照だ。ボスが死んだらそのイベントをRaiseする。6つのシステムはそれぞれ独立して同じイベントアセットをリスンする。ボスはそのどれも知らない。

```csharp
// BossEnemy.cs — knows about NOTHING except its own event
public class BossEnemy : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private GameEvent onBossDefeated;

    private void Die()
    {
        // Play death animation, etc.
        onBossDefeated.Raise();
    }
}
```

オーディオシステム、UIシステム、進行システム、実績システム、アナリティクスシステム、セーブシステム。すべてのレスポンスは`BossDefeated`イベントのBehavior Windowで**Event Action**として設定される。対象オブジェクトをドラッグして、メソッドを選択するだけ。コードの結合なし。見えない依存関係なし。リネームで無言で壊れる可能性なし。

7つ目のレスポンス、例えばルートドロップのスポーンを追加したい？`BossDefeated`のBehavior Windowを開いて、新しいEvent Actionを追加し、ルートスポーナーのspawnメソッドを指定するだけ。既存のコードを一行も触っていない。

アナリティクスのログを削除したい？Behavior WindowからそのEvent Actionを削除するだけ。他のシステムに影響はない。

これが本物の疎結合だ。「すべてが依存する仲介者を通じた疎結合」ではなく、共有された可視のGUID保護イベントアセットを通じて通信する、真に独立したシステムだ。

## クロスシーン問題：解決済み

ゴーストサブスクリプション問題を覚えている？ScriptableObjectイベントはこれをエレガントに解決する。ScriptableObjectはシーンの外に存在するプロジェクトレベルのアセットだからだ。

イベントリスナーは有効化時にサブスクライブし、無効化時にアンサブスクライブする。これはUnityの`OnEnable`/`OnDisable`ライフサイクルを通じて自動的に行われる。Behavior Windowのバインディングがこれを処理してくれる。シーンがアンロードされると、すべてのGameObjectが破棄され、`OnDisable`が発火し、クリーンにアンサブスクライブする。ゴースト参照なし。メモリリークなし。`MissingReferenceException`なし。

そしてイベントアセット自体はシーンロードを跨いで永続するため、クロスシーン通信が無料で手に入る。ゲームプレイシーンでRaiseされたイベントがUIシーンでレスポンスを引き起こせる。ローディング画面からのイベントがメインメニューのシステムを初期化できる。イベントアセットが仲介者だから、ただ動く。シーンにバインドされたオブジェクトではなく。

```csharp
// This works across scenes automatically.
// The event asset exists at the project level.
// Listeners subscribe/unsubscribe via OnEnable/OnDisable.
// No special setup. No DontDestroyOnLoad hacks. No singletons.
```

## 切り替えの始め方

見えないスパゲッティだらけのプロジェクトを前にしているなら（散在する`+=`サブスクリプション、文字列ベースのイベント、脆いUnityEventバインディング）、リファクタリングは気が遠くなるかもしれない。でも、一度に全部やる必要はない。

1つのシステムから始めよう。プロジェクトで最も痛いイベントのやり取りを選ぶ。最もよく壊れるもの、リファクタリングが怖いもの。それだけをGESのイベントアセットに置き換える。どう感じるか試してみる。イベントをクリックするだけで接続されているすべてが見えるようになったとき、デバッグがどれだけ楽になるか実感してほしい。

そしてもう1つ。もう1つ。徐々に、見えないスパゲッティがほどけていく。アーキテクチャが可視化される。イベントフローが、50ファイルに散在する隠れたdelegateチェーンの網ではなく、実際に見て推論できるグラフになる。

## まとめ

1. **見えない依存関係こそが本当の敵。** イベントを持つかどうかではなく、それを見て管理できるかどうかが重要。
2. **文字列ベースのシリアライゼーションは時限爆弾。** GUIDベースの参照は、実行時エラーのカテゴリ全体を排除する。
3. **クロスシーン通信にハックは不要。** ScriptableObjectイベントはシーン階層の外に存在することでこれを解決する。
4. **疎結合とは、どちら側も相手を知らないこと。** 「疎結合」システムが両側に共有Singletonへの参照を要求するなら、それは本当の疎結合ではない。
5. **ビジュアルデバッグがアーキテクチャの考え方を変える。** イベントフローが見えるとき、より良いシステムを設計できる。

見えないスパゲッティは、見えないままでいる必要はない。そしてスパゲッティである必要もない。

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
