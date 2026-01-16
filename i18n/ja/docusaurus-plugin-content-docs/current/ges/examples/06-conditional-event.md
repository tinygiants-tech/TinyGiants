---
sidebar_label: '06 条件付きイベント'
sidebar_position: 7
---

import VideoGif from '@site/src/components/Video/VideoGif';

# 06 条件付きイベント：ビジュアルロジックビルダー

<VideoGif src="/video/game-event-system/example/06-conditional-event.mp4" />

## 📋 概要

通常、ドアを開けるべきかどうかを判断するには、`if (powerOn && (isAdmin || isLucky))` のようなコードが必要です。このデモでは、スクリプト内に `if/else` チェックを書く必要をなくし、エディタ上で直接、複雑にネストされた検証ルールを作成できる **ビジュアル条件ツリービルダー (Visual Condition Tree Builder)** を実演します。

:::tip 💡 学べること
- コードを書かずに複雑なロジックツリーを構築する方法
- 条件内でシーンオブジェクトを参照する方法
- 分岐ロジックに AND/OR グループを使用する方法
- 条件がイベントコールバックの「ゲートキーパー（門番）」として機能する仕組み

:::

---

## 🎬 デモシーン
```
Assets/TinyGiants/GameEventSystem/Demo/06_ConditionalEvent/06_ConditionalEvent.unity
```

### シーン構成

**UIレイヤー (Canvas):**
- 🎮 **電源切替ボタン** - 左上隅
  - 「Toggle Power (On)」 / 「Toggle Power (Off)」
  - `ConditionalEventRaiser.TogglePower()` をトリガー
  - グローバルな `SecurityGrid.IsPowerOn` 状態を制御
  
- 🎮 **4つのアクセスカードボタン** - 画面下部
  - 「Swipe GuestCard」➔ `ConditionalEventRaiser.SwipeGuestCard()` (Lv 1, Visitor部門)
  - 「Swipe StaffCard」➔ `ConditionalEventRaiser.SwipeStaffCard()` (Lv 3, Management部門)
  - 「Swipe AdminCard」➔ `ConditionalEventRaiser.SwipeAdminCard()` (Lv 5, Director部門)
  - 「Attempt Hacking」➔ `ConditionalEventRaiser.AttemptHacking()` (Lv 0, DarkWeb部門)

**ゲームロジックレイヤー (デモスクリプト):**
- 📤 **ConditionalEventRaiser** - 発行側スクリプト
  - 異なる認証情報を持つ `AccessCard` オブジェクトを構築
  - 検証のために `OnAccessCard` イベントを発行
  - 検証ロジック自体は保持せず、単にデータを渡すだけ
  
- 📥 **ConditionalEventReceiver** - 受信側スクリプト
  - 条件付きロジックを **一切持たない** `OpenVault()` メソッドを保持
  - 呼び出されたら単にドアのアニメーションを再生
  - 呼び出された＝すべての条件をクリアした、と見なす

- 🔌 **SecurityGrid** - システム状態を保持するシーンオブジェクト
  - パブリックプロパティ: `IsPowerOn` (bool)
  - 条件ツリーはこの値をシーンインスタンスから直接読み取る

**ビジュアルフィードバックレイヤー (デモオブジェクト):**
- 🚪 **VaultDoorSystem** - 巨大な両開きドア
  - 左右のドアがスライドして開閉
  - ステータステキスト表示：「LOCKED」 / 「ACCESS GRANTED」 / 「CLOSING...」
  - ドア開放時に蒸気のVFXが発生
- 💡 **電源インジケーター** - 緑色の球体ライト
  - 電源ON時に点灯、OFF時に消灯
- 🖼️ **スクリーンビネット** - フルスクリーンオーバーレイ
  - 電源ON時に緑色、OFF時に赤色にフラッシュ

---

## 🎮 操作方法

### ロジックゲートの挑戦

金庫は以下の条件が `true` と評価された場合に **のみ** 開きます：
```
[⚡ 電源 ON]  AND  ([🏅 管理者] レベル  OR  [🏷️ 有効な部門]  OR  [🎲 ラッキーなハッカー])
```

### ステップ 1: プレイモードに入る

Unityの **Play** ボタンを押します。金庫には赤文字で「LOCKED」と表示されているはずです。

---

### ステップ 2: 電源 ON の状態でテスト（正常系）

**電源が ON であることを確認:**
- 左上のボタンを確認：「Toggle Power (On)」と表示されていること
- 電源インジケーター（緑の球体）が点灯していること
- 切り替え時に画面が緑色にフラッシュすること

