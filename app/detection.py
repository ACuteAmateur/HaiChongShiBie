
from ultralytics import YOLO
import torch
import numpy as np
import cv2

class PestDetector:
    def __init__(self, model_path: str, num_classes: int = 43):
        self.model = YOLO(model_path)
        self.model.fuse()  # 可选：提高推理速度
        self.num_classes = num_classes
        if not self.model or not hasattr(self.model, "predict"):
            raise RuntimeError("模型加载失败，请检查路径或模型格式")

    def detect(self, image: np.ndarray):
        try:
            results = self.model(image, verbose=False)[0]

            boxes = results.boxes.xyxy.cpu().numpy()  # shape (N, 4)
            scores = results.boxes.conf.cpu().numpy()  # shape (N,)
            class_ids = results.boxes.cls.cpu().numpy().astype(int)  # shape (N,)

            return boxes, scores, class_ids
        except Exception as e:
            print(f"推理失败: {str(e)}")
            return np.array([]), np.array([]), np.array([])

    def draw_detections(self, image, boxes, scores, class_ids, class_names):
        for box, score, cls_id in zip(boxes, scores, class_ids):
            x1, y1, x2, y2 = map(int, box)
            label = f"{class_names[cls_id]} {score:.2f}"
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(image, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX,
                        0.5, (0, 255, 0), 2)
        return image
