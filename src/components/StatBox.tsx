/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Statistics } from '../types';
import { formatVND } from '../utils';
import { 
  Building2, 
  Calendar, 
  BedDouble, 
  Ticket,
  CheckCircle, 
  Clock, 
  XCircle, 
  Award,
  TrendingUp,
  Info
} from 'lucide-react';

interface StatBoxProps {
  stats: Statistics;
}

export function StatBox({ stats }: StatBoxProps) {
  // Success rate for visually rich support
  const successRate = stats.totalBookings > 0 
    ? Math.round((stats.successfulCount / stats.totalBookings) * 100) 
    : 0;

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

        {/* Pricing calculations notes */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between" id="distribution-operations">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Cách Thức Tính Doanh Thu
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              - <strong>Tổng tiền đặt phòng</strong> = [Số phòng được gán / đặt] &times; [Số ngày lưu trú] &times; <strong>2.300.000 đ/đêm</strong>. Chỉ tính các đơn chưa hủy.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              - <strong>Tiền vé tại trường</strong> = Tổng giá trị cột [SO TIEN] thu thập từ các runner có giao dịch trạng thái "Thành công".
            </p>
          </div>
          <div className="border-t border-slate-100 pt-2.5 mt-2 flex justify-between text-[11px] text-slate-400 font-semibold">
            <span></span>
            <span>HĐ: Active</span>
          </div>
        </div>

      </div>
    </div>
  );
}
