---
slug: parallel-vs-sequential
title: 'パラレルかシーケンシャルか：すべてのイベントシステムに必要な2つの実行パターン'
authors: [tinygiants]
tags: [ges, unity, flow-graph, architecture, advanced]
description: "サウンドとパーティクルは同時に再生。でも画面フェードはリスポーンロードの前に完了しなければならない。実際のゲームにはパラレルとシーケンシャル両方のイベント実行が必要——条件分岐、型変換、非同期調整も含めて。"
image: /img/home-page/game-event-system-preview.png
---

プレイヤーが死ぬ。死亡サウンドと死亡パーティクルは同じ瞬間に始まるべきだ——片方を待ってからもう片方を始める理由がない。でも画面フェードはリスポーンポイントのロード前に絶対に完了しなければならない。リスポーンはプレイヤーのテレポート前に完了しなければならない。テレポートは画面フェードイン前に完了しなければならない。

1つのイベントからトリガーされる同じフロー内でのパラレルとシーケンシャル実行。そして不都合な真実：Unityのほとんどのイベントシステムはパターンを1つだけ提供する。イベントを発火し、すべてのリスナーが応答し、終わり。それらのレスポンスが同時に起きるべきか厳密な順序で起きるべきか？あなたの問題だ。

だから解決する。コルーチンで。コールバックで。`_hasFadeFinished`という名前のブール値で。そして気づく前に、6つのファイルに散らばった場当たり的なステートマシンを構築してしまい、未来の自分を含めて誰もフォローできない。

<!-- truncate -->

## 実行パターンの問題

「同じフロー内のパラレルとシーケンシャル」が標準的なUnityツールで実際にどう見えるか、一通り見てみよう。悪魔は完全に実装の詳細の中にいる。

### パラレルパート（簡単に見える）

プレイヤーが死ぬ。3つのことが同時に起きる：死亡サウンド、死亡パーティクル、入力無効化。標準のC#イベントで処理できる：

```csharp
public static event Action OnPlayerDeath;

// AudioManager.cs
OnPlayerDeath += PlayDeathSound;

// ParticleManager.cs
OnPlayerDeath += SpawnDeathParticles;

// InputManager.cs
OnPlayerDeath += DisableInput;
```

3つともイベント発行時に発火する。同じディスパッチ内ですべて実行されるという意味で「パラレル」。単純明快。

しかし`PlayDeathSound`が例外を投げたら？デリゲートの呼び出しリストが停止する。`SpawnDeathParticles`と`DisableInput`は実行されない。1つの壊れたハンドラーがレスポンスチェーン全体を道連れにする。プレイヤーが無音でパーティクルなし、入力有効のまま死ぬ。楽しい。

「各ハンドラーをtry-catchで囲めばいい。」もちろん。今やすべてのサブスクリプションに定型的な例外処理を書いている。またはハンドラーごとにキャッチするカスタムイベントディスパッチャーを構築する。つまり、すでに存在すべきインフラを構築している。

そして優先度？入力は最初に無効にすべきかもしれない——死亡サウンドのセットアップ中にプレイヤーがボタンを押せる小さなウィンドウがある。フラットなデリゲートチェーンでは、実行順序はサブスクリプション順序。つまりロード順序。つまり非決定的。

### シーケンシャルパート（ここで崩壊する）

パラレルエフェクトの後、シーケンシャルなリスポーンフロー：黒にフェード、待つ、チェックポイントロード、待つ、テレポート、フェードイン。

```csharp
IEnumerator DeathSequence()
{
    yield return StartCoroutine(FadeToBlack());
    yield return StartCoroutine(LoadRespawnPoint());
    TeleportPlayer();
    yield return StartCoroutine(FadeIn());
    EnableInput();
}
```

クリーン。動く。変更が必要になるまでは。

マルチプレイヤーの即座リスポーンのためにフェードをスキップしたい？フェードとリスポーンの間に「Continue?」画面を追加したい？テレポート後にリスポーンアニメーションが必要？3つの変更でこうなる：

```csharp
IEnumerator DeathSequence(DeathInfo info)
{
    if (!info.isInstantRespawn)
    {
        yield return StartCoroutine(FadeToBlack());
    }

    if (info.showContinueScreen)
    {
        yield return StartCoroutine(ShowContinuePrompt());
        if (!_playerChoseContinue)
        {
            yield return StartCoroutine(ShowGameOverScreen());
            yield break;
        }
    }

    yield return StartCoroutine(LoadRespawnPoint());
    TeleportPlayer();

    if (info.playRespawnAnimation)
    {
        yield return StartCoroutine(PlayRespawnAnimation());
    }

    yield return StartCoroutine(FadeIn());
    EnableInput();
}
```

