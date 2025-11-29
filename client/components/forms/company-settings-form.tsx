'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import axios from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

type CompanySettings = {
  id: number;
  companyName: string;
  companyDescription: string;
  createdAt: string;
  updatedAt: string;
};

export function CompanySettingsForm({ token }: { token: string }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('/api/CompanySettings', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then(res => {
      setSettings(res.data);
      setName(res.data.companyName);
      setDescription(res.data.companyDescription);
    })
    .catch(() => setMessage('Nie udało się pobrać ustawień firmy'))
    .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put('/api/CompanySettings', {
        companyName: name,
        companyDescription: description,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage(response.data.message);
      setSettings(response.data.data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Błąd podczas zapisu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Ładowanie ustawień firmy...</p>;

  return (
    <div className="mt-8 max-w-xl mx-auto space-y-4 w-full">

      <div>
        <Label className='mb-2'>Nazwa firmy</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div>
        <Label className='mb-2'>Opis firmy</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <Button onClick={handleSave} disabled={saving} className='m-auto w-full'>
        {saving ? 'Zapisuję...' : 'Zapisz'}
      </Button>

      {message && <p className="text-sm mt-2">{message}</p>}
    </div>
  );
}