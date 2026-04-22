-- ===================================================== 
-- Complete Accounting System Database Schema 
-- IFRS 18, IAS 16, IAS 7 Compliant 
-- ===================================================== 
 
-- Users table 
CREATE TABLE IF NOT EXISTS users ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username VARCHAR(50) UNIQUE NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL, 
    password_hash TEXT NOT NULL, 
    full_name VARCHAR(100) NOT NULL, 
    role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('admin', 'manager', 'accountant', 'user')), 
    is_active BOOLEAN DEFAULT 1, 
    last_login DATETIME, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
); 
 
-- Main Account Categories (IFRS compliant) 
CREATE TABLE IF NOT EXISTS main_accounts ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    code VARCHAR(10) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    category VARCHAR(20) CHECK(category IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')), 
    normal_balance VARCHAR(10) CHECK(normal_balance IN ('DEBIT', 'CREDIT')), 
    description TEXT, 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Sub Main Accounts 
CREATE TABLE IF NOT EXISTS sub_main_accounts ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    main_account_id INTEGER REFERENCES main_accounts(id), 
    code VARCHAR(15) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    description TEXT, 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Account Groups 
CREATE TABLE IF NOT EXISTS account_groups ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    sub_main_account_id INTEGER REFERENCES sub_main_accounts(id), 
    code VARCHAR(20) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    description TEXT, 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Sub Groups 
CREATE TABLE IF NOT EXISTS sub_groups ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    group_id INTEGER REFERENCES account_groups(id), 
    code VARCHAR(25) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    description TEXT, 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Ledger Accounts 
CREATE TABLE IF NOT EXISTS ledgers ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    sub_group_id INTEGER REFERENCES sub_groups(id), 
    code VARCHAR(30) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    description TEXT, 
    opening_balance DECIMAL(15,2) DEFAULT 0, 
    current_balance DECIMAL(15,2) DEFAULT 0, 
    currency_code VARCHAR(3) DEFAULT 'USD', 
    is_cash_account BOOLEAN DEFAULT 0, 
    is_bank_account BOOLEAN DEFAULT 0, 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Journal Entries 
CREATE TABLE IF NOT EXISTS journal_entries ( 
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
    entry_number VARCHAR(50) UNIQUE NOT NULL, 
    entry_date DATE NOT NULL, 
    reference_number VARCHAR(100), 
    description TEXT NOT NULL, 
    total_debit DECIMAL(15,2) NOT NULL, 
    total_credit DECIMAL(15,2) NOT NULL, 
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'POSTED', 'CANCELLED')), 
    branch_id INTEGER REFERENCES branches(id), 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Journal Entry Items 
CREATE TABLE IF NOT EXISTS journal_entry_items ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    journal_entry_id INTEGER REFERENCES journal_entries(id), 
    ledger_id INTEGER REFERENCES ledgers(id), 
    debit_amount DECIMAL(15,2) DEFAULT 0, 
    credit_amount DECIMAL(15,2) DEFAULT 0, 
    description TEXT, 
    reference VARCHAR(100) 
); 
 
-- Branches 
CREATE TABLE IF NOT EXISTS branches ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    code VARCHAR(20) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    address TEXT, 
    phone VARCHAR(20), 
    email VARCHAR(100), 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Currencies 
CREATE TABLE IF NOT EXISTS currencies ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    code VARCHAR(3) UNIQUE NOT NULL, 
    name VARCHAR(50) NOT NULL, 
    symbol VARCHAR(10), 
    decimal_places INTEGER DEFAULT 2, 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
); 
 
-- Exchange Rates 
CREATE TABLE IF NOT EXISTS exchange_rates ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    from_currency VARCHAR(3) NOT NULL, 
    to_currency VARCHAR(3) NOT NULL, 
    rate DECIMAL(15,6) NOT NULL, 
    effective_date DATE NOT NULL, 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
); 
 
-- Fixed Asset Categories (IAS 16 compliant) 
CREATE TABLE IF NOT EXISTS fixed_asset_categories ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    code VARCHAR(20) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    useful_life_years INTEGER, 
    depreciation_method VARCHAR(20) DEFAULT 'STRAIGHT_LINE' CHECK(depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION')), 
    residual_value_rate DECIMAL(5,2) DEFAULT 0, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Fixed Assets (IAS 16 compliant) 
CREATE TABLE IF NOT EXISTS fixed_assets ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    asset_code VARCHAR(50) UNIQUE NOT NULL, 
    category_id INTEGER REFERENCES fixed_asset_categories(id), 
     name VARCHAR(200) NOT NULL, 
    description TEXT, 
    purchase_date DATE NOT NULL, 
    cost DECIMAL(15,2) NOT NULL, 
    useful_life_years INTEGER NOT NULL, 
    residual_value DECIMAL(15,2) DEFAULT 0, 
    depreciation_method VARCHAR(20) DEFAULT 'STRAIGHT_LINE', 
    current_net_value DECIMAL(15,2) NOT NULL, 
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0, 
    location VARCHAR(100), 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Depreciation Schedule (IAS 16 compliant) 
CREATE TABLE IF NOT EXISTS depreciation_schedule ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    fixed_asset_id INTEGER REFERENCES fixed_assets(id), 
    schedule_date DATE NOT NULL, 
    depreciation_amount DECIMAL(15,2) NOT NULL, 
    accumulated_depreciation DECIMAL(15,2) NOT NULL, 
    net_book_value DECIMAL(15,2) NOT NULL, 
    is_posted BOOLEAN DEFAULT 0, 
    journal_entry_id INTEGER REFERENCES journal_entries(id), 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
); 
 
