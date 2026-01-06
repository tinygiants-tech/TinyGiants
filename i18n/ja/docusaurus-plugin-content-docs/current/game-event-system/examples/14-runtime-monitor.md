---
sidebar_label: '14 ランタイムモニター'
sidebar_position: 15
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 14 ランタイムモニター：プロダクションレベルの可視性

<VideoGif src="/video/game-event-system/example/14-runtime-monitor.mp4" />

## 📋 概要

実際のプロダクション環境では、イベントは1秒間に数千回も発行されることがあります。`Debug.Log()` はガベージを生成し、コンソールを埋め尽くすだけで、システムの健全性に関する構造的な洞察を提供してくれません。必要なのは、リアルタイムのパフォーマンスプロファイリング、リスナーの追跡、頻度分析、および整合性警告を備えた**エンタープライズグレードの可視性（オブザーバビリティ）**です。

**ゲームイベントモニター（Game Event Monitor）**は、以下のような重要な問いに答えるための専門的なデバッグウィンドウです：
- *「どのイベントがフレームドロップの原因になっているのか？」*
- *「このイベントは頻繁に発行されすぎていないか？」*
- *「今、実際に誰がこのイベントをリッスンしているのか？」*
- *「なぜチェーンシーケンスが途切れてしまったのか？」*

このデモでは、4つの専用テストユニットを備えた**高負荷ストレステスト施設**をシミュレートし、モニターの各タブに診断データを入力するように設計されています。

:::tip 💡 学べること
- ランタイムモニターウィンドウの開き方と操作方法
- パフォーマンスメトリクス（平均/最小/最大実行時間）の読み方
- イベント頻度の分析とスパムの検出
- リスナー数の検査（インスペクター vs API バインディング）
- プログラムによって構築されたフローグラフの視覚化
- 整合性の問題の検出（ゴーストイベント、断絶されたチェーン）
- 警告と健全性インジケーターの解釈

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/14_RuntimeMonitor/14_RuntimeMonitor.unity
```

### シーン構成

**視覚的要素:**
- 🎯 **テストコンソール** - 4つのテストユニットを説明する情報パネル
- 🧊 **シンプルなジオメトリ** - 平面とキューブ（最小限のシーン構成）

**UIレイヤー (Canvas):**
- 🎮 **4つのコントロールボタン** - 画面下部
  - 「Toggle Spammer (Unit A)」➔ 高頻度スパムの開始/停止
  - 「Trigger Heavy Load (Unit B)」➔ 負荷の高い操作を実行
  - 「Fire Chain Reaction (Unit C)」➔ プログラムによるチェーンを実行
  - 「Fire Ghost Event (Unit D)」➔ リスナーのいないイベントを発行

**ゲームロジックレイヤー:**
- 📤 **RuntimeMonitorRaiser** - テストのオーケストレーター
- 📥 **RuntimeMonitorReceiver** - 計測用リスナーを備えたテストレスポンダー

---

## 🧪 4つのテストユニット

各ユニットは、モニターの特定のサブシステムに負荷をかけるように設計されています：

### ユニット A: スパマー (頻度テスト)

**目的:** 統計（Statistics）タブをテストするために、高頻度のイベントスパムを生成します。

**設定:**
- **イベント:** `OnSpammer` (void), `OnSpammerPersistent` (void)
- **挙動:** アクティブな間、`Update()` 内で **毎秒60回以上** 発行されます。
- **モニターの目標:** 高頻度警告を検出すること。

**期待される結果:**
- 📈 **Statistics タブ:** 毎秒60回以上の発行を表示（赤色の警告）。
- ⚠️ **Warnings タブ:** `[High Frequency]` 問題としてフラグを立てる。

---

### ユニット B: ヘビーリフター (パフォーマンステスト)

**目的:** パフォーマンス（Performance）タブをテストするために、高負荷な計算をシミュレートします。

**設定:**
- **イベント:** `OnHeavyLoad`, `OnHeavyLoadCondition` (GameObject, DamageInfo)
- **挙動:** リスナーが `Thread.Sleep(6)` を呼び出し、6ms以上のラグをシミュレートします。
- **モニターの目標:** パフォーマンス警告をトリガーすること。

**期待される結果:**
- ⚡ **Performance タブ:** 実行時間が 6-12ms と表示される（黄色/赤色）。
- 📊 **Dashboard:** パフォーマンスバーが黄色または赤色に変化する。

**コードの仕組み:**
```csharp
public void OnHeavyExecution(GameObject sender, DamageInfo info)
{
    // 重い計算をシミュレート（プロダクションでは厳禁ですが、テストには最適です！）
    Thread.Sleep(6);  // ← 意図的に6msの実行時間を強制
}
```

---

### ユニット C: チェーンリアクター (オートメーションテスト)

**目的:** プログラムによって構築されたフローグラフの視覚化を実演します。

**設定:**
- **イベント:** `OnChainStart` ➔ `OnChainProcess` ➔ `OnChainFinish` ➔ `OnTriggerComplete`
- **挙動:** 遅延と条件を備えた、コード構築による直列パイプライン。
- **モニターの目標:** オートメーション（Automation）タブで動的な自動化を視覚化すること。

**グラフ構造:**
```
🚀 [ START ] OnChainStart (DamageInfo)
│   ➔ ペイロード: { amount: 75.0, type: Physical, ... }
│
├─ ⏱️ [ STEP 1 ] ➔ 遅延: 0.5秒
│  └─► ⚙️ OnChainProcess (DamageInfo)      ✅ データを中継
│
├─ ⚖️ [ STEP 2 ] ➔ 遅延: 0.2秒 | ガード: `amount > 50`
│  └─► 🎯 OnChainFinish (DamageInfo)       ✅ ロジック通過 (75 > 50)
│
└─ 🧹 [ STEP 3 ] ➔ トリガーモード | 引数をブロック
   └─► 🏁 OnTriggerComplete (void)        ✅ 信号を精製
