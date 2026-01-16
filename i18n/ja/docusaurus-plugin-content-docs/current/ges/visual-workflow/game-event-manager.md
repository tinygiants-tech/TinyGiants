---
sidebar_label: 'データベース & フローグラフ'
sidebar_position: 2

---

# ゲームイベントマネージャー

**Game Event Manager**は、システム全体の実行時の頭脳です。データ(イベント&フロー)をメモリにロードし、そのライフサイクルを管理し、リアルタイムテレメトリを提供する責任を担っています。

Dashboard(これは*作成*するためのツール)とは異なり、Managerはデータを*保持*するコンテナです。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-full.png)

---

## 🏗️ データアーキテクチャ

UIに入る前に、このシステムがどのようにデータを保存するかを理解することが重要です。

### ストレージモデル

1. **コンテナベースストレージ**: イベントは単独のファイルではありません。親**データベースアセット**(`.asset`)内の**サブアセット**として保存されます。
2. **関心の分離**:
   - **データベース**: イベント定義(識別、名前、型)を保存。
   - **フローグラフ**: ロジックノード(トリガー、チェーン、接続)を保存。
3. **「聖域」**: デフォルトでは、すべてのアセットは`Assets/TinyGiantsData/GameEventSystem/`に作成されます。

:::danger 重要: サブアセットを手動で削除しないこと

イベントはサブアセットであるため、データベースアセットを展開してプロジェクトビューから直接削除することは**絶対にしないでください**。

**正しいワークフロー**:

- ✅ **イベントを削除するには**: **[Game Event Editor](./game-event-editor.md)**を使用
- ✅ **フローを削除するには**: **[Game Event Flow Editor](../flow-graph/game-event-node-editor.md)**を使用

**理由は?** 手動削除はGUID参照を破壊し、データベースの整合性を破損させます。
:::

---

## 🗃️ データベース管理

このセクションは、シーン内でどのイベントセットがアクティブかを制御します。システムは**マルチデータベースアーキテクチャ**をサポートしており、イベントを分割(例: 「Core」、「Combat」、「UI」)し、必要に応じてロードできます。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-databases.png)

### 管理アクション

| アクション                | 説明                                                  |
| :-------------------- | :----------------------------------------------------------- |
| **Active / Inactive** | このデータベースがロードされるかどうかを切り替えます。非アクティブなデータベースは、実行時にイベントルックアップを解決しません。 |
| **Remove (×)**        | **このリストからのみ**データベースを削除します。プロジェクトからアセットファイルを削除**しません**。 |
| **+ Create New**      | `TinyGiantsData/GameEventSystem/Database`フォルダに新しい`.asset`データベースファイルを作成し、ここに追加します。 |
| **📂 Add Existing**    | 以前に作成したデータベースを追加するためにファイルピッカーを開きます(この操作はAssetsディレクトリ下のすべてのデータベースアセットを検索し、ドロップダウンリストに表示します)。 |

### アクティブ vs 非アクティブの理解

**アクティブデータベース**(緑色のバッジ):

- ✅ イベントはインスペクターでバインディング可能
- ✅ イベントは実行時にトリガー可能
- ✅ Game Event Editorの検索に表示される

**非アクティブデータベース**(黄色のバッジ):

- ⏸️ リストから削除せずに一時的に無効化
- 🔒 イベントはトリガーもバインドもできない
- 💡 季節限定コンテンツやDLCイベントに有用

:::tip プロジェクトコンテキストメニュー
プロジェクトウィンドウで直接データベースを作成することもできます:
```
右クリック → Create → TinyGiants → Game Event System → Game Event Database
```

その後、**「Add Existing」**ボタンを介してManagerに追加します。
:::

---

## 🕸️ フローグラフ管理

データベースと同様に、このセクションは**ビジュアルロジックコンテナ**を管理します。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-flowgraphs.png)

### フローコンテナとは?

**フローコンテナ**は、複数の「フローグラフ」(ビジュアルイベントシーケンス)を保持するScriptableObjectです。

**一般的なワークフロー**:

- **グローバルフロー**: すべてのシーンにわたってアクティブな永続ロジック(例: UIイベント、オーディオトリガー)
- **レベル固有フロー**: シーンごとにロード/アンロード(例: ボス戦シーケンス、チュートリアルステップ)

### 管理アクション

データベースと同じコントロール:

- **Create New**: 新しいフローコンテナアセットを生成
- **Add Existing**: 以前に作成したフローコンテナを登録
- **Active/Inactive**: フロー実行を有効化または無効化
- **Remove (×)**: Managerから登録解除(アセットは削除しない)

