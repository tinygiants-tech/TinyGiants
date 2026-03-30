---
slug: event-organization-at-scale
title: 'イベント200個超え：なぜイベント管理は破綻するのか'
authors: [tinygiants]
tags: [ges, unity, architecture, best-practices, tutorial]
description: "小規模プロジェクトにイベント管理は不要。大規模プロジェクトはそれなしでは生き残れない。スケール時になぜ組織が破綻するのか、専用イベントマネージャーとは何かを解説する。"
image: /img/home-page/game-event-system-preview.png
---

新しいUnityプロジェクトを始める。イベントを10個作る。`OnPlayerDeath`、`OnScoreChanged`、`OnLevelComplete`。分かりやすい名前を付けて、フォルダに入れて、次に進む。快適。イベント構造全体が頭に入る。

半年後。イベントが200個ある。Projectウィンドウはもう、ScriptableObjectファイルの壁だ。`OnPlayerHealthDepleted`が必要。いや`OnPlayerHPLow`だったっけ？それとも`OnPlayerHealthZero`？全部`OnPlayer`で始まる名前のリストをスクロールしながら目を凝らす。3分後、欲しいイベントが既にあるかすら分からないので諦めて新しいのを作る。

これがイベント駆動のUnityプロジェクトが最終的に行き着く場所だ。イベントパターンが間違っているからじゃない。スケールでのイベント管理ツーリングを誰も作っていないからだ。Unityにはアニメーションウィンドウ、Shader Graph、Timeline、Input Systemデバッガがある。イベントが使えるのは...Projectウィンドウ。

<!-- truncate -->

## イベント組織崩壊の3つのステージ

このパターンが十分なプロジェクトで繰り返されるのを見てきたから、予測可能だと分かっている。3つのステージがあり、次の閾値を超えるまではそれぞれ問題なく感じる。

### ステージ1：小規模プロジェクト（10〜20イベント）

すべてが記憶できる。自分で作ったイベントだ。名前を知っている。どの型を運ぶか知っている。Projectウィンドウは完璧なブラウザだ。一目ですべてが見える。

命名規則？不要。全部覚えてる。ドキュメント？頭の中にある。検索？半秒スクロールするだけ。

このステージはソロプロジェクトで約2〜3ヶ月、チームでは約2〜3週間持つ。

### ステージ2：中規模プロジェクト（50〜100イベント）

名前がぼやけ始める。インベントリイベントは`OnItemPickedUp`だったっけ、`OnItemCollected`だったっけ？最初のを忘れていたから両方追加してしまった。Projectウィンドウは本格的なスクロールが必要になり、反射的に検索バーに入力し始める。

命名規則を導入する。`On[Subject][Verb]`——`OnPlayerDamaged`、`OnEnemySpawned`、`OnUIMenuOpened`。助かる。しばらくは。

このステージでの本当の痛みはメタデータの欠如だ。フォルダに80個のイベントファイルが見える。どれが`SingleGameEvent`？どれが`Int32GameEvent`？どれがカスタムペイロード型を運ぶ？ファイル名からは分からない。1つずつクリックしてInspectorで確認するしかない。戦闘関連のイベントを全部見つけたい？一貫した名前を付けていることを祈るしかない。他にフィルタリングする方法がないから。

### ステージ3：大規模プロジェクト（200以上のイベント）

フラットなファイルリストが生産性に積極的に敵対している。命名規則はドリフトしている（3人の開発者、3つの微妙に異なる命名スタイル）。フォルダ構成はある程度助けになるが、型情報、使用状況、クロスリファレンスは教えてくれない。

素早く答えられない質問：
- リスナーがゼロのイベントはどれ？（精神的スペースを浪費するデッドイベント）
- Raiseされているがリスンされていないイベントはどれ？（孤立したブロードキャスト）
- Combatモジュールが実際に所有しているイベントは何個？
- 最後のスプリントで変更されたイベントは？

スプレッドシートを維持し始める。またはwikiページ。またはREADME。クランチ中に誰もドキュメントを更新しないので、1週間以内に陳腐化する。

そしてチームなら？Gitのマージコンフリクト。イベントを追加や変更するすべての開発者が同じコンテナアセットに触る。UnityのシリアライズされたYAMLでのマージコンフリクト解決は退屈で、エラーが起きやすく、たまに壊れる。

## 従来の解決策（そしてなぜ陳腐化するのか）

チームは愚かじゃない。解決しようとする。見てきたものを紹介する：

