---
sidebar_label: '実行順序とベストプラクティス'

sidebar_position: 4
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

# 実行順序とベストプラクティス

GameEventがどのようにコールバックを実行し、イベントフローを管理するかを理解することは、信頼性が高くパフォーマンスの良いイベント駆動型システムを構築するために不可欠です。このガイドでは、実行順序、一般的なパターン、注意点、および最適化戦略について説明します。

------

## 🎯 実行順序

### ビジュアルタイムライン

`myEvent.Raise()` が呼び出されると、実行は以下の厳密な順序に従います：

```text
myEvent.Raise() 🚀
      │
      ├── 1️⃣ 基本リスナー (FIFO順: 先入れ先出し)
      │      │
      │      ├─► OnUpdate() 📝
      │      │      ✓ 実行済み
      │      │
      │      └─► OnRender() 🎨
      │             ✓ 実行済み
      │
      ├── 2️⃣ 優先度付きリスナー (高 → 低)
      │      │
      │      ├─► [Priority 100] Critical() ⚡
      │      │      ✓ 最初に実行
      │      │
      │      ├─► [Priority 50] Normal() 📊
      │      │      ✓ 二番目に実行
      │      │
      │      └─► [Priority 0] LowPriority() 📌
      │             ✓ 最後に実行
      │
      ├── 3️⃣ 条件付きリスナー (優先度 + 条件)
      │      │
      │      └─► [Priority 10] IfHealthLow() 💊
      │             │
      │             ├─► 条件チェック: health < 20?
      │             │      ├─► ✅ True → リスナーを実行
      │             │      └─► ❌ False → リスナーをスキップ
      │             │
      │             └─► (次の条件付きリスナーをチェック...)
      │
      ├── 4️⃣ 常駐リスナー (シーンを跨ぐ)
      │      │
      │      └─► GlobalLogger() 📋
      │             ✓ 常に実行 (DontDestroyOnLoad)
      │
      ├── 5️⃣ トリガーイベント (並列 - ファンアウト) 🌟
      │      │
      │      ├─────► lightOnEvent.Raise() 💡
      │      │          (独立して実行)
      │      │
      │      ├─────► soundEvent.Raise() 🔊
      │      │          (独立して実行)
      │      │
      │      └─────► particleEvent.Raise() ✨
      │                 (独立して実行)
      │
      │      ⚠️ 1つが失敗しても、他は実行されます
      │
      └── 6️⃣ チェーンイベント (直列 - 厳格な順序) 🔗
             │
             └─► fadeOutEvent.Raise() 🌑
                    ✓ 成功
                    │
                    ├─► ⏱️ 待機 (期間/遅延)
                    │
                    └─► loadSceneEvent.Raise() 🗺️
                           ✓ 成功
                           │
                           ├─► ⏱️ 待機 (期間/遅延)
                           │
                           └─► fadeInEvent.Raise() 🌕
                                  ✓ 成功
                                  
                                  🛑 いずれかのステップが失敗 → チェーン停止
```

------

### 実行特性

| ステージ | パターン | タイミング | 失敗時の挙動 | ユースケース |
| ------------------------- | --------------------- | ----------------------- | ----------------------- | --------------------------- |
| **基本リスナー** | 直列 | 同フレーム、同期 | 次へ進む | 標準的なコールバック |
| **優先度付きリスナー** | 直列 (ソート済み) | 同フレーム、同期 | 次へ進む | 順序指定が必要な処理 |
| **条件付きリスナー** | 直列 (フィルタ済み) | 同フレーム、同期 | Falseならスキップし次へ | 状態依存のロジック |
| **常駐リスナー** | 直列 | 同フレーム、同期 | 次へ進む | シーンを跨ぐシステム |
| **トリガーイベント** | **並列** | 同フレーム、独立 | 他には影響しない | 副作用、通知 |
| **チェーンイベント** | **直列** | 複数フレーム、ブロッキング | **チェーン停止** | カットシーン、シーケンス |

------

### 主な違いの解説

<Tabs> <TabItem value="listeners" label="リスナー (1-4)" default>

