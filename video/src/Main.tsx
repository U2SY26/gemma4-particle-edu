import { AbsoluteFill, Sequence } from "remotion";
import { FPS, SCENE_DURATIONS } from "./constants";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Title } from "./scenes/Scene2Title";
import { Scene3LiveDemo } from "./scenes/Scene3LiveDemo";
import { Scene4LocalOllama } from "./scenes/Scene4LocalOllama";
import { Scene5Benchmark } from "./scenes/Scene5Benchmark";
import { Scene6Impact } from "./scenes/Scene6Impact";
import { Scene7CTA } from "./scenes/Scene7CTA";

// Scene 시작 프레임 계산
const S1 = 0;
const S2 = S1 + SCENE_DURATIONS.hook * FPS;
const S3 = S2 + SCENE_DURATIONS.title * FPS;
const S4 = S3 + SCENE_DURATIONS.liveDemo * FPS;
const S5 = S4 + SCENE_DURATIONS.localOllama * FPS;
const S6 = S5 + SCENE_DURATIONS.benchmark * FPS;
const S7 = S6 + SCENE_DURATIONS.impact * FPS;

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1117" }}>
      <Sequence from={S1} durationInFrames={SCENE_DURATIONS.hook * FPS}>
        <Scene1Hook />
      </Sequence>
      <Sequence from={S2} durationInFrames={SCENE_DURATIONS.title * FPS}>
        <Scene2Title />
      </Sequence>
      <Sequence from={S3} durationInFrames={SCENE_DURATIONS.liveDemo * FPS}>
        <Scene3LiveDemo />
      </Sequence>
      <Sequence from={S4} durationInFrames={SCENE_DURATIONS.localOllama * FPS}>
        <Scene4LocalOllama />
      </Sequence>
      <Sequence from={S5} durationInFrames={SCENE_DURATIONS.benchmark * FPS}>
        <Scene5Benchmark />
      </Sequence>
      <Sequence from={S6} durationInFrames={SCENE_DURATIONS.impact * FPS}>
        <Scene6Impact />
      </Sequence>
      <Sequence from={S7} durationInFrames={SCENE_DURATIONS.cta * FPS}>
        <Scene7CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
