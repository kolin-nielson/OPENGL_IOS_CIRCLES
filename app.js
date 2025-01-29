import { Circle } from "./Circle.js";
import { collideParticles } from "./collisions.js";

const canvas = document.getElementById("glcanvas");
let gl;
let shaderProgram;
let circleBuffer;
let circleVertices;

// WebGL Initialization
function initWebGL() {
    try {
        gl = canvas.getContext("webgl", { 
            antialias: true,
            preserveDrawingBuffer: true 
        });
        
        if (!gl) {
            alert("WebGL not supported");
            throw new Error("WebGL not supported");
        }

        // Create shaders and buffers
        shaderProgram = initShaderProgram(gl, vertexShaderText, fragmentShaderText);
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

// Canvas Resizing
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set CSS dimensions
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Set actual buffer size
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

// Context Handlers
canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    console.log("WebGL context lost");
    cancelAnimationFrame(animationFrame);
});

canvas.addEventListener("webglcontextrestored", () => {
    console.log("WebGL context restored");
    initWebGL();
    resizeCanvas();
    startAnimation();
});

// Animation Control
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

function startAnimation() {
    let previousTime = performance.now();
    
    function render() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - previousTime) * 0.001;
        previousTime = currentTime;

        gl.clearColor(0.2, 0.2, 0.2, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Update and draw circles
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

// Accelerometer Handling
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
    
    x = Math.max(-90, Math.min(90, x)); // Clamp between -90 and 90
    gravity[0] = y / 90;
    gravity[1] = -x / 90;
}

// Touch/Click Handling
canvas.addEventListener("click", handleInteraction);
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleInteraction(e.touches[0]);
});

function handleInteraction(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = 1 - ((e.clientY - rect.top) / rect.height) * 2;
    
    // Apply explosion force
    circles.forEach(circle => {
        const dx = circle.x - x;
        const dy = circle.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 0.3) {
            const force = 0.2 / Math.max(distance, 0.05);
            circle.velocityX += (dx / distance) * force;
            circle.velocityY += (dy / distance) * force;
        }
    });
}

// Initialization
window.addEventListener("load", () => {
    if (!initWebGL()) return;
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    initScene();
    enableMotion();
    startAnimation();
});

// Shader Utilities
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