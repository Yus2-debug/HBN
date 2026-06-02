const app = document.getElementById("app");
const scenes = [...document.querySelectorAll(".scene")];
const dots = [...document.querySelectorAll(".progress span")];
const nextButtons = [...document.querySelectorAll("[data-next]")];
const loaderScreen = document.getElementById("loaderScreen");
const loaderBar = document.getElementById("loaderBar");
const loaderPercent = document.getElementById("loaderPercent");
const sceneGuide = document.getElementById("sceneGuide");
const sceneGuideText = document.getElementById("sceneGuideText");
const backSceneButton = document.getElementById("backScene");
const musicToggle = document.getElementById("musicToggle");

const sceneGuides = [
  "按住中间圆环，让时间慢到 100%",
  "拖动滑杆，比较快白循环和慢白变化",
  "点击花瓣或下方任务，点亮 4 个科研数据",
  "点击一个慢时刻，生成你的专属卡片",
  "按住圆环边缘移动，慢慢画完整一圈",
  "点击生成海报，长按图片保存分享",
];

const proofData = [
  {
    title: "6000+ 人次人体功效实测",
    text: "在国际权威机构和三甲医院临床进行人体功效实测，远超行业与国标常规验证标准。",
  },
  {
    title: "50+ 篇国际 SCI 论文成果",
    text: "每一篇基础科研背后，都是以“年”为单位的长期投入和探索。",
  },
  {
    title: "抑制黑色素合成 50.69%",
    text: "TIMR94™pro 美白豪华组分搭配双抗去黄，根源抑黑，高效美白。",
  },
  {
    title: "96.9% 用户认可真功效",
    text: "SGS 权威机构人体实测，用户认可美白淡斑真功效，白得稳稳的。",
  },
];

const collectedProofs = new Set();

const moments = {
  coffee: "我选择慢慢喝完一杯咖啡",
  book: "我选择慢慢看完一本书",
  bright: "我选择慢慢变白，不反黑",
  draw: "我选择慢慢画一幅画",
};

const momentScenes = {
  coffee: {
    src: "./assets/images/moment-coffee.jpg",
    alt: "慢慢喝完一杯咖啡",
  },
  book: {
    src: "./assets/images/moment-book.png",
    alt: "慢慢看完一本书",
  },
  bright: {
    src: "./assets/images/moment-bright.png",
    alt: "慢慢变白，不反黑",
  },
  draw: {
    src: "./assets/images/moment-draw.png",
    alt: "慢慢画一幅画",
  },
};

let currentScene = 0;
let slowValue = 0;
let holdTimer = null;
let selectedMoment = moments.coffee;
let selectedMomentKey = "coffee";
let ritualTag = "慢下来，让真实的光出现。";
let drawStart = 0;
let drawTimer = null;
let isDrawing = false;
let drawProgress = 0;
let drawElapsed = 0;
let drawPath = [];
let drawBins = new Set();
let drawPointerId = null;
let audioContext = null;
let musicTimer = null;
let musicGain = null;
let isMusicOn = false;

function setScene(index) {
  currentScene = Math.max(0, Math.min(index, scenes.length - 1));
  scenes.forEach((scene, sceneIndex) => {
    scene.classList.toggle("scene-active", sceneIndex === currentScene);
  });
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === currentScene);
  });
  scenes.forEach((scene) => {
    scene.scrollTop = 0;
  });
  document.documentElement.dataset.activeScene = String(currentScene);
  if (currentScene === 2) {
    resetProofGame();
  }
  if (currentScene === 4) {
    resetDrawCanvas();
  }
  if (currentScene === 5) {
    updateFinalPoster();
  }
  if (backSceneButton) {
    backSceneButton.disabled = currentScene === 0;
  }
  updateSceneGuide();
}

function updateSceneGuide() {
  if (!sceneGuide || !sceneGuideText) return;
  sceneGuideText.textContent = sceneGuides[currentScene] || sceneGuides[0];
  sceneGuide.classList.remove("is-pulse");
  void sceneGuide.offsetWidth;
  sceneGuide.classList.add("is-pulse");
}

document.addEventListener("click", (event) => {
  const next = event.target.closest("[data-next]");
  if (!next || next.disabled || !nextButtons.includes(next)) return;
  setScene(currentScene + 1);
});

if (backSceneButton) {
  backSceneButton.addEventListener("click", () => {
    if (currentScene <= 0) return;
    setScene(currentScene - 1);
  });
}

