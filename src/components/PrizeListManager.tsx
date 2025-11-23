import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Gift } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Prize {
  id: string;
  name: string;
  quantity: number;
  remaining: number;
}

interface PrizeListManagerProps {
  prizes: Prize[];
  setPrizes: React.Dispatch<React.SetStateAction<Prize[]>>;
  PRIZE_LIST_KEY: string;
}

const PrizeListManager: React.FC<PrizeListManagerProps> = ({ prizes, setPrizes, PRIZE_LIST_KEY }) => {
  const [prizeName, setPrizeName] = useState('');
  const [prizeQuantity, setPrizeQuantity] = useState('');

  useEffect(() => {
    // Load prizes from localStorage on mount
    try {
      const savedPrizes = localStorage.getItem(PRIZE_LIST_KEY);
      if (savedPrizes) {
        setPrizes(JSON.parse(savedPrizes));
      }
    } catch (error) {
      console.error("Gagal memuat daftar hadiah:", error);
    }
  }, [setPrizes, PRIZE_LIST_KEY]);

  const savePrizesToLocalStorage = (updatedPrizes: Prize[]) => {
    try {
      localStorage.setItem(PRIZE_LIST_KEY, JSON.stringify(updatedPrizes));
      // Note: Success toast is handled by the caller (handleAddPrize/handleDeletePrize)
    } catch (error) {
      showError("Gagal menyimpan daftar hadiah.");
      console.error("Gagal menyimpan daftar hadiah ke localStorage:", error);
    }
  };

  const handleAddPrize = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(prizeQuantity, 10);

    if (!prizeName.trim() || isNaN(quantity) || quantity <= 0) {
      showError('Harap isi Nama Hadiah dan Jumlah (harus angka positif).');
      return;
    }

    const newPrize: Prize = {
      id: Date.now().toString(), // Simple unique ID
      name: prizeName.trim(),
      quantity: quantity,
      remaining: quantity,
    };

    const updatedPrizes = [...prizes, newPrize];
    setPrizes(updatedPrizes);
    savePrizesToLocalStorage(updatedPrizes);
    showSuccess(`Hadiah '${newPrize.name}' berhasil ditambahkan.`);
    
    // Reset form
    setPrizeName('');
    setPrizeQuantity('');
  };

  const handleDeletePrize = (id: string) => {
    const updatedPrizes = prizes.filter(p => p.id !== id);
    setPrizes(updatedPrizes);
    savePrizesToLocalStorage(updatedPrizes);
    showSuccess("Hadiah berhasil dihapus.");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Gift className="mr-2 h-5 w-5" /> Manajemen Hadiah
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddPrize} className="space-y-3 p-3 border rounded-lg bg-background">
          <h4 className="font-semibold text-md">Tambah Hadiah Baru</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="prize-name">Nama Hadiah</Label>
              <Input
                id="prize-name"
                placeholder="Contoh: Sepeda Motor"
                value={prizeName}
                onChange={(e) => setPrizeName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="prize-quantity">Jumlah</Label>
              <Input
                id="prize-quantity"
                type="number"
                placeholder="1"
                min="1"
                value={prizeQuantity}
                onChange={(e) => setPrizeQuantity(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambahkan Hadiah
          </Button>
        </form>

        <Separator />

        <h4 className="font-semibold text-md">Daftar Hadiah ({prizes.length})</h4>
        {prizes.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Belum ada hadiah yang ditambahkan.</p>
        ) : (
          <ScrollArea className="h-[200px] w-full rounded-md border">
            <div className="p-2">
              {prizes.map((prize) => (
                <div key={prize.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium">{prize.name}</p>
                    <p className="text-sm text-muted-foreground">Sisa: {prize.remaining} / Total: {prize.quantity}</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    onClick={() => handleDeletePrize(prize.id)}
                    className="ml-4 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
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

export default PrizeListManager;