"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { FinanceData, Transaction } from "@/types/finance";
import {
  FinanceConflictError,
  remoteRepository,
} from "@/data/remote/repository";
import { localDate } from "@/lib/dates";
import { saveErrorMessage } from "@/lib/save-error";
import { LoadingState, ErrorState } from "./shared/states";
const FINANCE_QUERY_KEY = ["finance"] as const;
let saveQueue: Promise<unknown> = Promise.resolve();
type Notice = { message: string; tone: "success" | "error"; undo?: () => void };
type FinanceContextValue = {
  data: FinanceData;
  month: string;
  setMonth: (value: string) => void;
  update: (
    recipe: (data: FinanceData) => FinanceData,
    onError?: (message: string) => void,
  ) => Promise<boolean>;
  notice: Notice | null;
  notify: (
    message: string,
    tone?: "success" | "error",
    undo?: () => void,
  ) => void;
  clearNotice: () => void;
  editor: Transaction | null | undefined;
  setEditor: (value: Transaction | null | undefined) => void;
  reset: () => Promise<boolean>;
};
const FinanceContext = createContext<FinanceContextValue | null>(null);
export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error("Finance provider missing");
  return value;
}
function FinanceProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: FINANCE_QUERY_KEY,
    queryFn: () => remoteRepository.read(),
    retry: false,
    staleTime: Infinity,
    // Other devices may have changed the data while this tab was in the background.
    refetchOnWindowFocus: "always",
  });
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editor, setEditor] = useState<Transaction | null | undefined>(
    undefined,
  );
  const notify = useCallback(
    (
      message: string,
      tone: "success" | "error" = "success",
      undo?: () => void,
    ) => setNotice({ message, tone, undo }),
    [],
  );
  useEffect(() => {
    if (!notice || notice.undo) return;
    const timer = setTimeout(() => setNotice(null), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  const update = useCallback(
    (
      recipe: (data: FinanceData) => FinanceData,
      onError?: (message: string) => void,
    ) => {
      // Saves run one at a time so each recipe sees the result of the previous one.
      const run = async () => {
        try {
          const current = client.getQueryData<FinanceData>(FINANCE_QUERY_KEY);
          if (!current) throw new Error("ข้อมูลยังไม่พร้อม");
          await client.cancelQueries({ queryKey: FINANCE_QUERY_KEY });
          let next: FinanceData;
          try {
            next = await remoteRepository.write(
              recipe(structuredClone(current)),
            );
          } catch (error) {
            if (!(error instanceof FinanceConflictError)) throw error;
            // Another device saved first: reapply this change on top of its data.
            const fresh = await remoteRepository.read();
            client.setQueryData(FINANCE_QUERY_KEY, fresh);
            next = await remoteRepository.write(recipe(structuredClone(fresh)));
          }
          client.setQueryData(FINANCE_QUERY_KEY, next);
          return true;
        } catch (error) {
          const message = saveErrorMessage(error);
          onError?.(message);
          notify(message, "error");
          return false;
        }
      };
      const result = saveQueue.then(run);
      saveQueue = result;
      return result;
    },
    [client, notify],
  );
  const reset = useCallback(async () => {
    try {
      await client.cancelQueries({ queryKey: FINANCE_QUERY_KEY });
      const data = await remoteRepository.reset();
      client.setQueryData(FINANCE_QUERY_KEY, data);
      notify("ล้างข้อมูลแล้ว พร้อมหมวดหมู่มาตรฐานสำหรับเริ่มใหม่");
      return true;
    } catch (error) {
      notify((error as Error).message, "error");
      return false;
    }
  }, [client, notify]);
  const value = useMemo(
    () =>
      query.data
        ? {
            data: query.data,
            month,
            setMonth,
            update,
            notice,
            notify,
            clearNotice: () => setNotice(null),
            editor,
            setEditor,
            reset,
          }
        : null,
    [query.data, month, update, notice, notify, editor, reset],
  );
  if (query.isPending) return <LoadingState />;
  if (query.isError || !value)
    return (
      <>
        <ErrorState
          message={query.error?.message ?? "ไม่พบข้อมูล"}
          onRetry={() => query.refetch()}
        />
        {notice && (
          <p role="alert" className="inline-error">
            {notice.message}
          </p>
        )}
      </>
    );
  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <FinanceProvider>{children}</FinanceProvider>
    </QueryClientProvider>
  );
}
