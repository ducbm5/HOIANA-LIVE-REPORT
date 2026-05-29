/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking } from './types';
import { INITIAL_BOOKINGS } from './mockData';
import { calculateStatistics, exportToTSV, exportToExcel, parsePastedData } from './utils';
import { StatBox } from './components/StatBox';
import { BookingList } from './components/BookingList';
import { BookingForm } from './components/BookingForm';
import { ImportPasteModal } from './components/ImportPasteModal';
import { 
  Building2, 
  ClipboardCheck, 
  Download, 
  Share2, 
  RefreshCw, 
  Clock, 
  Database,
  CheckCircle2,
  Trash2,
  Lock
} from 'lucide-react';

export default function App() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null | undefined>(undefined); // undefined means closed, null means adding-new
  const [systemMessage, setSystemMessage] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);
  const [liveTime, setLiveTime] = useState('');
  const [showExportFallback, setShowExportFallback] = useState(false);
  const [exportTsvText, setExportTsvText] = useState('');
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  // Directly fetch live data from the published Google Sheet URL
  const fetchLiveGoogleSheet = async (showNotification = true) => {
    setIsLoadingLive(true);
    const defaultUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSThI11rzR8_xVXtdkF9Eptvogkj7ATVkJuo1CJJsgvee6ZgLDLRe2dyWwxE9l4P4-lVCYo-t9GArf9/pub?gid=0&single=true&output=tsv';
    try {
      const res = await fetch(defaultUrl);
      if (!res.ok) {
        throw new Error('Không thể fetch dữ liệu từ link Google Sheets');
      }
      const rawText = await res.text();
      const parsed = parsePastedData(rawText);
      if (parsed && parsed.length > 0) {
        setBookings(parsed);
        localStorage.setItem('google_sheet_bookings', JSON.stringify(parsed));
        if (showNotification) {
          showToast(`Đã đồng bộ trực tiếp ${parsed.length} đặt phòng từ Google Sheet thành công!`, 'success');
        }
        return true;
      } else {
        throw new Error('Dữ liệu rỗng');
      }
    } catch (err) {
      console.error("Lỗi đồng bộ trực tiếp Google Sheet:", err);
      if (showNotification) {
        showToast('Lỗi đồng bộ trực tiếp. Hãy kiểm tra kết nối mạng hoặc dán thủ công.', 'danger');
      }
      return false;
    } finally {
      setIsLoadingLive(false);
    }
  };

  // Initial Load from Live Google Sheet, falling back to LocalStorage or Mock Data
  useEffect(() => {
    const loadData = async () => {
      // 1. First, check if we can fetch live data straight from the user's Sheet link
      const success = await fetchLiveGoogleSheet(false);
      if (success) {
        showToast('Đã đồng bộ dữ liệu trực tiếp từ Google Sheet thành công.', 'success');
        return;
      }

      // 2. Fall back to LocalStorage
      try {
        const saved = localStorage.getItem('google_sheet_bookings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Apply filtering just in case local storage contains old stale items
            const filtered = parsed.filter((b: Booking) => {
              const rNum = (b.roomNumber || '').trim().toUpperCase();
              const isAqua = rNum.startsWith('AQUA') || rNum.includes('AQUA') || rNum.startsWith('AQ');
              return b.status === 'Thành công' && !isAqua;
            });
            setBookings(filtered);
            showToast('Không thể kết nối Internet. Đang hiển thị dữ liệu đã lưu cục bộ.', 'info');
            return;
          }
        }
      } catch (e) {
        console.error("Local storage error:", e);
      }

      // 3. Last resort fallback
      setBookings(INITIAL_BOOKINGS);
      showToast('Khởi chạy ứng dụng với dữ liệu thử nghiệm.', 'info');
    };

    loadData();
  }, []);

  // Sync to LocalStorage on updates
  useEffect(() => {
    if (bookings.length > 0) {
      localStorage.setItem('google_sheet_bookings', JSON.stringify(bookings));
    }
  }, [bookings]);

  // Live Timer implementation for Real-time feels
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      };
      setLiveTime(now.toLocaleString('vi-VN', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Toast notifier helper
  const showToast = (text: string, type: 'success' | 'info' | 'danger' = 'info') => {
    setSystemMessage({ text, type });
    setTimeout(() => {
      setSystemMessage(curr => curr?.text === text ? null : curr);
    }, 4500);
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === id) {
        showToast(`Đã chuyển trạng thái sang "${newStatus}" thành công.`, 'success');
        return { ...b, status: newStatus };
      }
      return b;
    }));
  };

  const handleDeleteBooking = (id: string) => {
    const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa đặt phòng này khỏi báo cáo?");
    if (confirmDelete) {
      setBookings(prev => prev.filter(b => b.id !== id));
      showToast("Đặt phòng đã bị xóa bỏ khỏi danh sách.", 'danger');
    }
  };

  const handleSaveBooking = (saved: Booking) => {
    if (editingBooking === null) {
      // Adding new
      setBookings(prev => [saved, ...prev]);
      showToast(`Đã thêm mới thành công mã đặt phòng: ${saved.bookingCode}`, 'success');
    } else {
      // Editing existing
      setBookings(prev => prev.map(b => b.id === saved.id ? saved : b));
      showToast(`Đã cập nhật thay đổi cho mã đặt phòng: ${saved.bookingCode}`, 'success');
    }
    setEditingBooking(undefined);
  };

  const handleImportData = (newBookings: Booking[], replaceExisting: boolean) => {
    // Keep status and custom room assignments for existing booking codes so local work is never lost!
    const existingMap = new Map<string, Partial<Booking>>();
    bookings.forEach(b => {
      if (b.bookingCode) {
        existingMap.set(b.bookingCode, {
          status: b.status,
          roomNumber: b.roomNumber
        });
      }
    });

    const reconciledBookings = newBookings.map(b => {
      const match = existingMap.get(b.bookingCode);
      if (match) {
        return {
          ...b,
          status: match.status || b.status,
          roomNumber: match.roomNumber || b.roomNumber
        };
      }
      return b;
    });

    if (replaceExisting) {
      setBookings(reconciledBookings);
      localStorage.setItem('google_sheet_bookings', JSON.stringify(reconciledBookings));
      showToast(`Đã đồng bộ toàn bộ ${reconciledBookings.length} đặt phòng mới từ Google Sheets (giữ nguyên trạng thái check-in đã ghi nhận).`, 'success');
    } else {
      // Add only non-overlapping booking codes
      const existingCodes = new Set(bookings.map(b => b.bookingCode));
      const filteredNew = reconciledBookings.filter(b => !existingCodes.has(b.bookingCode));
      const duplicatesCount = reconciledBookings.length - filteredNew.length;
      
      setBookings(prev => [...filteredNew, ...prev]);
      
      if (duplicatesCount > 0) {
        showToast(`Đã nạp thêm ${filteredNew.length} đặt phòng mới. Giữ nguyên trạng thái ${duplicatesCount} đặt phòng đã có sẵn.`, 'info');
      } else {
        showToast(`Đã thêm mới ${filteredNew.length} đặt phòng thành công vào danh sách.`, 'success');
      }
    }
  };

  // Copy TSV string to clipboard for Google Sheets paste-back
  const handleExportCopyToClipboard = async () => {
    const tsvText = exportToTSV(bookings);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsvText);
        showToast("Đã sao chép cấu trúc Google Sheet vào Clipboard! Bạn có thể dán (Ctrl+V) thẳng vào Sheet.", "success");
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (e) {
      // Fallback display
      setExportTsvText(tsvText);
      setShowExportFallback(true);
    }
  };

  // Download Excel as physical file
  const handleDownloadExcel = () => {
    const excelData = exportToExcel(bookings);
    const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao-cao-dat-phong-live-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Tệp báo cáo dạng Excel (.xlsx) đã được tải xuống thiết bị.", "success");
  };

  // Reset to default mock
  const handleResetToDemo = () => {
    const conf = window.confirm("Hệ thống sẽ đặt lại toàn bộ báo cáo về danh sách chạy thử nghiệm gốc. Bạn có chắc chắn?");
    if (conf) {
      setBookings(INITIAL_BOOKINGS);
      localStorage.setItem('google_sheet_bookings', JSON.stringify(INITIAL_BOOKINGS));
      showToast("Báo cáo đã được đặt lại về dữ liệu chạy thử nghiệm gốc.", "info");
    }
  };

  const handleClearAll = () => {
    const conf = window.confirm("Bạn có chắc chắn muốn XÓA SẠCH toàn bộ dữ liệu đặt phòng? Thao tác này không thể thu hồi.");
    if (conf) {
      setBookings([]);
      localStorage.removeItem('google_sheet_bookings');
      showToast("Đã xóa sạch toàn bộ cơ sở dữ liệu.", "danger");
    }
  };

  const stats = calculateStatistics(bookings);

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans" id="applet-viewport-root">
      
      {/* Toast Alert floating */}
      {systemMessage && (
        <div className="fixed top-20 right-6 z-50 max-w-sm animate-fade-in" id="global-system-alert">
          <div className={`p-4 rounded-xl border shadow-xl flex items-center gap-3 ${
            systemMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
            systemMessage.type === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-900' :
            'bg-blue-50 border-blue-100 text-blue-900'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              systemMessage.type === 'success' ? 'bg-emerald-500' :
              systemMessage.type === 'danger' ? 'bg-rose-500' :
              'bg-blue-500'
            }`}></span>
            <p className="text-xs font-semibold">{systemMessage.text}</p>
          </div>
        </div>
      )}

      {/* Primary Header */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md shrink-0 border-b border-slate-800" id="main-dashboard-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md animate-pulse">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-display uppercase tracking-wide">Report.Live</h1>
                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium font-semibold">Báo cáo trực tuyến & Quản lý Thống kê Trạng thái Đặt Phòng Sự Kiện</p>
            </div>
          </div>

          {/* Dynamic timer & action triggers */}
          <div className="flex flex-col md:items-end gap-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{liveTime || 'Đang cập nhật thời gian...'} (GMT+7)</span>
            </div>
            <p className="text-[10px] text-slate-500">Đồng bộ liên trì với dữ liệu Sheet của bạn</p>
          </div>

        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6" id="dashboard-main-content">
        
        {/* Real-time Link Banner / Setup toolbar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4" id="google-sheet-connection-panel">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác dữ liệu:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live Sheet Sync trigger button */}
            <button
              onClick={() => fetchLiveGoogleSheet(true)}
              disabled={isLoadingLive}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5 transition-all hover:scale-103 active:scale-97 disabled:opacity-55 disabled:cursor-not-allowed"
              id="btn-live-sync-sheets"
              title="Đồng bộ trực tiếp dữ liệu mới nhất từ tệp Google Sheets của bạn"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin' : ''}`} />
              {isLoadingLive ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
            </button>

            {/* Download file */}
            <button
              onClick={handleDownloadExcel}
              disabled={bookings.length === 0}
              className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                bookings.length > 0
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-97'
                  : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              id="btn-download-xlsx"
            >
              <Download className="w-4 h-4" />
              Xuất file Excel (.xlsx)
            </button>

          </div>
        </div>

        {/* 1/ Statistics Box Block */}
        <section className="space-y-3" id="stats-section-box">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">1/ BẢNG THỐNG KÊ CHI TIẾT (LIVE PORT)</h2>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">Khớp thời gian chạy thời gian thực</span>
          </div>
          <StatBox stats={stats} />
        </section>

        {/* 2/ Dual Listings Section & booking search */}
        <section className="space-y-3" id="listings-section">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">2/ PHÂN LUỒNG TRẠNG THÁI & TRA CỨU</h2>
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Tổng số: <strong className="font-bold text-slate-700">{bookings.length}</strong> đặt phòng</span>
            </div>
          </div>
          <BookingList 
            bookings={bookings}
            onStatusChange={handleUpdateStatus}
            onEdit={(b) => setEditingBooking(b)}
            onDelete={handleDeleteBooking}
            onOpenAddModal={() => setEditingBooking(null)}
          />
        </section>

      </main>

      {/* Copy Fallback Overlay / Modal */}
      {showExportFallback && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="copy-fallback-dialog">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Chép văn bản sang Google Sheet</h3>
                <p className="text-xs text-slate-500">Hãy chọn tất cả vùng văn bản dưới đây và bấm Ctrl+C</p>
              </div>
            </div>
            <textarea
              readOnly
              value={exportTsvText}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full h-[180px] p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px] text-slate-600 focus:outline-hidden"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowExportFallback(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer text-center"
              >
                Đã chép, Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Sheet Modal overlay */}
      {isImportOpen && (
        <ImportPasteModal 
          onImport={handleImportData}
          onClose={() => setIsImportOpen(false)}
        />
      )}

      {/* Manual Booking Add / Edit Modal overlay */}
      {editingBooking !== undefined && (
        <BookingForm 
          booking={editingBooking}
          onSave={handleSaveBooking}
          onClose={() => setEditingBooking(undefined)}
        />
      )}

      {/* Tiny clean footer */}
      <footer className="py-8 bg-slate-50 border-t border-slate-100 mt-20 text-center shrink-0">
        <p className="text-xs text-slate-400 font-medium tracking-tight">
          Báo cáo trực tuyến &copy; 2026 Room Booking Live Report Tracker. Thiết kế theo tiêu chuẩn Google Live Sheet.
        </p>
      </footer>

    </div>
  );
}
