import { useListPhoneNumbers, useDeletePhoneNumber, getListPhoneNumbersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminPhones() {
  const { data: phones, isLoading } = useListPhoneNumbers();
  const deletePhone = useDeletePhoneNumber();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this phone number?")) return;
    try {
      await deletePhone.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListPhoneNumbersQueryKey() });
      toast({ title: "Phone number deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
          <p className="text-sm text-gray-500">Manage assigned phone numbers</p>
        </div>
        
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/phones/bulk">
              <Upload className="mr-2 h-4 w-4" /> Bulk Upload
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Called Count</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phones?.map(phone => (
                <TableRow key={phone.id}>
                  <TableCell className="font-medium text-lg">{phone.phoneNumber}</TableCell>
                  <TableCell>{phone.agentName || 'Unknown'}</TableCell>
                  <TableCell>{phone.campaign || '-'}</TableCell>
                  <TableCell>
                    {phone.calledCount && phone.calledCount > 0 ? (
                      <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">Called</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-medium">Pending</span>
                    )}
                  </TableCell>
                  <TableCell>{phone.calledCount || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(phone.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!phones?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-8 text-gray-500">No phone numbers found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
