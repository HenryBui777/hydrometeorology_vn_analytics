import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { predefinedQueries } from './mockData';
import Sidebar from './components/Sidebar';
import HomeDashboard from './components/HomeDashboard';
import TimeSeriesView from './components/TimeSeriesView';
import ComparisonView from './components/ComparisonView';
import AnalysisView from './components/AnalysisView';
import DatasetManagement from './components/DatasetManagement';
import AIAnalystPortal from './components/AIAnalystPortal';

import AnimatedBackground from './components/AnimatedBackground';
import NewsTicker from './components/NewsTicker';
import {
  Bell,
  User,
  Cpu,
  Activity,
  Database,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { useData } from './context/DataContext';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [datasetUploaded, setDatasetUploaded] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  // Initialize with a default successful query so the Results tab is pre-loaded with rich interactive charts
  const [activeQuery, setActiveQuery] = useState({
    ...predefinedQueries[0],
    status: 'approved'
  });
  const [executionStatus, setExecutionStatus] = useState('success'); // 'idle' | 'running' | 'success' | 'failed'

  const [user, setUser] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const { isColorblind, toggleColorblind } = useData();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    // Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleUserLogin(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) handleUserLogin(session.user);
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserLogin = (supabaseUser) => {
    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
      avatar: supabaseUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${supabaseUser.email.charAt(0)}&background=3B82F6&color=fff`
    });
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handlePrint = () => {
    const report = document.querySelector('main[data-print-tab]');
    if (!report || isExportingPdf) return;

    setIsExportingPdf(true);
    const exportCopy = report.cloneNode(true);
    const tabLabel = printTabLabels[currentTab] || 'bao-cao-kttv';

    exportCopy.classList.add('report-preview-copy');
    // A4 portrait printable width at 96dpi, leaving space for margins.
    exportCopy.style.width = '760px';
    exportCopy.style.maxWidth = '100%';
    exportCopy.style.padding = '24px';
    exportCopy.style.overflow = 'visible';
    exportCopy.style.background = '#f8fafc';
    exportCopy.querySelectorAll('.print-report-header').forEach((element) => {
      element.style.display = 'flex';
    });

    // Canvas cannot be cloned by HTML alone; replace each copy with a snapshot.
    exportCopy.querySelectorAll('canvas').forEach((canvas) => {
      try {
        const image = document.createElement('img');
        image.src = canvas.toDataURL('image/png');
        image.style.maxWidth = '100%';
        image.style.height = 'auto';
        canvas.replaceWith(image);
      } catch {
        // Keep the original canvas when a browser blocks its data URL.
      }
    });

    // Recharts stores its rendered SVG with the desktop pixel width. The preview
    // is narrower (A4 portrait), so preserve the SVG coordinate system and scale
    // both the drawing and its wrapper together instead of clipping the chart.
    exportCopy.querySelectorAll('svg.recharts-surface').forEach((svg) => {
      const sourceWidth = Number(svg.getAttribute('width')) || 760;
      const sourceHeight = Number(svg.getAttribute('height')) || 320;
      const targetWidth = 710;
      const targetHeight = Math.max(220, Math.round(sourceHeight * Math.min(1, targetWidth / sourceWidth)));
      const wrapper = svg.closest('.recharts-wrapper, .recharts-responsive-container');

      svg.setAttribute('viewBox', `0 0 ${sourceWidth} ${sourceHeight}`);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', String(targetHeight));
      svg.style.display = 'block';
      svg.style.width = '100%';
      svg.style.height = `${targetHeight}px`;
      svg.style.maxWidth = '100%';

      if (wrapper) {
        wrapper.style.width = '100%';
        wrapper.style.maxWidth = '100%';
        wrapper.style.minWidth = '0';
        wrapper.style.height = `${targetHeight}px`;
        wrapper.style.overflow = 'hidden';
      }
    });

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('');
    const previewStyles = `
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #e2e8f0; color: #0f172a; font-family: Inter, Arial, sans-serif; }
        .report-preview-copy { margin: 0 auto; min-height: 100vh; }
        .report-preview-copy .print-hidden { display: none !important; }
        .report-preview-copy .h-screen, .report-preview-copy .overflow-hidden,
        .report-preview-copy .overflow-y-auto, .report-preview-copy .overflow-x-auto {
          height: auto !important; max-height: none !important; overflow: visible !important;
        }
        .report-preview-copy .recharts-responsive-container, .report-preview-copy .recharts-wrapper { width: 100% !important; max-width: 100% !important; min-width: 0 !important; overflow: hidden !important; }
        .report-preview-copy svg.recharts-surface { display: block !important; max-width: 100% !important; }
        .print-report-header { display: flex !important; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #2563eb; }
        .print-report-kicker { margin: 0 0 4px; color: #2563eb; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
        .print-report-header h1 { margin: 0; font-size: 26px; }
        .print-report-subtitle, .print-report-date { margin: 5px 0 0; color: #475569; font-size: 13px; }
        @media print { @page { size: A4 portrait; margin: 8mm; } body { background: #fff; } .report-preview-copy { width: auto !important; padding: 0 !important; } }
      </style>`;

    setPdfPreview({
      filename: `${tabLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      srcDoc: `<!doctype html><html lang="vi"><head><base href="${window.location.origin}/">${styles}${previewStyles}</head><body>${exportCopy.outerHTML}</body></html>`,
    });
    setIsExportingPdf(false);
  };

  const closePdfPreview = () => {
    setPdfPreview(null);
  };

  const downloadPdfPreview = () => {
    if (!pdfPreview) return;
    document.getElementById('report-preview-frame')?.contentWindow?.print();
  };

  // Start with some history items to show past activities
  const [historyList, setHistoryList] = useState([
    {
      id: 10,
      title: "Xu hướng bão nhiệt đới",
      question: "Vẽ bản đồ nhiệt độ bề mặt đại dương và xu hướng áp suất khí quyển năm 2025.",
      explanation: "Lọc các trường dữ liệu khí áp và bức xạ mặt trời, tính toán mối tương quan để dự đoán độ ẩm và xu hướng bão tại khu vực Nam Trung Bộ.",
      code: "# Mock historical script\nprint('Thực thi script #10...')",
      logs: ["[2026-06-23 14:12:00] Run success"],
      kpis: [{ label: "Nhiệt độ TB", value: "28.5 °C", desc: "Biển Đông", trend: "up" }],
      chartType: "bar",
      chartData: [{ name: "Nam Trung Bộ", value: 1.25 }]
    }
  ]);

  // Derived state: check if activeQuery is pending approval
  const pendingReviewCount = (activeQuery && activeQuery.status === 'pending') ? 1 : 0;

  const printTabLabels = {
    dashboard: 'Dashboard tổng quan',
    timeseries: 'Xu hướng thời gian',
    comparison: 'So sánh đối chiếu',
    analysis: 'Phân tích tương quan',
    datasets: 'Tập dữ liệu',
    aianalyst: 'Trợ lý phân tích AI',
  };

  // Handles adding chat bubbles to history and setting the active pending query
  const submitQuery = (text, sender, queryObj = null) => {
    if (sender === 'user') {
      setChatHistory(prev => [...prev, { sender: 'user', text }]);
    } else if (sender === 'ai') {
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'ai',
          text,
          code: queryObj ? queryObj.code : undefined,
          explanation: queryObj ? queryObj.explanation : undefined
        }
      ]);

      // Set the active query to pending review (Only if it's a successful AI response with code)
      if (queryObj) {
        setActiveQuery({
          ...queryObj,
          status: 'pending'
        });
        setExecutionStatus('idle');
      }
    }
  };

  // Human-in-the-Loop Actions
  const approveQuery = async () => {
    if (!activeQuery) return;
    setExecutionStatus('running');

    try {
      const response = await fetch('http://localhost:8000/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_id: activeQuery.id,
          code: activeQuery.code
        })
      });
      const data = await response.json();

      if (data.status === 'success') {
        let parsedChartData = null;
        try {
          parsedChartData = JSON.parse(data.chart_data);
        } catch(e) {
          console.error("Failed to parse chart_data", e);
        }
        handleExecutionFinished('success', { chartData: parsedChartData, chartType: data.chart_type });
      } else {
        console.error("Execute error:", data.error_message);
        handleExecutionFinished('failed');
      }
    } catch (error) {
      console.error(error);
      handleExecutionFinished('failed');
    }
  };

  const rejectQuery = () => {
    if (!activeQuery) return;
    setActiveQuery(null);
    setExecutionStatus('idle');
  };

  const updateActiveCode = (newCode) => {
    if (activeQuery) {
      setActiveQuery({ ...activeQuery, code: newCode });
    }
  };

  // Triggered when Execution completes
  const handleExecutionFinished = (status, resultData = null) => {
    setExecutionStatus(status);
    if (status === 'success') {
      setActiveQuery(prev => {
        if (!prev) return prev;
        const updatedQuery = { ...prev, status: 'approved' };
        if (resultData) {
          updatedQuery.chartData = resultData.chartData;
          updatedQuery.chartType = resultData.chartType;
        }
        
        // Save to analysis history list
        setHistoryList(historyPrev => {
          const exists = historyPrev.some(item => item.id === updatedQuery.id);
          if (exists) return historyPrev;
          return [...historyPrev, updatedQuery];
        });
        
        return updatedQuery;
      });
    }
  };

  const handleRestoreRun = (item) => {
    setActiveQuery(item);
    setExecutionStatus('success');
  };

  // Delete run from history
  const handleDeleteRun = (id) => {
    setHistoryList(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-bg dark:bg-slate-900 text-brand-text dark:text-slate-200 transition-colors">

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        pendingCount={pendingReviewCount}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* Global News Ticker */}
        <NewsTicker />

        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-8 flex justify-between items-center z-20 flex-shrink-0 transition-colors">

          {/* Page Title */}
          <div 
            onClick={() => {
              document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="uppercase text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 bg-clip-text text-transparent py-1 leading-normal cursor-pointer hover:opacity-80 transition-opacity"
          >
            {currentTab === 'dashboard' && 'Dashboard tổng quan'}
            {currentTab === 'timeseries' && 'Xu hướng thời gian'}
            {currentTab === 'comparison' && 'So sánh khí hậu'}
            {currentTab === 'analysis' && 'Tương quan và phân phối'}
            {currentTab === 'datasets' && 'Quản lý dữ liệu'}
            {currentTab === 'aianalyst' && 'CỔNG PHÂN TÍCH AI'}
            {currentTab === 'settings' && 'Cài đặt'}
          </div>

          <AnimatedBackground />

          {/* Quick Metrics & User tools */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button disabled={isExportingPdf} onClick={handlePrint} title="Xem trước báo cáo PDF" className="print-hidden cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-brand-primary dark:text-slate-300 dark:hover:text-indigo-400 font-medium text-sm shadow-sm transition-colors disabled:cursor-wait disabled:opacity-60">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">{isExportingPdf ? 'Đang tạo...' : 'Xem trước PDF'}</span>
              </button>
              <button onClick={toggleColorblind} title="Chế độ người mù màu (Colorblind Mode)" className={`print-hidden cursor-pointer p-2 rounded-full border transition-colors shadow-sm ${isColorblind ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-brand-accent dark:text-slate-400'}`}>
                {isColorblind ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              <button onClick={toggleTheme} title="Giao diện Sáng/Tối (Theme)" className="print-hidden cursor-pointer p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-primary dark:text-slate-400 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-800 shadow-sm">
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
            
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1.5 pr-3 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" />
                <div className="hidden sm:block text-left mr-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{user.name}</p>
                </div>
                <button onClick={logout} className="cursor-pointer text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={loginWithGoogle} className="cursor-pointer flex items-center gap-2 bg-brand-primary dark:bg-indigo-500 text-white px-4 py-2 rounded-full font-bold hover:bg-blue-700 dark:hover:bg-indigo-600 transition-colors shadow-sm text-sm">
                <LogIn className="w-4 h-4" /> Đăng nhập
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* View Router Render Area */}
        <main
          data-print-tab={currentTab}
          className={`flex-1 bg-transparent transition-colors relative z-10 ${currentTab === 'chat' ? 'p-0 overflow-hidden flex flex-col' : 'p-8 overflow-y-auto'}`}
        >
          <div className="print-report-header">
            <div>
              <p className="print-report-kicker">KTTV ANALYTICS · BÁO CÁO TRỰC QUAN</p>
              <h1>{printTabLabels[currentTab] || 'Báo cáo phân tích'}</h1>
              <p className="print-report-subtitle">Dữ liệu khí tượng thủy văn Việt Nam · 34 tỉnh/thành</p>
            </div>
            <p className="print-report-date">Xuất ngày {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
          {currentTab === 'dashboard' && (
            <HomeDashboard
              datasetUploaded={datasetUploaded}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'timeseries' && (
            <TimeSeriesView />
          )}

          {currentTab === 'comparison' && (
            <ComparisonView />
          )}

          {currentTab === 'analysis' && (
            <AnalysisView />
          )}

          {currentTab === 'datasets' && (
            <DatasetManagement
              datasetUploaded={datasetUploaded}
              setDatasetUploaded={setDatasetUploaded}
            />
          )}

          {currentTab === 'aianalyst' && (
            <AIAnalystPortal
              datasetUploaded={datasetUploaded}
              chatHistory={chatHistory}
              submitQuery={submitQuery}
              activeQuery={activeQuery}
              setActiveQuery={setActiveQuery}
              executionStatus={executionStatus}
              setExecutionStatus={setExecutionStatus}
              approveQuery={approveQuery}
              rejectQuery={rejectQuery}
              updateActiveCode={updateActiveCode}
              historyList={historyList}
              handleRestoreRun={handleRestoreRun}
              handleDeleteRun={handleDeleteRun}
            />
          )}


        </main>
      </div>

      {pdfPreview && (
        <div className="print-hidden fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-label="Xem trước báo cáo" className="flex h-[min(860px,92vh)] w-[min(1200px,96vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Xem trước báo cáo</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Bản mẫu hiển thị trực tiếp. Đóng cửa sổ này để chỉnh rồi tạo lại.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={closePdfPreview} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Quay lại chỉnh</button>
                <button onClick={downloadPdfPreview} className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Lưu thành PDF</button>
              </div>
            </header>
            <iframe id="report-preview-frame" srcDoc={pdfPreview.srcDoc} title="Bản xem trước báo cáo" className="min-h-0 flex-1 bg-slate-100" />
          </section>
        </div>
      )}

    </div>
  );
}