**特性:**

- 現在のフレームで **同期的に** 実行される
- 定義された順序で次々と実行される
- 各リスナーは独立している
- 1つのリスナーで失敗（例外）が発生しても、他は停止しない

**例:**

```csharp
healthEvent.AddListener(UpdateUI);           // 1番目に実行
healthEvent.AddPriorityListener(SaveGame, 100); // 2番目に実行 (高優先度)
healthEvent.AddConditionalListener(ShowWarning, 
    health => health < 20);                  // 3番目に実行 (条件がTrueの場合)

healthEvent.Raise(15f);
// 順序: SaveGame() → UpdateUI() → ShowWarning() (health < 20 の場合)
```

**タイムライン:**

```
🖼️ Frame 1024
🚀 healthEvent.Raise(15.0f)
│
├─► 💾 SaveGame()          ⏱️ 0.1ms
├─► 🖥️ UpdateUI()          ⏱️ 0.3ms
└─► ⚠️ ShowWarning()       ⏱️ 0.2ms
│
📊 合計コスト: 0.6ms | ⚡ ステータス: 同期 (同フレーム)
```

</TabItem> <TabItem value="triggers" label="トリガー (5)">

**特性:**

- **並列**（ファンアウトパターン）で実行される
- すべてのトリガーが独立して発行される
- 1つのトリガーが失敗しても他に影響しない
- 内部的には同期実行だが、論理的には並列

**例:**

```csharp
// ボス撃破時、複数の独立したイベントをトリガーする
bossDefeatedEvent.AddTriggerEvent(stopBossMusicEvent, priority: 100);
bossDefeatedEvent.AddTriggerEvent(playVictoryMusicEvent, priority: 90);
bossDefeatedEvent.AddTriggerEvent(spawnLootEvent, priority: 50);
bossDefeatedEvent.AddTriggerEvent(showVictoryUIEvent, priority: 40);
bossDefeatedEvent.AddTriggerEvent(saveCheckpointEvent, priority: 10);

bossDefeatedEvent.Raise();
// 優先度順に5つのイベントがすべて発行されるが、それぞれは独立している
// もし spawnLootEvent が失敗しても、他は実行される
```

**タイムライン:**

```
🖼️ Frame 2048
🚀 bossDefeatedEvent.Raise()
│
├─► 🚀 stopBossMusicEvent.Raise()     ✅ 成功
├─► 🚀 playVictoryMusicEvent.Raise()  ✅ 成功
├─► 🚀 spawnLootEvent.Raise()         ❌ 失敗! (例外は分離)
├─► 🚀 showVictoryUIEvent.Raise()     ✅ 実行済み (耐障害性)
└─► 🚀 saveCheckpointEvent.Raise()    ✅ 実行済み (耐障害性)
│
📊 結果: 4/5 成功 | 🛡️ ステータス: 耐障害性 (失敗の分離)
```

</TabItem> <TabItem value="chains" label="チェーン (6)">

**特性:**

- ブロッキングを伴う **直列** 実行
- 厳格な順序: A → B → C
- ステップ間の遅延をサポート
- いずれかのステップが失敗すると、**チェーン全体が停止** する

**例:**

```csharp
// カットシーンのシーケンス
cutsceneStartEvent.AddChainEvent(fadeOutEvent, delay: 0f, duration: 1f);
cutsceneStartEvent.AddChainEvent(hideUIEvent, delay: 0f, duration: 0.5f);
cutsceneStartEvent.AddChainEvent(playCutsceneEvent, delay: 0f, duration: 5f);
cutsceneStartEvent.AddChainEvent(fadeInEvent, delay: 0f, duration: 1f);
cutsceneStartEvent.AddChainEvent(showUIEvent, delay: 0f, duration: 0f);

// チェーンを実行
cutsceneStartEvent.Raise();
```

**タイムライン:**

