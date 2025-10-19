import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'

export const SplatMaterial = shaderMaterial(
  {
    viewport: new Float32Array([1980, 1080]),
    focal: 1000.0,
    time: 0.0,
    distortion: 0.0,
    destruction: 0.0,
    rgbGlitch: 0.0,
    mosaic: 0.0,
    centerAndScaleTexture: null,
    covAndColorTexture: null,
    gsProjectionMatrix: new THREE.Matrix4(),
    gsModelViewMatrix: new THREE.Matrix4()
  },
  /*glsl*/ `
    precision highp sampler2D;
    precision highp usampler2D;
    out vec4 vColor;
    out vec2 vPosition;
    out vec2 vRgbShift;
    uniform vec2 viewport;
    uniform float focal;
    uniform mat4 gsProjectionMatrix;
    uniform mat4 gsModelViewMatrix;
    attribute uint splatIndex;
    uniform sampler2D centerAndScaleTexture;
    uniform usampler2D covAndColorTexture;
  uniform float time;
  uniform float distortion;
  uniform float destruction;
  uniform float rgbGlitch;
  uniform float mosaic;

    vec2 unpackInt16(in uint value) {
      int v = int(value);
      int v0 = v >> 16;
      int v1 = (v & 0xFFFF);
      if((v & 0x8000) != 0)
        v1 |= 0xFFFF0000;
      return vec2(float(v1), float(v0));
    }

    float hash11(float p) {
      p = fract(p * 0.1031);
      p *= p + 33.33;
      p *= p + p;
      return fract(p);
    }

    vec3 hash31(float p) {
      vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.11369, 0.13787));
      p3 += dot(p3, p3.yzx + 19.19);
      return fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y, (p3.y + p3.z) * p3.x));
    }

    void main () {
      ivec2 texSize = textureSize(centerAndScaleTexture, 0);
      ivec2 texPos = ivec2(splatIndex%uint(texSize.x), splatIndex/uint(texSize.x));
      vec4 centerAndScaleData = texelFetch(centerAndScaleTexture, texPos, 0);
      vec3 centerPosition = centerAndScaleData.xyz;
      float destructionStrength = clamp(destruction, 0.0, 1.0);
      vec3 scatterVec = vec3(0.0);
      if (destructionStrength > 0.001) {
        float idx = float(splatIndex);
        scatterVec = hash31(idx + time * 0.27) * 2.0 - 1.0;
        float len = max(length(scatterVec), 1e-3);
        scatterVec /= len;
        float wobble = hash11(idx * 3.17 + time * 0.63);
        float radial = mix(0.0, 4.2, destructionStrength * destructionStrength);
        float pulse = sin(time * 2.3 + idx * 0.12) * 0.5 + 0.5;
        centerPosition += scatterVec * radial * mix(0.4, 1.4, wobble) * mix(0.6, 1.0, pulse);
      }
      vec4 center = vec4(centerPosition, 1.0);
      vec4 camspace = gsModelViewMatrix * center;
      vec4 pos2d = gsProjectionMatrix * camspace;

      float bounds = 1.2 * pos2d.w;
      if (pos2d.z < -pos2d.w || pos2d.x < -bounds || pos2d.x > bounds
        || pos2d.y < -bounds || pos2d.y > bounds) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
      }

      uvec4 covAndColorData = texelFetch(covAndColorTexture, texPos, 0);
      vec2 cov3D_M11_M12 = unpackInt16(covAndColorData.x) * centerAndScaleData.w;
      vec2 cov3D_M13_M22 = unpackInt16(covAndColorData.y) * centerAndScaleData.w;
      vec2 cov3D_M23_M33 = unpackInt16(covAndColorData.z) * centerAndScaleData.w;
      mat3 Vrk = mat3(
        cov3D_M11_M12.x, cov3D_M11_M12.y, cov3D_M13_M22.x,
        cov3D_M11_M12.y, cov3D_M13_M22.y, cov3D_M23_M33.x,
        cov3D_M13_M22.x, cov3D_M23_M33.x, cov3D_M23_M33.y
      );

      mat3 J = mat3(
        focal / camspace.z, 0., -(focal * camspace.x) / (camspace.z * camspace.z), 
        0., -focal / camspace.z, (focal * camspace.y) / (camspace.z * camspace.z), 
        0., 0., 0.
      );

      mat3 W = transpose(mat3(gsModelViewMatrix));
      mat3 T = W * J;
      mat3 cov = transpose(T) * Vrk * T;
      vec2 vCenter = vec2(pos2d) / pos2d.w;
      float diagonal1 = cov[0][0] + 0.3;
      float offDiagonal = cov[0][1];
      float diagonal2 = cov[1][1] + 0.3;
      float mid = 0.5 * (diagonal1 + diagonal2);
      float radius = length(vec2((diagonal1 - diagonal2) / 2.0, offDiagonal));
      float lambda1 = mid + radius;
      float lambda2 = max(mid - radius, 0.1);
      vec2 diagonalVector = normalize(vec2(offDiagonal, lambda1 - diagonal1));
      vec2 v1 = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
      vec2 v2 = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);
      uint colorUint = covAndColorData.w;
      vColor = vec4(
        float(colorUint & uint(0xFF)) / 255.0,
        float((colorUint >> uint(8)) & uint(0xFF)) / 255.0,
        float((colorUint >> uint(16)) & uint(0xFF)) / 255.0,
        float(colorUint >> uint(24)) / 255.0
      );
  if (destructionStrength > 0.001) {
    float fade = pow(1.0 - destructionStrength, 1.6);
    vColor.rgb = mix(vColor.rgb, vec3(0.1, 0.1, 0.12), destructionStrength * 0.45);
    vColor.a *= fade;
  }
  vPosition = position.xy;
  vec2 offX = (position.x * v2) / viewport;
  offX *= 2.0;
  vec2 offY = (position.y * v1) / viewport;
  offY *= 2.0;
  float spread = 1.0 + destructionStrength * 1.35;
  offX *= spread;
  offY *= spread;
  vec2 basePos = vCenter + offX + offY;
  basePos += scatterVec.xy * 0.45 * destructionStrength;
  float idx = float(splatIndex);
  float slice = fract(sin(idx * 12.9898 + time * 0.5) * 43758.5453);
  float jitter = (slice - 0.5) * 0.02 * distortion;
  basePos.x += jitter;
  basePos.y += (fract(sin(idx * 78.233 + time * 0.3) * 43758.5453) - 0.5) * 0.02 * distortion;
  float rgbNoise = fract(sin(idx * 95.781 + time * 0.9) * 43758.5453);
  float rgbNoiseAlt = fract(sin(idx * 31.4159 + time * 1.3) * 24631.3458);
  vec2 rgbShift = vec2(rgbNoise - 0.5, rgbNoiseAlt - 0.5);
  float rgbPulse = sin(time * 1.5 + idx * 0.002) * 0.5 + 0.5;
  float burst = smoothstep(0.35, 0.95, fract(sin(idx * 0.00091 + time * 2.7) * 43758.5453));
  float rgbAmplitude = (0.2 + rgbPulse * 0.45) * rgbGlitch;
  rgbAmplitude *= mix(1.0, 3.0, burst * clamp(rgbGlitch, 0.0, 2.0));
  rgbShift *= rgbAmplitude;
  rgbShift += scatterVec.xy * (0.35 * destructionStrength * rgbGlitch);
  rgbShift = clamp(rgbShift, vec2(-0.9), vec2(0.9));
  vRgbShift = rgbShift;

  gl_Position = vec4(basePos, pos2d.z / pos2d.w, 1.0);
    }
    `,
  /*glsl*/ `
    in vec4 vColor;
    in vec2 vPosition;
    in vec2 vRgbShift;
    uniform float rgbGlitch;
    uniform float mosaic;
    uniform vec2 viewport;
    uniform float time;
    void main () {
      float A = -dot(vPosition, vPosition);
      if (A < -4.0) discard;
      float baseGaussian = exp(A);

      vec2 shiftR = vPosition + vRgbShift;
      vec2 shiftG = vPosition + vec2(-vRgbShift.y, vRgbShift.x);
      vec2 shiftB = vPosition - vRgbShift;

      float falloffR = exp(-dot(shiftR, shiftR));
      float falloffG = exp(-dot(shiftG, shiftG));
      float falloffB = exp(-dot(shiftB, shiftB));

      float glitchMix = clamp(rgbGlitch, 0.0, 1.0);
      vec2 pixelate = floor(vPosition * 24.0) / 24.0;
      float pixelBlend = mix(baseGaussian, exp(-dot(pixelate, pixelate) * mix(1.0, 0.35, rgbGlitch)), glitchMix);
      vec3 splitColor = vec3(
        vColor.r * falloffR,
        vColor.g * falloffG,
        vColor.b * falloffB
      );
      vec3 combinedColor = mix(vColor.rgb * baseGaussian, splitColor, glitchMix);
      combinedColor += (splitColor - vColor.rgb * baseGaussian) * 0.45 * glitchMix;
      float glitchStrength = clamp(rgbGlitch, 0.0, 3.0);
      float scan = smoothstep(0.75, 1.0, fract(gl_FragCoord.y * 0.03 + time * 3.2));
      float flicker = smoothstep(0.65, 1.0, fract(sin(gl_FragCoord.x * 0.12 + time * 5.1) * 43758.5453));
      vec3 neonAccents = vec3(1.35, 0.35, 1.6);
      combinedColor = mix(combinedColor, combinedColor * vec3(1.25, 0.9, 1.4), glitchStrength * 0.35);
      combinedColor += neonAccents * scan * glitchStrength * 0.25;
      combinedColor += vec3(0.25, 0.45, 1.25) * flicker * glitchStrength * 0.35;
      float bandMask = step(0.92, fract(gl_FragCoord.y * 0.015 + time * 6.4));
      combinedColor += vec3(1.8, 0.25, 0.55) * bandMask * glitchStrength * 0.18;
      float alpha = max(pixelBlend, max(falloffR, max(falloffG, falloffB))) * vColor.a;

      float mosaicFactor = clamp(mosaic, 0.0, 1.0);
      if (mosaicFactor > 0.001) {
        float cellSize = mix(14.0, 82.0, mosaicFactor);
        vec2 cellIndex = floor(gl_FragCoord.xy / cellSize);
        vec2 cellCenter = (cellIndex + 0.5) * cellSize;
        vec2 cellOffset = (gl_FragCoord.xy - cellCenter) / cellSize;
        float cellFalloff = exp(-dot(cellOffset, cellOffset) * 8.0);
        float quantLevels = mix(18.0, 6.0, mosaicFactor);
        vec3 quantColor = floor(combinedColor * quantLevels) / quantLevels;
        combinedColor = mix(combinedColor, quantColor, mosaicFactor);
        float mosaicAlpha = mix(alpha, cellFalloff * vColor.a, mosaicFactor);
        alpha = mosaicAlpha;
      }

      vec3 graded = clamp(combinedColor, 0.0, 1.4);
      gl_FragColor = vec4(graded, alpha);
    }
  `
)
