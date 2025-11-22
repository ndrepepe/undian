import React from 'react';

interface CouponTemplateProps {
  name: string;
  employeeId: string;
  employeeCouponSequence: number; // Sequence number specific to the employee
  totalCouponsForEmployee: number; // Total coupons for this specific employee
  eventName: string;
  eventLocation: string;
  eventDate: string;
  watermarkText: string; // Prop baru untuk teks watermark
}

const CouponTemplate: React.FC<CouponTemplateProps> = ({ 
  name, 
  employeeId, 
  employeeCouponSequence, 
  totalCouponsForEmployee,
  eventName,
  eventLocation,
  eventDate,
  watermarkText
}) => {
  // Ukuran kupon: 8cm x 5cm (landscape)
  
  // Fungsi untuk mengulang teks watermark agar memenuhi area kupon
  const generateWatermarkLines = (text: string, repeatCount: number) => {
    if (!text) return null;
    const repeatedText = Array(repeatCount).fill(text).join(' ');
    return Array(5).fill(repeatedText).map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < 4 && <br/>}
      </React.Fragment>
    ));
  };

  return (
    <div 
      className="bg-white border border-dashed border-gray-400 p-2 shadow-sm flex flex-col justify-between text-xs relative overflow-hidden"
      style={{ width: '8cm', height: '5cm', boxSizing: 'border-box' }}
    >
      {/* Watermark */}
      {watermarkText && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span 
            className="text-gray-200 dark:text-gray-700 font-extrabold whitespace-nowrap font-handwriting"
            style={{
              fontSize: '40px', // Ukuran font besar agar memenuhi kupon
              opacity: 0.5, // Semi-transparan
              transform: 'rotate(-27deg)', // Rotasi 27 derajat (negatif agar miring dari kiri atas ke kanan bawah)
              lineHeight: '1.2',
              userSelect: 'none',
            }}
          >
            {generateWatermarkLines(watermarkText.toUpperCase(), 3)}
          </span>
        </div>
      )}

      <div className="text-center relative z-10">
        <h3 className="font-bold text-sm leading-tight">{eventName}</h3>
        <h3 className="font-bold text-sm leading-tight">{eventLocation}</h3>
        <h3 className="font-bold text-sm leading-tight mb-1">{eventDate}</h3>
        <p className="text-[10px] text-gray-600 mb-2">Kupon Undian Berhadiah</p>
      </div>
      
      {/* Bagian tengah: Nama dan ID Karyawan (dipusatkan) */}
      <div className="flex flex-col items-center justify-center flex-grow relative z-10">
        <p className="font-medium text-sm">Nama: {name}</p>
        <p className="text-[11px]">ID: {employeeId}</p>
      </div>

      {/* Bagian bawah: Nomor Kupon Karyawan */}
      <div className="flex justify-between items-end mt-1 relative z-10">
        <div className="text-[8px] text-gray-500">
          No Urut Kupon: #{employeeCouponSequence}
        </div>
        <div className="text-right">
          {/* Menampilkan nomor urut kupon karyawan sebagai nomor utama */}
          <p className="text-lg font-extrabold text-red-600">#{employeeCouponSequence}-{totalCouponsForEmployee}</p>
        </div>
      </div>
    </div>
  );
};

export default CouponTemplate;