import { Composition } from "remotion";
import { FPS, WIDTH, HEIGHT, SCENE_DURATIONS, TOTAL_FRAMES } from "./constants";
import { Main } from "./Main";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Title } from "./scenes/Scene2Title";
import { Scene3LiveDemo } from "./scenes/Scene3LiveDemo";
import { Scene4LocalOllama } from "./scenes/Scene4LocalOllama";
import { Scene5Benchmark } from "./scenes/Scene5Benchmark";
import { Scene6Impact } from "./scenes/Scene6Impact";
import { Scene7CTA } from "./scenes/Scene7CTA";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene1Hook"
        component={Scene1Hook}
        durationInFrames={SCENE_DURATIONS.hook * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene2Title"
        component={Scene2Title}
        durationInFrames={SCENE_DURATIONS.title * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene3LiveDemo"
        component={Scene3LiveDemo}
        durationInFrames={SCENE_DURATIONS.liveDemo * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene4LocalOllama"
        component={Scene4LocalOllama}
        durationInFrames={SCENE_DURATIONS.localOllama * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene5Benchmark"
        component={Scene5Benchmark}
        durationInFrames={SCENE_DURATIONS.benchmark * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene6Impact"
        component={Scene6Impact}
        durationInFrames={SCENE_DURATIONS.impact * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene7CTA"
        component={Scene7CTA}
        durationInFrames={SCENE_DURATIONS.cta * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
