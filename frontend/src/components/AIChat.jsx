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

  const executeSubmit = (text) => {
    setIsTyping(true);
    
    // Submit user message instantly
    submitQuery(text, 'user');

    // Simulate AI thinking and generating code
    setTimeout(() => {
      setIsTyping(false);
      
      // Look for keywords to match predefined queries
      let matchedQuery = predefinedQueries[0];
      if (text.toLowerCase().includes('mưa') || text.toLowerCase().includes('precipitation')) {
        matchedQuery = predefinedQueries[0];
      } else if (text.toLowerCase().includes('nhiệt độ') || text.toLowerCase().includes('temperature') || text.toLowerCase().includes('xu hướng')) {
        matchedQuery = predefinedQueries[1];
      } else if (text.toLowerCase().includes('nóng') || text.toLowerCase().includes('top 10')) {
        matchedQuery = predefinedQueries[2];
      }

      // Submit AI response
      submitQuery(
        `Tôi đã phân tích yêu cầu: "${text}". 
Tôi sẽ tạo ra một đoạn script Python sử dụng thư viện Pandas để đọc tệp CSV \`vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv\` cục bộ, thực hiện tiền xử lý, tính toán giá trị thống kê và xuất kết quả. 
Mã nguồn đã được tạo thành công và đang chuyển sang trạng thái **"Chờ Phê Duyệt"** dưới sự kiểm soát của bạn.`, 
        'ai', 
        matchedQuery
      );
    }, 1800);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex animate-fade-in">
      
      {/* Right Side (AI conversation area - now takes full width) */}
      <div className="flex-1 glass-panel rounded-2xl border border-slate-200 bg-white flex flex-col overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-brand-primary border border-blue-100">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-850">Trợ Lý AI Phân Tích (Local Assistant)</h2>
              <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" /> Online • Gemini Pro
              </span>
            </div>
          </div>
        </div>

        {/* Dataset Check Overlay */}
        {!datasetUploaded && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-4 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-550 animate-bounce" />
            <h3 className="text-lg font-bold text-slate-800">Yêu cầu tải dữ liệu trước</h3>
            <p className="text-xs text-slate-555 max-w-sm font-semibold">
              Bạn cần nạp tập dữ liệu Khí tượng Thủy văn trước khi có thể trò chuyện và yêu cầu AI sinh mã nguồn phân tích dữ liệu.
            </p>
            <button 
              onClick={() => setCurrentTab('datasets')}
              className="bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-blue-500/20"
            >
              Đi tới Tải dữ liệu
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
              <div className="bg-slate-50 p-4 rounded-full border border-slate-200 shadow-md">
                <Cpu className="h-8 w-8 text-brand-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-base">Chào mừng tới AI Data Assistant!</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Tôi là mô hình AI tích hợp. Hãy gửi câu hỏi phân tích dữ liệu thời tiết Việt Nam (ví dụ: nhiệt độ, lượng mưa, gió, bức xạ mặt trời). Tôi sẽ lập trình Python để phân tích cho bạn duyệt.
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
                <div className={`max-w-[75%] rounded-2xl p-4 border text-xs sm:text-sm leading-relaxed space-y-4 ${
                  msg.sender === 'user'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-blue-500/10'
                    : 'bg-slate-50 border-slate-200 text-slate-850'
                }`}>
                  <p className="whitespace-pre-wrap font-semibold">{msg.text}</p>
                  
                  {/* If AI generates code, show action button to approve */}
                  {msg.sender === 'ai' && msg.code && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 mt-2 space-y-3 shadow-sm">
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
                        className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-[11px] py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                      >
                        <Code2 className="h-3.5 w-3.5" /> Xem & Phê Duyệt Mã Nguồn
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-850 flex-shrink-0 font-bold">
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
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-1.5">
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
            className="p-3 bg-brand-primary hover:bg-brand-primary/85 disabled:opacity-40 text-white rounded-xl shadow-lg transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
