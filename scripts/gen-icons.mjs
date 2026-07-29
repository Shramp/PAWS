import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'node:fs';

const PLUM = '#171320';
const PINK = '#F0A3C6';

/** Cat paw print: one main pad + four toes. `fill` = paw color, `bg` = background rect or ''. */
function pawSvg({ size, fill, bg, scale = 1 }) {
  const s = 1024;
  // group transform to scale the paw around the canvas center
  const t = `translate(${(s * (1 - scale)) / 2} ${(s * (1 - scale)) / 2}) scale(${scale})`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  ${bg ? `<rect width="${s}" height="${s}" fill="${bg}"/>` : ''}
  <g fill="${fill}" transform="${t}">
    <path d="M 512 508
      C 622 508, 700 566, 700 660
      C 700 748, 636 806, 512 806
      C 388 806, 324 748, 324 660
      C 324 566, 402 508, 512 508 Z"/>
    <ellipse cx="318" cy="438" rx="64" ry="86" transform="rotate(-22 318 438)"/>
    <ellipse cx="448" cy="360" rx="64" ry="90" transform="rotate(-7 448 360)"/>
    <ellipse cx="576" cy="360" rx="64" ry="90" transform="rotate(7 576 360)"/>
    <ellipse cx="706" cy="438" rx="64" ry="86" transform="rotate(22 706 438)"/>
  </g>
</svg>`;
}

function render(svg, size, outPath) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  writeFileSync(outPath, resvg.render().asPng());
  console.log('wrote', outPath);
}

mkdirSync('out', { recursive: true });

// iOS app icon: plum background, pink paw
render(pawSvg({ size: 1024, fill: PINK, bg: PLUM, scale: 0.9 }), 1024, 'out/icon.png');
// Splash: pink paw on transparent (splash background color set in app.json)
render(pawSvg({ size: 512, fill: PINK, bg: '', scale: 1 }), 512, 'out/splash-icon.png');
// Android adaptive foreground/monochrome: paw shrunk into the 66% safe zone
render(pawSvg({ size: 1024, fill: PINK, bg: '', scale: 0.55 }), 1024, 'out/android-icon-foreground.png');
render(pawSvg({ size: 1024, fill: '#FFFFFF', bg: '', scale: 0.55 }), 1024, 'out/android-icon-monochrome.png');
// Android adaptive background: solid plum
render(pawSvg({ size: 1024, fill: PLUM, bg: PLUM, scale: 0 }), 1024, 'out/android-icon-background.png');
// Web favicon
render(pawSvg({ size: 48, fill: PINK, bg: PLUM, scale: 1 }), 48, 'out/favicon.png');
