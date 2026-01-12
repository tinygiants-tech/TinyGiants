---
sidebar_label: 'ゲームイベント発火'
sidebar_position: 6
---

# **ゲームイベントの発火**

イベントを作成し構成した後、最後のステップは**ゲームロジックでそれらをトリガーする**ことです。このページでは、ゲームイベントがどのように機能するか、スクリプトでそれらを発火する方法を示します。

:::tip ビジュアルワークフローを完了

1. ✅ イベントを作成 → **[Game Event Creator](./game-event-creator.md)**
2. ✅ アクションを構成 → **[Game Event Behavior](./game-event-behavior.md)**
3. ✅ **イベントを発火** ← 現在地
   :::

---

## 🎯 ゲームイベントの仕組み

ゲームイベントは**イベント発火**と**アクション実行**を分離します:

**従来のアプローチ**:
```csharp
// ❌ 密結合 - ドアのロジックがサウンド、アニメーションなどを知っている
public class Door : MonoBehaviour
{
    public AudioSource audioSource;
    public Animator animator;
    public UIManager uiManager;
    
    public void Open()
    {
        audioSource.Play();
        animator.SetTrigger("Open");
        uiManager.ShowNotification("Door opened");
        // ロジックが複数の依存関係に分散
    }
}
```

**ゲームイベントアプローチ**:
```csharp
// ✅ 疎結合 - ドアは「何かが起こった」ことだけを知る
public class Door : MonoBehaviour
{
    [GameEventDropdown]
    public GameEvent onDoorOpened;
    
    public void Open()
    {
        onDoorOpened.Raise();  // アクションはインスペクターで構成
    }
}
```

**主な違い**: アクション(サウンド、アニメーション、UI)は、スクリプトにハードコードされるのではなく、**Event Behaviorで視覚的に構成**されます。

---

## 📝 基本的な使用法: イベントの発火

### ステップ1: スクリプトでイベントを参照
```csharp
using TinyGiants.GameEventSystem.Runtime;
using UnityEngine;

public class DoorController : MonoBehaviour
{
    [GameEventDropdown]  // スマートインスペクターピッカー
    public GameEvent onDoorOpened;
    
    [GameEventDropdown]
    public GameEvent onDoorClosed;
    
    public void OpenDoor()
    {
        // ドアのロジックをここに
        onDoorOpened.Raise();  // イベントをトリガー
    }
    
    public void CloseDoor()
    {
        // ドアのロジックをここに
        onDoorClosed.Raise();
    }
}
```

---

### ステップ2: インスペクターでイベントを割り当て

**[GameEventDropdown]**属性は**型安全な検索可能ドロップダウン**を提供します:

![GameEvent Dropdown](/img/game-event-system/visual-workflow/game-event-raiser/raiser-dropdown.png)

**機能**:

- 🔍 **ファジー検索**: 入力して名前でイベントをフィルタリング
- 📁 **カテゴリ分け**: データベースとカテゴリ別にグループ化されたイベント
- 🔒 **型安全性**: 互換性のあるイベント型のみを表示
- ⚡ **クイックアクセス**: 手動でアセットをドラッグする必要なし

---

### 代替: [GameEventDropdown]なし

標準のpublicフィールドを使用することもできます:
```csharp
public GameEvent onDoorOpened;  // 標準のScriptableObjectフィールド
```

**インスペクタービュー**:

![Standard Object Field](/img/game-event-system/visual-workflow/game-event-raiser/raiser-so.png)

**ワークフロー**:

1. Projectウィンドウでイベントアセットを見つける(Event Database)
2. インスペクターフィールドにドラッグ&ドロップ

**推奨事項**: より良いワークフローのために**[GameEventDropdown]**を使用してください—より速く、型安全です。

---

## 🎨 型付きイベント(引数付き)

イベントはアクションにデータを運ぶことができます。

### Voidイベント(データなし)
```csharp
[GameEventDropdown]
public GameEvent onGameStart;

void Start()
{
    onGameStart.Raise();  // 引数なし
}
```

---

### 単一引数イベント
```csharp
[GameEventDropdown]
public SingleGameEvent onHealthChanged;

private float health = 100f;

public void TakeDamage(float damage)
{
    health -= damage;
    onHealthChanged.Raise(health);  // 現在のヘルス値を渡す
}
```

**型安全性**: ドロップダウンは`SingleGameEvent`イベントのみを表示し、型の不一致を防ぎます。

---

### Sender + 引数イベント
```csharp
[GameEventDropdown]
public GameObjectDamageInfoGameEvent onPlayerDamaged;

public void ApplyDamage(DamageInfo damageInfo)
{
    // Sender = このGameObject、Args = ダメージ情報
    onPlayerDamaged.Raise(this.gameObject, damageInfo);
}
```

**使用例**: アクションは**誰が**イベントをトリガーしたか、**どの**データを処理するかを知る必要があります。

---