```
🖼️ T+0.0s | Frame 0
🚀 cutsceneStartEvent.Raise()
└─► 🎬 fadeOutEvent.Raise()             ✅ 開始

        ┆  (Δ 1.0s 待機)
        ▼
🖼️ T+1.0s | Frame 60
└─► 🖥️ hideUIEvent.Raise()              ✅ 実行済み

        ┆  (Δ 0.5s 待機)
        ▼
🖼️ T+1.5s | Frame 90
└─► 🎞️ playCutsceneEvent.Raise()         ✅ 実行済み

        ┆  (Δ 5.0s 待機)
        ▼
🖼️ T+6.5s | Frame 390
└─► 🎬 fadeInEvent.Raise()              ✅ 実行済み

        ┆  (Δ 1.0s 待機)
        ▼
🖼️ T+7.5s | Frame 450
└─► 🖥️ showUIEvent.Raise()              ✅ 完了

📊 合計タイムライン: ~7.5s | 🎞️ 合計期間: 450フレーム
```

**失敗シナリオ:**

```csharp
🖼️ T+0.0s | Frame 0
🚀 cutsceneStartEvent.Raise()           ✅ 開始

        ┆  (Δ 1.0s)
        ▼
🖼️ T+1.0s | Frame 60
🚀 fadeOutEvent.Raise()                 ✅ 実行済み

        ┆  (Δ 0.5s)
        ▼
🖼️ T+1.5s | Frame 90
🚀 hideUIEvent.Raise()                  ✅ 実行済み

        ┆  (Δ 5.0s)
        ▼
🖼️ T+6.5s | Frame 390
🚀 playCutsceneEvent.Raise()            ❌ 致命的な失敗!
                                        
        🛑 [ サーキットブレーカー作動 ]
        ⚠️ 状態の同期ズレを防ぐため、論理チェーンが停止しました。

        ⏩ fadeInEvent.Raise()          🚫 実行されません
        ⏩ showUIEvent.Raise()          🚫 実行されません
```

</TabItem> </Tabs>

------

## 💡 ベストプラクティス

### 1. リスナーの管理

#### 必ず購読を解除する

メモリリークは、イベントシステムにおける最大の問題です。必ずリスナーをクリーンアップしてください。

<Tabs> <TabItem value="bad" label="❌ 悪い例">

```csharp
public class PlayerController : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onPlayerDeath;
    
    void Start()
    {
        onPlayerDeath.AddListener(HandleDeath);
    }
    
    // オブジェクトが破棄されても、リスナーがメモリに残る！
    // これはメモリリークや、潜在的なクラッシュの原因になります
}
```

</TabItem> <TabItem value="good" label="✅ 良い例">

```csharp
public class PlayerController : MonoBehaviour
{
    [GameEventDropdown] public GameEvent onPlayerDeath;
    
    void OnEnable()
    {
        onPlayerDeath.AddListener(HandleDeath);
    }
    
    void OnDisable()
    {
        // メモリリークを防ぐため、必ず購読を解除する
        onPlayerDeath.RemoveListener(HandleDeath);
    }
    
    void HandleDeath()
    {
        Debug.Log("Player died!");
    }
}
```

</TabItem> </Tabs>

------

#### OnEnable/OnDisable パターンの使用

Unityでは、OnEnable/OnDisable パターンが推奨されるアプローチです。

```csharp
public class HealthUI : MonoBehaviour
{
    [GameEventDropdown] public GameEvent<float> healthChangedEvent;
    
    void OnEnable()
    {
        // アクティブ時に購読
        healthChangedEvent.AddListener(OnHealthChanged);
    }
    
    void OnDisable()
    {
        // 非アクティブ時に購読解除
        healthChangedEvent.RemoveListener(OnHealthChanged);
    }
    
    void OnHealthChanged(float newHealth)
    {
        // UIを更新
    }
}
```

**メリット:**

- オブジェクトが無効化/破棄された際に自動的にクリーンアップされる
- リスナーが必要な時だけアクティブになる
- 重複した購読を防げる
- オブジェクトプーリングに対応しやすい

------

### 2. スケジュール（予約実行）の管理

#### キャンセルのためにハンドルを保存する

後でキャンセルする必要がある場合は、必ず `ScheduleHandle` を保存してください。

