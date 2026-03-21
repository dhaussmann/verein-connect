import { useState } from 'react';
import { Badge, Button, Card, Checkbox, Divider, Group, Stack, Text, TextInput } from '@mantine/core';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useFetcherNotify } from '@/hooks/use-fetcher-notify';

type BankAccount = {
  accountHolder?: string | null;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
  sepaMandate?: boolean | null;
  sepaMandateDate?: string | null;
  sepaMandateRef?: string | null;
};

type Props = {
  bankAccount: BankAccount | null;
  member: { firstName: string; lastName: string };
};

export function BankAccountSection({ bankAccount, member }: Props) {
  const [editing, setEditing] = useState(false);
  const [sepaMandate, setSepaMandate] = useState(false);

  const startEditing = () => {
    setSepaMandate(bankAccount?.sepaMandate ?? false);
    setEditing(true);
  };

  const fetcher = useFetcherNotify(
    {
      'upsert-bank-account': 'Kontoverbindung gespeichert',
      'delete-bank-account': 'Kontoverbindung gelöscht',
    },
    { onSuccess: () => setEditing(false) },
  );

  return (
    <Card shadow="sm">
      <Card.Section p="md">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <Building2 size={16} />
            <Text fw={600} size="sm">Kontoverbindung</Text>
          </Group>
          {bankAccount && !editing && (
            <Group gap="xs">
              <Button size="xs" variant="outline" leftSection={<Pencil size={14} />} onClick={startEditing}>
                Bearbeiten
              </Button>
              <Button
                size="xs"
                color="red"
                leftSection={<Trash2 size={14} />}
                onClick={() => {
                  if (confirm('Kontoverbindung wirklich löschen?')) {
                    fetcher.submit({ intent: 'delete-bank-account' }, { method: 'post' });
                  }
                }}
              >
                Löschen
              </Button>
            </Group>
          )}
        </Group>

        {!bankAccount && !editing ? (
          <Stack align="center" py="xl">
            <Text size="sm" c="dimmed">Keine Kontoverbindung hinterlegt.</Text>
            <Button variant="outline" leftSection={<Plus size={14} />} onClick={startEditing}>
              Kontoverbindung anlegen
            </Button>
          </Stack>
        ) : editing ? (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="upsert-bank-account" />
            <input type="hidden" name="sepaMandate" value={sepaMandate ? 'on' : ''} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                name="accountHolder"
                label="Kontoinhaber *"
                defaultValue={bankAccount?.accountHolder ?? `${member.firstName} ${member.lastName}`}
              />
              <TextInput
                name="iban"
                label="IBAN *"
                defaultValue={bankAccount?.iban ?? ''}
                placeholder="DE89 3704 0044 0532 0130 00"
              />
              <TextInput name="bic" label="BIC" defaultValue={bankAccount?.bic ?? ''} />
              <TextInput name="bankName" label="Bank" defaultValue={bankAccount?.bankName ?? ''} />
              <div className="md:col-span-2">
                <Divider my="sm" />
                <Text size="sm" fw={500} mb="sm">SEPA-Lastschriftmandat</Text>
                <Checkbox
                  checked={sepaMandate}
                  onChange={(e) => setSepaMandate(e.currentTarget.checked)}
                  label="SEPA-Lastschriftmandat erteilt"
                  mb="sm"
                />
                {sepaMandate && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                      name="sepaMandateDate"
                      label="Mandatsdatum"
                      type="date"
                      defaultValue={bankAccount?.sepaMandateDate ?? ''}
                    />
                    <TextInput
                      name="sepaMandateRef"
                      label="Mandatsreferenz"
                      defaultValue={bankAccount?.sepaMandateRef ?? ''}
                      placeholder="z.B. SEPA-001-2026"
                    />
                  </div>
                )}
              </div>
              <div className="md:col-span-2 flex gap-2 pt-2">
                <Button type="submit" loading={fetcher.state !== 'idle'}>Speichern</Button>
                <Button variant="outline" type="button" onClick={() => setEditing(false)}>Abbrechen</Button>
              </div>
            </div>
          </fetcher.Form>
        ) : bankAccount ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Text size="xs" c="dimmed">Kontoinhaber</Text><Text size="sm" fw={500}>{bankAccount.accountHolder}</Text></div>
            <div><Text size="xs" c="dimmed">IBAN</Text><Text size="sm" fw={500} ff="monospace">{bankAccount.iban}</Text></div>
            <div><Text size="xs" c="dimmed">BIC</Text><Text size="sm" fw={500}>{bankAccount.bic || '–'}</Text></div>
            <div><Text size="xs" c="dimmed">Bank</Text><Text size="sm" fw={500}>{bankAccount.bankName || '–'}</Text></div>
            <div className="md:col-span-2">
              <Divider my="sm" />
              <Text size="xs" c="dimmed" mb="xs">SEPA-Lastschriftmandat</Text>
              {bankAccount.sepaMandate ? (
                <Group gap="sm">
                  <Badge variant="outline" color="green">Erteilt</Badge>
                  {bankAccount.sepaMandateDate && <Text size="sm" c="dimmed">Datum: {bankAccount.sepaMandateDate}</Text>}
                  {bankAccount.sepaMandateRef && <Text size="sm" c="dimmed">Ref: {bankAccount.sepaMandateRef}</Text>}
                </Group>
              ) : (
                <Badge variant="outline" color="gray">Nicht erteilt</Badge>
              )}
            </div>
          </div>
        ) : null}
      </Card.Section>
    </Card>
  );
}
