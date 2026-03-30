---
slug: cross-scene-persistence
title: 'クロスシーンイベント：誰も語らないが誰もがハマる永続化の問題'
authors: [tinygiants]
tags: [ges, unity, cross-scene, architecture, best-practices]
description: "シーン遷移がイベントサブスクリプションを壊す。Staticイベントがゴースト参照を生む。DontDestroyOnLoadは応急処置。シーンロードを実際に生き延びるイベント通信の構築方法を解説する。"
image: /img/home-page/game-event-system-preview.png
---

`AudioManager`がBGMを再生している。プレイヤーが新しいエリアに入った時にトラックを切り替えるため、`OnLevelStart`にサブスクライブしている。`AudioManager`を`DontDestroyOnLoad`オブジェクトに配置して、シーンロードをまたいで永続化させた。開発中は常に同じシーンでテストしているのですべて正常に動作する。

ある日、誰かが初めてレベル1からレベル2をロードする。BGMが切り替わらなくなる。`AudioManager`はまだ生きている——`DontDestroyOnLoad`がその仕事を果たした——しかしイベントサブスクリプションはシーン遷移を生き延びなかった。あるいはもっと悪い状況：古いサブスクリプションがまだ残っていて、破棄されたレベル1のイベント発火元を指しており、次に何かがそれを呼び出そうとすると、ゲームプレイの最中に`MissingReferenceException`が発生する。

これが永続化問題であり、複数のシーンを持つすべてのUnityプロジェクトがいずれぶつかるものだ。

<!-- truncate -->

## 根本的な矛盾

Unityのシーンシステムとイベントシステムは、オブジェクトの寿命に関して根本的に異なる前提の上に構築されている。

シーンは**一時的**だ。シーンをロードし、使い、アンロードする。シーン内のオブジェクトはシーンと共に生まれ、シーンと共に消える。これはクリーンで予測可能であり、プレイヤーのゲーム体験にも合致する——新しいエリアに移動し、古いエリアを後にする。

イベントには**永続性**が必要だ。グローバルなアナリティクスシステムはすべてのシーンからのダメージイベントを受け取る必要がある。セーブシステムはプレイヤーがどのレベルにいるかに関わらず、チェックポイントイベントに応答する必要がある。実績トラッカーはプレイセッション全体にわたってデータを蓄積する必要がある。

この2つのモデルは対立している。そしてUnityはそれらを調停するための良いツールを提供しない。

## Staticイベント：ゴーストサブスクリプション問題

ほとんどの開発者がまず試すのはstaticイベントだ：

```csharp
public static class GameEvents
{
    public static event Action OnLevelStart;
    public static event Action<int> OnPlayerDamaged;
    public static event Action OnPlayerDied;
}
```

Staticイベントはクラスに属しオブジェクトに属さないため、シーンロードをまたいで永続化する。問題解決？

そうでもない。Staticイベントは永続化するが、**それらにサブスクライブしたオブジェクト**は永続化しない。シーンがアンロードされると、そのシーン内のすべてのMonoBehaviourが破棄される。それらのMonoBehaviourのいずれかがstaticイベントにサブスクライブし、`OnDisable`や`OnDestroy`でアンサブスクライブしなかった場合、ゴーストサブスクリプションが生まれる——破棄されたオブジェクトを指すデリゲートだ。

次にイベントが発火すると：

```
MissingReferenceException: The object of type 'EnemySpawner'
has been destroyed but you are still trying to access it.
```

修正は明白に見える：常に`OnDisable`でアンサブスクライブする。しかし`OnDisable`にはシーン遷移中に独自の問題がある（後述）。そして規律を守っていても、1つのスクリプトの1つのアンサブスクライブ漏れがシーン遷移中にのみ顕在化するバグを生む——最も再現しにくく、テストで見逃しやすい類のバグだ。