<Tabs> <TabItem value="bad" label="❌ 悪い例">

```csharp
public class PoisonEffect : MonoBehaviour
{
    void ApplyPoison()
    {
        // 後でこれをキャンセルできない！
        poisonEvent.RaiseRepeating(damagePerTick, 1f, repeatCount: 10);
    }
    
    void CurePoison()
    {
        // 毒を止める方法がない！
        // 10回すべてのティックが実行され続けてしまう
    }
}
```

</TabItem> <TabItem value="good" label="✅ 良い例">

```csharp
public class PoisonEffect : MonoBehaviour
{
    private ScheduleHandle _poisonHandle;
    
    void ApplyPoison()
    {
        // ハンドルを保存する
        _poisonHandle = poisonEvent.RaiseRepeating(
            damagePerTick, 
            1f, 
            repeatCount: 10
        );
    }
    
    void CurePoison()
    {
        // 毒のエフェクトをキャンセルできる
        if (poisonEvent.CancelRepeating(_poisonHandle))
        {
            Debug.Log("Poison cured!");
        }
    }
    
    void OnDisable()
    {
        // 無効化時にクリーンアップ
        poisonEvent.CancelRepeating(_poisonHandle);
    }
}
```

</TabItem> </Tabs>

------

#### 複数スケジュールのパターン

複数のスケジュールを管理する場合は、コレクションを使用します。

```csharp
public class BuffManager : MonoBehaviour
{
    [GameEventDropdown] public GameEvent<string> buffTickEvent;
    
    private Dictionary<string, ScheduleHandle> _activeBuffs = new();
    
    public void ApplyBuff(string buffName, float interval, int duration)
    {
        // 既存のバフがあればキャンセル
        if (_activeBuffs.TryGetValue(buffName, out var existingHandle))
        {
            buffTickEvent.CancelRepeating(existingHandle);
        }
        
        // 新しいバフを適用
        var handle = buffTickEvent.RaiseRepeating(
            buffName, 
            interval, 
            repeatCount: duration
        );
        
        _activeBuffs[buffName] = handle;
    }
    
    public void RemoveBuff(string buffName)
    {
        if (_activeBuffs.TryGetValue(buffName, out var handle))
        {
            buffTickEvent.CancelRepeating(handle);
            _activeBuffs.Remove(buffName);
        }
    }
    
    void OnDisable()
    {
        // すべてのバフをキャンセル
        foreach (var handle in _activeBuffs.Values)
        {
            buffTickEvent.CancelRepeating(handle);
        }
        _activeBuffs.Clear();
    }
}
```

------

### 3. トリガーとチェーンの管理

#### 安全な削除のためにハンドルを使用する

他システムのトリガーやチェーンを誤って削除しないよう、常にハンドルを使用してください。

<Tabs> <TabItem value="bad" label="❌ リスクあり">

```csharp
public class DoorSystem : MonoBehaviour
{
    void SetupDoor()
    {
        doorOpenEvent.AddTriggerEvent(lightOnEvent);
    }
    
    void Cleanup()
    {
        // 危険: lightOnEvent への「すべての」トリガーを削除してしまう
        // 他のシステムによって登録されたものまで削除される！
        doorOpenEvent.RemoveTriggerEvent(lightOnEvent);
    }
}
```

</TabItem> <TabItem value="good" label="✅ 安全">

```csharp
public class DoorSystem : MonoBehaviour
{
    private TriggerHandle _lightTriggerHandle;
    
    void SetupDoor()
    {
        // ハンドルを保存
        _lightTriggerHandle = doorOpenEvent.AddTriggerEvent(lightOnEvent);
    }
    
    void Cleanup()
    {
        // 自分自身の特定のトリガーのみを削除する
        doorOpenEvent.RemoveTriggerEvent(_lightTriggerHandle);
    }
}
```

</TabItem> </Tabs>

------

#### 複数のトリガー/チェーンの整理

複雑なシステムでは、構造化されたアプローチをとります。

