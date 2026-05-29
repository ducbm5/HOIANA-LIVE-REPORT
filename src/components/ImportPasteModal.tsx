/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Booking } from '../types';
import { parsePastedData } from '../utils';
import { FileText, Clipboard, AlertTriangle, CheckCircle, X, Link, RefreshCw } from 'lucide-react';

interface ImportPasteModalProps {
  onImport: (newBookings: Booking[], replaceExisting: boolean) => void;
  onClose: () => void;
}

export function ImportPasteModal({ onImport, onClose }: ImportPasteModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'paste'>('link');
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vSThI11rzR8_xVXtdkF9Eptvogkj7ATVkJuo1CJJsgvee6ZgLDLRe2dyWwxE9l4P4-lVCYo-t9GArf9/pub?gid=0&single=true&output=tsv');
  const [fetching, setFetching] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [previewBookings, setPreviewBookings] = useState<Booking[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPastedText(text);
    setErrorMsg('');
    
    if (!text.trim()) {
      setPreviewBookings([]);
      return;
    }

    try {
      const parsed = parsePastedData(text);
      setPreviewBookings(parsed);
    } catch (err) {
      setPreviewBookings([]);
    }
  };

  const handleFetchFromUrl = async () => {
    if (!sheetUrl.trim()) {
      setErrorMsg('Vui lòng nhập đường dẫn Google Sheets được xuất bản (Published Link).');
      return;
    }
    setFetching(true);
    setErrorMsg('');
    try {
      const res = await fetch(sheetUrl);
      if (!res.ok) {
        throw new Error('Không thể tải tệp từ Google Sheets. Hãy đảm bảo liên kết được Xuất bản lên web dưới định dạng Tố Tách (TSV) hoặc CSV thành công.');
      }
      const rawText = await res.text();
      const parsed = parsePastedData(rawText);
      if (parsed.length === 0) {
        throw new Error('Dữ liệu trống hoặc không đúng định dạng. Cần có ít nhất 1 dòng tiêu đề cùng dòng dữ liệu.');
      }
      setPreviewBookings(parsed);
      setPastedText(rawText);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối hoặc định dạng Google Sheets không phù hợp.');
      setPreviewBookings([]);
    } finally {
      setFetching(false);
    }
  };

  const handleImportSubmit = () => {
    if (previewBookings.length === 0) {
      setErrorMsg('Không tìm thấy dữ liệu đặt phòng hợp lệ. Hãy kiểm tra lại liên kết hoặc văn bản nhập.');
      return;
    }

    onImport(previewBookings, replaceExisting);
    onClose();
  };

  const loadExampleTemplate = () => {
    const template = `MATCH ID	MATCH NAME	HO TEN	CCCD	SDT	EMAIL	CU LY	NGAY CHECKIN	NGAY CHECKOUT	SO NGAY	SO PHONG	MA DAT PHONG	SO TIEN	TRANG THAI
GS102	Lao Cai Marathon 2026	Trần Văn Phú	3456782312	0912111222	phu.tv@gmail.com	21KM	15/06/2026	17/06/2026	2	204	MDP-LC21	1600000	Chờ thanh toán
GS103	Lao Cai Marathon 2026	Lê Thị Diệu	0124567123	0963444555	dieu.lt@gmail.com	10KM	15/06/2026	16/06/2026	1	103	MDP-LC10	850000	Thành công`;
    setPastedText(template);
    setPreviewBookings(parsePastedData(template));
    setActiveTab('paste');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="import-sheets-modal">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Clipboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Nhập dữ liệu với Google Sheets</h3>
              <p className="text-xs text-slate-500">Đồng bộ trực tiếp qua liên kết bảo mật hoặc sao chép thủ công</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={() => { setActiveTab('link'); setErrorMsg(''); }}
            className={`py-3 px-4 font-semibold text-xs flex items-center gap-1.5 border-b-2 cursor-pointer transition-all ${
              activeTab === 'link'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Link className="w-4 h-4" />
            Đồng bộ Link tự động (Khuyên dùng)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('paste'); setErrorMsg(''); }}
            className={`py-3 px-4 font-semibold text-xs flex items-center gap-1.5 border-b-2 cursor-pointer transition-all ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            Nhập tay Copy & Dán ô
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'link' ? (
            <div className="space-y-3">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-blue-800 flex items-center gap-1">
                  <Link className="w-4 h-4 shrink-0 text-blue-600" />
                  Hướng dẫn và cấu hình Live Sync Google Sheet:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Trong Google Sheet của bạn, truy cập <strong>Tệp (File)</strong> &gt; <strong>Chia sẻ (Share)</strong> &gt; <strong>Xuất bản lên web (Publish to web)</strong>.</li>
                  <li>Chọn Trang tính mong muốn và định dạng <strong>Giá trị phân tách bằng tab (.tsv)</strong> (hoặc CSV).</li>
                  <li>Click <strong>Xuất bản (Publish)</strong>, sao chép liên kết đó và dán vào dưới đây.</li>
                </ol>
                <div className="text-[11.5px] bg-white border border-blue-100 rounded-lg p-2 mt-2 text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                  <span><strong>Đã chuẩn bị sẵn link:</strong> Đường dẫn mặc định được trỏ thẳng tới link dữ liệu của giải bạn đang tổ chức.</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Đường dẫn xuất bản Google Sheet (TSV / CSV URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => { setSheetUrl(e.target.value); setErrorMsg(''); }}
                    placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=tsv"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromUrl}
                    disabled={fetching}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 font-bold text-xs active:scale-95 disabled:bg-slate-300 disabled:scale-100 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
                    {fetching ? 'Đang tải...' : 'Nạp dữ liệu'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-700 flex items-center gap-1">
                  <Clipboard className="w-4 h-4 shrink-0 text-slate-500" />
                  Hướng dẫn sao chép &amp; dán trực tiếp:
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Mở Google Sheet hoặc Excel của bạn, quét chọn toàn bộ vùng dữ liệu (bao gồm cả dòng tiêu đề đầu tiên).</li>
                  <li>Copy bằng tổ hợp phím <kbd className="bg-white border px-1 rounded-xs text-slate-800 font-semibold text-[10px]">Ctrl+C</kbd> (hoặc <kbd className="bg-white border px-1 rounded-xs text-slate-800 font-semibold text-[10px]">Cmd+C</kbd>).</li>
                  <li>Click vào ô dưới đây và dán vào <kbd className="bg-white border px-1 rounded-xs text-slate-800 font-semibold text-[10px]">Ctrl+V</kbd> (hoặc <kbd className="bg-white border px-1 rounded-xs text-slate-800 font-semibold text-[10px]">Cmd+V</kbd>).</li>
                </ol>
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-slate-400 text-[10px]">Hệ thống thông minh tự nhận mặt cột và lọc các dòng trống.</span>
                  <button 
                    type="button" 
                    onClick={loadExampleTemplate}
                    className="text-blue-600 font-semibold hover:underline text-[11px] cursor-pointer"
                  >
                    Nhập dữ liệu mẫu nhanh để chạy thử
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Vùng dán dữ liệu đặt phòng (TSV/CSV Plaintext)
                </label>
                <textarea
                  value={pastedText}
                  onChange={handleTextChange}
                  placeholder="Dán các dòng dữ liệu từ bảng của bạn vào đây (Hãy chắc chắn cột đầu tiên là dòng tiêu đề dòng 1)..."
                  className="w-full min-h-[140px] max-h-[220px] border border-slate-200 rounded-xl p-3 text-xs font-mono bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                  id="raw-import-textarea"
                />
              </div>
            </div>
          )}

          {/* Validation & Preview Summary */}
          {previewBookings.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-800">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-900 mb-1">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                Dữ liệu hợp lệ để nhập!
              </div>
              <p>Phát hiện <strong className="font-bold">{previewBookings.length} đặt phòng</strong>. Để khớp chính xác, các trường dữ liệu sau đã được phân tách và sẵn sàng lưu trữ.</p>
              
              {/* Mini Scroll Preview */}
              <div className="mt-3 max-h-[120px] overflow-y-auto border border-emerald-200 rounded-lg bg-white p-2">
                <table className="w-full text-[10px] text-slate-600 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-left bg-slate-50 font-bold">
                      <th className="p-1 text-[9px] uppercase tracking-wider text-slate-400">Mã đặt</th>
                      <th className="p-1 text-[9px] uppercase tracking-wider text-slate-400">Khách hàng</th>
                      <th className="p-1 text-[9px] uppercase tracking-wider text-slate-400">Cự ly</th>
                      <th className="p-1 text-[9px] uppercase tracking-wider text-slate-400">Số tiền</th>
                      <th className="p-1 text-[9px] uppercase tracking-wider text-slate-400">Phòng</th>
                      <th className="p-1 text-[9px] uppercase tracking-wider text-slate-400">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewBookings.map((b, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="p-1 font-mono text-blue-600 font-medium">{b.bookingCode}</td>
                        <td className="p-1 font-medium">{b.fullName}</td>
                        <td className="p-1 text-purple-700 font-semibold">{b.distance}</td>
                        <td className="p-1 text-emerald-600">{b.amount.toLocaleString('vi-VN')} đ</td>
                        <td className="p-1 text-center font-semibold">{b.roomNumber}</td>
                        <td className="p-1">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] inline-block font-semibold ${
                            b.status === 'Thành công' ? 'bg-emerald-100 text-emerald-800' :
                            b.status === 'Đã hủy' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-800 flex items-start gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Không thể nhập</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Import mode options */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="replace-existing"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded-md focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="replace-existing" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                Ghi đè hoàn toàn (Xóa toàn bộ đặt phòng hiện có và ghi đè bằng danh sách mới này)
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              * Mặc định khi bỏ chọn: Dữ liệu đặt phòng mới từ Google Sheet sẽ được **thêm nối tiếp** vào danh sách hiện tại của bạn.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-100 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={previewBookings.length === 0}
            className={`px-5 py-2 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all ${
              previewBookings.length > 0 
                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer active:scale-95' 
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Xác nhận nhập ({previewBookings.length} dòng)
          </button>
        </div>

      </div>
    </div>
  );
}
