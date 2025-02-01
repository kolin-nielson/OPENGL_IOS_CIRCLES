export function collideParticles(circle1, circle2, collisionFriction) {
  const dx = circle2.x - circle1.x;
  const dy = circle2.y - circle1.y;
  const distance = Math.hypot(dx, dy);
  
  if (distance < circle1.radius + circle2.radius) {
    const nx = dx / distance;
    const ny = dy / distance;
    
    const vx = circle2.velocityX - circle1.velocityX;
    const vy = circle2.velocityY - circle1.velocityY;
    
    const dotProduct = vx * nx + vy * ny;
    if (dotProduct > 0) return;
    
    const impulse = (-(1 + collisionFriction) * dotProduct) / 2;
    const impulseX = impulse * nx;
    const impulseY = impulse * ny;
    
    circle1.velocityX -= impulseX;
    circle1.velocityY -= impulseY;
    circle2.velocityX += impulseX;
    circle2.velocityY += impulseY;
    
    // Adjust positions to correct overlap.
    const overlap = circle1.radius + circle2.radius - distance;
    const correctionFactor = 0.5;
    circle1.x -= nx * overlap * correctionFactor;
    circle1.y -= ny * overlap * correctionFactor;
    circle2.x += nx * overlap * correctionFactor;
    circle2.y += ny * overlap * correctionFactor;
  }
}
