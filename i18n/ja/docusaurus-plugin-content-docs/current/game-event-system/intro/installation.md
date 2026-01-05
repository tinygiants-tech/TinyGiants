---
sidebar_label: 'インストール'
sidebar_position: 3
---

import Tabs from '@theme/Tabs';

import TabItem from '@theme/TabItem';

import VideoGif from '@site/src/components/Video/VideoGif';



# インストール

ようこそ! **Game Event System**のセットアップは、5秒以内に稼働させることができるよう設計された合理化されたプロセスです。

 <VideoGif src="/video/game-event-system/installation.mp4" />

 :::tip 

上記のビデオは、インポートから初期化までの全プロセスを示しています。各ステップの詳細な説明については、以下のガイドを参照してください。 

::: 

------

## ✅ 前提条件

インストール前に、プロジェクトが最小要件を満たしていることを確認してください:

| 要件           | 最小バージョン   | 推奨             |
| :-------------------- | :---------------- | :---------------------- |
| **Unityバージョン**     | **2021.3 LTS**    | **2022.3 LTS**以降 |
| **スクリプティングバックエンド** | MonoまたはIL2CPP    | IL2CPP(本番環境用) |
| **API互換性** | .NET Standard 2.1 | .NET Standard 2.1       |

---

## ステップ1: パッケージのインポート

プラグインの入手方法に応じて、適切なインポート方法を選択してください:

<Tabs>
  <TabItem value="store" label="パッケージマネージャー経由" default>

  1.  Unityを開き、**Window > Package Manager**に移動します。
  2.  ドロップダウンから**「My Assets」**を選択します。
  3.  **「Game Event System」**を検索します。
  4.  **Download**をクリックし、次に**Import**をクリックします。
  5.  ファイルリストが表示されたら、**すべてのファイル**が選択されていることを確認し、**Import**をクリックします。

  </TabItem>
  <TabItem value="custom" label=".unitypackage経由">

  1.  コンピューター上の`.unitypackage`ファイルを見つけます。
  2.  ファイルを直接Unityの**Project View**に**ドラッグ&ドロップ**します。
  3.  (または**Assets > Import Package > Custom Package...**に移動します)
  4.  ファイルリストが表示されたら、**すべてのファイル**が選択されていることを確認し、**Import**をクリックします。

  </TabItem>
</Tabs>

:::info コンパイル時間
インポート後、Unityは再コンパイルをトリガーします。これは正常です。先に進む前にローディングバーが終了するまで待機してください。
:::

---

## ステップ2: システムダッシュボードを開く

インポートが完了したら、Unityツールバーからメインハブにアクセスします:
```text
Tools > TinyGiants > Game Event System
```

:::tip 自動オープン

初回インポート時には、GameEventSystemウィンドウが自動的に開きます

:::

### 🔍 自動環境チェック

開くと、**System Information**パネル(ダッシュボードの下部に配置)が自動的にプロジェクト環境をスキャンします。

![alt text](/img/game-event-system/intro/installation/install-step-2-sysinfo.png)

リアルタイムで主要な互換性メトリクスを検証します:

- **Unityバージョン**: サポートされているバージョン(2021.3+で緑色のチェック)かどうかを検証します。
- **レンダーパイプライン**: **Built-in**、**URP**、または**HDRP**を自動検出します。プラグインは3つすべてに対応しています。
- **スクリプティングバックエンド**: **Mono**または**IL2CPP**のどちらで実行しているかを表示します。

:::tip スマート検出
手動で何かを設定する必要はありません。このパネルに緑色のチェックが表示されていれば、環境の準備は完了です。
:::

------

## ステップ3: システムの初期化

ウィンドウを初めて開くと、シーンに必要なマネージャーが不足していることをシステムが検出します。

### 1. 「未初期化」状態

ダッシュボードの上部に警告バナーが表示されます:

> ⚠️ **最初にシステムを初期化してください。**

*(アクションボタンは**ダークブルー**で表示されます)*

![alt text](/img/game-event-system/intro/installation/install-step-3-uninitialized.png)

### 2. ワンクリックセットアップ

**「Initialize Event System」**ボタンをクリックします。

システムは以下の自動タスクを実行します:

1. シーンに**Game Event Manager** GameObject(シングルトン)を作成します。
2. (欠落している場合)デフォルトの**GameEventDatabase**アセットを生成します。
3. (欠落している場合)デフォルトの**FlowContainer**アセットを生成します。
4. 必要なC#ジェネリック型をコンパイルします。

### 3. 成功!

ボタンが**緑色**に変わり、ステータステキストに**「System Ready」**と表示されます。

![alt text](/img/game-event-system/intro/installation/install-step-3-success.png)

---

## ステップ4: ヒエラルキー&コンポーネントの確認

すべてが正しく動作していることを確認するには、**Scene Hierarchy**を確認してください。新しいGameObjectが表示されるはずです:

> **🔹 Game Event Manager**

![alt text](/img/game-event-system/intro/installation/install-step-4-managers.png)

### コンポーネントスタック

このオブジェクトを選択します。インスペクターには、一連のマネージャーコンポーネントが事前設定されていることがわかります。各コンポーネントは、イベントライフサイクルの特定部分を担当するシングルトンベースのマネージャーです。

![alt text](/img/game-event-system/intro/installation/install-step-4-manager.png)

| コンポーネント                      | 責任       | 主要機能                                                 |
| :----------------------------- | :------------------- | :----------------------------------------------------------- |
| **GameEventManager**           | 👑 **コアブレイン** | データベースのロード、イベントルックアップ、静的状態のリセットを管理します。これが唯一の必須コンポーネントです |
| **GameEventPersistentManager** | **永続性**      | `DontDestroyOnLoad`を介してシーン遷移に耐える必要がある「永続的」とマークされたイベントを管理します |
| **GameEventFlowManager**       | **ビジュアルスクリプティング** | フローグラフの実行エンジン。トリガーとチェーン間のロジックを調整します |
| **GameEventSchedulerManager**  | **時間ロジック**       | `RaiseDelayed`や`RaiseRepeating`などの時間ベース操作を処理します |
| **GameEventTriggerManager**    | **ファンアウトロジック**    | 「トリガー」ノードを管理します。1つのイベントが発火すると、複数のターゲットイベントを同時にトリガーできます(並列) |
| **GameEventChainManager**      | **順次ロジック** | 「チェーン」ノードを管理します。待機時間と条件付きブレイクをサポートして、一連のイベントを順番に実行します(直列) |

:::warning モジュラー性と安全性
このアーキテクチャはモジュラーです。技術的には、特定のマネージャーを**削除できます**(例: フローグラフを使用しない場合、Flow、Trigger、Chainマネージャーを削除してシーンのフットプリントを最小化できます)。

ただし、**フルスタックを付けたままにしておく**ことを**強くお勧めします**。これらのコンポーネントは:
1. アイドル時に**オーバーヘッドがゼロ**(Updateループなし)。
2. **ビジュアルワークフロー**が機能するために必要です。
3. 後でDelayed RaiseやFlow Graphを使用することにした場合に、「Missing Component」実行時エラーを防ぎます。

:::

------

## 🏁 準備完了!

システムは現在完全に初期化され、本番環境に対応できる状態です。

### 次のステップは?

- **🎮 最初のイベントを作成**: **[Game Event Creator](../visual-workflow/game-event-creator.md)**ガイドにジャンプします。
- **👀 動作デモを見る**: **[00 Quick Start](../examples/00-quick-start.md)**サンプルシーンを開きます。
- **📚 ツールを理解する**: **[Game Event System](../visual-workflow/game-event-system.md)**について読みます。