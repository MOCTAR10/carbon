-- CarbonTrack Database Schema
-- PostgreSQL initialization script

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rccm VARCHAR(50),
  sector VARCHAR(255),
  logo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) DEFAULT 'bureau',
  address TEXT,
  surface NUMERIC(12, 2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  approach VARCHAR(50) DEFAULT 'operational_control',
  status VARCHAR(50) DEFAULT 'draft',
  total_co2eq NUMERIC(15, 2) DEFAULT 0,
  scope1_co2eq NUMERIC(15, 2) DEFAULT 0,
  scope2_co2eq NUMERIC(15, 2) DEFAULT 0,
  scope3_co2eq NUMERIC(15, 2) DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emission_entries (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100) NOT NULL,
  emission_factor_id VARCHAR(100),
  factor_name VARCHAR(500),
  quantity NUMERIC(15, 4) DEFAULT 0,
  unit VARCHAR(100),
  factor_value NUMERIC(15, 6) DEFAULT 0,
  total_co2eq NUMERIC(15, 2) DEFAULT 0,
  scope INTEGER NOT NULL,
  ghg_category VARCHAR(255),
  iso_category VARCHAR(50),
  description TEXT,
  source_characterization VARCHAR(255),
  month INTEGER DEFAULT 0,
  year INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_documents (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
  emission_factor_id VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type VARCHAR(100),
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_docs_lookup ON audit_documents(assessment_id, emission_factor_id, year, month);
CREATE INDEX IF NOT EXISTS idx_audit_docs_assessment ON audit_documents(assessment_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'monthly',
  amount INTEGER DEFAULT 2500000,
  currency VARCHAR(10) DEFAULT 'FCFA',
  payment_method VARCHAR(50),
  payment_ref VARCHAR(255),
  phone_payment VARCHAR(30),
  status VARCHAR(50) DEFAULT 'active',
  starts_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(company_id, status, expires_at);

-- Certification system
CREATE TABLE IF NOT EXISTS certification_requests (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  -- status: pending | assigned | in_progress | certified | rejected
  expert_name VARCHAR(255),
  expert_email VARCHAR(255),
  inspection_date DATE,
  inspection_notes TEXT,
  company_message TEXT,
  admin_notes TEXT,
  rejection_reason TEXT,
  certified_at TIMESTAMP,
  certificate_number VARCHAR(100),
  expert_user_id INTEGER REFERENCES users(id),
  inspection_checklist TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certification_documents (
  id SERIAL PRIMARY KEY,
  certification_id INTEGER REFERENCES certification_requests(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) DEFAULT 'certificate',
  -- doc_type: certificate | audit_report | inspection_report | other
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type VARCHAR(100),
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Expert user index
CREATE INDEX IF NOT EXISTS idx_cert_requests_expert ON certification_requests(expert_user_id);

-- Platform settings (dynamic config managed by admins)
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO platform_settings (key, value) VALUES
  ('monthly_price', '250000'),
  ('currency', 'FCFA'),
  ('subscription_duration_days', '30')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_cert_requests_assessment ON certification_requests(assessment_id);
CREATE INDEX IF NOT EXISTS idx_cert_requests_company ON certification_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_cert_requests_status ON certification_requests(status);
CREATE INDEX IF NOT EXISTS idx_cert_docs_certification ON certification_documents(certification_id);

CREATE INDEX IF NOT EXISTS idx_emission_entries_assessment ON emission_entries(assessment_id);
CREATE INDEX IF NOT EXISTS idx_emission_entries_category ON emission_entries(category);
CREATE INDEX IF NOT EXISTS idx_emission_entries_scope ON emission_entries(scope);
CREATE INDEX IF NOT EXISTS idx_emission_entries_month ON emission_entries(assessment_id, year, month);
CREATE INDEX IF NOT EXISTS idx_assessments_site ON assessments(site_id);
CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
