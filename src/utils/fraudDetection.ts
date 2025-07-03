
// Mock AI fraud detection algorithms
// Simulates Random Forest and Isolation Forest models

interface Transaction {
  amount: string;
  channel: string;
  beneficiary: string;
  ifsc: string;
  senderAccount: string;
  timestamp: string;
}

interface FraudAnalysis {
  riskScore: number;
  anomalyScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  fraudProbability: number;
}

export const mockFraudDetection = (transaction: Transaction): FraudAnalysis => {
  const amount = parseFloat(transaction.amount);
  
  // Feature engineering (mock)
  let riskScore = 0;
  let anomalyScore = 0;
  
  // Amount-based risk (higher amounts = higher risk)
  if (amount > 100000) riskScore += 0.3;
  else if (amount > 50000) riskScore += 0.2;
  else if (amount > 10000) riskScore += 0.1;
  
  // Channel-based risk
  const channelRisk = {
    'atm': 0.1,
    'online': 0.15,
    'mobile': 0.1,
    'branch': 0.05
  };
  riskScore += channelRisk[transaction.channel as keyof typeof channelRisk] || 0.2;
  
  // Time-based risk (simulate odd-hour transactions)
  const hour = new Date(transaction.timestamp).getHours();
  if (hour < 6 || hour > 22) riskScore += 0.15;
  
  // Random Forest simulation - add some randomness
  riskScore += Math.random() * 0.3;
  
  // Isolation Forest simulation (anomaly detection)
  // Simulate detection of outliers
  anomalyScore = Math.random();
  
  // If transaction has unusual patterns, increase anomaly score
  if (amount % 1000 === 0 && amount > 50000) anomalyScore += 0.3; // Round amounts
  if (transaction.beneficiary.length < 3) anomalyScore += 0.2; // Suspicious names
  
  // Normalize scores
  riskScore = Math.min(riskScore, 1);
  anomalyScore = Math.min(anomalyScore, 1);
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore > 0.7 || anomalyScore > 0.8) riskLevel = 'high';
  else if (riskScore > 0.4 || anomalyScore > 0.5) riskLevel = 'medium';
  else riskLevel = 'low';
  
  // Calculate fraud probability (ensemble of both models)
  const fraudProbability = (riskScore * 0.6 + anomalyScore * 0.4);
  
  return {
    riskScore: Math.round(riskScore * 100) / 100,
    anomalyScore: Math.round(anomalyScore * 100) / 100,
    riskLevel,
    fraudProbability: Math.round(fraudProbability * 100) / 100
  };
};

// Simulate batch processing for multiple transactions
export const processBatchTransactions = (transactions: Transaction[]): (Transaction & FraudAnalysis)[] => {
  return transactions.map(tx => ({
    ...tx,
    ...mockFraudDetection(tx)
  }));
};
