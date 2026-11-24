/**
 * PM QUEST - Canvas Retro Confetti Particle Engine
 * Pure canvas pixel confetti with zero external dependencies.
 */
const confettiManager = (function() {
  let canvas, ctx;
  let particles = [];
  let animationId = null;
  const colors = ['#d4a373', '#d49a2a', '#b23a2e', '#6f4e37', '#2d7a3e', '#ffffff', '#fbe28c'];

  function init() {
    canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 50,
      size: Math.floor(Math.random() * 8) + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 4 - 2,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 6 - 3
    };
  }

  function loop() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      // Draw pixel-style square confetti
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();

      // Recycle particles
      if (p.y > canvas.height + 20) {
        particles[i] = createParticle();
      }
    }

    animationId = requestAnimationFrame(loop);
  }

  return {
    start(count = 120) {
      init();
      if (!canvas) return;
      particles = [];
      for (let i = 0; i < count; i++) {
        const p = createParticle();
        p.y = Math.random() * canvas.height; // scatter initially
        particles.push(p);
      }
      if (!animationId) {
        loop();
      }
    },
    stop() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      particles = [];
    }
  };
})();

window.confettiManager = confettiManager;
