/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { X, Check } from 'lucide-react';

interface BookingFormProps {
  booking?: Booking | null; // Null if adding a new booking
  onSave: (booking: Booking) => void;
  onClose: () => void;
}

export function BookingForm({ booking, onSave, onClose }: BookingFormProps) {
  const [matchId, setMatchId] = useState('');
  const [matchName, setMatchName] = useState('');
  const [fullName, setFullName] = useState('');
  const [idCard, setIdCard] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [distance, setDistance] = useState('21KM');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [roomNumber, setRoomNumber] = useState('');
  const [bookingCode, setBookingCode] = useState('');
  const [amount, setAmount] = useState(0);
  const [status, setStatus] = useState('Thành công');

   useEffect(() => {
    if (booking) {
      setMatchId(booking.matchId || '');
      setMatchName('');
      setFullName(booking.fullName || '');
      setIdCard(booking.idCard || '');
      setPhone(booking.phone || '');
      setEmail(booking.email || '');
      setDistance(booking.distance || '21KM');
      setCheckInDate(booking.checkInDate || '');
      setCheckOutDate(booking.checkOutDate || '');
      setNumberOfDays(booking.numberOfDays || 1);
      setRoomNumber(booking.roomNumber || '');
      setBookingCode(booking.bookingCode || '');
      setAmount(booking.amount || 0);
      setStatus(booking.status || 'Thành công');
    } else {
      // Setup default placeholder values for a new booking
      const generatedCode = 'MDP' + Math.floor(1000 + Math.random() * 9000);
      setBookingCode(generatedCode);
      setMatchId('DL2026');
      setMatchName('');
      setCheckInDate('2026-06-12');
      setCheckOutDate('2026-06-14');
      setNumberOfDays(2);
      setAmount(1500000);
    }
  }, [booking]);

  // Handle auto-calculating number of days when check-in or check-out changes
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const d1 = new Date(checkInDate);
      const d2 = new Date(checkOutDate);
      const diffTime = d2.getTime() - d1.getTime();
      if (diffTime >= 0) {
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setNumberOfDays(diffDays || 1);
      }
    }
  }, [checkInDate, checkOutDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !bookingCode) {
      return;
    }

    let formattedPhone = phone.trim();
    if (formattedPhone && /^\d+$/.test(formattedPhone) && !formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone;
    }

    const savedBooking: Booking = {
      id: booking ? booking.id : Math.random().toString(36).substring(2, 9),
      matchId: matchId.trim() || 'FREE',
      matchName: matchName.trim() || 'Sự kiện tự do',
      fullName: fullName.trim(),
      idCard: idCard.trim(),
      phone: formattedPhone,
      email: email.trim(),
      distance: distance.trim(),
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      numberOfDays: Number(numberOfDays) || 1,
      roomNumber: roomNumber.trim() || 'Chưa xếp',
      bookingCode: bookingCode.trim().toUpperCase(),
      amount: Number(amount) || 0,
      status: 'Thành công'
    };

    onSave(savedBooking);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="booking-edit-form-modal">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-800">
              {booking ? 'Sửa thông tin đặt phòng' : 'Thêm mới lượt đặt phòng'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Nhập thông tin đầy đủ các cột tương ứng từ A đến N
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Main customer row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">Họ và Tên (HO TEN) *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Số Điện Thoại (SDT)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xxx..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">CCCD</label>
                <input
                  type="text"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  placeholder="Số căn cước..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@vidu.com"
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Mã Đặt Phòng (MA DAT PHONG) *</label>
                <input
                  type="text"
                  required
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value)}
                  placeholder="MDP..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all font-mono font-bold text-blue-600 uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Cự Ly Chạy (CU LY)</label>
                <select
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-xl p-2.5 text-xs cursor-pointer transition-all"
                >
                  <option value="5KM">5KM</option>
                  <option value="10KM">10KM</option>
                  <option value="21KM">21KM</option>
                  <option value="42KM">42KM</option>
                  <option value="70KM">70KM</option>
                  <option value="100KM">100KM</option>
                  <option value="Aquaman SOLO">Aquaman SOLO</option>
                  <option value="Tự do">Tự do</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Dates & Days section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">Ngày Check-in (NGAY CHECKIN)</label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">Ngày Check-out (NGAY CHECKOUT)</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">Số ngày lưu trú (SO NGAY)</label>
              <input
                type="number"
                min="1"
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all font-mono font-bold"
              />
            </div>
          </div>

          {/* Room and pricing description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">Số Phòng / Hiệu Phòng (SO PHONG)</label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="Ví dụ: 302, 105"
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all font-mono font-bold text-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase block">Số Tiền Vé (SO TIEN)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="1500000"
                  className="w-full border border-slate-200 rounded-xl p-2.5 pr-10 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-hidden transition-all font-mono font-bold text-emerald-600"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                  đ
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2"></div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            Lưu phiếu đặt phòng
          </button>
        </div>

      </div>
    </div>
  );
}
