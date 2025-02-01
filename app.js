// Import our Circle class and collision helper
import { Circle } from "./Circle.js";
import { collideParticles } from "./collisions.js";

const canvas = document.getElementById("glcanvas");
let gl;
let circleShaderProgram;
let backgroundShaderProgram;
let circleBuffer;
let backgroundBuffer;
let circleVertices;
let circleVertexCount;
let dpr = window.devicePixelRatio || 1;

let circles = [];
const numCircles = 50;
let gravity = [0, -1];
let lastCollisionSoundTime = 0;

// Create an AudioContext for collision sound effects.
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Play a collision sound.
function playCollisionSound() {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.frequency.value = 200 + Math.random() * 400;
  oscillator.type = "sine";
  gainNode.gain.value = 0.1;
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1);
}

// Initialize WebGL, shaders, and buffers.
function initWebGL() {
  try {
    gl = canvas.getContext("webgl", { 
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });
    if (!gl) throw new Error("WebGL not supported");

    dpr = window.devicePixelRatio || 1;
    
    // Initialize shader programs.
    circleShaderProgram = initShaderProgram(gl, vertexShaderCircles, fragmentShaderCircles);
    backgroundShaderProgram = initShaderProgram(gl, vertexShaderBackground, fragmentShaderBackground);
    
    // Create circle geometry (triangle fan: center + 64 points + repeat).
    circleVertices = createCircleVertices(64);
    circleVertexCount = circleVertices.length / 2;
    
    circleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
    
    // Create a background quad covering the entire viewport.
    const bgVertices = [
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ];
    backgroundBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, backgroundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bgVertices), gl.STATIC_DRAW);
    
    return true;
  } catch (e) {
    console.error("WebGL init failed:", e);
    return false;
  }
}

// Resize the canvas for high-DPI screens.
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  if (gl) {
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

// Handle WebGL context loss and restoration.
function handleContextLoss() {
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    console.log("Context lost");
    cancelAnimationFrame(animationFrame);
  });

  canvas.addEventListener("webglcontextrestored", () => {
    console.log("Context restored");
    initWebGL();
    resizeCanvas();
    startAnimation();
  });
}

// Create circle vertices for a triangle fan.
function createCircleVertices(sides) {
  const vertices = [0, 0];
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    vertices.push(Math.cos(angle), Math.sin(angle));
  }
  return vertices;
}

// --- Shader Source Code ---

// Vertex shader for circles.
const vertexShaderCircles = `
  attribute vec2 vertPosition;
  uniform vec2 uTranslation;
  uniform float uScale;
  uniform float uAspect;
  varying vec2 vPosition;
  void main() {
    vec2 pos = vertPosition * uScale;
    vPosition = vertPosition;
    gl_Position = vec4(uTranslation.x + pos.x / uAspect, uTranslation.y + pos.y, 0.0, 1.0);
  }
`;

// Fragment shader for neon circles with extra glow.
// The inner 70% is drawn at full opacity, then the glow fades out from 70% to 100%.
const fragmentShaderCircles = `
  precision mediump float;
  uniform vec4 uColor;
  varying vec2 vPosition;
  void main() {
    float dist = length(vPosition);
    if (dist < 0.7) {
      gl_FragColor = vec4(uColor.rgb, 1.0);
    } else if (dist < 1.0) {
      float alpha = 1.0 - (dist - 0.7) / 0.3;
      gl_FragColor = vec4(uColor.rgb, alpha);
    } else {
      discard;
    }
  }
`;

