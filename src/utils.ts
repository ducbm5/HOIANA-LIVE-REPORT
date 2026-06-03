/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Booking, Statistics } from './types';
import * as XLSX from 'xlsx';

// Format currency to VND representation
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

// Simple date formatter (e.g., 2026-06-12 -> 12/06/2026)
export function formatDateVi(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Intelligent helper to parse room quantity from the room number string
export function countRoomsBooked(roomNumber: string): number {
  if (!roomNumber) return 0;
  const clean = roomNumber.trim().toLowerCase();
  if (clean === '' || clean === 'chưa xếp' || clean === 'chua xep' || clean === '-') return 0;

  // If it's a small single number (e.g., "1", "2"), treat as room count
  if (/^\d+$/.test(clean)) {
    const val = parseInt(clean);
    if (val < 10) return val;
    return 1;
  }

  // Count elements separated by commas, semicolons, pluses, slashes or spaces
  const parts = clean.split(/[,\s;\+/]+/).map(p => p.trim()).filter(p => p.length > 0 && p !== 'phòng' && p !== 'phong');
  if (parts.length > 0) {
    return parts.length;
  }
  return 1;
}

// Calculate stats from bookings
export function calculateStatistics(bookings: Booking[]): Statistics {
  const totalBookings = bookings.length;
  let totalRoomsBooked = 0;
  let totalDaysBooked = 0;
  let totalRoomRevenue = 0;
  let totalTicketRevenue = 0;
  let successfulCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  
  const byDistance: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  bookings.forEach(b => {
    const normStatus = normalizeStatus(b.status);
    
    // Sum statistics for all active transactions (exclude Cancelled / "Đã hủy" from room counts & days)
    if (normStatus !== 'Đã hủy') {
      const rooms = countRoomsBooked(b.roomNumber);
      const days = b.numberOfDays || 0;
      totalRoomsBooked += rooms;
      totalDaysBooked += days;
      totalRoomRevenue += rooms * days * 2300000;
    }

    // Sum ticket price only for successful payments
    if (normStatus === 'Thành công') {
      totalTicketRevenue += b.amount || 0;
    }

    if (normStatus === 'Thành công') successfulCount++;
    else if (normStatus === 'Chờ thanh toán') pendingCount++;
    else if (normStatus === 'Đã hủy') cancelledCount++;

    byStatus[normStatus] = (byStatus[normStatus] || 0) + 1;
    
    const dist = (b.distance || 'Không rõ').trim().toUpperCase();
    byDistance[dist] = (byDistance[dist] || 0) + 1;
  });

  return {
    totalBookings,
    totalRoomsBooked,
    totalDaysBooked,
    totalRoomRevenue,
    totalTicketRevenue,
    successfulCount,
    pendingCount,
    cancelledCount,
    byDistance,
    byStatus
  };
}

// Normalize Vietnamese status variants for consistent computation
export function normalizeStatus(status: string): 'Thành công' | 'Chờ thanh toán' | 'Đã hủy' {
  const s = (status || '').trim().toLowerCase();
  
  if (s.includes('huỷ') || s.includes('huy') || s.includes('cancel') || s.includes('reject')) {
    return 'Đã hủy';
  }
  if (s.includes('thành công') || s.includes('thanh cong') || s.includes('thực tế') || s.includes('xong') || s.includes('đã check') || s.includes('done') || s.includes('success') || s === 'active') {
    return 'Thành công';
  }
  return 'Chờ thanh toán'; // default for pending, processing, unseen, unpaid
}

// Clean accents and spaces for fuzzy column matching
function cleanStringCompare(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');     // keep alphanumeric
}

export function formatPhoneWithZero(phoneStr: string): string {
  let clean = (phoneStr || '').trim();
  if (!clean) return '';
  if (/^\d+$/.test(clean) && !clean.startsWith('0')) {
    clean = '0' + clean;
  }
  return clean;
}

// Parse pasted data from Google Sheets (TSV or CSV)
export function parsePastedData(rawText: string): Booking[] {
  const bookings: Booking[] = [];
  if (!rawText || !rawText.trim()) return bookings;

  // Split into lines
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) return bookings;

  // Detect delimiter (Tab for GS sheets cell copy-paste, otherwise comma or semicolon)
  const firstLine = lines[0];
  let delimiter = '\t';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';')) {
    delimiter = ';';
  } else if (firstLine.includes(',')) {
    delimiter = ',';
  }

  // Parse headers
  const rawHeaders = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  // Create mapping from standard properties to indices
  const headerMap: Record<string, number> = {};
  
  rawHeaders.forEach((header, index) => {
    const cleaned = cleanStringCompare(header);
    
    if (cleaned.includes('matchid') || cleaned === 'idtran' || cleaned === 'magiai') {
      headerMap['matchId'] = index;
    } else if (cleaned.includes('matchname') || cleaned === 'tentran' || cleaned === 'tengiai' || cleaned.includes('sukien')) {
      headerMap['matchName'] = index;
    } else if (cleaned.includes('hoten') || cleaned === 'tenkhach' || cleaned === 'tenkhachhang' || cleaned === 'name') {
      headerMap['fullName'] = index;
    } else if (cleaned.includes('cccd') || cleaned === 'cmnd' || cleaned.includes('passport') || cleaned.includes('cancuoc')) {
      headerMap['idCard'] = index;
    } else if (cleaned.includes('sdt') || cleaned.includes('sodienthoai') || cleaned === 'phone' || cleaned === 'tel') {
      headerMap['phone'] = index;
    } else if (cleaned.includes('email') || cleaned === 'thu') {
      headerMap['email'] = index;
    } else if (cleaned.includes('culy') || cleaned.includes('distance')) {
      headerMap['distance'] = index;
    } else if (cleaned.includes('ngaycheckin') || cleaned.includes('checkin') || cleaned.includes('nhanphong')) {
      headerMap['checkInDate'] = index;
    } else if (cleaned.includes('ngaycheckout') || cleaned.includes('checkout') || cleaned.includes('traphong')) {
      headerMap['checkOutDate'] = index;
    } else if (cleaned.includes('songay') || cleaned.includes('sodem') || cleaned.includes('songaystay')) {
      headerMap['numberOfDays'] = index;
    } else if (cleaned.includes('madatphong') || cleaned.includes('madat') || cleaned.includes('bookingcode')) {
      headerMap['bookingCode'] = index;
    } else if (cleaned.includes('sophong') || cleaned.includes('maphong') || cleaned === 'phong' || cleaned.includes('room')) {
      headerMap['roomNumber'] = index;
    } else if (cleaned.includes('code')) {
      headerMap['bookingCode'] = index;
    } else if (cleaned.includes('sotien') || cleaned.includes('money') || cleaned.includes('amount') || cleaned.includes('giatien') || cleaned.includes('doanhthu') || cleaned === 'tien') {
      headerMap['amount'] = index;
    } else if (cleaned.includes('trangthai') || cleaned.includes('status')) {
      headerMap['status'] = index;
    } else if (cleaned.includes('gioitinh') || cleaned.includes('gender') || cleaned === 'sex' || cleaned === 'tinhnm') {
      headerMap['gender'] = index;
    } else if (cleaned.includes('ngaytao') || cleaned.includes('createdat') || cleaned.includes('create')) {
      headerMap['createdAt'] = index;
    }
  });

  // If we couldn't map at least a few columns, support fallback default order matching columns A - P
  const isFallbackNeeded = Object.keys(headerMap).length < 3;
  const startIndex = isFallbackNeeded ? 0 : 1;

  for (let i = startIndex; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cells.length === 0 || (cells.length === 1 && cells[0] === '')) continue;

    // Build booking object
    const b: Partial<Booking> = {
      id: Math.random().toString(36).substring(2, 9),
      matchId: '',
      matchName: '',
      fullName: '',
      idCard: '',
      phone: '',
      email: '',
      distance: 'Tự do',
      checkInDate: '',
      checkOutDate: '',
      numberOfDays: 1,
      roomNumber: '',
      bookingCode: '',
      amount: 0,
      status: 'Chờ thanh toán',
      gender: '',
      createdAt: ''
    };

    if (isFallbackNeeded) {
      if (cells[0] !== undefined) b.matchId = cells[0];
      if (cells[1] !== undefined) b.matchName = cells[1] || '';
      if (cells[2] !== undefined) b.fullName = cells[2];
      if (cells[3] !== undefined) b.idCard = cells[3];
      if (cells[4] !== undefined) b.gender = cells[4];
      if (cells[5] !== undefined) b.phone = formatPhoneWithZero(cells[5]);
      if (cells[6] !== undefined) b.email = cells[6];
      if (cells[7] !== undefined) b.distance = cells[7];
      if (cells[8] !== undefined) b.checkInDate = reformatDateToIso(cells[8]);
      if (cells[9] !== undefined) b.checkOutDate = reformatDateToIso(cells[9]);
      if (cells[10] !== undefined) b.numberOfDays = parseInt(cells[10]) || 1;
      if (cells[11] !== undefined) b.roomNumber = cells[11];
      if (cells[12] !== undefined) b.bookingCode = cells[12];
      if (cells[13] !== undefined) b.amount = parsePrice(cells[13]);
      if (cells[14] !== undefined) b.status = cells[14];
      if (cells[15] !== undefined) b.createdAt = cells[15];
    } else {
      // Map using matched headers
      if (headerMap['matchId'] !== undefined) b.matchId = cells[headerMap['matchId']] || '';
      if (headerMap['matchName'] !== undefined) b.matchName = cells[headerMap['matchName']] || '';
      if (headerMap['fullName'] !== undefined) b.fullName = cells[headerMap['fullName']] || '';
      if (headerMap['idCard'] !== undefined) b.idCard = cells[headerMap['idCard']] || '';
      if (headerMap['gender'] !== undefined) b.gender = cells[headerMap['gender']] || '';
      if (headerMap['phone'] !== undefined) b.phone = formatPhoneWithZero(cells[headerMap['phone']]);
      if (headerMap['email'] !== undefined) b.email = cells[headerMap['email']] || '';
      if (headerMap['distance'] !== undefined) b.distance = cells[headerMap['distance']] || '';
      if (headerMap['checkInDate'] !== undefined) b.checkInDate = reformatDateToIso(cells[headerMap['checkInDate']]);
      if (headerMap['checkOutDate'] !== undefined) b.checkOutDate = reformatDateToIso(cells[headerMap['checkOutDate']]);
      if (headerMap['numberOfDays'] !== undefined) b.numberOfDays = parseInt(cells[headerMap['numberOfDays']]) || 1;
      if (headerMap['roomNumber'] !== undefined) b.roomNumber = cells[headerMap['roomNumber']] || '';
      if (headerMap['bookingCode'] !== undefined) b.bookingCode = cells[headerMap['bookingCode']] || '';
      if (headerMap['amount'] !== undefined) b.amount = parsePrice(cells[headerMap['amount']]);
      if (headerMap['status'] !== undefined) b.status = cells[headerMap['status']] || 'Thành công';
      if (headerMap['createdAt'] !== undefined) b.createdAt = cells[headerMap['createdAt']] || '';
    }

    // Ensure state defaults and normalizations
    const finalStatus = normalizeStatus(b.status || '');
    if (finalStatus !== 'Thành công') {
      // Skip non-successful bookings
      continue;
    }
    b.status = 'Thành công';

    // Filter out bookings with room number starting with or containing AQUA / AQUAU
    const rNum = (b.roomNumber || '').trim().toUpperCase();
    if (rNum.startsWith('AQUA') || rNum.includes('AQUA') || rNum.startsWith('AQ')) {
      continue;
    }

    if (!b.bookingCode) {
      b.bookingCode = 'MDP' + Math.floor(1000 + Math.random() * 9000);
    }

    bookings.push(b as Booking);
  }

  // Reverse the parsed bookings array to match the oldest-to-newest order (ngược với google sheet hiện tại)
  return bookings.reverse();
}

// Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD (ISO) for consistent date logic
function reformatDateToIso(dateStr: string): string {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();
  
  // Try matching standard DD/MM/YYYY
  const partsDmy = cleaned.split('/');
  if (partsDmy.length === 3) {
    const day = partsDmy[0].padStart(2, '0');
    const month = partsDmy[1].padStart(2, '0');
    let year = partsDmy[2];
    if (year.length === 2) year = '20' + year; // handle yy to yyyy
    return `${year}-${month}-${day}`;
  }

  // Try matching DD-MM-YYYY
  const partsDash = cleaned.split('-');
  if (partsDash.length === 3) {
    if (partsDash[0].length === 4) {
      // Already YYYY-MM-DD
      return cleaned;
    }
    const day = partsDash[0].padStart(2, '0');
    const month = partsDash[1].padStart(2, '0');
    let year = partsDash[2];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  return cleaned;
}

// Helper to clean price format (e.g. 3.200.000 or 3,200,000 VND to 3200000)
function parsePrice(val: string): number {
  if (!val) return 0;
  let cleanValue = val.replace(/[₫đVNDvnd\s]/g, '');
  if (cleanValue.includes('.') && cleanValue.includes(',')) {
    cleanValue = cleanValue.replace(/,/g, '');
  } else if (cleanValue.includes('.')) {
    cleanValue = cleanValue.replace(/\./g, '');
  } else if (cleanValue.includes(',')) {
    cleanValue = cleanValue.replace(/,/g, '');
  }
  
  return parseFloat(cleanValue) || 0;
}

// Generate TSV string copyable to Google Sheets with custom columns requested by user:
// HO TEN | CCCD | SDT | EMAIL | CU LY | NGAY CHECKIN | NGAY CHECKOUT | SO NGAY | SO PHONG | MA DAT PHONG | SO TIEN DAT PHONG
export function exportToTSV(bookings: Booking[]): string {
  const headers = [
    'HO TEN', 
    'CCCD',
    'SDT',
    'EMAIL',
    'CU LY',
    'NGAY CHECKIN', 
    'NGAY CHECKOUT', 
    'SO NGAY', 
    'SO PHONG', 
    'MA DAT PHONG', 
    'SO TIEN DAT PHONG'
  ];

  const rows = bookings.map(b => {
    const roomsCount = countRoomsBooked(b.roomNumber);
    const days = b.numberOfDays || 0;
    const roomBookingAmount = roomsCount * days * 2300000;

    return [
      b.fullName || '',
      b.idCard || '',
      b.phone || '',
      b.email || '',
      b.distance || '',
      formatDateVi(b.checkInDate),
      formatDateVi(b.checkOutDate),
      b.numberOfDays,
      b.roomNumber || '',
      b.bookingCode || '',
      roomBookingAmount
    ];
  });

  return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
}

export function exportToExcel(bookings: Booking[]): Uint8Array {
  const headers = [
    'STT',
    'HO TEN', 
    'CCCD',
    'GIOI TINH',
    'SDT',
    'EMAIL',
    'CU LY',
    'NGAY CHECKIN', 
    'NGAY CHECKOUT', 
    'SO NGAY', 
    'SO PHONG', 
    'MA DAT PHONG', 
    'SO TIEN DAT PHONG',
    'TIEN BIB',
    'TONG TIEN',
    'NGAY TAO'
  ];

  const data = bookings.map((b, index) => {
    const roomsCount = countRoomsBooked(b.roomNumber);
    const days = b.numberOfDays || 0;
    const roomBookingAmount = roomsCount * days * 2300000;
    const bibAmount = (b.amount || 0) - roomBookingAmount;

    return {
      'STT': index + 1,
      'HO TEN': b.fullName || '',
      'CCCD': b.idCard || '',
      'GIOI TINH': b.gender || '',
      'SDT': b.phone || '',
      'EMAIL': b.email || '',
      'CU LY': b.distance || '',
      'NGAY CHECKIN': formatDateVi(b.checkInDate),
      'NGAY CHECKOUT': formatDateVi(b.checkOutDate),
      'SO NGAY': b.numberOfDays,
      'SO PHONG': b.roomNumber || '',
      'MA DAT PHONG': b.bookingCode || '',
      'SO TIEN DAT PHONG': roomBookingAmount,
      'TIEN BIB': bibAmount,
      'TONG TIEN': b.amount || 0,
      'NGAY TAO': b.createdAt || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo Cáo Đặt Phòng');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

export interface DistanceRegistration {
  matchId: string;
  matchName: string;
  distance: string;
}

export function parseDistanceSheet(rawText: string): DistanceRegistration[] {
  if (!rawText) return [];
  const lines = rawText.split(/\r?\n/);
  const registrations: DistanceRegistration[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by tabs for TSV formatting
    const cells = line.split('\t').map(c => c.trim());
    
    // Check if it's the header row
    const firstCell = (cells[0] || '').toLowerCase();
    const secondCell = (cells[1] || '').toLowerCase();
    const thirdCell = (cells[2] || '').toLowerCase();
    
    if (
      firstCell.includes('match id') ||
      firstCell === 'match_id' ||
      firstCell === 'id' ||
      thirdCell.includes('cu ly') ||
      thirdCell.includes('cự ly') ||
      (firstCell === 'match id' && secondCell === 'match name' && thirdCell === 'cu ly')
    ) {
      continue; // Skip header line
    }

    if (cells.length >= 3) {
      registrations.push({
        matchId: cells[0] || '',
        matchName: cells[1] || '',
        distance: cells[2] || 'Chưa phân loại'
      });
    } else if (cells.length === 2) {
      registrations.push({
        matchId: cells[0] || '',
        matchName: cells[1] || '',
        distance: 'Chưa phân loại'
      });
    } else if (cells.length === 1) {
      registrations.push({
        matchId: cells[0] || '',
        matchName: '',
        distance: 'Chưa phân loại'
      });
    }
  }

  return registrations;
}

