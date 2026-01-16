---
sidebar_label: '02 基本型イベント'
sidebar_position: 3
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 02 基本型イベント：イベントでのデータ受け渡し

<VideoGif src="/video/game-event-system/example/02-basic-types-event.mp4" />

## 📋 概要

引数なし（void）イベントは単純な信号には適していますが、ほとんどのゲームではデータの受け渡しが必要です。「ダメージ量は？」「どのアイテム？」「どこにスポーンさせる？」といった情報のやり取りです。このデモでは、標準的なC#やUnityの型をイベントパラメータとして渡すことができる**ジェネリックイベントシステム**を紹介します。カスタムイベントクラスを手書きする必要はありません。

:::tip 💡 学べること
- 異なるデータ型に対するジェネリックイベントの作成方法
- システムが型安全なイベントクラスを自動生成する仕組み
- パラメータ（引数）を伴うイベントの発行と受信方法
- エディタにおける型安全性の強制

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/02_BasicTypesEvent/02_BasicTypesEvent.unity
```

### シーン構成

**UIレイヤー (Canvas):**
- 🎮 **4つのボタン** - 画面下部に配置されています
  - "Raise (String)" ➔ `BasicTypesEventRaiser.RaiseString()` をトリガー
  - "Raise (Vector3)" ➔ `BasicTypesEventRaiser.RaiseVector3()` をトリガー
  - "Raise (GameObject)" ➔ `BasicTypesEventRaiser.RaiseGameObject()` をトリガー
  - "Raise (Material)" ➔ `BasicTypesEventRaiser.RaiseMaterial()` をトリガー

**ゲームロジックレイヤー (デモスクリプト):**
- 📤 **BasicTypesEventRaiser** - 発行側スクリプトを持つGameObject
  - 4つの異なるジェネリックイベントへの参照を保持しています： `StringGameEvent`, `Vector3GameEvent`, `GameObjectGameEvent`, `MaterialGameEvent`
  - 各ボタンが特定のデータを使用して、異なる発行メソッドをトリガーします。

- 📥 **BasicTypesEventReceiver** - 受信側スクリプトを持つGameObject
  - Game Event Editorでのビジュアルバインディングを通じて、4つのイベントすべてをリッスンします。
  - シーン内の様々なオブジェクトを参照し、イベントデータを適用します。

**ビジュアルフィードバックレイヤー (デモオブジェクト):**
- 📝 **HoloDisplay** - 受信した文字列メッセージを表示するTextMeshProオブジェクト
- 🎲 **Cube** - Vector3イベントで移動し、Materialイベントで色が変わる3Dオブジェクト
- 📍 **TargetPosition** - GameObjectイベントでのスポーン位置を示すTransform
- 🏠 **Plane** - 視覚的なコンテキストのための地面

---

## 🎮 操作方法

### ステップ 1: プレイモードに入る

Unityの **Play** ボタンを押します。

### ステップ 2: 各イベントタイプをテストする

**"Raise (String)" をクリック:**
- 📝 HoloDisplay のテキストが "Hello World [カウント]" に更新されます。
- 🔢 クリックするたびにカウンターが増加します。
- 📊 コンソールログ: `[Sender] Raised String Event` ➔ `[Receiver] String Event Processed`

**"Raise (Vector3)" をクリック:**
- 🎲 青いキューブがランダムな位置にテレポートします。
- 📊 位置は指定された範囲（-2～2, 0～3, 0）内でランダムに決定されます。
- 📝 コンソールに送信および受信された正確な座標が表示されます。

**"Raise (GameObject)" をクリック:**
- 🎁 ランダムなプレハブ（CubeまたはSphere）が TargetPosition にスポーンします。
- 🔄 新しいものを作成する前に、前回スポーンしたものは破棄されます。
- 📝 コンソールにどのプレハブがインスタンス化されたかが記録されます。

**"Raise (Material)" をクリック:**
- 🎨 キューブの色がランダム（赤/緑/青/黄）に変わります。
- ✨ マテリアルの変更は瞬時に行われます。
- 📝 コンソールに適用されたマテリアル名が記録されます。

---

## 🏗️ シーンのアーキテクチャ

### イベント定義 (Event Definitions)

**Game Event Editor** ウィンドウを開き、設定済みの4つのイベントを確認します：

![Game Event Editor](/img/game-event-system/examples/02-basic-types-event/demo-02-editor.png)

**データベース内のイベント:**

| イベント名      | 型                      | 用途                                    |
| -------------- | ----------------------- | --------------------------------------- |
| `OnString`     | `StringGameEvent`     | テキスト表示の更新                      |
| `OnVector3`    | `Vector3GameEvent`    | 位置や移動データの送信                  |
| `OnGameObject` | `GameObjectGameEvent` | スポーン用のプレハブ参照の受け渡し      |
| `OnMaterial`   | `MaterialGameEvent`   | ビジュアル変更用のマテリアルアセット送信 |

**Behavior カラムに注目:**
各イベントには、Behavior カラムに色付きの型インジケーター（例: **(String)**, **(Vector3)**）が表示されています。これらのアイコンをクリックすると Behavior Window が開き、コールバックのバインディングを設定できます。これは前のデモで見たビジュアルバインディングシステムと同じです。

:::note 🔧 自動生成
`StringGameEvent` や `Vector3GameEvent` クラスを手動で作成する必要はありません。エディタで新しいイベントを作成すると、システムが `GameEvent<T>` の具体的な型を自動的に生成します。
:::

---

### 発行側の設定 (BasicTypesEventRaiser)

ヒエラルキーで **BasicTypesEventRaiser** GameObject を選択します：

![BasicTypesEventRaiser Inspector](/img/game-event-system/examples/02-basic-types-event/demo-02-inspector.png)

**設定の詳細:**

**1. C# 型 (String)**
- `Message Event` ➔ `OnString` (型でフィルタリングされたドロップダウン)
- `Message To Send` ➔ "Hello World" (テンプレートテキスト)

**2. 数学型 (Vector3)**
- `Movement Event` ➔ `OnVector3`
- `Target Position` ➔ (0, 5.41, -1.45) (基準位置)

**3. コンポーネント型 (GameObject)**
- `Spawn Event` ➔ `OnGameObject`
- `Prefabs To Spawn` ➔ 4つのプリミティブプレハブのリスト (Cube, Sphereなど)

**4. アセット型 (Material)**
- `Change Material Event` ➔ `OnMaterial`
- `Target Materials` ➔ 5つの色付きマテリアルのリスト

**型安全性の動作:**
- `[GameEventDropdown]` 属性は、型に合わせてイベントを自動的にフィルタリングします。
- "Message Event" スロットには `StringGameEvent` しか割り当てられません。
- 文字列スロットに `Vector3GameEvent` を割り当てようとしても、エディタによって防止されます。
- このコンパイル時の型安全性により、実行時のエラーを未然に防ぎます。

---

### 受信側の設定 (BasicTypesEventReceiver)

ヒエラルキーで **BasicTypesEventReceiver** GameObject を選択し、そのシーン参照を確認します：

**シーン参照:**
- `Log Text` ➔ HoloDisplay (TextMeshPro コンポーネント)
- `Moving Cube` ➔ Cube (Transform コンポーネント)
- `Changing Cube Renderer` ➔ Cube (MeshRenderer コンポーネント)
- `Spawn Point` ➔ TargetPosition (Transform コンポーネント)

**Behavior バインディング:**

4つのイベントは、それぞれ Game Event Editor の **Behavior Window** を通じて対応する受信メソッドに紐付けられています：

| イベント        | 紐付けられたメソッド | シグネチャ                 |
| -------------- | -------------------- | -------------------------- |
| `OnString`     | `OnMessageReceived`  | `void (string msg)`        |
| `OnVector3`    | `OnMoveReceived`     | `void (Vector3 pos)`       |
| `OnGameObject` | `OnSpawnReceived`    | `void (GameObject prefab)` |
| `OnMaterial`   | `OnMaterialReceived` | `void (Material mat)`      |

:::tip 🎯 型の一致

Behavior Window のメソッドドロップダウンは、イベントのパラメータ型に基づいてメソッドを自動的にフィルタリングします。`StringGameEvent` の場合、`(string)` パラメータを持つメソッドのみが表示されます。これにより、設定時点での型安全性が保証されます！

:::

---

## 💻 コード解説

### 📤 BasicTypesEventRaiser.cs (発行側)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;
using System.Collections.Generic;

public class BasicTypesEventRaiser : MonoBehaviour
{
    [Header("1. C# 型 (String)")]
    [GameEventDropdown] public StringGameEvent messageEvent;
    public string messageToSend = "Hello World";

    [Header("2. 数学型 (Vector3)")]
    [GameEventDropdown] public Vector3GameEvent movementEvent;
    public Vector3 targetPosition = new Vector3(0, 2, 0);

    [Header("3. コンポーネント型 (GameObject)")]
    [GameEventDropdown] public GameObjectGameEvent spawnEvent;
    public List<GameObject> prefabsToSpawn = new List<GameObject>();

    [Header("4. アセット型 (Material)")]
    [GameEventDropdown] public MaterialGameEvent changeMaterialEvent;
    public List<Material> targetMaterials = new List<Material>();

    private int _count;
    private AudioSource _audioSource;

    /// <summary>
    /// 動的なテキスト内容で StringGameEvent を発行します。
    /// 受信側は void MethodName(string value) というシグネチャを持つ必要があります。
    /// </summary>
    public void RaiseString()
    {
        if (messageEvent == null)
        {
            Debug.LogWarning("[MessageEvent] GameEvent が割り当てられていません。");
            return;
        }

        // カウンターを付与した動的な文字列を渡す
        messageEvent.Raise($"{messageToSend} [{_count++}]");
        Debug.Log($"[Sender] Stringイベントを発行しました: {messageEvent.name}");
    }

    /// <summary>
    /// ランダムな位置データで Vector3GameEvent を発行します。
    /// 移動、方向、または物理的な力の指定に便利です。
    /// </summary>
    public void RaiseVector3()
    {
        Vector3 randomPos = new Vector3(
            Random.Range(-2f, 2f), 
            Random.Range(0f, 3f), 
            0
        );
        
        if (movementEvent != null)
        {
            movementEvent.Raise(randomPos);
            Debug.Log($"[Sender] Vector3イベントを発行しました: {randomPos}");
        }
    }

    /// <summary>
    /// プレハブの参照を伴う GameObjectGameEvent を発行します。
    /// Unity Object の参照を安全に渡す方法を示しています。
    /// </summary>
    public void RaiseGameObject()
    {
        if (spawnEvent != null && prefabsToSpawn != null && prefabsToSpawn.Count > 0)
        {
            GameObject randomPrefab = prefabsToSpawn[Random.Range(0, prefabsToSpawn.Count)];
            spawnEvent.Raise(randomPrefab);
            Debug.Log($"[Sender] GameObjectイベントを発行しました。スポーン対象: {randomPrefab?.name ?? "null"}");
        }
        else
        {
            Debug.LogWarning("[Sender] RaiseGameObject 失敗: イベントまたはプレハブリストが null または空です。");
        }
    }

    /// <summary>
    /// マテリアルアセットの参照を伴う MaterialGameEvent を発行します。
    /// 実行時のビジュアルカスタマイズに最適です。
    /// </summary>
    public void RaiseMaterial()
    {
        if (changeMaterialEvent != null && targetMaterials != null && targetMaterials.Count > 0)
        {
            Material randomMaterial = targetMaterials[Random.Range(0, targetMaterials.Count)];
            changeMaterialEvent.Raise(randomMaterial);
            Debug.Log($"[Sender] Materialイベントを発行しました。適用マテリアル: {randomMaterial?.name ?? "null"}");
        }
        else
        {
            Debug.LogWarning("[Sender] RaiseMaterial 失敗: イベントまたはマテリアルリストが null または空です。");
        }
    }
}
```

