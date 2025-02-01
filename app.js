// Import our Circle class and collision helper
import { Circle } from "./Circle.js";
import { collideParticles } from "./collisions.js";

const canvas = document.getElementById("glcanvas");
let gl;
let shaderProgram;
let circleBuffer;
let circleVertices;
let dpr = window.devicePixelRatio || 1;

// Initialize WebGL and create shaders/buffers.
function initWebGL() {
  try {
    gl = canvas.getContext("webgl", { 
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });
    if (!gl) throw new Error("WebGL not supported");

    // Set up high-DPI: dpr is already used to set the canvas size.
    dpr = window.devicePixelRatio || 1;
    
    // Create our shader program (note: see updated vertex shader below)
    shaderProgram = initShaderProgram(gl, vertexShaderText, fragmentShaderText);
    
    // Create our circle vertex data and buffer
    circleVertices = createCircleVertices(64);
    circleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
    
    return true;
  } catch (e) {
    console.error("WebGL init failed:", e);
    return false;
  }
}

// Properly resize the canvas
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

// Listen for context loss and restoration.
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

let animationFrame;
let circles = [];
const numCircles = 50;
let gravity = [0, -1];

function initScene() {
  circles = [];
  for (let i = 0; i < numCircles; i++) {
    const radius = Math.random() * 0.05 + 0.02;
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const velocityX = Math.random() * 0.5 - 0.25;
    const velocityY = Math.random() * 0.5 - 0.25;
    const color = [Math.random(), Math.random(), Math.random(), 1.0];
    circles.push(new Circle(x, y, radius, velocityX, velocityY, color));
  }
}

// Main render loop
function startAnimation() {
  let previousTime = performance.now();
  
  function render() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - previousTime) * 0.001;
    previousTime = currentTime;

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // IMPORTANT: use the shader program before drawing!
    gl.useProgram(shaderProgram);

    // Update circle physics, resolve collisions, and draw each circle.
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        collideParticles(circles[i], circles[j], 0.9);
      }
      circles[i].update(deltaTime, gravity);
      circles[i].draw(gl, shaderProgram, circleBuffer);
    }

    animationFrame = requestAnimationFrame(render);
  }
  
  animationFrame = requestAnimationFrame(render);
}

// Request motion permission if needed and add the orientation listener.
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
  let x = e.beta;  // [-180, 180]
  let y = e.gamma; // [-90, 90]
  if (x === null || y === null) return;
  x = Math.max(-90, Math.min(90, x)); // Clamp
  gravity[0] = y / 90;
  gravity[1] = -x / 90;
}

// Initialize everything on window load.
window.addEventListener("load", () => {
  if (!initWebGL()) return;
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  handleContextLoss();
  initScene();
  enableMotion();
  startAnimation();
});

// --- Shader Utilities ---

// Create circle vertices (triangle fan with a center and one extra vertex to complete the circle)
function createCircleVertices(sides) {
  const vertices = [0, 0];
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    vertices.push(Math.cos(angle), Math.sin(angle));
  }
  return vertices;
}

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

// --- Shader Source Code ---
// Note: We have removed the uDPR uniform since the canvas is already scaled properly.

const vertexShaderText = `
  attribute vec2 vertPosition;
  uniform vec2 uTranslation;
  uniform float uScale;
  void main() {
    vec2 scaledPosition = vertPosition * uScale;
    gl_Position = vec4(uTranslation + scaledPosition, 0.0, 1.0);
  }
`;

const fragmentShaderText = `
  precision mediump float;
  uniform vec4 uColor;
  void main() {
    gl_FragColor = uColor;
  }
`;
