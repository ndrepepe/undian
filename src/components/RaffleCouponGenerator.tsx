import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Loader2, Download, Search, FileText, FileSpreadsheet, PlusCircle, Trash2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CouponTemplate from './CouponTemplate';
import ManualInputForm from './ManualInputForm';

interface Coupon {
  name: string;
  employeeId: string;
  employeeCouponSequence: number; // Sequence number specific to the employee
}

interface EmployeeData {
  name: string;
  employeeId: string;
  masaKerja: number;
}

interface Employee {
  id: string;
  name: string;
  totalCoupons: number;
}

const RaffleCouponGenerator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [excelData, setExcelData] = useState<EmployeeData[]>([]);
  const [manualData, setManualData] = useState<EmployeeData[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsToRender, setCouponsToRender] = useState<Coupon[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  // State baru untuk detail acara
  const [eventName, setEventName] = useState('Gathering Keluarga Andi Offset');
  const [eventLocation, setEventLocation] = useState('Gembira Loka Zoo');
  const [eventDate, setEventDate] = useState('22 November 2025');

  const couponContainerRef = useRef<HTMLDivElement>(null);

  // Gabungkan data dari Excel dan Manual, lalu proses menjadi kupon
  useEffect(() => {
    const combinedData = [...excelData, ...manualData];
    const processedCoupons: Coupon[] = [];

    combinedData.forEach((data) => {
      for (let i = 0; i < data.masaKerja; i++) {
        processedCoupons.push({
          name: data.name,
          employeeId: data.employeeId,
          employeeCouponSequence: i + 1,
        });
      }
    });
    setCoupons(processedCoupons);
  }, [excelData, manualData]);


  // 1. Proses kupon menjadi daftar karyawan unik
  const employees: Employee[] = useMemo(() => {
    const employeeMap = new Map<string, { name: string; count: number }>();

    coupons.forEach(coupon => {
      const key = coupon.employeeId;
      if (employeeMap.has(key)) {
        employeeMap.get(key)!.count += 1;
      } else {
        employeeMap.set(key, { name: coupon.name, count: 1 });
      }
    });

    return Array.from(employeeMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      totalCoupons: data.count,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [coupons]);

  // Peta untuk mencari total kupon per karyawan dengan cepat
  const employeeTotalCouponsMap = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach(emp => map.set(emp.id, emp.totalCoupons));
    return map;
  }, [employees]);

  // 2. Filter karyawan berdasarkan pencarian
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    const lowerCaseSearch = searchTerm.toLowerCase();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(lowerCaseSearch) ||
      emp.id.toLowerCase().includes(lowerCaseSearch)
    );
  }, [employees, searchTerm]);

  // 3. Sinkronisasi: Pilih semua karyawan secara default setelah data berubah
  useEffect(() => {
    if (employees.length > 0) {
      setSelectedIds(new Set(employees.map(emp => emp.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [employees]);

  // 4. Handle pemilihan
  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        // Pilih semua yang difilter
        filteredEmployees.forEach(emp => newSet.add(emp.id));
      } else {
        // Hapus semua yang difilter
        filteredEmployees.forEach(emp => newSet.delete(emp.id));
      }
      return newSet;
    });
  };

  // Cek apakah semua karyawan yang difilter saat ini terpilih
  const totalFilteredCount = filteredEmployees.length;
  const isAllSelected = totalFilteredCount > 0 && filteredEmployees.every(emp => selectedIds.has(emp.id));
  
  // Cek apakah ada yang terpilih tetapi tidak semua yang difilter terpilih
  const selectedFilteredCount = filteredEmployees.filter(emp => selectedIds.has(emp.id)).length;
  const isIndeterminate = selectedFilteredCount > 0 && selectedFilteredCount < totalFilteredCount;


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setExcelData([]);
    setManualData([]); // Clear manual data when uploading new Excel
    setCouponsToRender([]);
    setSelectedIds(new Set());
    setSearchTerm('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsedData: EmployeeData[] = [];

        json.forEach((row) => {
          const nama = row['nama'] || row['Nama'];
          // Menerima berbagai variasi kolom ID
          const idKaryawan = row['id karywan'] || row['ID Karyawan'] || row['idkarywan'] || row['ID']; 
          // Menerima berbagai variasi kolom Masa Kerja/Jumlah Kupon
          const masaKerja = parseInt(row['masa kerja'] || row['Masa Kerja'] || row['masakerja'] || row['jumlah kupon'] || row['Jumlah Kupon'], 10);

          if (nama && idKaryawan && !isNaN(masaKerja) && masaKerja > 0) {
            parsedData.push({
              name: String(nama),
              employeeId: String(idKaryawan),
              masaKerja: masaKerja,
            });
          }
        });

        setExcelData(parsedData);
        showSuccess(`Berhasil memproses ${parsedData.length} karyawan dari Excel.`);
        
      } catch (error) {
        console.error(error);
        showError("Gagal memproses file. Pastikan format kolom adalah 'nama', 'ID', dan 'jumlah kupon' (atau 'masa kerja').");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddManualEmployee = (name: string, employeeId: string, masaKerja: number) => {
    // Cek duplikasi ID
    const combinedEmployees = [...excelData, ...manualData];
    const isDuplicate = combinedEmployees.some(emp => emp.employeeId === employeeId);
    
    if (isDuplicate) {
      showError(`ID ${employeeId} sudah ada. Harap gunakan ID unik.`);
      return;
    }

    setManualData(prev => [
      ...prev,
      { name, employeeId, masaKerja }
    ]);
    showSuccess(`Karyawan ${name} berhasil ditambahkan.`);
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      showError("Pilih setidaknya satu karyawan untuk dihapus.");
      return;
    }

    const idsToDelete = Array.from(selectedIds);
    
    // Filter Excel Data
    const newExcelData = excelData.filter(emp => !idsToDelete.includes(emp.employeeId));
    
    // Filter Manual Data
    const newManualData = manualData.filter(emp => !idsToDelete.includes(emp.employeeId));

    const deletedCount = (excelData.length - newExcelData.length) + (manualData.length - newManualData.length);

    if (deletedCount > 0) {
      setExcelData(newExcelData);
      setManualData(newManualData);
      setSelectedIds(new Set()); // Clear selection after deletion
      showSuccess(`${deletedCount} karyawan berhasil dihapus.`);
    } else {
      showError("Tidak ada karyawan yang cocok dengan pilihan untuk dihapus.");
    }
  }, [selectedIds, excelData, manualData]);


  const handleGeneratePDF = async () => {
    const selectedEmployeeIds = Array.from(selectedIds);

    if (selectedEmployeeIds.length === 0 || !couponContainerRef.current) {
      showError("Tidak ada karyawan yang dipilih untuk dibuatkan kupon.");
      return;
    }

    setIsLoading(true);

    // Filter kupon berdasarkan ID karyawan yang dipilih dan pastikan diurutkan berdasarkan ID
    const couponsToPrint = coupons.filter(coupon => 
        selectedEmployeeIds.includes(coupon.employeeId)
    ).sort((a, b) => a.employeeId.localeCompare(b.employeeId));

    if (couponsToPrint.length === 0) {
        showError("Kupon yang dipilih tidak ditemukan.");
        setIsLoading(false);
        return;
    }

    // 1. Set kupon yang akan di-render dan tunggu render selesai
    setCouponsToRender(couponsToPrint);
    
    // Tunggu React merender kupon yang difilter di container tersembunyi
    await new Promise(resolve => setTimeout(resolve, 100)); 

    // 2. Lanjutkan dengan logika pembuatan PDF
    
    // Ukuran A4 dalam mm: 210 x 297
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    
    // Ukuran kupon dalam cm: 8cm x 5cm (landscape)
    const COUPON_WIDTH_MM = 80; // 8 cm
    const COUPON_HEIGHT_MM = 50; // 5 cm

    // Margin (misalnya 10mm)
    const MARGIN_MM = 10;

    // Hitung berapa kupon yang muat per baris dan kolom di A4
    const couponsPerRow = Math.floor((A4_WIDTH_MM - 2 * MARGIN_MM) / COUPON_WIDTH_MM); // 2
    const couponsPerCol = Math.floor((A4_HEIGHT_MM - 2 * MARGIN_MM) / COUPON_HEIGHT_MM); // 5
    const couponsPerPage = couponsPerRow * couponsPerCol; // 10 kupon per halaman

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const couponElements = couponContainerRef.current?.children;
    if (!couponElements || couponElements.length !== couponsToPrint.length) {
        showError("Gagal menyiapkan elemen kupon untuk pencetakan.");
        setIsLoading(false);
        setCouponsToRender([]);
        return;
    }

    let pageCounter = 1;
    let previousEmployeeId: string | null = null;
    let currentCouponIndexOnPage = 0; // Tracks position on the current page (0 to couponsPerPage - 1)


    for (let i = 0; i < couponsToPrint.length; i++) {
      const couponEl = couponElements[i] as HTMLElement;
      const currentCoupon = couponsToPrint[i];
      
      let shouldAddPage = false;

      // 1. Check for employee change (force page break)
      if (previousEmployeeId !== null && currentCoupon.employeeId !== previousEmployeeId) {
        shouldAddPage = true;
      } 
      
      // 2. Check for page capacity limit (force page break)
      if (!shouldAddPage && currentCouponIndexOnPage >= couponsPerPage) {
        shouldAddPage = true;
      }

      if (shouldAddPage) {
        doc.addPage();
        pageCounter++;
        currentCouponIndexOnPage = 0; // Reset index for the new page
      }
      
      // Calculate position based on currentCouponIndexOnPage
      const row = Math.floor(currentCouponIndexOnPage / couponsPerRow); 
      const col = currentCouponIndexOnPage % couponsPerRow;

      // Posisi X dan Y dalam mm
      const x = MARGIN_MM + col * COUPON_WIDTH_MM;
      const y = MARGIN_MM + row * COUPON_HEIGHT_MM;

      // Render kupon ke canvas
      const canvas = await html2canvas(couponEl, {
        scale: 3, // Meningkatkan skala untuk kualitas yang lebih baik
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Tambahkan gambar kupon ke PDF
      doc.addImage(imgData, 'PNG', x, y, COUPON_WIDTH_MM, COUPON_HEIGHT_MM);
      
      // Update state for next iteration
      previousEmployeeId = currentCoupon.employeeId;
      currentCouponIndexOnPage++;
    }

    doc.save(`kupon_undian_${selectedEmployeeIds.length}_karyawan.pdf`);
    showSuccess(`Berhasil membuat PDF dengan ${pageCounter} halaman untuk ${couponsToPrint.length} kupon.`);
    
    // Clear temporary coupons and loading state
    setCouponsToRender([]);
    setIsLoading(false);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
        { 'nama': 'Contoh Nama Karyawan', 'ID': '12345', 'Jumlah Kupon': 5 },
        { 'nama': 'Nama Karyawan Lain', 'ID': '67890', 'Jumlah Kupon': 2 },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData, { 
        header: ['nama', 'ID', 'Jumlah Kupon'] 
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    
    XLSX.writeFile(workbook, "template_kupon_undian.xlsx");
    showSuccess("Template Excel berhasil diunduh.");
  };


  // Hitung total kupon yang dipilih
  const totalSelectedCoupons = useMemo(() => {
    return coupons.filter(coupon => selectedIds.has(coupon.employeeId)).length;
  }, [coupons, selectedIds]);


  return (
    <>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Alat Pembuat Kupon Undian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Input Detail Acara */}
          <div className="space-y-4 p-4 border rounded-lg bg-secondary/50">
            <h3 className="font-bold text-lg">Detail Acara</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="event-name">Nama Acara</Label>
                <Input
                  id="event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Contoh: Gathering Keluarga Andi Offset"
                />
              </div>
              <div>
                <Label htmlFor="event-location">Tempat Acara</Label>
                <Input
                  id="event-location"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Contoh: Gembira Loka Zoo"
                />
              </div>
              <div>
                <Label htmlFor="event-date">Tanggal Acara</Label>
                <Input
                  id="event-date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="Contoh: 22 November 2025"
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="excel" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="excel">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Unggah Excel
              </TabsTrigger>
              <TabsTrigger value="manual">
                <PlusCircle className="mr-2 h-4 w-4" /> Input Manual
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="excel" className="mt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        Unggah file Excel (.xlsx) yang berisi kolom: 
                        <code className="font-mono text-primary">nama</code>, 
                        <code className="font-mono text-primary">ID</code>, dan 
                        <code className="font-mono text-primary">Jumlah Kupon</code>.
                    </p>
                    <Button 
                        variant="outline" 
                        onClick={handleDownloadTemplate} 
                        className="shrink-0 w-full sm:w-auto"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Unduh Template
                    </Button>
                </div>
                <Input 
                    id="excel-upload"
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileUpload} 
                    disabled={isLoading}
                    className="flex-1"
                />
            </TabsContent>
            
            <TabsContent value="manual" className="mt-4">
                <ManualInputForm onAddEmployee={handleAddManualEmployee} />
            </TabsContent>
          </Tabs>
          
          <Button 
            onClick={handleGeneratePDF} 
            disabled={isLoading || selectedIds.size === 0}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Cetak {selectedIds.size} Karyawan ({totalSelectedCoupons} Kupon)
          </Button>

          {/* Bagian Pemilihan Karyawan (Inline) */}
          {employees.length > 0 && (
            <div className="space-y-4 p-4 border rounded-lg bg-card">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">Pilih Karyawan ({employees.length} Total)</h3>
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleDeleteSelected}
                        disabled={selectedIds.size === 0}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus ({selectedIds.size})
                    </Button>
                </div>
                
                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Cari nama atau ID karyawan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    />
                </div>

                {/* Selection Header */}
                <div className="flex items-center space-x-2 p-2 border-b">
                    <Checkbox
                    id="select-all"
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={employees.length === 0}
                    aria-label="Pilih semua"
                    // Tambahkan properti indeterminate jika ada yang terpilih tetapi tidak semua
                    {...(isIndeterminate && { checked: 'indeterminate' })}
                    />
                    <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                    >
                    Pilih Semua ({selectedIds.size} Karyawan Terpilih)
                    </label>
                    <span className="text-sm w-20 text-right font-medium">Kupon</span>
                </div>

                {/* Employee List */}
                <ScrollArea className="h-[300px] w-full rounded-md border">
                    <div className="p-2">
                    {filteredEmployees.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Tidak ada karyawan yang cocok dengan pencarian.</p>
                    ) : (
                        filteredEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-2 py-2 border-b last:border-b-0">
                            <Checkbox
                            id={`employee-${employee.id}`}
                            checked={selectedIds.has(employee.id)}
                            onCheckedChange={(checked) => handleSelect(employee.id, !!checked)}
                            />
                            <label
                            htmlFor={`employee-${employee.id}`}
                            className="text-sm leading-none flex-1"
                            >
                            {employee.name} ({employee.id})
                            </label>
                            <span className="text-sm w-20 text-right font-mono text-primary">{employee.totalCoupons}</span>
                        </div>
                        ))
                    )}
                    </div>
                </ScrollArea>
            </div>
          )}


          {coupons.length > 0 && (
              <div className="mt-4 p-4 border rounded-lg bg-secondary/50">
                  <h4 className="font-semibold mb-2">Pratinjau Kupon Pertama:</h4>
                  <div className="scale-75 origin-top-left">
                      <CouponTemplate 
                          name={coupons[0].name} 
                          employeeId={coupons[0].employeeId} 
                          employeeCouponSequence={coupons[0].employeeCouponSequence}
                          totalCouponsForEmployee={employeeTotalCouponsMap.get(coupons[0].employeeId) || 0}
                          eventName={eventName}
                          eventLocation={eventLocation}
                          eventDate={eventDate}
                      />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Total {coupons.length} kupon dari {employees.length} karyawan telah diproses.</p>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Area tersembunyi untuk rendering kupon sebelum diubah ke canvas */}
      <div 
        ref={couponContainerRef} 
        className="absolute -left-[9999px] top-0"
      >
        {/* Hanya render kupon yang dipilih untuk dicetak */}
        {couponsToRender.map((coupon, index) => (
          <CouponTemplate 
            key={index} 
            name={coupon.name} 
            employeeId={coupon.employeeId} 
            employeeCouponSequence={coupon.employeeCouponSequence}
            totalCouponsForEmployee={employeeTotalCouponsMap.get(coupon.employeeId) || 0}
            eventName={eventName}
            eventLocation={eventLocation}
            eventDate={eventDate}
          />
        ))}
      </div>
    </>
  );
};

export default RaffleCouponGenerator;