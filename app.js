import { Circle } from "./Circle.js";
import { collideParticles } from "./collisions.js";

// Select the canvas and WebGL context
const canvas = document.getElementById("glcanvas");
let gl = canvas.getContext("webgl", { preserveDrawingBuffer: true }); // Preserve buffer for PWAs

if (!gl) {
    alert("Your browser does not support WebGL");
    throw new Error("WebGL not supported");
}

// Function to reset and resize canvas properly
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
}

// Resize canvas dynamically
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// **Force WebGL Context Reset on iOS PWA**
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        console.log("Resetting WebGL context...");
        gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
        resizeCanvas();
    }
});

// Vertex Shader
const vertexShaderText = `
    precision mediump float;
    attribute vec2 vertPosition;
    uniform vec2 uTranslation;
    uniform float uScale;
    void main() {
        gl_Position = vec4(vertPosition * uScale + uTranslation, 0.0, 1.0);
    }
`;

// Fragment Shader
const fragmentShaderText = `
    precision mediump float;
    uniform vec4 uColor;
    void main() {
        gl_FragColor = uColor;
    }
`;

// Initialize shaders
const shaderProgram = initShaderProgram(gl, vertexShaderText, fragmentShaderText);
const circleVertices = createCircleVertices(64);
const circleBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);

// Global variables
const circles = [];
const numCircles = 50;
let gravity = [0, -1]; // Default gravity

// Initialize circles
for (let i = 0; i < numCircles; i++) {
    const radius = Math.random() * 0.05 + 0.02;
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const velocityX = Math.random() * 0.5 - 0.25;
    const velocityY = Math.random() * 0.5 - 0.25;
    const color = [Math.random(), Math.random(), Math.random(), 1.0];
    circles.push(new Circle(x, y, radius, velocityX, velocityY, color));
}

// ** 📲 Mobile Accelerometer Gravity **
async function enableMotionSensor() {
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission === "granted") {
                window.addEventListener("deviceorientation", handleOrientation);
            }
        } catch (error) {
            console.warn("Device motion permission denied");
        }
    } else {
        window.addEventListener("deviceorientation", handleOrientation);
    }
}

enableMotionSensor();

function handleOrientation(event) {
    let x = event.beta; // [-180,180]
    let y = event.gamma; // [-90,90]

    if (x == null || y == null) {
        gravity[0] = 0;
        gravity[1] = -1;
    } else {
        if (x > 90) x = 90;
        if (x < -90) x = -90;
        gravity[0] = y / 90; 
        gravity[1] = -x / 90;
    }
}

// ** 💥 Handle Explosions on Click or Touch **
canvas.addEventListener("click", (event) => handleExplosion(event.clientX, event.clientY));
canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    handleExplosion(event.touches[0].clientX, event.touches[0].clientY);
});

function handleExplosion(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const clickX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const clickY = 1 - ((clientY - rect.top) / rect.height) * 2;

    triggerExplosion(clickX, clickY, circles);
}

function triggerExplosion(x, y, circles) {
    const explosionStrength = 0.2;

    circles.forEach((circle) => {
        const dx = circle.x - x;
        const dy = circle.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.3) return;

        const force = explosionStrength / Math.max(distance, 0.05);
        const directionX = dx / distance;
        const directionY = dy / distance;

        circle.velocityX += directionX * force;
        circle.velocityY += directionY * force;
    });
}

// ** 🎥 Animation Loop **
const bounds = { left: -1, right: 1, top: 1, bottom: -1 };
let previousTime = 0;

function render(currentTime) {
    currentTime *= 0.001;
    const deltaTime = currentTime - previousTime;
    previousTime = currentTime;

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            collideParticles(circles[i], circles[j], 0.9);
        }
        circles[i].update(deltaTime, gravity);
        circles[i].draw(gl, shaderProgram, circleBuffer);
    }

    requestAnimationFrame(render);
}

requestAnimationFrame(render);

// ** 🛠 Helper Functions **
function createCircleVertices(sides) {
    const vertices = [0, 0];
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * 2 * Math.PI;
        vertices.push(Math.cos(angle), Math.sin(angle));
    }
    return vertices;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error("Unable to initialize the shader program:", gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    gl.useProgram(shaderProgram);
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("An error occurred compiling the shaders:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}