-- Bank Accounts 
CREATE TABLE IF NOT EXISTS bank_accounts ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    account_number VARCHAR(50) UNIQUE NOT NULL, 
    bank_name VARCHAR(100) NOT NULL, 
    account_name VARCHAR(100) NOT NULL, 
    currency_code VARCHAR(3) DEFAULT 'USD', 
    opening_balance DECIMAL(15,2) DEFAULT 0, 
    current_balance DECIMAL(15,2) DEFAULT 0, 
    is_active BOOLEAN DEFAULT 1, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
     created_by INTEGER REFERENCES users(id) 
); 
 
-- Bank Transactions 
CREATE TABLE IF NOT EXISTS bank_transactions ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    bank_account_id INTEGER REFERENCES bank_accounts(id), 
    transaction_date DATE NOT NULL, 
    value_date DATE, 
    description TEXT NOT NULL, 
    reference VARCHAR(100), 
    debit_amount DECIMAL(15,2) DEFAULT 0, 
    credit_amount DECIMAL(15,2) DEFAULT 0, 
    balance_after DECIMAL(15,2) NOT NULL, 
    is_reconciled BOOLEAN DEFAULT 0, 
    journal_entry_id INTEGER REFERENCES journal_entries(id), 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
); 
 
-- Reconciliation Statements 
CREATE TABLE IF NOT EXISTS reconciliation_statements ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    bank_account_id INTEGER REFERENCES bank_accounts(id), 
    statement_date DATE NOT NULL, 
    opening_balance DECIMAL(15,2) NOT NULL, 
    closing_balance DECIMAL(15,2) NOT NULL, 
    statement_balance DECIMAL(15,2) NOT NULL, 
    adjusted_balance DECIMAL(15,2) NOT NULL, 
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'RECONCILED', 'APPROVED')), 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Budgets 
CREATE TABLE IF NOT EXISTS budgets ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    budget_number VARCHAR(50) UNIQUE NOT NULL, 
    budget_name VARCHAR(100) NOT NULL, 
    fiscal_year INTEGER NOT NULL, 
    period VARCHAR(20) CHECK(period IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')), 
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'APPROVED', 'ACTIVE','CLOSED')), 
    total_amount DECIMAL(15,2) NOT NULL, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    created_by INTEGER REFERENCES users(id) 
); 
 
-- Budget Items 
CREATE TABLE IF NOT EXISTS budget_items ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    budget_id INTEGER REFERENCES budgets(id), 
    ledger_id INTEGER REFERENCES ledgers(id), 
    period_date DATE NOT NULL, 
    budget_amount DECIMAL(15,2) NOT NULL, 
    actual_amount DECIMAL(15,2) DEFAULT 0, 
    variance DECIMAL(15,2) DEFAULT 0, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
); 
 
-- Recurring Transactions 
CREATE TABLE IF NOT EXISTS recurring_transactions ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name VARCHAR(100) NOT NULL, 
    description TEXT,
    frequency VARCHAR(20) CHECK(frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    start_date DATE NOT NULL,
    end_date DATE,
    next_execution_date DATE NOT NULL,
    last_execution_date DATE,
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'COMPLETED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Audit Trail 
CREATE TABLE IF NOT EXISTS audit_trail ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id INTEGER REFERENCES users(id), 
    action VARCHAR(50) NOT NULL, 
    table_name VARCHAR(50) NOT NULL, 
    record_id INTEGER, 
    old_values TEXT, 
    new_values TEXT, 
    ip_address VARCHAR(45), 
    user_agent TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
); 
 
-- Insert default data 
INSERT OR IGNORE INTO main_accounts (code, name, category, normal_balance) VALUES 
('1', 'Assets', 'ASSET', 'DEBIT'), 
('2', 'Liabilities', 'LIABILITY', 'CREDIT'), 
('3', 'Equity', 'EQUITY', 'CREDIT'), 
('4', 'Revenue', 'REVENUE', 'CREDIT'), 
('5', 'Expenses', 'EXPENSE', 'DEBIT'); 
 
INSERT OR IGNORE INTO currencies (code, name, symbol, decimal_places) VALUES 
('USD', 'US Dollar', '$', 2), 
('EUR', 'Euro', '€', 2), 
('GBP', 'British Pound', '£', 2), 
('JPY', 'Japanese Yen', '¥', 0); 
 
-- Insert default admin user (password: admin123) 
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, role, is_active) 
VALUES ('admin', 'admin@accounting.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', 1); 
 