│
📊 結果: パイプライン完了 | 🛡️ データ安全: 出口で引数をブロック
```

**期待される結果:**
- 🔗 **Automation タブ:** タイミングや条件バッジを伴う階層ツリーを表示。
- 📝 **Recent Events タブ:** 連続した発行パターンが表示される。

---

### ユニット D: ゴースト (整合性テスト)

**目的:** リスナーがいない状態で発行されたイベントを検出します。

**設定:**
- **イベント:** `OnGhost` (void)
- **挙動:** **リスナーがゼロ**の状態でイベントを発行します。
- **モニターの目標:** 整合性警告をトリガーすること。

**期待される結果:**
- ⚠️ **Warnings タブ:** `[No Listeners]` 警告を表示。
- 📊 **Dashboard:** 警告カウントが増加。

---

## 🎮 テスト手順（ステップ・バイ・ステップ）

### フェーズ 1: 準備

**ステップ 1: モニターウィンドウを開く**
- **メニュー**
  このユーティリティは **[Game Event System](../visual-workflow/game-event-system)** 内にあり、以下の方法でアクセスできます：

  **システムダッシュボードから:**
  ```tex
  Game Event System Window → "Game Event Monitor" をクリック
  ```

- **ウィンドウの表示**
  他のUnityエディタウィンドウと同様にドッキング可能です。

**ステップ 2: プレイモードに入る**
- Unityのプレイボタンをクリックします。
- プレイ中もモニターは表示されたままになります。

---

### フェーズ 2: テストデータの生成

**ステップ 3: ユニット A (スパマー) を起動**
- **「Toggle Spammer (Unit A)」**ボタンをクリックします。
- **観察:** ボタンがアクティブ（ON）のままになります。
- **効果:** `OnSpammer` が毎秒60回以上発行されます。

**ステップ 4: ユニット B (高負荷) を起動**
- **「Trigger Heavy Load (Unit B)」**ボタンを **3～5回** クリックします。
- **効果:** クリックごとに、負荷の高い操作（6msのラグ）が1回トリガーされます。

**ステップ 5: ユニット C (チェーン反応) を起動**
- **「Fire Chain Reaction (Unit C)」**ボタンを **1回** クリックします。
- **効果:** 4ステップの直列パイプラインが開始されます。

**ステップ 6: ユニット D (ゴーストイベント) を起動**
- **「Fire Ghost Event (Unit D)」**ボタンを **1回** クリックします。
- **効果:** リスナーのいないイベントを発行します（整合性違反）。

:::tip ⏱️ 待機時間

すべてのユニットをトリガーした後、データを蓄積するために **5～10秒間** 待ってからモニターの各タブを分析してください。

:::

---

## 📊 モニターウィンドウの分析

### タブ 1: 🏠 Dashboard (システム健全性の概要)

ランディングページです。すべてのサブシステムからのメトリクスを一つの健全性レポートに集約します。

![Monitor Dashboard](/img/game-event-system/examples/14-runtime-monitor/demo-14-dashboard.png)

**メトリックカード（上段）:**

| カード | 意味 | 期待される値 |
| ---------------- | --------------------------------------- | ----------------- |
| **Total Events** | ロードされたイベント数 | 9 |
| **Total Logs** | プレイ開始からの累積発行数 | 500+ (増加中) |
| **Monitored** | パフォーマンス追跡が有効なイベント数 | 4-6 |
| **Warnings** | 現在アクティブな問題数 | 2+ (スパム + ゴースト) |

**Active Databases セクション:**
- ロードされているすべてのデータベースアセットを表示します。
- **PRIMARY** バッジはメインデータベースを示します。
- データベース名をクリックして表示をフィルタリングできます。

**Performance Overview (信号機型バー):**
- 🟢 **緑:** すべてのイベントが 1ms 未満（健全）。
- 🟡 **黄:** 一部のイベントが 1-5ms（注意）。
- 🔴 **赤:** 5ms を超えるイベントを検出（深刻）。
- 割合の分布が表示されます。

**Recent Activity (ミニログ):**
- 直近の 15 件のイベント発行を表示。
- 形式: `[Frame] EventName (args)`。
- クリックすると Details タブへジャンプします。

**Quick Warnings (トップ 3):**
- 最も深刻なアラートが表示されます。
- 重要度アイコン: 🔵 Info, 🟡 Warning, 🔴 Critical。

:::note 🎯 ダッシュボードの目的

車の計器パネルのように、一目でシステムの健全性を確認するためのものです。ここが赤や黄色を示している場合は、原因を特定するために特定のタブを詳しく調査してください。

:::

---

### タブ 2: ⚡ Performance (実行プロファイリング)

**焦点:** 実行時間によってパフォーマンスのボトルネックを検出します。

![Monitor Performance](/img/game-event-system/examples/14-runtime-monitor/demo-14-performance.png)

**カラム:**

| カラム | 意味 | 健全な範囲 |
| -------------- | --------------------------- | ----------------- |
| **Event Name** | イベントの識別名 | - |
| **Avg Time** | 平均実行時間 (ms) | &lt;1ms 🟢 |
| **Min Time** | 最速実行時間 | - |
| **Max Time** | 最遅実行時間 | &lt;5ms 🟡, >5ms 🔴 |
| **Listeners** | 発行あたりの平均リスナー数 | - |
| **GC Alloc** | 発行あたりの生成ガベージ量 | 0 KB が理想 |

**カラーコード:**
- 🟢 **緑:** 0-1ms (優秀)
- 🟡 **黄:** 1-5ms (監視が必要)
- 🔴 **赤:** >5ms (調査が必要)

**テスト結果 (Unit B):**
1. 表の中から `OnHeavyLoad` イベントを探します。
2. **Avg Time:** 約 6.00ms と表示されます (🟡 黄)。
3. **Max Time:** 複数回クリックした場合、約 12.00ms と表示されることがあります (🔴 赤)。
4. **原因:** リスナーコード内の `Thread.Sleep(6)`。

:::warning ⚠️ パフォーマンス予算

一般的なルールとして、平均実行時間は 1ms 未満に抑えるべきです。すべてのシステムを合わせて、1フレームの予算（60fpsなら16ms）内に収めるようにしてください。

:::

---

### タブ 3: 📝 Recent Events (リアルタイムイベントログ)

**焦点:** すべてのイベント発行の時系列ストリーム。

![Monitor Recent](/img/game-event-system/examples/14-runtime-monitor/demo-14-recent.png)

**カラム:**

| カラム | 意味 | 例 |
| ------------- | ----------------------------- | --------------------------------------- |
| **Frame** | Unity のフレーム番号 | `F:1450` |
| **Time** | プレイ開始からの経過時間 | `12.45s` |
| **Event** | イベント名 | `OnHeavyLoad` |
| **Arguments** | ペイロードのプレビュー | `<DamageInfo: 100>` |
| **Caller** | `.Raise()` を呼んだメソッド | `RuntimeMonitorRaiser.TriggerHeavyLoad` |

**機能:**
- 🔍 **検索:** イベント名でフィルタリング。
- 📋 **スタックトレース:** 切り替えて完全なコールスタックを表示。
- 🔗 **詳細リンク:** イベントをクリックして深掘り分析へ。

**テスト結果 (全ユニット):**
- **ユニット A:** `OnSpammer` エントリが高速に連続して表示される (60回以上/秒)。
- **ユニット C:** 直列パターン: `OnChainStart` ➔ (遅延) ➔ `OnChainProcess` ➔ `OnChainFinish` ➔ `OnTriggerComplete`。
- **ユニット D:** 単一の `OnGhost` エントリ。

:::tip 🎯 プロのヒント

Unity コンソールとは異なり、このログは**イベントに特化**しています。他の Debug.Log によるノイズがなく、構造化されたデータのプレビューや呼び出し元情報が直接表示されます。

:::

---

### タブ 4: 📈 Statistics (頻度分析)

**焦点:** 長期的な使用パターンと発行頻度の追跡。

![Monitor Statistics](/img/game-event-system/examples/14-runtime-monitor/demo-14-statistics.png)

**カラム:**

| カラム | 意味 | 健全な範囲 |
| ----------------- | ---------------------------- | ------------------------ |
| **Event Name** | イベントの識別名 | - |
| **Trigger Count** | プレイ開始からの合計発行数 | - |
| **Freq/sec** | 1秒あたりの発行数 | &lt;10 🟢, 10-30 🟡, >30 🔴 |
| **Avg Interval** | 発行間の平均時間 (ms) | 100ms以上が理想 |
| **Last Trigger** | 最後の発行からの経過時間 | - |

**テスト結果 (Unit A):**
1. `OnSpammer` イベントを探します。
2. **Trigger Count:** 急速に増加します（10秒後に1000回以上）。
3. **Freq/sec:** **>60/s** と表示されます (🔴 赤色の警告)。
4. **Avg Interval:** **~16ms** と表示されます (60fps環境で毎フレーム)。

**警告トリガー:**
- 🟡 **黄:** 1秒間に 10-30 回の発行。
- 🔴 **赤:** 1秒間に 30 回以上の発行（パフォーマンス問題の可能性）。

:::warning 🚨 頻度に関する危険信号
- **60回以上/秒:** おそらく毎フレーム発行されています。バッチ処理を検討してください。
- **不規則なスパイク:** ロジックのバグを示唆している可能性があります。
- **頻度がゼロ:** デッドコード、あるいは設定ミスの可能性があります。

:::

---

### タブ 5: ⚠️ Warnings (整合性と健全性アラート)

**焦点:** ノイズをフィルタリングし、深刻な問題を表面化させます。

![Monitor Warnings](/img/game-event-system/examples/14-runtime-monitor/demo-14-warnings.png)

**重要度レベル:**

| アイコン | レベル | 意味 |
| ---- | ------------ | -------------------------------- |
| 🔵 | **Info** | 参考情報 (FYI) |
| 🟡 | **Warning** | 非クリティカルな問題（監視推奨） |
| 🔴 | **Critical** | 深刻な問題（即座に修正が必要） |

**警告の種類:**

| 警告 | トリガー条件 | 重要度 |
| ------------------ | ----------------------------------- | ---------- |
| `[No Listeners]` | イベントが発行されたがリスナーがいない | 🔵 Info |
| `[High Frequency]` | 1秒間に30回以上発行されている | 🟡 Warning |
| `[Performance]` | 実行時間が 5ms を超えている | 🔴 Critical |
| `[GC Pressure]` | 1回の発行で 1KB 以上のガベージが発生 | 🟡 Warning |

**テスト結果:**
- **ユニット A:** `OnSpammer - [High Frequency] Firing at 62/sec`
- **ユニット D:** `OnGhost - [No Listeners] Event raised with zero subscribers`

:::note 🎓 ゴーストイベント

`[No Listeners]` 警告は通常、以下のいずれかのバグです：

1. リスナーの登録に失敗している（`OnEnable` を確認）
2. イベントアセットの参照が間違っている
3. デッドコード（その `.Raise()` 呼び出しを削除すべき）

:::

---

### タブ 6: 👂 Listeners (購読インスペクター)

**焦点:** 「誰が」リッスンしているかの詳細な内訳。

![Monitor Listeners](/img/game-event-system/examples/14-runtime-monitor/demo-14-listeners.png)

イベント（例: `OnHeavyLoad`）を選択すると、詳細な内訳が表示されます：

**リスナーカテゴリ:**

| カテゴリ | 意味 | アイコン |
| --------------- | ----------------------------------------- | ---- |
| **Basic** | 標準的な `AddListener` | 📌 |
| **Priority** | 優先度付きの `AddPriorityListener` | 🔢 |
| **Conditional** | 述語付きの `AddConditionalListener` | ✅ |
| **Persistent** | シーンを跨ぐ `AddPersistentListener` | 🧬 |

**内訳グリッドの例:**
```
📊 合計アクティブリスナー数: 5
│
├─ 🔗 基本リスナー (1)
│  ├─ 📦 インスペクターバインディング: 0
│  └─ 💻 API バインディング: 1
│     └─ ⚙️ RuntimeMonitorReceiver.OnHeavyExecution
│
├─ ⚖️ 優先度キュー (3)
│  ├─ 🥇 高優先度 (100): 1
│  │  └─ ⚙️ RuntimeMonitorReceiver.OnHeavyPreCheck
│  ├─ 🥈 通常優先度 (0): 1
│  │  └─ ⚙️ RuntimeMonitorReceiver.OnHeavyExecution
│  └─ 🥉 低優先度 (-100): 1
│     └─ ⚙️ RuntimeMonitorReceiver.OnHeavyPostCheck
│
├─ 🛡️ 条件付きガード (1)
│  └─ 💎 [Prio: 50] RuntimeMonitorReceiver.OnHeavyCriticalWarning
│     └─ 🔍 述語: (sender, info) => info.isCritical
│
└─ 💎 常駐レジストリ (0)
   └─ (アクティブなシーン跨ぎリスナーなし)
