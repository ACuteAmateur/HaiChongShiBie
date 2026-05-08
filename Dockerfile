# 使用 Python 官方轻量镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 复制当前目录内容到容器中
COPY . .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 暴露端口
EXPOSE 8000

# 运行应用
CMD ["python", "run.py"]