function playTone(frequency, start, duration) {
  if (!audioContext || !musicGain) return;
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(0.13, start + 0.04);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(musicGain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function scheduleMusicLoop() {
  if (!audioContext || !isMusicOn) return;
  const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
  const now = audioContext.currentTime + 0.05;
  notes.forEach((note, index) => {
    playTone(note, now + index * 0.34, 0.32);
  });
}

async function startMusic() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  if (!audioContext) {
    audioContext = new AudioCtor();
    musicGain = audioContext.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(audioContext.destination);
  }
  await audioContext.resume();
  isMusicOn = true;
  musicToggle?.classList.add("is-on");
  musicToggle?.setAttribute("aria-pressed", "true");
  musicToggle?.setAttribute("aria-label", "关闭音乐");
  scheduleMusicLoop();
  musicTimer = window.setInterval(scheduleMusicLoop, 2700);
}

function stopMusic() {
  isMusicOn = false;
  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  musicToggle?.classList.remove("is-on");
  musicToggle?.setAttribute("aria-pressed", "false");
  musicToggle?.setAttribute("aria-label", "开启音乐");
}

if (musicToggle) {
  musicToggle.addEventListener("click", async () => {
    if (isMusicOn) {
      stopMusic();
      return;
    }
    await startMusic();
  });
}

function updateSlow(value) {
  slowValue = Math.max(0, Math.min(100, value));
  app.style.setProperty("--slow", slowValue.toFixed(0));
  document.getElementById("holdPercent").textContent = `${Math.round(slowValue)}%`;
  document.querySelector(".intro").classList.toggle("is-slow", slowValue > 58);
  document.querySelector(".intro").classList.toggle("is-complete", slowValue >= 100);
  document.getElementById("introNext").disabled = slowValue < 100;
}

function startHold(event) {
  event.preventDefault();
  if (holdTimer) return;
  holdTimer = window.setInterval(() => {
    updateSlow(slowValue + 2.6);
    if (slowValue >= 100) stopHold(false);
  }, 38);
}

function stopHold(softDrop = true) {
  if (holdTimer) {
    window.clearInterval(holdTimer);
    holdTimer = null;
  }
  if (softDrop && slowValue < 100) {
    updateSlow(Math.max(0, slowValue - 10));
  }
}

const holdZone = document.getElementById("holdZone");
holdZone.addEventListener("pointerdown", startHold);
holdZone.addEventListener("pointerup", () => stopHold(true));
holdZone.addEventListener("pointerleave", () => stopHold(true));
holdZone.addEventListener("pointercancel", () => stopHold(true));
holdZone.addEventListener("click", () => updateSlow(slowValue + 42));
holdZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    updateSlow(slowValue + 42);
  }
});

document.getElementById("introNext").addEventListener("click", () => setScene(1));

const timelineSlider = document.getElementById("timelineSlider");
const splitStage = document.getElementById("splitStage");
const timelineChoice = document.getElementById("timelineChoice");
let splitDragging = false;

function splitToValue(clientX) {
  if (!splitStage) return 50;
  const rect = splitStage.getBoundingClientRect();
  const ratio = ((clientX - rect.left) / rect.width) * 100;
  return Math.max(12, Math.min(88, ratio));
}

function updateTimelineSplit(value) {
  if (!timelineSlider || !splitStage || !timelineChoice) return;
  const split = Math.max(12, Math.min(88, Number(value)));
  splitStage.style.setProperty("--split", split.toFixed(0));
  splitStage.style.setProperty("--fast-size", `${split.toFixed(0)}%`);
  splitStage.style.setProperty("--slow-size", `${(100 - split).toFixed(0)}%`);
  timelineSlider.value = String(split);
  splitStage.classList.toggle("is-fast", split < 42);
  splitStage.classList.toggle("is-slow", split > 58);

  if (split < 42) {
    timelineChoice.textContent = "你正在进入时间线A：快的白，亮暗反复循环。";
  } else if (split > 58) {
    timelineChoice.textContent = "你正在进入时间线B：慢的白，像花一样稳稳变好。";
  } else {
    timelineChoice.textContent = "停在中间：同时看见两种结局。";
  }
}

if (timelineSlider) {
  timelineSlider.addEventListener("input", (event) => updateTimelineSplit(event.target.value));
  updateTimelineSplit(timelineSlider.value);
}

