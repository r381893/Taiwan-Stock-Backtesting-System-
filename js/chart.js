/**
 * Chart Configuration for Taiwan Stock Backtesting System
 * 使用 Chart.js 繪製圖表
 */

let signalChart = null;
let mddChart = null;
let trendChart = null;

// Initialize the signal trend chart with real API data
async function initSignalChart(maDays = 13) {
    const ctx = document.getElementById('signalChart').getContext('2d');
    let chartData;

    try {
        // 獲取最近 200 天數據（確保有足夠數據計算均線和取 100 日信號）
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 200);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`[SignalChart] Fetching data from ${startDateStr} to ${endDateStr}...`);
        const response = await window.appData.fetchMarketData(startDateStr, endDateStr);

        if (response && response.success && response.data.length > 0) {
            const prices = response.data.map(d => d.close);
            const allDates = response.data.map(d => d.date);
            const signals = [];
            const validDates = [];

            // 計算每日信號：價格 > MA 為做多 (1)，否則為做空 (-1)
            for (let i = 0; i < prices.length; i++) {
                if (i < maDays - 1) continue; // 需要足夠數據計算均線

                let sum = 0;
                for (let j = 0; j < maDays; j++) {
                    sum += prices[i - j];
                }
                const ma = sum / maDays;
                signals.push(prices[i] > ma ? 1 : -1);
                validDates.push(allDates[i]);
            }

            // 只取最近 100 個信號
            const last100 = Math.max(0, signals.length - 100);
            chartData = {
                dates: validDates.slice(last100),
                signals: signals.slice(last100)
            };
            console.log(`[SignalChart] Loaded ${chartData.signals.length} signals from API (MA${maDays})`);
        } else {
            throw new Error('API returned no data');
        }
    } catch (error) {
        console.error('[SignalChart] Failed to load real data:', error);
        // 顯示錯誤訊息而非假資料
        if (signalChart) {
            signalChart.destroy();
        }
        signalChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '⚠️ 無法載入信號數據，請確認 API 伺服器已啟動',
                        color: '#f43f5e',
                        font: { size: 14 }
                    }
                }
            }
        });
        return signalChart;
    }

    const { dates, signals } = chartData;

    const backgroundColors = signals.map(s =>
        s === 1 ? 'rgba(244, 63, 94, 0.8)' : 'rgba(16, 185, 129, 0.8)'
    );
    const borderColors = signals.map(s =>
        s === 1 ? 'rgb(244, 63, 94)' : 'rgb(16, 185, 129)'
    );

    // Destroy existing chart if any
    if (signalChart) {
        signalChart.destroy();
    }

    signalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: '多空信號',
                data: signals,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 2,
                barPercentage: 0.9,
                categoryPercentage: 0.95
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            return context.raw === 1 ? '📈 建議做多' : '📉 建議做空';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        maxRotation: 45,
                        font: { size: 10 },
                        callback: function (value, index) {
                            return index % 10 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            if (value === 1) return '做多';
                            if (value === -1) return '做空';
                            return '';
                        },
                        stepSize: 1
                    },
                    min: -1.5,
                    max: 1.5
                }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });

    return signalChart;
}

