import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { FPS, SCENE_DURATIONS } from "./constants";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Title } from "./scenes/Scene2Title";
import { Scene3LiveDemo } from "./scenes/Scene3LiveDemo";
import { Scene4LocalOllama } from "./scenes/Scene4LocalOllama";
import { Scene5Benchmark } from "./scenes/Scene5Benchmark";
import { Scene6Impact } from "./scenes/Scene6Impact";
import { Scene7CTA } from "./scenes/Scene7CTA";

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
      {/* 배경 음악 (전체 180초) */}
      <Audio src={staticFile("audio/bgm.mp3")} volume={0.15} />

      {/* 내레이션 — 각 Scene 시작에 맞춰 재생 */}
      <Sequence from={S1 + 10}>
        <Audio src={staticFile("audio/narration-s1.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={S2 + 15}>
        <Audio src={staticFile("audio/narration-s2.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={S3 + 10}>
        <Audio src={staticFile("audio/narration-s3.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={S4 + 10}>
        <Audio src={staticFile("audio/narration-s4.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={S5 + 10}>
        <Audio src={staticFile("audio/narration-s5.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={S6 + 10}>
        <Audio src={staticFile("audio/narration-s6.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={S7 + 10}>
        <Audio src={staticFile("audio/narration-s7.mp3")} volume={0.9} />
      </Sequence>

      {/* 비주얼 Scenes */}
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
