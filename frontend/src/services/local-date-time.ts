/** Valor de datetime-local no fuso do navegador, sem converter o relógio para UTC. */
export function localDateTimeValue(value = new Date()): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}
