"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function KordexBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  // We generate random elements on mount to avoid Next.js hydration mismatches
  const [elements, setElements] = useState({
    particles: [] as any[],
    geoShapes: [] as any[],
    beams: [] as any[],
    pulseRings: [] as any[],
    nebula: [] as any[]
  });

  useEffect(() => {
    setMounted(true);
    const isMobile = window.innerWidth < 768;
    const pCount = isMobile ? 25 : 50;
    const gCount = isMobile ? 6 : 14;
    const bCount = isMobile ? 8 : 18;
    const nCount = isMobile ? 12 : 25;

    const colors = ['rgba(168,85,247,.5)', 'rgba(139,92,246,.4)', 'rgba(192,132,252,.35)', 'rgba(59,130,246,.3)'];
    const types = ['geo-ring', 'geo-diamond', 'geo-hex'];

    const newElements = {
      particles: Array.from({ length: pCount }).map(() => ({
        size: 2 + Math.random() * 4,
        bg: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,
        dur: 8 + Math.random() * 12,
        delay: -Math.random() * 15,
        op: 0.2 + Math.random() * 0.4
      })),
      geoShapes: Array.from({ length: gCount }).map(() => ({
        type: types[Math.floor(Math.random() * types.length)],
        size: 30 + Math.random() * 80,
        left: Math.random() * 100,
        top: Math.random() * 100,
        gdur: 15 + Math.random() * 20,
        gdelay: -Math.random() * 20,
        gop: 0.15 + Math.random() * 0.2,
        gmove: -30 - Math.random() * 50,
        grot: Math.random() * 360
      })),
      beams: Array.from({ length: bCount }).map(() => ({
        left: Math.random() * 100,
        bdur: 4 + Math.random() * 6,
        bdelay: -Math.random() * 8,
        brot: -15 + Math.random() * 30
      })),
      pulseRings: Array.from({ length: 4 }).map((_, i) => ({
        pdur: 6 + i * 3,
        pdelay: -i * 2,
        pmax: 300 + Math.random() * 400
      })),
      nebula: Array.from({ length: nCount }).map(() => ({
        size: 1 + Math.random() * 3,
        left: Math.random() * 100,
        top: Math.random() * 100,
        ndur: 3 + Math.random() * 5,
        ndelay: -Math.random() * 5
      }))
    };

    setElements(newElements);

    // --- WebGL Shader Logic ---
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `
      attribute vec4 aVertexPosition;
      void main() {
        gl_Position = aVertexPosition;
      }
    `;

    const fsSource = `
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;

      const float overallSpeed = 0.2;
      const float gridSmoothWidth = 0.015;
      const float axisWidth = 0.05;
      const float majorLineWidth = 0.025;
      const float minorLineWidth = 0.0125;
      const float majorLineFrequency = 5.0;
      const float minorLineFrequency = 1.0;
      const vec4 gridColor = vec4(0.5);
      const float scale = 5.0;
      const vec4 lineColor = vec4(0.4, 0.2, 0.8, 1.0);
      const float minLineWidth = 0.01;
      const float maxLineWidth = 0.2;
      const float lineSpeed = 1.0 * overallSpeed;
      const float lineAmplitude = 1.0;
      const float lineFrequency = 0.2;
      const float warpSpeed = 0.2 * overallSpeed;
      const float warpFrequency = 0.5;
      const float warpAmplitude = 1.0;
      const float offsetFrequency = 0.5;
      const float offsetSpeed = 1.33 * overallSpeed;
      const float minOffsetSpread = 0.6;
      const float maxOffsetSpread = 2.0;
      const int linesPerGroup = 16;

      #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
      #define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
      #define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))
      #define drawPeriodicLine(freq, width, t) drawCrispLine(freq / 2.0, width, abs(mod(t, freq) - (freq) / 2.0))

      float drawGridLines(float axis) {
        return drawCrispLine(0.0, axisWidth, axis)
              + drawPeriodicLine(majorLineFrequency, majorLineWidth, axis)
              + drawPeriodicLine(minorLineFrequency, minorLineWidth, axis);
      }

      float drawGrid(vec2 space) {
        return min(1.0, drawGridLines(space.x) + drawGridLines(space.y));
      }

      float random(float t) {
        return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
      }

      float getPlasmaY(float x, float horizontalFade, float offset) {
        return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
      }

      void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec4 fragColor;
        vec2 uv = fragCoord.xy / iResolution.xy;
        vec2 space = (fragCoord - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;

        float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
        float verticalFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

        space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
        space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

        vec4 lines = vec4(0.0);
        vec4 bgColor1 = vec4(0.1, 0.1, 0.3, 1.0);
        vec4 bgColor2 = vec4(0.3, 0.1, 0.5, 1.0);

        for(int l = 0; l < linesPerGroup; l++) {
          float normalizedLineIndex = float(l) / float(linesPerGroup);
          float offsetTime = iTime * offsetSpeed;
          float offsetPosition = float(l) + space.x * offsetFrequency;
          float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
          float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
          float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
          float linePosition = getPlasmaY(space.x, horizontalFade, offset);
          float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);

          float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
          vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
          float circle = drawCircle(circlePosition, 0.01, space) * 4.0;

          line = line + circle;
          lines += line * lineColor * rand;
        }

        fragColor = mix(bgColor1, bgColor2, uv.x);
        fragColor *= verticalFade;
        fragColor.a = 1.0;
        fragColor += lines;

        gl_FragColor = fragColor;
      }
    `;

    const loadShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return;

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) return;

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1.0, -1.0,
      1.0, -1.0,
      -1.0, 1.0,
      1.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const programInfo = {
      program: shaderProgram,
      attribLocations: { vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition') },
      uniformLocations: {
        resolution: gl.getUniformLocation(shaderProgram, 'iResolution'),
        time: gl.getUniformLocation(shaderProgram, 'iTime'),
      },
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const startTime = Date.now();
    let animationFrameId: number;

    const render = () => {
      const currentTime = (Date.now() - startTime) / 1000;
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(programInfo.program);
      gl.uniform2f(programInfo.uniformLocations.resolution, canvas.width, canvas.height);
      gl.uniform1f(programInfo.uniformLocations.time, currentTime);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div className="bg">
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -10 }}
        />
      </div>
      <div className="bg-grid"></div>

      {mounted && (
        <>
          <div className="particles">
            {elements.particles.map((p, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${p.left}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  background: p.bg,
                  '--dur': `${p.dur}s`,
                  '--delay': `${p.delay}s`,
                  '--op': p.op,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="geo-shapes">
            {elements.geoShapes.map((g, i) => (
              <div
                key={i}
                className={`geo ${g.type}`}
                style={{
                  left: `${g.left}%`,
                  top: `${g.top}%`,
                  width: `${g.size}px`,
                  height: `${g.size}px`,
                  '--gdur': `${g.gdur}s`,
                  '--gdelay': `${g.gdelay}s`,
                  '--gop': g.gop,
                  '--gmove': `${g.gmove}px`,
                  '--grot': `${g.grot}deg`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="beams">
            {elements.beams.map((b, i) => (
              <div
                key={i}
                className="beam"
                style={{
                  left: `${b.left}%`,
                  top: 0,
                  '--bdur': `${b.bdur}s`,
                  '--bdelay': `${b.bdelay}s`,
                  '--brot': `${b.brot}deg`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="pulse-rings">
            {elements.pulseRings.map((pr, i) => (
              <div
                key={i}
                className="pring"
                style={{
                  '--pdur': `${pr.pdur}s`,
                  '--pdelay': `${pr.pdelay}s`,
                  '--pmax': `${pr.pmax}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="nebula">
            {elements.nebula.map((n, i) => (
              <div
                key={i}
                className="nebula-dot"
                style={{
                  left: `${n.left}%`,
                  top: `${n.top}%`,
                  width: `${n.size}px`,
                  height: `${n.size}px`,
                  '--ndur': `${n.ndur}s`,
                  '--ndelay': `${n.ndelay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
