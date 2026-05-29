/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Booking {
  id: string; // Unique internal ID for react list keys
  matchId: string;      // MATCH ID
  matchName: string;    // MATCH NAME
  fullName: string;     // HO TEN
  idCard: string;       // CCCD
  phone: string;        // SDT
  email: string;        // EMAIL
  distance: string;     // CU LY (Cự ly giải chạy - e.g., 10KM, 21KM, 42KM)
  checkInDate: string;  // NGAY CHECKIN
  checkOutDate: string; // NGAY CHECKOUT
  numberOfDays: number; // SO NGAY
  roomNumber: string;   // SO PHONG (Số phòng hoặc Số lượng phòng)
  bookingCode: string;  // MA DAT PHONG
  amount: number;       // SO TIEN
  status: string;       // TRANG THAI (e.g., 'Thành công', 'Chờ thanh toán', 'Đã hủy')
}

export interface Statistics {
  totalBookings: number;
  totalRoomsBooked: number;      // So Phong duoc bat
  totalDaysBooked: number;       // So Ngay dat phong
  totalRoomRevenue: number;      // Tong so tien dat phong (Room * Day * 2,300,000)
  totalTicketRevenue: number;    // Tong so tien mua ve tai truong (So Tien)
  successfulCount: number;
  pendingCount: number;
  cancelledCount: number;
  byDistance: Record<string, number>;
  byStatus: Record<string, number>;
}