:::info フローグラフの編集
フローグラフ自体は**[Game Event Flow Editor](../flow-graph/game-event-node-editor.md)**で編集され、ここではありません。Managerは**どのフローがロードされるか**のみを制御します。
:::

---

## 📊 ライブ統計(テレメトリ)

インスペクターは、イベントシステムの健全性と構成を監視するための3つの専用パネルを提供します。

### 1. 概要統計

イベントのバインディングステータスを追跡します。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-overview.png)

| メトリック              | 説明                                                  |
| :------------------ | :----------------------------------------------------------- |
| **Total Events**    | すべてのアクティブデータベースにわたるイベントの総数。           |
| **Bound Events**    | 現在**インスペクターで構成されている**(ビジュアルバインディング)イベントの数。 |
| **Runtime Binding** | コード(`AddListener`)を介してバインドされたイベントは、**[Runtime Monitor](../tools/runtime-monitor.md)**で別途追跡されます。 |

**プログレスバー**: バインド(リスナーで構成)されたイベントの割合を表示します。

:::tip プレイモード自動更新
プレイモード中、統計パネルは実行時リスナー登録を反映するために自動的に更新されます。コードで`AddListener()`を呼び出すと、バインドイベント数が変化します。
:::

---

### 2. 構成

イベントアーキテクチャの複雑さの分布を示します。

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-composition.png)

| カテゴリ             | 定義                     | 使用例                               |
| :------------------- | :----------------------------- | :---------------------------------------------- |
| **Void Events**      | シンプルなシグナル(パラメータなし) | `OnGameStart`、`OnPause`、`OnButtonClick`       |
| **Single Parameter** | 型付きペイロードイベント           | `OnHealthChanged(float)`、`OnScoreUpdated(int)` |
| **With Sender**      | ソース認識イベント            | `OnDamage(GameObject sender, float amount)`     |

**なぜこれが重要か**: 

- Voidイベントの高い割合 = シンプルで保守しやすいアーキテクチャ
- Senderイベントの高い割合 = 詳細な追跡を備えた複雑でデータリッチなシステム

---

### 3. イベント型レジストリ

プロジェクトで現在コンパイルされ、サポートされているすべてのデータ型のライブレジストリ。

#### 組み込み型(すぐに使用可能)

システムには、使用法別に分類された**32の標準型**のネイティブサポートがプリロードされています:

<details>
<summary>📋 サポートされている組み込み型を表示</summary>


| C# 型 | 数学         | コンポーネント       | アセット          |
| :------- | :----------- | :--------------- | :-------------- |
| `int`    | `Vector2`    | `GameObject`     | `Sprite`        |
| `float`  | `Vector3`    | `Transform`      | `Texture2D`     |
| `double` | `Vector4`    | `RectTransform`  | `Material`      |
| `bool`   | `Vector2Int` | `Rigidbody`      | `AudioClip`     |
| `string` | `Vector3Int` | `Rigidbody2D`    | `AnimationClip` |
| `byte`   | `Quaternion` | `Collider`       |                 |
| `long`   | `Rect`       | `Collider2D`     |                 |
| `char`   | `Bounds`     | `Camera`         |                 |
|          | `Color`      | `Light`          |                 |
|          |              | `ParticleSystem` |                 |

</details>

**できること**: コード生成なしで、これらの型のいずれかをすぐに使用してイベントを作成できます。
```csharp
// 組み込み型イベントの例
[GameEventDropdown] public Int32GameEvent OnScoreChanged;
[GameEventDropdown] Vector3GameEvent OnPositionUpdated;
[GameEventDropdown] GameObjectGameEvent OnObjectSpawned;
```

---

#### カスタム & Sender型

**カスタムクラス**(例: `PlayerStats`)または**Senderイベント**(例: `<GameObject, DamageInfo>`)を持つイベントを作成すると、コード生成後にこれらの型が自動的にこのリストに表示されます。

**表示例**:

![alt text](/img/game-event-system/visual-workflow/game-event-manager/manager-type.png)

**作成プロセス**:

1. C#でカスタムクラスを記述
2. **[Game Event Creator](./game-event-creator.md)**を使用してイベントを作成(コード生成&イベントサブアセット)
3. 型がこのレジストリに表示される
4. これで、カスタム型を使用してイベントアセットを作成可能

---

## 🛠 ベストプラクティス

### ✅ 推奨事項

**データベースを分割する**