```

**テスト結果 (Unit B):**
- **合計:** 4-5 リスナー。
- **優先度分布:** 高(1), 通常(1), 低(1)。
- **条件付き:** 1 (判定用関数のプレビュー付き)。

:::tip 🔍 インスペクター vs API
- **インスペクターバインディング:** Behavior ウィンドウで設定。
- **API バインディング:** コード内の `AddListener` で登録。
両方がここに表示されるため、ハイブリッドな手法が正しく動作しているか検証できます。

:::

---

### タブ 7: 🔗 Automation (プログラムによるフローの可視化)

**焦点:** コードで構築されたトリガー/チェーンのグラフを視覚化します。

![Monitor Automation](/img/game-event-system/examples/14-runtime-monitor/demo-14-automation.png)

**ツリービュー構造:**
```
▼ OnChainStart (Root, <DamageInfo>)
  │
  ├─ 🔗 Chain → OnChainProcess
  │   ├─ ⏱️ 遅延: 0.5秒
  │   ├─ ✅ 引数を渡す
  │   └─ 型: <DamageInfo>
  │
  └─ (OnChainProcess 展開時)
      │
      ├─ 🔗 Chain → OnChainFinish
      │   ├─ ⏱️ 遅延: 0.2秒
      │   ├─ 🧩 条件: info.amount > 50
      │   ├─ ✅ 引数を渡す
      │   └─ 型: <DamageInfo>
      │
      └─ (OnChainFinish 展開時)
          │
          └─ 🕹️ Trigger → OnTriggerComplete
              ├─ ❌ 引数をブロック
              └─ 型: (void)
