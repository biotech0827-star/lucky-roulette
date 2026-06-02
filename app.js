/**
 * 🎈 Cute & Colorful Roulette Event Page JavaScript Engine 🎈
 * Featuring physical rotation simulation, Web Audio synthesis, and canvas particles.
 */

// Global State
let totalSpinsCount = 0;
let winSpinsCount = 0;
let isSpinning = false;
let wheelAngle = 0; // Current rotation angle in degrees
let animationId = null;

// Audio Context (Initialized on user interaction due to browser policies)
let audioCtx = null;

// Confetti System State
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiActive = false;
let confettiParticles = [];
const confettiColors = ['#FF7B93', '#FFD25A', '#6AD3FF', '#7DEDAB', '#FF9F43', '#A55EEA'];

// Roulette Configuration
const canvas = document.getElementById('rouletteCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;
const radius = width / 2;

// Sector Definition:
// Win slice (당첨) = 5% = 18 degrees.
// Lose slice (꽝) = 95% = 342 degrees.
// We align the Win slice in local space from 342° to 360°.
// The Lose slice occupies 0° to 342°.
const WIN_SECTOR_START = 342;
const WIN_SECTOR_END = 360;

// Setup High-DPI canvas rendering
function setupCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
}

/**
 * Initialize Audio Context securely on first user input.
 */
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Sound Synthesizer: Plays a cute wooden click/tick sound.
 */
function playTickSound() {
  if (!audioCtx) return;
  initAudio();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.04);
  
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

/**
 * Sound Synthesizer: Plays a cheerful retro winning arpeggio.
 */
function playWinSound() {
  if (!audioCtx) return;
  initAudio();
  
  const now = audioCtx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
  
  notes.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + index * 0.08);
    
    gain.gain.setValueAtTime(0, now + index * 0.08);
    gain.gain.linearRampToValueAtTime(0.2, now + index * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now + index * 0.08);
    osc.stop(now + index * 0.08 + 0.35);
  });
}

/**
 * Sound Synthesizer: Plays a cute boing/spring sound for losing.
 */
