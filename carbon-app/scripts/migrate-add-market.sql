CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,
    virtual_card_number VARCHAR(19) UNIQUE,
    qr_hash VARCHAR(255) UNIQUE,
    wallet_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carbon_projects (
    id SERIAL PRIMARY KEY,
    partner_id INT REFERENCES partners(id) ON DELETE SET NULL,
    external_api_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100),
    country VARCHAR(100),
    price_per_ton NUMERIC NOT NULL,
    tons_available INT,
    tons_sold INT DEFAULT 0,
    image_url TEXT,
    is_local BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carbon_transactions (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id),
    project_id INT REFERENCES carbon_projects(id),
    tons_purchased NUMERIC NOT NULL,
    amount_paid NUMERIC NOT NULL,
    commission_amount NUMERIC NOT NULL,
    partner_credited NUMERIC,
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'completed',
    certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
