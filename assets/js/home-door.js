/* Home page cover: "Enter the showroom" walks through Sailing's glass front doors into the showroom.
 * The camera zooms in on the doors (worked out from where the doors are in the picture), the showroom photo
 * comes into sight, a soft white fade, then showroom.html opens on that same photo.
 */
(() => {
  const door = document.getElementById('door');
  if (!door) return;
  const btn = door.querySelector('[data-door-enter]');
  const photo = door.querySelector('.door-photo img');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DOORS = [0.64, 0.69];   // centre of the glass doors, as a share of the picture's width and height

  // where the doors are on screen: the picture is scaled to cover the box and placed by its object-position
  function aimAtDoors() {
    const box = photo.getBoundingClientRect();
    const iw = photo.naturalWidth || 2560;
    const ih = photo.naturalHeight || 1441;
    const k = Math.max(box.width / iw, box.height / ih);
    const w = iw * k;
    const h = ih * k;
    const pos = getComputedStyle(photo).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const x = (box.width - w) * (pos[0] || 0) + DOORS[0] * w;
    const y = (box.height - h) * (pos[1] || 0) + DOORS[1] * h;
    photo.style.setProperty('--ox', `${x}px`);
    photo.style.setProperty('--oy', `${y}px`);
  }

  btn.addEventListener('click', (e) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // new tab / window: just follow the link
    e.preventDefault();
    const go = () => {
      try { sessionStorage.setItem('sit-arrive', '1'); } catch (err) { /* ignore */ }   // the showroom fades in to match
      window.location.href = btn.href;
    };
    if (reduce) { go(); return; }
    aimAtDoors();
    requestAnimationFrame(() => door.classList.add('entering'));
    setTimeout(go, 1650);
  });
  // coming back with the browser's Back button: show the door again, not the end of the walk-in
  window.addEventListener('pageshow', () => door.classList.remove('entering'));
})();
