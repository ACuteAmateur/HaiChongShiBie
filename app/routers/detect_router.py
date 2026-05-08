from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from ..detection import PestDetector

router = APIRouter()

# 初始化检测器
# detector = PestDetector("best.onnx")
detector = PestDetector("best.pt")

@router.get("/test")  # 添加一个测试路由
def test():
    return {"status": "OK"}

@router.post("/detect")
async def detect(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="上传文件为空")

        img = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="图片解码失败")

        # 数据验证
        if not isinstance(img, np.ndarray) or img.size == 0:
            raise HTTPException(status_code=400, detail="无效的图片数据")
        if img.dtype != np.uint8:
            img = img.astype(np.uint8)
        if not img.flags['C_CONTIGUOUS']:
            img = np.ascontiguousarray(img)
        # 执行检测
        boxes, scores, class_ids = detector.detect(img)
        results = [
            {"bbox": box.tolist(), "score": float(score), "class_id": int(class_id)}
            for box, score, class_id in zip(boxes, scores, class_ids)
        ]

        return JSONResponse(content={"results": results})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")
