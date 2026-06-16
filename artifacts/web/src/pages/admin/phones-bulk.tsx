import { useBulkAddPhoneNumbers, useListAgents, getListPhoneNumbersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminPhonesBulk() {
  const { data: agents } = useListAgents();
  const bulkAdd = useBulkAddPhoneNumbers();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [agentId, setAgentId] = useState<string>("");
  const [campaign, setCampaign] = useState("");
  const [numbersText, setNumbersText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !numbersText.trim()) return;

    try {
      const result = await bulkAdd.mutateAsync({
        data: {
          agentId: parseInt(agentId),
          campaign: campaign || undefined,
          numbers: numbersText,
        }
      });
      
      queryClient.invalidateQueries({ queryKey: getListPhoneNumbersQueryKey() });
      toast({ 
        title: "Upload complete", 
        description: `Added: ${result.added}, Skipped: ${result.skipped}` 
      });
      setLocation("/admin/phones");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Upload Phones</h1>
        <p className="text-sm text-gray-500">Assign multiple phone numbers to an agent</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Details</CardTitle>
          <CardDescription>Paste one phone number per line.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Select Agent</Label>
              <Select value={agentId} onValueChange={setAgentId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents?.filter(a => a.isActive).map(agent => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name || agent.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Campaign (Optional)</Label>
              <Input 
                value={campaign} 
                onChange={e => setCampaign(e.target.value)} 
                placeholder="e.g., Summer Promo 2024"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Numbers</Label>
              <Textarea 
                value={numbersText}
                onChange={e => setNumbersText(e.target.value)}
                placeholder="09123456789&#10;09987654321"
                className="font-mono h-48"
                required
              />
              <p className="text-xs text-gray-500">Enter numbers separated by new lines.</p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={bulkAdd.isPending} className="w-full">
                {bulkAdd.isPending ? "Uploading..." : "Upload Numbers"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
