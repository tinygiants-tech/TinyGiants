---
sidebar_label: '12 マルチデータベース'
sidebar_position: 13
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 12 マルチデータベース：モジュール化されたイベントアーキテクチャ

<VideoGif src="/video/game-event-system/example/12-multi-database.mp4" />

## 📋 概要

何百ものイベントが発生する大規模なプロジェクト（RPG、MMO、複雑なシミュレーションなど）において、すべてのイベントを単一の巨大なデータベースアセットに保存することは、管理上の「悪夢」を招きます。エディタのパフォーマンス低下、Git のマージコンフリクト、そして組織化の欠如です。**マルチデータベースシステム**は、イベントを複数のモジュール化された ScriptableObject アセット（例：`Core_DB`、`Combat_DB`、`UI_DB`）に分割し、それぞれを独立して管理できるようにすることで、この問題を解決します。

:::tip 💡 学べること
- 複数のイベントデータベースを作成し、管理する方法
- ランタイムにおいてマネージャーがパフォーマンスコスト・ゼロでデータベースをマージする仕組み
- フローグラフが異なるデータベース間のイベントをシームレスに接続する方法
- チーム開発とバージョン管理のための組織化戦略

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/12_MultiDatabase/12_MultiDatabase.unity
```

### このデモが実演すること

このデモは、**デモ 11 のチェーンイベントロジック（5ステップの発射プロトコル）をそのまま再利用**していますが、アーキテクチャに決定的な違いがあります：

**デモ 11:** すべての 6 つのイベントを `GameEventDatabase_Chain.asset`（単一ファイル）に保存。

**デモ 12:** 同じ 6 つのイベントを **3 つの独立したデータベースファイルに分散：**
- `GameEventDatabase_Core.asset` - ロジックフローイベント
- `GameEventDatabase_Combat.asset` - アクション ＆ VFX イベント  
- `GameEventDatabase_System.asset` - ユーティリティ ＆ クリーンアップイベント

**結果:** ランタイムの挙動は同一ですが、拡張性に優れたモジュール形式の構成になっています。

---

## 🗂️ データベースアーキテクチャ

### 物理アセット構造

![Project Assets](/img/game-event-system/examples/12-multi-database/demo-12-assets.png)

**プロジェクトウィンドウ内:**
```
📂 12_MultiDatabase/
│
├── 🧠 GameEventDatabase_Core.asset      ➔ [ 📦 2つのイベント ]
│   ├── 🎬 0_StartSequence               ➔ 導入ロジック
│   └── ⚙️ 1_SystemCheck                 ➔ 初期化
│
├── ⚔️ GameEventDatabase_Combat.asset    ➔ [ 📦 2つのイベント ]
│   ├── ⚡ 2_Charge                      ➔ スキル開始
│   └── 🔥 3_Fire                        ➔ 弾丸ロジック
│
├── 🛠️ GameEventDatabase_System.asset    ➔ [ 📦 2つのイベント ]
│   ├── ⏳ 4_CoolDown                    ➔ グローバルタイマー
│   └── 📁 5_Archive                     ➔ 常駐/保存
│
└── 🕸️ GameEventFlow_MultiDatabase.asset ➔ [ 🌐 フローグラフ ]
    └─ (上記のすべてのデータベースにまたがるイベントを接続)
