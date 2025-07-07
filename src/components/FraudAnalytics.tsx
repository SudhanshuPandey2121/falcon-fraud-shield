
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, AlertTriangle, Activity, Shield, MapPin, Clock } from "lucide-react";

interface Transaction {
  id: string;
  risk_level?: 'low' | 'medium' | 'high';
  risk_score?: number;
  anomaly_score?: number;
  channel?: string;
  amount: number;
  fraud_probability?: number;
  created_at?: string;
  sender_latitude?: number;
  sender_longitude?: number;
}

interface FraudAnalyticsProps {
  transactions: Transaction[];
}

export const FraudAnalytics = ({ transactions }: FraudAnalyticsProps) => {
  // Risk level distribution
  const riskDistribution = [
    { name: 'Low Risk', value: transactions.filter(t => t.risk_level === 'low').length, color: '#10B981' },
    { name: 'Medium Risk', value: transactions.filter(t => t.risk_level === 'medium').length, color: '#F59E0B' },
    { name: 'High Risk', value: transactions.filter(t => t.risk_level === 'high').length, color: '#EF4444' }
  ];

  // Channel-wise risk analysis
  const channelRisk = transactions.reduce((acc: any[], tx) => {
    const existing = acc.find(item => item.channel === tx.channel);
    if (existing) {
      existing.total += 1;
      existing.totalAmount += tx.amount;
      if (tx.risk_level === 'high') existing.highRisk += 1;
      if (tx.risk_level === 'medium') existing.mediumRisk += 1;
    } else {
      acc.push({
        channel: tx.channel || 'Unknown',
        total: 1,
        totalAmount: tx.amount,
        highRisk: tx.risk_level === 'high' ? 1 : 0,
        mediumRisk: tx.risk_level === 'medium' ? 1 : 0,
        avgAmount: tx.amount
      });
    }
    return acc;
  }, []);

  // Calculate average amounts
  channelRisk.forEach(item => {
    item.avgAmount = Math.round(item.totalAmount / item.total);
  });

  // Risk score distribution
  const riskScoreRanges = [
    { range: '0-0.2', count: 0, label: 'Very Low' },
    { range: '0.2-0.4', count: 0, label: 'Low' },
    { range: '0.4-0.6', count: 0, label: 'Medium' },
    { range: '0.6-0.8', count: 0, label: 'High' },
    { range: '0.8-1.0', count: 0, label: 'Very High' }
  ];

  transactions.forEach(tx => {
    const score = tx.risk_score || 0;
    if (score < 0.2) riskScoreRanges[0].count++;
    else if (score < 0.4) riskScoreRanges[1].count++;
    else if (score < 0.6) riskScoreRanges[2].count++;
    else if (score < 0.8) riskScoreRanges[3].count++;
    else riskScoreRanges[4].count++;
  });

  // Time-based analysis
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}:00`,
    transactions: 0,
    highRisk: 0
  }));

  transactions.forEach(tx => {
    if (tx.created_at) {
      const hour = new Date(tx.created_at).getHours();
      hourlyData[hour].transactions++;
      if (tx.risk_level === 'high') hourlyData[hour].highRisk++;
    }
  });

  // Amount vs Risk correlation
  const amountRiskData = transactions
    .filter(tx => tx.amount && tx.risk_score)
    .map(tx => ({
      amount: tx.amount,
      riskScore: tx.risk_score,
      fraudProbability: tx.fraud_probability || 0
    }))
    .sort((a, b) => a.amount - b.amount);

  // Location-based analysis
  const locationData = transactions
    .filter(tx => tx.sender_latitude && tx.sender_longitude)
    .reduce((acc: any[], tx) => {
      const region = getRegionFromCoordinates(tx.sender_latitude!, tx.sender_longitude!);
      const existing = acc.find(item => item.region === region);
      if (existing) {
        existing.count++;
        if (tx.risk_level === 'high') existing.highRisk++;
      } else {
        acc.push({
          region,
          count: 1,
          highRisk: tx.risk_level === 'high' ? 1 : 0
        });
      }
      return acc;
    }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Risk Level Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Risk Level Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-4 mt-4">
            {riskDistribution.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Channel Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-orange-500" />
            <span>Channel Risk Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={channelRisk}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#3B82F6" name="Total Transactions" />
              <Bar dataKey="highRisk" fill="#EF4444" name="High Risk" />
              <Bar dataKey="mediumRisk" fill="#F59E0B" name="Medium Risk" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span>Risk Score Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskScoreRanges}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hourly Transaction Pattern */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-purple-500" />
            <span>Hourly Transaction Pattern</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="transactions" stroke="#3B82F6" name="All Transactions" />
              <Line type="monotone" dataKey="highRisk" stroke="#EF4444" name="High Risk" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Geographic Distribution */}
      {locationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-red-500" />
              <span>Geographic Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={locationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#06B6D4" name="Total" />
                <Bar dataKey="highRisk" fill="#DC2626" name="High Risk" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Amount vs Risk Correlation */}
      <Card className={locationData.length > 0 ? "" : "lg:col-span-2"}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Amount vs Risk Correlation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={amountRiskData.slice(0, 50)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="amount" tickFormatter={(value) => `₹${(value/1000).toFixed(0)}K`} />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'amount' ? `₹${value.toLocaleString()}` : value,
                  name
                ]}
              />
              <Line type="monotone" dataKey="riskScore" stroke="#8B5CF6" name="Risk Score" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to determine region from coordinates
function getRegionFromCoordinates(lat: number, lng: number): string {
  // Simplified region mapping for India
  if (lat >= 28 && lat <= 32 && lng >= 75 && lng <= 80) return 'North India';
  if (lat >= 19 && lat <= 28 && lng >= 72 && lng <= 88) return 'West India';
  if (lat >= 8 && lat <= 20 && lng >= 75 && lng <= 80) return 'South India';
  if (lat >= 20 && lat <= 28 && lng >= 80 && lng <= 90) return 'East India';
  if (lat >= 24 && lat <= 32 && lng >= 68 && lng <= 75) return 'Northwest India';
  if (lat >= 22 && lat <= 28 && lng >= 88 && lng <= 97) return 'Northeast India';
  return 'Other';
}
