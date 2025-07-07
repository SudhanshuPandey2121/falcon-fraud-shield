
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Activity, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { FraudAnalytics } from "@/components/FraudAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { advancedFraudDetection } from "@/utils/fraudDetection";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  channel: string;
  beneficiary_name: string;
  beneficiary_account: string;
  beneficiary_phone: string;
  beneficiary_ifsc: string;
  sender_account: string;
  sender_latitude?: number;
  sender_longitude?: number;
  risk_score: number;
  anomaly_score: number;
  risk_level: string; // Changed to string to match database type
  fraud_probability: number;
  status: string; // Changed to string to match database type
  requires_review: boolean;
  created_at: string;
  updated_at: string;
}

interface AuditLog {
  id: string;
  transaction_id: string;
  action: string;
  old_status?: string;
  new_status?: string;
  reason?: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    flagged: 0,
    approved: 0,
    rejected: 0,
    pending: 0
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
    loadAuditLogs();
  }, []);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('requires_review', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process transactions with fraud detection if needed
      const processedTransactions = (data || []).map(tx => {
        if (!tx.risk_score) {
          const analysis = advancedFraudDetection(tx);
          return { ...tx, ...analysis };
        }
        return tx;
      });

      setTransactions(processedTransactions);
      
      // Calculate stats
      const total = processedTransactions.length;
      const flagged = processedTransactions.filter(tx => tx.risk_level === 'high').length;
      const approved = processedTransactions.filter(tx => tx.status === 'approved').length;
      const rejected = processedTransactions.filter(tx => tx.status === 'rejected').length;
      const pending = processedTransactions.filter(tx => tx.status === 'pending').length;
      
      setStats({ total, flagged, approved, rejected, pending });
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const handleTransactionAction = async (transaction: Transaction, action: 'approve' | 'reject') => {
    if (!reviewReason.trim()) {
      toast.error('Please provide a reason for this action');
      return;
    }

    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Update transaction status
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: newStatus,
          requires_review: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      // Create audit log
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert([{
          transaction_id: transaction.id,
          action: `transaction_${action}`,
          old_status: transaction.status,
          new_status: newStatus,
          reason: reviewReason,
          ip_address: '127.0.0.1', // Would get real IP in production
          user_agent: navigator.userAgent
        }]);

      if (auditError) throw auditError;

      toast.success(`Transaction ${action}ed successfully`);
      setSelectedTransaction(null);
      setReviewReason("");
      loadTransactions();
      loadAuditLogs();
    } catch (error) {
      console.error(`Error ${action}ing transaction:`, error);
      toast.error(`Failed to ${action} transaction`);
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatLocation = (lat?: number, lng?: number) => {
    if (!lat || !lng) return 'Location not available';
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Falcon Fraud</span>
              <Badge variant="outline" className="ml-2">Admin</Badge>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                User Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor and review transactions flagged by AI fraud detection</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Risk</p>
                  <p className="text-3xl font-bold text-red-600">{stats.flagged}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-3xl font-bold text-gray-600">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fraud Analytics */}
        <FraudAnalytics transactions={transactions} />

        {/* Transactions Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Transaction Review Queue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No transactions requiring review</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">{transaction.id.substring(0, 8)}</TableCell>
                      <TableCell className="font-semibold">₹{transaction.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.channel}</Badge>
                      </TableCell>
                      <TableCell>{transaction.beneficiary_name}</TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeColor(transaction.risk_level)}>
                          {transaction.risk_level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{transaction.risk_score.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          {formatLocation(transaction.sender_latitude, transaction.sender_longitude)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeColor(transaction.status)}>
                          {transaction.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTransaction(transaction)}
                          >
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-gray-500">No audit logs available</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{log.action.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-gray-600">
                        Transaction: {log.transaction_id.substring(0, 8)}
                        {log.reason && ` - ${log.reason}`}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Transaction Review Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Review Transaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Transaction ID</Label>
                  <p className="font-mono text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="font-semibold">₹{selectedTransaction.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Channel</Label>
                  <p>{selectedTransaction.channel}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Risk Level</Label>
                  <Badge variant={getRiskBadgeColor(selectedTransaction.risk_level)}>
                    {selectedTransaction.risk_level.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Beneficiary</Label>
                  <p>{selectedTransaction.beneficiary_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Account</Label>
                  <p className="font-mono">{selectedTransaction.beneficiary_account}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p>{selectedTransaction.beneficiary_phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">IFSC</Label>
                  <p className="font-mono">{selectedTransaction.beneficiary_ifsc}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm">{formatLocation(selectedTransaction.sender_latitude, selectedTransaction.sender_longitude)}</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="reason">Review Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for approval or rejection..."
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => handleTransactionAction(selectedTransaction, 'approve')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => handleTransactionAction(selectedTransaction, 'reject')}
                  variant="destructive"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setSelectedTransaction(null);
                    setReviewReason("");
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
