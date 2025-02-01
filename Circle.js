export class Circle {
    constructor(x, y, radius, velocityX, velocityY, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.color = color;
    }

    update(deltaTime, gravity) {
        const GRAVITY = -0.5;
        const AIR_FRICTION = 0.99;

        this.velocityX += gravity[0] * deltaTime;
        this.velocityY += gravity[1] * deltaTime;
        this.velocityX *= AIR_FRICTION;
        this.velocityY *= AIR_FRICTION;

        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Bounce off walls
        if (this.x - this.radius < -1 || this.x + this.radius > 1) {
            this.velocityX *= -1;
        }
        if (this.y - this.radius < -1 || this.y + this.radius > 1) {
            this.velocityY *= -1;
        }

        // Clamp position
        this.x = Math.max(-1 + this.radius, Math.min(1 - this.radius, this.x));
        this.y = Math.max(-1 + this.radius, Math.min(1 - this.radius, this.y));
    }

    draw(gl, shaderProgram, circleBuffer) {
        const positionAttribLocation = gl.getAttribLocation(shaderProgram, "vertPosition");
        const colorUniformLocation = gl.getUniformLocation(shaderProgram, "uColor");
        const translationUniformLocation = gl.getUniformLocation(shaderProgram, "uTranslation");
        const scaleUniformLocation = gl.getUniformLocation(shaderProgram, "uScale");

        gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
        gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionAttribLocation);

        gl.uniform4fv(colorUniformLocation, this.color);
        gl.uniform2fv(translationUniformLocation, [this.x, this.y]);
        gl.uniform1f(scaleUniformLocation, this.radius);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 66);
    }
}