from pathlib import Path
from urllib.request import urlretrieve

import cv2
import mediapipe as mp
from mediapipe.tasks.python import vision


MODEL_PATH = (
    Path(__file__).resolve().parent
    / "weights"
    / "pose_landmarker_heavy.task"
)

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_heavy/float16/1/"
    "pose_landmarker_heavy.task"
)

POINT_NAMES = [
    "nose",
    "left_eye_inner",
    "left_eye",
    "left_eye_outer",
    "right_eye_inner",
    "right_eye",
    "right_eye_outer",
    "left_ear",
    "right_ear",
    "mouth_left",
    "mouth_right",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_pinky",
    "right_pinky",
    "left_index",
    "right_index",
    "left_thumb",
    "right_thumb",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "left_heel",
    "right_heel",
    "left_foot_index",
    "right_foot_index",
]


class MediaPipePose:
    def __init__(self):
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

        if not MODEL_PATH.exists():
            urlretrieve(MODEL_URL, MODEL_PATH)

        options = vision.PoseLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(
                model_asset_path=str(MODEL_PATH)
            ),
            running_mode=vision.RunningMode.VIDEO,
            num_poses=1,
        )

        self.model = vision.PoseLandmarker.create_from_options(options)

    def detect(self, frame, frame_number: int, timestamp_ms: int) -> dict:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame,
        )

        result = self.model.detect_for_video(image, timestamp_ms)

        data = {
            "frame": frame_number,
            "timestamp_ms": timestamp_ms,
            "points": {},
        }

        if not result.pose_landmarks:
            return data

        image_points = result.pose_landmarks[0]
        world_points = result.pose_world_landmarks[0]

        for index, name in enumerate(POINT_NAMES):
            point = image_points[index]
            world_point = world_points[index]

            data["points"][name] = {
                "id": index,
                "image": {
                    "x": point.x,
                    "y": point.y,
                    "z": point.z,
                },
                "world": {
                    "x": world_point.x,
                    "y": world_point.y,
                    "z": world_point.z,
                },
                "visibility": point.visibility,
                "presence": point.presence,
            }

        return data

    def close(self):
        self.model.close()