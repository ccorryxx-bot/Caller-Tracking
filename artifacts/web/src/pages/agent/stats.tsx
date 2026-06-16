import { useGetAgentStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AgentStats() {
  const { data: stats, isLoading } = useGetAgentStats();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const totalCompleted = stats.totalPhones ? stats.totalPhones - stats.remaining : 0;
  const progressPercent = stats.totalPhones ? Math.round((totalCompleted / stats.totalPhones) * 100) : 0;

  return (
    <div className="flex flex-col space-y-6">
      <h2 className="text-xl font-bold text-gray-900 px-1">ယနေ့စာရင်း</h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">ယနေ့တိုးတက်မှု</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end mb-2">
            <span className="text-3xl font-bold text-gray-900">{progressPercent}%</span>
            <span className="text-sm text-gray-500 font-medium">{totalCompleted} / {stats.totalPhones} ပြီးဆုံး</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-primary mb-1">{stats.total}</span>
            <span className="text-xs font-medium text-gray-600">စုစုပေါင်းခေါ်ဆိုမှု</span>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-green-600 mb-1">{stats.interested}</span>
            <span className="text-xs font-medium text-green-800">စိတ်ဝင်စားဖုန်း</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">အသေးစိတ်</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatRow label="အခုဆော့မယ်ဖုန်း" count={stats.will_buy} total={stats.total} color="bg-blue-500" />
          <StatRow label="စက်ပိတ်ထားသောဖုန်း" count={stats.phone_off} total={stats.total} color="bg-gray-400" />
          <StatRow label="ဖုန်းမကိုင်" count={stats.no_answer} total={stats.total} color="bg-orange-400" />
          <StatRow label="ပြောရင်းချသွား" count={stats.hung_up} total={stats.total} color="bg-red-400" />
        </CardContent>
      </Card>
    </div>
  );
}

function StatRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{count}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 flex overflow-hidden">
        <div className={`${color} h-1.5`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
