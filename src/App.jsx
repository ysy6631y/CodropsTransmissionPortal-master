import { memo, useCallback, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  MeshTransmissionMaterial,
  OrbitControls,
  RoundedBox,
  useFBO,
  useTexture,
} from "@react-three/drei";
import { Splat } from "./splat";
import { DepthBG } from "./DepthBG";
import { ZoomOverlay } from "./ZoomOverlay";
import { Leva, useControls } from "leva";

const levaTheme = {
  colors: {
    elevation1: "rgba(18, 18, 32, 0.92)",
    elevation2: "rgba(24, 24, 48, 0.9)",
    elevation3: "rgba(63, 215, 255, 0.4)",
    accent1: "#3fd7ff",
    accent2: "#ff4db8",
    accent3: "#ffffff",
    highlight1: "#3fd7ff",
    highlight2: "#ff4db8",
    highlight3: "#ffffff",
    folderTextColor: "#ffffff",
    toolTipBackground: "rgba(10, 10, 28, 0.95)",
    toolTipText: "#ffffff",
  },
  sizes: {
    rootWidth: "260px",
  },
  fonts: {
    mono: "ui-monospace, SFMono-Regular, Menlo, 'Roboto Mono', monospace",
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};

const GlassModel = memo(function GlassModel() {
  const {
    roughness,
    transmission,
    rotation,
    showOriginal,
    color,
    distortion,
    destruction,
    rgbGlitch,
    mosaic,
  } = useControls({
    roughness: { value: 0.05, min: 0, max: 1 },
    transmission: { value: 1, min: 0, max: 1 },
    distortion: { value: 0.6, min: 0, max: 2, step: 0.01, label: "Distortion" },
    destruction: { value: 0, min: 0, max: 1, step: 0.01, label: "Degree" },
    rgbGlitch: { value: 0.8, min: 0, max: 2, step: 0.01, label: "RGB Split" },
    mosaic: { value: 0.5, min: 0, max: 1, step: 0.01, label: "Mosaic" },
    rotation: { value: 1.4 * Math.PI, min: 0, max: 2 * Math.PI },
    showOriginal: { value: false },
    color: { value: "#fff" },
  });
  const buffer = useFBO();
  const baseRef = useRef();
  const glassRef = useRef();
  const material = useRef();
  const normalMap = useTexture("glass1.jpg");
  normalMap.wrapS = normalMap.wrapT = 1000;

  useFrame((state) => {
    if (!baseRef.current || !glassRef.current) return;
    baseRef.current.visible = true;
    glassRef.current.visible = false;
    state.gl.setRenderTarget(buffer);
    state.gl.render(state.scene, state.camera);
    state.gl.setRenderTarget(null);
    baseRef.current.visible = showOriginal;
    glassRef.current.visible = true;
    if (material.current) {
      material.current.color.set(color);
      material.current.roughness = roughness;
      material.current.transmission = transmission;
    }
  });

  return (
    <>
      <group ref={baseRef}>
        <DepthBG />
        <Splat
          scale={1.4}
          distortion={distortion}
          destruction={destruction}
          rgbGlitch={rgbGlitch}
          mosaic={mosaic}
          rotation={[0, rotation, 0]}
          position={[0, -0.4, 0.2]}
          src="maty.splat"
        />
      </group>

      <RoundedBox ref={glassRef} position={[0, 0, 0.8]} args={[1.5, 2, 0.2]} radius={0.04}>
        <MeshTransmissionMaterial
          ref={material}
          transmission={transmission}
          roughness={roughness}
          thickness={0.1}
          normalMap={normalMap}
          normalScale={[0.1, 0.1]}
          color={color}
          buffer={buffer.texture}
        />
      </RoundedBox>
    </>
  );
});

const SceneCanvas = memo(function SceneCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 3], fov: 75 }} dpr={[1, 1.75]}>
      <color attach="background" args={["#111111"]} />
      <Environment preset="warehouse" blur={1} />
      <OrbitControls />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <GlassModel />
    </Canvas>
  );
});

const LevaPanel = memo(function LevaPanel() {
  return (
    <Leva
      className="glitch-panel"
      titleBar={{ title: "Portal Controls", drag: false }}
      hideTitleBar={false}
      collapsed={false}
      theme={levaTheme}
    />
  );
});

function App() {
  const [overlayOpen, setOverlayOpen] = useState(false);

  const handleToggleOverlay = useCallback(() => {
    setOverlayOpen((current) => !current);
  }, []);

  const handleOverlayClose = useCallback(() => {
    setOverlayOpen(false);
  }, []);

  return (
    <>
      <SceneCanvas />
      <button
        type="button"
        className={`hud-lens-toggle ${overlayOpen ? "is-active" : ""}`}
        onClick={handleToggleOverlay}
        aria-pressed={overlayOpen}
      >
        <span className="hud-lens-toggle__icon" aria-hidden />
        <span className="hud-lens-toggle__label">Magnifier</span>
      </button>
      <ZoomOverlay isOpen={overlayOpen} onRequestClose={handleOverlayClose} />
      <LevaPanel />
    </>
  );
}

export default App;
