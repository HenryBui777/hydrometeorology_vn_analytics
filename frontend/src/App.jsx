import React, { useEffect, useState } from 'react';
import { predefinedQueries } from './mockData';
import { useAppearance } from './context/AppearanceContext';
import Sidebar from './components/Sidebar';
import HomeDashboard from './components/HomeDashboard';
import TimeSeriesView from './components/TimeSeriesView';
import ComparisonView from './components/ComparisonView';
import AnalysisView from './components/AnalysisView';
import DatasetManagement from './components/DatasetManagement';
import AIAnalystPortal from './components/AIAnalystPortal';
import SettingsView from './components/SettingsView';
import {
  Bell,
  User,
  Cpu,
  Activity,
  Database,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const VALID_TABS = ['dashboard', 'timeseries', 'comparison', 'analysis', 'datasets', 'aianalyst', 'settings'];

export default function App() {
  const { theme, setTheme } = useAppearance();
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

  // Vite Fast Refresh can preserve state from an older version whose tab ids no longer exist.
  // Always recover to the dashboard instead of rendering an empty content area.
  useEffect(() => {
    if (!VALID_TABS.includes(currentTab)) setCurrentTab('dashboard');
  }, [currentTab]);

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
          code: activeQuery.code,
          engine: activeQuery.engine || 'python'
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
    <div className="flex h-screen w-screen overflow-hidden bg-brand-bg text-brand-text">

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        pendingCount={pendingReviewCount}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 flex justify-between items-center z-20 flex-shrink-0">

          {/* Page Title */}
          <div className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
            {currentTab === 'dashboard' && 'Dashboard tổng quan'}
            {currentTab === 'timeseries' && 'Xu hướng thời gian'}
            {currentTab === 'comparison' && 'So sánh khí hậu'}
            {currentTab === 'analysis' && 'Tương quan và phân phối'}
            {currentTab === 'datasets' && 'Quản lý dữ liệu'}
            {currentTab === 'aianalyst' && 'AI Analyst Portal'}
            {currentTab === 'settings' && 'Cài đặt'}
          </div>

          {/* Quick Metrics & User tools */}
          <div className="flex items-center gap-4">
            <button onClick={() => window.print()} className="no-print text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">Xuất PDF</button>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="no-print text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">{theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}</button>



            {/* Profile Tools */}
            <div className="flex items-center gap-3">
              <button className="relative cursor-pointer hover:scale-105 transition-transform flex items-center justify-center p-1">
                <img src="https://img.icons8.com/fluency/48/appointment-reminders.png" alt="Thông báo" className="h-6 w-6 object-contain" />
                <span className="absolute top-1 right-1.5 h-2 w-2 bg-rose-500 rounded-full border border-white" />
              </button>
              <div className="flex items-center gap-2 pl-1 cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-850 leading-none">Phạm Minh</p>
                  <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1">Phân tích viên</p>
                </div>
              </div>
            </div>

          </div>
        </header>

        {/* View Router Render Area */}
        <main className={`flex-1 bg-brand-bg ${currentTab === 'chat' ? 'p-0 overflow-hidden flex flex-col' : 'p-8 overflow-y-auto'}`}>
          {currentTab === 'dashboard' && (
            <HomeDashboard
              datasetUploaded={datasetUploaded}
              setCurrentTab={setCurrentTab}
              submitQuery={submitQuery}
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

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

    </div>
  );
}