Staticイベントには別のアーキテクチャ上の問題もある：**すべてがグローバル**になる。「このイベントはこのシーンに属する」や「このイベントはこのコンテキストでのみ関連する」という概念がない。プロジェクト全体のすべてのシステムが、すべてのイベントを参照しサブスクライブできる。`OnApplicationPause`のような本当にグローバルなイベントには良いが、`OnDoorOpened`や`OnPuzzleSolved`のようなシーン固有のイベントには混乱の元だ。

## インスタンスイベント：シーンと共に消える

逆のアプローチ——MonoBehaviour上のインスタンスイベント：

```csharp
public class LevelManager : MonoBehaviour
{
    public event Action OnLevelStart;
    public event Action OnLevelComplete;
}
```

これらはクリーンでスコープが限定されている。`LevelManager`への参照を持つオブジェクトだけがサブスクライブできる。シーンがアンロードされると、`LevelManager`は破棄され、すべてのサブスクリプションも一緒に消える。ゴースト参照なし。

しかしクロスシーン通信が不可能になる。`AudioManager`（`DontDestroyOnLoad`の世界に住んでいる）は現在のシーンの`LevelManager`への参照が必要だ。どうやってその参照を取得する？ シーンロードごとに`FindObjectOfType`？ Staticレジストリ？ Service Locator？ 各解決策が複雑さとカップリングを追加する——まさにイベントが排除するはずだったものだ。

そしてシーンがアンロードされると、`AudioManager`は破棄された`LevelManager`への参照を保持している。nullチェックしていることを祈ろう。

## DontDestroyOnLoadという応急処置

「イベントシステムを`DontDestroyOnLoad`オブジェクトに置けばいい。」

最もよくあるアドバイスで、ある程度は機能する。永続的な`EventManager`を作ってすべてのイベントを保持し、`DontDestroyOnLoad`にマークし、すべてがそれにサブスクライブする。

しかし`DontDestroyOnLoad`について語られないことがある：

**問題1：非DDOLオブジェクトの`OnDisable`がシーン遷移中に発火する。** Unityがシーンをアンロードすると、そのシーンのすべてのMonoBehaviourが`OnDisable`と`OnDestroy`を受け取る。リスナーが`OnDisable`でアンサブスクライブしていると（そうすべきだが）、シーン遷移中にアンサブスクライブされる。イベントシステムが一時的にリスナーゼロになる。このウィンドウ中に何かがイベントを発火しても、誰も聞かない。

**問題2：遷移中の実行順序が保証されない。** 新しいシーンがロードされると、新しいMonoBehaviourすべてに`OnEnable`が発火する。しかしどの順序で？ システムAがシステムBが初期化するイベントにサブスクライブする必要がある場合、Bの`OnEnable`がAの後に実行されるとnull参照が発生する。自分の環境では動く（Unityがたまたま正しい順序で初期化した）。QAテスターの環境では動かない。

**問題3：重複DDOLオブジェクト。** 永続的な`EventManager`が2回ロードされるシーンに存在する場合（異なる開始シーンからPlayを押してテストする際によくある）、`EventManager`が2つになる。すべてのイベントが2つずつ存在する。リスナーの半分が一方に、残り半分がもう一方にサブスクライブする。何も動かないのにインスペクターではすべて正しく見える。

## ブートストラップシーンパターン

一部のチームは重複問題に「ブートストラップ」シーンで対処する。ゲームは常にブートストラップシーンを最初にロードし、そこですべての永続マネージャーを作成してから、実際のゲームプレイシーンをAddditiveにロードする。

これは機能するが、実際に複雑さが増す：

- **もう任意のシーンからPlayを押せない。** 常にブートストラップシーンから開始するか、テストシーンの前にブートストラップを自動ロードするエディタツールを書く必要がある。
- **ロード順序が重要になる。** ゲームプレイシーンがシステムにアクセスする前に、ブートストラップの初期化が完了していなければならない。これは通常ロード画面を意味する。高速なロードでも。
- **シーン管理が複雑になる。** Additiveなシーンロードを管理することになる。つまりどのシーンがロード済みか、ロード中か、アンロード中かをすべて同時に管理する。

