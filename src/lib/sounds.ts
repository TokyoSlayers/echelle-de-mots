export type SoundName = 'ok' | 'bad' | 'win' | 'hint'

let context: AudioContext | null = null
let muted = false

export function setMuted(next: boolean): void {
  muted = next
}

export function playSound(name: SoundName): void {
  if (muted || typeof window === 'undefined') return
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  try {
    context ??= new AudioCtx()
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime
    const notes =
      name === 'win'
        ? [523.25, 659.25, 783.99, 1046.5]
        : name === 'ok'
          ? [523.25, 659.25]
          : name === 'hint'
            ? [440, 554.37]
            : [196, 146]
    notes.forEach((freq, index) => {
      const osc = context!.createOscillator()
      const gain = context!.createGain()
      osc.type = name === 'bad' ? 'triangle' : 'sine'
      osc.frequency.value = freq
      const start = now + index * 0.07
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(name === 'bad' ? 0.04 : 0.06, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
      osc.connect(gain)
      gain.connect(context!.destination)
      osc.start(start)
      osc.stop(start + 0.18)
    })
  } catch {
    /* audio is optional */
  }
}
