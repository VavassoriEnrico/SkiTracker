import json
from pathlib import Path
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.integrations.video_reader.video_reader import analyze_video
from app.integrations.skeleton_renderer.skeleton_renderer import render_skeleton


class VideoAnalysisState(TypedDict, total=False):
    video_path: str
    output_dir: str
    pose_results: dict
    skeleton_path: str
    pose_data_path: str


def extract_pose(state: VideoAnalysisState) -> dict:
    results = analyze_video(state["video_path"])
    return {"pose_results": results}


def create_skeleton(state: VideoAnalysisState) -> dict:
    folder = Path(state["output_dir"])
    results = state["pose_results"]

    skeleton_path = render_skeleton(results, str(folder / "skeleton_only.mp4"))

    pose_data_path = folder / "pose_results.json"
    with pose_data_path.open("w") as file:
        json.dump(results, file, indent=2)

    return {
        "skeleton_path": skeleton_path,
        "pose_data_path": str(pose_data_path),
    }


builder = StateGraph(VideoAnalysisState)

builder.add_node("extract_pose", extract_pose)
builder.add_node("create_skeleton", create_skeleton)

builder.add_edge(START, "extract_pose")
builder.add_edge("extract_pose", "create_skeleton")
builder.add_edge("create_skeleton", END)

video_analysis_graph = builder.compile()
