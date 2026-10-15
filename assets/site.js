(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Scrolling pencil: body length follows scroll progress (static under reduced motion)
  var pencil = document.querySelector('.pencil');
  if (pencil && !reduce) {
    var ticking = false;
    var updatePencil = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 1;
      pencil.style.setProperty('--p', p.toFixed(4));
    };
    var requestPencil = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updatePencil); }
    };
    window.addEventListener('scroll', requestPencil, { passive: true });
    window.addEventListener('resize', requestPencil, { passive: true });
    updatePencil();
  }

  // Hero note flips to show "hi" (tap on phones, click on desktop)
  var stack = document.getElementById('stack');
  var flipBtn = stack.querySelector('.flip-btn');
  var front = stack.querySelector('.face-front');
  var back = stack.querySelector('.face-back');

  function toggleFlip() {
    var flipped = stack.classList.toggle('is-flipped');
    flipBtn.setAttribute('aria-pressed', String(flipped));
    [[front, flipped], [back, !flipped]].forEach(function (pair) {
      pair[0].toggleAttribute('inert', pair[1]);
      pair[0].setAttribute('aria-hidden', String(pair[1]));
    });
  }

  stack.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    toggleFlip();
  });

  // Pencil scratch: plays as the heart is drawn
  var scratch = new Audio('assets/pencil-scratch.mp3');
  scratch.preload = 'auto';
  scratch.volume = 0.5;
  function playScratch() {
    scratch.currentTime = 0;
    scratch.play().catch(function () {});
  }

  // Pencil draws a tiny heart where you tap or click (not scrolls, drags or right-clicks).
  // Each heart stays 5s after it finishes drawing, fades, then is removed.
  var down = null, hearts = [];
  var DRAW_MS = reduce ? 0 : 600, STAY_MS = 5000, FADE_MS = reduce ? 0 : 350;

  function dropHeart(h) {
    clearTimeout(h.timer);
    h.el.remove();
    hearts.splice(hearts.indexOf(h), 1);
  }

  document.addEventListener('pointerdown', function (e) {
    var ok = e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button === 0);
    down = ok ? { x: e.clientX, y: e.clientY, t: Date.now(), mouse: e.pointerType === 'mouse' } : null;
  }, { passive: true });

  document.addEventListener('pointerup', function (e) {
    if (!down || Date.now() - down.t > 500 ||
        Math.abs(e.clientX - down.x) > 10 || Math.abs(e.clientY - down.y) > 10) return;
    var doodle = document.createElement('div');
    // with a mouse the pencil cursor is already there, so skip the drawn pencil
    doodle.className = down.mouse ? 'tap-doodle is-mouse' : 'tap-doodle';
    doodle.setAttribute('aria-hidden', 'true');
    doodle.style.left = e.clientX + 'px';
    doodle.style.top = e.clientY + 'px';
    doodle.innerHTML = '<svg viewBox="0 0 24 24"><path pathLength="1" d="M12 21C5 15 2 11 2 7.5a4.5 4.5 0 0 1 10-1.5 4.5 4.5 0 0 1 10 1.5C22 11 19 15 12 21Z"/></svg>' +
      '<img src="assets/cursor-pencil@2x.png" alt="" width="32" height="32">';
    document.body.appendChild(doodle);
    playScratch();

    var h = { el: doodle };
    hearts.push(h);
    h.timer = setTimeout(function () {
      doodle.classList.add('is-fading');
      h.timer = setTimeout(function () { dropHeart(h); }, FADE_MS);
    }, DRAW_MS + STAY_MS);
  }, { passive: true });

  // leaving the page: stop every pending timer and clear the hearts
  window.addEventListener('pagehide', function () {
    hearts.slice().forEach(dropHeart);
  });

  // Cloud headings pop up the first time they scroll into view
  if (!reduce && 'IntersectionObserver' in window) {
    var popper = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        popper.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    document.querySelectorAll('.cloud').forEach(function (h) {
      h.classList.add('will-pop');
      popper.observe(h);
    });
  }

  if (reduce || !finePointer) return;

  // Heart cursor follower
  var heart = document.createElement('div');
  heart.className = 'heart';
  heart.setAttribute('aria-hidden', 'true');
  heart.textContent = '♥';
  document.body.appendChild(heart);

  var mouseX = 0, mouseY = 0, heartX = 0, heartY = 0;

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    heart.style.opacity = '0.5';
  });

  document.addEventListener('mouseleave', function () { heart.style.opacity = '0'; });

  function animateHeart() {
    heartX += (mouseX - heartX) * 0.12;
    heartY += (mouseY - heartY) * 0.12;
    heart.style.transform = 'translate(' + heartX + 'px,' + heartY + 'px) translate(-50%, -50%)';
    requestAnimationFrame(animateHeart);
  }
  animateHeart();

  // 3D tilt: listen on the wrapper, transform the inner card
  function tilt(wrap, card, strength, lift, delay) {
    var active = delay === 0;
    if (!active) setTimeout(function () { active = true; }, delay);

    wrap.addEventListener('mousemove', function (e) {
      if (!active) return;
      var rect = wrap.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = 'perspective(700px) translateY(' + lift + 'px) rotateY(' + x * strength +
        'deg) rotateX(' + -y * strength + 'deg) scale(1.01)';
      card.style.transition = 'transform 0.1s ease, filter 0.3s ease';
    });

    wrap.addEventListener('mouseleave', function () {
      card.style.transform = '';
      card.style.transition = 'transform 0.6s ease, filter 0.3s ease';
    });
  }

  document.querySelectorAll('[data-tilt]').forEach(function (item) {
    tilt(item, item.querySelector('.lib-card'), 5, -4, 0);
  });
})();