**「Swipe StaffCard」をクリック:**
- **認証情報:** レベル 3, 部門「Management」
- **ロジックパス:**
  - ✅ 電源 ON ➔ パス
  - ❌ レベル 3 < 4 ➔ 失敗（Adminチェック）
  - ✅ 部門「Management」はホワイトリスト内 ➔ パス
  - **結果:** OR グループ内の1つのブランチがパス
- **結末:** 🟢 **ACCESS GRANTED**
  - ステータスが緑色に変化
  - ドアの足元から蒸気が噴出
  - ドアがスムーズに開く
  - 2秒後にドアが閉まる
- **コンソール:** `[Vault] ACCESS GRANTED to Staff_Alice. Opening doors.`

**「Swipe AdminCard」をクリック:**
- **認証情報:** レベル 5, 部門「Director」
- **ロジックパス:**
  - ✅ 電源 ON ➔ パス
  - ✅ レベル 5 >= 4 ➔ パス（即座にAdminチェック成功）
  - **結果:** OR グループ内の最初の条件でパス
- **結末:** 🟢 **ACCESS GRANTED**

**「Swipe GuestCard」をクリック:**
- **認証情報:** レベル 1, 部門「Visitor」
- **ロジックパス:**
  - ✅ 電源 ON ➔ パス
  - ❌ レベル 1 < 4 ➔ 失敗（Adminチェック）
  - ❌ 部門「Visitor」はホワイトリスト外 ➔ 失敗
  - 🎲 ネストされた AND グループ内の Random(0-100) > 70 ➔ 約30%の確率
  - **結果:** ほとんどの場合、すべてのブランチが失敗
- **結末:** 🔴 **LOCKED** (90%の確率で失敗)
  - 金庫は閉まったまま
  - ステータステキストは赤のまま
- **コンソール:** (条件失敗のため受信側のログは出ない)

---

### ステップ 3: 電源 OFF の状態でテスト（失敗系）

**「Toggle Power」をクリック（OFFにする）:**
- ボタンが「Toggle Power (Off)」に変化
- 電源インジケーターが消灯
- 画面が赤色にフラッシュ

**「Swipe AdminCard」をクリック:**
- **認証情報:** レベル 5 (管理者レベル)
- **ロジックパス:**
  - ❌ 電源 OFF ➔ **ルートの AND 条件で失敗**
  - 即座に評価が停止（短絡評価/ショートサーキット）
- **結末:** 🔴 **LOCKED**
  - 管理者であっても電源の要件をバイパスすることはできない
  - 受信側のメソッドは一切呼び出されない
- **コンソール:** `[Terminal] Scanning...` (金庫側のログはなし)

:::note 🔐 セキュリティ設計

ルートにある AND ロジックにより、**いかなる認証情報**であっても電源の要件を回避できないようになっています。これは、条件ツリーがいかにして絶対的な要件を強制できるかを示しています。

:::

---

## 🏗️ シーンのアーキテクチャ

### 条件ツリーの構造

金庫のアクセスロジックは、Behavior Window 内で視覚的なツリーとして実装されています：
```
🟦 ROOT (AND) ➔ 以下の2つの主要なブランチを両方パスする必要がある
│
├─ ⚡ SecurityGrid.IsPowerOn == true      ➔ [電源状態チェック]
│
└─ 🟧 Branch 2 (OR) ➔ 以下のうち少なくとも1つをパスする必要がある
   │
   ├─ 🏅 Arg.securityLevel >= 4          ➔ [高い権限]
   ├─ 🏷️ Arg.department ∈ [Mgmt, IT]     ➔ [部門の検証]
   ├─ 🎲 Random(0-100) > 90              ➔ [10%の確率でハック成功]
   │
   └─ 🟦 ネストされたグループ (AND) ➔ 低レベルカード向けの複合チェック
      ├─ 🔢 Arg.securityLevel >= 1       ➔ [有効なカードを所持]
      └─ 🎲 Random(0-100) > 70           ➔ [30%の運試しパス]
```

---

### イベント定義 (Event Definition)

![Game Event Editor](/img/game-event-system/examples/06-conditional-event/demo-06-editor.png)

| イベント名      | 型                      | 用途                                              |
| -------------- | ----------------------- | ------------------------------------------------- |
| `OnAccessCard` | `AccessCardGameEvent` | 条件ツリーを通じてカードの認証情報を検証する           |

**AccessCard データ構造:**
```csharp
[System.Serializable]
public class AccessCard
{
    public string holderName;        // "Staff_Alice", "Admin_Root" 等
    public int securityLevel;        // 1=ゲスト, 3=スタッフ, 5=管理者
    public string department;        // "Management", "IT", "Visitor" 等
}
```

