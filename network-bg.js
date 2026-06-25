(() => {
  const canvas = document.getElementById("system-bg");
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let last = performance.now();
  let births = 0;
  let deaths = 0;
  let linkCount = 0;
  let hudTick = 0;

  const nodes = [];
  const mouse = { x: 0, y: 0, active: false, down: false };

  const hud = {
    entities: document.getElementById("entity-count"),
    links: document.getElementById("link-count"),
    turnover: document.getElementById("turnover-rate")
  };

  const CONFIG = {
    minNodes: prefersReducedMotion ? 26 : 42,
    maxNodes: prefersReducedMotion ? 54 : 170,
    linkDistance: 132,
    baseSpeed: prefersReducedMotion ? 0.08 : 0.25,
    clusterPull: 0.00072,
    drift: 0.018,
    birthRate: 3,
    fadeInFrames: 52,
    fadeOutFrames: 105,
    clickBurst: 14
  };

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

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function chooseAccent() {
    const r = Math.random();
    if (r < 0.12) return "cyan";
    if (r < 0.22) return "green";
    return "warm";
  }

  function colorFor(accent, alpha = 1) {
    if (accent === "cyan") return `rgba(88, 234, 241, ${alpha})`;
    if (accent === "green") return `rgba(109, 255, 190, ${alpha})`;
    return `rgba(255, 240, 191, ${alpha})`;
  }

  function clusterPoint(anchor) {
    if (anchor) {
      return {
        x: anchor.x + rand(-70, 70),
        y: anchor.y + rand(-70, 70)
      };
    }

    const lobes = [
      { x: width * 0.28, y: height * 0.36, r: Math.min(width, height) * 0.21 },
      { x: width * 0.58, y: height * 0.38, r: Math.min(width, height) * 0.24 },
      { x: width * 0.48, y: height * 0.66, r: Math.min(width, height) * 0.26 },
      { x: width * 0.76, y: height * 0.62, r: Math.min(width, height) * 0.18 }
    ];

    const lobe = lobes[Math.floor(Math.random() * lobes.length)];
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.72) * lobe.r;

    return {
      x: lobe.x + Math.cos(angle) * radius,
      y: lobe.y + Math.sin(angle) * radius
    };
  }

  function spawnNode(anchor) {
    const p = clusterPoint(anchor);
    const accent = chooseAccent();
    nodes.push({
      x: p.x,
      y: p.y,
      vx: rand(-0.42, 0.42),
      vy: rand(-0.42, 0.42),
      clusterX: p.x + rand(-70, 70),
      clusterY: p.y + rand(-70, 70),
      phase: Math.random() * Math.PI * 2,
      radius: accent === "warm" ? rand(2.1, 4.1) : rand(2.8, 4.9),
      accent,
      age: 0,
      lifespan: rand(700, 1850),
      generation: Math.floor(rand(1, 9))
    });
    births += 1;
  }

  function nodeAlpha(node) {
    if (node.age < CONFIG.fadeInFrames) {
      return node.age / CONFIG.fadeInFrames;
    }

    const timeLeft = node.lifespan - node.age;
    if (timeLeft < CONFIG.fadeOutFrames) {
      return Math.max(timeLeft / CONFIG.fadeOutFrames, 0);
    }

    return 1;
  }

  function scrollProgress() {
    const doc = document.documentElement;
    const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
    return Math.min(window.scrollY / maxScroll, 1);
  }

  function targetPopulation(time) {
    const breathing = 0.5 + 0.5 * Math.sin(time * 0.00022);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.000071 + 2.4);
    const scroll = scrollProgress();
    const scale = 0.42 * breathing + 0.28 * pulse + 0.30 * scroll;
    return Math.round(CONFIG.minNodes + (CONFIG.maxNodes - CONFIG.minNodes) * scale);
  }

  function rebalancePopulation(target) {
    if (nodes.length < target) {
      const needed = Math.min(CONFIG.birthRate, target - nodes.length);
      for (let i = 0; i < needed; i += 1) spawnNode();
    }

    if (nodes.length > target) {
      const excess = Math.min(nodes.length - target, CONFIG.birthRate);
      for (let i = 0; i < excess; i += 1) {
        const node = nodes[Math.floor(Math.random() * nodes.length)];
        if (node) node.lifespan = Math.min(node.lifespan, node.age + rand(12, 44));
      }
    }
  }

  function updateNode(node, step, time) {
    node.age += step;
    if (node.age > node.lifespan) return false;

    const wobbleX = Math.cos(time * 0.0012 + node.phase) * 0.028;
    const wobbleY = Math.sin(time * 0.0015 + node.phase) * 0.028;

    node.vx += (node.clusterX - node.x) * CONFIG.clusterPull * step;
    node.vy += (node.clusterY - node.y) * CONFIG.clusterPull * step;
    node.vx += wobbleX + rand(-CONFIG.drift, CONFIG.drift);
    node.vy += wobbleY + rand(-CONFIG.drift, CONFIG.drift);

    if (mouse.active) {
      const dx = mouse.x - node.x;
      const dy = mouse.y - node.y;
      const distSq = dx * dx + dy * dy;
      const influenceRadius = mouse.down ? 250 : 190;

      if (distSq > 0.01 && distSq < influenceRadius * influenceRadius) {
        const dist = Math.sqrt(distSq);
        const strength = (1 - dist / influenceRadius) * (mouse.down ? -0.08 : 0.044) * step;
        node.vx += (dx / dist) * strength;
        node.vy += (dy / dist) * strength;
      }
    }

    node.vx *= 0.986;
    node.vy *= 0.986;
    node.x += node.vx * CONFIG.baseSpeed * step;
    node.y += node.vy * CONFIG.baseSpeed * step;

    if (node.x < -60) node.x = width + 60;
    if (node.x > width + 60) node.x = -60;
    if (node.y < -60) node.y = height + 60;
    if (node.y > height + 60) node.y = -60;

    return true;
  }

  function drawLinks() {
    linkCount = 0;

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      const alphaA = nodeAlpha(a);

      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        const maxDist = CONFIG.linkDistance;

        if (distSq < maxDist * maxDist) {
          const dist = Math.sqrt(distSq);
          const closeness = 1 - dist / maxDist;
          const alpha = closeness * 0.46 * Math.min(alphaA, nodeAlpha(b));
          linkCount += 1;

          const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          gradient.addColorStop(0, colorFor(a.accent, alpha));
          gradient.addColorStop(1, colorFor(b.accent, alpha));

          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.45 + closeness * 0.9;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  function drawNodes(time) {
    for (const node of nodes) {
      const alpha = nodeAlpha(node);
      const pulse = 0.85 + 0.15 * Math.sin(time * 0.006 + node.phase);
      const radius = node.radius * pulse;

      ctx.beginPath();
      ctx.shadowBlur = 15;
      ctx.shadowColor = colorFor(node.accent, 0.48 * alpha);
      ctx.fillStyle = colorFor(node.accent, 0.96 * alpha);
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.shadowBlur = 0;
      ctx.fillStyle = colorFor(node.accent, 0.08 * alpha);
      ctx.arc(node.x, node.y, radius * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawMouseField() {
    if (!mouse.active) return;
    const radius = mouse.down ? 250 : 190;
    const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, radius);
    gradient.addColorStop(0, mouse.down ? "rgba(255, 240, 191, 0.10)" : "rgba(88, 234, 241, 0.12)");
    gradient.addColorStop(1, "rgba(88, 234, 241, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateHud() {
    if (hud.entities) hud.entities.textContent = String(nodes.length).padStart(2, "0");
    if (hud.links) hud.links.textContent = String(linkCount).padStart(2, "0");
    if (hud.turnover) hud.turnover.textContent = `${births}/${deaths}`;
  }

  function animate(now) {
    const dt = Math.min(now - last, 34);
    const step = dt / 16.6667;
    last = now;

    rebalancePopulation(targetPopulation(now));

    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      if (!updateNode(nodes[i], step, now)) {
        nodes.splice(i, 1);
        deaths += 1;
      }
    }

    ctx.clearRect(0, 0, width, height);
    drawMouseField();
    drawLinks();
    drawNodes(now);

    hudTick += dt;
    if (hudTick > 180) {
      updateHud();
      hudTick = 0;
    }

    requestAnimationFrame(animate);
  }

  function burstAt(x, y) {
    const anchor = { x, y };
    for (let i = 0; i < CONFIG.clickBurst; i += 1) spawnNode(anchor);
  }

  window.addEventListener("resize", resize);

  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
  });

  window.addEventListener("mousedown", (event) => {
    mouse.down = true;
    burstAt(event.clientX, event.clientY);
  });

  window.addEventListener("mouseup", () => {
    mouse.down = false;
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
    mouse.down = false;
  });

  window.addEventListener("touchmove", (event) => {
    if (!event.touches || !event.touches[0]) return;
    mouse.x = event.touches[0].clientX;
    mouse.y = event.touches[0].clientY;
    mouse.active = true;
  }, { passive: true });

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || !event.touches[0]) return;
    mouse.down = true;
    mouse.x = event.touches[0].clientX;
    mouse.y = event.touches[0].clientY;
    mouse.active = true;
    burstAt(mouse.x, mouse.y);
  }, { passive: true });

  window.addEventListener("touchend", () => {
    mouse.down = false;
    mouse.active = false;
  });

  resize();
  for (let i = 0; i < CONFIG.minNodes + 12; i += 1) spawnNode();
  updateHud();
  requestAnimationFrame(animate);
})();
