import React, { useRef, useEffect } from 'react';

export const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // 3D Particle System
    const particles: Particle[] = [];
    const particleCount = width < 768 ? 60 : 120; // Fewer particles on mobile
    const connectionDistance = 150;
    const focalLength = 400;

    class Particle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      size: number;

      constructor() {
        this.x = Math.random() * width - width / 2;
        this.y = Math.random() * height - height / 2;
        this.z = Math.random() * 1000;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.vz = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        // Reset if out of bounds (recycle particles)
        if (this.z < 0 || this.z > 1000) this.vz *= -1;
        if (this.x < -width / 2 || this.x > width / 2) this.vx *= -1;
        if (this.y < -height / 2 || this.y > height / 2) this.vy *= -1;
      }

      draw() {
        // Perspective projection
        const scale = focalLength / (focalLength + this.z);
        const x2d = this.x * scale + width / 2;
        const y2d = this.y * scale + height / 2;
        
        // Opacity based on depth (fog effect)
        const alpha = Math.max(0, 1 - this.z / 1000);
        
        ctx!.fillStyle = `rgba(13, 148, 136, ${alpha * 0.6})`; // Teal-600
        ctx!.beginPath();
        ctx!.arc(x2d, y2d, this.size * scale, 0, Math.PI * 2);
        ctx!.fill();

        return { x: x2d, y: y2d, scale, alpha };
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#f8fafc'); // slate-50
      gradient.addColorStop(1, '#e2e8f0'); // slate-200
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const projectedPoints: { x: number, y: number, alpha: number }[] = [];

      // Update and draw particles
      particles.forEach(p => {
        p.update();
        const point = p.draw();
        projectedPoints.push({ x: point.x, y: point.y, alpha: point.alpha });
      });

      // Draw connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = projectedPoints[i].x - projectedPoints[j].x;
          const dy = projectedPoints[i].y - projectedPoints[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const alpha = Math.min(projectedPoints[i].alpha, projectedPoints[j].alpha) * (1 - dist / connectionDistance);
            ctx.strokeStyle = `rgba(45, 212, 191, ${alpha * 0.5})`; // Teal-400
            ctx.beginPath();
            ctx.moveTo(projectedPoints[i].x, projectedPoints[i].y);
            ctx.lineTo(projectedPoints[j].x, projectedPoints[j].y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
};