コルーチンに分岐、早期リターン、条件付きステップが入った。1つのファイルにある。AudioManager、ParticleManager、InputManagerはこれについて何も知らない。パラレルエフェクトとシーケンシャルフローは完全に切り離されている。そしてこれは比較的シンプルな死亡シーケンスだ。

### 型の不一致問題

誰もぶつかるまで語らない問題がある。ダメージイベントが`DamageInfo`構造体——攻撃者、ターゲット、量、タイプ、クリティカルフラグ——を運ぶ。下流では、ヘルスバーUIは`float`のダメージ量だけが必要。画面シェイクシステムは`bool`のisCriticalだけが必要。

フラットなイベントシステムでは2つの選択肢がある：

**オプションA：全員が`DamageInfo`を受け取る。** ヘルスバーは`info.damage`を抽出。画面シェイクは`info.isCritical`を抽出。すべてのリスナーが不要なデータを受け取り、自分で抽出を行う。あらゆるところに結合。

**オプションB：中間イベント。** ダメージハンドラーが`DamageInfo`を受け取り、floatを抽出し、別の`OnDamageAmountChanged`イベントを発行する。boolを抽出し、`OnCriticalHitOccurred`を発行する。型変換だけが仕事の定型的なリレーイベントができる。

50イベントあると、オプションBは型変換のためだけに存在する数十の中間イベントを意味する可能性がある。定型コードの爆発。各リレーイベントは管理する追加のアセット、命名する追加のもの、イベントドロップダウンの追加のエントリ。

### 非同期の問題

「これが完了するまで待ってから続行」はシンプルに聞こえる。Unityでは何でもありだ。

シーンロードは非同期。アニメーションは時間ベース。ネットワーク呼び出しはTaskを返す。フェードはカスタムトゥイーンシステムを使う。各非同期メカニズムにはそれぞれの完了パターンがある——コルーチンのyield、Taskのcontinuation、コールバックデリゲート、アニメーションイベント。

1つのシーケンシャルフローで調整するには、コルーチンが異なる非同期パラダイム間のトランスレーターになる：

```csharp
IEnumerator WaitForAnimation(Animator anim, string clipName)
{
    anim.Play(clipName);
    while (anim.GetCurrentAnimatorStateInfo(0).normalizedTime < 1.0f)
        yield return null;
}

IEnumerator WaitForSceneLoad(string sceneName)
{
    var op = SceneManager.LoadSceneAsync(sceneName);
    while (!op.isDone)
        yield return null;
}
```

すべての非同期のものにカスタムコルーチンラッパーが必要。調整ロジックは見えない——yield文とwhileループの中に隠されている。このコードを見るデザイナーには、フローではなく実装の詳細が見える。

### ハイブリッドの複雑さ：ボス戦

すべてを組み合わせよう。ボス戦のフェーズ遷移：

1. HPが閾値を下回る（条件）
2. 咆哮アニメーション＋音楽変更＋アリーナ照明シフト（パラレル、ただし咆哮は非同期）
3. 咆哮の完了を待つ（非同期シーケンシャル）
4. 攻撃パターン切り替え（シーケンシャル）
5. ミニオンを時間差で1体ずつスポーン（シーケンシャルループ）
6. すべてのミニオンスポーン完了を待つ（非同期シーケンシャル）
7. ボスが脆弱になる（シーケンシャル）
8. 最終フェーズの場合、特別なダイアログを再生（条件分岐）

パラレルトリガー、シーケンシャルチェーン、非同期待機、条件分岐、時間差タイミング——すべてが1つのフロー。コルーチンで表現すると、ネストされたyield、ブールフラグ、フェーズenum、アニメーションイベントからコルーチンへのコールバックを持つ100行のメソッドになる。

ロジックは正しい。しかしそれは書き捨てコードだ。6ヶ月後に誰も読まない。すべてのyieldとすべてのフラグを理解しなければ安全に変更できない。

ステートマシン？よりよい抽象化だが、複雑さが爆発する。条件付き遷移とパラレルエフェクトを持つ3つのフェーズで簡単に15-20のステートが必要。各ステートが自身のパラレル操作を管理し、遷移を処理し、条件を評価する。見えないコルーチンスパゲッティを、よく構造化されたが同様に不透明なステートマシンスパゲッティに置き換えただけ。

