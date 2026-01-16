---
sidebar_label: '00 クイックスタート'
sidebar_position: 1
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 🚀 クイックスタート

<VideoGif src="/video/game-event-system/example/00-quick-start.mp4" />

## 📋 概要

この導入シーンでは、プロジェクトで Game Event System を有効にするために必要な**初回セットアップ**の手順を説明します。デモを詳しく見る前に、フレームワークのコアコンポーネントを初期化する必要があります。

:::tip 💡 学べること
- **Game Event System Dashboard** の開き方
- ワンクリックでシステムを初期化する方法
- セットアップ中に作成されるコンポーネントの内容

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/00_QuickStart/00_QuickStart.unity
```

このシーンを開いて初期化プロセスを開始してください。

---

## 🤔 なぜ初期化が必要なのですか？

Game Event System は、すべてのイベント操作を調整するために**常駐マネージャー** (`GameEventManager`) に依存しています。このマネージャーがないと、イベントの発行やリスニングを行うことができません。

初期化プロセスにより、以下が自動的にセットアップされます：

| コンポーネント              | 説明                                                  |
| ---------------------- | ------------------------------------------------------------ |
| 🎮 **GameEventManager** | シングルトンマネージャー（`DontDestroyOnLoad` 指定）            |
| 📚 **Event Database**   | イベント定義を保存するためのデフォルトアセット                |
| 🔗 **Flow Container**   | イベントオーケストレーション用のビジュアルロジックグラフ       |
| ⚙️ **生成済みコード**    | 組み込みイベント型 (`void`, `int`, `float` など) 用の C# クラス |

---

## 📖 ステップ・バイ・ステップのセットアップ

### 1️⃣ ダッシュボードを開く

Unity のトップメニューから以下に移動します：
```
Tools → TinyGiants → Game Event System
```

これにより **Game Event System** ウィンドウが開きます。ここはイベント、データベース、フローグラフを管理するセントラルハブとなります。

---

### 2️⃣ システムステータスの確認

ウィンドウ内の **"Initialize System"** セクションを確認します：

#### 🔵 初期化前

![System Uninitialized](/img/game-event-system/examples/00-quick-start/uninitialized.png)

- 青いボタン **"Initialize Event System"** が表示されています。
- ⚠️ 警告: "Please initialize the system first（まずシステムを初期化してください）"

#### 🟢 初期化後

![System Initialized](/img/game-event-system/examples/00-quick-start/initialized.png)

- ステータスバーが**緑色**になり、"✓ System Initialized" と表示されます。
- ✅ 確認メッセージ: "Core managers, database and codes are ready（コアマネージャー、データベース、コードの準備が完了しました）"

---

### 3️⃣ 初期化をクリック

**"Initialize Event System"** ボタンを押します。プラグインは自動的に以下の処理を実行します：

| アクション             | 結果                                                         |
| --------------------- | ------------------------------------------------------------ |
| **マネージャーの作成** | `GameEventManager` GameObject をシーンに追加（常駐設定）     |
| **データベースの生成** | プロジェクト内に `DefaultEventDatabase.asset` を作成         |
| **フローグラフの設定** | ビジュアルロジック用の `DefaultFlowContainer.asset` を作成    |
| **コードのコンパイル** | 型安全な C# イベントクラスを生成                             |

コンソールには **🎉 GameEvent initialization complete** と表示されます。

---

## ✅ 確認 (Verification)

初期化が完了したら、セットアップを確認してください：

1. **ヒエラルキーの確認** 🔍  

   ルートレベルに `GameEventManager` GameObject が表示されているはずです。

2. **インスペクターの確認** 👀  
   
   マネージャーを選択し、割り当てられた Database と Flow Container の参照を確認します。
   
3. **コンソールの確認** 📝  
   
   初期化が成功したことを示すメッセージを探します。

![GameEventManager in Hierarchy](/img/game-event-system/examples/00-quick-start/hierarchy.png)

:::info 🔔 シーンレベルのセットアップ

各シーンが機能するためには、それぞれ独自の **GameEventManager** が必要です。マネージャーは、そのシーンでどの **Event Databases** と **Flow Graphs** がアクティブであるかを決定します。データベース自体（ScriptableObject アセット）はシーンを跨いで再利用可能ですが、各シーンでどのデータベースを使用するかを明示的にバインドする必要があります。

:::

---

## 🎯 次のステップは？

環境の準備が整いました。これでフレームワークのコア機能を詳しく見ていくことができます。

**次の章**: **[01 Void Event](./01-void-event.md)** で、最初のイベントを作成してトリガーする方法を学びましょう。

:::note 📚 さらに詳しく

初期化プロセスや手動セットアップオプションに関する技術的な詳細は、**[インストールガイド](../intro/installation.md)** を参照してください。

:::