## 🔒 実行中の型安全性

ドロップダウンは、フィールド型に基づいてイベントを**自動的にフィルタリング**します:
```csharp
public class ScoreManager : MonoBehaviour
{
    [GameEventDropdown]
    public Int32GameEvent onScoreChanged;  // public Int32GameEventのみを表示
    
    [GameEventDropdown]
    public Int32GameEvent onLevelUp;       // public Int32GameEventのみを表示
    
    private int score = 0;
    
    public void AddScore(int points)
    {
        score += points;
        onScoreChanged.Raise(score);  // 整数スコアを渡す
    }
}
```

**ドロップダウンフィルタリング**:
```
public Int32GameEventの利用可能なイベント:
  ✅ OnScoreChanged (int)
  ✅ OnLevelUp (int)
  ✅ OnComboMultiplier (int)
  ❌ OnPlayerDeath (void) — フィルタリングされた(誤った型)
  ❌ OnDamage (float) — フィルタリングされた(誤った型)
```

**なぜこれが重要か**: **編集時**に型エラーをキャッチし、実行時ではありません。

---

## 🔄 スケジュールされたイベントのキャンセル

イベントが**遅延**または**繰り返し**設定を使用している場合(**[Game Event Behavior](./game-event-behavior.md)**で構成)、実行をキャンセルできます:
```csharp
[GameEventDropdown]
public GameEvent repeatingSoundEvent;

void StartAmbientSound()
{
    repeatingSoundEvent.Raise();  // 繰り返しを開始(Behavior構成に基づく)
}

void StopAmbientSound()
{
    repeatingSoundEvent.Cancel();  // スケジュールされた実行を停止
}
```

**使用例**:

- プレイヤーがトリガーゾーンを離れる → アンビエントサウンドをキャンセル
- ゲームが一時停止 → タイミングイベントをキャンセル
- オブジェクトが破棄される → スケジュールされたアクションをクリーンアップ

---

## 🔧 高度: インスペクターリスナーコントロール

めったに必要ありませんが、実行時にインスペクター構成アクションを無効にできます:
```csharp
[GameEventDropdown]
public GameEvent myEvent;

void DisableCutsceneUI()
{
    myEvent.SetInspectorListenersActive(false);
    // インスペクターアクションは発火しない、コードリスナーのみ
}

void EnableCutsceneUI()
{
    myEvent.SetInspectorListenersActive(true);
    // インスペクターアクションが再び発火
}
```

**使用例**:

- カットシーン中にUI更新を一時的に無効化
- ゲーム状態に基づいてアクションセット間を切り替え

------

## 💡 完全なワークフロー例

ビジュアルワークフローを使用して完全なドアシステムを構築しましょう。

### ステップ1: イベントを作成

**[Game Event Creator](./game-event-creator.md)**で:

![Event Editor Create](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-editor.png)

- `OnDoorOpened`(voidイベント)を作成
- `OnDoorClosed`(voidイベント)を作成

---

### ステップ2: アクションを構成

**[Game Event Behavior](./game-event-behavior.md)**で:

![Event Behavior Configure](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-behavior.png)

**OnDoorOpenedイベント**:

- アクション: `AudioSource.PlayOneShot(doorOpenSound)`
- アクション: `Animator.SetTrigger("Open")`
- アクション: `ParticleSystem.Play()`(ダストエフェクト)

**OnDoorClosedイベント**:

- アクション: `AudioSource.PlayOneShot(doorCloseSound)`
- アクション: `Animator.SetTrigger("Close")`

---

### ステップ3: スクリプトを書く
```csharp
using TinyGiants.GameEventSystem.Runtime;
using UnityEngine;

public class DoorController : MonoBehaviour
{
    [GameEventDropdown]
    public GameEvent onDoorOpened;
    
    [GameEventDropdown]
    public GameEvent onDoorClosed;
    
    private bool isOpen = false;
    
    public void ToggleDoor()
    {
        if (isOpen)
        {
            isOpen = false;
            onDoorClosed.Raise();  // すべてのアクションが自動的に発火
        }
        else
        {
            isOpen = true;
            onDoorOpened.Raise();  // すべてのアクションが自動的に発火
        }
    }
    
    // このメソッドは以下から呼び出すことができます:
    // - インスペクターのボタンOnClick
    // - Collision/Trigger検出
    // - 他のゲームシステム
}
```

---

### ステップ4: インスペクターでイベントを割り当て

![Door Inspector Setup](/img/game-event-system/visual-workflow/game-event-raiser/raiser-example-dropdown.png)

1. `DoorController` GameObjectを選択
2. ドロップダウンを使用して`OnDoorOpened`イベントを割り当て
3. ドロップダウンを使用して`OnDoorClosed`イベントを割り当て

**完了!** スクリプトにサウンド、アニメーション、VFX参照なし—すべて視覚的に構成。

---

## 🆚 なぜUnityEventsより優れているか?