## GESの答え：ミックスできる2つの明示的パターン

GESはTriggerとChainという2つの基本実行パターンを、ビジュアルFlow GraphエディターとコードAPIの両方でファーストクラスの概念として導入する。Unityのイベントシステムの上に重ねた抽象化ではない。すべてのイベントフローを構成する2つのアトミックなビルディングブロックだ。

### Trigger：パラレルファンアウト（オレンジ）

ソースイベントが発火すると、Trigger接続されたすべてのターゲットが同時に独立して発火する。

![Trigger Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-trigger.png)

**パラレル実行。** すべてのターゲットが同じフレームで処理を開始する。ターゲット間の保証された順序はない（優先度を割り当てない限り）。

**フォールトトレラント。** ターゲットBが例外を投げても、ターゲットAとCは実行される。1つの壊れたハンドラーがフロー全体を道連れにしない。これがC#イベントがそのまま持っていてほしかった挙動だ。

**ファイア&フォーゲット。** ソースはどのターゲットの完了も待たない。ターゲットが5秒のコルーチンを開始しても、ソースは知らないし気にしない。

**優先度ソート。** 概念的にはパラレルだが、Triggerターゲットはフレーム内で決定論的な順序で実行される。優先度を割り当てる：`priority: 20`が`priority: 10`より先に実行。別のシーケンシャルステップなしで「ほぼパラレルだが、死亡サウンドの前に入力を無効にする」を処理する。

```csharp
// onPlayerDeathが発行されるとすべて同時に発火
onPlayerDeath.AddTriggerEvent(onDisableInput, priority: 20);     // 最初
onPlayerDeath.AddTriggerEvent(onPlayDeathSound, priority: 10);   // 2番目
onPlayerDeath.AddTriggerEvent(onSpawnDeathParticles, priority: 5); // 3番目
```

Flow Graphエディターでは、Triggerコネクションはソースノードからファンアウトするオレンジの線。ビジュアルの略記：「これらはすべて同時に起きる。」

![Trigger Demo Graph](/img/game-event-system/examples/10-trigger-event/demo-10-graph.png)

### Chain：シーケンシャルブロッキング（グリーン）

ソースイベントが発火すると、Chain接続されたターゲットが厳密な順序で1つずつ実行される。各ステップは前のステップの完了を待つ。

![Chain Flow](/img/game-event-system/flow-graph/game-event-node-editor/flow-graph-chain.png)

**厳密な順序。** ステップ1、次にステップ2、次にステップ3。曖昧さなし。レースコンディションなし。ビジュアルレイアウトは左から右、上から下に読める——実行順序そのもの。

**ディレイとデュレーション。** 各Chainステップにディレイ（開始前の一時停止）とデュレーション（チェーンが進む前にこのステップが「かかる」時間）を設定できる。コルーチン内に散らばった`WaitForSeconds`を、各コネクション上の明示的で可視的なタイミングに置き換える。

**waitForCompletionによる非同期待機。** Chainステップはハンドラーの非同期操作が完了するまでチェーンを一時停止できる。シーンロード、アニメーション、ネットワーク呼び出し——チェーンがそれらを優雅に待つ。コルーチンラッパーコード不要。完了コールバック不要。チェックボックス1つ。

**条件付き停止。** Chainコネクションは残りのシーケンスを停止できる条件をサポートする。条件が`false`と評価されると、後続のステップは実行されない。「プレイヤーがリバイブトークンを持っている場合、死亡シーケンスを中断」は最初のChainステップの条件だ。

```csharp
// 各ステップは前のステップの完了を待つ
onPlayerDeath.AddChainEvent(onFadeToBlack, delay: 1.0f);
onFadeToBlack.AddChainEvent(onLoadRespawn, waitForCompletion: true);
onLoadRespawn.AddChainEvent(onTeleportPlayer);
onTeleportPlayer.AddChainEvent(onResetPlayerState);
onResetPlayerState.AddChainEvent(onFadeIn, duration: 1.0f);
onFadeIn.AddChainEvent(onEnableInput);
```

Flow Graphでは、Chainコネクションはシーケンスで流れるグリーンの線。ビジュアルの略記：「これらはこの順序で起きる。」

![Chain Demo Graph](/img/game-event-system/examples/11-chain-event/demo-11-graph.png)

### ミックスする：ハイブリッドフロー

