---
slug: raising-and-scheduling-api
title: '時間ベースイベント：なぜコルーチンは遅延と繰り返しに向かないのか'
authors: [tinygiants]
tags: [ges, unity, scripting, tutorial, advanced]
description: "コルーチンはシンプルな遅延を簡単にし、それ以外を苦痛にする。キャンセル、ライフサイクルコールバック、リピート管理——Unityの時間ベースイベントにはもっと良い方法がある。"
image: /img/home-page/game-event-system-preview.png
---

グレネードが着弾してから2秒後に爆発を遅延させたい。シンプルだ。コルーチンを書く。`IEnumerator DelayedExplosion()`、yield return `new WaitForSeconds(2f)`、爆発ロジックを呼ぶ。丁寧に書いて10行くらい。気分がいい。

次にデザイナーが「プレイヤーが爆弾を解除できるようにしたい」と言う。オーケー、`StopCoroutine()`を呼べるように`Coroutine`参照を保存する必要がある。でも待って——コルーチンが開始する前にプレイヤーが解除したら？nullチェックが必要。待機中にゲームオブジェクトが破壊されたら？もう一つnullチェック。コルーチンが完了したまさにそのフレームでプレイヤーが解除したら？レースコンディション。10行が25行になり、まだ「解除メッセージを表示 vs. 爆発を表示」の分岐すら処理していない。

これがUnityのすべての時間ベースイベントの物語だ。最初の実装はクリーン。2番目の要件でコード量が倍増。3番目で転職を考え始める。

<!-- truncate -->

## シンプルな遅延にかかるコルーチン税

「シンプルな遅延」がプロダクションのUnityコードで実際にどう見えるか、正直に向き合おう。チュートリアル版ではなく、出荷される版。

```csharp
public class BombController : MonoBehaviour
{
    [SerializeField] private float fuseTime = 2f;

    private Coroutine _explosionCoroutine;
    private bool _isArmed;
    private bool _isExploded;

    public void ArmBomb()
    {
        if (_isArmed) return;
        _isArmed = true;
        _explosionCoroutine = StartCoroutine(DelayedExplosion());
    }

    public void Defuse()
    {
        if (!_isArmed || _isExploded) return;

        if (_explosionCoroutine != null)
        {
            StopCoroutine(_explosionCoroutine);
            _explosionCoroutine = null;
        }

        _isArmed = false;
        ShowDefuseMessage(); // これを呼ぶべきだとどうやって知る？
    }

    private IEnumerator DelayedExplosion()
    {
        yield return new WaitForSeconds(fuseTime);
        _isExploded = true;
        _explosionCoroutine = null;
        DoExplosion();
        // 「完了時」のロジックは？
        // ただ... ここに置く？他に何かが知る必要がないことを祈る？
    }

    private void OnDestroy()
    {
        if (_explosionCoroutine != null)
            StopCoroutine(_explosionCoroutine);
    }
}
```

「2秒待ってから爆発、キャンセル付き」で約40行。そしてまだ面白い部分は始まってもいない。

## リピートを追加する：毒ダメージの問題

ゲームに毒エフェクトがある。毎秒10ダメージ、5ティック。もう1つのコルーチン。

```csharp
private Coroutine _poisonCoroutine;
private int _poisonTicksRemaining;

public void ApplyPoison(int damage, float interval, int ticks)
{
    if (_poisonCoroutine != null)
        StopCoroutine(_poisonCoroutine);

    _poisonCoroutine = StartCoroutine(PoisonRoutine(damage, interval, ticks));
}

private IEnumerator PoisonRoutine(int damage, float interval, int ticks)
{
    _poisonTicksRemaining = ticks;

    for (int i = 0; i < ticks; i++)
    {
        yield return new WaitForSeconds(interval);
        ApplyDamage(damage);
        _poisonTicksRemaining--;
        // 残りティック数をUIに通知するには？
        // コールバックを渡す？参照を保持する？イベントを発火する？
    }

    _poisonCoroutine = null;
    // 毒が自然に期限切れ。クリーンアップロジックで
    // 「毒が治療された」とどう区別する？
}

public void CurePoison()
{
    if (_poisonCoroutine != null)
    {
        StopCoroutine(_poisonCoroutine);
        _poisonCoroutine = null;
        _poisonTicksRemaining = 0;
        // 治療エフェクト再生？UIの更新はどうやって知る？
    }
}
```

