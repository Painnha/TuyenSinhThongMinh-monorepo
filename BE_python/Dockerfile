# Sử dụng Python 3.9 slim
FROM python:3.9-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép requirements.txt vào container
COPY requirements.txt .

# Cài đặt dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ code vào container
COPY . .

# Thiết lập biến môi trường
ENV PORT=8080
ENV API_HOST=0.0.0.0

# Expose port để Cloud Run có thể kết nối
EXPOSE 8080

# Chạy ứng dụng với gunicorn thay vì Flask development server
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app 