import cv2

from app.integrations.models.mediapipe_pose import MediaPipePose


def analyze_video(path: str) -> dict:
    video = cv2.VideoCapture(path)
    results = []
    frame_number = 0
    model = None

    try:
        if not video.isOpened():
            raise ValueError("Unable to read the video.")

        fps = video.get(cv2.CAP_PROP_FPS)
        width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if fps <= 0 or width <= 0 or height <= 0:
            raise ValueError("Invalid video dimensions or frame rate.")

        model = MediaPipePose()

        while True:
            success, frame = video.read()

            if not success:
                break

            timestamp_ms = round(frame_number * 1000 / fps)

            result = model.detect(
                frame=frame,
                frame_number=frame_number,
                timestamp_ms=timestamp_ms,
            )

            results.append(result)
            frame_number += 1

        if not results:
            raise ValueError("The video contains no readable frames.")

    finally:
        video.release()
        if model is not None:
            model.close()

    return {
        "fps": fps,
        "width": width,
        "height": height,
        "frames": results,
    }
