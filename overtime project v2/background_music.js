// =========================================
// BACKGROUND MUSIC LOGIC (VOLUME ON SCROLL)
// =========================================

function setupBackgroundMusic() {
  const music = document.getElementById('bg-music');
  const musicBtn = document.getElementById('music-btn');

  if (!music || !musicBtn) return;

  // 1. Play/Pause Toggle Logic
  musicBtn.addEventListener('click', () => {
    if (music.paused) {
      music.play();
      // Update Icon
      musicBtn.classList.remove('fa-music');
      musicBtn.classList.add('fa-pause');
      musicBtn.classList.add('playing');
    } else {
      music.pause();
      // Update Icon
      musicBtn.classList.add('fa-music');
      musicBtn.classList.remove('fa-pause');
      musicBtn.classList.remove('playing');
    }
  });

  // 2. Auto-Start Helper (Fixes Browser Block)
  const startAudio = () => {
    music.play().then(() => {
      musicBtn.classList.remove('fa-music');
      musicBtn.classList.add('fa-pause');
      musicBtn.classList.add('playing');
    }).catch(err => console.log("Waiting for interaction..."));
    document.removeEventListener('click', startAudio);
  };
  document.addEventListener('click', startAudio);

  // 3. SCROLL VOLUME LOGIC
  function updateVolume() {
    // A. Get total scrollable height
    const scrollTop = window.scrollY; // How far we have scrolled
    const docHeight = document.documentElement.scrollHeight - window.innerHeight; // Total scrollable distance

    // Safety check
    if (docHeight <= 0) return;

    // B. Calculate Percentage (0.0 to 1.0)
    let scrollPercent = scrollTop / docHeight;

    // C. Clamp value between 0 and 1
    scrollPercent = Math.min(1, Math.max(0, scrollPercent));

    // D. Set Volume
    // We add 0.1 (10%) base volume so it's not completely silent at the top
    music.volume = 0.05 + (scrollPercent * 0.25); // Max volume capped at 0.3 (30%)
  }

  // Run whenever the user scrolls
  window.addEventListener('scroll', updateVolume);

  // Run once on load to set the initial volume
  updateVolume();
}

setupBackgroundMusic();