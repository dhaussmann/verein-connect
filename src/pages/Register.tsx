import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react';

const steps = ['Verein', 'Admin-Account', 'Bestätigung'];

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    clubName: '', clubType: '', website: '',
    firstName: '', lastName: '', email: '', password: '', passwordConfirm: '',
    dsgvo: false,
  });

  const update = (field: string, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    try {
      await register({
        clubName: form.clubName, clubType: form.clubType,
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, password: form.password,
      });
      navigate('/dashboard');
    } catch {
      // error is set in the store
    }
  };

  const pwStrength = form.password.length >= 8 ? (form.password.length >= 12 ? 'Stark' : 'Mittel') : 'Schwach';
  const pwColor = pwStrength === 'Stark' ? 'bg-success' : pwStrength === 'Mittel' ? 'bg-warning' : 'bg-destructive';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-sm bg-popover">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-2">
            <span className="text-primary-foreground font-bold text-lg">CB</span>
          </div>
          <h1 className="text-xl font-semibold">Verein registrieren</h1>
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i < step ? 'bg-success text-success-foreground' : i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-success' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vereinsname *</Label>
                <Input placeholder="z.B. TSV Musterstadt" value={form.clubName} onChange={(e) => update('clubName', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Vereinstyp *</Label>
                <Select value={form.clubType} onValueChange={(v) => update('clubType', v)}>
                  <SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sport">Sportverein</SelectItem>
                    <SelectItem value="kultur">Kulturverein</SelectItem>
                    <SelectItem value="sonstig">Sonstiger Verein</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Website (optional)</Label>
                <Input placeholder="https://www.verein.de" value={form.website} onChange={(e) => update('website', e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => setStep(1)} disabled={!form.clubName || !form.clubType}>Weiter</Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vorname *</Label>
                  <Input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nachname *</Label>
                  <Input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-Mail *</Label>
                <Input type="email" placeholder="name@verein.de" value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Passwort *</Label>
                <Input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} />
                {form.password && (
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 flex-1 rounded-full ${pwColor}`} />
                    <span className="text-xs text-muted-foreground">{pwStrength}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Passwort bestätigen *</Label>
                <Input type="password" value={form.passwordConfirm} onChange={(e) => update('passwordConfirm', e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Zurück</Button>
                <Button className="flex-1" onClick={() => setStep(2)} disabled={!form.firstName || !form.lastName || !form.email || !form.password || form.password !== form.passwordConfirm}>Weiter</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Verein:</span> {form.clubName}</p>
                <p><span className="text-muted-foreground">Typ:</span> {form.clubType === 'sport' ? 'Sportverein' : form.clubType === 'kultur' ? 'Kulturverein' : 'Sonstiger'}</p>
                <p><span className="text-muted-foreground">Admin:</span> {form.firstName} {form.lastName}</p>
                <p><span className="text-muted-foreground">E-Mail:</span> {form.email}</p>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="dsgvo" checked={form.dsgvo} onCheckedChange={(c) => update('dsgvo', !!c)} />
                <label htmlFor="dsgvo" className="text-sm leading-tight">
                  Ich akzeptiere die <span className="text-primary-light hover:underline cursor-pointer">Datenschutzerklärung</span> und die <span className="text-primary-light hover:underline cursor-pointer">Nutzungsbedingungen</span>.
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Zurück</Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={!form.dsgvo || isLoading}>
                  {isLoading ? 'Wird erstellt...' : 'Verein erstellen'}
                </Button>
                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 w-full">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-sm text-center mt-4 text-muted-foreground">
            Bereits registriert? <Link to="/login" className="text-primary-light hover:underline font-medium">Anmelden</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
