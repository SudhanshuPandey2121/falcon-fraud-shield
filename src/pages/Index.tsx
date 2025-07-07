
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CreditCard, ArrowRight, CheckCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [formData, setFormData] = useState({
    amount: "",
    channel: "",
    beneficiary: "",
    beneficiaryAccount: "",
    beneficiaryPhone: "",
    ifsc: "",
    senderAccount: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // Get user's location for fraud detection
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Location access denied:", error);
        }
      );
    }
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateTransaction = () => {
    const amount = parseFloat(formData.amount);
    const errors = [];

    // NEFT/RTGS validation rules
    if (formData.channel === 'NEFT' && (amount < 1 || amount > 1000000)) {
      errors.push('NEFT transactions must be between ₹1 and ₹10,00,000');
    }
    if (formData.channel === 'RTGS' && amount < 200000) {
      errors.push('RTGS transactions must be minimum ₹2,00,000');
    }
    if (formData.channel === 'UPI' && amount > 100000) {
      errors.push('UPI transactions cannot exceed ₹1,00,000');
    }

    // IFSC validation
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc)) {
      errors.push('Invalid IFSC code format');
    }

    // Phone validation
    if (!/^[6-9]\d{9}$/.test(formData.beneficiaryPhone)) {
      errors.push('Invalid phone number format');
    }

    // Account number validation
    if (!/^\d{9,18}$/.test(formData.beneficiaryAccount)) {
      errors.push('Account number must be 9-18 digits');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateTransaction();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([
          {
            amount: parseFloat(formData.amount),
            channel: formData.channel,
            beneficiary_name: formData.beneficiary,
            beneficiary_account: formData.beneficiaryAccount,
            beneficiary_phone: formData.beneficiaryPhone,
            beneficiary_ifsc: formData.ifsc,
            sender_account: formData.senderAccount,
            sender_latitude: location?.lat,
            sender_longitude: location?.lng,
            user_id: null // For anonymous users
          }
        ])
        .select();

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Transaction submitted successfully!");
    } catch (error) {
      console.error('Error submitting transaction:', error);
      toast.error("Failed to submit transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Transaction Submitted</h2>
            <p className="text-gray-600 mb-6">Your transaction is being processed and will be reviewed shortly.</p>
            <Button onClick={() => setIsSubmitted(false)} className="w-full">
              Submit Another Transaction
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Falcon Fraud</span>
            </div>
            <Link to="/admin">
              <Button variant="outline" size="sm">
                Admin Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <CreditCard className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Secure Transaction Portal</h1>
          <p className="text-xl text-gray-600">Protected by AI-powered fraud detection</p>
          {location && (
            <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              Location verified for enhanced security
            </div>
          )}
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Submit Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="amount">Transaction Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="channel">Transaction Channel</Label>
                <Select value={formData.channel} onValueChange={(value) => handleInputChange('channel', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEFT">NEFT (₹1 - ₹10,00,000)</SelectItem>
                    <SelectItem value="RTGS">RTGS (₹2,00,000+)</SelectItem>
                    <SelectItem value="UPI">UPI (up to ₹1,00,000)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="beneficiary">Beneficiary Name</Label>
                <Input
                  id="beneficiary"
                  type="text"
                  placeholder="Enter beneficiary name"
                  value={formData.beneficiary}
                  onChange={(e) => handleInputChange('beneficiary', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="beneficiaryAccount">Beneficiary Account Number</Label>
                <Input
                  id="beneficiaryAccount"
                  type="text"
                  placeholder="Enter beneficiary account number"
                  value={formData.beneficiaryAccount}
                  onChange={(e) => handleInputChange('beneficiaryAccount', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="beneficiaryPhone">Beneficiary Phone Number</Label>
                <Input
                  id="beneficiaryPhone"
                  type="tel"
                  placeholder="Enter beneficiary phone number"
                  value={formData.beneficiaryPhone}
                  onChange={(e) => handleInputChange('beneficiaryPhone', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="ifsc">IFSC Code</Label>
                <Input
                  id="ifsc"
                  type="text"
                  placeholder="Enter IFSC code"
                  value={formData.ifsc}
                  onChange={(e) => handleInputChange('ifsc', e.target.value.toUpperCase())}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="senderAccount">Sender Account Number</Label>
                <Input
                  id="senderAccount"
                  type="text"
                  placeholder="Enter your account number"
                  value={formData.senderAccount}
                  onChange={(e) => handleInputChange('senderAccount', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  <>
                    Submit Transaction
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center p-6">
            <Shield className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">AI Protection</h3>
            <p className="text-sm text-gray-600">Advanced machine learning models monitor every transaction</p>
          </Card>
          <Card className="text-center p-6">
            <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Real-time Analysis</h3>
            <p className="text-sm text-gray-600">Instant fraud detection and risk assessment</p>
          </Card>
          <Card className="text-center p-6">
            <CreditCard className="h-12 w-12 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Secure Processing</h3>
            <p className="text-sm text-gray-600">Bank-grade security for all transactions</p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