```

**重要な観察ポイント:**
各データベースは **ScriptableObject アセット**、つまりプロジェクト内の物理的な `.asset` ファイルです。これにより以下のことが可能になります：
- 異なるフォルダへの移動
- チームメンバーごとの担当割り当て（マージコンフリクトを回避！）
- ランタイムでの動的なロード/アンロード
- 独立したバージョン管理

:::note 📦 アセットとしてのデータベース

イベントデータベースは ScriptableObject であり、以下の特性を持ちます：

- プロジェクト内に `.asset` ファイルとして存在する
- シーン内で参照できる
- ドメインリロードを跨いで生存する
- 独立してシリアライズされる

これは、イベントを単一の JSON 設定やシーンに埋め込んで保存するシステムとは根本的に異なります。

:::

---

## 🎮 操作方法

### ランタイムの挙動テスト

シーンは**視覚的にはデモ 11 と同一**です。同じタレット、同じボタン、同じ発射シーケンスです。

**ステップ 1: プレイモードに入る**

**ステップ 2: 通常の発射をテストする**
- **「Launch A」**をクリック。
- **観察:** 5ステップのシーケンスが完璧に実行されます。
  - System Check ➔ Charge (1s 遅延) ➔ Fire ➔ CoolDown ➔ Archive
- **舞台裏:** 実行が 3 つのデータベースを飛び越えています：
  - Step 1 (`SystemCheck`) は `Core` DB から
  - Step 3 (`Fire`) は `Combat` DB から
  - Step 5 (`Archive`) は `System` DB から

**結果:** ✅ シームレスなクロスデータベース実行。

---

### データベースのロード検証

このテストは、モジュール化されたロードシステムが機能していることを証明します：

**ステップ 3: Combat データベースを無効にする**
1. ヒエラルキーで **Game Event Manager** を選択。
2. インスペクターで **Databases** リストを展開。
3. `GameEventDatabase_Combat` エントリを見つける。
4. "Active" トグルの**チェックを外す**。

**ステップ 4: 無効化されたデータベースをテストする**
- **「Launch A」**をクリック。
- **結果:** ❌ シーケンスが Step 2 (Charge) で停止します。
  - コンソールにイベントが見つからないというエラーが表示されます。
  - Step 3～5 は実行されません。

**ステップ 5: Combat データベースを再度有効にする**
- 再び "Active" トグルの**チェックを入れる**。
- **「Launch A」**をクリック。
- **結果:** ✅ シーケンスが再び正常に動作します。

**証明されたこと:**
- ランタイムでデータベースを動的に有効/無効にできる
- 必要なデータベースがないと実行が中断される（期待通りの動作）
- ロードするアセットはユーザーが完全に制御できる

---

## 🏗️ マルチデータベースの設定

### ランタイム：マネージャーの設定

ヒエラルキーの **Game Event Manager** を選択して、マルチデータベースの設定を確認します：

![Manager Databases](/img/game-event-system/examples/12-multi-database/demo-12-manager.png)

**Databases リスト (3つのエントリ):**
1. ✅ `GameEventDatabase_Core` - アクティブ
2. ✅ `GameEventDatabase_Combat` - アクティブ
3. ✅ `GameEventDatabase_System` - アクティブ

**ランタイムマージの仕組み:**
```
🚀 システムの初期化
│
├── 📂 ステージ 1: 発見 (Discovery)
│   └── 📚 マネージャーがすべてのアクティブなデータベースをスキャン・読み込み
│
├── 🧩 ステージ 2: 統合 (Consolidation)
│   └── 🛠️ グローバルルックアップテーブル (LUT) ですべてのイベントをマージ
│       ├── 🧬 キー:   イベント GUID (一意の識別子)
│       └── 📦 値:     イベント参照 (直接のポインタ)
│
└── 🔗 ステージ 3: リンク (Linking)
    └── 🕸️ FlowGraph の参照が GUID 経由で解決される
```

**パフォーマンス特性:**
- **ルックアップ速度:** O(1) - 単一データベースの場合と同じ
- **メモリオーバーヘッド:** 無視できるレベル（辞書のポインタのみ）
- **初期化:** 起動時に一度だけマージ
- **ランタイムコスト:** なし - 既にマージ済みのため

:::tip ⚡ パフォーマンスコスト・ゼロ

データベースが1つでも100個でも、**ランタイムのパフォーマンスに差はありません**。マネージャーは起動時にそれらを一つのルックアップテーブルにマージします。データベースの数は、パフォーマンスではなく「管理のしやすさ」に基づいて決めてください。

:::

---

### 設計時：エディタでのデータベース切り替え

**Game Event Editor** を開いて、データベースを跨いでイベントを管理します：

![Editor Database Dropdown](/img/game-event-system/examples/12-multi-database/demo-12-editor-dropdown.png)

**データベースドロップダウン (ツールバー):**
利用可能なすべてのデータベースを表示します：
- `GameEventDatabase_Core` (選択中)
- `GameEventDatabase_Combat`
- `GameEventDatabase_System`

**ワークフロー:**
1. **データベース選択:** 編集したいデータベースを選択
2. **イベント表示:** エディタには選択されたデータベースのイベントのみが表示される
3. **イベント作成:** 新しいイベントは現在選択されているデータベースに追加される
4. **コンテキスト切り替え:** ドロップダウンで素早くナビゲーションが可能

**例 - Core データベースを表示中:**
- ドロップダウン: `GameEventDatabase_Core`
- 表示イベント: `0_StartSequence`, `1_SystemCheck` (計2つ)
- 非表示イベント: 他のデータベースにあるすべてのイベント

:::note 🔄 コンテキストの切り替え

エディタは視覚的な混乱を避けるため、一度に一つのデータベースのみを表示します。ドロップダウンを使用してデータベースを切り替えてください。これはランタイムには影響せず、すべてのアクティブなデータベースは統合されています。

:::

---

### インスペクター：クロスデータベースでのイベント選択

インスペクターでスクリプトにイベントを割り当てる際、**GameEventDropdown** は**すべてのアクティブなデータベース**からイベントを表示します：

![Inspector Dropdown](/img/game-event-system/examples/12-multi-database/demo-12-inspector-dropdown.png)

**ドロップダウン構造:**
イベントはデータベースとカテゴリごとにグループ化されます：
```
⚔️ GameEventDatabase_Combat / Default
├─ ⚡ 2_Charge
└─ ⚡ 3_Fire

