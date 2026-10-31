"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFinance } from "./providers";
import { localDate } from "@/lib/dates";
import { saveErrorMessage } from "@/lib/save-error";
import {
  PlanningConflictError,
  planningRepository,
} from "@/data/remote/planning-repository";
import type { PlanningData, PlanningSnapshot } from "@/types/planning";
const KEY = ["planning"] as const;
type PlanningContextValue = {
  data: PlanningData | undefined;
  loading: boolean;
  error: string;
  retry: () => void;
  today: string;
  update: (
    recipe: (current: PlanningData) => PlanningData,
    onError?: (message: string) => void,
  ) => Promise<boolean>;
};
const Context = createContext<PlanningContextValue | null>(null);
export function usePlanning() {
  const context = useContext(Context);
  if (!context) throw new Error("Planning provider missing");
  return context;
}
export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const { notify } = useFinance();
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [today, setToday] = useState(() => localDate());
  useEffect(() => {
    const refresh = () => setToday(localDate());
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const query = useQuery({
    queryKey: KEY,
    queryFn: planningRepository.read,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: "always",
  });
  const update = useCallback(
    (
      recipe: (current: PlanningData) => PlanningData,
      onError?: (message: string) => void,
    ) => {
      const run = async () => {
        try {
          await client.cancelQueries({ queryKey: KEY });
          let current = client.getQueryData<PlanningSnapshot>(KEY);
          if (!current)
            throw new Error("ข้อมูลแผนยังไม่พร้อม กรุณาลองโหลดใหม่");
          let next: PlanningSnapshot;
          try {
            next = await planningRepository.write(
              recipe(structuredClone(current.data)),
              current.revision,
            );
          } catch (error) {
            if (!(error instanceof PlanningConflictError)) throw error;
            current = await planningRepository.read();
            client.setQueryData(KEY, current);
            next = await planningRepository.write(
              recipe(structuredClone(current.data)),
              current.revision,
            );
          }
          client.setQueryData(KEY, next);
          return true;
        } catch (error) {
          const message = saveErrorMessage(error);
          onError?.(message);
          notify(message, "error");
          return false;
        }
      };
      const result = queue.current.then(run);
      queue.current = result;
      return result;
    },
    [client, notify],
  );
  return (
    <Context.Provider
      value={{
        data: query.data?.data,
        loading: query.isPending,
        error: query.error?.message ?? "",
        retry: () => {
          void query.refetch();
        },
        today,
        update,
      }}
    >
      {children}
    </Context.Provider>
  );
}
