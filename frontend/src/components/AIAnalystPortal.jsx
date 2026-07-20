import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, Play, Send, Sparkles, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';

const API_URL = 'http://localhost:8000';

export default function AIAnalystPortal({
  chatHistory = [], submitQuery, activeQuery, executionStatus,
  approveQuery, rejectQuery, updateActiveCode,
}) {
  const [prompt, setPrompt] = useState('');
  const [engine, setEngine] = useState('python');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState(null);
  const [chartType, setChartType] = useState('bar');
  const [resultView, setResultView] = useState('answer');
  const [xKey, setXKey] = useState('');
  const [yKey, setYKey] = useState('');

  useEffect(() => {
    if (executionStatus !== 'success' || !Array.isArray(activeQuery?.chartData)) return;
    fetch(`${API_URL}/api/insights/four-axis`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart_data: activeQuery.chartData, question: activeQuery.question || '' }),
    }).then((response) => response.ok ? response.json() : null)
      .then(setInsights).catch(() => setInsights(null));
  }, [activeQuery?.chartData, activeQuery?.question, executionStatus]);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/api/ai/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, engine, context: chatHistory.slice(-4).map(({ sender, text }) => `${sender}: ${text}`).join('\n') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Không thể tạo phân tích AI.');
      submitQuery('Đã tạo mã phân tích. Hãy kiểm tra và phê duyệt trước khi chạy.', 'ai', {
        id: data.log_id, question: prompt, code: data.code, explanation: data.explanation, engine,
      });
      setPrompt('');
    } catch (cause) {
      setError(cause.message || 'Không kết nối được backend tại cổng 8000.');
    } finally { setLoading(false); }
  }

  const rows = Array.isArray(activeQuery?.chartData) ? activeQuery.chartData : [];
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const numericColumns = rows.length ? columns.filter((column) => typeof rows[0][column] === 'number') : [];
  const categoryColumns = rows.length ? columns.filter((column) => typeof rows[0][column] === 'string') : [];

  useEffect(() => {
    if (!rows.length) return;
    setChartType(activeQuery?.chartType || 'bar');
    setXKey(categoryColumns[0] || columns[0]);
    setYKey(numericColumns[0] || columns[1] || columns[0]);
  }, [activeQuery?.chartData, activeQuery?.chartType]);

  const chart = rows.length && xKey && yKey ? <ResponsiveContainer width="100%" height="100%">
    {chartType === 'line' ? <LineChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={xKey} /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey={yKey} stroke="#2563eb" strokeWidth={3} /></LineChart>
      : chartType === 'pie' ? <PieChart><Tooltip /><Legend /><Pie data={rows} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={112} label>{rows.map((_, index) => <Cell key={index} fill={['#2563eb', '#059669', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'][index % 6]} />)}</Pie></PieChart>
      : chartType === 'scatter' ? <ScatterChart><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={xKey} name={xKey} /><YAxis dataKey={yKey} name={yKey} /><Tooltip /><Scatter data={rows} fill="#2563eb" /></ScatterChart>
      : <BarChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={xKey} /><YAxis /><Tooltip /><Legend /><Bar dataKey={yKey} fill="#2563eb" radius={[5, 5, 0, 0]} /></BarChart>}
  </ResponsiveContainer> : <p className="text-sm text-slate-500">Chưa đủ dữ liệu để tạo biểu đồ.</p>;

  return <div className="max-w-6xl mx-auto space-y-6 pb-16">
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div><h1 className="text-2xl font-extrabold text-slate-800">AI Analyst Portal</h1><p className="text-sm text-slate-500 mt-1">Tạo truy vấn, duyệt mã và chạy phân tích trên dữ liệu khí tượng.</p></div>
        <div className="flex rounded-lg border border-slate-200 p-1 gap-1"><button onClick={() => setEngine('python')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${engine === 'python' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>Python</button><button onClick={() => setEngine('sql')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${engine === 'sql' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>SQL</button></div>
      </div>
      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ví dụ: Top 5 tỉnh có nhiệt độ trung bình cao nhất" className="w-full min-h-28 rounded-xl border border-slate-300 p-4 text-sm text-slate-800" />
      <div className="mt-3 flex flex-wrap gap-2 justify-between items-center"><div className="flex flex-wrap gap-2">{['Top 5 tỉnh nóng nhất', 'So sánh lượng mưa theo vùng', 'Nhiệt độ trung bình Hà Nội'].map((item) => <button key={item} onClick={() => setPrompt(item)} className="px-3 py-1.5 text-xs rounded-full border border-slate-200 hover:bg-slate-50">{item}</button>)}</div><button onClick={generate} disabled={loading || !prompt.trim()} className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2">{loading ? <Cpu className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? 'Đang tạo...' : 'Sinh phân tích'}</button></div>
      {error && <p className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700"><AlertTriangle className="inline h-4 w-4 mr-1" />{error}</p>}
    </section>

    {activeQuery?.status === 'pending' && <section className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div><h2 className="font-bold text-slate-800">Mã chờ phê duyệt</h2><p className="text-sm text-slate-500 mt-1">{activeQuery.explanation}</p></div>
      <textarea value={activeQuery.code || ''} onChange={(event) => updateActiveCode(event.target.value)} spellCheck="false" className="w-full h-72 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs p-4" />
      <div className="flex justify-end gap-3"><button onClick={rejectQuery} className="px-4 py-2 border rounded-lg text-sm font-bold"><X className="inline h-4 w-4 mr-1" />Hủy</button><button onClick={approveQuery} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold"><Play className="inline h-4 w-4 mr-1" />Phê duyệt và chạy</button></div>
    </section>}

    {executionStatus === 'running' && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-800"><Cpu className="inline h-4 w-4 animate-spin mr-2" />Đang thực thi truy vấn đã được phê duyệt...</section>}
    {executionStatus === 'failed' && <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800"><AlertTriangle className="inline h-4 w-4 mr-2" />Thực thi thất bại. Hãy điều chỉnh mã hoặc tạo lại truy vấn.</section>}

    {executionStatus === 'success' && rows.length > 0 && <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5"><div className="flex flex-wrap gap-3 justify-between items-center"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><h2 className="font-bold text-slate-800">Kết quả phân tích</h2></div><div className="flex gap-2 rounded-lg bg-slate-100 p-1"><button onClick={() => setResultView('answer')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${resultView === 'answer' ? 'bg-white shadow text-brand-primary' : 'text-slate-500'}`}>Câu trả lời</button><button onClick={() => setResultView('chart')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${resultView === 'chart' ? 'bg-white shadow text-brand-primary' : 'text-slate-500'}`}>Biểu đồ</button></div></div>{resultView === 'answer' ? <article className="rounded-xl border border-slate-200 p-5 bg-slate-50/70"><p className="text-xs font-bold uppercase tracking-wider text-brand-primary">Câu hỏi</p><h3 className="mt-2 font-bold text-slate-800">{activeQuery?.question}</h3><p className="mt-4 text-sm leading-6 text-slate-700">{activeQuery?.explanation || 'Kết quả được tạo từ truy vấn đã phê duyệt.'}</p>{insights && <div className="mt-5 grid md:grid-cols-3 gap-3"><Insight title="Mô tả" text={insights.descriptive} color="blue" /><Insight title="Chẩn đoán" text={insights.diagnostic} color="violet" /><Insight title="Đề xuất" text={insights.prescriptive} color="emerald" /></div>}</article> : <article className="rounded-xl border border-slate-200 p-5"><div className="flex flex-wrap gap-2 justify-between items-center"><h3 className="font-bold text-slate-800">Biểu đồ tương tác</h3><div className="flex flex-wrap gap-2"><select value={chartType} onChange={(event) => setChartType(event.target.value)} className="border rounded-lg px-2 py-1 text-xs"><option value="bar">Cột</option><option value="line">Đường</option><option value="pie">Tròn</option><option value="scatter">Phân tán</option></select><select value={xKey} onChange={(event) => setXKey(event.target.value)} className="border rounded-lg px-2 py-1 text-xs">{columns.map((column) => <option key={column} value={column}>X: {column}</option>)}</select><select value={yKey} onChange={(event) => setYKey(event.target.value)} className="border rounded-lg px-2 py-1 text-xs">{numericColumns.map((column) => <option key={column} value={column}>Y: {column}</option>)}</select></div></div><div className="h-[440px] mt-5">{chart}</div></article>}<details className="group"><summary className="cursor-pointer text-sm font-bold text-slate-700">Xem bảng dữ liệu gốc</summary><div className="overflow-x-auto mt-3"><table className="min-w-full text-sm"><thead><tr className="bg-slate-50">{columns.map((column) => <th key={column} className="text-left p-3 font-bold text-slate-600">{column}</th>)}</tr></thead><tbody>{rows.slice(0, 100).map((row, index) => <tr key={index} className="border-t border-slate-100">{columns.map((column) => <td key={column} className="p-3 text-slate-700">{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table></div></details></section>}
  </div>;
}

function Insight({ title, text, color }) { return <article className={`rounded-xl border p-4 bg-${color}-50 border-${color}-100`}><h3 className="font-bold text-slate-800">{title}</h3><p className="mt-1 text-sm text-slate-600">{text}</p></article>; }
