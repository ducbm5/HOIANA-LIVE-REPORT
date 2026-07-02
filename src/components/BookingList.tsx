/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Booking } from '../types';
import { formatVND, formatDateVi, countRoomsBooked } from '../utils';
import { 
  Search, 
  MapPin, 
  Building, 
  Check, 
  X,
  Trash2, 
  Edit3, 
  Filter,
  UserCheck,
  RotateCcw,
  Plus,
  AlertCircle,
  CalendarDays
} from 'lucide-react';

interface BookingListProps {
  bookings: Booking[];
  onStatusChange: (id: string, newStatus: string) => void;
  onEdit: (booking: Booking) => void;
  onDelete: (id: string) => void;
  onOpenAddModal: () => void;
}

export function BookingList({ 
  bookings, 
  onStatusChange, 
  onEdit, 
  onDelete,
  onOpenAddModal
}: BookingListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistance, setSelectedDistance] = useState('ALL');

  // Unified lists filtering based on search query: room number / booking code / customer name / phone / CCCD
  const filteredBookings = bookings.filter(b => {
    const q = searchQuery.trim().toLowerCase();
    const matchesDistance = selectedDistance === 'ALL' || b.distance === selectedDistance;
    if (!q) return matchesDistance;

    const codeMatch = (b.bookingCode || '').toLowerCase().includes(q);
    const roomMatch = (b.roomNumber || '').toLowerCase().includes(q);
    const nameMatch = (b.fullName || '').toLowerCase().includes(q);
    const cccdMatch = (b.idCard || '').toLowerCase().includes(q);
    const phoneMatch = (b.phone || '').toLowerCase().includes(q);
    
    const queryMatches = codeMatch || roomMatch || nameMatch || cccdMatch || phoneMatch;

    return queryMatches && matchesDistance;
  });

  // Unique list of distances for filtering dropdowns
  const uniqueDistances = Array.from(new Set(bookings.map(b => b.distance))).filter(Boolean);

  // Split bookings into 1 main listing:
  // SUCCESSFUL BOOKINGS (Trạng thái: "Thành công")
  const successfulList = filteredBookings.filter(b => b.status === 'Thành công');

  return (
    <div className="space-y-6" id="dual-listings-and-search">
      
      {/* Search & Tool belt */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input targeting room number, booking code, name, phone, CCCD */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm Số phòng, Mã đặt, Tên khách, SĐT, CCCD..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder-slate-400"
            id="search-by-booking-code"
          />
        </div>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Filter by Distance (CU LY) */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold mr-1">Cự ly:</span>
            <select
              value={selectedDistance}
              onChange={(e) => setSelectedDistance(e.target.value)}
              className="bg-transparent focus:outline-hidden font-medium cursor-pointer"
            >
              <option value="ALL">Mọi cự ly</option>
              {uniqueDistances.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          {/* Quick reset filter button */}
          {(searchQuery || selectedDistance !== 'ALL') && (
            <button
               onClick={() => {
                 setSearchQuery('');
                 setSelectedDistance('ALL');
               }}
               className="p-1 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
            >
               <RotateCcw className="w-3.5 h-3.5" />
               Xóa bộ lọc
            </button>
          )}
        </div>

      </div>

      {/* Main Single Listing component replacing split grid */}
      <div className="w-full">
        
        {/* LISTING 1: ĐẶT PHÒNG THÀNH CÔNG */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col overflow-hidden w-full" id="booking-listing-successful-pane">
          {/* Listing 1 Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">DANH SÁCH ĐẶT PHÒNG THÀNH CÔNG</h3>
                <p className="text-[11px] text-slate-500 font-medium text-emerald-600">Giao dịch đã hoàn thành hoặc trạng thái "Thành công"</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-850 rounded-xl text-xs font-bold leading-none">
              {successfulList.length} lượt thành công
            </span>
          </div>

          {/* Listing 1 Table/Content */}
          <div className="p-4 flex-1 overflow-x-auto min-h-[350px]">
            {successfulList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 text-xs">Chưa ghi nhận đặt phòng thành công nào</p>
                  <p className="text-[11px] text-slate-400 max-w-[280px]">Quý khách có thể đồng bộ hoặc dán dữ liệu mới nhất.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {successfulList.map(b => (
                  <div 
                    key={b.id} 
                    className="border border-slate-100 hover:border-emerald-250 bg-white hover:bg-emerald-50/5 rounded-xl p-4 transition-all duration-205 shadow-3xs flex flex-col md:flex-row justify-between gap-4 relative overflow-hidden group animate-fade-in"
                  >
                    {/* Event edge label decoration */}
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-full"></div>

                    {/* Booking Card Body */}
                    <div className="space-y-2 flex-1 pl-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-800 font-extrabold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          MÃ ĐẶT PHÒNG: {b.bookingCode || 'Chưa rõ'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-md font-semibold font-mono">
                          {b.distance}
                        </span>
                        {b.roomNumber && (
                          <span className="text-[10.5px] px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-100 rounded-md font-bold flex items-center gap-1">
                            <Building className="w-3 h-3 text-blue-500" />
                            Phòng {b.roomNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm tracking-tight">{b.fullName}</h4>
                          {b.gender && b.gender.trim() && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold leading-none ${
                              b.gender.trim().toLowerCase() === 'nam' || b.gender.trim().toLowerCase() === 'male'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                                : 'bg-rose-50 text-rose-700 border border-rose-150'
                            }`}>
                              {b.gender}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display Stays Details precisely */}
                      <div className="flex items-center gap-1.5 py-1 bg-slate-50/55 px-2 rounded-lg text-xs font-semibold text-slate-700 font-mono w-fit border border-slate-100">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{b.checkInDate ? formatDateVi(b.checkInDate) : '...'} &rarr; {b.checkOutDate ? formatDateVi(b.checkOutDate) : '...'} ({b.numberOfDays || 1} ngày)</span>
                      </div>

                      {/* Detail mini specifications */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-y-1.5 gap-x-3 pt-1.5 border-t border-slate-100 mt-1 text-[11.5px] text-slate-500">
                        <div>
                          <span>SĐT: </span><strong className="font-bold text-slate-800 font-mono">{b.phone || '-'}</strong>
                        </div>
                        <div>
                          <span>CCCD: </span><strong className="font-bold text-slate-800 font-mono">{b.idCard || '-'}</strong>
                        </div>
                        <div>
                          <span>Giới tính: </span><strong className="font-bold text-slate-700">{b.gender || '-'}</strong>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400">Email: </span><span className="font-mono text-slate-600 truncate max-w-[130px] inline-block">{b.email || '-'}</span>
                        </div>
                        <div>
                          <p className="text-[11px] text-teal-600">B.Phòng: <strong className="font-bold text-teal-700">{formatVND(countRoomsBooked(b.roomNumber) * (b.numberOfDays || 1) * 2300000)}</strong></p>
                        </div>
                      </div>
                    </div>

                    {/* Costing details section */}
                    <div className="flex items-center md:flex-col justify-between md:justify-center gap-2.5 shrink-0 md:border-l md:border-slate-100 md:pl-4">
                      <div className="text-right justify-self-end mr-2 md:mr-0 md:mb-1">
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Tiền mua vé</p>
                        <p className="font-black text-emerald-600 text-sm">{formatVND(b.amount || 0)}</p>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
