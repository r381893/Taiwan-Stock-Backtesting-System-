"""
Taiwan Stock Backtesting Engine
回測引擎 - 從 appV8-main/app6.py 移植的核心邏輯
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def calculate_ma(df, days):
    """計算移動平均線"""
    df = df.copy()
    df[f'MA{days}'] = df['close'].rolling(window=days).mean()
    return df


def calculate_mdd(capital_history):
    """計算最大回撤 (Maximum Drawdown)"""
    if not capital_history or len(capital_history) < 2:
        return 0, []
    
    values = np.array(capital_history)
    cummax = np.maximum.accumulate(values)
    drawdowns = (cummax - values) / cummax * 100
    mdd = np.max(drawdowns)
    
    return mdd, drawdowns.tolist()


def run_backtest(df, params):
    """
    執行回測
    
    Parameters:
    -----------
    df : DataFrame
        包含 'date' 和 'close' 欄位的股價資料
    params : dict
        回測參數，包含:
        - maDays: 均線天數
        - tradeMode: 交易模式 ('long', 'short', 'both')
        - initialCapital: 初始資金
        - monthlyAdd: 每月加碼金額
        - useFixedLeverage: 是否使用固定槓桿
        - fixedLeverage: 固定槓桿倍數
        - useDynamicLeverage: 是否使用動態槓桿
        - dynamicLeverage: 動態槓桿倍數
        - enableRebalance: 是否啟用再平衡
        - rebalancePeriod: 再平衡週期（月）
        - pointValue: 每點價值
        - useFee: 是否計算手續費
        - buyFee: 買進手續費
        - sellFee: 賣出手續費
        - fixedLots: 固定口數
        - lotMode: 口數模式 ('fixed', 'dynamic')
    
    Returns:
    --------
    dict: 包含回測結果的字典
    """
    # 解析參數
    ma_days = params.get('maDays', 13)
    trade_mode = params.get('tradeMode', 'long')  # 'long', 'short', 'both'
    initial_capital = params.get('initialCapital', 1000000)
    monthly_add = params.get('monthlyAdd', 0)
    use_fixed_leverage = params.get('useFixedLeverage', True)
    fixed_leverage = params.get('fixedLeverage', 1)
    use_dynamic_leverage = params.get('useDynamicLeverage', False)
    dynamic_leverage = params.get('dynamicLeverage', 2)
    enable_rebalance = params.get('enableRebalance', True)
    rebalance_period = params.get('rebalancePeriod', 1)  # 月
    point_value = params.get('pointValue', 50)  # 小台每點 50 元
    use_fee = params.get('useFee', True)
    buy_fee = params.get('buyFee', 35)
    sell_fee = params.get('sellFee', 35)
    fixed_lots = params.get('fixedLots', 1)
    lot_mode = params.get('lotMode', 'dynamic')  # 'fixed' or 'dynamic'
    
    # 逆價差補償參數
    enable_backwardation = params.get('enableBackwardation', False)
    backwardation_rate = params.get('backwardationRate', 4)  # 年化百分比
    
    # 確定實際使用的槓桿
    if lot_mode == 'fixed':
        leverage = fixed_leverage if use_fixed_leverage else 1
    else:
        leverage = dynamic_leverage if use_dynamic_leverage else 1
    
    # 計算均線
    df = calculate_ma(df, ma_days)
    df = df.dropna().reset_index(drop=True)
    
    if len(df) < 2:
        return {
            'success': False,
            'error': '資料不足'
        }
    
    # 轉換交易模式
    strategy_mode_map = {
        'long': '只做多',
        'short': '只做空',
        'both': '雙向：站上多、跌破空'
    }
    strategy_mode = strategy_mode_map.get(trade_mode, '只做多')
    
    # 初始化變數
    trades = []
    capital_history = []
    capital_dates = []
    index_history = []
    
    capital = initial_capital
    holding = False
    position = None
    entry_price = None
    entry_date = None
    current_lots = 0
    last_month = df.iloc[0]['date'].month
    days_since_rebalance = 0
    
    # 初始資金紀錄
    capital_history.append(capital)
    capital_dates.append(df.iloc[0]['date'].strftime('%Y-%m-%d'))
    index_history.append(float(df.iloc[0]['close']))
    
    ma_col = f'MA{ma_days}'
    
    for i in range(1, len(df)):
        row = df.iloc[i]
        prev_row = df.iloc[i - 1]
        current_price = float(row['close'])
        prev_price = float(prev_row['close'])
        current_ma = float(row[ma_col])
        date = row['date']
        this_month = date.month
        
        # 每月定期投入
        if monthly_add > 0 and this_month != last_month:
            capital += monthly_add
        last_month = this_month
        
        # 計算信號 (價格與均線的差距)
        action = current_price - current_ma
        
        # ========== 持倉期間：計算每日未實現損益 ==========
        if holding and current_lots > 0:
            if position == '多':
                daily_pnl = (current_price - prev_price) * current_lots * point_value
            else:  # 空單
                daily_pnl = (prev_price - current_price) * current_lots * point_value
            capital += daily_pnl
            
            # ========== 逆價差補償：每日按年化比例增加損益 ==========
            if enable_backwardation and backwardation_rate > 0:
                # 年化收益率轉為每日收益率 (假設一年約 252 個交易日)
                daily_backwardation_rate = backwardation_rate / 100 / 252
                # 依據持倉市值計算每日逆價差補償
                position_value = current_lots * current_price * point_value
                backwardation_gain = position_value * daily_backwardation_rate
                capital += backwardation_gain
            
            days_since_rebalance += 1
            
            # 定期再平衡（僅在動態口數模式下）
            if lot_mode == 'dynamic' and enable_rebalance:
                # 以月為單位的再平衡
                if this_month != last_month:
                    months_passed = 1  # 簡化計算
                    if months_passed >= rebalance_period:
                        new_lots = max(int((capital * leverage) / (current_price * point_value)), 0)
                        lot_diff = new_lots - current_lots
                        
                        if lot_diff != 0:
                            rebalance_fee = abs(lot_diff) * (buy_fee + sell_fee) if use_fee else 0
                            capital -= rebalance_fee
                            current_lots = new_lots
                            days_since_rebalance = 0
        
        # ========== 進場判斷 ==========
        if not holding:
            should_enter = False
            new_position = None
            
            if strategy_mode == '只做多' and action > 0:
                should_enter = True
                new_position = '多'
            elif strategy_mode == '只做空' and action < 0:
                should_enter = True
                new_position = '空'
            elif strategy_mode == '雙向：站上多、跌破空' and action != 0:
                should_enter = True
                new_position = '多' if action > 0 else '空'
            
            if should_enter:
                holding = True
                position = new_position
                entry_price = current_price
                entry_date = date
                days_since_rebalance = 0
                
                # 計算進場口數
                if lot_mode == 'fixed':
                    current_lots = fixed_lots
                else:
                    current_lots = max(int((capital * leverage) / (current_price * point_value)), 1)
                
                # 計入進場手續費
                if use_fee:
                    entry_fee = buy_fee * current_lots
                    capital -= entry_fee
        
        # ========== 出場/換倉判斷 ==========
        elif holding:
            should_exit = False
            should_switch = False
            new_position_after_switch = None
            
            if strategy_mode == '只做多' and action < 0 and position == '多':
                should_exit = True
            elif strategy_mode == '只做空' and action > 0 and position == '空':
                should_exit = True
            elif strategy_mode == '雙向：站上多、跌破空':
                if position == '多' and action < 0:
                    should_switch = True
                    new_position_after_switch = '空'
                elif position == '空' and action > 0:
                    should_switch = True
                    new_position_after_switch = '多'
            
            if should_exit or should_switch:
                # 計算出場手續費
                exit_fee = sell_fee * current_lots if use_fee else 0
                capital -= exit_fee
                
                # 計算總損益
                if position == '多':
                    total_profit = (current_price - entry_price) * current_lots * point_value
                else:
                    total_profit = (entry_price - current_price) * current_lots * point_value
                
                total_fee = exit_fee + (buy_fee * current_lots if use_fee else 0)
                
                # 記錄交易
                trades.append({
                    'id': len(trades) + 1,
                    'entryDate': entry_date.strftime('%Y-%m-%d'),
                    'exitDate': date.strftime('%Y-%m-%d'),
                    'direction': 'long' if position == '多' else 'short',
                    'holdDays': (date - entry_date).days,
                    'entryPrice': round(entry_price, 2),
                    'exitPrice': round(current_price, 2),
                    'contracts': current_lots,
                    'fee': round(total_fee, 2),
                    'pnl': round(total_profit - total_fee, 2),
                    'returnRate': round((total_profit - total_fee) / initial_capital * 100, 2),
                    'capitalAfter': round(capital, 2),
                    'entryReason': '突破MA上穿' if position == '多' else '跌破MA下穿',
                    'exitReason': '跌破MA下穿' if position == '多' else '突破MA上穿'
                })
                
                if should_switch:
                    # 換倉
                    position = new_position_after_switch
                    entry_price = current_price
                    entry_date = date
                    days_since_rebalance = 0
                    
                    if lot_mode == 'fixed':
                        current_lots = fixed_lots
                    else:
                        current_lots = max(int((capital * leverage) / (current_price * point_value)), 1)
                    
                    if use_fee:
                        new_entry_fee = buy_fee * current_lots
                        capital -= new_entry_fee
                else:
                    # 完全出場
                    holding = False
                    position = None
                    entry_price = None
                    entry_date = None
                    current_lots = 0
        
        # 每日資金記錄
        capital_history.append(capital)
        capital_dates.append(date.strftime('%Y-%m-%d'))
        index_history.append(current_price)
    
    # 計算績效指標
    final_capital = capital_history[-1] if capital_history else initial_capital
    total_return = (final_capital - initial_capital) / initial_capital * 100
    
    # 計算最大回撤
    mdd, mdd_history = calculate_mdd(capital_history)
    
    # 計算勝率
    if trades:
        winning_trades = sum(1 for t in trades if t['pnl'] > 0)
        win_rate = winning_trades / len(trades) * 100
    else:
        win_rate = 0
    
    return {
        'success': True,
        'results': {
            'period': f"{df.iloc[0]['date'].strftime('%Y-%m-%d')} ~ {df.iloc[-1]['date'].strftime('%Y-%m-%d')}",
            'finalAssets': round(final_capital, 0),
            'totalReturn': round(total_return, 2),
            'maxDrawdown': round(-mdd, 2),
            'winRate': round(win_rate, 1),
            'tradeCount': len(trades)
        },
        'trades': trades,
        'capitalHistory': {
            'dates': capital_dates,
            'values': capital_history
        },
        'mddHistory': {
            'dates': capital_dates,
            'values': mdd_history
        },
        'indexHistory': {
            'dates': capital_dates,
            'values': index_history
        }
    }


def optimize_ma(df, params):
    """
    自動優化均線天數
    
    Parameters:
    -----------
    df : DataFrame
        股價資料
    params : dict
        包含 maMin, maMax 和其他回測參數
    
    Returns:
    --------
    dict: 包含優化結果
    """
    ma_min = params.get('maMin', 5)
    ma_max = params.get('maMax', 60)
    
    results = []
    
    # 使用固定的 MA 列表，確保快速執行
    ma_list = [5, 10, 15, 20, 30, 60]
    
    for ma in ma_list:
        test_params = params.copy()
        test_params['maDays'] = ma
        
        result = run_backtest(df.copy(), test_params)
        
        if result['success']:
            results.append({
                'ma': ma,
                'totalReturn': result['results']['totalReturn'],
                'maxDrawdown': result['results']['maxDrawdown'],
                'winRate': result['results']['winRate'],
                'tradeCount': result['results']['tradeCount']
            })
    
    # 排序並取前三名
    results.sort(key=lambda x: x['totalReturn'], reverse=True)
    
    top3 = results[:3]
    for i, r in enumerate(top3):
        r['rank'] = i + 1
        r['avgReturn'] = r['totalReturn'] / max(r['tradeCount'], 1)
    
    return {
        'success': True,
        'top3': top3,
        'allResults': results
    }


def get_market_status(df, ma_days):
    """
    獲取最新市場狀態
    
    Parameters:
    -----------
    df : DataFrame
        股價資料
    ma_days : int
        均線天數
    
    Returns:
    --------
    dict: 市場狀態
    """
    df = calculate_ma(df, ma_days)
    
    latest = df.iloc[-1]
    latest_price = float(latest['close'])
    latest_ma = float(latest[f'MA{ma_days}'])
    latest_date = latest['date'].strftime('%Y-%m-%d')
    
    diff = latest_price - latest_ma
    signal = 'long' if diff > 0 else 'short'
    
    # 計算近100天信號
    recent_100 = df.tail(100).copy()
    signals = []
    dates = []
    
    for _, row in recent_100.iterrows():
        if pd.notna(row[f'MA{ma_days}']):
            sig = 1 if row['close'] > row[f'MA{ma_days}'] else -1
            signals.append(sig)
            dates.append(row['date'].strftime('%Y-%m-%d'))
    
    return {
        'latestDate': latest_date,
        'latestPrice': round(latest_price, 2),
        'maValue': round(latest_ma, 2),
        'priceDiff': round(diff, 2),
        'signal': signal,
        'signalText': '做多' if signal == 'long' else '做空',
        'recent100': {
            'dates': dates,
            'signals': signals
        }
    }