パターンに気づいてほしい。すべての時間ベースビヘイビアに必要なもの：
- ハンドルを追跡する`Coroutine`フィールド
- nullチェック付きの`StopCoroutine()`呼び出し
- 手動状態追跡（`_poisonTicksRemaining`）
- 「自然に完了」と「キャンセルされた」を区別する組み込みの方法がない
- 進捗について他のシステムに通知する組み込みの方法がない

これは1つの毒エフェクトだけだ。複数の毒がスタックできたら？`List<Coroutine>`が必要。各毒のティックレートが違ったら？持続時間が違ったら？キャンセル条件が違ったら？

## ライフサイクルコールバックのギャップ

JavaScriptの開発者が当然と思っているもの：

```javascript
const timer = setTimeout(() => explode(), 2000);
clearTimeout(timer); // クリーンなキャンセル
```

そしてC#非同期の開発者が当然と思っているもの：

```csharp
var cts = new CancellationTokenSource();
await Task.Delay(2000, cts.Token);
cts.Cancel(); // 適切な例外処理付きのクリーンなキャンセル
```

どちらのパラダイムにも明確なライフサイクルセマンティクスがある。何かが開始した時、完了した時、キャンセルされた時がわかる。各状態遷移にコールバックをアタッチできる。

Unityのコルーチンにはこれがない。コルーチンはブラックボックスだ。実行中か実行中でないか。`OnCompleted`コールバックなし。`OnCancelled`コールバックなし。リピート操作の`OnStep`コールバックなし。毎回、手動状態追跡と相互参照されたブールフラグですべて自分で構築しなければならない。

結果、MonoBehaviourがこうなり始める：

```csharp
private Coroutine _explosionCoroutine;
private Coroutine _poisonCoroutine;
private Coroutine _shieldRegenCoroutine;
private Coroutine _buffTimerCoroutine;
private Coroutine _respawnCoroutine;
private bool _isExploding;
private bool _isPoisoned;
private bool _isRegenerating;
private bool _isBuffed;
private bool _isRespawning;
private int _poisonTicksLeft;
private float _buffTimeLeft;
```

10個の時間ベースビヘイビアは10個のコルーチンフィールド、10個のブールフラグ、そしておそらくほぼ同一に見える10個のメソッド：コルーチンを開始、参照を保存、停止前にnullチェック、フラグをリセット。コンポーネントの60%がタイマー管理のボイラープレート。

## 脆弱さの問題

コルーチンはそれを開始したMonoBehaviourに紐づいている。ゲームオブジェクトが破壊されたら——プーリング、シーン遷移、手動Destroy呼び出し——その上のすべてのコルーチンが黙って死ぬ。通知なし。クリーンアップコールバックなし。警告なし。

つまり：
- プールされたグレネードオブジェクトの爆発コルーチン？オブジェクトがプールに戻ると黙ってキャンセル。
- プレイヤーオブジェクトのバフタイマー？新しいシーンをロードすると消失。
- リピートするレーダーのピン？レーダー局のプレハブがリサイクルされた瞬間に死亡。

オブジェクトに`DontDestroyOnLoad`を使えるが、それ独自の問題がある。永続的なシングルトン上でコルーチンを開始できるが、自然なライフサイクルバインディングが失われる。すべてのソリューションに管理するためのコードが必要なトレードオフがある。

## スケジューリングがただのAPIだったら？

ここがGESの根本的に異なるアプローチだ。手動で管理するコルーチンでタイマーロジックをラップする代わりに、GESはスケジューリングをイベント自体のファーストクラスAPIとして扱う。

### Immediate：Raise()

最もシンプルなケース——今すぐイベントを発火、ディレイなし。

```csharp
[GameEventDropdown, SerializeField] private SingleGameEvent onBombExplode;

// 即座に発火
onBombExplode.Raise();
```

すべてのリスナーが同じフレーム内で同期的に発火。コルーチンは関わらない。

型付きイベントの場合：

```csharp
[GameEventDropdown, SerializeField] private Int32GameEvent onDamageDealt;

onDamageDealt.Raise(42);
```

senderイベントの場合：

```csharp
[GameEventDropdown, SerializeField] private Int32SenderGameEvent onDamageFromSource;

onDamageFromSource.Raise(this, 42);
```

### Delayed：RaiseDelayed()

ディレイ後にイベントの発火をスケジュール。1行。ハンドルが返される。

```csharp
ScheduleHandle handle = onBombExplode.RaiseDelayed(2f);
```