**命名規則。** 有用だが不十分。規則はイベントの名前を教えてくれる。型、ステータス、リスナー、どのモジュールが所有しているかは教えてくれない。そして規則はドリフトする。新人がスタイルガイドを読まず、突然`OnEnemyDied`の隣に`OnEnemyDeath`が`OnEnemyKilled`と並んでいる。

**フォルダ構造。** より良い。`Events/Combat/`、`Events/UI/`、`Events/Audio/`。しかしフォルダは静的だ。イベントをフォルダ間で移動すると（シリアライゼーションアプローチによっては）参照が壊れる可能性がある。そして型でフィルタリングしたり、フォルダ横断で素早く検索したり、ステータスを一目で確認することはまだできない。

**README / スプレッドシートドキュメント。** 陳腐化する。必ず。「イベントを作る」と「スプレッドシートを更新する」の間のギャップは、まさに1つの人間の判断であり、その判断は「あとでやる」。あとでは来ない。

**カスタムScriptableObjectコンテナ。** すべてのイベントを参照する単一のMonoBehaviourまたはScriptableObjectを作るチームもある。これはアクセスを集約するがボトルネックを生む。全員が同じファイルを編集する。結局、別の形のフラットリストに過ぎない。

根本的な問題は、Unityがイベントを他のアセットと同じように扱うこと。しかしイベントは他のアセットとは違う。イベントはゲームの神経系統だ。アニメーションにAnimationウィンドウがあり、シェーダにShader Graphがあるのと同じように、独自の管理ツールが必要だ。

## マルチデータベースアーキテクチャ：分割統治

GESは組織の問題を構造的なレベルで解決する。マルチデータベースアーキテクチャだ。管理不能になるまで成長する1つのイベントコンテナの代わりに、イベントを複数の独立したデータベースに分割する。各データベースが独自のコレクションを管理する個別のScriptableObjectアセットだ。

![Multi Database Manager](/img/game-event-system/examples/12-multi-database/demo-12-manager.png)

C#のnamespaceのようなものだと考えてほしい。各データベースが境界になる：

- **Core** — ゲームライフサイクル（開始、一時停止、セーブ、ロード）— 15〜20イベント
- **UI** — メニュー、HUD、ダイアログ、ツールチップ — 30〜40イベント
- **Audio** — BGM、SE、アンビエント、音量変更 — 15〜20イベント
- **Combat** — ダメージ、死亡、スポーン、バフ、デバフ — 20〜25イベント
- **Inventory** — ピックアップ、ドロップ、装備、クラフト — 15〜20イベント
- **Quest** — 受注、進行、完了、失敗 — 10〜15イベント

UI開発者がイベントドロップダウンを開くと30個のUIイベントが見える。ゲームのすべてのシステムからの200イベントではなく。認知負荷が桁違いに下がる。

![Database Assets](/img/game-event-system/examples/12-multi-database/demo-12-assets.png)

### GUIDベースの参照：再編成は常に安全

マルチデータベースアーキテクチャ全体は1つの重要な機能の上に成り立っている：すべてのイベントがグローバルに一意な識別子を持ち、どのデータベースに属するか、何と名付けられているか、プロジェクト内のどこにファイルがあるかに関係なく変わらない。

つまり再編成は恐ろしい操作ではなく、ルーティンのメンテナンスだ：

- **肥大化したデータベースを分割：** 「Gameplay」が80イベントに成長した？「Player」「Combat」「World」に分割。イベントをデータベース間で移動。すべてのリスナー参照は生きている。
- **細かいデータベースを統合：** 「Weather」と「TimeOfDay」がそれぞれ5イベント？「World」に統合。すべての参照は生きている。
- **明確さのためにリネーム：** `OnEvt_PlrHP_Chg`が`OnPlayerHealthChanged`に。すべての参照は生きている。
- **フォルダの再編成：** `Assets/Events/`を`Assets/Data/GameEvents/`に移動。すべての参照は生きている。

GUID保護がなければ、200イベントの再編成は何百ものリスナーバインディングを壊す可能性がある。GUIDがあれば、自由にリストラクチャできる。

### 動的ランタイムローディング

すべてのデータベースが常にメモリに存在する必要はない。ロビー画面に戦闘イベントは不要。カットシーンにインベントリイベントは不要。GESは実行時のデータベースのロードとアンロードをサポートする：

