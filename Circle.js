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
      const AIR_FRICTION = 0.99;
      // Apply gravity
      this.velocityX += gravity[0] * deltaTime;
      this.velocityY += gravity[1] * deltaTime;
      // Apply friction
      this.velocityX *= AIR_FRICTION;
      this.velocityY *= AIR_FRICTION;
      // Update position
      this.x += this.velocityX * deltaTime;
      this.y += this.velocityY * deltaTime;
  
      // Bounce off the walls (assuming NDC coordinates from -1 to 1)
      if (this.x - this.radius < -1 || this.x + this.radius > 1) {
        this.velocityX *= -1;
      }
      if (this.y - this.radius < -1 || this.y + this.radius > 1) {
        this.velocityY *= -1;
      }
      // Clamp positions so circles remain onscreen
      this.x = Math.max(-1 + this.radius, Math.min(1 - this.radius, this.x));
      this.y = Math.max(-1 + this.radius, Math.min(1 - this.radius, this.y));
    }
  
    draw(gl, shaderProgram, circleBuffer) {
      // Get attribute and uniform locations from the shader program.
      const positionAttrib = gl.getAttribLocation(shaderProgram, "vertPosition");
      const colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
      const translationUniform = gl.getUniformLocation(shaderProgram, "uTranslation");
      const scaleUniform = gl.getUniformLocation(shaderProgram, "uScale");
  
      gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
      gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(positionAttrib);
  
      // Set uniform values for this circle.
      gl.uniform4fv(colorUniform, this.color);
      gl.uniform2fv(translationUniform, [this.x, this.y]);
      gl.uniform1f(scaleUniform, this.radius);
  
      // Draw the circle using a TRIANGLE_FAN.
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 65);
    }
  }
  