これだけ。2秒後に`onBombExplode`が発火。ハンドルはこのスケジュールされた実行に関するすべてを管理するチケット——キャンセル、ライフサイクルコールバック、ステータスチェック。

型付きイベントの場合、引数は呼び出し時にキャプチャされる：

```csharp
ScheduleHandle handle = onDamageDealt.RaiseDelayed(50, 1.5f);
```

値`50`は`RaiseDelayed()`呼び出し時にロックされる。ディレイが期限切れになる前に渡した変数が変更されても、元の値が使われる。サプライズなし。

![Delayed Event Behavior](/img/game-event-system/examples/07-delayed-event/demo-07-behavior.png)

### Repeating：RaiseRepeating()

一定間隔でイベントを発火。固定回数または無限。

```csharp
// 毒：毎秒10ダメージ、合計5ティック
ScheduleHandle handle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: 5);
```

`count`はリピートではなく合計実行回数。`count: 5`はイベントが5回発火することを意味する。

![Repeating Event Finite](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-finite.png)

無限リピートの場合——ハートビート、レーダーピン、アンビエントエフェクト：

```csharp
// レーダースキャン：2秒ごと、永遠に
ScheduleHandle handle = onRadarPing.RaiseRepeating(interval: 2f, count: -1);
```

`count: -1`を渡すとキャンセルするまで実行。

![Repeating Event Infinite](/img/game-event-system/examples/08-repeating-event/demo-08-behavior-infinite.png)

## ScheduleHandle：コルーチンがこうあるべきだったもの

`RaiseDelayed()`と`RaiseRepeating()`が返す`ScheduleHandle`に本当のパワーがある。コルーチンが手動で処理させる問題を正確に解決する3つのライフサイクルコールバックがある。

### OnStep：各ティック後

```csharp
ScheduleHandle handle = onPoisonTick.RaiseRepeating(10, interval: 1f, count: 5);

handle.OnStep((remainingCount) =>
{
    Debug.Log($"毒ティック！残り{remainingCount}ティック");
    UpdatePoisonStackUI(remainingCount);
});
```

`OnStep`は各個別実行後に発火する。`remainingCount`が残り回数を教えてくれる。無限ループの場合は常に`-1`。遅延イベント（単一実行）の場合は`remainingCount` `0`で1回発火。

手動カウンター追跡なし。`_poisonTicksRemaining`フィールドなし。ハンドルが知っている。

### OnCompleted：自然完了

```csharp
handle.OnCompleted(() =>
{
    Debug.Log("全毒ティック完了");
    RemovePoisonVisualEffect();
    ShowPoisonExpiredMessage();
});
```

計画されたすべての実行が完了した時に発火。有限スケジュールのみ——無限ループは自然に完了しない。`RaiseDelayed()`の場合、単一の遅延実行後に発火。

ディレイ後にビヘイビアをチェーンするクリーンな方法。ネストされたコルーチンなし。コールバックスパゲッティなし。

### OnCancelled：手動キャンセル

```csharp
handle.OnCancelled(() =>
{
    Debug.Log("毒が早期に治療された！");
    PlayCureParticleEffect();
    ShowPoisonCuredMessage();
});
```

スケジュールを手動でキャンセルした時に発火。自然完了では発火しない。2つのコールバックは相互排他的。

この区別はコルーチンでは不可能だったもの。毒が自然に切れたら「期限切れ」メッセージを表示。治療されたら治療アニメーションを再生。コルーチンでは、どちらのケースかを追跡するブールフラグが必要だった。ハンドルなら、APIが教えてくれる。

### チェーニング：フルエントパターン

3つのコールバックすべてがハンドルを返すので、チェーンできる：

```csharp
ScheduleHandle handle = onCountdown.RaiseRepeating(interval: 1f, count: 10)
    .OnStep((remaining) => UpdateCountdownUI(remaining))
    .OnCompleted(() => TriggerLaunch())
    .OnCancelled(() => AbortLaunch());
```

ループ、カウンター、「キャンセルされた vs. 完了した」のブールフラグ、各クリーンアップパスの別メソッドを持つコルーチンと比較してほしい。これは根本的に異なるレベルの表現力だ。

## キャンセル：3つの方法、すべてクリーン

### 直接ハンドルキャンセル

```csharp
handle.Cancel();
```

アクティブなハンドルに対して動作。

### イベント経由：CancelDelayed()

```csharp
onBombExplode.CancelDelayed(handle);
```

