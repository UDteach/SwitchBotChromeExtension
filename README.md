# SwitchBot Dashboard

<div align="center">

🏠 **Chrome拡張機能として動作するSwitchBotダッシュボード**

![Version](https://img.shields.io/badge/version-1.0-blue)
![Chrome](https://img.shields.io/badge/Chrome-Extension-green)
![License](https://img.shields.io/badge/license-MIT-orange)

</div>

## ✨ 特徴

- 🎯 **新しいタブページ** - 新規タブを開くたびにSwitchBotダッシュボードを表示
- 📊 **リアルタイムステータス** - デバイスの状態を自動更新（30秒間隔）
- 🔌 **詳細情報表示** - 電圧・電流・電力・バッテリー残量など
- ⭐ **お気に入り機能** - よく使うデバイスをピン留め
- 👁️ **表示管理** - 不要なデバイスを非表示に
- 🔒 **安全なストレージ** - APIキーはChrome拡張機能専用ストレージに保存

## 📱 対応デバイス

| デバイス | 表示情報 | 操作 |
|----------|----------|------|
| Plug Mini | 電圧/電流/電力/稼働時間 | ON/OFF |
| 温湿度計 | 温度/湿度/バッテリー | - |
| Hub 2 | 温度/湿度/照度 | - |
| ライト/電球 | 明るさ/色温度 | ON/OFF |
| カーテン | 開閉位置/バッテリー | 開閉操作 |
| ロック | 施錠状態/バッテリー | 施錠/解錠 |
| ボット | 状態/バッテリー | 押す |
| センサー類 | 検知状態/バッテリー | - |
| 赤外線リモコン | - | 操作 |

## 🚀 インストール方法

### Chrome拡張機能として

1. このリポジトリをクローンまたはダウンロード
2. Chrome で `chrome://extensions/` を開く
3. 右上の「**デベロッパーモード**」をON
4. 「**パッケージ化されていない拡張機能を読み込む**」をクリック
5. `extension` フォルダを選択

### SwitchBot API設定

1. SwitchBotアプリを開く
2. **プロフィール** → **設定** → **アプリバージョン** を10回タップ
3. **開発者向けオプション** からAPIトークンとシークレットを取得
4. 拡張機能の設定（⚙️）に入力して保存

## 🎨 スクリーンショット

新しいタブを開くと、美しいダッシュボードが表示されます：

- 現在時刻と日付
- お気に入りデバイス
- 全デバイス一覧（詳細ステータス付き）

## ⚙️ 設定

| 項目 | 説明 |
|------|------|
| API Token | SwitchBot APIトークン |
| Client Secret | SwitchBot クライアントシークレット |
| 接続モード | 拡張機能モード（直接）/ ブラウザモード（プロキシ） |
| デバイス表示 | 各デバイスの表示/非表示を管理 |

## 🔄 自動更新

- **デバイスリスト**: 5分ごとに自動更新
- **ステータス**: 30秒ごとに自動更新
- APIレート制限（10,000リクエスト/日）を考慮した設計

## 🛡️ セキュリティ

- APIキーは `chrome.storage.local` に安全に保存
- 拡張機能専用ストレージのため他のサイトからアクセス不可
- ブラウザプレビューモードでは `localStorage` にフォールバック

## 📁 ファイル構成

```
extension/
├── manifest.json    # Chrome拡張機能マニフェスト
├── index.html       # メインページ
├── script.js        # アプリケーションロジック
└── style.css        # スタイルシート
```

## 🔧 開発

### ブラウザプレビュー（開発用）

```bash
cd extension
npx http-server . -p 8080 -c-1
```

http://localhost:8080 でアクセス

### 接続モード

- **拡張機能モード**: Chrome拡張機能として実行時、SwitchBot APIに直接接続
- **ブラウザモード**: 開発時、CORSプロキシ経由で接続

## 📄 ライセンス

MIT License

## 🙏 謝辞

- [SwitchBot](https://www.switch-bot.com/) - スマートホームデバイス
- [SwitchBot API](https://github.com/OpenWonderLabs/SwitchBotAPI) - API仕様
