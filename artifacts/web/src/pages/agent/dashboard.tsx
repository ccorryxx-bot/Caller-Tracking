import { useGetNextNumber, useSubmitCall, getGetNextNumberQueryKey, getGetAgentStatsQueryKey } from "@workspace/api-client-react";
import type { CallInputOutcome } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const OUTCOMES: { value: CallInputOutcome; label: string; color: string; selectedBg: string }[] = [
  { value: "interested",  label: "စိတ်ဝင်စားဖုန်း",         color: "text-green-600",  selectedBg: "bg-green-50 border-green-400" },
  { value: "will_buy",    label: "အခုဆော့မယ်ဖုန်း",         color: "text-blue-600",   selectedBg: "bg-blue-50 border-blue-400" },
  { value: "phone_off",   label: "စက်ပိတ်ထားသောဖုန်း",       color: "text-gray-700",   selectedBg: "bg-gray-100 border-gray-400" },
  { value: "no_answer",   label: "ဖုန်းမကိုင်",               color: "text-orange-600", selectedBg: "bg-orange-50 border-orange-400" },
  { value: "hung_up",     label: "ပြောရင်းချသွား",            color: "text-red-600",    selectedBg: "bg-red-50 border-red-400" },
];

export default function AgentDashboard() {
  const { data, isLoading, isError, refetch } = useGetNextNumber();
  const submitCall = useSubmitCall();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<CallInputOutcome | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected || !data?.phoneNumberId || !data.phoneNumber) return;
    setIsSubmitting(true);
    try {
      await submitCall.mutateAsync({
        data: {
          phoneNumberId: data.phoneNumberId,
          phoneNumber: data.phoneNumber,
          outcome: selected,
        },
      });
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: getGetNextNumberQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetAgentStatsQueryKey() });
    } catch (error: any) {
      toast({
        title: "မှတ်တမ်းတင်မရပါ",
        description: error.message || "ထပ်မံကြိုးစားပါ",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-red-500 text-sm">အချက်အလက်ရယူ၍မရပါ</p>
        <Button size="sm" onClick={() => refetch()}>ပြန်ကြိုးစားမည်</Button>
      </div>
    );
  }

  if (data?.done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
        <p className="text-lg font-semibold text-gray-800">ဖုန်းနံပါတ်အားလုံးပြီးပါပြီ ✓</p>
        <p className="text-sm text-gray-500">ယနေ့အတွက် ခေါ်ဆိုရန်မရှိတော့ပါ</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-2">ပြန်စစ်မည်</Button>
      </div>
    );
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;

  return (
    <div className="flex-1 flex flex-col pb-2">
      {/* Remaining count banner */}
      <div className="bg-primary text-white text-center text-xs font-medium py-1.5 px-3 rounded-md mb-3">
        ဖြန်လည်ထုတ်လွှင့်နိုင်သော အရေအတွက်: {data?.remaining ?? 0}
      </div>

      {/* Customer data card */}
      <div className="bg-white rounded border border-gray-200 mb-3 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-600">ဖောက်သည်ဒေတာ</span>
        </div>
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-xs text-gray-500">ဖောက်သည် မိုဘိုင်းနံပါတ်-</span>
            <a
              href={`tel:${data?.phoneNumber}`}
              data-testid="link-phone-number"
              className="text-sm font-bold text-primary hover:underline break-all"
            >
              {data?.phoneNumber}
            </a>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-gray-500">ဒေတာရယူချိန်-</span>
            <span className="text-xs text-gray-700">{dateStr}</span>
          </div>
        </div>
      </div>

      {/* Outcomes card */}
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

      {/* Submit button */}
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