```csharp
public class CutsceneManager : MonoBehaviour
{
    // クリーンアップ用にすべてのハンドルを保持
    private readonly List<ChainHandle> _cutsceneChains = new();
    private readonly List<TriggerHandle> _cutsceneTriggers = new();
    
    void SetupCutscene()
    {
        // カットシーンのシーケンスを構築
        var chain1 = startEvent.AddChainEvent(fadeOutEvent, duration: 1f);
        var chain2 = startEvent.AddChainEvent(playVideoEvent, duration: 5f);
        var chain3 = startEvent.AddChainEvent(fadeInEvent, duration: 1f);
        
        _cutsceneChains.Add(chain1);
        _cutsceneChains.Add(chain2);
        _cutsceneChains.Add(chain3);
        
        // エフェクト用の並列トリガーを追加
        var trigger1 = startEvent.AddTriggerEvent(stopGameplayMusicEvent);
        var trigger2 = startEvent.AddTriggerEvent(hideCrosshairEvent);
        
        _cutsceneTriggers.Add(trigger1);
        _cutsceneTriggers.Add(trigger2);
    }
    
    void SkipCutscene()
    {
        // すべてのチェーンをクリーンアップ
        foreach (var chain in _cutsceneChains)
        {
            startEvent.RemoveChainEvent(chain);
        }
        _cutsceneChains.Clear();
        
        // すべてのトリガーをクリーンアップ
        foreach (var trigger in _cutsceneTriggers)
        {
            startEvent.RemoveTriggerEvent(trigger);
        }
        _cutsceneTriggers.Clear();
    }
}
```

------

### 4. 優先度の使用方法

#### 優先度の値に関するガイドライン

プロジェクト全体で一貫した優先度スケールを使用してください。

```csharp
// 優先度の定数を定義
public static class EventPriority
{
    public const int CRITICAL = 1000;    // 絶対に最初に実行すべき
    public const int HIGH = 100;         // 重要なシステム
    public const int NORMAL = 0;         // デフォルト
    public const int LOW = -100;         // 後で実行してもよい
    public const int CLEANUP = -1000;    // 最終的なクリーンアップ
}

// 使用例
healthEvent.AddPriorityListener(SavePlayerData, EventPriority.CRITICAL);
healthEvent.AddPriorityListener(UpdateHealthBar, EventPriority.HIGH);
healthEvent.AddPriorityListener(PlayDamageSound, EventPriority.NORMAL);
healthEvent.AddPriorityListener(UpdateStatistics, EventPriority.LOW);
```

------

#### 優先度のアンチパターン

<Tabs> <TabItem value="bad" label="❌ 避けるべき">

```csharp
// ランダムまたは一貫性のない優先度を使用しない
healthEvent.AddPriorityListener(SystemA, 523);
healthEvent.AddPriorityListener(SystemB, 891);
healthEvent.AddPriorityListener(SystemC, 7);

// 順序が重要でない場合に優先度を使いすぎない
uiClickEvent.AddPriorityListener(PlaySound, 50);
uiClickEvent.AddPriorityListener(PlayParticle, 49);
// これらは優先度は不要です、基本リスナーを使用してください！
```

</TabItem> <TabItem value="good" label="✅ ベストプラクティス">

```csharp
// 順序が重要な時のみ優先度を使用する
saveGameEvent.AddPriorityListener(ValidateData, 100);   // 最初にバリデーションが必要
saveGameEvent.AddPriorityListener(SerializeData, 50);   // 次にシリアライズ
saveGameEvent.AddPriorityListener(WriteToFile, 0);      // 最後に書き込み

// 順序が重要でない場合は基本リスナーを使用する
buttonClickEvent.AddListener(PlaySound);
buttonClickEvent.AddListener(ShowFeedback);
buttonClickEvent.AddListener(LogAnalytics);
```

</TabItem> </Tabs>

------

### 5. 条件付きリスナー

#### 効果的な条件設計

条件はシンプルかつ高速に保ってください。

<Tabs> <TabItem value="bad" label="❌ 重い処理">