// Vertex shader for the dynamic background.
const vertexShaderBackground = `
  attribute vec2 aPosition;
  varying vec2 vPos;
  void main() {
    vPos = aPosition;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// Fragment shader for the dynamic background.
const fragmentShaderBackground = `
  precision mediump float;
  uniform float uTime;
  varying vec2 vPos;
  void main() {
    vec3 color1 = vec3(0.05, 0.05, 0.1);
    vec3 color2 = vec3(0.1, 0.05, 0.05);
    float mixFactor = (vPos.y + 1.0) / 2.0;
    vec3 baseColor = mix(color1, color2, mixFactor);
    baseColor += 0.05 * vec3(sin(uTime), sin(uTime + 2.0), sin(uTime + 4.0));
    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

// Initialize the scene by creating a set of circles.
function initScene() {
  circles = [];
  for (let i = 0; i < numCircles; i++) {
    const radius = Math.random() * 0.05 + 0.02;
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const velocityX = Math.random() * 0.5 - 0.25;
    const velocityY = Math.random() * 0.5 - 0.25;
    // Use bright neon colors.
    const color = [Math.random(), Math.random(), Math.random(), 1.0];
    circles.push(new Circle(x, y, radius, velocityX, velocityY, color));
  }
}

// --- Interaction: Spawn new circles and drag & drop ---

// Spawn a new circle on click.
canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = 1 - ((event.clientY - rect.top) / rect.height) * 2;
  const radius = Math.random() * 0.05 + 0.02;
  const velocityX = (Math.random() - 0.5) * 0.5;
  const velocityY = (Math.random() - 0.5) * 0.5;
  const color = [Math.random(), Math.random(), Math.random(), 1.0];
  circles.push(new Circle(x, y, radius, velocityX, velocityY, color));
});

let draggedCircle = null;
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = 1 - ((e.clientY - rect.top) / rect.height) * 2;
  
  // Use effective collision radius (70% of drawn radius) for hit detection.
  for (let circle of circles) {
    const dx = circle.x - x;
    const dy = circle.y - y;
    if (Math.hypot(dx, dy) < circle.radius * 0.7) {
      draggedCircle = circle;
      break;
    }
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (draggedCircle) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = 1 - ((e.clientY - rect.top) / rect.height) * 2;
    draggedCircle.x = x;
    draggedCircle.y = y;
    draggedCircle.velocityX = 0;
    draggedCircle.velocityY = 0;
  }
});
canvas.addEventListener("pointerup", () => {
  draggedCircle = null;
});

// --- Device Orientation for Gravity Control ---
async function enableMotion() {
  if (typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission === "granted") {
        window.addEventListener("deviceorientation", handleOrientation);
      }
    } catch (e) {
      console.warn("Motion permission denied");
    }
  } else {
    window.addEventListener("deviceorientation", handleOrientation);
  }
}
function handleOrientation(e) {
  let x = e.beta;
  let y = e.gamma;
  if (x === null || y === null) return;
  x = Math.max(-90, Math.min(90, x));
  gravity[0] = y / 90;
  gravity[1] = -x / 90;
}

// --- Main Render Loop ---
let animationFrame;
function startAnimation() {
  let previousTime = performance.now();
  
  function render() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - previousTime) * 0.001;
    previousTime = currentTime;
    
    // Draw the dynamic background.
    drawBackground(currentTime * 0.001);
    
    // Use the circle shader for drawing circles.
    gl.useProgram(circleShaderProgram);
    const aspectUniform = gl.getUniformLocation(circleShaderProgram, "uAspect");
    gl.uniform1f(aspectUniform, canvas.width / canvas.height);
    
    // Update circles and handle collisions.
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        if (collideParticles(circles[i], circles[j], 0.9)) {
          if (currentTime - lastCollisionSoundTime > 100) {
            playCollisionSound();
            lastCollisionSoundTime = currentTime;
          }
        }
      }
      circles[i].update(deltaTime, gravity);
    }
    
    // Draw all circles.
    for (let circle of circles) {
      circle.draw(gl, circleShaderProgram, circleBuffer, circleVertexCount);
    }
    
    animationFrame = requestAnimationFrame(render);
  }
  
  animationFrame = requestAnimationFrame(render);
}

// Draw the dynamic background.
function drawBackground(time) {
  gl.useProgram(backgroundShaderProgram);
  const timeUniform = gl.getUniformLocation(backgroundShaderProgram, "uTime");
  gl.uniform1f(timeUniform, time);
  
  const positionAttrib = gl.getAttribLocation(backgroundShaderProgram, "aPosition");
  gl.bindBuffer(gl.ARRAY_BUFFER, backgroundBuffer);
  gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionAttrib);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// --- Shader Utility Functions ---
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Shader program failed:", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// --- Initialization ---
window.addEventListener("load", () => {
  if (!initWebGL()) return;
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  handleContextLoss();
  initScene();
  startAnimation();
});
document.getElementById("enableMotionBtn").addEventListener("click", () => {
  enableMotion();
  document.getElementById("enableMotionBtn").style.display = 'none';
});
