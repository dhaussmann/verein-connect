import { useEffect } from 'react';
import { useEffectEvent } from 'react';
import { useFetcher } from 'react-router';
import { notifications } from '@mantine/notifications';

type FetcherData = { success?: boolean; error?: string; intent?: string };

export function useFetcherNotify<T>(
  messages: Record<string, string>,
  options?: { onSuccess?: (data: FetcherData) => void },
) {
  const fetcher = useFetcher<T>();

  const handleResult = useEffectEvent((data: FetcherData) => {
    if (data.error) {
      notifications.show({ color: 'red', message: data.error });
      return;
    }
    if (data.success) {
      const msg = data.intent ? messages[data.intent] : undefined;
      if (msg) notifications.show({ color: 'green', message: msg });
      options?.onSuccess?.(data);
    }
  });

  useEffect(() => {
    if (!fetcher.data) return;
    handleResult(fetcher.data as FetcherData);
  }, [fetcher.data]);

  return fetcher;
}
