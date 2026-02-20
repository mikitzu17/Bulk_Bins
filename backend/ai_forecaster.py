import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg') # Fix for threading issues on Windows/Flask
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
import os
from datetime import datetime

def run_analysis(file_path, granularity='weekly'):
    # 1. Load Data
    if not os.path.exists(file_path):
        return {"error": "File not found"}
    
    df = pd.read_csv(file_path)
    
    # Flexible Column Mapping — supports multiple CSV formats
    col_map = {
        # Date columns
        'date': 'Date', 'Date': 'Date', 'timestamp': 'Date',
        # Revenue / Amount columns
        'total_revenue': 'Amount', 'Sales': 'Amount', 'sales': 'Amount',
        'amount': 'Amount', 'Amount': 'Amount', 'revenue': 'Amount',
        # Type columns
        'type': 'Type', 'Type': 'Type',
        # Category columns
        'category': 'Category', 'Category': 'Category',
        # Product / Item name
        'product': 'Product', 'Product': 'Product', 'item': 'Product', 'name': 'Product',
        # Quantity
        'quantity': 'Quantity', 'Quantity': 'Quantity', 'qty': 'Quantity',
        # Sale price per unit
        'sale_price': 'SalePrice', 'Sale_Price': 'SalePrice', 'price': 'SalePrice',
        # COGS per unit
        'cogs_unit': 'COGSUnit', 'cogs': 'COGSUnit', 'cost_price': 'COGSUnit', 'cost': 'COGSUnit',
        # Total profit (pre-calculated)
        'total_profit': 'TotalProfit', 'profit': 'TotalProfit', 'Profit': 'TotalProfit',
    }
    
    # Apply mapping (case-insensitive match using original column names)
    rename_map = {}
    for orig_col in df.columns:
        mapped = col_map.get(orig_col) or col_map.get(orig_col.lower())
        if mapped and mapped not in rename_map.values():
            rename_map[orig_col] = mapped
    df = df.rename(columns=rename_map)
    
    # Ensure Date column
    if 'Date' not in df.columns:
        date_cols = [c for c in df.columns if 'date' in c.lower() or 'time' in c.lower()]
        if date_cols: df = df.rename(columns={date_cols[0]: 'Date'})
    
    if 'Date' not in df.columns: return {"error": "Missing Date column"}
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df = df.dropna(subset=['Date'])

    # If Amount is missing, try to compute from sale_price * quantity
    if 'Amount' not in df.columns:
        if 'SalePrice' in df.columns and 'Quantity' in df.columns:
            df['Amount'] = pd.to_numeric(df['SalePrice'], errors='coerce').fillna(0) * pd.to_numeric(df['Quantity'], errors='coerce').fillna(1)
        else:
            return {"error": "Missing revenue/amount column. Need 'total_revenue', 'amount', or 'sale_price' + 'quantity'"}
    
    df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce').fillna(0)
    
    # Handle Type column
    if 'Type' not in df.columns: df['Type'] = 'Sale'

    # Compute COGS if we have cogs_unit and quantity
    has_cogs = False
    if 'COGSUnit' in df.columns and 'Quantity' in df.columns:
        df['COGS'] = pd.to_numeric(df['COGSUnit'], errors='coerce').fillna(0) * pd.to_numeric(df['Quantity'], errors='coerce').fillna(1)
        has_cogs = True
    
    # Use pre-calculated profit if available
    has_profit_col = False
    if 'TotalProfit' in df.columns:
        df['TotalProfit'] = pd.to_numeric(df['TotalProfit'], errors='coerce').fillna(0)
        has_profit_col = True

    # 2. Multi-Series Aggregation
    df = df.sort_values('Date')
    
    sales_df = df[df['Type'].str.contains('Sale', case=False, na=False)].copy()
    expense_df = df[df['Type'].str.contains('Expense', case=False, na=False)].copy()
    
    freq_map = {'daily': 'D', 'weekly': 'W', 'monthly': 'M', 'quarterly': 'Q', 'halfyearly': '6M', 'yearly': 'Y'}
    freq = freq_map.get(granularity, 'W')

    sales_resampled = sales_df.set_index('Date')['Amount'].resample(freq).sum().reset_index().rename(columns={'Amount': 'Sales'})
    expense_resampled = expense_df.set_index('Date')['Amount'].resample(freq).sum().reset_index().rename(columns={'Amount': 'Expenses'})
    
    # Merge series
    resampled_df = pd.merge(sales_resampled, expense_resampled, on='Date', how='outer').fillna(0)
    
    # For profit: prefer pre-calculated total_profit from CSV, else compute Sales - Expenses
    if has_profit_col:
        profit_resampled = sales_df.set_index('Date')['TotalProfit'].resample(freq).sum().reset_index().rename(columns={'TotalProfit': 'Profit'})
        resampled_df = pd.merge(resampled_df, profit_resampled, on='Date', how='outer').fillna(0)
    else:
        resampled_df['Profit'] = resampled_df['Sales'] - resampled_df['Expenses']
    
    # COGS aggregation if available
    if has_cogs:
        cogs_resampled = sales_df.set_index('Date')['COGS'].resample(freq).sum().reset_index()
        resampled_df = pd.merge(resampled_df, cogs_resampled, on='Date', how='outer').fillna(0)
    
    resampled_df = resampled_df.sort_values('Date')

    # 3. Category Breakdown (top spending categories) + Product breakdown
    cat_breakdown = []
    if 'Category' in df.columns:
        # Show sales by category (more useful for a store)
        sales_cats = sales_df.groupby('Category')['Amount'].sum().sort_values(ascending=False).reset_index()
        cat_breakdown = [{"category": row['Category'], "amount": float(row['Amount'])} for _, row in sales_cats.iterrows()]
    
    # Product-level breakdown (top 10 products by revenue)
    product_breakdown = []
    if 'Product' in df.columns:
        top_products = sales_df.groupby('Product').agg(
            revenue=('Amount', 'sum'),
            quantity=('Quantity', 'sum') if 'Quantity' in sales_df.columns else ('Amount', 'count'),
        ).sort_values('revenue', ascending=False).head(10).reset_index()
        
        product_breakdown = [
            {"product": row['Product'], "revenue": float(row['revenue']), "quantity": int(row.get('quantity', 0))}
            for _, row in top_products.iterrows()
        ]

    # 4. AI Forecasting (Linear Regression for each series)
    resampled_df['Date_Ordinal'] = resampled_df['Date'].map(datetime.toordinal)
    
    def get_forecast(series_name, periods=8):
        y = resampled_df[series_name].values
        X = resampled_df[['Date_Ordinal']].values
        if len(y[y != 0]) < 2: return [float(y[-1] if len(y) > 0 else 0)] * periods, 0
        
        model = LinearRegression()
        model.fit(X, y)
        
        delta = {'D': 1, 'W': 7, 'M': 30, 'Q': 90, '6M': 180, 'Y': 365}[freq]
        last_date = resampled_df['Date'].max()
        future_dates = [last_date + pd.Timedelta(days=delta * (i+1)) for i in range(periods)]
        future_ordinals = np.array([d.toordinal() for d in future_dates]).reshape(-1, 1)
        
        preds = model.predict(future_ordinals)
        
        period = {'W': 4, 'D': 30, 'M': 6, 'Q': 4, '6M': 2, 'Y': 1}.get(freq, 4)
        amplitude = np.std(y) * 0.2 if len(y) > 0 and np.std(y) > 0 else (np.mean(y) * 0.1 if len(y) > 0 else 100)
        
        real_preds = []
        for i, v in enumerate(preds):
            seasonal = amplitude * np.sin(2 * np.pi * (i + len(y)) / period)
            noise = (np.random.random() - 0.5) * amplitude * 0.5
            real_preds.append(max(0, float(v + seasonal + noise)))

        return [{"date": d.strftime('%Y-%m-%d'), "value": v} for d, v in zip(future_dates, real_preds)], model.coef_[0]

    sales_forecast, sales_slope = get_forecast('Sales')
    exp_forecast, _ = get_forecast('Expenses')
    profit_forecast, _ = get_forecast('Profit')

    # 5. Raw Data for Chart.js
    historical_data = [
        {
            "date": d.strftime('%Y-%m-%d'), 
            "sales": float(s), 
            "expenses": float(e),
            "profit": float(p)
        } 
        for d, s, e, p in zip(resampled_df['Date'], resampled_df['Sales'], resampled_df['Expenses'], resampled_df['Profit'])
    ]

    # Insights
    delta_days = {'D': 1, 'W': 7, 'M': 30, 'Q': 90, '6M': 180, 'Y': 365}.get(freq, 7)
    insights = []
    if sales_slope > 0:
        insights.append(f"✔ Sales Trend: Growing at ₹{int(sales_slope * delta_days)} per period")
    else:
        insights.append(f"⚠ Sales Trend: Declining at ₹{int(abs(sales_slope * delta_days))} per period")

    total_sales = resampled_df['Sales'].sum()
    total_expenses = resampled_df['Expenses'].sum()
    total_profit = resampled_df['Profit'].sum()
    total_cogs = float(resampled_df['COGS'].sum()) if has_cogs else None

    # Additional insights from rich data
    if has_cogs and total_cogs:
        gross_margin = ((total_sales - total_cogs) / total_sales * 100) if total_sales > 0 else 0
        insights.append(f"📦 Gross Margin (COGS-based): {gross_margin:.1f}%")
    
    if total_profit > 0 and total_sales > 0:
        net_margin = total_profit / total_sales * 100
        insights.append(f"💰 Net Profit Margin: {net_margin:.1f}%")
    
    if product_breakdown:
        top = product_breakdown[0]
        insights.append(f"🏆 Top Product: {top['product']} (₹{int(top['revenue'])} revenue)")

    result = {
        "total_stats": {
            "sales": float(total_sales),
            "expenses": float(total_expenses),
            "profit": float(total_profit),
            "margin": float(total_profit / total_sales * 100) if total_sales > 0 else 0
        },
        "historical": historical_data,
        "forecast": {
            "sales": sales_forecast,
            "expenses": exp_forecast,
            "profit": profit_forecast
        },
        "category_breakdown": cat_breakdown,
        "insights": insights
    }
    
    # Add COGS and product breakdown if available
    if total_cogs is not None:
        result["total_stats"]["cogs"] = total_cogs
    if product_breakdown:
        result["product_breakdown"] = product_breakdown

    return result

if __name__ == "__main__":
    # Test run
    # result = run_analysis("sales_data.csv")
    pass