機能する。多くの出荷ゲームがこのパターンを使っている。しかし永続化問題を回避するためだけに存在するインフラだ。配管であり、ゲームプレイではない。

## マルチシーン編集がさらに悪化させる

Unityのadditiveシーンロードは大きなワールドに強力だ——村シーン、地形シーン、UIシーンを同時にロードする。しかし永続化問題を倍増させる。

どのシーンがどのイベントを所有する？ `OnShopOpened`が村シーンにあり、`OnInventoryChanged`がプレイヤーシーンにある場合、村がアンロードされたらどうなる？ `OnShopOpened`は消えるが、まだロードされているプレイヤーシーンのオブジェクトがそれをリッスンしている可能性がある。今や何もリッスンしていないことを知らずにサブスクライブしたままだ。

シーンのアンロードはクリーンであるべきだ。クロスシーンイベント参照があると、全くクリーンではない。

## ライフサイクル問題

イベント使用時のシーン遷移中に正確に何が起こるか追跡しよう：

1. `SceneManager.LoadScene("Level2")`が呼ばれる
2. Unityが現在のシーンのアンロードを開始する
3. 現在のシーンのすべてのMonoBehaviourに`OnDisable`が発火する（リスナーがアンサブスクライブ）
4. 現在のシーンのすべてのMonoBehaviourに`OnDestroy`が発火する
5. 現在のシーンが完全にアンロードされる
6. 新しいシーンのロードが開始される
7. 新しいシーンのすべてのMonoBehaviourに`Awake`が発火する
8. 新しいシーンのすべてのMonoBehaviourに`OnEnable`が発火する（リスナーが再サブスクライブ）
9. 新しいシーンのすべてのMonoBehaviourに`Start`が発火する

問題はステップ3から8の間のギャップにある。一時的にイベントシステムのシーンベースのリスナーがゼロになる。DDOLオブジェクトがこのウィンドウ中にイベントを発火しても、虚空に向かって叫んでいるだけだ。

そしてステップ8内での順序は、マシンやUnityバージョン間で決定論的ではない。システムAがシステムBが初期化するイベントにサブスクライブする必要がある場合。Bの`OnEnable`がAの後に実行されると、ハイゼンバグとして顕在化するレースコンディションが発生する。

クロスシーン永続化が必要なシステムの実例：
- **AudioManager** — どのシーンからも`OnLevelStart`、`OnBossFight`、`OnVictory`を聞く必要がある
- **AnalyticsManager** — セッション内のすべてのシーンからのイベントを追跡する必要がある
- **SaveSystem** — シーンに関係なく`OnCheckpointReached`に応答する必要がある
- **AchievementTracker** — すべてのシーンにまたがって進捗データを蓄積する必要がある

これらすべてが、どのシーンからでもイベントを受け取る必要があるシステムだ。永続化問題は学術的なものではない——実際のゲームの実際の機能をブロックしている。

## GESによる解決

GESは永続化問題をアーキテクチャレベルで解決する。ワークアラウンドではなく。

### ScriptableObjectイベントはシーンの外に存在する

