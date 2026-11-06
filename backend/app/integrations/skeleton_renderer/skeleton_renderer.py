from pathlib import Path

import cv2
import numpy as np
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.components.containers.landmark import NormalizedLandmark

YELLOW = (0, 255, 255)
GREEN = (0, 255, 0)
RED = (0, 0, 255)
BLUE = (255, 128, 0)

POINT_COLORS = (
    [YELLOW] * 11  # Face: 0-10
    + [BLUE] * 2  # Shoulders: 11-12
    + [GREEN] * 10  # Arms and hands: 13-22
    + [BLUE] * 2  # Hips: 23-24
    + [RED] * 8  # Legs and feet: 25-32
)

POINT_STYLES = {
    index: vision.drawing_utils.DrawingSpec(color=color, thickness=2, circle_radius=3)
    for index, color in enumerate(POINT_COLORS)
}

CONNECTION_STYLES = {
    (edge.start, edge.end): vision.drawing_utils.DrawingSpec(
        color=POINT_COLORS[edge.end], thickness=2,
    )
    for edge in vision.PoseLandmarksConnections.POSE_LANDMARKS
}


def draw_skeleton(frame, points: dict) -> None:
    if not points:
        return

    landmarks = [
        NormalizedLandmark(
            **point["image"],
            visibility=point["visibility"],
            presence=point["presence"],
        )
        for point in sorted(points.values(), key=lambda point: point["id"])
    ]

    vision.drawing_utils.draw_landmarks(
        frame,
        landmarks,
        vision.PoseLandmarksConnections.POSE_LANDMARKS,
        landmark_drawing_spec=POINT_STYLES,
        connection_drawing_spec=CONNECTION_STYLES,
    )


def render_skeleton(results: dict, output_path: str = "outputs/skeleton_only.mp4") -> str:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    width = results["width"]
    height = results["height"]
    codec = cv2.VideoWriter_fourcc(*"avc1")
    video = cv2.VideoWriter(str(path), codec, results["fps"], (width, height))

    try:
        if not video.isOpened():
            raise ValueError("Unable to create the skeleton video.")

        for result in results["frames"]:
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            draw_skeleton(frame, result["points"])
            video.write(frame)

    finally:
        video.release()

    return str(path)


