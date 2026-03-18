import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { availableRoles, availableGroups, customFieldDefinitions } from '@/data/mockData';
import { useCreateMember } from '@/hooks/use-api';
import { Calendar as CalIcon, Upload } from 'lucide-react';

export default function MemberNew() {
  const navigate = useNavigate();
  const [dsgvo, setDsgvo] = useState(false);
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const createMember = useCreateMember();

  const updateDynamic = (key: string, value: string) =>
    setDynamicFields((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    try {
      await createMember.mutateAsync({
        firstName: fd.get('firstName') as string,
        lastName: fd.get('lastName') as string,
        email: fd.get('email') as string,
        phone: fd.get('phone') as string || '',
        mobile: fd.get('mobile') as string || '',
        birthDate: fd.get('birthDate') as string || '',
        gender: fd.get('gender') as string || '',
        street: fd.get('street') as string || '',
        zip: fd.get('zip') as string || '',
        city: fd.get('city') as string || '',
        status: (fd.get('status') as string || 'active') as 'Aktiv',
        customFields: dynamicFields,
      });
      navigate('/members');
    } catch (err: any) {
      setFormError(err.message || 'Fehler beim Erstellen');
    }
  };

  return (
    <div>
      <PageHeader title="Neues Mitglied" />

      <form onSubmit={handleSubmit}>
        <Card className="bg-popover shadow-sm">
          <CardContent className="p-6 space-y-6">
            {/* Section 1: Personal data */}
            <div>
              <h2 className="text-base font-semibold mb-4">Persönliche Daten</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vorname *</Label>
                  <Input name="firstName" placeholder="Vorname" required />
                </div>
                <div className="space-y-2">
                  <Label>Nachname *</Label>
                  <Input name="lastName" placeholder="Nachname" required />
                </div>
                <div className="space-y-2">
                  <Label>Geburtsdatum</Label>
                  <div className="relative">
                    <Input name="birthDate" placeholder="TT.MM.JJJJ" />
                    <CalIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Geschlecht</Label>
                  <Select name="gender">
                    <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="männlich">Männlich</SelectItem>
                      <SelectItem value="weiblich">Weiblich</SelectItem>
                      <SelectItem value="divers">Divers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Foto</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Foto hierher ziehen oder klicken zum Hochladen</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG (max. 5 MB)</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Contact */}
            <div>
              <h2 className="text-base font-semibold mb-4">Kontaktdaten</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-Mail *</Label>
                  <Input name="email" type="email" placeholder="name@example.de" required />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input name="phone" placeholder="z.B. 089 123456" />
                </div>
                <div className="space-y-2">
                  <Label>Mobiltelefon</Label>
                  <Input name="mobile" placeholder="z.B. 0171 1234567" />
                </div>
                <div className="space-y-2" />
                <div className="space-y-2 md:col-span-2">
                  <Label>Straße</Label>
                  <Input name="street" placeholder="Straße und Hausnummer" />
                </div>
                <div className="space-y-2">
                  <Label>PLZ</Label>
                  <Input name="zip" placeholder="z.B. 80331" />
                </div>
                <div className="space-y-2">
                  <Label>Ort</Label>
                  <Input name="city" placeholder="z.B. München" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Club data */}
            <div>
              <h2 className="text-base font-semibold mb-4">Vereinsdaten</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Beitrittsdatum</Label>
                  <div className="relative">
                    <Input placeholder="TT.MM.JJJJ" defaultValue="17.03.2026" />
                    <CalIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select defaultValue="Aktiv">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktiv">Aktiv</SelectItem>
                      <SelectItem value="Inaktiv">Inaktiv</SelectItem>
                      <SelectItem value="Ausstehend">Ausstehend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rollen</Label>
                  <Select defaultValue="Mitglied">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mannschaft / Gruppe</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
                    <SelectContent>
                      {availableGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 4: Dynamic fields */}
            <div>
              <h2 className="text-base font-semibold mb-4">Zusatzfelder</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFieldDefinitions.map((cf) => (
                  <div key={cf.key} className="space-y-2">
                    <Label>{cf.label}</Label>
                    {cf.type === 'text' && (
                      <Input value={dynamicFields[cf.key] || ''} onChange={(e) => updateDynamic(cf.key, e.target.value)} />
                    )}
                    {cf.type === 'select' && (
                      <Select value={dynamicFields[cf.key] || ''} onValueChange={(v) => updateDynamic(cf.key, v)}>
                        <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
                        <SelectContent>
                          {cf.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {cf.type === 'checkbox' && (
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox checked={dynamicFields[cf.key] === 'true'} onCheckedChange={(c) => updateDynamic(cf.key, c ? 'true' : 'false')} />
                        <span className="text-sm">{cf.label}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Section 5: DSGVO */}
            <div className="flex items-start gap-2">
              <Checkbox id="dsgvo" checked={dsgvo} onCheckedChange={(c) => setDsgvo(!!c)} required />
              <label htmlFor="dsgvo" className="text-sm leading-tight">
                Die <span className="text-primary-light hover:underline cursor-pointer">Datenschutzerklärung</span> wurde akzeptiert. *
              </label>
            </div>

            {/* Footer */}
            {formError && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{formError}</div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/members')}>Abbrechen</Button>
              <Button type="submit" disabled={!dsgvo || createMember.isPending}>
                {createMember.isPending ? 'Wird angelegt...' : 'Mitglied anlegen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