```csharp
// 条件の中で重い操作を行わない
enemySpawnEvent.AddConditionalListener(
    SpawnBoss,
    () => {
        // 悪い例: 条件の中で複雑な計算を行う
        var enemies = FindObjectsOfType<Enemy>();
        var totalHealth = enemies.Sum(e => e.Health);
        var averageLevel = enemies.Average(e => e.Level);
        return totalHealth < 100 && averageLevel > 5;
    }
);
```

</TabItem> <TabItem value="good" label="✅ 効率的">

```csharp
// 状態をキャッシュし、条件をシンプルなチェックにする
private bool _shouldSpawnBoss = false;

void UpdateGameState()
{
    // 状態のキャッシュは、毎フレームではなく時々更新する
    _shouldSpawnBoss = enemyManager.TotalHealth < 100 
                    && enemyManager.AverageLevel > 5;
}

void Setup()
{
    // シンプルで高速な条件チェック
    enemySpawnEvent.AddConditionalListener(
        SpawnBoss,
        () => _shouldSpawnBoss
    );
}
```

</TabItem> </Tabs>

------

## ⚠️ よくある落とし穴

### 1. メモリリーク

**問題:** オブジェクトが破棄される時に、リスナーの購読を解除していない。

**症状:**

- 時間経過とともにメモリ使用量が増加する
- 破棄されたオブジェクトに関するエラーが発生する
- null参照のオブジェクトに対してコールバックが実行される

**解決策:**

```csharp
// 常に OnEnable/OnDisable パターンを使用する
void OnEnable() => myEvent.AddListener(OnCallback);
void OnDisable() => myEvent.RemoveListener(OnCallback);
```

------

### 2. スケジュールハンドルの紛失

**問題:** ハンドルを保存せずにスケジュールを作成している。

**症状:**

- 繰り返しイベントをキャンセルできない
- オブジェクトが破棄された後もイベントが継続する
- 不要な実行によるリソースの無駄

**解決策:**

```csharp
private ScheduleHandle _handle;

void StartTimer()
{
    _handle = timerEvent.RaiseRepeating(1f);
}

void StopTimer()
{
    timerEvent.CancelRepeating(_handle);
}
```

------

### 3. 広範囲に及ぶ削除の影響

**問題:** ハンドルベースの削除ではなく、ターゲットベースの削除（RemoveTriggerEvent(event)など）を使用している。

**症状:**

- 他のシステムのトリガー/チェーンが予期せず削除される
- イベントが発行されなくなるという、デバッグが困難な問題
- システム間の不必要な結合と脆弱性

**解決策:**

```csharp
// ハンドルを保存し、ピンポイントで削除する
private TriggerHandle _myTrigger;

void Setup()
{
    _myTrigger = eventA.AddTriggerEvent(eventB);
}

void Cleanup()
{
    eventA.RemoveTriggerEvent(_myTrigger);  // 安全！
}
```

------

### 4. 再帰的なイベント発行

**問題:** イベントリスナーが同じイベントを発行し、無限ループを引き起こす。

**症状:**

- スタックオーバーフロー例外
- Unityのフリーズ
- 実行回数の指数関数的な増大

**例:**

```csharp
// ❌ 危険: 無限再帰！
void Setup()
{
    healthEvent.AddListener(OnHealthChanged);
}

void OnHealthChanged(float health)
{
    // これが再び OnHealthChanged をトリガーする！
    healthEvent.Raise(health - 1);  // ← 無限ループ
}
```

**解決策:**

```csharp
// ✅ フラグを使用して再帰を防ぐ
private bool _isProcessingHealthChange = false;

void OnHealthChanged(float health)
{
    if (_isProcessingHealthChange) return;  // 再帰を防止
    
    _isProcessingHealthChange = true;
    
    // ここなら安全に発行できる
    if (health <= 0)
    {
        deathEvent.Raise();
    }
    
    _isProcessingHealthChange = false;
}
```

------

## 🚀 パフォーマンスの最適化

### 1. リスナー数を最小限に抑える

コードは高度に最適化されていますが、各リスナーにはわずかなオーバーヘッドがあります。可能な限りまとめましょう。