```csharp
public class SceneEventLoader : MonoBehaviour
{
    [SerializeField] private GameEventManager eventManager;
    [SerializeField] private GameEventDatabase combatDatabase;

    public void OnEnterCombatScene()
    {
        eventManager.LoadDatabase(combatDatabase);
    }

    public void OnExitCombatScene()
    {
        eventManager.UnloadDatabase(combatDatabase);
    }
}
```

これによりモジュラーコンテンツも可能になる。DLCが独自の`DragonEvents.asset`データベースを追加する。コード変更なしで、ベースゲームのイベントシステムにシームレスに統合される。

### チームコラボレーション：マージコンフリクトゼロ

データベースが分かれていれば、4人の開発者が同時に作業しても4つの異なるファイルに触る：

```
Developer A: adds OnQuestAccepted to QuestEvents.asset
Developer B: adds OnItemCrafted to InventoryEvents.asset
Developer C: modifies OnPlayerDamaged in CombatEvents.asset
Developer D: adds OnNPCDialogueStarted to SocialEvents.asset
```

コンフリクトゼロ。4人全員が同じファイルを変更して3人がシリアライズされたYAMLのマージコンフリクトを抱える単一コンテナと比較してみてほしい。

![Manager Databases](/img/game-event-system/visual-workflow/game-event-manager/manager-databases.png)

## Event Editor：専用の管理ツーリング

データベースへの分割は構造的な問題を解決する。しかし個々のイベントを効率的に検索、閲覧、管理する必要もある。ここでEvent Editorの出番だ。スケールでのイベント管理のために作られた専用ウィンドウだ。

![Event Editor Full Window](/img/game-event-system/visual-workflow/game-event-editor/editor-window-full.png)

### 3層フィルタリング

Event Editorのツールバーは互いに組み合わせ可能な3つの独立したフィルタを提供し、表示されるイベントリストを絞り込む：

![Editor Toolbar](/img/game-event-system/visual-workflow/game-event-editor/editor-toolbar.png)

**レイヤー1：カテゴリ。** すべてのイベントにデータベース内でカテゴリをタグ付けできる。Combatイベントには「Damage」「Death」「Spawn」「Buffs」のようなカテゴリを付けられる。ツールバーでカテゴリをクリックすれば、そのカテゴリのイベントだけが表示される。カテゴリによって、フラットなリストがナビゲーション可能なツリーに変わる。

**レイヤー2：タイプ。** イベントタイプでフィルタ。`SingleGameEvent`だけ、`Int32GameEvent`だけ、カスタムペイロード型だけを表示。floatイベントが必要だけど名前が思い出せないとき、タイプフィルタリングで1クリックで辿り着ける。

**レイヤー3：検索。** 表示中のすべてのイベントに対するファジーテキスト検索。「plyr dmg」と入力すれば`OnPlayerDamaged`が見つかる。「boss die」で`OnBossDeath`が見つかる。検索はサブミリ秒で、寛容。正確な名前は不要。

3つのレイヤーが組み合わさる：カテゴリ「Combat」AND タイプ「SingleGameEvent」AND 検索「crit」で、200イベントから探している2〜3個に瞬時に絞り込める。

![Editor Dropdown](/img/game-event-system/examples/12-multi-database/demo-12-editor-dropdown.png)

### 色分けされたBehaviorステータス

エディタの各イベント行にはBehavior設定の色分けステータスインジケータが表示される：

- **緑：** イベントにアクティブなBehaviorが設定されている。リスナーがセットアップ済みで準備完了
- **青：** イベントは存在するがBehaviorがまだない。定義されているが配線されていない
- **オレンジ：** イベントにBehaviorがあるが、一部に警告や不完全な設定がある

一目でデータベースをスキャンして、注意が必要なイベントを発見できる。Behaviorのない青いイベントはデッドウェイトかもしれない。オレンジのイベントは設定の修正が必要。緑のイベントは健全。

### データベース切り替え

ツールバーのデータベーススイッチャーでデータベース間を瞬時にジャンプできる。Combatで作業中にAudioデータベースの何かを確認したい？1クリック。フィルタ状態はデータベースごとに保持されるので、戻れば前のビューが復元される。

![Database Switch](/img/game-event-system/visual-workflow/game-event-editor/editor-database-switch.png)

### バッチ操作

スケールでの再編成時、個別操作は遅すぎる。Event Editorは複数イベントに対するバッチモードをサポートする：

![Batch Operations](/img/game-event-system/visual-workflow/game-event-editor/editor-batch-mode.png)