従来のUnityEventアプローチには、ゲームイベントが解決する制限があります:

### 従来のUnityEventの制限
```csharp
// ❌ 問題1: 多くのGameObjectにわたって分散された構成
public class Button1 : MonoBehaviour
{
    public UnityEvent onClick;  // Button1のインスペクターで構成
}

public class Button2 : MonoBehaviour
{
    public UnityEvent onClick;  // Button2のインスペクターで構成
}

// ❌ 問題2: すべての使用箇所を見つけるのが難しい
// シーン内のすべてのGameObjectを手動で検索する必要がある

// ❌ 問題3: 中央制御なし
// ボタンサウンドをグローバルに有効/無効化できない

// ❌ 問題4: 重複
// 50個のボタンで同じサウンド/VFXセットアップが繰り返される
```

---

### ゲームイベントの利点
```csharp
// ✅ 解決策: すべてのボタンが同じイベントを発火
public class ButtonController : MonoBehaviour
{
    [GameEventDropdown]
    public GameEvent onButtonClick;  // すべてのボタンで同じイベント
    
    public void OnClick()
    {
        onButtonClick.Raise();
    }
}
```

**利点**:

| 機能                | UnityEvent          | ゲームイベント                               |
| ---------------------- | ------------------- | ---------------------------------------- |
| **集中構成** | ❌ GameObjectごと    | ✅ 1つのEvent Behavior                     |
| **すべての使用箇所を検索**     | ❌ 手動検索     | ✅ [Event Finder](./game-event-finder.md) |
| **グローバルコントロール**     | ❌ 50個のオブジェクトを変更 | ✅ 1つのイベントを変更                       |
| **再利用性**        | ❌ コピー&ペースト        | ✅ 同じアセットを参照                   |
| **条件ロジック**  | ❌ コードが必要     | ✅ ビジュアル条件ツリー                  |
| **デバッグ**          | ❌ インスペクターのみ    | ✅ フローグラフ視覚化               |

---

### それぞれを使用するタイミング

**UnityEventsを使用**:

- シンプルな一回限りのコールバック(例: チュートリアルボタン)
- コンポーネント固有のロジック(例: スライダーが独自のラベルを更新)
- 再利用性が不要

**ゲームイベントを使用**:

- 再利用可能なロジック(例: すべてのボタンクリックが同じサウンドを再生)
- 複雑なシーケンス(例: カットシーン、ドアパズル)
- 中央制御が必要(例: すべてのUIサウンドをミュート)
- ビジュアルデバッグが必要(フローグラフ)

------

## ❓ トラブルシューティング

### ドロップダウンに「Manager Missing」と表示

**原因**: シーンに`GameEventManager`がありません。

**解決策**: 

Unityツールバーから Game Event System を開きます:
```csharp
Tools > TinyGiants > Game Event System
```

**「Initialize Event System」**ボタンをクリックすると、シーンに**Game Event Manager** GameObject(シングルトン)が作成されます。

---

### ドロップダウンに「No Active Databases」と表示

**原因**: `GameEventManager`にデータベースが割り当てられていません。

**解決策**:
1. シーンで`GameEventManager`を選択
2. インスペクター → Databasesセクション
3. イベントデータベースを追加

---

### ドロップダウンに「No Matching Events」と表示

**原因**: フィールド型に一致するイベントがありません。

**例**:
```csharp
[GameEventDropdown]
public StringGameEvent textEvent;  // StringGameEventが必要

// しかし、データベースには以下のみがあります:
// - GameEvent (void)
// - public Int32GameEvent
// - SingleGameEvent

結果: 一致するイベントなし!
```

**解決策**: [Game Event Creator](./game-event-creator.md)を使用して正しい型のイベントを作成します。

---

### イベントが発火しない

**チェックリスト**:
1. ✅ イベントアセットがインスペクターで割り当てられているか?
2. ✅ `Raise()`が呼び出されているか?(Debug.Logを追加して確認)
3. ✅ アクションが[Game Event Behavior](./game-event-behavior.md)で構成されているか?
4. ✅ 条件が満たされているか?(条件ツリーを確認)
5. ✅ GameEventManagerがシーンにあるか?

:::tip ビジュアルワークフロー完了!

これで完全なビジュアルワークフローを学びました:

1. ✅ Event Creatorでイベントを**作成**
2. ✅ Event Behaviorでアクションを**構成**
3. ✅ UnityEventsまたは`GameEventDropdown`でイベントを**発火**

**結果**: 疎結合で、保守可能な、デザイナーフレンドリーなゲームロジック!

:::

:::info ビジュアルからコードへ

このページは**ビジュアルワークフロー**(インスペクター割り当てでスクリプト内のイベントを発火)をカバーしています。**高度なコード技術**(実行時リスナー、条件トリガー、イベントチェーン)については、**[Runtime API](../scripting/raising-and-scheduling.md)**を参照してください。

:::