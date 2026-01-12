---
sidebar_label: 'コード生成とクリーンアップ'
sidebar_position: 1
---

# コード生成とメンテナンス

最高のパフォーマンスと**完璧なUnityインスペクターへの統合**を実現するために、**Game Event System** は特定のデータ型に対応した具体的なC#クラスを利用します。

`GameEvent<T>` は強力ですが、Unityのインスペクター（`UnityEvent`）はジェネリック型を直接シリアライズすることができません。このツールセットは、これらのラッパークラスの作成を自動化し、ボイラープレートコードを一行も書くことなく、カスタムデータ型（構造体、クラス、列挙型）をインスペクター上でネイティブに表示できるようにします。

## 🚀 ツールへのアクセス

これらのユーティリティは **[Game Event System](../visual-workflow/game-event-system)** 内に配置されており、以下の方法でアクセスできます：

**システムダッシュボードから:**

```
Game Event System Window → "Generate/Clean Game Event Code" または "Clean All Game Event Code" をクリック
```

![alt text](/img/game-event-system/tools/codegen-and-cleanup/hub-code-tools.png)

---

## 📂 アーキテクチャ

ツールを使用する前に、コードがどこに保存されるかを理解しておくことが重要です。システムは、プラグインをアップグレードしても生成されたファイルが失われないよう、**コアロジック**と**ユーザーデータ**を厳密に分離しています。

```text
Assets/
├── 📁 TinyGiants/                  # [コアロジック] 変更不可のプラグインルート
│   └── 📁 GameEventSystem/
│
└── 📁 TinyGiantsData/              # [ユーザーデータ] 生成されたコンテンツの保存場所
    └── 📁 GameEventSystem/
        └── 📁 CodeGen/             # 💾 自動生成されたC#クラス
            ├── 📁 Basic/           # 🛡️ プリミティブ型（システム必須ファイル）
            └── 📁 Custom/          # 💾 カスタム型（ツールによって管理）
```

:::info **プロジェクト構造**

プロジェクトディレクトリ全体の構造について詳しく理解するには、前の章の **[プロジェクト構造](../intro/project-structure.md)** を参照してください。

:::

:::danger 'Basic' フォルダを修正しないでください
`TinyGiantsData/GameEventSystem/CodeGen/Basic` フォルダには、必須のシステム型（Int, Float, Bool, Stringなど）が含まれています。

**このフォルダ内のファイルを手動で削除したり修正したりしないでください。** 

誤って Basic フォルダを削除したり、システムが基本型（Int32GameEventなど）の欠落を報告した場合は、環境を自己修復できます。

1. **Game Event System** (`Tools > TinyGiants > Game Event System`) を開きます。
2. ウィンドウ上部の **Initialize Event System** ボタンをクリックします。
3. システムが以下を実行します：
   - ディレクトリ構造の再作成。
   - すべての欠落している基本型コードの再生成。

:::

------

## 📝 生成されたコードの理解

特定の型（例：intやカスタムの `DamageInfo` 構造体）に対してコードを生成すると、ツールは2つの重要な部分を含むファイルを作成します：

1. **イベントクラス**: `GameEvent<T>` を継承した具体的なラッパー（例：Int32GameEvent）。
2. **バインディングフィールド**: `GameEventManager` の partial クラス拡張。これにより `UnityEvent<T>` フィールドが追加され、インスペクターがリフレクションを介してリスナーをバインドできるようになります。

### 例：基本型 (Int32)

```csharp
// =============================================================
// BASIC GAME EVENT - AUTO GENERATED
// =============================================================
using UnityEngine;
using UnityEngine.Events;

namespace TinyGiants.GameEventSystem.Runtime
{
    // 1. ScriptableObject クラス
    public class Int32GameEvent : GameEvent<int> { }
    
    // 2. インスペクターバインディング
    public partial class GameEventManager
    {
        public partial class EventBinding
        {
            [HideInInspector]
            public UnityEvent<int> Int32GameEventAction;
        }
    }
}
```

### 例：カスタム送信元（Sender）型

**送信元（Sender）**と**引数（Arguments）**の両方を持つイベントの場合：

```csharp
// =============================================================
// CUSTOM SENDER GAME EVENT - AUTO GENERATED
// =============================================================
using UnityEngine;
using UnityEngine.Events;

namespace TinyGiants.GameEventSystem.Runtime
{
    // 1. ScriptableObject クラス
    public class GameObjectDamageInfoGameEvent : GameEvent<UnityEngine.GameObject, DamageInfo> { }
    
    // 2. インスペクターバインディング
    public partial class GameEventManager
    {
        public partial class EventBinding
        {
            [HideInInspector]
            public UnityEvent<UnityEngine.GameObject, DamageInfo> GameObjectDamageInfoGameEventAction;
        }
    }
}
```

------

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## ⚡ コードジェネレーターツール