実際のゲームロジックは純粋にパラレルか純粋にシーケンシャルだけということは絶対にない。両方だ。2つの明示的パターンを持つポイントは、同じソースノードから自由にミックスできることだ。

![Hybrid Flow](/img/game-event-system/intro/overview/flow-graph-mix.png)

プレイヤー死亡フローはこうなる：

```
OnPlayerDeath ──trigger──► OnPlayDeathSound       （パラレル、即座）
              ──trigger──► OnSpawnDeathParticles   （パラレル、即座）
              ──trigger──► OnDisableInput          （パラレル、即座、priority: 20）
              ──chain───► OnFadeToBlack            （シーケンシャル、delay: 1.0s）
                          └──chain──► OnLoadRespawn （waitForCompletion）
                                     └──chain──► OnTeleportPlayer
                                                 └──chain──► OnResetState
                                                             └──chain──► OnFadeIn （duration: 1.0s）
                                                                         └──chain──► OnEnableInput
```

3本のオレンジTrigger線がファンアウト——パラレルエフェクトが即座に発火。グリーンのChainがシーケンシャルなリスポーンフローを開始。両方が同時に走る：死亡サウンドが再生される間、チェーンはフェード開始前の1.0秒ディレイを待っている。

コードでは：

```csharp
void SetupDeathFlow()
{
    // パラレルエフェクト（Trigger - オレンジ）
    onPlayerDeath.AddTriggerEvent(onDisableInput, priority: 20);
    onPlayerDeath.AddTriggerEvent(onPlayDeathSound, priority: 10);
    onPlayerDeath.AddTriggerEvent(onSpawnDeathParticles, priority: 5);

    // シーケンシャルリスポーン（Chain - グリーン）
    onPlayerDeath.AddChainEvent(onFadeToBlack, delay: 1.0f);
    onFadeToBlack.AddChainEvent(onLoadRespawn, waitForCompletion: true);
    onLoadRespawn.AddChainEvent(onTeleportPlayer);
    onTeleportPlayer.AddChainEvent(onResetPlayerState);
    onResetPlayerState.AddChainEvent(onFadeIn, duration: 1.0f);
    onFadeIn.AddChainEvent(onEnableInput);
}
```

しかしビジュアルFlow Graphで本当にクリックする。エディターを開くとフロー全体が見える：左側のパラレルファンアウト、右に流れるシーケンシャルチェーン。オレンジとグリーン。複数ファイルにまたがる80行のコルーチンコードになるものを即座に理解。

## Argument Transformer：型の不一致を解決する

中間イベント問題を覚えているか？上流が`DamageInfo`を送り、下流が`float`のダメージ量だけ必要。トランスフォーマーなしでは、すべての型変換にリレーイベントが必要になる。

GESはArgument Transformer——Flow Graph内のイベント間のコネクション上に置く型変換ノード——でこれを解決する。

![Node Transform](/img/game-event-system/flow-graph/game-event-node-behavior/node-transform.png)

`DamageInfo`ソースを`SingleGameEvent`ターゲットに接続すると、エディターが型の不一致を検出し、変換を定義させてくれる。ソース型からターゲット型へのプロパティパスを指定する：

```
DamageInfo → .damage → float
```

トランスフォーマーが`damageInfo.damage`を抽出し、`float`値を下流イベントに渡す。中間イベントなし。定型的なリレーコードなし。変換はコネクション自体で見える。

ネストされたプロパティアクセスでも機能する：

```
DamageInfo → .attacker.stats.critChance → float
```

Flow Graphはトランスフォーマーコネクションを直接コネクションとは異なる表示にするので、型変換がどこで起きているか常に見える。型システムが設定時にパスを検証する——プロパティが存在しないか最終型がターゲットと一致しない場合、ランタイム前に目に見えるエラーが表示される。

### コネクション互換性インジケーター

2つのノード間でコネクションをドラッグすると、エディターが色分けされた互換性を表示する：

![Node Connection](/img/game-event-system/flow-graph/game-event-node-connector/node-connection.png)

- **グリーン：** 型が完全に一致。`Int32GameEvent`から`Int32GameEvent`。直接コネクション。
- **イエロー：** 変換で互換。`DamageInfo`ソース、`float`ターゲット。Argument Transformerがギャップを埋められる。
- **オレンジ：** 可能だが設定が必要。型は無関係だが、voidパススルーまたはカスタムトランスフォーマーで動作する。
- **レッド：** 無効。通常はChainモードでの循環依存。

