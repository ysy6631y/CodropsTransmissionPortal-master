import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";

const StripeMaterial = shaderMaterial(
  {},
  /*glsl*/ `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /*glsl*/ `
    varying vec3 vPosition;
    void main() {
      float stripes = smoothstep(0.95, 1.0, sin(vPosition.z * 30.0));
      float fadeOut = smoothstep(-0.9, 0.1, vPosition.z);
      gl_FragColor = vec4(fadeOut * 0.2 * vec3(stripes), 1.0);
    }
  `
);

extend({ StripeMaterial });

export function DepthBG() {
  return (
    <mesh frustumCulled={false}>
      <boxGeometry args={[1.5, 2, 1.5]} />
      <stripeMaterial side={THREE.BackSide} />
    </mesh>
  );
}
