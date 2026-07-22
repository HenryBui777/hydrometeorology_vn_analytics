import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Cpu,
  User,
  Database,
  Code2,
  AlertCircle
} from 'lucide-react';
import { predefinedQueries } from '../mockData';

export default function AIChat({
  datasetUploaded,
  chatHistory,
  submitQuery,
  setCurrentTab
}) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll to bottom when chat updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !datasetUploaded || isTyping) return;

    const text = inputText;
    setInputText('');
    executeSubmit(text);
  };

  const executeSubmit = async (text) => {
    setIsTyping(true);

    // Bắn tin nhắn của user lên giao diện
    submitQuery(text, 'user');

    try {
      // Gọi API AI Backend
      const response = await fetch('http://localhost:8000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, context: "Dữ liệu thời tiết VN" })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      // Cập nhật lại UI thông qua hàm truyền từ App.jsx
      submitQuery(
        data.explanation,
        'ai',
        data.code ? {
          id: data.log_id,
          question: text,
          code: data.code,
          explanation: "Mã nguồn Python đi kèm"
        } : null
      );
    } catch (err) {
      console.error(err);
      submitQuery("Lỗi kết nối tới Backend AI hoặc Backend xử lý thất bại. Vui lòng thử lại sau.", 'ai', null);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 p-8 h-full flex flex-col overflow-hidden animate-fade-in">

      {/* Right Side (AI conversation area - now takes full width) */}
      <div className="flex-1 glass-panel rounded-xl bg-white flex flex-col overflow-hidden relative shadow-sm border border-slate-200">

        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-855">Trợ lý AI phân tích</h2>
              <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" /> Online • Gemini Pro
              </span>
            </div>
          </div>
        </div>

        {/* Dataset Check Overlay */}
        {!datasetUploaded && (
          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center space-y-4 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-550 animate-bounce" />
            <h3 className="text-lg font-bold text-slate-800">Yêu cầu tải dữ liệu trước</h3>
            <p className="text-xs text-slate-555 max-w-sm font-semibold">
              Bạn cần nạp tập dữ liệu Khí tượng Thủy văn trước khi có thể trò chuyện và yêu cầu AI sinh mã nguồn phân tích dữ liệu.
            </p>
            <button
              onClick={() => setCurrentTab('datasets')}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
            >
              Đi tới tải dữ liệu
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className={`flex-1 p-6 overflow-y-auto space-y-6 text-xs sm:text-sm ${chatHistory.length === 0 ? 'flex flex-col justify-center items-center' : ''}`}>
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
              <img src="https://img.icons8.com/fluency/48/artificial-intelligence.png" alt="AI Welcome" className="h-10 w-10 object-contain flex-shrink-0 mb-2 animate-pulse" />
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-base">Chào mừng tới AI Data Assistant!</h3>
                <p className="text-xs text-slate-550 font-semibold leading-relaxed">
                  Tôi là mô hình AI tích hợp. Hãy gửi câu hỏi phân tích dữ liệu thời tiết Việt Nam (ví dụ: nhiệt độ, lượng mưa, gió, bức xạ mặt trời). Tôi sẽ phân tích cho bạn.
                </p>
              </div>
            </div>
          ) : (
            chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* AI Avatar */}
                {msg.sender === 'ai' && (
                  <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center text-brand-primary flex-shrink-0">
                    <Cpu className="h-4.5 w-4.5" />
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-[75%] rounded-lg p-4 border text-xs sm:text-sm leading-relaxed space-y-4 ${msg.sender === 'user'
                  ? 'bg-brand-primary text-white border-transparent shadow-md shadow-blue-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-855'
                  }`}>
                  <p className="whitespace-pre-wrap font-semibold">{msg.text}</p>

                  {/* If AI generates code, show action button to approve */}
                  {msg.sender === 'ai' && msg.code && (
                    <div className="bg-white border border-slate-200 rounded-lg p-4 mt-2 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[10px] text-slate-500 font-mono font-bold flex items-center gap-1.5">
                          <Code2 className="h-3.5 w-3.5 text-brand-primary" /> python_analysis.py (Chờ duyệt)
                        </span>
                        <span className="text-[9px] bg-amber-50 border border-amber-250 text-amber-600 font-extrabold px-1.5 py-0.5 rounded uppercase">
                          Pending Approval
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 italic font-semibold line-clamp-2">
                        {msg.explanation}
                      </p>
                      <button
                        onClick={() => setCurrentTab('code')}
                        className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-[11px] py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15 cursor-pointer active:scale-95"
                      >
                        <Code2 className="h-3.5 w-3.5" /> Xem & phê duyệt mã nguồn
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 flex-shrink-0 font-bold">
                    <User className="h-4.5 w-4.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-4 justify-start">
              <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center text-brand-primary flex-shrink-0">
                <Cpu className="h-4.5 w-4.5 animate-spin" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-1.5 shadow-sm">
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-slate-50/50 flex gap-3 items-center">
          <input
            type="text"
            disabled={!datasetUploaded || isTyping}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              datasetUploaded
                ? "Hỏi AI (Ví dụ: So sánh lượng mưa các vùng)..."
                : "Vui lòng upload tập dữ liệu trước..."
            }
            className="glass-input flex-1 py-2.5 text-xs sm:text-sm bg-white"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || !datasetUploaded || isTyping}
            className="p-3 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-40 text-white rounded-lg shadow-md shadow-blue-500/15 cursor-pointer transition-all active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
