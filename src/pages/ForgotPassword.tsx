import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm bg-popover">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-2">
            <span className="text-primary-foreground font-bold text-lg">CB</span>
          </div>
          <h1 className="text-xl font-semibold">{sent ? 'E-Mail gesendet' : 'Passwort zurücksetzen'}</h1>
          <p className="text-sm text-muted-foreground">
            {sent ? 'Prüfe dein Postfach für weitere Anweisungen.' : 'Gib deine E-Mail-Adresse ein.'}
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Zurück zum Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" placeholder="name@verein.de" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Link senden</Button>
              <Link to="/login" className="block text-center text-sm text-primary-light hover:underline">
                <ArrowLeft className="h-3 w-3 inline mr-1" />Zurück zum Login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
