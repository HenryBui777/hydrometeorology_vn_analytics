let audioCtx = null;

export const playClickSound = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    // Tiếng "Tick" điện thoại hiện đại, gọn gàng và dứt khoát
    oscillator.type = 'sine';
    // Quét tần số từ cao xuống nhanh để tạo độ giòn (crisp click)
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); 
    oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.015);
    
    // Volume rõ ràng (10%), thời gian siêu ngắn (0.015s) để không bị vang
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.015);
  } catch (e) {
    // Tránh lỗi ném ra console nếu trình duyệt chặn tự động phát âm thanh
    console.warn("Audio play blocked or unsupported:", e);
  }
};