---

### 条件ツリーを使用したビヘイビア設定

Behavior カラムの **(AccessCard)** アイコンをクリックして、Behavior Window を開きます：

![Condition Tree](/img/game-event-system/examples/06-conditional-event/demo-06-condition-tree.png)

**ルートの AND グループ:**
- **条件 1:** シーンオブジェクト参照
  - ソース: シーン内の `SecurityGrid` GameObject
  - プロパティ: `IsPowerOn` (bool)
  - 演算子: `==` (Equals)
  - ターゲット: `true`
  - **目的:** 絶対条件 ➔ 電源が ON でなければならない

**ネストされた OR グループ:**
OR グループは、アクセスするための複数の有効なパスを提供します：

- **条件 A:** イベント引数のチェック
  - ソース: `Arg.securityLevel` (AccessCard の int)
  - 演算子: `>=` (Greater Or Equal)
  - ターゲット: `4`
  - **目的:** 管理者レベルの認証情報

- **条件 B:** リスト包含チェック
  - ソース: `Arg.department` (AccessCard の string)
  - 演算子: `In List` (Contained In)
  - ターゲット: 固定リスト `["Management", "IT"]`
  - **目的:** ホワイトリストに登録された部門

- **条件 C:** ランダム確率
  - ソース: `Random Value` (0-100 の範囲)
  - 演算子: `>` (Greater)
  - ターゲット: `90`
  - **目的:** ハッカー向けの10%のラッキーバイパス

- **ネストされた AND グループ:** ゲスト用アクセスロジック
  - サブ条件 1: `Arg.securityLevel >= 1` (有効なカード)
  - サブ条件 2: `Random(0-100) > 70` (30%の確率)
  - **目的:** ゲストは確率が低いが、有効なカードが必要

:::tip 🎨 ドラッグ＆ドロップで構築

Behavior Window でこのツリーを視覚的に構築できます：

1. **"+ Condition"** をクリックして個別のチェックを追加
2. **"+ Group"** をクリックして AND/OR コンテナを追加
3. `≡` ハンドルをドラッグして条件の順序を変更
4. グループラベルをクリックして AND/OR ロジックを切り替え

:::

---

### 発行側の設定 (ConditionalEventRaiser)

**ConditionalEventRaiser** GameObject を選択します：

![ConditionalEventRaiser Inspector](/img/game-event-system/examples/06-conditional-event/demo-06-inspector.png)

**イベントチャンネル:**
- `Request Access Event`: `OnAccessCard`

**シーン参照:**
- `Security Grid`: SecurityGrid GameObject (電源切替機能用)
- `Screen Vignette`: 電源フィードバック用の UI オーバーレイ

**各カードの動作:**
```csharp
// ゲストカード (運に依存)
SwipeGuestCard() ➔ AccessCard("Guest_Bob", 1, "Visitor")

// スタッフカード (有効な部門)
SwipeStaffCard() ➔ AccessCard("Staff_Alice", 3, "Management")

// 管理者カード (高レベル)
SwipeAdminCard() ➔ AccessCard("Admin_Root", 5, "Director")

// ハッカー (純粋なランダム性)
AttemptHacking() ➔ AccessCard("Unknown_Hacker", 0, "DarkWeb")
```

---

### 受信側の設定 (ConditionalEventReceiver)

**ConditionalEventReceiver** GameObject を選択します：

![ConditionalEventReceiver Inspector](/img/game-event-system/examples/06-conditional-event/demo-06-receiver.png)

**金庫のビジュアル:**
- `Door ROOT`: 金庫ドアシステムの親 Transform
- `Left Door`: 左ドア (開くときに左へスライド)
- `Right Door`: 右ドア (開くときに右へスライド)
- `Steam VFX Prefab`: ドア開放時の蒸気エフェクト

**フィードバック:**
- `Status Text`: アクセス状態を表示する TextMeshPro

**Behavior バインディング:**
- イベント: `OnAccessCard`
- メソッド: `ConditionalEventReceiver.OpenVault(AccessCard card)`
- **条件ツリー:** ゲートキーパーとして機能（上記で設定したもの）

:::note 🎯 ロジック・ゼロの受信側

`OpenVault()` メソッドには **一切の** 条件チェックが含まれていません。このメソッドは条件ツリーが `true` と評価された場合に **のみ** 呼び出されます。これにより、検証ロジック（データレイヤー）とアクションロジック（振る舞いレイヤー）が完全に分離されます。

:::

---

## 💻 コード解説