<Tabs> <TabItem value="bad" label="❌ 非効率">

```csharp
// 関連する操作に対して複数のリスナーを設定
healthEvent.AddListener(UpdateHealthBar);
healthEvent.AddListener(UpdateHealthText);
healthEvent.AddListener(UpdateHealthIcon);
healthEvent.AddListener(UpdateHealthColor);
```

</TabItem> <TabItem value="good" label="✅ 最適化済み">

```csharp
// 単一のリスナーですべてのUI更新を処理
healthEvent.AddListener(UpdateHealthUI);

void UpdateHealthUI(float health)
{
    // すべてのUI更新を一括で行う
    healthBar.value = health / maxHealth;
    healthText.text = $"{health:F0}";
    healthIcon.sprite = GetHealthIcon(health);
    healthColor.color = GetHealthColor(health);
}
```

</TabItem> </Tabs>

------

### 2. リスナー内での重い処理を避ける

リスナーは軽量に保ってください。重い処理はコルーチンや非同期（async）に移動させます。

<Tabs> <TabItem value="bad" label="❌ ブロッキング">

```csharp
void OnDataLoaded(string data)
{
    // 悪い例: 後続のすべてのリスナーの実行をブロックする
    var parsed = JsonUtility.FromJson<LargeData>(data);
    ProcessComplexData(parsed);  // 50ms かかる
    SaveToDatabase(parsed);      // 100ms かかる
}
```

</TabItem> <TabItem value="good" label="✅ 非同期">

```csharp
void OnDataLoaded(string data)
{
    // 良い例: 非同期処理を開始し、ブロックしない
    StartCoroutine(ProcessDataAsync(data));
}

IEnumerator ProcessDataAsync(string data)
{
    // パース
    var parsed = JsonUtility.FromJson<LargeData>(data);
    yield return null;
    
    // 処理
    ProcessComplexData(parsed);
    yield return null;
    
    // 保存
    SaveToDatabase(parsed);
}
```

</TabItem> </Tabs>

------

### 3. デリゲートの割り当てをキャッシュする

毎フレーム、新しいデリゲートの割り当てが発生するのを避けます。

<Tabs> <TabItem value="bad" label="❌ メモリ割り当て">

```csharp
void OnEnable()
{
    // 毎回新しいデリゲートが割り当てられる
    updateEvent.AddListener(() => UpdateHealth());
}
```

</TabItem> <TabItem value="good" label="✅ キャッシュ済み">

```csharp
void OnEnable()
{
    // 同じメソッド参照を再利用するため、割り当てが発生しない
    updateEvent.AddListener(UpdateHealth);
}

void UpdateHealth()
{
    // 実装
}
```

</TabItem> </Tabs>

------

## 📊 概要チェックリスト

`GameEvent` を使用する際のチェックリストとして活用してください：

### リスナーの管理

- 必ず OnDisable で購読を解除しているか
- OnEnable/OnDisable パターンを使用しているか
- 可能な限りデリゲート参照をキャッシュしているか
- リスナーを軽量に保っているか

### スケジュール管理

- キャンセルが必要な時に ScheduleHandle を保存しているか
- OnDisable でスケジュールをキャンセルしているか
- 複数のスケジュールにはコレクションを使用しているか
- オブジェクト破棄時にクリーンアップしているか

### トリガー/チェーン管理

- 安全な削除のためにハンドルを使用しているか
- クリーンアップ用にハンドルをコレクションに保存しているか
- 並列にはトリガー、直列にはチェーンを正しく選択しているか
- チェーンの場合、ExecuteChainEvents() を呼び出すことを忘れていないか

### パフォーマンス

- 関連するリスナーを統合しているか
- 重い処理をコルーチン/非同期に逃がしているか
- 条件はシンプルで高速か
- 再帰的なイベント発行を避けているか

### 優先度と条件

- 一貫した優先度スケールを使用しているか
- 順序が重要な時のみ優先度を使用しているか
- 条件をシンプルに保ち、キャッシュしているか
- 優先度の依存関係をドキュメント化しているか