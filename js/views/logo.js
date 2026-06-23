// Logo animé « gsystems » repris de l'APK (G rouge qui se dessine + s'embrase,
// puis « systems » qui jaillit de la gueule du G). Couleur du mot adaptée au fond sombre.
const SVG = `
<svg class="gs-logo" viewBox="0 0 470 200" role="img" aria-label="gsystems" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="mouthH"><rect x="168" y="0" width="302" height="200"/></clipPath></defs>
  <path class="bl-g" d="M158,58 Q158,38 138,38 L62,38 Q38,38 38,62 L38,138 Q38,162 62,162 L138,162 Q162,162 162,138 L162,108 L112,108"/>
  <g clip-path="url(#mouthH)"><text class="bl-word" x="178" y="128">systems</text></g>
</svg>`;

export function animatedLogo() {
  const wrap = document.createElement("div");
  wrap.innerHTML = SVG.trim();
  return wrap.firstChild;
}