より良い整理のためにモジュラー構造を維持:
```tex
📁 Database/
├─ Global_DB.asset        (コアゲームイベント)
├─ Combat_DB.asset        (戦闘固有イベント)
├─ UI_DB.asset            (UIインタラクションイベント)
└─ Tutorial_DB.asset      (チュートリアルシーケンスイベント)
```

**利点**:

- より明確な整理
- より簡単なコラボレーション(異なるチームメンバーが異なるデータベースで作業)
- より良いパフォーマンス(必要なものだけをロード)

---

**すべてのシーンにManagerを保持する**

`GameEventManager`オブジェクトがすべてのシーンに存在することを確認:

- Managerは`DontDestroyOnLoad`を使用してシーン間で永続化
- 欠落している場合は、**[Game Event System Window](./game-event-system.md)**を開いて自動作成

---

**チームコラボレーションに「Add Existing」を使用**

チームメイトと作業する場合:

1. チームメイトがデータベースを作成し、バージョン管理にコミット
2. 最新の変更をプル
3. Managerインスペクターを開く → **「Add Existing」**をクリック
4. 新しいデータベースを選択
5. ✅ GUID参照は無傷のまま、リンク切れなし!

---

### ❌ 非推奨事項

**アセットを手動で削除しない**
```
❌ 誤り: Project Window → データベースアセットを展開 → イベントサブアセットを削除
✅ 正解: Game Event Editor → イベントを選択 → 削除ボタンをクリック
```

**理由は?** 手動削除はデータベースを破損し、すべての参照を壊します。

---

**Pluginsフォルダに移動しない**

データフォルダ(`TinyGiantsData`)を`Plugins`フォルダの**外**に保持:
```
✅ 正解: Assets/TinyGiantsData/GameEventSystem/
❌ 誤り: Assets/Plugins/TinyGiantsData/GameEventSystem/
```

---

## 🔧 インスペクターコンテキストメニュー

`GameEventManager`コンポーネントを右クリックしてユーティリティコマンドにアクセス:

### Clean Invalid Bindings

**目的**: アクティブなデータベースに存在しなくなったイベントバインディングを削除します。

**使用する場合**:

- Game Event Editorを介してイベントを削除した後
- Managerからデータベースを削除した後
- 古いプロジェクトをクリーンアップする場合

**動作内容**: すべてのバインディングをスキャンし、孤立した参照を削除します。

---

### Sync All Database Events

**目的**: Managerの内部バインディングリストをアクティブなデータベース内のすべてのイベントと同期します。

**使用する場合**:

- 別のプロジェクトからイベントをインポートした後
- 多くのイベントを含む新しいデータベースを追加した後
- バインディングリストが同期していないように見える場合

**動作内容**:

- 新しいイベントのバインディングを追加
- 削除されたイベントのバインディングを削除
- 既存の構成を保持

---

## ❓ トラブルシューティング

### Managerオブジェクトが欠落

**問題**: シーンヒエラルキーで`GameEventManager`が見つからない

**解決策**:

1. `Tools → TinyGiants → Game Event System`から**[Game Event System Window](./game-event-system.md)**を開く
2. 上部のステータスバーを確認
3. 青いボタンが表示されている場合は、**「Initialize System」**をクリック
4. Managerが自動作成される

---

### イベントがエディターに表示されない

**問題**: ドロップダウンメニューや検索でイベントが見つからない。

**チェックリスト**:

- ✅ データベースは**アクティブ**(緑色のバッジ)か?
- ✅ データベースはManagerに追加されているか?
- ✅ データベースに実際にイベントが存在するか?(**[Game Event Editor](./game-event-editor.md)**で確認)
- ✅ Manager **GameObject**はシーンに存在するか?

---

### データベースが破損しているように見える

**問題**: インスペクターに「孤立したサブアセット」やデータベース整合性に関するエラーが表示される。

**復旧**:

1. Managerコンポーネントを右クリック
2. **「Clean Invalid Bindings」**を選択
3. プロジェクトウィンドウでデータベースアセットを右クリック
4. **「Validate Database」**(利用可能な場合)を選択
5. シーンを保存してUnityを再起動

**予防**: イベントを削除するには常にGame Event Editorを使用し、手動で行わないこと。

:::tip 重要なポイント
Managerは**データコンテナ**です。図書館のように考えてください: データベースは本棚、イベントは本。Managerはどの本棚が開いているか(アクティブ)を決定し、誰がどの本を読んでいるか(バインディング)を追跡します。
:::