type Coordinates = { x: number; y: number; z: number };

export type PosePoint = {
  id: number;
  image: Coordinates;
  world: Coordinates;
  visibility: number;
  presence: number;
};

export type PoseFrame = {
  frame: number;
  timestamp_ms: number;
  points: Record<string, PosePoint>;
};

export type PoseData = {
  fps: number;
  width: number;
  height: number;
  frames: PoseFrame[];
};
