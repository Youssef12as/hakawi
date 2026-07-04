import { useEffect, useRef } from 'react';

export default function WaveformIndicator({ stream, isRecording }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (!stream || !isRecording) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      // Draw idle bars
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 40;
      const barWidth = canvas.width / barCount;
      for (let i = 0; i < barCount; i++) {
        ctx.fillStyle = 'rgba(157, 145, 103, 0.2)';
        const h = 4;
        const y = (canvas.height - h) / 2;
        ctx.beginPath();
        ctx.roundRect(i * barWidth + 1, y, barWidth - 2, h, 2);
        ctx.fill();
      }
      return;
    }

    let audioCtx;
    try {
      audioCtx = new AudioContext();
    } catch {
      return;
    }

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.8;
      let x = (canvas.width - barWidth * bufferLength) / 2;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = Math.max(3, (dataArray[i] / 255) * canvas.height * 0.85);
        const ratio = i / bufferLength;
        ctx.fillStyle = ratio < 0.5
          ? 'rgba(116, 48, 20, 0.7)'   // wine
          : 'rgba(132, 89, 43, 0.5)';  // brown

        const y = (canvas.height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - 2, barHeight, 2);
        ctx.fill();

        x += barWidth;
      }
    }

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioCtx.close().catch(() => {});
    };
  }, [stream, isRecording]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={320}
        height={80}
        className="w-full max-w-sm h-20 rounded-xl"
        id="waveform"
      />
    </div>
  );
}
