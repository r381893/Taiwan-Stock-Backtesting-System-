/**
 * Sample Data for Taiwan Stock Backtesting System
 * 模擬數據用於展示
 */

// Get today's date string
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Generate sample 100-day signal data
function generateSignalData() {
    const signals = [];
    const dates = [];
    const today = new Date();

    for (let i = 99; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        dates.push(date.toISOString().split('T')[0]);

        // Generate somewhat realistic signal pattern
        if (signals.length === 0) {
            signals.push(Math.random() > 0.5 ? 1 : -1);
        } else {
            const prevSignal = signals[signals.length - 1];
            signals.push(Math.random() > 0.3 ? prevSignal : -prevSignal);
        }
    }

    return { dates, signals };
}

// Generate market trend data (for 3yr/5yr/10yr charts)
function generateTrendData(years) {
    const dates = [];
    const prices = [];
    const maValues = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - years);

    let price = 8000 + Math.random() * 2000; // Start around 8000-10000
    const maPeriod = 60; // 60-day MA for trend chart
    const priceHistory = [];

    const current = new Date(startDate);
    while (current <= today) {
        // Skip weekends
        if (current.getDay() !== 0 && current.getDay() !== 6) {
            dates.push(current.toISOString().split('T')[0]);

            // Simulate price movement with upward bias
            const change = (Math.random() - 0.48) * 200;
            price = Math.max(6000, price + change);
            prices.push(price);
            priceHistory.push(price);

            // Calculate MA
            if (priceHistory.length >= maPeriod) {
                const ma = priceHistory.slice(-maPeriod).reduce((a, b) => a + b, 0) / maPeriod;
                maValues.push(ma);
            } else {
                maValues.push(null);
            }
        }

        current.setDate(current.getDate() + 1);
    }

    return { dates, prices, maValues };
}

// Generate sample MDD data
function generateMddData() {
    const dates = [];
    const mddValues = [];
    const startDate = new Date('2015-01-01');
    const today = new Date();

    let peakEquity = 1000000;
    let equity = 1000000;

    const current = new Date(startDate);
    while (current <= today) {
        dates.push(current.toISOString().split('T')[0]);

        const change = (Math.random() - 0.45) * 50000;
        equity += change;

        if (equity > peakEquity) {
            peakEquity = equity;
        }

        const drawdown = ((peakEquity - equity) / peakEquity) * 100;
        mddValues.push(-Math.min(drawdown, 30));

        current.setMonth(current.getMonth() + 1);
    }

    return { dates, mddValues };
}

// Generate top 3 MA optimization results
function generateTop3MA(minMA, maxMA) {
    const results = [];
    const usedMAs = new Set();

    for (let i = 0; i < 3; i++) {
        let ma;
        do {
            ma = Math.floor(Math.random() * (maxMA - minMA + 1)) + minMA;
        } while (usedMAs.has(ma));
        usedMAs.add(ma);

        // Generate realistic returns (higher for rank 1)
        const baseReturn = 180 - (i * 40) + (Math.random() * 60);
        const avgReturn = baseReturn / 127; // Divide by trade count

        results.push({
            rank: i + 1,
            ma: ma,
            totalReturn: baseReturn,
            avgReturn: avgReturn,
            mdd: -(10 + Math.random() * 15),
            winRate: 55 + Math.random() * 10
        });
    }

    // Sort by total return
    results.sort((a, b) => b.totalReturn - a.totalReturn);
    results.forEach((r, i) => r.rank = i + 1);

    return results;
}

// Generate sample trade data with contracts and reasons
function generateSampleTrades() {
    const trades = [];
    const today = new Date();
    const startDate = new Date('2015-01-01');

    const entryReasons = [
        '突破MA上穿',
        '價格站上均線',
        '趨勢反轉信號',
        'MA金叉',
        '突破壓力位'
    ];

    const exitReasons = [
        '跌破MA下穿',
        '價格跌破均線',
        '趨勢結束信號',
        'MA死叉',
        '停利出場',
        '停損出場'
    ];

    let tradeId = 1;
    let currentDate = new Date(startDate);

    while (currentDate < today && tradeId <= 127) {
        const entryDate = new Date(currentDate);
        const holdDays = Math.floor(Math.random() * 30) + 5;
        const exitDate = new Date(entryDate);
        exitDate.setDate(exitDate.getDate() + holdDays);

        if (exitDate > today) break;

        const entryPrice = 10000 + Math.random() * 18000;
        const direction = Math.random() > 0.4 ? 'long' : 'short';
        const priceChange = (Math.random() - 0.45) * 1000;
        const exitPrice = direction === 'long'
            ? entryPrice + priceChange
            : entryPrice - priceChange;

        // Calculate contracts based on capital (simplified)
        const contracts = Math.floor(Math.random() * 5) + 1;

        const pnl = direction === 'long'
            ? (exitPrice - entryPrice) * 50 * contracts
            : (entryPrice - exitPrice) * 50 * contracts;
        const returnRate = (pnl / 1000000) * 100;

        trades.push({
            id: tradeId,
            entryDate: entryDate.toISOString().split('T')[0],
            entryPrice: entryPrice.toFixed(2),
            exitDate: exitDate.toISOString().split('T')[0],
            exitPrice: exitPrice.toFixed(2),
            direction: direction,
            contracts: contracts,
            pnl: pnl,
            returnRate: returnRate,
            holdDays: holdDays,
            entryReason: entryReasons[Math.floor(Math.random() * entryReasons.length)],
            exitReason: exitReasons[Math.floor(Math.random() * exitReasons.length)]
        });

        currentDate = new Date(exitDate);
        currentDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 10) + 3);
        tradeId++;
    }

    return trades;
}

// Sample market data
const marketData = {
    latestDate: getTodayString(),
    latestPrice: 28198.02,
    ma13: 27859.76,
    dataRange: {
        start: '2006-01-02',
        end: getTodayString(),
        count: 4893
    }
};

// Sample backtest results
const sampleBacktestResults = {
    period: '2015-01-01 ~ ' + getTodayString(),
    finalAssets: 3256789,
    totalReturn: 225.68,
    maxDrawdown: -18.45,
    winRate: 58.3,
    tradeCount: 127
};

// Determine market sentiment (for auto theme)
function getMarketSentiment() {
    const diff = marketData.latestPrice - marketData.ma13;
    const percentDiff = (diff / marketData.ma13) * 100;

    if (percentDiff > 2) return 'bull';
    if (percentDiff < -2) return 'bear';
    return 'neutral';
}

// Calculate signal based on price and MA
function calculateSignal(price, ma) {
    return price > ma ? 'long' : 'short';
}

// Format number with commas
function formatNumber(num, decimals = 0) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Format currency
function formatCurrency(num) {
    return 'NT$ ' + formatNumber(num);
}

// Format percentage
function formatPercent(num) {
    const sign = num >= 0 ? '+' : '';
    return sign + num.toFixed(2) + '%';
}

// Export data and functions
window.appData = {
    marketData,
    sampleBacktestResults,
    getTodayString,
    generateSignalData,
    generateTrendData,
    generateMddData,
    generateTop3MA,
    generateSampleTrades,
    getMarketSentiment,
    calculateSignal,
    formatNumber,
    formatCurrency,
    formatPercent
};
