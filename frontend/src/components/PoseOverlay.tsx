import { useEvent } from 'expo';
import type { VideoPlayer } from 'expo-video';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { PoseData } from '../types/pose';
import { getPoseFrame, getVisiblePoints, POINT_COLORS, POSE_CONNECTIONS } from '../utils/pose';

export default function PoseOverlay({ player, data }: { player: VideoPlayer; data: PoseData }) {
  const time = useEvent(player, 'timeUpdate');
  const currentTime = time?.currentTime ?? player.currentTime;
  const points = getVisiblePoints(getPoseFrame(data, currentTime));
  const byId = new Map(points.map(point => [point.id, point]));

  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${data.width} ${data.height}`}>
      {POSE_CONNECTIONS.map(([start, end]) => {
        const a = byId.get(start);
        const b = byId.get(end);
        if (!a || !b) return null;
        return <Line key={`${start}-${end}`}
          x1={a.image.x * data.width} y1={a.image.y * data.height}
          x2={b.image.x * data.width} y2={b.image.y * data.height}
          stroke={POINT_COLORS[end]} strokeWidth={2} />;
      })}
      {points.map(point => <Circle key={point.id}
        cx={point.image.x * data.width} cy={point.image.y * data.height}
        r={3} fill={POINT_COLORS[point.id]} />)}
    </Svg>
  </View>;
}
