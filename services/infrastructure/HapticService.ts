
/**
 * Sheetsense Sensory Layer
 * Handles low-latency mechanical audio and mobile vibrations.
 */

class HapticService {
    private static instance: HapticService;
    private audioCtx: AudioContext | null = null;

    private constructor() {}

    public static getInstance(): HapticService {
        if (!HapticService.instance) {
            HapticService.instance = new HapticService();
        }
        return HapticService.instance;
    }

    private initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    /**
     * Synthesis of a mechanical "logic click" using a damped oscillator.
     * Prevents needing external assets while maintaining high fidelity.
     */
    public click(type: 'light' | 'heavy' | 'soft' = 'light') {
        try {
            this.initAudio();
            if (!this.audioCtx) return;

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            const now = this.audioCtx.currentTime;

            if (type === 'light') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.05);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'heavy') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                this.pulse('heavy');
            } else {
                // Soft Navigation Tick
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.02, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
                osc.start(now);
                osc.stop(now + 0.02);
            }
        } catch (e) {
            // Ignore if audio context fails (e.g. user hasn't interacted)
        }
    }

    public pulse(type: 'light' | 'heavy' = 'light') {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(type === 'light' ? 10 : [20, 50, 20]);
        }
    }
}

export const haptics = HapticService.getInstance();
