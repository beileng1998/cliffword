// Pronunciation through the browser's own speech synthesis. Voices vary by
// device; nothing is sent to a third-party service from here.

const synth = globalThis.speechSynthesis;
export const ttsSupported = Boolean(synth && globalThis.SpeechSynthesisUtterance);

function pickVoice() {
  const voices = synth.getVoices();
  return voices.find((v) => /^en[-_]US/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang)) ?? null;
}

export function speak(text, { rate = 0.9 } = {}) {
  if (!ttsSupported) return false;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  synth.speak(utterance);
  return true;
}
