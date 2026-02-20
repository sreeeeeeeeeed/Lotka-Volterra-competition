const ids = ["r1", "r2", "k1", "k2", "a12", "a21", "n10", "n20", "tMax", "dt"];

const presets = {
  species1: { r1: 1, r2: 1, k1: 130, k2: 90, a12: 0.6, a21: 1.4, n10: 30, n20: 30, tMax: 60, dt: 0.05 },
  species2: { r1: 1, r2: 1, k1: 90, k2: 130, a12: 1.4, a21: 0.6, n10: 30, n20: 30, tMax: 60, dt: 0.05 },
  unstable: { r1: 1, r2: 1, k1: 120, k2: 120, a12: 1.4, a21: 1.4, n10: 25, n20: 25, tMax: 60, dt: 0.05 },
  stable: { r1: 1, r2: 1, k1: 120, k2: 120, a12: 0.7, a21: 0.7, n10: 25, n20: 25, tMax: 60, dt: 0.05 }
};

function applyPreset(name) {
  const p = presets[name];
  for (const id of ids) {
    document.getElementById(id).value = p[id];
  }
}

function readParams() {
  const p = {};
  for (const id of ids) {
    p[id] = Number(document.getElementById(id).value);
  }
  return p;
}

function derivatives(p, n1, n2) {
  const d1 = p.r1 * n1 * (1 - (n1 + p.a12 * n2) / Math.max(p.k1, 1e-9));
  const d2 = p.r2 * n2 * (1 - (n2 + p.a21 * n1) / Math.max(p.k2, 1e-9));
  return { d1, d2 };
}

function simulate(p) {
  const n = Math.max(2, Math.floor(p.tMax / Math.max(p.dt, 1e-6)) + 1);
  const t = new Array(n);
  const n1 = new Array(n);
  const n2 = new Array(n);

  t[0] = 0;
  n1[0] = Math.max(0, p.n10);
  n2[0] = Math.max(0, p.n20);

  for (let i = 1; i < n; i++) {
    const x = n1[i - 1];
    const y = n2[i - 1];
    const { d1, d2 } = derivatives(p, x, y);

    t[i] = i * p.dt;
    n1[i] = Math.max(0, x + p.dt * d1);
    n2[i] = Math.max(0, y + p.dt * d2);
  }

  return { t, n1, n2 };
}

function buildFieldArrows(p, xMax, yMax) {
  const grid = 15;
  const xStep = xMax / grid;
  const yStep = yMax / grid;
  const scale = 0.07;
  const arrows = [];

  for (let i = 1; i <= grid; i++) {
    for (let j = 1; j <= grid; j++) {
      const x = i * xStep;
      const y = j * yStep;
      const { d1, d2 } = derivatives(p, x, y);
      const len = Math.hypot(d1, d2) || 1;
      const ux = (d1 / len) * xMax * scale;
      const uy = (d2 / len) * yMax * scale;

      arrows.push({
        x: x + ux,
        y: y + uy,
        ax: x,
        ay: y,
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1,
        arrowwidth: 1,
        arrowcolor: "#666"
      });
    }
  }

  return arrows;
}

function zngiTraces(p, xMax) {
  const x = [0, xMax];
  const y1 = x.map(v => (p.k1 - v) / Math.max(p.a12, 1e-9));
  const y2 = x.map(v => p.k2 - p.a21 * v);

  return [
    {
      x,
      y: y1,
      mode: "lines",
      name: "dN₁/dt = 0",
      line: { dash: "dash" }
    },
    {
      x,
      y: y2,
      mode: "lines",
      name: "dN₂/dt = 0",
      line: { dash: "dot" }
    }
  ];
}

function render() {
  const p = readParams();
  const sim = simulate(p);

  Plotly.newPlot("popTime", [
    { x: sim.t, y: sim.n1, mode: "lines", name: "Species 1" },
    { x: sim.t, y: sim.n2, mode: "lines", name: "Species 2" }
  ], {
    title: "Population vs Time",
    xaxis: { title: "Time" },
    yaxis: { title: "Population" },
    margin: { t: 40, r: 10, b: 40, l: 50 }
  });

  const maxN1 = Math.max(...sim.n1, p.k1, p.n10, 1) * 1.15;
  const maxN2 = Math.max(...sim.n2, p.k2, p.n20, 1) * 1.15;
  const fieldArrows = buildFieldArrows(p, maxN1, maxN2);

  Plotly.newPlot("isoclineField", zngiTraces(p, maxN1), {
    title: "Zero-Growth Isoclines + Vector Field",
    xaxis: { title: "N₁", range: [0, maxN1] },
    yaxis: { title: "N₂", range: [0, maxN2] },
    annotations: fieldArrows,
    margin: { t: 40, r: 10, b: 45, l: 50 }
  });

  Plotly.newPlot("phaseSpace", [
    {
      x: sim.n1,
      y: sim.n2,
      mode: "lines",
      name: "Trajectory"
    }
  ], {
    title: "Phase-Space Plot",
    xaxis: { title: "N₁", range: [0, maxN1] },
    yaxis: { title: "N₂", range: [0, maxN2] },
    margin: { t: 40, r: 10, b: 45, l: 50 }
  });
}

document.getElementById("applyPreset").addEventListener("click", () => {
  applyPreset(document.getElementById("preset").value);
  render();
});

document.getElementById("update").addEventListener("click", render);
applyPreset(document.getElementById("preset").value);
render();