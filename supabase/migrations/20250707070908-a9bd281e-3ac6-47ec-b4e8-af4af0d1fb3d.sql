
-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount DECIMAL(15,2) NOT NULL,
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('NEFT', 'RTGS', 'UPI')),
  beneficiary_name VARCHAR(255) NOT NULL,
  beneficiary_account VARCHAR(20) NOT NULL,
  beneficiary_phone VARCHAR(15) NOT NULL,
  beneficiary_ifsc VARCHAR(11) NOT NULL,
  sender_account VARCHAR(20) NOT NULL,
  sender_latitude DECIMAL(10,8),
  sender_longitude DECIMAL(11,8),
  risk_score DECIMAL(3,2) DEFAULT 0,
  anomaly_score DECIMAL(3,2) DEFAULT 0,
  risk_level VARCHAR(10) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  fraud_probability DECIMAL(3,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  requires_review BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id),
  admin_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user profiles table for admin roles
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'auditor')),
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'auditor')
  ));

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'auditor')
  ));

CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for user profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Function to automatically approve low-risk transactions
CREATE OR REPLACE FUNCTION auto_approve_low_risk()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.risk_level = 'low' AND NEW.amount < 50000 THEN
    NEW.status := 'auto_approved';
    NEW.requires_review := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-approval
CREATE TRIGGER auto_approve_trigger
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_low_risk();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