`handle.Cancel()`と機能的に同等だが、複数のハンドルを管理する時により明確に読める——どのイベントに対して操作しているかを強調している。

### イベント経由：CancelRepeating()

```csharp
onRadarPing.CancelRepeating(handle);
```

リピートスケジュールへの同じパターン。

### 安全なキャンセル

ハンドルがすでに完了した可能性がある場合は、キャンセル前に必ず`IsActive`をチェック：

```csharp
private void StopAllSchedules()
{
    if (_explosionHandle.IsActive)
        _explosionHandle.Cancel();

    if (_poisonHandle.IsActive)
        _poisonHandle.Cancel();

    if (_radarHandle.IsActive)
        _radarHandle.Cancel();
}
```

非アクティブなハンドルのキャンセルはノーオペレーション（例外なし）だが、`IsActive`のチェックで意図が明確になる。

## Inspector統合：ビジュアルスケジューリング

デザイナーが喜ぶ点：スケジューリングAPIとInspectorのBehavior Windowが連携する。コードに触れずにディレイとリピートの設定をビジュアルに構成できる。

![Behavior Schedule](/img/game-event-system/visual-workflow/game-event-behavior/behavior-schedule.png)

Behaviorコンポーネントが公開するもの：
- **Delay**：最初の発行前の秒数
- **Repeat Count**：リピート回数（0 = 1回、-1 = 無限）
- **Repeat Interval**：リピート間の秒数

これらは内部で`RaiseDelayed()`と`RaiseRepeating()`に直接マッピングされる。デザイナーが2秒のディレイ、1秒間隔の3回リピートを設定する——コードでの`RaiseDelayed(2f)`に続く`RaiseRepeating(interval: 1f, count: 3)`と同等。

デザイナーがコードなしでタイミングを調整。プログラマーがスクリプトで同じタイミングをオーバーライドまたは拡張。両方のパスが同じScheduleHandle管理を生む。タイミングロジックの所有権を巡る争いなし。

![Delayed Event Inspector](/img/game-event-system/examples/07-delayed-event/demo-07-inspector.png)

## 完全比較：爆弾解除

すべてをまとめよう。冒頭の爆弾シナリオ——ただし今回はGESスケジューリング。

### コルーチン版（今日書くもの）

```csharp
public class BombCoroutine : MonoBehaviour
{
    [SerializeField] private float fuseTime = 30f;
    [SerializeField] private float tickInterval = 1f;

    private Coroutine _explosionCoroutine;
    private Coroutine _countdownCoroutine;
    private bool _isArmed;
    private bool _hasExploded;
    private int _ticksRemaining;

    public void ArmBomb()
    {
        if (_isArmed) return;
        _isArmed = true;
        _hasExploded = false;
        _ticksRemaining = Mathf.FloorToInt(fuseTime / tickInterval);

        _explosionCoroutine = StartCoroutine(ExplosionRoutine());
        _countdownCoroutine = StartCoroutine(CountdownRoutine());
    }

    private IEnumerator ExplosionRoutine()
    {
        yield return new WaitForSeconds(fuseTime);
        _hasExploded = true;
        _explosionCoroutine = null;
        // 爆発を通知... でもどうやって？直接参照？UnityEvent？
        Debug.Log("BOOM!");
    }

    private IEnumerator CountdownRoutine()
    {
        while (_ticksRemaining > 0)
        {
            yield return new WaitForSeconds(tickInterval);
            _ticksRemaining--;
            // UIに通知... でもどうやって？
            Debug.Log($"Tick... {_ticksRemaining}");
        }
        _countdownCoroutine = null;
    }

    public void AttemptDefusal()
    {
        if (!_isArmed || _hasExploded) return;

        _isArmed = false;

        if (_explosionCoroutine != null)
        {
            StopCoroutine(_explosionCoroutine);
            _explosionCoroutine = null;
        }
        if (_countdownCoroutine != null)
        {
            StopCoroutine(_countdownCoroutine);
            _countdownCoroutine = null;
        }

        // 解除されたのか爆発したのか？_hasExplodedをチェック。
        // 他のシステムへの通知は？手動呼び出し。
        Debug.Log("Defused!");
    }

    private void OnDestroy()
    {
        if (_explosionCoroutine != null)
            StopCoroutine(_explosionCoroutine);
        if (_countdownCoroutine != null)
            StopCoroutine(_countdownCoroutine);
    }
}
```