// Initialize the market trend chart (3yr/5yr/10yr)
async function initTrendChart(years = 5) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    let chartData;

    try {
        // Calculate start date
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - years);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch real data
        console.log(`[TrendChart] Fetching data from ${startDateStr} to ${endDateStr}...`);
        const response = await window.appData.fetchMarketData(startDateStr, endDateStr);

        if (response && response.success && response.data.length > 0) {
            const dates = response.data.map(d => d.date);
            const prices = response.data.map(d => d.close);

            // Calculate MA (60 days for trend)
            const maPeriod = 60;
            const maValues = [];
            for (let i = 0; i < prices.length; i++) {
                if (i < maPeriod - 1) {
                    maValues.push(null);
                    continue;
                }
                let sum = 0;
                for (let j = 0; j < maPeriod; j++) {
                    sum += prices[i - j];
                }
                maValues.push(sum / maPeriod);
            }

            chartData = { dates, prices, maValues };
            console.log(`[TrendChart] Loaded ${prices.length} data points from API`);
        } else {
            throw new Error('API returned no data');
        }

    } catch (error) {
        console.error('[TrendChart] Failed to load real data:', error);
        // 不使用假資料，直接顯示錯誤訊息
        if (trendChart) {
            trendChart.destroy();
        }
        // 建立一個空的圖表並顯示錯誤訊息
        trendChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '⚠️ 無法載入資料，請確認 API 伺服器已啟動',
                        color: '#f43f5e',
                        font: { size: 14 }
                    }
                }
            }
        });
        return trendChart;
    }

    const { dates, prices, maValues } = chartData;

    // Destroy existing chart if any
    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '加權指數',
                    data: prices,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: 'MA 均線',
                    data: maValues,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    borderWidth: 2,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            if (value === null) return '';
                            return context.dataset.label + ': ' + value.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        maxRotation: 45,
                        font: { size: 10 },
                        callback: function (value, index, values) {
                            // Show fewer labels based on data density
                            const totalLabels = values.length;
                            const step = Math.ceil(totalLabels / 12);
                            return index % step === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            return value.toLocaleString();
                        }
                    }
                }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });

    return trendChart;
}

// Initialize the MDD chart
function initMddChart() {
    const ctx = document.getElementById('mddChart').getContext('2d');
    const { dates, mddValues } = window.appData.generateMddData();

    if (mddChart) {
        mddChart.destroy();
    }

    mddChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '最大回撤 (%)',
                data: mddValues,
                borderColor: 'rgb(244, 63, 94)',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#f43f5e',
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            return '回撤: ' + context.raw.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 },
                        callback: function (value, index) {
                            return index % 12 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) { return value.toFixed(0) + '%'; }
                    },
                    max: 0,
                    min: -30
                }
            },
            animation: { duration: 1200, easing: 'easeOutQuart' }
        }
    });

    return mddChart;
}

// Initialize the MDD chart with real data from API
function initMddChartWithData(dates, mddValues) {
    const ctx = document.getElementById('mddChart').getContext('2d');

    if (mddChart) {
        mddChart.destroy();
    }

    // Sample data for better performance if too many data points
    let sampledDates = dates;
    let sampledValues = mddValues;

    if (dates.length > 500) {
        const step = Math.ceil(dates.length / 500);
        sampledDates = dates.filter((_, i) => i % step === 0);
        sampledValues = mddValues.filter((_, i) => i % step === 0);
    }

    // Convert positive drawdowns to negative for display
    const displayValues = sampledValues.map(v => -Math.abs(v));

    mddChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sampledDates,
            datasets: [{
                label: '最大回撤 (%)',
                data: displayValues,
                borderColor: 'rgb(244, 63, 94)',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#f43f5e',
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            return '回撤: ' + context.raw.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 },
                        callback: function (value, index, values) {
                            const step = Math.ceil(values.length / 12);
                            return index % step === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) { return value.toFixed(0) + '%'; }
                    },
                    max: 0,
                    suggestedMin: -50
                }
            },
            animation: { duration: 1200, easing: 'easeOutQuart' }
        }
    });

    return mddChart;
}


// Update signal chart with real API data
async function updateSignalChart(maDays = 13) {
    // Reinitialize with new MA days using real API data
    await initSignalChart(maDays);
}

// Update MDD chart
function updateMddChart() {
    if (mddChart) {
        const { dates, mddValues } = window.appData.generateMddData();
        mddChart.data.labels = dates;
        mddChart.data.datasets[0].data = mddValues;
        mddChart.update('active');
    }
}

// Destroy all charts
function destroyCharts() {
    if (signalChart) { signalChart.destroy(); signalChart = null; }
    if (mddChart) { mddChart.destroy(); mddChart = null; }
    if (trendChart) { trendChart.destroy(); trendChart = null; }
}

// Export chart functions
window.chartModule = {
    initSignalChart,
    initTrendChart,
    initMddChart,
    initMddChartWithData,
    updateSignalChart,
    updateMddChart,
    destroyCharts
};
