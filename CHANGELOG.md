# 開發日誌 CHANGELOG

## 2026-01-04

### 新增功能：逆價差補償 (Backwardation Compensation)

**背景研究：**
- 台指期貨超過 80% 時間處於逆價差狀態
- 根據台灣指數公司 2010-2019 年分析，年化補償約 2-4%
- 期貨結算時價差會收斂到零，持有期貨者可獲得此價差收益

**修改檔案：**
1. `index.html` - 在「其他設定」區塊新增 UI
   - 勾選框：啟用/停用逆價差補償
   - 下拉選單：2% / 3% / 4%（預設） / 5% / 6% 年化補償率

2. `js/app.js` - 新增前端邏輯
   - `initBackwardationControl()` - 控制 UI 顯示/隱藏
   - `collectBacktestParams()` - 新增 `enableBackwardation` 和 `backwardationRate` 參數

3. `backtest_engine.py` - 實現計算邏輯
   - 讀取 `enableBackwardation` 和 `backwardationRate` 參數
   - 每日補償 = 持倉市值 × (年化比率 / 252 交易日)
   - 僅在持倉期間計算，空手時不計

**Commit:** `dd9be0e` - feat: add backwardation compensation feature (2-6% annual options)

---

## 2026-01-03

### 修復：Auto Optimize 功能超時問題
- 優化後端 API 回應速度
- 確保前端正確觸發並顯示結果

### 修復：大盤資料顯示問題
- 確保即時價格從 API 正確獲取
- 大盤走勢圖使用 API 歷史資料

### 修復：策略儲存邏輯
- 修正參數傳遞（尤其是日期範圍）
- 新增優化結果直接儲存功能

---

## 專案結構

```
Taiwan-Stock-Backtesting-System-/
├── api.py                 # Flask 後端 API
├── backtest_engine.py     # 回測引擎核心邏輯
├── index.html             # 前端主頁面
├── js/
│   ├── app.js             # 主應用邏輯
│   ├── chart.js           # 圖表模組
│   └── data.js            # 資料處理
├── css/
│   └── style.css          # 樣式表
└── requirements.txt       # Python 依賴
```

## 部署資訊

- **平台**: Render
- **URL**: https://long-term-rebalancing-main.onrender.com/
- **自動部署**: 推送到 GitHub main 分支後自動觸發