約50行。2つのコルーチンフィールド、2つのブールフラグ、手動通知（`// でもどうやって？`のコメント）、ライフサイクルコールバックなし、UIは`_ticksRemaining`をポーリングするかこのコンポーネントへの直接参照が必要。

### GES版

```csharp
public class BombController : MonoBehaviour
{
    [Header("Events")]
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombExplode;
    [GameEventDropdown, SerializeField] private Int32GameEvent onCountdownTick;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombDefused;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombArmed;

    [Header("Settings")]
    [SerializeField] private float fuseTime = 30f;
    [SerializeField] private float tickInterval = 1f;

    private ScheduleHandle _explosionHandle;
    private ScheduleHandle _countdownHandle;
    private bool _isArmed;

    public void ArmBomb()
    {
        if (_isArmed) return;
        _isArmed = true;

        onBombArmed.Raise();

        int totalTicks = Mathf.FloorToInt(fuseTime / tickInterval);

        _explosionHandle = onBombExplode.RaiseDelayed(fuseTime)
            .OnCompleted(() => Debug.Log("BOOM! Bomb exploded."));

        _countdownHandle = onCountdownTick.RaiseRepeating(
            totalTicks, interval: tickInterval, count: totalTicks)
            .OnStep((remaining) => Debug.Log($"Tick... 残り{remaining}秒"));
    }

    public void AttemptDefusal(float progress)
    {
        if (!_isArmed) return;
        if (progress < 1f) return;

        _isArmed = false;

        if (_explosionHandle.IsActive) _explosionHandle.Cancel();
        if (_countdownHandle.IsActive) _countdownHandle.Cancel();

        _explosionHandle.OnCancelled(() => Debug.Log("Explosion cancelled!"));

        onBombDefused.Raise();
    }

    private void OnDisable()
    {
        if (_explosionHandle.IsActive) _explosionHandle.Cancel();
        if (_countdownHandle.IsActive) _countdownHandle.Cancel();
    }
}
```

そしてUI側、完全に疎結合——`BombController`への参照は一切なし：

```csharp
public class BombUI : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onCountdownTick;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombDefused;
    [GameEventDropdown, SerializeField] private SingleGameEvent onBombExplode;
    [SerializeField] private TextMeshProUGUI countdownText;
    [SerializeField] private GameObject bombPanel;

    private void OnEnable()
    {
        onCountdownTick.AddListener(UpdateCountdown);
        onBombDefused.AddListener(ShowDefusedMessage);
        onBombExplode.AddListener(ShowExplosionScreen);
    }

    private void OnDisable()
    {
        onCountdownTick.RemoveListener(UpdateCountdown);
        onBombDefused.RemoveListener(ShowDefusedMessage);
        onBombExplode.RemoveListener(ShowExplosionScreen);
    }

    private void UpdateCountdown(int secondsRemaining)
    {
        bombPanel.SetActive(true);
        countdownText.text = $"{secondsRemaining}";
        if (secondsRemaining <= 5)
            countdownText.color = Color.red;
    }

    private void ShowDefusedMessage()
    {
        countdownText.text = "DEFUSED";
        countdownText.color = Color.green;
    }

    private void ShowExplosionScreen()
    {
        bombPanel.SetActive(false);
    }
}
```

`BombController`はUIの存在を知らない。`BombUI`は爆弾の内部状態を知らない。スケジューリング付きのイベントで通信する。爆弾は自身の爆発とカウントダウンをスケジュールする。UIはリッスンして反応する。解除がスケジュールをキャンセルし、ライフサイクルコールバックが分岐を処理する。コルーチンなし。`Update()`ループなし。相互参照なし。

## 実践パターン

### 毒ダメージオーバータイム

```csharp
public class PoisonEffect : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private Int32GameEvent onPoisonDamage;

    private ScheduleHandle _poisonHandle;

    public void ApplyPoison(int damagePerTick, float interval, int ticks)
    {
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);

        _poisonHandle = onPoisonDamage.RaiseRepeating(
            damagePerTick, interval: interval, count: ticks)
            .OnStep((remaining) => UpdatePoisonUI(remaining))
            .OnCompleted(() => ShowPoisonExpired())
            .OnCancelled(() => ShowPoisonCured());
    }

    public void CurePoison()
    {
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);
    }

    private void OnDisable()
    {
        if (_poisonHandle.IsActive)
            onPoisonDamage.CancelRepeating(_poisonHandle);
    }
}
```

