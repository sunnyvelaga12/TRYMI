@echo off
echo ============================================================
echo 🚀 STARTING TRYMI AI SERVICE (PRODUCTION READY)
echo ============================================================
cd ai-service
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo ✅ Virtual Environment activated
) else (
    echo ⚠️  Virtual Environment not found! Attempting without...
)
python app.py
pause
