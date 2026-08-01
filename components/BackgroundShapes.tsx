"use client";

export default function BackgroundShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

      {/* ── LEFT OUTER LANE (left-[1–5%]) — large shapes only ── */}
      <div style={{ rotate: "17deg"  }} className="absolute top-[4%]    left-[2%] w-20 h-20 bg-white/5     [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
      <div style={{ rotate: "134deg" }} className="absolute top-[34%]   left-[1%] w-20 h-20 bg-secondary/10 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]" />
      <div style={{ rotate: "58deg"  }} className="absolute top-[63%]   left-[3%] w-28 h-28 bg-secondary/8  [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]" />
      <div style={{ rotate: "205deg" }} className="absolute bottom-[2%]  left-[5%] w-16 h-16 bg-white/5     [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />

      {/* ── LEFT INNER LANE (left-[9–12%]) — small shapes only ── */}
      <div style={{ rotate: "344deg" }} className="absolute top-[12%]   left-[11%] w-7 h-7 bg-secondary/12 [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]" />
      <div style={{ rotate: "83deg"  }} className="absolute top-[23%]   left-[9%]  w-8 h-8 bg-white/6     [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
      <div style={{ rotate: "29deg"  }} className="absolute top-[46%]   left-[11%] w-6 h-6 bg-secondary/10 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]" />
      <div style={{ rotate: "112deg" }} className="absolute top-[55%]   left-[10%] w-9 h-9 bg-white/6     [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
      <div style={{ rotate: "271deg" }} className="absolute top-[77%]   left-[9%]  w-7 h-7 bg-secondary/10 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]" />
      <div style={{ rotate: "318deg" }} className="absolute top-[86%]   left-[12%] w-5 h-5 bg-white/6     [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />

      {/* ── RIGHT OUTER LANE (right-[1–5%]) — large shapes only ── */}
      <div style={{ rotate: "312deg" }} className="absolute top-[6%]    right-[2%] w-28 h-28 bg-secondary/10 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]" />
      <div style={{ rotate: "77deg"  }} className="absolute top-[36%]   right-[1%] w-24 h-24 bg-white/5     [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
      <div style={{ rotate: "241deg" }} className="absolute top-[65%]   right-[3%] w-16 h-16 bg-white/6     [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]" />
      <div style={{ rotate: "163deg" }} className="absolute bottom-[3%]  right-[5%] w-12 h-12 bg-secondary/8  [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]" />

      {/* ── RIGHT INNER LANE (right-[9–12%]) — small shapes only ── */}
      <div style={{ rotate: "289deg" }} className="absolute top-[10%]   right-[11%] w-6 h-6 bg-white/6     [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
      <div style={{ rotate: "146deg" }} className="absolute top-[22%]   right-[10%] w-8 h-8 bg-secondary/12 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]" />
      <div style={{ rotate: "37deg"  }} className="absolute top-[32%]   right-[9%]  w-7 h-7 bg-white/5     [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
      <div style={{ rotate: "174deg" }} className="absolute top-[50%]   right-[11%] w-9 h-9 bg-secondary/10 [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]" />
      <div style={{ rotate: "62deg"  }} className="absolute top-[62%]   right-[10%] w-6 h-6 bg-white/5     [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]" />
      <div style={{ rotate: "233deg" }} className="absolute top-[76%]   right-[9%]  w-7 h-7 bg-secondary/8  [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />

    </div>
  );
}
