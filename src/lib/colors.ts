/** Color for option `index` of an ordered worst→best scale: red → green. */
export function scaleColor(index: number, count: number): string {
  if (count <= 1) return 'hsl(120, 55%, 42%)';
  const hue = (index / (count - 1)) * 120;
  return `hsl(${hue}, 62%, 44%)`;
}

/** Stable distinct color for the nth option of a categorical list (golden-angle hues). */
export function optionColor(index: number): string {
  const hue = (30 + index * 137.508) % 360;
  return `hsl(${hue}, 55%, 48%)`;
}