**ポイント:**
- 🎯 **ジェネリック構文** - `GameEvent<T>` が異なる型を自動的に処理します。
- 🔒 **型安全性** - 各イベントは宣言されたパラメータ型のみを受け入れます。
- 📦 **データの受け渡し** - `.Raise(value)` メソッドが型付きパラメータを受け取ります。
- 🔇 **デカップリング** - 発行側は「誰が、何が」反応するかを知りません。

---

### 📥 BasicTypesEventReceiver.cs (リスナー)
```csharp
using UnityEngine;
using TMPro;

public class BasicTypesEventReceiver : MonoBehaviour
{
    [SerializeField] private TextMeshPro logText;
    [SerializeField] private Transform movingCube;
    [SerializeField] private MeshRenderer changingCubeRenderer;
    [SerializeField] private Transform spawnPoint;

    /// <summary>
    /// Game Event Editor の Behavior Window を通じて 'OnString' イベントに紐付けられています。
    /// シグネチャ: void (string)
    /// </summary>
    public void OnMessageReceived(string msg)
    {
        if (logText != null)
            logText.text = $"受信した文字列: \n<color=yellow>{msg}</color>";
            
        Debug.Log($"[Receiver] Stringイベントを処理しました: {msg}");
    }

    /// <summary>
    /// Game Event Editor の Behavior Window を通じて 'OnVector3' イベントに紐付けられています。
    /// シグネチャ: void (Vector3)
    /// </summary>
    public void OnMoveReceived(Vector3 pos)
    {
        if (movingCube != null)
            movingCube.localPosition = pos;
            
        Debug.Log($"[Receiver] キューブを移動しました: {pos}");
    }

    /// <summary>
    /// Game Event Editor の Behavior Window を通じて 'OnGameObject' イベントに紐付けられています。
    /// シグネチャ: void (GameObject)
    /// </summary>
    public void OnSpawnReceived(GameObject prefab)
    {
        if (prefab != null && spawnPoint != null)
        {
            // 前回のスポーンをクリア
            if (spawnPoint.childCount > 0)
            {
                foreach(Transform child in spawnPoint) 
                    Destroy(child.gameObject);
            }

            Instantiate(prefab, spawnPoint.position, Quaternion.identity, spawnPoint);
            Debug.Log($"[Receiver] プレハブのインスタンスをスポーンしました: {prefab.name}");
        }
    }

    /// <summary>
    /// Game Event Editor の Behavior Window を通じて 'OnMaterial' イベントに紐付けられています。
    /// シグネチャ: void (Material)
    /// </summary>
    public void OnMaterialReceived(Material mat)
    {
        if (changingCubeRenderer != null && mat != null)
        {
            changingCubeRenderer.material = mat;
            Debug.Log($"[Receiver] マテリアルを変更しました: {mat.name}");
        }
    }
}
```