### レーダー/ハートビートシステム

```csharp
public class RadarSystem : MonoBehaviour
{
    [GameEventDropdown, SerializeField] private SingleGameEvent onRadarPing;

    private ScheduleHandle _scanHandle;

    private void OnEnable()
    {
        _scanHandle = onRadarPing.RaiseRepeating(interval: 2f, count: -1)
            .OnStep((_) => Debug.Log("Radar ping sent"));
    }

    private void OnDisable()
    {
        if (_scanHandle.IsActive)
            onRadarPing.CancelRepeating(_scanHandle);
    }
}
```

これがレーダーシステム全体。実際のロジック7行。コルーチンなし、Updateループなし、手動タイマー追跡なし。有効化で開始、無効化で停止。

## いつ何を使うか

**`Raise()`を使う**——即座の通知：プレイヤー死亡、ボタンクリック、アイテム収集。タイミングは関与しない。

**`RaiseDelayed()`を使う**——ワンショット時間イベント：導火線後の爆発、カットシーン後のダイアログ、死亡タイマー後のリスポーン。待機後に1回起きるもの。

**`RaiseRepeating()`を有限countで使う**——DoT、チャネリングアビリティ、カウントダウン、マルチステップシーケンス。固定回数パルスするもの。

**`RaiseRepeating()`をcount: -1で使う**——ハートビートシステム、ポーリングループ、アンビエントエフェクト、レーダーピン。明示的に停止されるまで実行するもの。

**ハンドルは常に保存する**——キャンセルの可能性が少しでもあるなら。実践では、ほぼ常に必要。

**常に`OnDisable()`でクリーンアップ**。スケジュールがアクティブな間にMonoBehaviourが破壊されたら、キャンセルする。GESはしなくてもクラッシュしないが、孤立したスケジュールはコードの臭い。

## クイックリファレンス

| メソッド | 戻り値 | 説明 |
|--------|---------|-------------|
| `Raise()` | void | 即座実行 |
| `Raise(arg)` | void | 引数付き即座実行 |
| `Raise(sender, args)` | void | sender + 引数付き即座実行 |
| `RaiseDelayed(delay)` | ScheduleHandle | 遅延voidイベント |
| `RaiseDelayed(arg, delay)` | ScheduleHandle | 遅延型付きイベント |
| `RaiseDelayed(sender, args, delay)` | ScheduleHandle | 遅延senderイベント |
| `RaiseRepeating(interval, count)` | ScheduleHandle | リピートvoidイベント |
| `RaiseRepeating(arg, interval, count)` | ScheduleHandle | リピート型付きイベント |
| `handle.OnStep(callback)` | ScheduleHandle | 各実行後 |
| `handle.OnCompleted(callback)` | ScheduleHandle | 自然完了後 |
| `handle.OnCancelled(callback)` | ScheduleHandle | 手動キャンセル後 |
| `handle.Cancel()` | void | スケジュールをキャンセル |
| `handle.IsActive` | bool | まだ実行中かチェック |

スケジューリングAPIは、かつてコルーチン管理のボイラープレートだったものを、宣言的でハンドル管理されたイベントタイミングに凝縮する。パターンは常に同じ：発行、ハンドルをキャプチャ、コールバックをアタッチ、完了時にキャンセル。一度内面化すれば、シンプルなディレイのためにどうして`IEnumerator`を書いていたのか本気で不思議に思うだろう。

---

🚀 グローバル開発者サービス

**🇨🇳 中国開発者コミュニティ**
- 🛒 [Unity 中国アセットストア](https://tinygiants.tech/ges/cn)
- 🎥 [Bilibili動画チュートリアル](https://tinygiants.tech/bilibili)
- 📘 [技術ドキュメント](https://tinygiants.tech/docs/ges)
- 💬 QQグループ (1071507578)

**🌐 グローバル開発者コミュニティ**
- 🛒 [Unity Global Asset Store](https://tinygiants.tech/ges)
- 💬 [Discord コミュニティ](https://tinygiants.tech/discord)
- 🎥 [YouTube チャンネル](https://tinygiants.tech/youtube)
- 🎮 [Unity フォーラム](https://tinygiants.tech/forum/ges)
- 🐙 [GitHub](https://github.com/tinygiants-tech/TinyGiants)

**📧 サポート**
- 🌐 [TinyGiants Studio](https://tinygiants.tech)
- ✉️ [サポートメール](mailto:support@tinygiants.tech)