これが核心的な洞察だ。GESでは、イベントはプロジェクトのAssetsフォルダに存在するScriptableObjectアセットだ——どのシーンにも属さない。プロジェクトレベルのリソースであり、シーンレベルのオブジェクトではない。

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField]
    private SingleGameEvent onLevelStart;

    [GameEventDropdown, SerializeField]
    private SingleGameEvent onBossFight;
}
```

レベル1がアンロードされレベル2がロードされても、`onLevelStart`イベントアセットはどこにも行かない。どちらのシーンにも所有されていない。プロジェクトレベルで、シーンのライフサイクルとは独立して存在する。`AudioManager`（DDOL）は同じイベントアセットへの参照を維持。新しいシーンの`LevelManager`も同じイベントアセットへの参照を取得。通信がただ機能する。

Staticイベントなし。イベントマネージャーシングルトンなし。ブートストラップシーンなし。ScriptableObjectアーキテクチャがクロスシーン通信を、特別にオプトインする機能ではなく、イベントの保存方法の自然な帰結にしている。

### Behavior Window：自動ライフサイクル管理

GESのBehavior Windowはサブスクリプションのライフサイクルをビジュアルに処理する。Behavior Windowでリスナーをバインドすると、`OnEnable`で自動サブスクライブし`OnDisable`で自動アンサブスクライブする。手動のサブスクリプションコード不要。アンサブスクライブ忘れの心配なし。

![Behavior Window with Persistent Listener](/img/game-event-system/examples/09-persistent-event/demo-09-behavior-persistent.png)

これによりシーン遷移がただ機能する：

1. 古いシーンがアンロード — `OnDisable`発火 — Behavior Windowが古いリスナーを自動アンサブスクライブ
2. 新しいシーンがロード — `OnEnable`発火 — Behavior Windowが新しいリスナーを自動サブスクライブ
3. イベントアセットは破棄されなかったので、サブスクリプションがシームレスに同じイベントに接続

ギャップなし。レースコンディションなし。ゴースト参照なし。

### Persistentリスナー：明示的なクロスシーンサバイバル

シーンロードをまたいで本当に永続化する必要があるシステム——`AudioManager`、`AnalyticsManager`——のために、GESはPersistentリスナーを提供する。

コードでは`AddPersistentListener`を使う：

```csharp
public class AudioManager : MonoBehaviour
{
    [GameEventDropdown, SerializeField]
    private SingleGameEvent onLevelStart;

    private void OnEnable()
    {
        onLevelStart.AddPersistentListener(HandleLevelStart);
    }

    private void OnDestroy()
    {
        onLevelStart.RemovePersistentListener(HandleLevelStart);
    }

    private void HandleLevelStart(string levelName)
    {
        // レベルに応じてBGMを変更
    }
}
```

Persistentリスナーは通常のリスナーとは別のレイヤーに格納される。シーン遷移を生き延びるのは：
- イベントがScriptableObject（シーンの外に存在）
- リスナーがDDOLオブジェクト上（遷移を生き延びる）
- Persistent登録がイベントシステムに「ロードをまたいで保持」を明示的に伝える

Behavior Windowには**Persistentチェックボックス**がある——`AddPersistentListener`のビジュアル版だ。チェックを入れるだけで、そのバインディングがコードなしにシーン遷移を生き延びる。

### シーン遷移中に何が起こるか（ステップバイステップ）

先ほどと同じ遷移トレースをGESで：

1. `SceneManager.LoadScene("Level2")`が呼ばれる
2. Unityがレベル1のアンロードを開始する
3. レベル1のMonoBehaviourに`OnDisable`が発火 — Behavior Windowがリスナーを自動アンサブスクライブ
4. レベル1のMonoBehaviourに`OnDestroy`が発火
5. レベル1が完全にアンロードされる
6. **イベントアセットは影響を受けない** — ScriptableObjectであり、シーンオブジェクトではない
7. **Persistentリスナーは影響を受けない** — DDOLオブジェクトに登録されている
8. レベル2のロードが開始される
9. レベル2のMonoBehaviourに`OnEnable`が発火 — Behavior Windowがリスナーを自動サブスクライブ
10. レベル2のMonoBehaviourに`Start`が発火

決定的な違い：ステップ5から9の間、イベントシステムは空ではない。Persistentリスナーはまだアクティブだ。DDOLシステムがロード中にイベントを発火しても、Persistentリスナーはそれを受け取る。シーン固有のリスナーは消えている（正しく）が、グローバルシステムは接続を失わない。

### 永続化のためのシーンセットアップ

![Scene Setup for Persistent Events](/img/game-event-system/examples/09-persistent-event/demo-09-scenesetup.png)

シーンセットアップは直截的だ：永続マネージャーはPersistentリスナーバインディングを持つDDOLオブジェクト上に存在する。シーン固有のオブジェクトは通常のBehavior Windowバインディングを使う。イベントアセットはどのシーンからもアクセス可能な共有データベースに存在する。

![Persistent Event Editor](/img/game-event-system/examples/09-persistent-event/demo-09-editor.png)

### マルチデータベースの動的ロード

多くのシーンを持つ大規模プロジェクトでは、GESは複数のイベントデータベースをサポートする。コンテキスト別にイベントを整理できる：

- **Coreデータベース** — 起動時にロードされるグローバルイベント（`OnApplicationPause`、`OnSaveRequested`、`OnAchievementUnlocked`）
- **Combatデータベース** — 戦闘シーンがアクティブな時にロード（`OnDamageDealt`、`OnEnemyDefeated`）
- **UIデータベース** — UIシーンと共にロード（`OnMenuOpened`、`OnSettingsChanged`）

![Manager with Multiple Databases](/img/game-event-system/visual-workflow/game-event-manager/manager-databases.png)

シーン固有のデータベースをそのシーンと共にロードする。シーンアンロード時にアンロードする。Coreデータベースは常にロードされたまま。アンロードされたデータベース内のイベントは非アクティブになる——発火せず、Raiseしようとしてもエラーではなくno-opになる。

これはstaticイベントに欠けているスコーピング（「このイベントはこのシーンがロードされている時にのみ存在する」）を、インスタンスイベントの脆弱性（「このイベントはこのオブジェクトが消えたら消える」）なしに提供する。

### 注意すべきアンチパターン

避けるべき1つの間違い：`OnDestroy`でのPersistentリスナーの削除忘れ。

```csharp
// NG - このオブジェクトが破棄されるとPersistentリスナーがリーク
private void OnEnable()
{
    onLevelStart.AddPersistentListener(HandleLevelStart);
}

