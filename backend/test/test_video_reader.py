import unittest
from unittest.mock import MagicMock, patch

import cv2

from app.integrations.video_reader import video_reader


class VideoReaderTests(unittest.TestCase):
    def setUp(self):
        self.capture = MagicMock()
        self.capture.isOpened.return_value = True
        self.capture.get.side_effect = lambda key: {
            cv2.CAP_PROP_FPS: 25,
            cv2.CAP_PROP_FRAME_WIDTH: 848,
            cv2.CAP_PROP_FRAME_HEIGHT: 478,
        }[key]
        self.enterContext(patch.object(video_reader.cv2, "VideoCapture", return_value=self.capture))
        self.model = self.enterContext(patch.object(video_reader, "MediaPipePose"))

    def test_unreadable_video_is_released_without_loading_model(self):
        self.capture.isOpened.return_value = False
        with self.assertRaises(ValueError):
            video_reader.analyze_video("invalid.mp4")
        self.capture.release.assert_called_once()
        self.model.assert_not_called()

    def test_zero_fps_is_rejected_before_loading_model(self):
        self.capture.get.return_value = 0
        self.capture.get.side_effect = None
        with self.assertRaises(ValueError):
            video_reader.analyze_video("invalid.mp4")
        self.capture.release.assert_called_once()
        self.model.assert_not_called()

    def test_failed_model_initialization_still_releases_video(self):
        self.model.side_effect = RuntimeError("Unable to load model")
        with self.assertRaises(RuntimeError):
            video_reader.analyze_video("video.mp4")
        self.capture.release.assert_called_once()

    def test_empty_video_is_rejected_and_resources_are_closed(self):
        self.capture.read.return_value = (False, None)
        with self.assertRaises(ValueError):
            video_reader.analyze_video("empty.mp4")
        self.capture.release.assert_called_once()
        self.model.return_value.close.assert_called_once()

    def test_failed_detection_closes_video_and_model(self):
        self.capture.read.return_value = (True, object())
        self.model.return_value.detect.side_effect = RuntimeError("Detection failed")
        with self.assertRaises(RuntimeError):
            video_reader.analyze_video("video.mp4")
        self.capture.release.assert_called_once()
        self.model.return_value.close.assert_called_once()
