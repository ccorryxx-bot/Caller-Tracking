import {
  useGetNextNumber,
  useSubmitCall,
  getGetNextNumberQueryKey,
  getGetAgentStatsQueryKey,
} from "@workspace/api-client-react";
import type { CallInputOutcome, GetNextNumberParams, QueueItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";

const OUTCOMES: { value: CallInputOutcome; label: string; color: string; selectedBg: string }[] = [
  { value: "interested",  label: "စိတ်ဝင်စားဖုန်း",         color: "text-green-600",  selectedBg: "bg-green-50 border-green-400" },
  { value: "will_buy",    label: "အခုဆော့မယ်ဖုန်း",         color: "text-blue-600",   selectedBg: "bg-blue-50 border-blue-400" },
  { value: "phone_off",   label: "စက်ပိတ်ထားသောဖုန်း",       color: "text-gray-700",   selectedBg: "bg-gray-100 border-gray-400" },
  { value: "no_answer",   label: "ဖုန်းမကိုင်",               color: "text-orange-600", selectedBg: "bg-orange-50 border-orange-400" },
  { value: "hung_up",     label: "ပြောရင်းချသွား",            color: "text-red-600",    selectedBg: "bg-red-50 border-red-400" },
];

interface LocalEntry {
  phoneNumber: string;
  phoneNumberId: number;
}

const BATCH_SIZE = 6;
const REFETCH_THRESHOLD = 2;
const FETCH_PARAMS: GetNextNumberParams = { limit: BATCH_SIZE };

export default function AgentDashboard() {
  const { data, isLoading, isError, refetch } = useGetNextNumber(FETCH_PARAMS, {
    query: { staleTime: 0, queryKey: getGetNextNumberQueryKey(FETCH_PARAMS) },
  });
  const submitCall = useSubmitCall();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selected, setSelected] = useState<CallInputOutcome | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [localQueue, setLocalQueue] = useState<LocalEntry[]>([]);
  const [current, setCurrent] = useState<LocalEntry | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const isFetchingMore = useRef(false);

  useEffect(() => {
    if (!data) return;

    if (data.done) {
      setIsDone(true);
      setCurrent(null);
      setLocalQueue([]);
      return;
    }

    const batch: LocalEntry[] = (data.queue ?? []).map((q: QueueItem) => ({
      phoneNumber: q.phoneNumber,
      phoneNumberId: q.phoneNumberId,
    }));

    if (batch.length > 0) {
      setCurrent(batch[0]);
      setLocalQueue(batch.slice(1));
      setRemaining(data.remaining ?? 0);
      setIsDone(false);
    }
  }, [data]);

  const triggerBackgroundRefetch = async (queueAfterPop: LocalEntry[]) => {
    if (isFetchingMore.current) return;
    if (queueAfterPop.length <= REFETCH_THRESHOLD) {
      isFetchingMore.current = true;
      try {
        await queryClient.invalidateQueries({ queryKey: getGetNextNumberQueryKey(FETCH_PARAMS) });
      } finally {
        isFetchingMore.current = false;
      }
    }
  };

  const handleSubmit = async () => {
    if (!selected || !current) return;
    setIsSubmitting(true);

    const submitting = current;
    const nextQueue = [...localQueue];
    const nextCurrent = nextQueue.shift() ?? null;

    setCurrent(nextCurrent);
    setLocalQueue(nextQueue);
    setSelected(null);
    setRemaining(prev => Math.max(0, prev - 1));
    if (!nextCurrent) setIsDone(true);

    try {
      await submitCall.mutateAsync({
        data: {
          phoneNumberId: submitting.phoneNumberId,
          phoneNumber: submitting.phoneNumber,
          outcome: selected,
        },
      });

      await Promise.all([
        triggerBackgroundRefetch(nextQueue),
        queryClient.invalidateQueries({ queryKey: getGetAgentStatsQueryKey() }),
      ]);
    } catch (error: any) {
      setCurrent(submitting);
      setLocalQueue(prev => (nextCurrent ? [nextCurrent, ...prev] : prev));
      setRemaining(prev => prev + 1);
      setIsDone(false);
      toast({
        title: "မှတ်တမ်းတင်မရပါ",
        description: error.message || "ထပ်မံကြိုးစားပါ",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !current) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (isError && !current) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-red-500 text-sm">အချက်အလက်ရယူ၍မရပါ</p>
        <Button size="sm" onClick={() => refetch()}>ပြန်ကြိုးစားမည်</Button>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
        <p className="text-lg font-semibold text-gray-800">ဖုန်းနံပါတ်အားလုံးပြီးပါပြီ ✓</p>
        <p className="text-sm text-gray-500">ယနေ့အတွက် ခေါ်ဆိုရန်မရှိတော့ပါ</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-2">ပြန်စစ်မည်</Button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;

  return (
    <div className="flex-1 flex flex-col pb-2">
      <div className="bg-primary text-white text-center text-xs font-medium py-1.5 px-3 rounded-md mb-3">
        ဖြန်လည်ထုတ်လွှင့်နိုင်သော အရေအတွက်: {remaining}
      </div>

      <div className="bg-white rounded border border-gray-200 mb-3 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-600">ဖောက်သည်ဒေတာ</span>
        </div>
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-xs text-gray-500">ဖောက်သည် မိုဘိုင်းနံပါတ်-</span>
            <a
              href={`tel:${current.phoneNumber}`}
              data-testid="link-phone-number"
              className="text-sm font-bold text-primary hover:underline break-all"
            >
              {current.phoneNumber}
            </a>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-gray-500">ဒေတာရယူချိန်-</span>
            <span className="text-xs text-gray-700">{dateStr}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded border border-gray-200 mb-3 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-600">ဆိုက်ဆက်ထားသည်</span>
        </div>
        <div className="divide-y divide-gray-100">
          {OUTCOMES.map((o) => {
            const isSelected = selected === o.value;
            return (
              <button
                key={o.value}
                data-testid={`outcome-${o.value}`}
                onClick={() => setSelected(o.value)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors border-l-2 ${
                  isSelected
                    ? `${o.selectedBg} border-l-current`
                    : "border-l-transparent hover:bg-gray-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-current" : "bg-gray-300"} ${o.color}`} />
                <span className={`text-sm font-medium ${o.color}`}>{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        data-testid="button-submit"
        className="w-full"
        disabled={!selected || isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        တင်သွင်းမှုကို အတည်ပြုပါ
      </Button>
    </div>
  );
}