🧠 GameEventDatabase_Core / Default
├─ 📍 🎬 0_StartSequence        ➔ [ 現在選択中 ]
└─ ⚙️ 1_SystemCheck

🛠️ GameEventDatabase_System / Default
├─ ⏳ 4_CoolDown
└─ 💾 5_Archive
```

**主な挙動:**
- **全アクティブデータベース:** マネージャーにロードされている全データベースのイベントが含まれる
- **データベースラベル:** 明確化のために、イベント名にデータベース名がプレフィックスとして付く
- **カテゴリグループ:** 各データベース内のカテゴリに従って整理される
- **型フィルタリング:** フィールドの型シグネチャに一致するイベントのみを表示

**割り当ての例:**
```csharp
[GameEventDropdown] 
public GameObjectDamageInfoGameEvent sequenceStartEvent;
```

ドロップダウンの表示:
- ✅ `0_StartSequence` (Core DB 由来) - 互換性のある型
- ❌ 型が一致しない他のイベントは非表示

:::tip 🎯 スマートフィルタリング

ドロップダウンは以下により自動的にフィルタリングされます：

1. **型の互換性** - フィールドの型に一致するイベントのみ表示
2. **アクティブなデータベース** - マネージャーにロードされているデータベースのイベントのみ表示
3. **データベース/カテゴリ** - 整理されたグループ表示でナビゲートを容易に

これにより型エラーを防ぎ、大規模プロジェクトでも目的のイベントをすぐに見つけられます。

:::

---

## 🔑 マルチデータベースの利点

### チーム開発

**問題:** 10人の開発者が全員で `GlobalDatabase.asset` を編集している
- 絶え間ない Git のマージコンフリクト
- ロード時のエディタの長時間フリーズ
- 誰の担当か不明確

**ソリューション:** モジュールベースのデータベース所有権
```
📂 Databases/
│
├── 🧠 Core_DB.asset         ➔ 💻 [ オーナー: リードプログラマー ]
│   └─ グローバル状態、初期化、低レベルトリガー
│
├── ⚔️ Combat_DB.asset       ➔ 🤺 [ オーナー: 戦闘チーム ]
│   └─ 攻撃シーケンス、AI の挙動、ダメージロジック
│
├── 🖥️ UI_DB.asset           ➔ 🎨 [ オーナー: UI チーム ]
│   └─ メニュー遷移、HUD 更新、ボタンフィードバック
│
├── 🔊 Audio_DB.asset        ➔ 🎧 [ オーナー: オーディオチーム ]
│   └─ 環境音ループ、SE トリガー、BGM 状態切り替え
│
├── 🗺️ Level1_DB.asset       ➔ 📐 [ オーナー: レベルデザイナー A ]
│   └─ レベル 1 固有のパズル、トリガー、イベント
│
└── 🗺️ Level2_DB.asset       ➔ 📐 [ オーナー: レベルデザイナー B ]
    └─ レベル 2 固有のパズル、トリガー、イベント
```

**結果:**
- ✅ コンフリクトなしの並列作業
- ✅ 明確なモジュール所有権
- ✅ Git 操作の高速化（差分が小さい）
- ✅ コードレビューの容易化（変更セットが小さい）

---

### 論理的な整理

**問題:** 一つのデータベースに 500 個のイベントがある
- 特定のイベントを見つけるのが困難
- システム間の境界が不明瞭
- 依存関係の把握が難しい

**ソリューション:** ドメイン駆動のデータベース設計
```
⚔️ Combat_DB             ➔ [ 50 イベント ]
   └─ 攻撃、防御、高頻度のダメージロジック