if (splitStage) {
  splitStage.addEventListener("pointerdown", (event) => {
    splitDragging = true;
    updateTimelineSplit(splitToValue(event.clientX));
  });
  splitStage.addEventListener("pointermove", (event) => {
    if (!splitDragging) return;
    updateTimelineSplit(splitToValue(event.clientX));
  });
  splitStage.addEventListener("pointerup", () => {
    splitDragging = false;
  });
  splitStage.addEventListener("pointercancel", () => {
    splitDragging = false;
  });
  splitStage.addEventListener("pointerleave", () => {
    splitDragging = false;
  });
}

const proofPetals = [...document.querySelectorAll(".petal")];
const scienceStars = [...document.querySelectorAll(".science-star")];
const proofScore = document.getElementById("proofScore");
const flowerScene = document.querySelector(".flower-scene");
const proofCard = document.getElementById("proofCard");
const proofGameLabel = document.querySelector(".proof-game span");

function updateProofScore() {
  const count = collectedProofs.size;
  const complete = count >= proofData.length;
  proofScore.textContent = complete ? "集齐" : `${count}/4`;
  proofGameLabel.textContent = complete ? "慢科研任务已完成" : "点亮慢科研任务";
  flowerScene.classList.toggle("is-complete", complete);
  proofCard.classList.toggle("is-complete", complete);
}

function resetProofGame() {
  collectedProofs.clear();
  proofPetals.forEach((item, index) => {
    item.classList.toggle("is-open", index === 0);
    item.classList.remove("is-caught");
  });
  scienceStars.forEach((item) => item.classList.remove("is-caught"));
  document.getElementById("proofTitle").textContent = proofData[0].title;
  document.getElementById("proofText").textContent = proofData[0].text;
  updateProofScore();
}

function collectProof(index) {
  collectedProofs.add(index);
  proofPetals
    .filter((item) => Number(item.dataset.proof) === index)
    .forEach((item) => item.classList.add("is-caught"));
  scienceStars
    .filter((item) => Number(item.dataset.proof) === index)
    .forEach((item) => item.classList.add("is-caught"));
  updateProofScore();
}

function selectProof(index) {
  const data = proofData[index];
  proofPetals.forEach((item) => item.classList.toggle("is-open", Number(item.dataset.proof) === index));
  document.getElementById("proofTitle").textContent = data.title;
  document.getElementById("proofText").textContent = data.text;
  collectProof(index);
}

[...proofPetals, ...scienceStars].forEach((button) => {
  button.addEventListener("click", () => {
    selectProof(Number(button.dataset.proof));
  });
});

function setMoment(value, momentKey = selectedMomentKey) {
  selectedMoment = value;
  selectedMomentKey = momentScenes[momentKey] ? momentKey : selectedMomentKey;
  document.getElementById("cardTitle").textContent = selectedMoment;
  const scene = momentScenes[selectedMomentKey];
  const cardSceneImage = document.getElementById("cardSceneImage");
  cardSceneImage.src = scene.src;
  cardSceneImage.alt = scene.alt;
  const slowCard = document.getElementById("slowCard");
  slowCard.classList.remove("is-refreshing");
  void slowCard.offsetWidth;
  slowCard.classList.add("is-refreshing");
}

document.querySelectorAll(".moment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".moment").forEach((item) => item.classList.toggle("is-active", item === button));
    document.getElementById("customMoment").value = "";
    setMoment(moments[button.dataset.moment], button.dataset.moment);
  });
});

document.getElementById("customMoment").addEventListener("input", (event) => {
  const value = event.target.value.trim();
  document.querySelectorAll(".moment").forEach((item) => item.classList.remove("is-active"));
  setMoment(value ? `我选择${value}` : moments.coffee);
});

const drawStage = document.getElementById("drawStage");
const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");
const drawTimeEl = document.getElementById("drawTime");
const drawHint = document.getElementById("drawHint");
const ritualResult = document.getElementById("ritualResult");
const DRAW_CENTER = 160;
const DRAW_RADIUS = 118;
const DRAW_TOTAL_BINS = 96;

function resetDrawCanvas() {
  drawProgress = 0;
  isDrawing = false;
  drawStart = 0;
  drawElapsed = 0;
  drawPath = [];
  drawBins = new Set();
  drawPointerId = null;
  window.clearInterval(drawTimer);
  drawTimer = null;
  drawStage.classList.remove("is-drawing", "is-complete");
  drawStage.style.setProperty("--draw", 0);
  drawTimeEl.textContent = "0.0s";
  drawHint.textContent = "沿圆环慢慢画";
  ritualResult.textContent = ritualTag;
  drawBaseRing();
}

function drawBaseRing() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,.26)";
  ctx.beginPath();
  ctx.arc(DRAW_CENTER, DRAW_CENTER, DRAW_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
}

