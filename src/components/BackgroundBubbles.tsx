const bubbles = [
  { size: 64, x: "10%", y: "20%", duration: 8, color: "bg-accent/30" },
  { size: 48, x: "25%", y: "60%", duration: 6, color: "bg-blue-400/30" },
  { size: 80, x: "40%", y: "10%", duration: 10, color: "bg-purple-400/25" },
  { size: 40, x: "55%", y: "70%", duration: 7, color: "bg-pink-400/25" },
  { size: 96, x: "70%", y: "30%", duration: 12, color: "bg-cyan-400/20" },
  { size: 56, x: "85%", y: "80%", duration: 9, color: "bg-indigo-400/25" },
  { size: 72, x: "5%", y: "85%", duration: 11, color: "bg-emerald-400/25" },
  { size: 36, x: "90%", y: "15%", duration: 5, color: "bg-amber-400/30" },
  { size: 60, x: "50%", y: "50%", duration: 14, color: "bg-accent/20" },
  { size: 100, x: "30%", y: "40%", duration: 13, color: "bg-blue-500/20" },
];

export default function BackgroundBubbles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0) scale(1); }
            25% { transform: translateY(-30px) translateX(15px) scale(1.05); }
            50% { transform: translateY(-10px) translateX(-10px) scale(0.95); }
            75% { transform: translateY(-40px) translateX(20px) scale(1.02); }
          }
          @keyframes wobble {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(180deg); }
          }
          .bubble {
            position: absolute;
            border-radius: 50%;
            anrpation: float var(--duration) ease-in-out infinite;
            anrpation-delay: var(--delay);
            filter: blur(2px);
          }
          .bubble::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent 60%);
          }
        `}
      </style>
      {bubbles.map((b, i) => (
        <div
          key={i}
          className={`bubble ${b.color}`}
          style={{
            width: b.size,
            height: b.size,
            left: b.x,
            top: b.y,
            "--duration": `${b.duration}s`,
            "--delay": `${-i * 1.5}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
