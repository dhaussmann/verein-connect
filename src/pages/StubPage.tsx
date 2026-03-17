import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface StubPageProps {
  title: string;
}

export default function StubPage({ title }: StubPageProps) {
  return (
    <div>
      <PageHeader title={title} />
      <Card className="bg-popover shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">In Entwicklung</h2>
          <p className="text-sm text-muted-foreground">Diese Seite wird gerade entwickelt.</p>
        </CardContent>
      </Card>
    </div>
  );
}