function drawArc(progress) {
  drawBaseRing();
  ctx.strokeStyle = "#f6d88b";
  ctx.beginPath();
  ctx.arc(DRAW_CENTER, DRAW_CENTER, DRAW_RADIUS, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
}

function getDrawSeconds() {
  if (!isDrawing) return drawElapsed;
  return drawElapsed + (performance.now() - drawStart) / 1000;
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function markDrawBin(point) {
  const dx = point.x - DRAW_CENTER;
  const dy = point.y - DRAW_CENTER;
  const radius = Math.hypot(dx, dy);
  if (radius < 64 || radius > 158) return;
  const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
  drawBins.add(Math.floor((angle / (Math.PI * 2)) * DRAW_TOTAL_BINS));
}

function addDrawPoint(point) {
  const last = drawPath[drawPath.length - 1];
  if (!last) {
    drawPath.push(point);
    markDrawBin(point);
    return;
  }

  const distance = Math.hypot(point.x - last.x, point.y - last.y);
  const steps = Math.max(1, Math.ceil(distance / 7));
  for (let step = 1; step <= steps; step += 1) {
    const nextPoint = {
      x: last.x + ((point.x - last.x) * step) / steps,
      y: last.y + ((point.y - last.y) * step) / steps,
    };
    drawPath.push(nextPoint);
    markDrawBin(nextPoint);
  }
}

function drawUserTrail() {
  drawBaseRing();
  if (drawPath.length < 2) return;

  ctx.save();
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#f6d88b";
  ctx.shadowColor = "rgba(246, 216, 139, 0.85)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(drawPath[0].x, drawPath[0].y);
  for (const point of drawPath.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();
}

function isCircleClosed() {
  if (drawPath.length < 24) return false;
  const first = drawPath[0];
  const last = drawPath[drawPath.length - 1];
  return Math.hypot(last.x - first.x, last.y - first.y) < 56;
}

function syncDrawProgress() {
  const coverage = drawBins.size / DRAW_TOTAL_BINS;
  drawProgress = Math.min(99, Math.round(coverage * 118));
  drawStage.style.setProperty("--draw", drawProgress.toFixed(0));
  drawTimeEl.textContent = `${getDrawSeconds().toFixed(1)}s`;
  drawUserTrail();

  if (drawProgress > 78) {
    drawHint.textContent = "快闭合了，回到起点";
  } else if (drawProgress > 38) {
    drawHint.textContent = "很好，继续绕完整";
  } else {
    drawHint.textContent = "沿着圆环慢慢走";
  }

  const seconds = getDrawSeconds();
  if (seconds >= 1.2 && ((coverage >= 0.84 && isCircleClosed()) || coverage >= 0.96)) {
    finishDraw(seconds);
  }
}

function releaseDrawPointer() {
  if (drawPointerId === null || !drawStage.hasPointerCapture?.(drawPointerId)) return;
  drawStage.releasePointerCapture(drawPointerId);
}

function finishDraw(seconds) {
  isDrawing = false;
  window.clearInterval(drawTimer);
  drawTimer = null;
  drawElapsed = seconds;
  releaseDrawPointer();
  drawPointerId = null;
  drawProgress = 100;
  drawArc(1);
  drawStage.classList.remove("is-drawing");
  drawStage.classList.add("is-complete");
  drawStage.style.setProperty("--draw", 100);
  drawTimeEl.textContent = `${seconds.toFixed(1)}s`;

  if (seconds < 3) {
    ritualTag = "你比加速时代还快。";
  } else if (seconds < 8) {
    ritualTag = "你已经学会慢了。";
  } else {
    ritualTag = "你是真正的慢行者。";
  }
  ritualResult.textContent = ritualTag;
  drawHint.textContent = "光透圆环已完成";
}

function startDraw(event) {
  event.preventDefault();
  if (isDrawing) return;
  if (drawProgress >= 100) {
    resetDrawCanvas();
  }
  isDrawing = true;
  drawPointerId = event.pointerId;
  drawStart = performance.now();
  drawStage.classList.add("is-drawing");
  drawStage.classList.remove("is-complete");
  drawHint.textContent = drawProgress > 0 ? "继续补完整这个圆" : "沿着圆环慢慢画";
  drawStage.setPointerCapture?.(event.pointerId);
  addDrawPoint(getCanvasPoint(event));
  syncDrawProgress();
  drawTimer = window.setInterval(() => {
    drawTimeEl.textContent = `${getDrawSeconds().toFixed(1)}s`;
  }, 50);
}

function moveDraw(event) {
  if (!isDrawing || event.pointerId !== drawPointerId) return;
  event.preventDefault();
  addDrawPoint(getCanvasPoint(event));
  syncDrawProgress();
}

function endDraw(event) {
  if (!isDrawing || (event && event.pointerId !== drawPointerId)) return;
  const seconds = getDrawSeconds();
  drawElapsed = seconds;
  releaseDrawPointer();
  drawPointerId = null;
  if (seconds >= 1.2 && drawProgress > 88 && isCircleClosed()) {
    finishDraw(seconds);
    return;
  }
  isDrawing = false;
  window.clearInterval(drawTimer);
  drawTimer = null;
  drawStage.classList.remove("is-drawing");
  drawStage.style.setProperty("--draw", drawProgress.toFixed(0));
  drawUserTrail();
  drawHint.textContent = drawProgress > 58 ? "还差一点，补完整" : "从圆环边上再试试";
}

drawStage.addEventListener("pointerdown", startDraw);
drawStage.addEventListener("pointermove", moveDraw);
drawStage.addEventListener("pointerup", endDraw);
drawStage.addEventListener("pointerleave", endDraw);
drawStage.addEventListener("pointercancel", endDraw);

function updateFinalPoster() {
  const posterTitle = document.getElementById("posterTitle");
  const posterTag = document.getElementById("posterTag");
  if (posterTitle) posterTitle.textContent = selectedMoment;
  if (posterTag) posterTag.textContent = ritualTag;
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function wrapText(context, text, x, y, width, lineHeight, maxLines) {
  let line = "";
  let lines = 0;
  for (const char of [...text]) {
    const nextLine = line + char;
    if (context.measureText(nextLine).width > width && line) {
      context.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = char;
      if (lines >= maxLines - 1) break;
    } else {
      line = nextLine;
    }
  }
  if (line) context.fillText(line, x, y);
}

async function makePoster() {
  const posterCanvas = document.getElementById("posterCanvas");
  const posterCtx = posterCanvas.getContext("2d");
  const finalPoster = await loadImage("./assets/images/final-poster-v3.png");

  posterCanvas.width = finalPoster.naturalWidth || finalPoster.width;
  posterCanvas.height = finalPoster.naturalHeight || finalPoster.height;
  posterCtx.clearRect(0, 0, posterCanvas.width, posterCanvas.height);
  posterCtx.drawImage(finalPoster, 0, 0, posterCanvas.width, posterCanvas.height);

  const preview = document.getElementById("posterPreview");
  preview.src = posterCanvas.toDataURL("image/jpeg", 0.92);
  preview.hidden = false;
  document.getElementById("finalShowcase").hidden = true;
  document.getElementById("finalNote").textContent = "海报已生成，可长按图片保存转发。";
}

document.getElementById("makePoster").addEventListener("click", makePoster);

document.getElementById("copyText").addEventListener("click", async () => {
  const copy = `HBN｜慢光阴\n${selectedMoment}\n${ritualTag}\n你等一朵花开需要60天，HBN等一篇SCI论文需要3年。\n慢一点，白得远一点。`;
  try {
    await navigator.clipboard.writeText(copy);
    document.getElementById("finalNote").textContent = "分享文案已复制。";
  } catch {
    document.getElementById("finalNote").textContent = copy;
  }
});

document.getElementById("restart").addEventListener("click", () => {
  updateSlow(0);
  selectedMoment = moments.coffee;
  selectedMomentKey = "coffee";
  ritualTag = "慢下来，让真实的光出现。";
  document.getElementById("finalShowcase").hidden = false;
  document.getElementById("finalPoster").hidden = false;
  document.getElementById("posterPreview").hidden = true;
  document.getElementById("finalNote").textContent = "HBN · 让真功效名副其实";
  setMoment(selectedMoment, selectedMomentKey);
  setScene(0);
});

function startLoader() {
  if (!loaderScreen || !loaderBar || !loaderPercent) return;
  let progress = 0;
  const timer = window.setInterval(() => {
    progress = Math.min(100, progress + (progress < 68 ? 9 : 4));
    loaderBar.style.width = `${progress}%`;
    loaderPercent.textContent = `${progress}%`;
    if (progress >= 100) {
      window.clearInterval(timer);
      window.setTimeout(() => {
        loaderScreen.classList.add("is-hidden");
      }, 360);
    }
  }, 95);
}

drawBaseRing();
updateSlow(0);
setScene(0);
startLoader();
