export function collideParticles(circle1, circle2, collisionFriction) {
  const dx = circle2.x - circle1.x;
  const dy = circle2.y - circle1.y;
  const distance = Math.hypot(dx, dy);
  let collided = false;
  // Use effective collision radius as 70% of the drawn radius.
  const effectiveRadius1 = circle1.radius * 0.7;
  const effectiveRadius2 = circle2.radius * 0.7;
  if (distance < effectiveRadius1 + effectiveRadius2) {
    const nx = dx / distance;
    const ny = dy / distance;
    const vx = circle2.velocityX - circle1.velocityX;
    const vy = circle2.velocityY - circle1.velocityY;
    const dotProduct = vx * nx + vy * ny;
    if (dotProduct <= 0) {
      collided = true;
      const impulse = (-(1 + collisionFriction) * dotProduct) / 2;
      const impulseX = impulse * nx;
      const impulseY = impulse * ny;
      
      circle1.velocityX -= impulseX;
      circle1.velocityY -= impulseY;
      circle2.velocityX += impulseX;
      circle2.velocityY += impulseY;
      
      // Correct overlap.
      const overlap = effectiveRadius1 + effectiveRadius2 - distance;
      const correctionFactor = 0.5;
      circle1.x -= nx * overlap * correctionFactor;
      circle1.y -= ny * overlap * correctionFactor;
      circle2.x += nx * overlap * correctionFactor;
      circle2.y += ny * overlap * correctionFactor;
    }
  }
  return collided;
}
