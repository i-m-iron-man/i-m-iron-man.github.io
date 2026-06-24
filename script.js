const canvas = document.getElementById("skyroad-canvas");
const ctx = canvas.getContext("2d");
const speedMeter = document.getElementById("speed-meter");
const oxygenMeter = document.getElementById("oxygen-meter");
const fuelMeter = document.getElementById("fuel-meter");

let width = 0;
let height = 0;
let dpr = 1;
let shipX = 0;
let targetShipX = 0;
let t = 0;
let scrollProgress = 0;
let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stars = Array.from({ length: 120 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: Math.random() * 0.8 + 0.2,
  blink: Math.random() * Math.PI * 2
}));

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawStars() {
  ctx.save();
  for (const star of stars) {
    const speed = reducedMotion ? 0 : 0.0007 * star.z;
    star.y += speed;
    if (star.y > 1.05) {
      star.y = -0.05;
      star.x = Math.random();
    }
    const twinkle = 0.45 + Math.sin(t * 0.03 + star.blink) * 0.25;
    ctx.globalAlpha = clamp(twinkle, 0.15, 0.85);
    ctx.fillStyle = star.z > 0.7 ? "#62f5ff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height * 0.75, star.z * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roadPoint(z, laneOffset = 0) {
  const perspective = 1 / z;
  const centerX = width / 2 + Math.sin(z * 4 + t * 0.015) * 20 * (1 - z);
  const y = height * (0.24 + perspective * 0.76);
  const roadWidth = width * 0.13 * perspective;
  return {
    x: centerX + laneOffset * roadWidth,
    y,
    roadWidth
  };
}

function drawRoad() {
  const segments = 34;
  const bottom = roadPoint(0.22);
  const top = roadPoint(2.4);

  const gradient = ctx.createLinearGradient(0, top.y, 0, bottom.y);
  gradient.addColorStop(0, "rgba(52,140,255,0.05)");
  gradient.addColorStop(0.55, "rgba(98,245,255,0.16)");
  gradient.addColorStop(1, "rgba(255,79,216,0.26)");

  ctx.save();
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(top.x - top.roadWidth, top.y);
  ctx.lineTo(top.x + top.roadWidth, top.y);
  ctx.lineTo(bottom.x + bottom.roadWidth, bottom.y);
  ctx.lineTo(bottom.x - bottom.roadWidth, bottom.y);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(98,245,255,0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < segments; i++) {
    const z = 0.24 + i * 0.065 + ((t * 0.002) % 0.065);
    const p = roadPoint(z);
    const alpha = clamp(1.35 - z * 0.5, 0.08, 0.85);
    ctx.strokeStyle = `rgba(98,245,255,${alpha})`;
    ctx.lineWidth = clamp(6 / z, 1, 8);
    ctx.beginPath();
    ctx.moveTo(p.x - p.roadWidth, p.y);
    ctx.lineTo(p.x + p.roadWidth, p.y);
    ctx.stroke();

    if (i % 5 === 0) {
      const tileW = p.roadWidth * 0.35;
      const tileH = clamp(80 / z, 6, 34);
      const offset = ((i / 5) % 3) - 1;
      const colors = ["rgba(141,255,141,0.52)", "rgba(98,245,255,0.42)", "rgba(255,90,122,0.42)"];
      ctx.fillStyle = colors[(i / 5) % colors.length];
      ctx.fillRect(p.x + offset * p.roadWidth * 0.45 - tileW / 2, p.y - tileH / 2, tileW, tileH);
    }
  }

  for (let lane = -0.5; lane <= 0.5; lane += 0.5) {
    ctx.strokeStyle = lane === 0 ? "rgba(255,255,255,0.2)" : "rgba(98,245,255,0.25)";
    ctx.lineWidth = lane === 0 ? 1 : 2;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const z = 0.22 + i * 0.09;
      const p = roadPoint(z, lane);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawShip() {
  const baseY = height * 0.76;
  const baseX = width / 2 + shipX * Math.min(width * 0.18, 180);
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(shipX * 0.12);

  ctx.shadowBlur = 22;
  ctx.shadowColor = "rgba(98,245,255,0.9)";
  ctx.fillStyle = "#e8fbff";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(30, 20);
  ctx.lineTo(6, 12);
  ctx.lineTo(0, 26);
  ctx.lineTo(-6, 12);
  ctx.lineTo(-30, 20);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = "rgba(255,79,216,0.9)";
  ctx.fillStyle = "#ff4fd8";
  ctx.beginPath();
  ctx.moveTo(-10, 24);
  ctx.lineTo(0, 48 + Math.sin(t * 0.15) * 8);
  ctx.lineTo(10, 24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function updateMeters() {
  const fuel = clamp(78 - scrollProgress * 22 + Math.sin(t * 0.025) * 5, 22, 100);
  const oxygen = clamp(94 - scrollProgress * 10 + Math.cos(t * 0.02) * 3, 38, 100);
  const speed = clamp(64 + Math.abs(shipX) * 24 + scrollProgress * 10, 30, 100);

  speedMeter.value = speed;
  oxygenMeter.value = oxygen;
  fuelMeter.value = fuel;
}

function draw() {
  t += reducedMotion ? 0.2 : 1;
  shipX += (targetShipX - shipX) * 0.08;

  ctx.clearRect(0, 0, width, height);
  drawStars();
  drawRoad();
  drawShip();
  updateMeters();

  requestAnimationFrame(draw);
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  targetShipX = clamp((event.clientX / width - 0.5) * 2, -1, 1);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") targetShipX = clamp(targetShipX - 0.18, -1, 1);
  if (event.key === "ArrowRight") targetShipX = clamp(targetShipX + 0.18, -1, 1);
});

window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = max > 0 ? window.scrollY / max : 0;
}, { passive: true });

resize();
draw();