🏃 Movement_DB           ➔ [ 30 イベント ]
   └─ 歩行、ジャンプ、ダッシュ、物理ベースの状態変化
🎒 Inventory_DB          ➔ [ 80 イベント ]
   └─ 取得、使用、破棄、アイテム耐久度
📜 Quest_DB              ➔ [ 100 イベント ]
   └─ 開始、進行、複雑な完了条件
🖥️ UI_DB                 ➔ [ 70 イベント ]
   └─ メニュー遷移、HUD 更新、ダイアログシステム
🔊 Audio_DB              ➔ [ 40 イベント ]
   └─ 動的な音楽レイヤー、ローカライズされた SE
🗺️ Level_Specific_DB     ➔ [ 130 イベント ]
   └─ 各レベル固有の環境・パズルイベント
```

**結果:**
- ✅ 明確なコンセプトの境界
- ✅ 関連イベントを特定しやすい
- ✅ 依存関係を理解しやすい
- ✅ モジュール単位のテスト（必要な DB のみロード）

---

### 動的ロード

**ユースケース:** 多数のレベルがあるモバイルゲーム

**問題:** 起動時に 1000 個のイベントをすべてロードするとメモリを浪費する

**ソリューション:** ランタイムデータベース管理
```csharp
void LoadLevel(int levelIndex)
{
    // 前のレベルのイベントをアンロード
    manager.UnloadDatabase("Level" + (levelIndex - 1));
    
    // 現在のレベルのイベントをロード
    manager.LoadDatabase("Level" + levelIndex);
    
    // コアシステムは常にロードしておく
    // (Core_DB, Combat_DB, UI_DB はアクティブのまま)
}
```

**結果:**
- ✅ メモリ使用量の削減
- ✅ シーン遷移の高速化
- ✅ 低スペックデバイスでのパフォーマンス向上
- ✅ モジュール単位のコンテンツ更新（単一 DB のパッチ適用）

---

## 🛠️ コードアーキテクチャ

### 場所に依存しない（Location-Agnostic）コード

デモ 12 のコードは**デモ 11 と同一**です。スクリプトはイベントがどのデータベースにあるかを知る必要も、気にする必要もありません：

**MultidatabaseRaiser.cs:**
```csharp
[GameEventDropdown]
public GameObjectDamageInfoGameEvent sequenceStartEvent;

public void RequestLaunchA()
{
    // このイベントがどのデータベースにあっても動作します
    // Core_DB でも Combat_DB でも、他のどんな DB でも構いません
    sequenceStartEvent.Raise(turretA, info);
}
```

**MultidatabaseReceiver.cs:**
```csharp
// 異なるデータベース由来のイベントにバインドされたメソッド
public void OnSystemCheck(GameObject sender, DamageInfo args)    // Core_DB 由来
public void OnStartCharging(GameObject sender, DamageInfo args)  // Combat_DB 由来
public void OnFireWeapon(GameObject sender, DamageInfo args)     // Combat_DB 由来
public void OnCoolDown(GameObject sender, DamageInfo args)       // System_DB 由来
public void OnSequenceArchived(GameObject sender, DamageInfo args) // System_DB 由来
```

**重要な洞察:**
スクリプトはデータベースのパスではなく、シリアライズされたフィールドに保存された **GUID** でイベントを参照します。マネージャーはランタイムに、どのデータベースに含まれているかに関わらず GUID をイベントインスタンスに解決します。

---

### フローグラフのクロスデータベース接続

フローグラフは、異なるデータベース間のイベントをシームレスに接続します：

**ビジュアルフロー (デモ 11 と同様):**
```
🧠 [ Core_DB ] ➔ 初期化レイヤー
│  ├─ 🎬 0_StartSequence   ➔ 🔘 Root (点火)
│  └─ ⚙️ 1_SystemCheck     ➔ 🛡️ Condition (ガード)
│
       ▼ (信号の引き渡し)
│
⚔️ [ Combat_DB ] ➔ アクションレイヤー
│  ├─ ⚡ 2_Charge           ➔ ⏱️ Delay (準備)
│  └─ 🔥 3_Fire             ➔ 🚀 Action (実行)
│
       ▼ (信号の引き渡し)
