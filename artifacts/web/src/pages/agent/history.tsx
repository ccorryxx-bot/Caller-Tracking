import { useGetAgentCalls } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const outcomeLabels: Record<string, string> = {
  interested: "စိတ်ဝင်စားဖုန်း",
  will_buy: "အခုဆော့မယ်ဖုန်း",
  phone_off: "စက်ပိတ်ထားသောဖုန်း",
  no_answer: "ဖုန်းမကိုင်",
  hung_up: "ပြောရင်းချသွား",
};

const outcomeColors: Record<string, string> = {
  interested: "text-green-700 bg-green-50 border-green-200",
  will_buy: "text-blue-700 bg-blue-50 border-blue-200",
  phone_off: "text-gray-700 bg-gray-50 border-gray-200",
  no_answer: "text-orange-700 bg-orange-50 border-orange-200",
  hung_up: "text-red-700 bg-red-50 border-red-200",
};

export default function AgentHistory() {
  const { data: calls, isLoading } = useGetAgentCalls();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-xl font-bold text-gray-900 px-1">ခေါ်ဆိုမှုမှတ်တမ်းများ</h2>
      
      {!calls || calls.length === 0 ? (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-8 text-center text-gray-500">
            မှတ်တမ်းမရှိသေးပါ
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => (
            <Card key={call.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4 border-l-4 border-l-primary">
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-gray-900">{call.phoneNumber}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(call.recordedAt), "dd MMM yyyy, hh:mm a")}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${outcomeColors[call.outcome] || 'text-gray-700 bg-gray-100 border-gray-200'}`}>
                    {outcomeLabels[call.outcome] || call.outcome}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
