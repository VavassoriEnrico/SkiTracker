import asyncio
import json
import unittest
from datetime import date, time
from io import BytesIO
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from starlette.datastructures import Headers

from app.models.ski_instructor import SkiInstructor
from app.models.ski_lesson import SkiLesson
from app.models.ski_videos import SkiVideo
from app.models.ski_customer import SkiCustomer
from app.models.ski_lesson_customer import SkiLessonCustomer
from app.schemas.ski_videos import SkiVideoUpdate
from app.services import ski_videos_service as service
from app.services import ski_video_analysis_service as analysis_service
from app.services import video_storage
from app.main import app
from app.db_dependency import get_db
from app.dependency_auth import get_current_user
from test_ski_instructor_routes import request


class SkiVideoServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SkiInstructor.__table__.create(self.engine)
        SkiCustomer.__table__.create(self.engine)
        SkiLesson.__table__.create(self.engine)
        SkiLessonCustomer.__table__.create(self.engine)
        with self.engine.begin() as connection:
            connection.exec_driver_sql("""
                CREATE TABLE ski_lesson_videos (
                    id INTEGER PRIMARY KEY,
                    lesson_id BIGINT NOT NULL REFERENCES ski_lessons(id) ON DELETE CASCADE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    video_url TEXT NOT NULL,
                    comment TEXT,
                    customer_id CHAR(32),
                    storage_path TEXT,
                    skeleton_video_url TEXT,
                    pose_data_url TEXT
                )
            """)
        self.db = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        self.instructor_id = uuid4()
        self.other_id = uuid4()
        self.db.add_all([SkiInstructor(id=self.instructor_id), SkiInstructor(id=self.other_id)])
        self.db.commit()
        self.customer_id = uuid4()
        self.db.add(SkiCustomer(id=self.customer_id))
        self.db.commit()
        self.db.add(SkiLesson(id=100, instructor_id=self.instructor_id, lesson_date=date(2030, 1, 1), start_time=time(9), end_time=time(10)))
        self.db.commit()
        self.db.add(SkiLessonCustomer(lesson_id=100, customer_id=self.customer_id))
        self.db.commit()

    def create(self, **changes):
        data = dict(instructor_id=self.instructor_id, lesson_id=100, video_url="https://example.com/video.mp4")
        data.update(changes)
        return service.create_video(self.db, **data)

    def test_create_generates_id_and_timestamp_and_returns_lesson_videos(self):
        self.assertEqual(service.get_videos_by_lesson(self.db, 100, self.instructor_id), [])
        video = self.create(comment="Example comment")
        self.assertIsNotNone(video.id)
        self.assertIsNotNone(video.created_at)
        self.assertEqual(video.comment, "Example comment")
        self.assertEqual(service.get_videos_by_lesson(self.db, 100, self.instructor_id)[0].id, video.id)

    def test_comment_can_be_updated_and_cleared_without_changing_video(self):
        video = self.create()
        updated = service.update_comment(self.db, video.id, self.instructor_id, "New comment")
        self.assertEqual(updated.comment, "New comment")
        cleared = service.update_comment(self.db, video.id, self.instructor_id, None)
        self.assertIsNone(cleared.comment)
        self.assertEqual(cleared.video_url, "https://example.com/video.mp4")
        self.assertEqual(cleared.lesson_id, 100)

    def test_delete_preserves_other_videos_and_the_lesson(self):
        first = self.create()
        second = self.create(video_url="https://example.com/other.mp4")
        video_id = first.id
        service.delete_video(self.db, video_id, self.instructor_id)
        self.assertIsNone(self.db.get(SkiVideo, video_id))
        self.assertIsNotNone(self.db.get(SkiVideo, second.id))
        self.assertIsNotNone(self.db.get(SkiLesson, 100))

    def test_other_instructor_cannot_access_or_modify_videos(self):
        video = self.create(comment="Original")
        operations = [
            lambda: service.get_videos_by_lesson(self.db, 100, self.other_id),
            lambda: self.create(instructor_id=self.other_id),
            lambda: service.get_video(self.db, video.id, self.other_id),
            lambda: service.update_comment(self.db, video.id, self.other_id, "Changed"),
            lambda: service.delete_video(self.db, video.id, self.other_id),
        ]
        for operation in operations:
            with self.assertRaises(HTTPException) as raised:
                operation()
            self.assertEqual(raised.exception.status_code, 404)
        self.db.refresh(video)
        self.assertEqual(video.comment, "Original")
        self.assertEqual(self.db.query(SkiVideo).count(), 1)

    def test_missing_lesson_or_video_returns_404(self):
        for operation in (
            lambda: self.create(lesson_id=999),
            lambda: service.get_video(self.db, 999, self.instructor_id),
        ):
            with self.assertRaises(HTTPException) as raised:
                operation()
            self.assertEqual(raised.exception.status_code, 404)

    def test_video_can_be_linked_only_to_lesson_participants(self):
        video = self.create(customer_id=self.customer_id, comment="Original")
        updated = service.update_video(self.db, video.id, self.instructor_id, SkiVideoUpdate(customer_id=None))
        self.assertIsNone(updated.customer_id)
        self.assertEqual(updated.comment, "Original")
        with self.assertRaises(HTTPException) as raised:
            self.create(customer_id=uuid4())
        self.assertEqual(raised.exception.status_code, 400)

    def video_file(self, content=b"video", content_type="video/mp4"):
        return UploadFile(filename="video.mp4", file=BytesIO(content), headers=Headers({"content-type": content_type}))

    @patch("app.services.ski_videos_service.video_storage.delete")
    @patch("app.services.ski_videos_service.video_storage.upload", return_value="https://example.com/upload.mp4")
    def test_upload_records_participant_and_deletes_its_storage_file(self, upload, delete):
        video = service.upload_video(self.db, instructor_id=self.instructor_id, lesson_id=100,
                                     file=self.video_file(), customer_id=self.customer_id)
        self.assertEqual(video.customer_id, self.customer_id)
        self.assertTrue(video.storage_path.startswith("100/"))
        self.assertEqual(upload.call_args.args[1:], (b"video", "video/mp4"))
        path = video.storage_path
        service.delete_video(self.db, video.id, self.instructor_id)
        delete.assert_called_once_with(path)

    @patch("app.services.ski_videos_service.video_storage.upload")
    def test_invalid_uploads_do_not_reach_storage(self, upload):
        for changes in ({"instructor_id": self.other_id}, {"customer_id": uuid4()},
                        {"file": self.video_file(b"")}, {"file": self.video_file(content_type="text/plain")}):
            data = dict(instructor_id=self.instructor_id, lesson_id=100, file=self.video_file())
            data.update(changes)
            with self.assertRaises(HTTPException):
                service.upload_video(self.db, **data)
        with patch.object(service, "MAX_VIDEO_SIZE", 2):
            with self.assertRaises(HTTPException):
                service.upload_video(self.db, instructor_id=self.instructor_id, lesson_id=100, file=self.video_file())
        upload.assert_not_called()

    @patch("app.services.ski_videos_service.video_storage.delete")
    @patch("app.services.ski_videos_service.video_storage.upload", return_value="https://example.com/upload.mp4")
    def test_failed_database_save_cleans_up_new_file(self, upload, delete):
        with patch.object(service.ski_videos_repository, "create", side_effect=RuntimeError("Database unavailable")):
            with self.assertRaises(RuntimeError):
                service.upload_video(self.db, instructor_id=self.instructor_id, lesson_id=100, file=self.video_file())
        delete.assert_called_once_with(upload.call_args.args[0])

    def route_setup(self):
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: {"id": str(self.instructor_id)}
        self.addCleanup(app.dependency_overrides.clear)

    def test_routes_create_list_update_and_delete(self):
        self.route_setup()
        status, video = asyncio.run(request("POST", {
            "lesson_id": 100, "video_url": "https://example.com/video.mp4", "customer_id": str(self.customer_id),
        }, path="/ski_videos"))
        self.assertEqual(status, 201)
        self.assertEqual(video["customer_id"], str(self.customer_id))
        status, videos = asyncio.run(request("GET", path="/ski_videos", query_string=b"lesson_id=100"))
        self.assertEqual(status, 200)
        self.assertEqual(len(videos), 1)
        status, video = asyncio.run(request("PATCH", {"comment": "Good turn"}, path=f"/ski_videos/{video['id']}"))
        self.assertEqual(status, 200)
        self.assertEqual(video["comment"], "Good turn")
        self.assertEqual(video["customer_id"], str(self.customer_id))
        status, video = asyncio.run(request("PATCH", {"comment": None}, path=f"/ski_videos/{video['id']}"))
        self.assertIsNone(video["comment"])
        status, _ = asyncio.run(request("DELETE", path=f"/ski_videos/{video['id']}"))
        self.assertEqual(status, 204)

    def test_routes_reject_other_instructors_and_require_login(self):
        self.route_setup()
        video = self.create()
        app.dependency_overrides[get_current_user] = lambda: {"id": str(self.other_id)}
        for method, path, payload in (
            ("GET", "/ski_lesson/100", None),
            ("GET", "/ski_videos?lesson_id=100", None),
            ("PATCH", f"/ski_videos/{video.id}", {"comment": "Changed"}),
            ("DELETE", f"/ski_videos/{video.id}", None),
        ):
            path, _, query = path.partition("?")
            status, _ = asyncio.run(request(method, payload, path=path, query_string=query.encode()))
            self.assertEqual(status, 404)
        del app.dependency_overrides[get_current_user]
        status, _ = asyncio.run(request("GET", path="/ski_videos", query_string=b"lesson_id=100"))
        self.assertEqual(status, 401)

    def test_lesson_detail_route_returns_participants(self):
        self.route_setup()
        status, lesson = asyncio.run(request("GET", path="/ski_lesson/100"))
        self.assertEqual(status, 200)
        self.assertEqual(lesson["customer_ids"], [str(self.customer_id)])

    @patch("app.services.ski_videos_service.video_storage.upload", return_value="https://example.com/upload.mp4")
    def test_upload_route_accepts_multipart_and_records_the_client(self, upload):
        self.route_setup()
        boundary = "skitracker-test-boundary"
        body = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="lesson_id"\r\n\r\n100\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="customer_id"\r\n\r\n{self.customer_id}\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="comment"\r\n\r\nTurn practice\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="video.mp4"\r\n'
            f'Content-Type: video/mp4\r\n\r\nvideo bytes\r\n--{boundary}--\r\n'
        ).encode()
        status, video = asyncio.run(request("POST", path="/ski_videos/upload", raw_body=body,
                                           content_type=f"multipart/form-data; boundary={boundary}"))
        self.assertEqual(status, 201)
        self.assertEqual(video["customer_id"], str(self.customer_id))
        self.assertEqual(video["comment"], "Turn practice")
        self.assertEqual(upload.call_args.args[1], b"video bytes")

    def mock_analysis(self):
        def run_graph(state):
            folder = Path(state["output_dir"])
            folder.mkdir()
            skeleton = folder / "skeleton_only.mp4"
            points = folder / "pose_results.json"
            skeleton.write_bytes(b"skeleton video")
            points.write_text(json.dumps({"fps": 25, "width": 848, "height": 478, "frames": []}))
            return {"skeleton_path": str(skeleton), "pose_data_path": str(points)}

        graph = self.enterContext(patch.object(analysis_service.video_analysis_graph, "invoke", side_effect=run_graph))
        download = self.enterContext(patch.object(video_storage, "download", side_effect=lambda path, target: target.write_bytes(b"original video")))
        upload = self.enterContext(patch.object(video_storage, "upload", side_effect=lambda path, content, mime: f"https://storage.example/storage/v1/object/public/lesson-videos/{path}"))
        delete = self.enterContext(patch.object(video_storage, "delete"))
        self.enterContext(patch.object(video_storage.settings, "supabase_url", "https://storage.example"))
        return graph, download, upload, delete

    def test_analysis_route_persists_urls_and_reuses_saved_results(self):
        self.route_setup()
        graph, download, upload, _ = self.mock_analysis()
        video = self.create(storage_path="100/original.mp4", comment="Keep this comment", customer_id=self.customer_id)
        status, body = asyncio.run(request("POST", path=f"/ski_videos/{video.id}/analyze"))
        self.assertEqual(status, 200)
        self.assertTrue(body["skeleton_video_url"].endswith("/skeleton_only.mp4"))
        self.assertTrue(body["pose_data_url"].endswith("/pose_results.json"))
        self.assertEqual(body["comment"], "Keep this comment")
        self.assertEqual(body["customer_id"], str(self.customer_id))
        self.assertEqual([call.args[2] for call in upload.call_args_list], ["video/mp4", "application/json"])
        self.assertFalse(Path(graph.call_args.args[0]["output_dir"]).exists())

        self.db.expire_all()
        again = analysis_service.analyze_video(self.db, video.id, self.instructor_id)
        self.assertEqual(again.pose_data_url, body["pose_data_url"])
        graph.assert_called_once()
        download.assert_called_once()
        self.assertEqual(upload.call_count, 2)

    def test_analysis_requires_owner_and_login_before_downloading(self):
        self.route_setup()
        _, download, _, _ = self.mock_analysis()
        video = self.create(storage_path="100/original.mp4")
        app.dependency_overrides[get_current_user] = lambda: {"id": str(self.other_id)}
        status, _ = asyncio.run(request("POST", path=f"/ski_videos/{video.id}/analyze"))
        self.assertEqual(status, 404)
        del app.dependency_overrides[get_current_user]
        status, _ = asyncio.run(request("POST", path=f"/ski_videos/{video.id}/analyze"))
        self.assertEqual(status, 401)
        download.assert_not_called()

    def test_analysis_rejects_external_video_urls_without_downloading(self):
        _, download, _, _ = self.mock_analysis()
        video = self.create(video_url="http://localhost/private")
        with self.assertRaises(HTTPException) as raised:
            analysis_service.analyze_video(self.db, video.id, self.instructor_id)
        self.assertEqual(raised.exception.status_code, 400)
        download.assert_not_called()

    def test_failed_json_upload_removes_only_new_skeleton_and_keeps_video(self):
        graph, _, upload, delete = self.mock_analysis()
        video = self.create(storage_path="100/original.mp4")
        upload.side_effect = ["https://storage.example/new.mp4", HTTPException(status_code=503, detail="Upload failed")]
        with self.assertRaises(HTTPException):
            analysis_service.analyze_video(self.db, video.id, self.instructor_id)
        delete.assert_called_once_with(upload.call_args_list[0].args[0])
        self.db.refresh(video)
        self.assertIsNone(video.skeleton_video_url)
        self.assertIsNone(video.pose_data_url)
        self.assertEqual(video.storage_path, "100/original.mp4")
        self.assertFalse(Path(graph.call_args.args[0]["output_dir"]).exists())

    def test_failed_commit_cleans_up_both_new_analysis_files(self):
        _, _, upload, delete = self.mock_analysis()
        video = self.create(storage_path="100/original.mp4")
        with patch.object(self.db, "commit", side_effect=RuntimeError("Database unavailable")):
            with self.assertLogs("app.services.ski_video_analysis_service", level="ERROR"), self.assertRaises(HTTPException) as raised:
                analysis_service.analyze_video(self.db, video.id, self.instructor_id)
        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual([call.args[0] for call in delete.call_args_list], [call.args[0] for call in upload.call_args_list])
        self.db.refresh(video)
        self.assertIsNone(video.skeleton_video_url)

    def test_deleting_analyzed_video_removes_all_three_files(self):
        self.mock_analysis()
        video = self.create(storage_path="100/original.mp4")
        video = analysis_service.analyze_video(self.db, video.id, self.instructor_id)
        with patch.object(video_storage, "delete") as delete:
            service.delete_video(self.db, video.id, self.instructor_id)
        self.assertEqual(delete.call_count, 3)
        self.assertEqual(delete.call_args_list[-1].args[0], "100/original.mp4")
