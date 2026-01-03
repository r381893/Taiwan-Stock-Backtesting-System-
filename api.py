"""
Taiwan Stock Backtesting System - Flask API
Flask 後端 API 伺服器
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import os

from backtest_engine import run_backtest, optimize_ma, get_market_status

app = Flask(__name__)
CORS(app)  # 允許跨域請求

# 快取檔案路徑
CACHE_FILE = 'stock_data_cache.csv'
CACHE_EXPIRY_HOURS = 24


def load_stock_data(start_date=None, end_date=None):
    """
    從 Yahoo Finance 載入股市資料，優先使用快取
    
    Parameters:
    -----------
    start_date : str, optional
        開始日期 (YYYY-MM-DD)
    end_date : str, optional
        結束日期 (YYYY-MM-DD)
    
    Returns:
    --------
    DataFrame: 包含 date 和 close 欄位
    """
    use_cache = False
    
    # 檢查快取是否存在且有效
    if os.path.exists(CACHE_FILE):
        cache_mtime = datetime.fromtimestamp(os.path.getmtime(CACHE_FILE))
        if datetime.now() - cache_mtime < timedelta(hours=CACHE_EXPIRY_HOURS):
            use_cache = True
    
    if use_cache:
        try:
            df = pd.read_csv(CACHE_FILE, parse_dates=['date'])
            print(f"[INFO] 從快取載入資料，共 {len(df)} 筆")
        except Exception as e:
            print(f"[WARN] 讀取快取失敗: {e}")
            use_cache = False
    
    if not use_cache:
        try:
            print("[INFO] 從 Yahoo Finance 下載資料...")
            df_yahoo = yf.download('^TWII', period='20y', progress=False)
            
            if df_yahoo.empty:
                raise Exception("Yahoo Finance 回傳空資料")
            
            df_yahoo = df_yahoo.reset_index()
            
            # 處理 MultiIndex 欄位
            if isinstance(df_yahoo.columns, pd.MultiIndex):
                df_yahoo.columns = df_yahoo.columns.get_level_values(0)
            
            # 重命名欄位
            df = df_yahoo[['Date', 'Close']].copy()
            df.columns = ['date', 'close']
            df['date'] = pd.to_datetime(df['date'])
            df = df.sort_values('date').reset_index(drop=True)
            
            # 儲存快取
            df.to_csv(CACHE_FILE, index=False)
            print(f"[INFO] 資料已快取，共 {len(df)} 筆")
            
        except Exception as e:
            print(f"[ERROR] Yahoo Finance 下載失敗: {e}")
            
            # 嘗試讀取舊快取
            if os.path.exists(CACHE_FILE):
                df = pd.read_csv(CACHE_FILE, parse_dates=['date'])
                print(f"[INFO] 使用舊快取資料，共 {len(df)} 筆")
            else:
                return None
    
    # 根據日期範圍過濾
    if start_date:
        start_dt = pd.to_datetime(start_date)
        df = df[df['date'] >= start_dt]
    
    if end_date:
        end_dt = pd.to_datetime(end_date)
        df = df[df['date'] <= end_dt]
    
    return df.reset_index(drop=True)


@app.route('/')
def index():
    """首頁 - serve 前端 HTML"""
    return send_from_directory('.', 'index.html')


@app.route('/api')
def api_info():
    """API 資訊頁"""
    return jsonify({
        'name': 'Taiwan Stock Backtesting API',
        'version': '1.0.0',
        'endpoints': {
            '/api/data': 'GET - 獲取股市資料',
            '/api/market': 'GET - 獲取最新市場狀態',
            '/api/backtest': 'POST - 執行回測',
            '/api/optimize': 'POST - 自動優化均線'
        }
    })


# 靜態檔案服務 - serve CSS, JS, icons 等
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)


@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)


@app.route('/icons/<path:filename>')
def serve_icons(filename):
    return send_from_directory('icons', filename)


@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory('.', 'manifest.json')


@app.route('/sw.js')
def serve_sw():
    return send_from_directory('.', 'sw.js')


@app.route('/api/data', methods=['GET'])
def get_data():
    """
    獲取股市歷史資料
    
    Query Parameters:
    - startDate: 開始日期 (YYYY-MM-DD)
    - endDate: 結束日期 (YYYY-MM-DD)
    """
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    df = load_stock_data(start_date, end_date)
    
    if df is None or df.empty:
        return jsonify({
            'success': False,
            'error': '無法載入資料'
        }), 500
    
    # 轉換為 JSON 友好格式
    data = []
    for _, row in df.iterrows():
        data.append({
            'date': row['date'].strftime('%Y-%m-%d'),
            'close': round(float(row['close']), 2)
        })
    
    return jsonify({
        'success': True,
        'count': len(data),
        'startDate': df.iloc[0]['date'].strftime('%Y-%m-%d'),
        'endDate': df.iloc[-1]['date'].strftime('%Y-%m-%d'),
        'data': data
    })


@app.route('/api/market', methods=['GET'])
def get_market():
    """
    獲取最新市場狀態與信號
    
    Query Parameters:
    - maDays: 均線天數 (預設 13)
    """
    ma_days = request.args.get('maDays', 13, type=int)
    
    df = load_stock_data()
    
    if df is None or df.empty:
        return jsonify({
            'success': False,
            'error': '無法載入資料'
        }), 500
    
    try:
        status = get_market_status(df, ma_days)
        return jsonify({
            'success': True,
            **status
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/backtest', methods=['POST'])
def backtest():
    """
    執行回測
    
    Request Body (JSON):
    {
        "startDate": "2015-01-01",
        "endDate": "2026-01-03",
        "maDays": 13,
        "tradeMode": "long",
        "initialCapital": 1000000,
        "monthlyAdd": 0,
        "useFixedLeverage": true,
        "fixedLeverage": 1,
        "useDynamicLeverage": false,
        "dynamicLeverage": 2,
        "enableRebalance": true,
        "rebalancePeriod": 1,
        "pointValue": 50,
        "lotMode": "dynamic",
        "fixedLots": 1,
        "useFee": true,
        "buyFee": 35,
        "sellFee": 35
    }
    """
    try:
        params = request.get_json()
        
        if not params:
            return jsonify({
                'success': False,
                'error': '缺少參數'
            }), 400
        
        # 載入資料
        start_date = params.get('startDate', '2015-01-01')
        end_date = params.get('endDate')
        
        df = load_stock_data(start_date, end_date)
        
        if df is None or df.empty:
            return jsonify({
                'success': False,
                'error': '無法載入資料'
            }), 500
        
        # 執行回測
        result = run_backtest(df, params)
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/optimize', methods=['POST'])
def optimize():
    """
    自動優化均線天數
    
    Request Body (JSON):
    {
        "startDate": "2015-01-01",
        "endDate": "2026-01-03",
        "maMin": 5,
        "maMax": 60,
        "tradeMode": "long",
        "initialCapital": 1000000,
        "pointValue": 50
    }
    """
    try:
        params = request.get_json()
        
        if not params:
            return jsonify({
                'success': False,
                'error': '缺少參數'
            }), 400
        
        # 載入資料
        start_date = params.get('startDate', '2015-01-01')
        end_date = params.get('endDate')
        
        df = load_stock_data(start_date, end_date)
        
        if df is None or df.empty:
            return jsonify({
                'success': False,
                'error': '無法載入資料'
            }), 500
        
        # 執行優化
        result = optimize_ma(df, params)
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("=" * 50)
    print("Taiwan Stock Backtesting API Server")
    print("=" * 50)
    print("啟動伺服器於 http://localhost:5000")
    print("按 Ctrl+C 停止伺服器")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