2つのノードが接続できるかの推測不要。ビジュアルフィードバックが即座に教えてくれる。

## 2層条件システム

これがTrigger/Chain設計で最も繊細な部分だ。2つの独立した条件レイヤーがあり、それぞれ異なる目的を果たす。

**ノード条件**（NodeBehavior Windowで設定）はフロー自体を制御する。

ノード条件が`false`と評価されると：
- **Trigger**コネクションの場合：その特定のターゲットが発火しないが、同じソースからの他のTriggerは影響を受けない
- **Chain**コネクションの場合：残りのシーケンス全体が停止——後続のステップは実行されない

**イベント条件**（Behavior Windowで設定）はサイドエフェクトのみを制御する。

イベント条件が`false`と評価されると：
- イベントのアクション（サウンド再生、パーティクルスポーンなどのゲームプレイレスポンス）が実行されない
- しかしフローは継続——次のChainステップは発火し、Triggerディスパッチは進む

なぜこの区別が存在するか？「スキップ」と「中断」は根本的に異なる操作だから。

「サウンド再生をスキップするが、リスポーンシーケンスは続ける」→ サウンドのEvent Actionのイベント条件。チェーンは次のステップに進む。

「プレイヤーがリバイブトークンを持っている場合、死亡シーケンス全体を中断」→ 最初のChainステップのノード条件。チェーン全体が停止。

Flow Graphでは、両方の条件タイプがそれぞれのノードで見える。ランタイムデバッグ中、どのレイヤーが実行をブロックしたかが見える。この可視性だけで「なぜチェーンが止まったの？」という質問のデバッグ時間を何時間も節約する。

## ネストされたグループ：複雑なフローの整理

フローが大きくなった時——20以上のノード、複数のTriggerファンアウト、分岐するChain——グラフが読みにくくなることがある。GESはネストされたグループをサポートする：サブフローを1つのラベル付きボックスに折りたたむビジュアルコンテナ。

ボスフェーズ遷移を「Phase 2 Transition」グループにまとめる。折りたたむ。トップレベルグラフは12の中間ノードの代わりに`OnBossHP50` → `[Phase 2 Transition]` → `OnPhase2Active`を表示する。

内部を編集する時にグループを展開。全体像が欲しい時に折りたたむ。IDEのコードフォールディングと同じコンセプト——完了した詳細を隠し、構造を見せる。

## パターンギャラリー：3つの一般的なアーキテクチャ

TriggerとChainを複数のプロジェクトで使った後、3つのパターンが一貫して現れる。

### ブロードキャスターパターン

1つのソース、多くの独立したレスポンス。純粋なTriggerファンアウト。

![Broadcaster Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-broadcaster.png)

`OnPlayerDeath`がトリガー：スコア更新、アナリティクスログ、サウンド再生、UI表示、AI通知。すべて独立。すべてフォールトトレラント。アナリティクスログが失敗してもサウンドは再生される。

**使うべき時：** イベントレスポンスが独立しており調整が不要。最も一般的なパターン——おそらくすべてのイベントコネクションの60%。

**コード等価：**

```csharp
onPlayerDeath.AddTriggerEvent(onUpdateScore);
onPlayerDeath.AddTriggerEvent(onLogAnalytics);
onPlayerDeath.AddTriggerEvent(onPlaySound);
onPlayerDeath.AddTriggerEvent(onShowDeathUI);
onPlayerDeath.AddTriggerEvent(onNotifyAI);
```

### シネマティックパターン

タイミング制御付きの厳密なシーケンシャルフロー。純粋なChain。

![Cinematic Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-cinematic.png)

`OnCutsceneStart`がチェーン：カメラ移動（waitForCompletion）→ ダイアログ開始（waitForCompletion）→ 選択UI表示（waitForCompletion）→ 選択に基づいて適切なブランチに続く。

**使うべき時：** 順序が負荷を持つ。ステップAが完了していなければステップBが壊れるか誤った結果を生む。カットシーン、チュートリアル、シーケンシャルな状態変更。

**コード等価：**

```csharp
onCutsceneStart.AddChainEvent(onMoveCamera, waitForCompletion: true);
onMoveCamera.AddChainEvent(onStartDialogue, waitForCompletion: true);
onStartDialogue.AddChainEvent(onShowChoiceUI, waitForCompletion: true);
```

### ハイブリッドボスパターン

パラレルな即座フィードバック＋シーケンシャルな状態変更＋条件分岐。両パターンのフルパワー。

