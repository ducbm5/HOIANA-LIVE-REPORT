/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking } from './types';
import { INITIAL_BOOKINGS } from './mockData';
import { calculateStatistics, exportToTSV, exportToExcel, parsePastedData, parseDistanceSheet, DistanceRegistration } from './utils';
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
  Lock,
  Flag,
  Activity
} from 'lucide-react';

export default function App() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [distanceRegistrations, setDistanceRegistrations] = useState<DistanceRegistration[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null | undefined>(undefined); // undefined means closed, null means adding-new
  const [systemMessage, setSystemMessage] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);
  const [liveTime, setLiveTime] = useState('');
  const [showExportFallback, setShowExportFallback] = useState(false);
  const [exportTsvText, setExportTsvText] = useState('');
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);

  // Password Authentication States
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('hoiana_auth') === 'H26';
  });

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
          showToast(`Đã đồng bộ trực tiếp ${parsed.length} đặt phòng thành công!`, 'success');
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

  // Directly fetch live distance category statistics from the secondary published Google Sheet
  const fetchLiveDistanceSheet = async (showNotification = true) => {
    setIsLoadingDistance(true);
    const distanceUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6VrjLi3LkxOEUNjrykBy9-XATfDZO0ggz-Gdcqbeuvuy_yqj0JGt9fZ46tv088iAkmWlvacpKsZ7o/pub?output=tsv';
    try {
      const res = await fetch(distanceUrl);
      if (!res.ok) {
        throw new Error('Không thể fetch dữ liệu cự ly');
      }
      const rawText = await res.text();
      const parsed = parseDistanceSheet(rawText);
      if (parsed && parsed.length > 0) {
        setDistanceRegistrations(parsed);
        localStorage.setItem('google_sheet_distances', JSON.stringify(parsed));
        if (showNotification) {
          showToast(`Đã đồng bộ trực tiếp ${parsed.length} đăng ký cự ly chạy thành công!`, 'success');
        }
        return true;
      } else {
        throw new Error('Dữ liệu cự ly rỗng');
      }
    } catch (err) {
      console.error("Lỗi đồng bộ trực tiếp Distance Sheet:", err);
      if (showNotification) {
        showToast('Lỗi đồng bộ cự ly trực tiếp. Hãy kiểm tra kết nối mạng.', 'danger');
      }
      return false;
    } finally {
      setIsLoadingDistance(false);
    }
  };

  const handleSyncAllData = async () => {
    setIsLoadingLive(true);
    setIsLoadingDistance(true);
    const r1 = await fetchLiveGoogleSheet(false);
    const r2 = await fetchLiveDistanceSheet(false);
    setIsLoadingLive(false);
    setIsLoadingDistance(false);
    if (r1 && r2) {
      showToast('Đồng bộ thành công dữ liệu đặt phòng & cự ly trực tiếp!', 'success');
    } else if (r1 || r2) {
      showToast('Đồng bộ thành công một phần dữ liệu.', 'info');
    } else {
      showToast('Không thể đồng bộ trực tiếp dữ liệu. Hãy xem lại kết nối mạng.', 'danger');
    }
  };

  // Initial Load from Live Google Sheet, falling back to LocalStorage or Mock Data
  useEffect(() => {
    const loadData = async () => {
      // 1. Try fetching first
      const successBookings = await fetchLiveGoogleSheet(false);
      const successDistances = await fetchLiveDistanceSheet(false);

      if (successBookings && successDistances) {
        showToast('Đã đồng bộ toàn bộ dữ liệu trực tiếp thành công.', 'success');
        return;
      }

      // Check offline fallback for bookings
      if (!successBookings) {
        try {
          const saved = localStorage.getItem('google_sheet_bookings');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const filtered = parsed.filter((b: Booking) => {
                const rNum = (b.roomNumber || '').trim().toUpperCase();
                const isAqua = rNum.startsWith('AQUA') || rNum.includes('AQUA') || rNum.startsWith('AQ');
                return b.status === 'Thành công' && !isAqua;
              });
              setBookings(filtered);
              showToast('Đang hiển thị dữ liệu lịch đặt phòng lưu cục bộ.', 'info');
            } else {
              setBookings(INITIAL_BOOKINGS);
            }
          } else {
            setBookings(INITIAL_BOOKINGS);
          }
        } catch (e) {
          setBookings(INITIAL_BOOKINGS);
        }
      }

      // Check offline fallback for distances
      if (!successDistances) {
        try {
          const savedDists = localStorage.getItem('google_sheet_distances');
          if (savedDists) {
            const parsedDists = JSON.parse(savedDists);
            if (Array.isArray(parsedDists) && parsedDists.length > 0) {
              setDistanceRegistrations(parsedDists);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
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

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = password.trim();
    if (trimmed === 'H26' || trimmed.toUpperCase() === 'H26') {
      localStorage.setItem('hoiana_auth', 'H26');
      setIsAuthenticated(true);
      setAuthError('');
      showToast('Đăng nhập thành công!', 'success');
    } else {
      setAuthError('Mật mã truy cập không chính xác. Vui lòng thử lại!');
      showToast('Mật mã truy cập không chính xác.', 'danger');
    }
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Bạn có chắc chắn muốn đăng xuất?");
    if (confirmLogout) {
      localStorage.removeItem('hoiana_auth');
      setIsAuthenticated(false);
      setPassword('');
      showToast('Đã đăng xuất thành công.', 'info');
    }
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
      // Adding new (append at the end to keep oldest-to-newest order)
      setBookings(prev => [...prev, saved]);
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
      showToast(`Đã đồng bộ toàn bộ ${reconciledBookings.length} đặt phòng mới thành công (giữ nguyên trạng thái check-in đã ghi nhận).`, 'success');
    } else {
      // Add only non-overlapping booking codes
      const existingCodes = new Set(bookings.map(b => b.bookingCode));
      const filteredNew = reconciledBookings.filter(b => !existingCodes.has(b.bookingCode));
      const duplicatesCount = reconciledBookings.length - filteredNew.length;
      
      // Append new records to the end to keep oldest-to-newest chronological order
      setBookings(prev => [...prev, ...filteredNew]);
      
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans relative selection:bg-blue-600 selection:text-white" id="auth-wall-container">
        
        {/* Floating Background Effects */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Global Toast Alert floating */}
        {systemMessage && (
          <div className="fixed top-6 right-6 z-50 max-w-sm animate-fade-in" id="auth-system-toast">
            <div className={`p-4 rounded-xl border border-slate-800 shadow-2xl flex items-center gap-3 ${
              systemMessage.type === 'success' ? 'bg-emerald-950 text-emerald-100 border-emerald-500/30' :
              systemMessage.type === 'danger' ? 'bg-rose-950 text-rose-100 border-rose-500/30' :
              'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                systemMessage.type === 'success' ? 'bg-emerald-400' :
                systemMessage.type === 'danger' ? 'bg-rose-400' :
                'bg-blue-400'
              }`}></span>
              <p className="text-xs font-semibold">{systemMessage.text}</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-md flex flex-col items-center gap-8 relative z-10">
          
          {/* HOIANA AQUAMAN Logo */}
          <div className="flex items-center bg-black px-6 py-4 rounded-2xl border border-slate-850 shadow-2xl select-none text-center">
            {/* Left Column: HOIANA */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-white font-sans font-black text-xl md:text-2xl tracking-[0.1em] leading-none">
                HOIANA
              </span>
              <span className="text-slate-400 font-sans text-[8px] md:text-[9.5px] tracking-[0.22em] leading-none mt-1.5 font-bold">
                RESORT & GOLF
              </span>
            </div>
            
            {/* Vertical line divider */}
            <div className="h-9 w-[1px] bg-white opacity-40 mx-4" />
            
            {/* Right Column: AQUAMAN */}
            <div className="flex flex-col items-start justify-center text-left">
              <span className="text-white font-sans font-black text-xl md:text-2xl tracking-[0.05em] leading-none">
                AQUAMAN
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-slate-400 font-sans text-[7px] md:text-[8px] tracking-[0.08em] leading-none font-semibold">
                  BY VNEXPRESS MARATHON
                </span>
                <span className="bg-white text-slate-950 font-sans text-[7px] md:text-[8px] font-black px-1 py-0.2 rounded-xs select-none tracking-wider leading-none">
                  VIETNAM
                </span>
              </div>
            </div>
          </div>

          {/* Login container box */}
          <div className="w-full bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-900 p-8 shadow-2xl flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-200 tracking-wider uppercase mb-1">CỔNG BÁO CÁO LIVE TRỰC TUYẾN</h2>
              <p className="text-xs text-slate-400">Vui lòng xác thực quyền truy cập thông tin đặt phòng</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mật mã truy cập</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    placeholder="Nhập Password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm font-semibold text-white tracking-wide placeholder-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                    autoFocus
                  />
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl text-center">
                  ⚠️ {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-900/20 cursor-pointer active:scale-98 transition-all"
              >
                Xác thực truy cập
              </button>
            </form>

            <div className="border-t border-slate-850 pt-4 text-center">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Hệ thống yêu cầu mật khẩu để hiển thị dữ liệu trực tuyến.<br/>
                Mật mã gợi ý: <strong>H26</strong>
              </p>
            </div>

          </div>

          <p className="text-[10px] text-slate-600 tracking-tight select-none">
            Room Booking Tracker &copy; 2026 HOIANA AQUAMAN. All rights reserved.
          </p>

        </div>
      </div>
    );
  }

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-5">
            {/* HOIANA AQUAMAN Vector Logo matching original banner style */}
            <div className="flex items-center bg-black px-4 py-2.5 rounded-xl border border-slate-800 shadow-lg select-none text-center">
              {/* Left Column: HOIANA */}
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-white font-sans font-black text-base md:text-lg tracking-[0.1em] leading-none">
                  HOIANA
                </span>
                <span className="text-slate-400 font-sans text-[7px] md:text-[8px] tracking-[0.22em] leading-none mt-1 font-bold">
                  RESORT & GOLF
                </span>
              </div>
              
              {/* Vertical line divider */}
              <div className="h-7 w-[1px] bg-white opacity-40 mx-3" />
              
              {/* Right Column: AQUAMAN */}
              <div className="flex flex-col items-start justify-center text-left font-sans">
                <span className="text-white font-black text-base md:text-lg tracking-[0.05em] leading-none">
                  AQUAMAN
                </span>
                <div className="flex items-center gap-1.5 mt-1 leading-none">
                  <span className="text-slate-400 text-[6.5px] md:text-[7.5px] tracking-[0.08em] leading-none font-semibold">
                    BY VNEXPRESS MARATHON
                  </span>
                  <span className="bg-white text-slate-950 text-[6.5px] md:text-[7.5px] font-black px-1 py-0.2 rounded-xs select-none tracking-wider leading-none">
                    VIETNAM
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Hệ thống báo cáo & quản lý đặt phòng sự kiện</p>
            </div>
          </div>

          {/* Dynamic timer & action triggers */}
          <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 font-mono bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-750 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{liveTime || 'Đang cập nhật thời gian...'} (GMT+7)</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold hover:text-rose-400 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:bg-rose-500/10 hover:border-rose-505/20 active:scale-95 transition-all cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              Đăng xuất
            </button>
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
              onClick={handleSyncAllData}
              disabled={isLoadingLive || isLoadingDistance}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5 transition-all hover:scale-103 active:scale-97 disabled:opacity-55 disabled:cursor-not-allowed"
              id="btn-live-sync-sheets"
              title="Đồng bộ trực tiếp dữ liệu mới nhất từ cả hai tệp Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${(isLoadingLive || isLoadingDistance) ? 'animate-spin' : ''}`} />
              {(isLoadingLive || isLoadingDistance) ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">1/ BẢNG THỐNG KÊ CHI TIẾT LƯU TRÚ (LIVE PORT)</h2>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">Khớp thời gian thực</span>
          </div>
          <StatBox 
            stats={stats} 
            distanceRegistrations={distanceRegistrations}
            isLoadingDistance={isLoadingDistance}
            onRefreshDistance={() => fetchLiveDistanceSheet(true)}
          />
        </section>


        {/* 2/ Dual Listings Section & booking search */}
        <section className="space-y-3" id="listings-section">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">2/ PHÂN LUỒNG TRẠNG THÁI & TRA CỨU</h2>
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Tổng số: <strong className="font-bold text-slate-700">{bookings.length}</strong> lượt đặt phòng</span>
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
