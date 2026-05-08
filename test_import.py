# from ultralytics import YOLO
# import cv2

# model = YOLO("best.pt")
# img = cv2.imread("debug_image.jpg")
# results = model(img)

# # 打印预测框信息
# for box in results[0].boxes:
#     print(box.xyxy, box.conf, box.cls)

# from ultralytics import YOLO
# from PIL import Image

# model = YOLO("best.pt")
# img = Image.open("debug_image.jpg")  # 使用 PIL 读取图像
# results = model(img)

# for box in results[0].boxes:
#     print(box.xyxy, box.conf, box.cls)

# import cv2
# print(cv2.__version__)
from ultralytics import YOLO

# 加载模型
model = YOLO(r'D:\Code\pythonCode\HaiChongShiBie\best.pt')

# # 运行预测
# results = model.predict(source=r"D:\dataset\IP102\IP102_clear\Result\AllKnow\test\images", save=True)

model.val(data=r"D:\dataset\IP102\IP102_clear\Result\AllKnow\data_fixed.yaml")  # 用于评估 mAP、精确率、召回率等
