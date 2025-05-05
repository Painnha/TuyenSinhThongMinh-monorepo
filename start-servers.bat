@echo off
echo Dang khoi dong lai he thong...

echo Kiem tra va dung cac server dang chay...
taskkill /f /im node.exe /t
taskkill /f /im python.exe /t

echo Cai dat cac thu vien Python can thiet...
pip install flask flask-cors python-dotenv pymongo tensorflow numpy scikit-learn

echo Khoi tao mo hinh neu chua ton tai...
cd BE_python
python -c "from ai_models.dudoanxacxuat.initialize_model import initialize_model; initialize_model()"
cd ..

echo Starting Python API Server...
start cmd /k "cd BE_python & python app.py"

echo Starting Node.js Server...
start cmd /k "cd backend & npm start"

echo Starting Frontend...
start cmd /k "cd frontend & npm start"

echo All servers started!
echo Python API: http://localhost:5001
echo Node.js API: http://localhost:5000
echo Frontend: http://localhost:3000

echo Test ket noi API...
timeout /t 10
cd backend
node ../test_api_connection.js 