### 📤 ConditionalEventRaiser.cs (発行側)
```csharp
using UnityEngine;
using TinyGiants.GameEventSystem.Runtime;

public class ConditionalEventRaiser : MonoBehaviour
{
    [Header("Event Channel")]
    [GameEventDropdown] public AccessCardGameEvent requestAccessEvent;

    [Header("Scene Reference")]
    [SerializeField] private SecurityGrid securityGrid;

    public void SwipeGuestCard()
    {
        // レベル 1, 部門 "Visitor"
        // レベルチェック失敗、部門チェック失敗
        // ネストされた AND グループの Random > 70 に依存（約30%）
        SendRequest("Guest_Bob", 1, "Visitor");
    }

    public void SwipeStaffCard()
    {
        // レベル 3, 部門 "Management"
        // レベルチェック失敗 (3 < 4)
        // 部門チェック成功 (Management はホワイトリスト内)
        SendRequest("Staff_Alice", 3, "Management");
    }

    public void SwipeAdminCard()
    {
        // レベル 5
        // 即座にレベルチェック成功 (5 >= 4)
        SendRequest("Admin_Root", 5, "Director");
    }

    public void AttemptHacking()
    {
        // レベル 0
        // Random > 90 のみに依存 (10%の確率)
        SendRequest("Unknown_Hacker", 0, "DarkWeb");
    }

    private void SendRequest(string name, int level, string dept)
    {
        if (requestAccessEvent == null) return;

        // データパケットの構築
        AccessCard card = new AccessCard(name, level, dept);
        
        // イベントの発行
        // 受信側が呼ばれる前に条件ツリーが評価されます
        requestAccessEvent.Raise(card);
        
        Debug.Log($"[Terminal] 走査中... 名前: {name} | Lv: {level} | 部門: {dept}");
    }
}
```

**ポイント:**
- 🎯 **検証コードなし** - 発行側は単にデータを作成してイベントを投げるだけ。
- 📦 **データの構築** - 各ボタンが独自の認証プロフィールを作成します。
- 🔇 **ロジック・ゼロ** - どのような条件を満たす必要があるかをスクリプト側は知りません。

---

### 📥 ConditionalEventReceiver.cs (受信側)
```csharp
using UnityEngine;
using TMPro;
using System.Collections;

public class ConditionalEventReceiver : MonoBehaviour
{
    [Header("Vault Visuals")]
    [SerializeField] private Transform doorROOT;
    [SerializeField] private Transform leftDoor;
    [SerializeField] private Transform rightDoor;
    [SerializeField] private ParticleSystem steamVFXPrefab;

    [Header("Feedback")]
    [SerializeField] private TextMeshPro statusText;

    private Vector3 _leftClosedPos;
    private Vector3 _rightClosedPos;

    private void Start()
    {
        // アニメーション用に閉じた位置を保存
        if(leftDoor) _leftClosedPos = leftDoor.localPosition;
        if(rightDoor) _rightClosedPos = rightDoor.localPosition;
        
        UpdateStatusText("LOCKED", Color.red);
    }

    /// <summary>
    /// [イベントコールバック - 条件により保護]
    /// 
    /// 重要：このメソッドには検証ロジックが一切含まれていません！
    /// 
    /// GameEvent の条件ツリーがゲートキーパーとして機能します。
    /// このメソッドが実行されたということは、すべての条件が TRUE と判定されたことを意味します：
    /// - 電源が ON である
    /// - かつ、管理者レベル、有効な部門、またはラッキーなランダム値のいずれか
    /// 
    /// この分離により、デザイナーはコードを触ることなくエディタ上で
    /// アクセスルールを自由に変更できます。
    /// </summary>
    public void OpenVault(AccessCard card)
    {
        if (_isOpen) return;

        Debug.Log($"<color=green>[Vault] {card.holderName} にアクセスが許可されました。" +
                  "ドアを開けます。</color>");
        
        StartCoroutine(OpenSequenceRoutine(card.holderName));
    }

    private IEnumerator OpenSequenceRoutine(string name)
    {
        _isOpen = true;
        UpdateStatusText("ACCESS GRANTED", Color.green);

        // 蒸気VFXの生成
        if (doorROOT != null && steamVFXPrefab != null)
        {
            Vector3 spawnPos = doorROOT.position;
            spawnPos.y -= 2.6f;
            
            var vfxInstance = Instantiate(steamVFXPrefab, spawnPos, Quaternion.identity);
            vfxInstance.Play();
            Destroy(vfxInstance.gameObject, 2.0f);
        }
        
        // ドアを開く (外側へスライド)
        float t = 0;
        while(t < 1f)
        {
            t += Time.deltaTime * 2f;
            if(leftDoor) 
                leftDoor.localPosition = Vector3.Lerp(_leftClosedPos, 
                                                      _leftClosedPos + Vector3.left * 1.2f, t);
            if(rightDoor) 
                rightDoor.localPosition = Vector3.Lerp(_rightClosedPos, 
                                                       _rightClosedPos + Vector3.right * 1.2f, t);
            yield return null;
        }
        
        yield return new WaitForSeconds(2.0f);
        UpdateStatusText("CLOSING...", Color.yellow);
        
        // ドアを閉じる (元の位置へスライド)
        t = 0;
        while(t < 1f)
        {
            t += Time.deltaTime * 2f;
            if(leftDoor) 
                leftDoor.localPosition = Vector3.Lerp(_leftClosedPos + Vector3.left * 1.2f, 
                                                      _leftClosedPos, t);
            if(rightDoor) 
                rightDoor.localPosition = Vector3.Lerp(_rightClosedPos + Vector3.right * 1.2f, 
                                                       _rightClosedPos, t);
            yield return null;
        }

        _isOpen = false;
        UpdateStatusText("LOCKED", Color.red);
    }

    private void UpdateStatusText(string text, Color col)
    {
        if (statusText)
        {
            statusText.text = text;
            statusText.color = col;
        }
    }
}
```