// OK - DDOLオブジェクトではOnDestroyでクリーンアップ
private void OnDestroy()
{
    onLevelStart.RemovePersistentListener(HandleLevelStart);
}
```

通常のリスナーは`OnDisable`でアンサブスクライブする。Persistentリスナーは`OnDestroy`でアンサブスクライブすべきだ——なぜならPersistentリスナーの目的そのものが、シーン遷移中の`OnDisable`を生き延びることだから。`OnDisable`に削除を入れると、目的が台無しになる。

GESのRuntime Monitor（特にWarningsタブ）は、`DontDestroyOnLoad`でないオブジェクトに登録されたPersistentリスナーをフラグ付けする。これはほぼ常にバグだ——イベントシステムに「シーンロードをまたいでこのリスナーを保持して」と伝えているのに、オブジェクト自体がロードを生き延びない。

## より大きな視点

クロスシーンの永続化は単なる技術的な問題ではない——プロジェクト全体の構造に影響するアーキテクチャ上の決定だ。間違った選択はシングルトン、Service Locator、ブートストラップシーン、ロード順依存、そしてすべてのスクリプトに散らばる防御的nullチェックへと雪崩式に波及する。

GESのアプローチ——明示的な永続化制御を持つScriptableObjectイベント——は、「すべてがグローバル」と「シーン境界を越えるものがない」の間で選ぶ必要がないことを意味する。イベントはプロジェクトレベルで存在する。リスナーはニーズに基づいて自身の永続性を選択する。ライフサイクルは一般的なケースでは自動、特殊なケースでは明示的。

`AudioManager`はPersistentリスナーで一度サブスクライブし、セッション全体にわたってすべてのシーンからのイベントを受け取る。`EnemySpawner`はBehavior Windowでサブスクライブし、シーンアンロード時に自動切断、次のシーンで自動再接続。両方のパターンが同じイベント上で共存する。特別な設定不要。ブートストラップシーン不要。レースコンディション不要。

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
