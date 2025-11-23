import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Dice5, Trophy, XCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Prize {
  id: string;
  name: string;
  quantity: number;
  remaining: number;
}

interface Employee {
  id: string;
  name: string;
  totalCoupons: number;
}

interface WinnerRecord {
  prizeId: string;
  prizeName: string;
  employeeId: string;
  employeeName: string;
  timestamp: number;
}

interface RaffleDrawSimulatorProps {
  employees: Employee[];
  prizes: Prize[];
  setPrizes: React.Dispatch<React.SetStateAction<Prize[]>>;
  winningEmployeeIds: Set<string>;
  setWinningEmployeeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  PRIZE_LIST_KEY: string;
  WINNING_EMPLOYEES_KEY: string;
}

const RaffleDrawSimulator: React.FC<RaffleDrawSimulatorProps> = ({
  employees,
  prizes,
  setPrizes,
  winningEmployeeIds,
  setWinningEmployeeIds,
  PRIZE_LIST_KEY,
  WINNING_EMPLOYEES_KEY,
}) => {
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<Employee | null>(null);
  const [winnerRecords, setWinnerRecords] = useState<WinnerRecord[]>([]);

  // Map for quick employee lookup
  const employeeMap = useMemo(() => {
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  // Available prizes (remaining > 0)
  const availablePrizes = useMemo(() => {
    return prizes.filter(p => p.remaining > 0);
  }, [prizes]);

  // Pool of eligible employee IDs (those who haven't won yet)
  const eligibleEmployeeIds = useMemo(() => {
    return employees.filter(e => !winningEmployeeIds.has(e.id)).map(e => e.id);
  }, [employees, winningEmployeeIds]);

  // Load winner records from localStorage on mount
  useEffect(() => {
    try {
      const savedWinners = localStorage.getItem(WINNING_EMPLOYEES_KEY);
      if (savedWinners) {
        const records: WinnerRecord[] = JSON.parse(savedWinners);
        setWinnerRecords(records);
        
        // Rebuild winningEmployeeIds set from records
        const winningIds = new Set(records.map(r => r.employeeId));
        setWinningEmployeeIds(winningIds);
      }
    } catch (error) {
      console.error("Gagal memuat daftar pemenang:", error);
    }
  }, [setWinningEmployeeIds, WINNING_EMPLOYEES_KEY]);

  const saveWinnersToLocalStorage = useCallback((updatedRecords: WinnerRecord[]) => {
    try {
      localStorage.setItem(WINNING_EMPLOYEES_KEY, JSON.stringify(updatedRecords));
    } catch (error) {
      showError("Gagal menyimpan data pemenang.");
      console.error("Gagal menyimpan data pemenang:", error);
    }
  }, [WINNING_EMPLOYEES_KEY]);

  const savePrizesToLocalStorage = useCallback((updatedPrizes: Prize[]) => {
    try {
      localStorage.setItem(PRIZE_LIST_KEY, JSON.stringify(updatedPrizes));
    } catch (error) {
      showError("Gagal menyimpan daftar hadiah.");
      console.error("Gagal menyimpan daftar hadiah:", error);
    }
  }, [PRIZE_LIST_KEY]);


  const handleDraw = () => {
    if (!selectedPrizeId) {
      showError("Harap pilih hadiah yang akan diundi.");
      return;
    }
    if (eligibleEmployeeIds.length === 0) {
      showError("Semua karyawan sudah memenangkan hadiah atau tidak ada data karyawan yang tersedia.");
      return;
    }

    setIsDrawing(true);
    setWinner(null);

    // Simulate drawing delay
    setTimeout(() => {
      // 1. Select a random eligible employee ID
      const randomIndex = Math.floor(Math.random() * eligibleEmployeeIds.length);
      const winningId = eligibleEmployeeIds[randomIndex];
      const winningEmployee = employeeMap.get(winningId);

      if (!winningEmployee) {
        showError("Gagal menemukan data karyawan pemenang.");
        setIsDrawing(false);
        return;
      }

      setWinner(winningEmployee);
      setIsDrawing(false);
      showSuccess(`Pemenang ditemukan: ${winningEmployee.name}!`);

    }, 1500);
  };

  const handleRecordWinner = () => {
    if (!winner || !selectedPrizeId) {
      showError("Tidak ada pemenang atau hadiah yang dipilih untuk direkam.");
      return;
    }

    const currentPrize = prizes.find(p => p.id === selectedPrizeId);
    if (!currentPrize || currentPrize.remaining <= 0) {
      showError("Hadiah ini sudah habis atau tidak valid.");
      return;
    }

    // 1. Update Prize remaining count
    const updatedPrizes = prizes.map(p => 
      p.id === selectedPrizeId ? { ...p, remaining: p.remaining - 1 } : p
    );
    setPrizes(updatedPrizes);
    savePrizesToLocalStorage(updatedPrizes);

    // 2. Record Winner
    const newRecord: WinnerRecord = {
      prizeId: selectedPrizeId,
      prizeName: currentPrize.name,
      employeeId: winner.id,
      employeeName: winner.name,
      timestamp: Date.now(),
    };

    const updatedRecords = [newRecord, ...winnerRecords];
    setWinnerRecords(updatedRecords);
    saveWinnersToLocalStorage(updatedRecords);

    // 3. Update winning employee set
    setWinningEmployeeIds(prev => new Set(prev).add(winner.id));

    showSuccess(`Pemenang ${winner.name} berhasil dicatat untuk hadiah ${currentPrize.name}.`);
    
    // Reset state for next draw
    setWinner(null);
    setSelectedPrizeId('');
  };
  
  const handleRemoveWinner = (recordTimestamp: number, employeeId: string, prizeId: string) => {
    const recordToRemove = winnerRecords.find(r => r.timestamp === recordTimestamp);
    if (!recordToRemove) return;

    // 1. Update Prize remaining count
    const updatedPrizes = prizes.map(p => 
      p.id === prizeId ? { ...p, remaining: p.remaining + 1 } : p
    );
    setPrizes(updatedPrizes);
    savePrizesToLocalStorage(updatedPrizes);

    // 2. Remove Winner Record
    const updatedRecords = winnerRecords.filter(r => r.timestamp !== recordTimestamp);
    setWinnerRecords(updatedRecords);
    saveWinnersToLocalStorage(updatedRecords);

    // 3. Check if the employee has won any other prize
    const stillWinning = updatedRecords.some(r => r.employeeId === employeeId);
    if (!stillWinning) {
      setWinningEmployeeIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeId);
        return newSet;
      });
    }
    
    showSuccess(`Pencatatan pemenang ${recordToRemove.employeeName} untuk hadiah ${recordToRemove.prizeName} berhasil dihapus.`);
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Dice5 className="mr-2 h-5 w-5" /> Simulasi Pengundian
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Draw Controls */}
        <div className="space-y-4 p-4 border rounded-lg bg-background">
          <h4 className="font-semibold text-md">Undi Pemenang</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <Label htmlFor="prize-select">Pilih Hadiah</Label>
              <Select value={selectedPrizeId} onValueChange={setSelectedPrizeId} disabled={isDrawing || availablePrizes.length === 0}>
                <SelectTrigger id="prize-select">
                  <SelectValue placeholder={availablePrizes.length > 0 ? "Pilih Hadiah..." : "Tidak ada hadiah tersedia"} />
                </SelectTrigger>
                <SelectContent>
                  {availablePrizes.map(prize => (
                    <SelectItem key={prize.id} value={prize.id}>
                      {prize.name} ({prize.remaining} tersisa)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleDraw} 
              disabled={isDrawing || !selectedPrizeId || eligibleEmployeeIds.length === 0}
              className="w-full"
            >
              {isDrawing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Dice5 className="mr-2 h-4 w-4" />
              )}
              Undi Sekarang
            </Button>
          </div>
          {eligibleEmployeeIds.length === 0 && employees.length > 0 && (
              <p className="text-sm text-destructive">Semua karyawan yang terdaftar sudah memenangkan hadiah.</p>
          )}
        </div>

        {/* Winner Display and Record */}
        {winner && (
          <div className="p-4 border border-green-500 rounded-lg bg-green-50 dark:bg-green-900/20 space-y-3">
            <h4 className="font-bold text-lg text-green-600 dark:text-green-400">Pemenang Ditemukan!</h4>
            <p className="text-xl font-extrabold">{winner.name}</p>
            <p className="text-sm text-muted-foreground">ID Karyawan: {winner.id}</p>
            <p className="text-sm text-muted-foreground">Hadiah: {prizes.find(p => p.id === selectedPrizeId)?.name || 'Tidak Diketahui'}</p>
            
            <Button onClick={handleRecordWinner} className="w-full bg-green-600 hover:bg-green-700">
              <Trophy className="mr-2 h-4 w-4" />
              Rekam Pemenang
            </Button>
          </div>
        )}

        <Separator />

        {/* Winner History */}
        <h4 className="font-semibold text-md flex items-center">
            <Trophy className="mr-2 h-4 w-4" /> Daftar Pemenang ({winnerRecords.length})
        </h4>
        {winnerRecords.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Belum ada pemenang yang dicatat.</p>
        ) : (
          <ScrollArea className="h-[200px] w-full rounded-md border">
            <div className="p-2">
              {winnerRecords.map((record) => (
                <div key={record.timestamp} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium">{record.employeeName} ({record.employeeId})</p>
                    <p className="text-sm text-muted-foreground">Hadiah: {record.prizeName}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveWinner(record.timestamp, record.employeeId, record.prizeId)}
                    className="ml-4 h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RaffleDrawSimulator;