**Game Event Code Generator** はタブ形式のインターフェースを備えており、シンプルな単一引数イベントと複雑な送信元・引数付きイベントを切り替えることができます。どちらのモードも**バッチキューイング**をサポートしており、複数の型を設定して一度に生成することが可能です。

<Tabs>
  <TabItem value="single" label="単一引数 (Single Parameter)" default>

  ![コードジェネレーター - 単一引数](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_single.png)

  単一のデータペイロードを持つイベント（例：`SingleGameEvent` や `MyClassGameEvent`）には、このモードを使用します。

  1.  **クイック追加 (Quick Add)**: ドロップダウンを使用して、標準的なC#型（Double, Long, Vector3など）を素早く追加します。
  2.  **カスタム型の検索**: プロジェクト内のクラス、構造体、列挙型の名前を入力して検索します。
  3.  **キューシステム**: **Add** をクリックして、型を「Selected Queue（選択済みキュー）」に移動します。
  4.  **一括生成**: 緑色の **Generate Code(s)** ボタンをクリックすると、キューに入れられたすべての型のファイルが同時に作成されます。

  </TabItem>
  <TabItem value="sender" label="送信元付き (With Sender)">

  ![コードジェネレーター - 送信元付き](/img/game-event-system/tools/codegen-and-cleanup/tool_codegen_sender.png)

  **誰が**イベントをトリガーし、**何が**起きたか（例：`Player` が `DamageInfo` を送信した）を知る必要があるイベントには、このモードを使用します。

  1.  **送信元（Sender）型の選択**: 通常は `GameObject` や特定のスクリプト（例：`PlayerController`）を選択します。
  2.  **引数（Argument）型の選択**: ペイロードデータ（例：`DamageInfo`）を選択します。
  3.  **ペアを追加**: 特定の組み合わせ（例：`GameObject` → `DamageInfo`）を作成し、キューに追加します。
  4.  **一括生成**: 定義されたすべてのペアを一回の操作で生成します。

  </TabItem>
</Tabs>

:::tip 自動コンパイル
"Generate" をクリックすると、Unityはスクリプトの再コンパイルを開始します。コンパイル終了後、新しいイベントタイプが **Create Asset Menu** および **Event Editor** ですぐに利用可能になります。
:::

---

## 🧹 コードクリーナーツール

プロジェクトが進むにつれて、古い構造体を削除したりコードをリファクタリングしたりすると、未使用の GameEvent クラスが残ることがあります。**Code Cleaner** はジェネレーターのインターフェースをミラーリングしており、不要になったファイルを安全にフィルタリングして一括削除できます。

このツールは **Custom フォルダのみ** (`TinyGiantsData/.../Custom`) を対象とします。システムの整合性を守るため、`Basic` フォルダのファイルを表示したり削除したりすることはありません。

<Tabs>
  <TabItem value="single" label="単一引数 (Single Parameter)" default>

  ![コードクリーナー - 単一引数](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_single.png)

  生成されたすべてのカスタム `GameEvent<T>` ファイルをリスト表示します。

  *   **検索とフィルタリング**: 型名でファイルを検索します（例：「Damage」と検索すると `DamageInfoGameEvent.cs` が見つかります）。
  *   **すべて選択 / 解除**: 大規模なリストを素早く管理します。
  *   **複数選択**: 個別のファイルにチェックを入れるか、「Select All」を使用します。
  *   **削除**: 赤色の **Delete All Selected Files** ボタンを押すと、チェックされたすべての項目の `.cs` ファイルと対応する `.meta` ファイルが削除されます。

  </TabItem>
  <TabItem value="sender" label="送信元付き (With Sender)">

  ![コードクリーナー - 送信元付き](/img/game-event-system/tools/codegen-and-cleanup/tool_cleaner_sender.png)

  生成されたすべてのカスタム `GameEvent<Sender, Args>` ファイルをリスト表示します。

  *   **高度なフィルタリング**: 送信元（Sender）名、または引数（Argument）名で検索できます。
  *   **ファイルの確認**: 各ファイルの横にある **オブジェクトアイコン** 📦 をクリックすると、削除前にプロジェクトウィンドウでスクリプトをハイライト表示（Ping）できます（参照を再確認するのに便利です）。
  *   **一括削除**: 複数の送信元イベント定義を一クリックで安全に削除します。

  </TabItem>
</Tabs>

------

## ☢️ すべてクリーンアップ（リセット）

**Clean All Game Event Code** ボタンは「最終手段（Nuclear Option）」です。

- **アクション**: `TinyGiantsData/GameEventSystem/CodeGen/Custom` 内の**すべての**カスタムファイルを削除します。
- **保護**: Basic フォルダは**維持**されます。
- **ユースケース**: カスタムイベントをハードリセットしたい場合、または大量の型をリファクタリングして現在必要なものだけを再生成したい場合に使用します。