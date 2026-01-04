@echo off
chcp 65001 >nul
echo ========================================
echo    正在啟動回測分析系統...
echo ========================================
echo.
cd /d "%~dp0"
streamlit run app6.py
pause
