# Sari-Store Monitoring System

## System Description

### Overview

The **Sari-Store Monitoring System** is an offline-first web application
for sari-sari stores and other small retail businesses. It focuses on
monitoring inventory, sales, cash flow, and store records without
requiring a database or backend server.

The system is intended for a **single owner** and uses a simple PIN for
access instead of user accounts. It is built entirely with **HTML5,
CSS3, Bootstrap 5, and Vanilla JavaScript**, making it suitable for
deployment on **GitHub Pages**.

## Objectives

-   Monitor inventory and sales.
-   Record daily business transactions.
-   Track inventory investment and potential gross profit.
-   Operate without MySQL, PHP, or cloud services.
-   Support offline usage and JSON backup/restore.

## Core Modules

### Dashboard

Displays today's sales, inventory investment, retail inventory value,
potential gross profit, cash on hand, GCash balance, outstanding utang,
low stock, out-of-stock items, expiring items, and recent transactions.

### Inventory

Stores product information including: - Product ID - Barcode - Product
Name - Category - Cost Price - Selling Price - Current Stock - Low Stock
Threshold - Expiration Date (optional)

Functions: - Add/Edit/Delete Products - Stock Adjustment - Stock
Receiving - Product Search - Barcode Support

### Sales / POS

Records product sales, deducts stock automatically, and supports Cash,
GCash, and Utang transactions.

### Utang

Maintains customer credit balances and payment history.

### GCash

Records cash-in, cash-out, fees, and balance history.

### Cash Vault

Tracks physical cash deposits, withdrawals, and expenses.

### Bills

Tracks recurring expenses such as electricity, water, internet, and
rent.

### Reports

Provides: - Daily, Weekly, Monthly, and Yearly Sales - Inventory
Summary - Low Stock Report - Financial Summary - Cash Summary - GCash
Summary - Outstanding Utang

### Settings

-   Store Information
-   Store Logo
-   PIN Code
-   Theme
-   Categories
-   Backup & Restore

## Inventory Value Monitoring

Each product stores: - Cost Price - Selling Price - Current Stock

The system automatically calculates:

-   Inventory Investment = Cost Price × Stock
-   Retail Inventory Value = Selling Price × Stock
-   Potential Gross Profit = (Selling Price − Cost Price) × Stock

These values are calculated dynamically instead of being permanently
stored.

## Technology Stack

-   HTML5
-   CSS3
-   Bootstrap 5
-   Vanilla JavaScript
-   JSON
-   LocalStorage / IndexedDB
-   Git
-   GitHub Pages
-   Progressive Web App (PWA)

## Data Structure

``` text
data/
    products.json
    sales.json
    customers.json
    utang.json
    gcash.json
    cashvault.json
    bills.json
    settings.json
```

## Security

-   Single-user application
-   PIN-protected login
-   No database
-   No authentication server

## Future Expansion

-   Supplier Management
-   Payroll
-   Purchase Orders
-   Receipt Printing
-   Cloud Synchronization
-   Multi-user Support

## Conclusion

The Sari-Store Monitoring System is a lightweight, modern,
offline-capable monitoring application that provides inventory control,
sales recording, financial monitoring, and business reporting while
remaining simple enough to deploy on GitHub Pages without a backend
server.
