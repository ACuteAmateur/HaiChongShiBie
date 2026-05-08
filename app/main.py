from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from langchain_openai import ChatOpenAI
from starlette.responses import Response
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from .routers import detect_router
from pathlib import Path
import os
from dotenv import load_dotenv
from uuid import uuid4

app = FastAPI()

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent


# 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# 异常处理
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": f"HTTP Error: {exc.detail}"},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": "请求参数校验失败", "detail": exc.errors()},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "服务器内部错误", "detail": str(exc)},
    )

# 首页
@app.get("/", response_class=HTMLResponse)
async def home():
    file_path = BASE_DIR / "static" / "home" / "head.html"
    if not file_path.exists():
        return HTMLResponse("<h1>Error: head.html not found</h1>", status_code=404)
    return FileResponse(file_path)

# 清除聊天记录和聊天功能
# 初始化大模型
api_key = os.getenv("DASHSCOPE_API_KEY")
if not api_key:
    raise RuntimeError("环境变量 DASHSCOPE_API_KEY 未设置！")

llm = ChatOpenAI(
    api_key=api_key,
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    model="qwen-max"
)

# 聊天历史记录
chat_history = []

# ---------- 全局异常捕获 ----------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": f"HTTP Error: {exc.detail}"},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": "请求参数校验失败", "detail": exc.errors()},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "服务器内部错误", "detail": str(exc)},
    )

# ---------- 路由 ----------

@app.get("/", response_class=HTMLResponse)
async def home():
    file_path = BASE_DIR / "static" / "index.html"
    if not file_path.exists():
        return HTMLResponse("<h1>Error: index.html not found</h1>", status_code=404)
    return FileResponse(file_path)

#多会话
session_histories = {}
@app.post("/start_session")
async def start_session():
    session_id = str(uuid4())
    session_histories[session_id] = []
    return JSONResponse(content={"session_id": session_id})

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("message")
    session_id = data.get("session_id")
    
    if not user_message:
        return JSONResponse(content={"error": "Message不能为空"}, status_code=400)
    if not session_id or session_id not in session_histories:
        return JSONResponse(content={"error": "无效的session_id"}, status_code=400)

    # 加入对应会话的历史
    session_histories[session_id].append(user_message)

    # 调用大模型
    try:
        response = llm.invoke(user_message)
        print("Raw response:", response)
    except Exception as e:
        print("Error:", e)
        return JSONResponse(content={"error": str(e)}, status_code=500)

    # 保存AI回复
    session_histories[session_id].append(response.content)
    return JSONResponse(content={"response": response.content})


@app.post("/clear")
async def clear_chat(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id or session_id not in session_histories:
        return JSONResponse(content={"error": "无效的session_id"}, status_code=400)

    session_histories[session_id] = []
    return JSONResponse(content={"message": "聊天记录已清除"})


@app.get("/debug-file")
async def debug_file():
    file_path = BASE_DIR / "static" / "index.html"
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            return {
                "exists": True,
                "content_length": len(content),
                "first_100_chars": content[:100]
            }
    except Exception as e:
        return {"error": str(e)}


# 注册路由
app.include_router(detect_router.router, prefix="")  # 检测接口

@app.get("/favicon.ico")
async def get_favicon():
    return FileResponse("favicon.ico")
