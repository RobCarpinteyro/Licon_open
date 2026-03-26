import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  analyzer?: AnalyserNode;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, analyzer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyzer ? analyzer.frequencyBinCount : 0;
    const dataArray = analyzer ? new Uint8Array(bufferLength) : new Uint8Array(0);

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (analyzer) {
        analyzer.getByteFrequencyData(dataArray);
      }

      const barWidth = (width / (bufferLength / 2)) * 2.5;
      let barHeight;
      let x = 0;

      // Draw mirrored visualization from center
      const centerX = width / 2;

      // Soft glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fbbf24'; // Amber-400

      for (let i = 0; i < bufferLength && x < centerX; i++) {
        barHeight = dataArray[i] / 2; // Scale down

        // Use Vitamin D Amber colors
        const r = 251;
        const g = 191;
        const b = 36;
        const alpha = 0.5 + (barHeight / 150); 

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;

        // Draw Right side
        ctx.fillRect(centerX + x, height / 2 - barHeight / 2, barWidth, barHeight);
        
        // Draw Left side
        ctx.fillRect(centerX - x - barWidth, height / 2 - barHeight / 2, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, analyzer]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-24 rounded-lg opacity-90"
    />
  );
};

export default AudioVisualizer;