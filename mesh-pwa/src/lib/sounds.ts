/**
 * Synthesizes and plays a selectable message tone using the Web Audio API.
 * Supported tones: "whoosh" (default), "pop", "chime", "silent".
 */
let audioCtx: AudioContext | null = null;

export function playSendSound(toneName: string = "whoosh") {
    if (toneName === "silent") return;

    try {
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        const ctx = audioCtx;

        // Resume if suspended (browser autoplay policy)
        if (ctx.state === "suspended") {
            ctx.resume();
        }

        const now = ctx.currentTime;

        if (toneName === "pop") {
            // Snappy mechanical click/pop sound
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.05);
        } else if (toneName === "voice-autoplay") {
            // Snappy high-pitched double pip tone (like WhatsApp autoplay voice note transition)
            const osc1 = ctx.createOscillator();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(880, now); // A5 note

            const gain1 = ctx.createGain();
            gain1.gain.setValueAtTime(0.06, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.04);

            const delay = 0.07;
            const osc2 = ctx.createOscillator();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(988, now + delay); // B5 note

            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.setValueAtTime(0.06, now + delay);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);

            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc2.start(now + delay);
            osc2.stop(now + delay + 0.04);
        } else if (toneName === "chime") {
            // Sweet dual-note ascending chime
            const osc1 = ctx.createOscillator();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(600, now);
            osc1.frequency.exponentialRampToValueAtTime(1000, now + 0.08);

            const gain1 = ctx.createGain();
            gain1.gain.setValueAtTime(0.08, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.15);

            const delay = 0.07;
            const osc2 = ctx.createOscillator();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(1000, now + delay);
            osc2.frequency.exponentialRampToValueAtTime(1400, now + delay + 0.1);

            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.setValueAtTime(0.08, now + delay);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc2.start(now + delay);
            osc2.stop(now + delay + 0.18);
        } else {
            // Whoosh sound (iMessage style)
            const noiseLength = 0.12;
            const bufferSize = ctx.sampleRate * noiseLength;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                noiseData[i] = (Math.random() * 2 - 1) * 0.3;
            }
            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const bandpass = ctx.createBiquadFilter();
            bandpass.type = "bandpass";
            bandpass.frequency.setValueAtTime(2000, now);
            bandpass.frequency.exponentialRampToValueAtTime(6000, now + 0.06);
            bandpass.frequency.exponentialRampToValueAtTime(800, now + noiseLength);
            bandpass.Q.value = 0.7;

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.015);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLength);

            noiseSource.connect(bandpass);
            bandpass.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(1800, now + 0.04);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);

            const oscGain = ctx.createGain();
            oscGain.gain.setValueAtTime(0, now);
            oscGain.gain.linearRampToValueAtTime(0.06, now + 0.01);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(oscGain);
            oscGain.connect(ctx.destination);

            noiseSource.start(now);
            noiseSource.stop(now + noiseLength);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch {
        // Silently fail
    }
}