```

**バッジの凡例:**

| バッジ | 意味 |
| -------- | ------------------------ |
| ⏱️ `0.5s` | 遅延が設定されています |
| 🧩 | 条件が有効です |
| ✅ | 引数の受け渡しが有効です |
| ❌ | 引数がブロックされています |
| 🔗 | チェーンノード（直列） |
| 🕹️ | トリガーノード（並列） |

**テスト結果 (Unit C):**
- **ルート:** `OnChainStart`。
- **深さ:** 3レベル (Start ➔ Process ➔ Finish ➔ Complete)。
- **混合型:** チェーン（直列）とトリガー（並列）が組み合わされています。

:::note 🎨 コード vs ビジュアルグラフ
- **このタブ:** コードで構築されたグラフ (`AddChainEvent`, `AddTriggerEvent`) を表示します。
- **Flow Graph ウィンドウ:** UI で構築された視覚的なグラフを表示します。
どちらも有効であり、どちらもデバッグ可能です。

:::

---

### タブ 8: 🔍 Event Details (深掘り分析)

**焦点:** 単一イベントの分析と履歴。

![Monitor Details](/img/game-event-system/examples/14-runtime-monitor/demo-14-details.png)

他のタブから「Details」や「View」をクリックして詳細を表示します。

**セクション:**

**1. メタデータ:**
- **GUID:** 不変の一意な識別子。
- **型:** 完全なジェネリックシグネチャ。
- **カテゴリ:** 整理用のタグ。
- **データベース:** ソースアセットファイル。

**2. パフォーマンスサマリー:**
- Performance タブと同様の数値。
- **GC Allocation:** メモリプロファイル。
- **Listener Count:** 現在の購読者数。

**3. 頻度サマリー:**
- **Total Fires:** 累計発行数。
- **Fires/Sec:** 現在の頻度。
- **Avg Interval:** 平均間隔。
- **Last Fire:** 最後に発行されてからの時間。

**4. Recent Activity (フィルタ済み):**
- このイベントのみに絞り込まれたログストリーム。
- 完全なスタックトレースが利用可能です。

---

## 🏗️ シーンのアーキテクチャ

### イベントの整理

Game Event Editor 内で、テストユニットごとにイベントを整理しています：

| カテゴリ | イベント名 | 型 | 用途 |
| ---------- | ---------------------- | ----------------------------------- | ---------------------- |
| **Unit A** | `OnSpammer` | `GameEvent` | 高頻度スパム |
| **Unit A** | `OnSpammerPersistent` | `GameEvent` | 常駐スパム |
| **Unit B** | `OnHeavyLoad` | `GameEvent<GameObject, DamageInfo>` | パフォーマンステスト |
| **Unit B** | `OnHeavyLoadCondition` | `GameEvent<GameObject, DamageInfo>` | 条件付きテスト |
| **Unit C** | `OnChainStart` | `GameEvent<DamageInfo>` | ルート (ゴールド) |
| **Unit C** | `OnChainProcess` | `GameEvent<DamageInfo>` | チェーン Step 1 |
| **Unit C** | `OnChainFinish` | `GameEvent<DamageInfo>` | チェーン Step 2 |
| **Unit C** | `OnTriggerComplete` | `GameEvent` | チェーン Step 3 (トリガー) |
| **Unit D** | `OnGhost` | `GameEvent` | 整合性テスト |

---

### フローグラフの設定

コード内で構築された直列チェーン：

![Flow Graph](/img/game-event-system/examples/14-runtime-monitor/demo-14-graph.png)

**グラフ構造:**
- 🔴 **OnChainStart (Root, Red)** - エントリポイント
- 🟢 **OnChainProcess (Chain, Green)** - Step 1 (遅延: 0.5s)
- 🟢 **OnChainFinish (Chain, Green)** - Step 2 (遅延: 0.2s, 条件: amount > 50)
- 🟡 **OnTriggerComplete (Trigger, Yellow)** - Step 3 (引数をブロック)

---

## 💻 コード解説

### パフォーマンス問題のシミュレート (Unit B)

**RuntimeMonitorReceiver.cs - 重い処理の実行:**
```csharp
public void OnHeavyExecution(GameObject sender, DamageInfo info)
{
    // ⚠️ テスト用の意図的なラグ
    // 本番環境ではゲームロジック内で Thread.Sleep を絶対に使用しないでください！
    // モニターの警告をトリガーするために、実行時間を 5ms 以上に強制しています
    Thread.Sleep(6);  // ← 負荷の高い計算をシミュレート
    
    Debug.Log($"[Receiver] 重いデータを処理しました。レイテンシ: 6ms (シミュレート)");
}
```

---

### プログラムによるオートメーションの構築 (Unit C)

**RuntimeMonitorRaiser.cs - Awake() でのグラフ構築:**
```csharp
private ChainHandle _chainProcessHandle;
private ChainHandle _chainFinishHandle;
private TriggerHandle _triggerCompleteHandle;

