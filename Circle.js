export class Circle {
    constructor(x, y, radius, velocityX, velocityY, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.color = color;
    }

    update(deltaTime, bounds) {
        const GRAVITY = -0.5;
        const AIR_FRICTION = 0.99;

        this.velocityY += GRAVITY * deltaTime;
        this.velocityX *= AIR_FRICTION;
        this.velocityY *= AIR_FRICTION;

        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        if (this.x - this.radius < bounds.left || this.x + this.radius > bounds.right) {
            this.velocityX *= -1;
        }
        if (this.y - this.radius < bounds.bottom || this.y + this.radius > bounds.top) {
            this.velocityY *= -1;
        }

        this.x = Math.max(bounds.left + this.radius, Math.min(bounds.right - this.radius, this.x));
        this.y = Math.max(bounds.bottom + this.radius, Math.min(bounds.top - this.radius, this.y));
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