│
🛠️ [ System_DB ] ➔ メンテナンスレイヤー
│  ├─ ⏳ 4_CoolDown         ➔ ⌛ Wait (リカバリ)
│  └─ 💾 5_Archive          ➔ 🧹 Filter (クリーンアップ)
```

**舞台裏:**
- 各ノードはイベントの **GUID** を保持
- マネージャーがランタイムに GUID を実際のイベントに解決
- イベントがデータベース間を移動しても接続は維持される
- 再構成時に「リンク切れ」が発生しない

:::tip 🔗 GUID ベースの参照

イベントはファイルパスではなく、不変の GUID で参照されます。以下のことが可能です：

- イベントを別のデータベースへ移動する
- データベースファイルをリネームする
- フォルダ構造を再編する

イベントの GUID が変わらない限り、すべての参照は有効なまま維持されます。

:::

---

## 📊 ベストプラクティス

### 複数のデータベースを作成すべき時

**良い理由:**
- ✅ **チーム所有権** - 異なるチームが異なるシステムを担当している
- ✅ **論理ドメイン** - コンセプトの境界が明確（戦闘、UI、オーディオなど）
- ✅ **動的ロード** - レベルやモードごとにイベントをロード/アンロードしたい
- ✅ **バージョン管理** - マージコンフリクトを減らしたい
- ✅ **テスト** - 特定のテストに必要なデータベースのみをロードしたい

**避けるべき理由:**
- ❌ **パフォーマンス** - マルチ DB はランタイムコストがゼロなので、速度のために分ける必要はない
- ❌ **イベント数** - 一つの DB に 50 個程度のイベントなら問題ないので、細分化しすぎない
- ❌ **早すぎる最適化** - 最初は一つの DB で始め、不便を感じてから分割する

---

### 推奨されるデータベース構造

**小規模プロジェクト (イベント数 < 100):**
```
📂 Databases/
└─ 🧠 GameEventDatabase_Main.asset   ➔ [ 📦 オールインワン ]
   └─ (すべての戦闘、UI、システムイベントをここに集約)
```

**中規模プロジェクト (イベント数 100-300):**
```
📂 Databases/
├─ 🧠 Core_DB.asset         ➔ [ ⚙️ 基幹システム ]
├─ 🎮 Gameplay_DB.asset     ➔ [ ⚔️ 主要メカニクス ]
└─ 🖥️ UI_DB.asset           ➔ [ 🎨 メニュー ＆ HUD ]
```

**大規模プロジェクト (イベント数 300+):**
```
📂 Databases/
├─ 🧠 Core_DB.asset         ➔ 💻 [ グローバルシステム ]
├─ ⚔️ Combat_DB.asset       ➔ 🤺 [ バトルメカニクス ]
├─ 🏃 Movement_DB.asset     ➔ 🤸 [ キャラクターの挙動 ]
├─ 🎒 Inventory_DB.asset    ➔ 📦 [ アイテム ＆ グリッド管理 ]
├─ 📜 Quest_DB.asset        ➔ 📖 [ ミッション ＆ ストーリー ]
├─ 🖥️ UI_DB.asset           ➔ 🎨 [ インターフェース全般 ]
├─ 🔊 Audio_DB.asset        ➔ 🎧 [ 動的なサウンドスケープ ]
│
└─ 🗺️ Level_Specific/        ➔ 📐 [ 各レベル固有のイベント ]
   ├─ Level_01_DB.asset
   ├─ Level_02_DB.asset
   └─ ...
```

---

### 命名規則

**データベースファイル:**
- `GameEventDatabase_[モジュール名].asset` (エディタツールの仕様上、プレフィックスを推奨)
- 例: `GameEventDatabase_Combat.asset`, `GameEventDatabase_UI.asset`

**イベント名:**
- ステップ/優先度を付ける: `0_StartSequence`, `1_SystemCheck`
- またはモジュールを付ける: `Combat_AttackStart`, `UI_MenuOpen`
- 曖昧な名前は避ける: `Event1`, `MyEvent` (検索が困難)

---

## 🎯 次のステップは？

大規模化とコラボレーションを容易にするためのマルチデータベース管理について学びました。次は、ランタイムでの API の使用方法を見ていきましょう。

**次の章**: ランタイムでのイベント操作を学ぶ **[13 ランタイム API](./13-runtime-api.md)**

---

## 📚 関連ドキュメント

- **[ゲームイベントマネージャー](../visual-workflow/game-event-manager.md)** - データベースのロードと管理
- **[ゲームイベントエディタ](../visual-workflow/game-event-editor.md)** - マルチデータベースの編集ワークフロー
- **[ベストプラクティス](../scripting/best-practices.md)** - 大規模プロジェクト向けの組織化パターン