private void Awake()
{
    // ✅ コードによるチェーンの構築（ビジュアルグラフは不使用！）
    
    // Step 1: Start ➔ (遅延 0.5s) ➔ Process
    _chainProcessHandle = onChainStart.AddChainEvent(
        targetEvent: onChainProcess,
        delay: 0.5f,
        passArgument: true
    );
    
    // Step 2: Process ➔ (条件 + 遅延 0.2s) ➔ Finish
    _chainFinishHandle = onChainProcess.AddChainEvent(
        targetEvent: onChainFinish,
        delay: 0.2f,
        condition: (info) => info.amount > 50f,  // ← 高ダメージのみ続行
        passArgument: true
    );
    
    // Step 3: Finish ➔ (トリガー, 引数ブロック) ➔ Complete
    _triggerCompleteHandle = onChainFinish.AddTriggerEvent(
        targetEvent: onTriggerComplete,
        passArgument: false    // ← 引数をブロック（void への型変換）
    );
}

private void OnDestroy()
{
    // ✅ 解除：動的グラフには必須です
    onChainStart.RemoveChainEvent(_chainProcessHandle);
    onChainProcess.RemoveChainEvent(_chainFinishHandle);
    onChainFinish.RemoveTriggerEvent(_triggerCompleteHandle);
}
```

---

### マルチ優先度リスナーの登録 (Unit B)

**RuntimeMonitorReceiver.cs - OnEnable():**
```csharp
private void OnEnable()
{
    // ✅ バリエーション豊かなリスナーを登録
    
    // 基本リスナー（優先度なし）
    onSpamEvent.AddListener(OnSpamReceived);
    
    // 優先度付きリスナー（実行順序）
    onHeavyLoadEvent.AddPriorityListener(OnHeavyPreCheck, priority: 100);   // 1番目
    onHeavyLoadEvent.AddPriorityListener(OnHeavyExecution, priority: 0);    // 2番目（ここでラグ）
    onHeavyLoadEvent.AddPriorityListener(OnHeavyPostCheck, priority: -100); // 3番目
    
    // 優先度付きの条件リスナー
    onHeavyLoadConditionEvent.AddConditionalListener(
        OnHeavyCriticalWarning,
        predicate: (sender, info) => info.isCritical,  // ← クリティカル時のみ
        priority: 50
    );
}
```

---

## 🎯 プロダクションでのデバッグワークフロー

### シナリオ 1: 戦闘中にフレームドロップが発生する

**症状:** 戦闘中、FPS が 60 から 30 に低下する。Unity プロファイラーでは明確なスパイクが見当たらない。

**デバッグ手順:**
1. **Performance タブ**を開く。
2. "Avg Time" で降順にソート。
3. 実行時間が 2ms を超えるイベントを探す。
4. イベントをクリック ➔ **Details タブ** ➔ 呼び出し元メソッドを確認。
5. 重いリスナーを最適化するか、発行頻度を下げる。

---

### シナリオ 2: イベントが発行されない

**症状:** UI ボタンをクリックしても反応がなく、期待した挙動が発生しない。

**デバッグ手順:**
1. **Recent Events タブ**を開く。
2. 期待されるイベント名で検索。
3. **見つかった場合:** イベントは発行されているが、リスナーが反応していない。
   - **Listeners タブ** ➔ リスナー数を確認。
   - メソッド名が一致しているか検証。
4. **見つからない場合:** イベント自体が発行されていない。
   - 発行側のコードで `.Raise()` が呼ばれているか確認。
   - インスペクターでイベントアセットの参照を確認。

---

### シナリオ 3: メモリリークの疑い

**症状:** 時間の経過とともにメモリ使用量が増加し、GC スパイクが頻発する。

**デバッグ手順:**
1. **Performance タブ**を開く。
2. "GC Alloc" カラムをチェック。
3. 1回の発行で 0 KB を超えるアロケーションを行っているイベントを探す。
4. イベントをクリック ➔ **Listeners タブ** ➔ クロージャ（ラムダ式等）によるアロケーションがないか確認。
5. 毎フレームの発行でアロケーションが発生しないようリファクタリング。

---

## 🔑 モニター使用のベストプラクティス

### ✅ 推奨事項

**開発中:**
- モニターをサブディスプレイで常に開いておく。
- 新しいイベントを追加した後に確認する。
- リスナー数が想定通りか検証する。
- 最適化の前後でプロファイリングを行う。

**ストレステスト中:**
- 高負荷を生成し（このデモのように）、Performance タブで 1ms を超えるイベントを監視する。
- Warnings タブで整合性の問題をチェックする。
- メトリクスをエクスポートしてチームで共有する。

---

### ❌ 避けるべき事項

**パフォーマンスのアンチパターン:**
- バッチ化せずに、毎フレームイベントを発行する（>60回/秒）。
- リスナー内でメモリ割り当て（クロージャ、LINQ等）を行う。
- 重い処理を同期的に呼び出す。

**デバッグのアンチパターン:**
- 黄色の警告を無視する（「ただの警告だ」と思わないこと）。
- イベントのデバッグを `Debug.Log` だけで済ませる。
- リスナーの解除（`OnDisable` での処理）を忘れる。

---

## 🎯 次のステップは？

これで `GameEventSystem` の完全なワークフロー（基本的なイベントからプロダクションレベルの可視化まで）をマスターしました。Examples（サンプル）セクションは以上で完了です！

**次のステップ:**
- 高度な機能について **[ツールとサポート](../tools/codegen-and-cleanup.md)** を探索する。
- プロダクション向けのパターンとして **[ベストプラクティス](../scripting/best-practices.md)** を復習する。
- 困ったときは **[コミュニティとサポート](../tools/community-and-support.md)** をチェックする。

---

## 📚 関連ドキュメント

- **[ランタイムモニターツール](../tools/runtime-monitor.md)** - モニターの完全なドキュメント
- **[ベストプラクティス](../scripting/best-practices.md)** - パフォーマンス最適化のパターン
- **[プログラムによるフロー](../scripting/programmatic-flow.md)** - コードによるグラフ構築
- **[API リファレンス](../scripting/api-reference.md)** - 完全なメソッドシグネチャ