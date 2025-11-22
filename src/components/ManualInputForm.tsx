import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { showError } from '@/utils/toast';

interface ManualInputFormProps {
  onAddEmployee: (name: string, employeeId: string, masaKerja: number) => void;
}

const ManualInputForm: React.FC<ManualInputFormProps> = ({ onAddEmployee }) => {
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [masaKerja, setMasaKerja] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedMasaKerja = parseInt(masaKerja, 10);

    if (!name || !employeeId || isNaN(parsedMasaKerja) || parsedMasaKerja <= 0) {
      showError('Harap isi Nama, ID, dan Jumlah Kupon (harus angka positif).');
      return;
    }

    onAddEmployee(name.trim(), employeeId.trim(), parsedMasaKerja);
    
    // Reset form
    setName('');
    setEmployeeId('');
    setMasaKerja('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <h4 className="font-semibold text-lg">Input Karyawan Manual</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="manual-name">Nama</Label>
          <Input
            id="manual-name"
            placeholder="Nama"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="manual-id">ID</Label>
          <Input
            id="manual-id"
            placeholder="ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="manual-masa-kerja">Jumlah Kupon</Label>
          <Input
            id="manual-masa-kerja"
            type="number"
            placeholder="Jumlah Kupon"
            min="1"
            value={masaKerja}
            onChange={(e) => setMasaKerja(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" />
        Tambahkan Karyawan
      </Button>
    </form>
  );
};

export default ManualInputForm;