**ポイント:**
- 🎯 **シグネチャの一致** - 各メソッドのパラメータはイベントの型と完全に一致する必要があります。
- 🔒 **型安全性** - エディタの Behavior Window は互換性のあるメソッドのみを表示します。
- 🎨 **直接利用** - 受信したデータはキャストなしでそのまま使用できます。
- 🔇 **デカップリング** - 受信側は発行側が誰であるかを知りません。

---

## 🔑 重要なまとめ

| コンセプト            | 実装内容                                                     |
| ---------------------- | ------------------------------------------------------------ |
| 🎯 **ジェネリックイベント** | `GameEvent<T>` はあらゆるシリアライズ可能な型をサポートします |
| 🔒 **型安全性**         | エディタは設定時に一致する型を強制します                     |
| 🏭 **自動生成**         | イベントクラスの手動作成は不要です                           |
| 📦 **データの受け渡し** | `.Raise(value)` が型付きパラメータをシームレスに渡します     |
| 🔄 **柔軟性**           | 文字列、ベクトル、オブジェクト、マテリアルなどを一つのシステムで扱えます |

:::note 🎓 設計の洞察

ジェネリックシステムにより、ボイラープレートコード（定型コード）が排除されます。`StringGameEvent` や `Vector3GameEvent` などを個別に作成する代わりに、任意の型で `GameEvent<T>` を使用するだけです。システムがコード生成と型チェックを自動的に処理します！

:::

---

## 🎯 次のステップは？

組み込み型を渡す方法は分かりました。では、**独自のカスタムクラス**についてはどうでしょうか？

**次の章**: カスタムデータ型でイベントを作成する **[03 カスタム型イベント](./03-custom-type-event.md)**

---

## 📚 関連ドキュメント

- **[Game Event Creator](../visual-workflow/game-event-creator.md)** - エディタでジェネリックイベントを作成する方法
- **[Game Event Behavior](../visual-workflow/game-event-behavior.md)** - コールバックバインディングの詳細ガイド
- **[イベントの発行](../scripting/raising-and-scheduling.md)** - `.Raise()` メソッドのAPIリファレンス
- **[APIリファレンス](../scripting/api-reference.md)** - 完全なジェネリックイベントAPI