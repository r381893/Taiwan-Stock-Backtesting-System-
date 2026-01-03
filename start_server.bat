@echo off
echo ========================================
echo Taiwan Stock Backtesting API Server
echo ========================================
echo.

REM 檢查是否安裝了 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 未安裝，請先安裝 Python
    pause
    exit /b 1
)

REM 安裝依賴
echo [INFO] 正在檢查並安裝依賴套件...
pip install -r requirements.txt -q

echo.
echo [INFO] 啟動 API 伺服器...
echo [INFO] 伺服器網址: http://localhost:5000
echo [INFO] 按 Ctrl+C 停止伺服器
echo.

python api.py

pause
