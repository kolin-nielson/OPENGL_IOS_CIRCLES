import { Circle } from "./Circle.js";
import { collideParticles } from "./collisions.js";

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

main();

async function main() {
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        alert("Your browser does not support WebGL");
        return;
    }

    const shaderProgram = initShaderProgram(gl, vertexShaderText, fragmentShaderText);
    const circleVertices = createCircleVertices(64);

    const circleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);

    const circles = [];
    const numCircles = 50;

    for (let i = 0; i < numCircles; i++) {
        const radius = Math.random() * 0.05 + 0.02;
        const x = Math.random() * 2 - 1;
        const y = Math.random() * 2 - 1;
        const velocityX = Math.random() * 0.5 - 0.25;
        const velocityY = Math.random() * 0.5 - 0.25;
        const color = [Math.random(), Math.random(), Math.random(), 1.0];
        circles.push(new Circle(x, y, radius, velocityX, velocityY, color));
    }

    const bounds = { left: -1, right: 1, top: 1, bottom: -1 };

    // Add event listener for clicks
    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
        const mouseY = 1 - ((event.clientY - rect.top) / canvas.height) * 2;

        // Trigger explosion
        triggerExplosion(mouseX, mouseY, circles);
    });

    let previousTime = 0;

    function render(currentTime) {
        currentTime *= 0.001; // Convert to seconds
        const deltaTime = currentTime - previousTime;
        previousTime = currentTime;

        gl.clearColor(0.2, 0.2, 0.2, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (let i = 0; i < circles.length; i++) {
            for (let j = i + 1; j < circles.length; j++) {
                collideParticles(circles[i], circles[j], 0.9); // Collision friction = 0.9
            }
            circles[i].update(deltaTime, bounds);
            circles[i].draw(gl, shaderProgram, circleBuffer);
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

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

function triggerExplosion(x, y, circles) {
    const explosionStrength = .2; // Strength of the explosion

    circles.forEach((circle) => {
        const dx = circle.x - x;
        const dy = circle.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Ignore circles too far from the explosion
        if (distance > 0.3) return;

        // Calculate force and direction
        const force = explosionStrength / Math.max(distance, 0.05);
        const directionX = dx / distance;
        const directionY = dy / distance;

        // Apply force to velocity
        circle.velocityX += directionX * force;
        circle.velocityY += directionY * force;
    });
}
