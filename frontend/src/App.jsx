import React, { useState } from 'react';
import { predefinedQueries } from './mockData';
import Sidebar from './components/Sidebar';
import HomeDashboard from './components/HomeDashboard';
import DatasetManagement from './components/DatasetManagement';
import AIChat from './components/AIChat';
import CodeReview from './components/CodeReview';
import ExecutionMonitor from './components/ExecutionMonitor';
import ResultsView from './components/ResultsView';
import HistoryView from './components/HistoryView';
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
    } else if (sender === 'ai' && queryObj) {
      setChatHistory(prev => [
        ...prev, 
        { 
          sender: 'ai', 
          text, 
          code: queryObj.code, 
          explanation: queryObj.explanation 
        }
      ]);
      
      // Set the active query to pending review
      setActiveQuery({
        ...queryObj,
        status: 'pending'
      });
      setExecutionStatus('idle');
    }
  };

  // Human-in-the-Loop Actions
  const approveQuery = () => {
    if (!activeQuery) return;
    setExecutionStatus('running');
    setCurrentTab('monitor');
  };

  const rejectQuery = () => {
    if (!activeQuery) return;
    setActiveQuery(null);
    setExecutionStatus('idle');
    setCurrentTab('chat');
  };

  const updateActiveCode = (newCode) => {
    if (!activeQuery) return;
    setActiveQuery(prev => ({
      ...prev,
      code: newCode
    }));
  };

  // Triggered when Execution completes
  const handleExecutionFinished = (status) => {
    setExecutionStatus(status);
    if (status === 'success' && activeQuery) {
      const updatedQuery = { ...activeQuery, status: 'approved' };
      setActiveQuery(updatedQuery);
      
      // Save to analysis history list
      setHistoryList(prev => {
        // Prevent duplicate IDs
        const exists = prev.some(item => item.id === updatedQuery.id);
        if (exists) return prev;
        return [...prev, updatedQuery];
      });
    }
  };

  // Restore past run from history
  const handleRestoreRun = (item) => {
    setActiveQuery(item);
    setExecutionStatus('success');
    setCurrentTab('results');
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
          
          {/* Breadcrumbs / Path */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Nền tảng KTTV</span>
            <span>/</span>
            <span className="text-slate-800 font-bold capitalize">
              {currentTab === 'dashboard' && 'Dashboard tổng quan'}
              {currentTab === 'datasets' && 'Quản lý dữ liệu'}
              {currentTab === 'chat' && 'AI Chat phân tích'}
              {currentTab === 'code' && 'Duyệt mã nguồn'}
              {currentTab === 'monitor' && 'Giám sát thực thi'}
              {currentTab === 'results' && 'Kết quả trực quan'}
              {currentTab === 'history' && 'Lịch sử chạy'}
              {currentTab === 'settings' && 'Cài đặt'}
            </span>
          </div>

          {/* Quick Metrics & User tools */}
          <div className="flex items-center gap-6">
            
            {/* System Status Indicators */}
            <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold text-slate-500 border-r border-slate-200 pr-6">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-brand-primary" /> 
                CPU: <span className="text-slate-700 font-mono">1.2%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-brand-accent" /> 
                RAM: <span className="text-slate-700 font-mono">124MB</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-emerald-500" /> 
                Runtime: <span className="text-emerald-600 font-semibold">Sẵn sàng</span>
              </span>
            </div>

            {/* Profile Tools */}
            <div className="flex items-center gap-3">
              <button className="p-2 bg-slate-50 border border-slate-200 hover:text-slate-800 rounded-xl text-slate-400 transition-colors relative">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-brand-primary rounded-full" />
              </button>
              <div className="flex items-center gap-2 pl-1">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
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
        <main className="flex-1 p-8 overflow-y-auto bg-brand-bg">
          {currentTab === 'dashboard' && (
            <HomeDashboard 
              datasetUploaded={datasetUploaded} 
              setCurrentTab={setCurrentTab} 
            />
          )}

          {currentTab === 'datasets' && (
            <DatasetManagement 
              datasetUploaded={datasetUploaded} 
              setDatasetUploaded={setDatasetUploaded} 
            />
          )}

          {currentTab === 'chat' && (
            <AIChat 
              datasetUploaded={datasetUploaded} 
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              submitQuery={submitQuery}
              setCurrentTab={setCurrentTab}
              setActiveQuery={setActiveQuery}
              setExecutionStatus={setExecutionStatus}
            />
          )}

          {currentTab === 'code' && (
            <CodeReview 
              activeQuery={activeQuery}
              approveQuery={approveQuery}
              rejectQuery={rejectQuery}
              updateActiveCode={updateActiveCode}
            />
          )}

          {currentTab === 'monitor' && (
            <ExecutionMonitor 
              activeQuery={activeQuery}
              executionStatus={executionStatus}
              setExecutionStatus={(status) => handleExecutionFinished(status)}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'results' && (
            <ResultsView 
              activeQuery={activeQuery}
              executionStatus={executionStatus}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView 
              historyList={historyList}
              onRestoreRun={handleRestoreRun}
              onDeleteRun={handleDeleteRun}
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
