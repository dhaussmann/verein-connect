import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { User, Mail, Phone, MapPin, Calendar, Shield, Lock } from 'lucide-react';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/use-api';
import { toast } from 'sonner';

export default function MyProfile() {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const [editing, setEditing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    try {
      await updateProfile.mutateAsync({
        phone: fd.get('phone') as string,
        mobile: fd.get('mobile') as string,
        street: fd.get('street') as string,
        zip: fd.get('zip') as string,
        city: fd.get('city') as string,
      });
      toast.success('Profil wurde aktualisiert!');
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Speichern');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const newPw = fd.get('new_password') as string;
    const confirmPw = fd.get('confirm_password') as string;
    if (newPw !== confirmPw) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        current_password: fd.get('current_password') as string,
        new_password: newPw,
      });
      toast.success('Passwort wurde geändert!');
      setPasswordOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Ändern des Passworts');
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Mein Profil" />
        <div className="text-center py-12 text-muted-foreground">Profil wird geladen...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <PageHeader title="Mein Profil" />
        <div className="text-center py-12 text-muted-foreground">Profil konnte nicht geladen werden.</div>
      </div>
    );
  }

  const roleLabel = (r: string) => {
    const map: Record<string, string> = { org_admin: 'Admin', trainer: 'Trainer', member: 'Mitglied' };
    return map[r] || r;
  };

  return (
    <div>
      <PageHeader title="Mein Profil">
        <div className="flex gap-2 mt-4">
          {!editing && <Button onClick={() => setEditing(true)}>Profil bearbeiten</Button>}
          <Button variant="outline" onClick={() => setPasswordOpen(true)}>
            <Lock className="h-4 w-4 mr-2" /> Passwort ändern
          </Button>
        </div>
      </PageHeader>

      {/* Profile Header */}
      <Card className="border border-border mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {profile.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{profile.firstName} {profile.lastName}</h2>
              <p className="text-muted-foreground">{profile.email}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{profile.memberNumber}</Badge>
                <Badge variant="outline" className={profile.status === 'Aktiv' ? 'bg-success/10 text-success border-success/30' : ''}>{profile.status}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {editing ? (
        <form onSubmit={handleSaveProfile}>
          <Card className="border border-border mb-6">
            <CardHeader><CardTitle>Kontaktdaten bearbeiten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Telefon</label><Input name="phone" defaultValue={profile.phone} /></div>
                <div><label className="text-sm font-medium">Mobil</label><Input name="mobile" defaultValue={profile.mobile} /></div>
              </div>
              <div><label className="text-sm font-medium">Straße</label><Input name="street" defaultValue={profile.street} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">PLZ</label><Input name="zip" defaultValue={profile.zip} /></div>
                <div><label className="text-sm font-medium">Stadt</label><Input name="city" defaultValue={profile.city} /></div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Speichern...' : 'Änderungen speichern'}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      ) : (
        <>
          {/* Personal Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="border border-border">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Persönliche Daten</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Vorname" value={profile.firstName} />
                <InfoRow label="Nachname" value={profile.lastName} />
                <InfoRow label="Geburtsdatum" value={profile.birthDate || '–'} />
                <InfoRow label="Geschlecht" value={profile.gender || '–'} />
                <InfoRow label="Mitglied seit" value={profile.joinDate || '–'} />
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" /> Kontaktdaten</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="E-Mail" value={profile.email} icon={<Mail className="h-3.5 w-3.5" />} />
                <InfoRow label="Telefon" value={profile.phone || '–'} />
                <InfoRow label="Mobil" value={profile.mobile || '–'} />
                <InfoRow label="Adresse" value={profile.street ? `${profile.street}, ${profile.zip} ${profile.city}` : '–'} icon={<MapPin className="h-3.5 w-3.5" />} />
              </CardContent>
            </Card>
          </div>

          {/* Roles */}
          <Card className="border border-border mb-6">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Rollen & Gruppen</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.roles.map(r => (
                  <Badge key={r.id} variant="outline" className={r.name === 'org_admin' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted'}>
                    {roleLabel(r.name)}
                    {r.description && <span className="ml-1 text-muted-foreground font-normal">– {r.description}</span>}
                  </Badge>
                ))}
                {profile.roles.length === 0 && <span className="text-muted-foreground text-sm">Keine Rollen zugewiesen</span>}
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          {Object.keys(profile.customFields).length > 0 && (
            <Card className="border border-border">
              <CardHeader><CardTitle className="text-base">Zusätzliche Felder</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(profile.customFields).map(([key, value]) => (
                  <InfoRow key={key} label={key} value={value || '–'} />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Password Change Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Passwort ändern</DialogTitle></DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div><label className="text-sm font-medium">Aktuelles Passwort</label><Input name="current_password" type="password" required /></div>
            <div><label className="text-sm font-medium">Neues Passwort</label><Input name="new_password" type="password" required minLength={8} placeholder="Mind. 8 Zeichen" /></div>
            <div><label className="text-sm font-medium">Neues Passwort bestätigen</label><Input name="confirm_password" type="password" required minLength={8} /></div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPasswordOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Ändern...' : 'Passwort ändern'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
