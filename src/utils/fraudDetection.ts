
interface Transaction {
  id?: string;
  amount: number;
  channel: string;
  beneficiary_name: string;
  beneficiary_account: string;
  beneficiary_phone: string;
  beneficiary_ifsc: string;
  sender_account: string;
  sender_latitude?: number;
  sender_longitude?: number;
  created_at?: string;
}

interface FraudAnalysis {
  risk_score: number;
  anomaly_score: number;
  risk_level: string; // Changed to string to match database
  fraud_probability: number;
  requires_review: boolean;
}

export const advancedFraudDetection = (transaction: Transaction): FraudAnalysis => {
  let riskScore = 0;
  let anomalyScore = 0;
  const amount = transaction.amount;
  
  // Amount-based risk analysis
  if (amount > 1000000) riskScore += 0.4; // Very high amounts
  else if (amount > 500000) riskScore += 0.3;
  else if (amount > 100000) riskScore += 0.2;
  else if (amount > 50000) riskScore += 0.1;
  
  // Channel-specific risk analysis
  const channelRisk = {
    'RTGS': 0.1, // Lower risk for RTGS (regulated, higher amounts)
    'NEFT': 0.15, // Medium risk
    'UPI': 0.2 // Higher risk due to ease of use
  };
  riskScore += channelRisk[transaction.channel as keyof typeof channelRisk] || 0.25;
  
  // Time-based analysis
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) riskScore += 0.2; // Off-hours transactions
  if (hour >= 22 || hour <= 2) riskScore += 0.1; // Late night extra risk
  
  // Weekend/holiday risk (simplified)
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) riskScore += 0.1; // Weekend transactions
  
  // Beneficiary analysis
  if (transaction.beneficiary_name.length < 3) anomalyScore += 0.3; // Very short names
  if (/^[A-Z\s]+$/.test(transaction.beneficiary_name)) anomalyScore -= 0.1; // Proper case names
  
  // Account number patterns
  if (/^(.)\1{8,}$/.test(transaction.beneficiary_account)) anomalyScore += 0.4; // Repeated digits
  if (transaction.sender_account === transaction.beneficiary_account) riskScore += 0.8; // Same account transfer
  
  // IFSC code validation and risk
  const ifscBank = transaction.beneficiary_ifsc.substring(0, 4);
  const suspiciousBanks = ['TEST', 'FAKE', 'DEMO'];
  if (suspiciousBanks.includes(ifscBank)) riskScore += 0.5;
  
  // Phone number analysis
  if (!/^[6-9]\d{9}$/.test(transaction.beneficiary_phone)) anomalyScore += 0.3;
  
  // Round amount analysis (potential money laundering indicator)
  if (amount % 10000 === 0 && amount > 100000) anomalyScore += 0.2;
  if (amount % 100000 === 0 && amount > 500000) anomalyScore += 0.3;
  
  // Location-based risk (if available)
  if (transaction.sender_latitude && transaction.sender_longitude) {
    // Check for impossible location changes (if we had previous transactions)
    // For now, just check for suspicious coordinates
    const lat = transaction.sender_latitude;
    const lng = transaction.sender_longitude;
    
    // Check if coordinates are within India (approximate bounds)
    if (lat < 6 || lat > 37 || lng < 68 || lng > 97) {
      riskScore += 0.3; // Transaction from outside India
    }
    
    // Check for exact coordinates (GPS spoofing indicator)
    if (lat % 1 === 0 && lng % 1 === 0) {
      anomalyScore += 0.2; // Exact degree coordinates are suspicious
    }
  } else {
    riskScore += 0.1; // No location data available
  }
  
  // Velocity checks (simplified - would need transaction history)
  // This would typically check for multiple transactions in short time periods
  
  // Cross-channel consistency checks
  if (transaction.channel === 'UPI' && amount > 50000) {
    riskScore += 0.2; // High UPI amounts are less common
  }
  
  if (transaction.channel === 'RTGS' && amount < 300000) {
    anomalyScore += 0.1; // Low RTGS amounts are unusual
  }
  
  // Add some randomness to simulate ML model uncertainty
  riskScore += (Math.random() - 0.5) * 0.1;
  anomalyScore += (Math.random() - 0.5) * 0.1;
  
  // Normalize scores
  riskScore = Math.max(0, Math.min(1, riskScore));
  anomalyScore = Math.max(0, Math.min(1, anomalyScore));
  
  // Determine risk level and review requirement
  let riskLevel: string;
  let requiresReview = true;
  
  if (riskScore > 0.7 || anomalyScore > 0.8) {
    riskLevel = 'high';
    requiresReview = true;
  } else if (riskScore > 0.4 || anomalyScore > 0.5) {
    riskLevel = 'medium';
    requiresReview = true;
  } else {
    riskLevel = 'low';
    requiresReview = amount > 50000; // Low risk but high amount still needs review
  }
  
  // Calculate combined fraud probability
  const fraudProbability = (riskScore * 0.6 + anomalyScore * 0.4);
  
  return {
    risk_score: Math.round(riskScore * 100) / 100,
    anomaly_score: Math.round(anomalyScore * 100) / 100,
    risk_level: riskLevel,
    fraud_probability: Math.round(fraudProbability * 100) / 100,
    requires_review: requiresReview
  };
};

// Enhanced batch processing
export const processBatchTransactions = (transactions: Transaction[]): (Transaction & FraudAnalysis)[] => {
  return transactions.map(tx => ({
    ...tx,
    ...advancedFraudDetection(tx)
  }));
};

// Additional utility functions for advanced analysis
export const calculateVelocityRisk = (transactions: Transaction[], timeWindowHours: number = 24): number => {
  const now = new Date();
  const timeWindow = timeWindowHours * 60 * 60 * 1000;
  
  const recentTransactions = transactions.filter(tx => {
    const txTime = new Date(tx.created_at || now);
    return now.getTime() - txTime.getTime() < timeWindow;
  });
  
  const totalAmount = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const transactionCount = recentTransactions.length;
  
  // High velocity indicators
  if (transactionCount > 10) return 0.8;
  if (totalAmount > 5000000) return 0.7;
  if (transactionCount > 5 && totalAmount > 1000000) return 0.6;
  
  return Math.min(0.5, (transactionCount * 0.1) + (totalAmount / 10000000));
};

export const checkGeographicAnomaly = (currentLat: number, currentLng: number, previousTransactions: Transaction[]): number => {
  if (previousTransactions.length === 0) return 0;
  
  const lastTransaction = previousTransactions[previousTransactions.length - 1];
  if (!lastTransaction.sender_latitude || !lastTransaction.sender_longitude) return 0;
  
  // Calculate distance between current and last transaction
  const distance = calculateDistance(
    currentLat, currentLng,
    lastTransaction.sender_latitude, lastTransaction.sender_longitude
  );
  
  const timeDiff = new Date().getTime() - new Date(lastTransaction.created_at || 0).getTime();
  const timeDiffHours = timeDiff / (1000 * 60 * 60);
  
  // If distance is too large for the time difference, it's suspicious
  const maxReasonableSpeed = 100; // km/h
  const maxPossibleDistance = maxReasonableSpeed * timeDiffHours;
  
  if (distance > maxPossibleDistance) {
    return Math.min(0.9, distance / maxPossibleDistance - 1);
  }
  
  return 0;
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