**ポイント:**
- 🎯 **条件ロジック・ゼロ** - 認証情報をチェックする `if` 文は存在しません。
- 🔓 **信頼に基づく実行** - 呼び出された時点で、条件はパス済みであることが保証されます。
- 🎨 **純粋な演出** - ドアのアニメーションとVFXのみに専念します。
- 🏗️ **関心の分離** - 検証（データ）とアクション（振る舞い）の分離。

---

### 🔌 SecurityGrid.cs (シーン状態)
```csharp
using UnityEngine;

public class SecurityGrid : MonoBehaviour
{
    // このパブリックプロパティは条件ツリーから読み取られます
    public bool IsPowerOn = true;

    public void TogglePower()
    {
        IsPowerOn = !IsPowerOn;
        
        // ビジュアルの更新など...
        Debug.Log($"[Environment] 電源システムは現在: {(IsPowerOn ? "ONLINE" : "OFFLINE")} です。");
    }
}
```

**ポイント:**
- 🔌 **パブリックな状態** - `IsPowerOn` は条件ツリーからアクセス可能です。
- 📍 **シーンオブジェクト** - 条件はこの特定の GameObject インスタンスを参照します。
- 🎮 **ランタイムでの変更** - 電源の切り替えは、即座に条件の評価結果に反映されます。

---

## 🔑 重要なまとめ

| コンセプト              | 実装内容                                               |
| ------------------------ | ------------------------------------------------------ |
| 🎯 **ビジュアルロジック** | コードを書かずに複雑な条件を構築可能                    |
| 🌳 **ツリー構造**         | AND/OR グループにより、高度な分岐ロジックが可能         |
| 📍 **シーン参照**         | シーン内の GameObject のプロパティを直接読み取れる       |
| 🎲 **ランダム条件**       | 確率ベースのロジック用ソースを標準搭載                  |
| 🔀 **引数へのアクセス**    | 条件内でイベントデータのプロパティを参照可能            |
| 🚪 **ゲートキーパー**      | 条件がコールバックを実行するかどうかを厳密に制御する     |

:::note 🎓 設計の洞察

ビジュアル条件ツリーは以下のようなシステムに最適です：

- **アクセス制御システム** - ドア、ターミナル、制限区域
- **クエスト要件** - クエスト完了前に複数の条件をチェック
- **バフの有効化** - 前提条件が満たされている場合のみ効果を適用
- **AI の挙動** - 敵の反応を決定するディシジョンツリー
- **アイテムドロップ** - ドロップ条件（レベル、運、場所など）の検証

ロジックをデータ（条件ツリーアセット）に移行することで、**デザイナー**がプログラマーの介入なしにゲームプレイのルールを調整できるようになります！

:::

---

## 🎯 次のステップは？

条件付きロジックをマスターしました。次は、遅延や予約実行による **時間ベースのイベント制御** について見ていきましょう。

**次の章**: 遅延実行について学ぶ **[07 遅延イベント](./07-delayed-event.md)**

---

## 📚 関連ドキュメント

- **[ビジュアル条件ツリー](../visual-workflow/visual-condition-tree.md)** - 条件ビルダーの完全ガイド
- **[ゲームイベントビヘイビア](../visual-workflow/game-event-behavior.md)** - アクション条件の設定方法
- **[ベストプラクティス](../scripting/best-practices.md)** - データ駆動型設計のパターン