![Hybrid Boss Pattern](/img/game-event-system/flow-graph/advanced-logic-patterns/pattern-hybrid.png)

`OnBossPhaseTransition`：
- **Trigger（パラレル）：** 警告サウンド、画面シェイク、UIアラート、パーティクルバースト
- **Chain（シーケンシャル）：** ボス無敵化 → 咆哮アニメーション（waitForCompletion）→ ミニオンスポーン（時間差ディレイ）→ 新攻撃パターンロード → ボス脆弱性回復
- **最終ステップのノード条件：** これが最終フェーズの場合、代わりに特別なエンディングチェーンに分岐

**使うべき時：** 複雑なゲームの瞬間の現実的なパターン。即座の感覚フィードバック（Trigger）＋慎重な状態変更（Chain）＋条件分岐（ノード条件）。

**コード等価：**

```csharp
void SetupBossTransition()
{
    // 即座フィードバック（パラレル）
    onBossPhaseTransition.AddTriggerEvent(onWarningSound);
    onBossPhaseTransition.AddTriggerEvent(onScreenShake);
    onBossPhaseTransition.AddTriggerEvent(onUIAlert);

    // 状態変更（シーケンシャル）
    onBossPhaseTransition.AddChainEvent(onBossInvulnerable);
    onBossInvulnerable.AddChainEvent(onRoarAnimation, waitForCompletion: true);
    onRoarAnimation.AddChainEvent(onSpawnMinions, delay: 0.5f);
    onSpawnMinions.AddChainEvent(onLoadAttackPatterns);
    onLoadAttackPatterns.AddChainEvent(onBossVulnerable);
}
```

## ランタイムデバッグ：フローの実行を見る

Flow Graphは設定ツールだけではない。Playモード中に、フロー全体がリアルタイムで実行されるのを見られる：

- **アクティブノード**がコネクション色でパルスする（Triggerはオレンジ、Chainはグリーン）
- **完了ノード**が短くフラッシュする
- **スキップされたノード**（条件がfalse）が赤くフラッシュする
- **エラーノード**が持続的に赤くハイライトされる

ボスフェーズ遷移がステップバイステップで実行されるのを見られる。Triggerファンアウトが同時に発火するのを見る。Chainが各ステップを進むのを見る。条件がステップをブロックしたりエラーがフローを壊した時に即座に気づく。

これがコルーチンベースのフローで失うものだ。コルーチンが途中で黙って止まると、あちこちにDebug.Logを追加して探偵になる。Flow Graphノードが赤くフラッシュすれば、どこでなぜかが正確にわかる。

## 判断フレームワーク

TriggerとChainパターンを複数のプロジェクトで使った後のヒューリスティック：

**デフォルトはTrigger。** 確信がなければTriggerから始める。ほとんどのイベントコネクションは「このシステムはこのイベントに独立して応答すべき」だ。サウンド、パーティクル、UI、アナリティクス、状態追跡——すべてTrigger。おそらくコネクションの60-70%。

**順序が重要な時はChainにアップグレード。** ステップAが完了していなければステップBが壊れる場合、それはChain。テレポート前のフェード。初期化前のロード。ヒットボックス有効化前のアニメーション。

**即座フィードバック＋遅延結果がある時は両方使う。** 即座の感覚レスポンス（サウンド、パーティクル、ビジュアルエフェクト）はTrigger。慎重な状態変更（シーンロード、テレポート、データセーブ）はChain。プレイヤーは即座にレスポンスを感じつつ、ゲーム状態はシーケンスで安全に更新される。

**型が一致しない時はArgument Transformerを使う。** 型変換のために中間イベントを作らない。コネクションにトランスフォーマーを置いてプロパティパスを指定する。

**「中断」にはノード条件を使う。** 残りのチェーン全体が停止する。「プレイヤーがリバイブトークンを持っている？死亡シーケンスを実行しない。」

**「スキップ」にはイベント条件を使う。** チェーンは続くがこのステップのサイドエフェクトは実行されない。「ミュートモード？サウンドをスキップするがリスポーンは続ける。」

ビジュアルFlow Graphがこのすべてを明示的にする。パラレルはオレンジ。シーケンシャルはグリーン。コネクション上のトランスフォーマー。ノード上の条件。複雑なゲームフローのアーキテクチャ全体——ボス戦、カットシーン、死亡シーケンス——が数十のファイルに散らばる代わりに1つのウィンドウで見える。

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
