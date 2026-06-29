/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Statistics } from '../types';
import { formatVND, DistanceRegistration } from '../utils';
import { 
  Building2, 
  Calendar, 
  BedDouble, 
  Ticket,
  CheckCircle, 
  Clock, 
  XCircle, 
  Award,
  Flag,
  TrendingUp,
  Info
} from 'lucide-react';

interface StatBoxProps {
  stats: Statistics;
  distanceRegistrations: DistanceRegistration[];
  isLoadingDistance?: boolean;
  onRefreshDistance?: () => void;
}

export function StatBox({ stats, distanceRegistrations, isLoadingDistance, onRefreshDistance }: StatBoxProps) {
  // Success rate for visually rich support
  const successRate = stats.totalBookings > 0 
    ? Math.round((stats.successfulCount / stats.totalBookings) * 100) 
    : 0;

  // Local fake offsets state
  const [offsets, setOffsets] = React.useState<Record<string, number>>({});

  const [isPasswordOpen, setIsPasswordOpen] = React.useState(false);
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);
  const [passwordInput, setPasswordInput] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const [tempOffsets, setTempOffsets] = React.useState<Record<string, string>>({});
  const [flagClickCount, setFlagClickCount] = React.useState(0);
  
  // Google Apps Script Cloud Sync States (Hardcoded URL)
  const appsScriptUrl = 'https://script.google.com/macros/s/AKfycby1m4VGZS9X_NqZGkumu-IRH9uYcH03tXVpwSscABcJ1Ml9kEJB25j1i5yH7sU7IGef/exec';
  const tsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTq3WXBWebt6tihwF2eREizr0PEf3sM6d92wvtR940rMFxxifmdMi1Xg5QGmTxVwG-Xf4x5sm5ShlmY/pub?output=tsv';
  const [isSyncingOffsets, setIsSyncingOffsets] = React.useState(false);

  // Function to load offsets from the cloud (Google Sheet TSV)
  const fetchOffsetsFromCloud = React.useCallback(async () => {
    setIsSyncingOffsets(true);
    try {
      const res = await fetch(`${tsvUrl}${tsvUrl.includes('?') ? '&' : '?'}nocache=${Date.now()}`);
      if (res.ok) {
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        const validated: Record<string, number> = {};
        
        // Skip header line (index 0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split('\t');
          if (parts.length >= 2) {
            const distance = parts[0].trim().replace(/^["']|["']$/g, '');
            const rawVal = parts[1].trim().replace(/^["']|["']$/g, '');
            const num = parseInt(rawVal, 10);
            if (!isNaN(num)) {
              validated[distance] = num;
            }
          }
        }
        setOffsets(validated);
      }
    } catch (e) {
      console.warn('Could not fetch offsets from Google Sheet TSV:', e);
    } finally {
      setIsSyncingOffsets(false);
    }
  }, []);

  // Function to save offsets to the cloud (Google Apps Script)
  const saveOffsetsToCloud = React.useCallback(async (finalOffsets: Record<string, number>, urlToUse?: string) => {
    const targetUrl = urlToUse || appsScriptUrl;
    if (!targetUrl) return;
    setIsSyncingOffsets(true);
    try {
      const dataStr = encodeURIComponent(JSON.stringify(finalOffsets));
      const res = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=save&data=${dataStr}`);
      if (!res.ok) {
        throw new Error('Save response not ok');
      }
    } catch (e) {
      console.warn('Could not save offsets to Apps Script:', e);
    } finally {
      setIsSyncingOffsets(false);
    }
  }, [appsScriptUrl]);

  // Sync on mount or when master distance registrations are updated
  React.useEffect(() => {
    fetchOffsetsFromCloud();
  }, [distanceRegistrations, fetchOffsetsFromCloud]);

  // Wrapper for refreshing both standard distance sheets and fake offsets
  const handleRefreshDistances = async () => {
    if (onRefreshDistance) {
      onRefreshDistance();
    }
    if (appsScriptUrl) {
      fetchOffsetsFromCloud();
    }
  };

  const uniqueDistances = React.useMemo(() => {
    const set = new Set<string>();
    distanceRegistrations.forEach(reg => {
      if (reg.distance) {
        set.add(reg.distance.trim());
      }
    });
    if (set.size === 0) {
      return ['5KM', '10KM', '21KM', '42KM'];
    }
    return Array.from(set).sort();
  }, [distanceRegistrations]);

  const distanceStats = React.useMemo(() => {
    const statsMap: Record<string, number> = {};
    let total = 0;
    
    // 1. Base counts
    distanceRegistrations.forEach(reg => {
      const dist = (reg.distance || 'Chưa phân loại').trim();
      statsMap[dist] = (statsMap[dist] || 0) + 1;
      total++;
    });

    // 2. Add offsets
    Object.keys(offsets).forEach(dist => {
      if (offsets[dist] > 0) {
        statsMap[dist] = (statsMap[dist] || 0) + offsets[dist];
        total += offsets[dist];
      }
    });

    return {
      total,
      breakdown: Object.entries(statsMap)
        .map(([distance, count]) => ({ distance, count }))
        .sort((a, b) => b.count - a.count)
    };
  }, [distanceRegistrations, offsets]);

  return (
    <div className="space-y-6" id="booking-stats-box">
      
      {/* Target Statistics requested by the user */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Số phòng được đặt [so phong] */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center justify-between" id="stat-rooms-booked">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Số Phòng được đặt</p>
            <p className="text-3xl font-black text-blue-600">{stats.totalRoomsBooked} phòng</p>
            <p className="text-[11px] text-slate-500 font-medium">
              Chỉ tính các đơn chưa hủy
            </p>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3.5 rounded-lg shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Số ngày đặt phòng [so ngay] */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center justify-between" id="stat-days-booked">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Số Ngày đặt phòng</p>
            <p className="text-3xl font-black text-amber-600">{stats.totalDaysBooked} ngày</p>
            <p className="text-[11px] text-slate-500 font-medium">
              Tổng số đêm/ngày lưu trú
            </p>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3.5 rounded-lg shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Tổng số tiền đặt phòng [so phong * so ngay * 2.300.000] */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center justify-between" id="stat-room-revenue">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng số tiền đặt phòng</p>
            <p className="text-2xl font-black text-teal-600">{formatVND(stats.totalRoomRevenue)}</p>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Giá: 2.300.000 đ / đêm / phòng</span>
            </p>
          </div>
          <div className="bg-teal-50 text-teal-600 p-3.5 rounded-lg shrink-0">
            <BedDouble className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Tổng số tiền mua vé tại trường [so tien] */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center justify-between" id="stat-ticket-revenue">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng số tiền mua vé tại trường</p>
            <p className="text-2xl font-black text-emerald-600">{formatVND(stats.totalTicketRevenue)}</p>
            <p className="text-[11px] text-slate-500 font-medium font-semibold text-emerald-600">
              Cột SO TIEN (Trạng thái: "Thành công")
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-lg shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Auxiliary Details Bento Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distance breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-xs" id="distribution-distance">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-purple-500" />
            Thống Kê Khách Đặt Theo Cự Ly Giải
          </h3>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {Object.keys(stats.byDistance).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Chưa có dữ liệu cự ly</p>
            ) : (
              Object.entries(stats.byDistance)
                .sort((a, b) => b[1] - a[1]) // Sort desc by count
                .map(([dist, count]) => {
                  const percentage = stats.totalBookings > 0 
                    ? Math.round((count / stats.totalBookings) * 100) 
                    : 0;
                  return (
                    <div key={dist} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-600">{dist}</span>
                        <span className="text-slate-500 font-medium">{count} lượt ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div 
                          className="bg-purple-500 h-1.5 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Thống kê cự ly đăng ký quy mô giải chạy từ Google Sheets */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between min-h-[240px]" id="distribution-operations">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-slate-100">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (isPasswordOpen || isConfigOpen) {
                      setIsPasswordOpen(false);
                      setIsConfigOpen(false);
                      setFlagClickCount(0);
                    } else {
                      const nextCount = flagClickCount + 1;
                      if (nextCount >= 10) {
                        setIsPasswordOpen(true);
                        setPasswordInput('');
                        setPasswordError('');
                        setFlagClickCount(0);
                      } else {
                        setFlagClickCount(nextCount);
                      }
                    }
                  }}
                  className="hover:scale-110 transition-transform cursor-default focus:outline-hidden text-indigo-500 hover:text-indigo-600 active:scale-95"
                  type="button"
                >
                  <Flag className="w-4 h-4 shrink-0" />
                </button>
                Cự Ly Đăng Ký Giải
              </h3>
              <span className="text-[10px] bg-blue-50 border border-blue-150 text-blue-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                Tổng: {(isLoadingDistance || isSyncingOffsets) ? '...' : `${distanceStats.total}`} BIB
              </span>
            </div>

            {isPasswordOpen ? (
              <div className="py-2.5 space-y-3">
                <p className="text-[11px] font-bold text-slate-600">Yêu cầu xác thực mật khẩu cấu hình:</p>
                <div className="space-y-1.5">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder=""
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (passwordInput === '898989') {
                          setIsConfigOpen(true);
                          setIsPasswordOpen(false);
                          setPasswordError('');
                          const initialTemp: Record<string, string> = {};
                          uniqueDistances.forEach(dist => {
                            initialTemp[dist] = (offsets[dist] || 0).toString();
                          });
                          setTempOffsets(initialTemp);
                        } else {
                          setPasswordError('Mật khẩu không chính xác');
                        }
                      }
                    }}
                  />
                  {passwordError && (
                    <p className="text-[10px] text-rose-600 font-bold">{passwordError}</p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (passwordInput === '898989') {
                        setIsConfigOpen(true);
                        setIsPasswordOpen(false);
                        setPasswordError('');
                        const initialTemp: Record<string, string> = {};
                        uniqueDistances.forEach(dist => {
                          initialTemp[dist] = (offsets[dist] || 0).toString();
                        });
                        setTempOffsets(initialTemp);
                      } else {
                        setPasswordError('Mật khẩu không chính xác');
                      }
                    }}
                    type="button"
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  >
                    Xác nhận
                  </button>
                  <button
                    onClick={() => setIsPasswordOpen(false)}
                    type="button"
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : isConfigOpen ? (
              <div className="py-1 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Cấu hình cộng thêm vé:</span>
                  <button
                    onClick={() => {
                      const reseted: Record<string, string> = {};
                      uniqueDistances.forEach(dist => {
                        reseted[dist] = '0';
                      });
                      setTempOffsets(reseted);
                    }}
                    type="button"
                    className="text-[9px] text-rose-600 font-bold bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded transition-all cursor-pointer"
                  >
                    Đặt về 0
                  </button>
                </div>
                
                <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {uniqueDistances.map(dist => (
                    <div key={dist} className="flex items-center justify-between gap-2 bg-slate-50/70 p-1.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-extrabold text-slate-600 uppercase truncate max-w-[120px]">{dist}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold">+</span>
                        <input
                          type="number"
                          min="0"
                          value={tempOffsets[dist] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTempOffsets(prev => ({ ...prev, [dist]: val }));
                          }}
                          className="w-16 px-1.5 py-0.5 text-right text-xs font-mono font-bold border border-slate-200 rounded focus:outline-hidden focus:border-indigo-500 bg-white"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const finalOffsets: Record<string, number> = {};
                      uniqueDistances.forEach(dist => {
                        const val = parseInt(tempOffsets[dist] || '0', 10);
                        finalOffsets[dist] = isNaN(val) || val < 0 ? 0 : val;
                      });
                      setOffsets(finalOffsets);
                      localStorage.setItem('distance_offsets', JSON.stringify(finalOffsets));
                      
                      saveOffsetsToCloud(finalOffsets, appsScriptUrl);
                      
                      setIsConfigOpen(false);
                    }}
                    type="button"
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => setIsConfigOpen(false)}
                    type="button"
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              (isLoadingDistance || isSyncingOffsets) ? (
                <div className="py-10 flex flex-col items-center justify-center space-y-3" id="distance-stats-loader">
                  <div className="relative flex items-center justify-center">
                    <div className="w-9 h-9 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <Flag className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider animate-pulse">Đang nạp...</p>
                  </div>
                </div>
              ) : distanceStats.total === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  Chưa có dữ liệu đồng bộ. Nhấn "Tải lại".
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {distanceStats.breakdown.map(({ distance, count }) => {
                    const percentage = distanceStats.total > 0
                      ? Math.round((count / distanceStats.total) * 100)
                      : 0;
                    
                    // Color helpers
                    const norm = distance.toLowerCase();
                    let colorClass = 'bg-slate-50 border-slate-150 text-slate-705';
                    let barColor = '#64748b'; // slate-500
                    if (norm.includes('21km') || norm.includes('21')) {
                      colorClass = 'bg-indigo-50 border-indigo-150 text-indigo-700';
                      barColor = '#4f46e5';
                    } else if (norm.includes('10km') || norm.includes('10')) {
                      colorClass = 'bg-amber-50 border-amber-150 text-amber-700';
                      barColor = '#d97706';
                    } else if (norm.includes('5km') || norm.includes('5')) {
                      colorClass = 'bg-teal-50 border-teal-150 text-teal-700';
                      barColor = '#0d9488';
                    } else if (norm.includes('42km') || norm.includes('42')) {
                      colorClass = 'bg-rose-50 border-rose-150 text-rose-700';
                      barColor = '#e11d48';
                    } else if (norm.includes('aquaman') || norm.includes('solo')) {
                      colorClass = 'bg-blue-50 border-blue-150 text-blue-700';
                      barColor = '#2563eb';
                    } else if (norm.includes('sprint') || norm.includes('half')) {
                      colorClass = 'bg-purple-50 border-purple-150 text-purple-700';
                      barColor = '#8b5cf6';
                    }

                    return (
                      <div key={distance} className="flex flex-col justify-center bg-slate-50/40 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between text-[11px] gap-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border uppercase tracking-tight whitespace-nowrap ${colorClass}`}>
                            {distance}
                          </span>
                          <span className="font-bold text-slate-700 font-mono text-[10px] whitespace-nowrap">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200/55 rounded-full h-1 mt-1.5 overflow-hidden">
                          <div 
                            className="h-1 rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%`, backgroundColor: barColor }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          <div className="border-t border-slate-100 pt-2 mt-2.5 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isSyncingOffsets ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
              {isSyncingOffsets ? 'Đang đồng bộ...' : 'Đồng bộ tự động'}
            </span>
            {(isLoadingDistance || isSyncingOffsets) ? (
              <span className="text-blue-600 font-bold animate-pulse text-[9px] uppercase">Đang tải...</span>
            ) : (
              onRefreshDistance && (
                <button
                  onClick={handleRefreshDistances}
                  type="button"
                  className="hover:text-blue-600 font-extrabold text-[9px] uppercase tracking-wider bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded transition-all cursor-pointer"
                >
                  Tải lại
                </button>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