複数イベントを選択して、一括操作を適用：カテゴリ変更、別のデータベースへの移動、未使用イベントの削除。個別のInspectorパネルをクリックして30分かかる作業がバッチモードで30秒。

## これによって可能になる日常ワークフロー

このツーリングが整った状態でのイベント管理がどういうものか、実践的な絵を描こう。

**朝のスタンドアップで新しい「コンボシステム」機能に言及。** Event Editorを開いて、Combatデータベースに切り替え、既存イベントを確認。`OnPlayerAttack`と`OnDamageDealt`が既にある。`OnComboStarted`、`OnComboHit`、`OnComboFinished`が必要。エディタで作成し、「Combo」カテゴリに割り当て。60秒で完了。

**デザイナーが「プレイヤーがダメージを受けたとき、どのイベントが発火する？」と質問。** Event Editorを開く。「damage」を検索。すべてのデータベースにまたがるダメージ関連イベントが表示される。1つクリックしてBehavior設定を確認——何がリスンしていて、どのコンディションがレスポンスをゲートしているか。コードファイルをgrepするのではなく、15秒で答えが出る。

**四半期クリーンアップ。** ステータスでフィルタ：青（Behaviorなし）。存在するが何もリスンしていないイベント。それぞれをレビュー——将来の機能のために計画されているのか、削除されたシステムからのデッドウェイトか？デッドなものをバッチ削除。イベントアーキテクチャをスリムに保つ。

**新メンバーのオンボーディング。** 「Event Editorを開いて。各データベースを切り替えて。カテゴリ構造が各モジュールにどんなイベントがあるか示してくれる。どのイベントもクリックすればBehavior設定が見える。緑はアクティブ、青は未使用、オレンジは要注意。」5分でイベントアーキテクチャを理解できる。「Projectウィンドウで200個のScriptableObjectアセットを読んで、命名規則が意味を成すことを祈ってね」と比較してみてほしい。

## スケーリング戦略

プロジェクトの成長に伴って有効なパターンをいくつか：

**2〜3データベースから始めて、必要に応じて分割。** 初日から10データベース作らない。Core、UI、Gameplayから始める。Gameplayが40イベントを超えたら、Combat、Inventory、Questに分割。GUIDがあるので分割は痛みなし。

**データベースのオーナーシップをチーム構造に合わせる。** 戦闘プログラマーがCombatEventsを所有。UI開発者がUIEventsを所有。新しいイベントが必要なとき、どのデータベースに属するか、誰と調整すべきかが分かる。

**カテゴリをサブnamespaceとして使う。** カテゴリ付き（Damage、Death、Spawn、Buffs、Status）の40イベントCombatデータベースは、カテゴリなしの10イベントデータベースと同じくらいナビゲートしやすい。

**イベントの使用状況を定期的にレビュー。** Event Editorのステータスインジケータがこれを簡単にする。定期的にデッドイベント（青ステータス、一度もRaiseされていない）、孤立リスナー（Raiseされているが何も応答しない）、重複（同じ目的を果たす2つのイベント）をスキャン。アーキテクチャをスリムに保つ。

**クロスデータベース依存関係をドキュメント化。** Playerデータベースの`OnPlayerDeath`がCombat、UI、Audio、Questでレスポンスをトリガーする。GESはモジュール境界を強制しない——どのリスナーもロードされたどのデータベースのどのイベントも参照できる——しかしクロスカッティングな関心事を把握しておくとメンテナンスの助けになる。

## 組織がもたらす違い

管理可能な200イベントプロジェクトと悪夢のプロジェクトの差は、イベントの数ではない。イベント管理のために作られた構造とツーリングがあるか、Projectウィンドウと命名規則と希望に頼っているかだ。

マルチデータベースアーキテクチャが構造を与える：モジュラーな境界、安全な再編成、マージコンフリクトゼロ、動的ローディング。Event Editorがツーリングを与える：3層フィルタリング、ファジー検索、色分けステータス、バッチ操作、データベースの瞬時切り替え。

小規模プロジェクトにはこのすべてが不要だ。しかし、イベントアセットのフラットリストをスクロールしながら「もっと良い方法があるはず」と思ったことがあるなら——ある。そして一番良いのは、段階的に導入できること。1つのデータベースから始める。扱いにくくなったら分割する。GUIDシステムのおかげで、最初の組織に縛られることは一切ない。

200イベントプロジェクトをメンテナンスする将来の自分が感謝するだろう。イベントアーキテクチャを理解しようとするチームメンバーはもっと感謝する。

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