function playLoseSound() {
  if (!audioCtx) return;
  initAudio();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

/**
 * Draw the roulette wheel onto the canvas.
 * @param {number} rotationAngle - The current rotation angle in degrees.
 */
function drawWheel(rotationAngle) {
  ctx.clearRect(0, 0, width, height); // Clear the entire 480x480 canvas
  
  const cx = width / 2; // 240
  const cy = height / 2; // 240
  const r = width / 2 - 12; // 228 (Leaves a small 12px margin on 480px canvas)
  
  ctx.save();
  ctx.translate(cx, cy);
  // Convert degrees to radians and rotate
  ctx.rotate((rotationAngle * Math.PI) / 180);
  
  // 1. Draw Sector: 95% '꽝' (Try Again)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, 0, (WIN_SECTOR_START * Math.PI) / 180);
  ctx.closePath();
  ctx.fillStyle = '#E8F1FF'; // Soft cute sky pastel blue
  ctx.fill();
  
  // Draw subtle inner circle border for standard cute aesthetic
  ctx.strokeStyle = '#BDD5FF';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 2. Draw Sector: 5% '당첨' (Win)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, (WIN_SECTOR_START * Math.PI) / 180, (WIN_SECTOR_END * Math.PI) / 180);
  ctx.closePath();
  ctx.fillStyle = '#FF7B93'; // Vibrant cute coral pink
  ctx.fill();
  
  ctx.strokeStyle = '#FFAEC1';
  ctx.stroke();

  // 3. Draw Stars/Sparkles on the Winning 5% sector (Pink Sector)
  ctx.save();
  ctx.rotate((351 * Math.PI) / 180); // Rotate to center of 5% slice
  ctx.fillStyle = '#FFD25A'; // Golden stars
  drawStar(r * 0.75, 0, 5, 14, 7); // Draw along the positive X-axis (inside pink wedge)
  ctx.restore();

  // 4. Draw Sector Text
  // Draw '꽝' in the 95% sector (Blue Sector)
  ctx.save();
  // Rotate to the center of the 95% sector: (0 + 342) / 2 = 171 degrees
  ctx.rotate((171 * Math.PI) / 180);
  ctx.fillStyle = '#6E8BB2'; // Cute dark blue-grey for readability
  ctx.font = '48px "Jua", sans-serif'; // Scaled up font size
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('꽝', r * 0.5, 0); // Draw along the positive X-axis (inside blue wedge)
  ctx.restore();
  
  // Draw '당첨' in the 5% sector (Pink Sector)
  ctx.save();
  // Rotate to the center of the 5% sector: (342 + 360) / 2 = 351 degrees
  ctx.rotate((351 * Math.PI) / 180);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '24px "Jua", sans-serif'; // Scale down slightly to fit 18-degree wedge perfectly
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('당첨', r * 0.45, 0); // Draw along the positive X-axis (inside pink wedge)
  ctx.restore();

  // 5. Draw decorative golden pins around the edge (one every 30 degrees)
  ctx.fillStyle = '#FFD25A';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  for (let a = 0; a < 360; a += 30) {
    ctx.save();
    ctx.rotate((a * Math.PI) / 180);
    ctx.beginPath();
    ctx.arc(0, -r + 8, 6, 0, Math.PI * 2); // Thicker pins at scaled radius
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // 6. Draw central gold hub (stationary circle with cute star or face)
  ctx.save();
  ctx.translate(cx, cy);
  
  // Inner white drop shadow ring
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(74, 62, 61, 0.05)';
  ctx.fill();

  // Outer bubble hub
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD25A'; // Golden yellow center
  ctx.shadowColor = 'rgba(74, 62, 61, 0.15)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  
  // White highlight for glossy 3D ball effect
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.arc(-12, -12, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();

  // Cute face on the hub
  ctx.fillStyle = '#5A4614';
  ctx.beginPath();
  ctx.arc(-10, 4, 3, 0, Math.PI * 2); // Left eye
  ctx.arc(10, 4, 3, 0, Math.PI * 2);  // Right eye
  ctx.fill();
  // Cute smile mouth
  ctx.beginPath();
  ctx.arc(0, 8, 6, 0, Math.PI);
  ctx.strokeStyle = '#5A4614';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a star helper.
 */
function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

/**
 * Trigger physical wiggling of the pointer needle.
 */
function triggerPointerWiggle() {
  const pointer = document.getElementById('pointerNeedle');
  pointer.classList.remove('wiggle');
  void pointer.offsetWidth; // Trigger reflow to restart animation
  pointer.classList.add('wiggle');
}

/**
 * Spin the roulette wheel with custom physical deceleration.
 */
function startSpin() {
  if (isSpinning) return;
  
  // Securely activate audio contexts
  initAudio();
  
  isSpinning = true;
  document.getElementById('spinButton').disabled = true;
  document.getElementById('statusPanel').classList.add('active');
  document.getElementById('statusIcon').textContent = '⚡';
  document.getElementById('statusText').textContent = '신나게 돌아가는 중... 두근두근!';

  // Reset confetti just in case
  stopConfetti();

  // Determine Win or Loss based on true mathematical 5% probability:
  // Math.random() < 0.05
  const isWinResult = Math.random() < 0.05;
  
  // Select a target landing angle in the selected sector (local space of the wheel)
  // Pointer is at the top (270 degrees).
  // Standard math angle starts at 3 o'clock (0 degrees) and goes clockwise.
  // Wheel local space:
  // - '당첨' is in [342, 360] degrees. Let's aim safely within [344, 358] to avoid borders.
  // - '꽝' is in [0, 342] degrees. Let's aim safely within [10, 332].
  
  let targetLocalAngle;
  if (isWinResult) {
    targetLocalAngle = 344 + Math.random() * 14; // random between 344 and 358
  } else {
    targetLocalAngle = 10 + Math.random() * 322; // random between 10 and 332
  }

  // To make the wheel stop such that `targetLocalAngle` is aligned under the pointer at 270°:
  // (targetLocalAngle + targetRotateAngle) % 360 = 270
  // targetRotateAngle = (270 - targetLocalAngle + 360) % 360
  const targetRotateAngle = (270 - targetLocalAngle + 360) % 360;

  // Add 6 to 9 full spins to make it spin rapidly for a satisfying time
  const extraRotations = 6 + Math.floor(Math.random() * 4);
  const startAngle = wheelAngle % 360;
  const targetAngle = startAngle + (extraRotations * 360) + targetRotateAngle;

  const duration = 4000; // 4 seconds total spin duration
  const startTime = performance.now();
  let lastPinTickAngle = startAngle;

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    
    if (elapsed >= duration) {
      // Completed animation! Lock to final angle
      wheelAngle = targetAngle;
      drawWheel(wheelAngle);
      isSpinning = false;
      
      // Handle the landing logic
      handleSpinEnd(isWinResult);
    } else {
      const progress = elapsed / duration;
      
      // Quartic ease-out curve (fast start, gradual dramatic slowdown)
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const currentAngle = startAngle + (targetAngle - startAngle) * easeProgress;
      
      wheelAngle = currentAngle;
      drawWheel(wheelAngle);

      // Cute pin tick sound effect:
      // Pins are placed every 30 degrees.
      // Trigger a tick whenever a pin crossing occurs.
      const currentPinIndex = Math.floor((currentAngle + 15) / 30);
      const lastPinIndex = Math.floor((lastPinTickAngle + 15) / 30);
      if (currentPinIndex !== lastPinIndex) {
        playTickSound();
        triggerPointerWiggle();
        lastPinTickAngle = currentAngle;
      }

      animationId = requestAnimationFrame(animate);
    }
  }

  animationId = requestAnimationFrame(animate);
}

/**
 * Handle the actions after the wheel stops spinning.
 * @param {boolean} isWin - Whether the result is a Win.
 */
function handleSpinEnd(isWin) {
  document.getElementById('spinButton').disabled = false;
  document.getElementById('statusPanel').classList.remove('active');
  
  // Increment statistics
  totalSpinsCount++;
  document.getElementById('totalSpins').textContent = `${totalSpinsCount}회`;

  const modal = document.getElementById('resultModal');
  const modalEmoji = document.getElementById('modalEmoji');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalDetailBox = document.getElementById('modalDetailBox');
  const detailAccent = document.getElementById('detailAccent');
  const detailText = document.getElementById('detailText');
  const modalCard = document.getElementById('modalCard');

  if (isWin) {
    // WINNER STATE
    winSpinsCount++;
    document.getElementById('winCount').textContent = `${winSpinsCount}회`;
    document.getElementById('statusIcon').textContent = '🎉';
    document.getElementById('statusText').textContent = '우와! 5% 당첨의 주인공이 되셨어요!';
    
    // Play arpeggio sound and confetti
    playWinSound();
    startConfetti();

    // Modal parameters
    modalCard.classList.remove('loss-theme');
    modalEmoji.textContent = '👑';
    modalTitle.textContent = '대박! 당첨입니다!';
    modalDesc.textContent = '단 5%의 기적! 행운의 여신이 찾아왔어요! 🍀';
    detailAccent.textContent = '🌟 특별 사은품 지급! 🌟';
    detailText.textContent = '지금 바로 캡처하여 이벤트 담당자에게 연락해주세요! 축하합니다!';
  } else {
    // LOSER STATE
    document.getElementById('statusIcon').textContent = '🧸';
    document.getElementById('statusText').textContent = '아쉽게도 꽝이네요. 다음 기회를 노려보세요!';
    
    // Play soft boing sound
    playLoseSound();

    // Modal parameters
    modalCard.classList.add('loss-theme');
    modalEmoji.textContent = '🧸';
    modalTitle.textContent = '아쉬워요! 꽝입니다!';
    modalDesc.textContent = '아깝지만 기회는 아직 남아있어요. 한 번 더 도전해 볼까요?';
    detailAccent.textContent = '🍀 응원 한 마디 🍀';
    detailText.textContent = '원래 진짜 행운은 원래 마지막에 찾아오는 법이랍니다! 힘내세요!';
  }

  // Fade in results modal
  setTimeout(() => {
    modal.classList.add('active');
  }, 350);
}

/**
 * Closes the results modal window.
 */
function closeModal() {
  document.getElementById('resultModal').classList.remove('active');
  stopConfetti();
}

/**
 * -------------------------------------------------------------
 * Canvas Confetti Particle System
 * -------------------------------------------------------------
 */

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeConfettiCanvas);

function startConfetti() {
  resizeConfettiCanvas();
  confettiActive = true;
  confettiParticles = [];
  
  // Spawn 120 colorful particles spread horizontally
  for (let i = 0; i < 120; i++) {
    confettiParticles.push(createConfettiParticle());
  }
  
  requestAnimationFrame(updateConfetti);
}

function createConfettiParticle() {
  return {
    x: Math.random() * confettiCanvas.width,
    y: Math.random() * -100 - 20, // Start slightly above viewport
    size: Math.random() * 8 + 6,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    speedY: Math.random() * 4 + 4,
    speedX: Math.random() * 4 - 2,
    rotation: Math.random() * 360,
    rotationSpeed: Math.random() * 4 - 2,
    wobble: Math.random() * 10,
    wobbleSpeed: Math.random() * 0.05 + 0.02
  };
}

function updateConfetti() {
  if (!confettiActive) {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    return;
  }
  
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  
  confettiParticles.forEach((p, index) => {
    p.y += p.speedY;
    p.x += p.speedX + Math.sin(p.wobble) * 0.5;
    p.wobble += p.wobbleSpeed;
    p.rotation += p.rotationSpeed;
    
    // Draw rotating rectangle particles
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    confettiCtx.restore();
    
    // Recycle particle if it falls off screen
    if (p.y > confettiCanvas.height) {
      confettiParticles[index] = createConfettiParticle();
    }
  });
  
  requestAnimationFrame(updateConfetti);
}

function stopConfetti() {
  confettiActive = false;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles = [];
}

// Initial draw on document load
window.addEventListener('DOMContentLoaded', () => {
  // Use a nice high-DPI sizing
  const rect = canvas.getBoundingClientRect();
  canvas.width = 480;
  canvas.height = 480;
  
  // Set initial draw
  drawWheel(0);
});
