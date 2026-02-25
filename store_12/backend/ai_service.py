import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from datetime import datetime, timedelta
import json

# Pre-defined categories for classification
EXPENSE_CATEGORIES = ["Rent", "Utilities", "Inventory", "Salaries", "Marketing", "Others"]

class BulkBinsAIService:
    def __init__(self):
        self.classifier = self._initialize_classifier()

    def _initialize_classifier(self):
        # Basic training data for bootstrap
        data = [
            ("Monthly store rent payment", "Rent"),
            ("Electricity bill for January", "Utilities"),
            ("Water and sewage bill", "Utilities"),
            ("Bulk purchase of groceries", "Inventory"),
            ("Buying milk and bread for stock", "Inventory"),
            ("Salary payment for staff", "Salaries"),
            ("Employee monthly wages", "Salaries"),
            ("Google Ads campaign", "Marketing"),
            ("Facebook promotion", "Marketing"),
            ("Office supplies and stationery", "Others"),
            ("Cleaning services", "Others")
        ]
        X, y = zip(*data)
        
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer()),
            ('clf', LogisticRegression())
        ])
        
        pipeline.fit(X, y)
        return pipeline

    def classify_expense(self, description):
        if not description:
            return "Others"
        
        prediction = self.classifier.predict([description])[0]
        # Get probability to check confidence (optional)
        probs = self.classifier.predict_proba([description])[0]
        confidence = np.max(probs)
        
        return prediction if confidence > 0.4 else "Others"

    def predict_profit(self, transactions):
        """
        Simple linear prediction based on daily profit history.
        Expects a list of transaction objects/dicts.
        """
        if not transactions:
            return {"7_day": 0, "30_day": 0, "confidence": "Low", "amount": 0, "expense_forecast": 0}

        df = pd.DataFrame([{
            'date': datetime.fromisoformat(t['timestamp']).date(),
            'amount': t.get('profit', t.get('amount', 0) if t.get('type') == 'Sale' else -t.get('amount', 0)),
            'type': t.get('type', 'Sale'),
            'val': t.get('amount', 0)
        } for t in transactions])

        if df.empty:
             return {"7_day": 0, "30_day": 0, "confidence": "Low", "amount": 0, "expense_forecast": 0}

        # Normalize types for robust filtering
        df['type_lower'] = df['type'].str.lower()
        daily_profit = df.groupby('date')['amount'].sum().reset_index()
        
        # Expense Forecast (Case-insensitive)
        daily_expense = df[df['type_lower'] == 'expense'].groupby('date')['val'].sum().reset_index()
        avg_expense = daily_expense['val'].mean() if not daily_expense.empty else 0
        expense_forecast = avg_expense * 30

        if len(daily_profit) < 2:
            avg = daily_profit['amount'].mean() if not daily_profit.empty else 0
            return {
                "7_day": round(avg * 7, 2),
                "30_day": round(avg * 30, 2),
                "confidence": "Low",
                "amount": round(avg * 30, 2),
                 "expense_forecast": round(expense_forecast, 2)
            }

        # Simple linear fit
        daily_profit['day_num'] = (pd.to_datetime(daily_profit['date']) - pd.to_datetime(daily_profit['date'].min())).dt.days
        z = np.polyfit(daily_profit['day_num'], daily_profit['amount'], 1)
        p = np.poly1d(z)
        
        # Calculate R-squared for confidence
        y_pred = p(daily_profit['day_num'])
        y_true = daily_profit['amount']
        correlation_matrix = np.corrcoef(y_true, y_pred)
        correlation_xy = correlation_matrix[0,1]
        r_squared = correlation_xy**2
        
        confidence = "High" if r_squared > 0.7 else "Medium" if r_squared > 0.4 else "Low"

        last_day = daily_profit['day_num'].max()
        pred_7 = sum(p(last_day + i) for i in range(1, 8))
        pred_30 = sum(p(last_day + i) for i in range(1, 31))

        return {
            "7_day": round(max(0, pred_7), 2),
            "30_day": round(max(0, pred_30), 2),
            "confidence": confidence,
            "amount": round(max(0, pred_30), 2),
            "expense_forecast": round(expense_forecast, 2)
        }

    def get_demand_forecast(self, item_id, transactions):
        """
        Predict next 7 and 30 day quantity demand for a specific item.
        Includes a simple seasonality heuristic (weekend vs weekday).
        """
        if not transactions:
            return {"7_day": 0, "30_day": 0, "velocity": 0, "predicted_demand": 0}

        # Filter sales for this item
        item_sales = [t for t in transactions if t.get('inventory_item_id') == item_id and t.get('type') == 'Sale']
        if not item_sales:
            return {"7_day": 0, "30_day": 0, "velocity": 0, "predicted_demand": 0}

        df = pd.DataFrame([{
            'date': datetime.fromisoformat(t['timestamp']).date(),
            'weekday': datetime.fromisoformat(t['timestamp']).weekday(), # 0-6
            'quantity': t.get('quantity', 1)
        } for t in item_sales])

        daily_qty = df.groupby(['date', 'weekday'])['quantity'].sum().reset_index()
        
        # Velocity calculation (avg daily sales over last 30 active days)
        velocity = daily_qty['quantity'].mean()
        
        if len(daily_qty) < 2:
            val = round(velocity * 30, 2)
            return {"7_day": round(velocity * 7, 2), "30_day": val, "velocity": round(velocity, 2), "predicted_demand": val}

        # Simple Trend/Linear Fit
        daily_qty['day_num'] = (pd.to_datetime(daily_qty['date']) - pd.to_datetime(daily_qty['date'].min())).dt.days
        z = np.polyfit(daily_qty['day_num'], daily_qty['quantity'], 1)
        p = np.poly1d(z)

        last_day = daily_qty['day_num'].max()
        pred_7 = sum(p(last_day + i) for i in range(1, 8))
        pred_30 = sum(p(last_day + i) for i in range(1, 31))

        # Adjust for weekend seasonality (if weekends usually have 30% more volume)
        weekend_mult = 1.3
        predicted_days = [datetime.now().date() + timedelta(days=i) for i in range(1, 31)]
        pred_30_seasonal = 0
        for i, dt in enumerate(predicted_days):
            day_val = p(last_day + i + 1)
            if dt.weekday() >= 5: # Sat/Sun
                day_val *= weekend_mult
            pred_30_seasonal += max(0, day_val)
            
        final_30 = max(0, round(pred_30_seasonal, 2))

        return {
            "7_day": max(0, round(pred_7, 2)),
            "30_day": final_30,
            "velocity": round(velocity, 2),
            "predicted_demand": final_30
        }

    def recommend_reorders(self, inventory_items, transactions):
        """
        Calculates optimal reorder quantities and categorizes urgency based on financial risk.
        Categories: 'Critical', 'Warning', 'Insight'
        """
        recommendations = []
        profit_insights = self.get_profitability_insights(inventory_items, transactions)
        
        for item in inventory_items:
            forecast = self.get_demand_forecast(item['id'], transactions)
            daily_demand = forecast['30_day'] / 30
            lead_time = item.get('lead_time', 1)
            current_qty = item['stock_quantity']
            
            # Predictive Metrics
            days_to_stockout = current_qty / daily_demand if daily_demand > 0 else 999
            
            # Fetch profitability for this item
            item_profit = next((i for i in profit_insights if i['id'] == item['id']), {"margin": 0, "is_star": False, "total_profit": 0})
            avg_daily_profit = (item_profit['total_profit'] / 30) if daily_demand > 0 else 0
            
            # Estimated Lost Profit if we don't reorder now
            lost_profit = 0
            if days_to_stockout < lead_time and daily_demand > 0:
                lost_profit = avg_daily_profit * (lead_time - days_to_stockout)

            status = "Optimal"
            reason = "Stock levels healthy"
            category = "Insight"
            priority = "Low"
            
            # 1. Critical: High margin/velocity + stockout before delivery
            if daily_demand > 0 and days_to_stockout <= lead_time:
                status = "Critical"
                category = "Critical"
                priority = "High"
                reason = f"Stockout in {int(days_to_stockout)}d. Risk: ₹{int(lost_profit)} loss."
            
            # 2. Warning: Trending down faster than usual or approaching ROP
            elif current_qty <= (daily_demand * (lead_time + 3)): # Safety Stock buffer
                status = "Warning"
                category = "Warning"
                priority = "Medium"
                reason = f"Depleting fast. Predict stockout in {int(days_to_stockout)} days."
            
            # 3. Insight: Slow movers or overstock
            elif daily_demand < 0.1 and current_qty > 0:
                status = "Slow Mover"
                category = "Insight"
                reason = "Low velocity. Capital tied up in stock."
            elif current_qty > (daily_demand * 90): # > 3 months of stock
                status = "Overstock"
                category = "Insight"
                reason = "Excessive inventory. Consider discount."

            if status != "Optimal":
                # Goal: 30 days of supply
                target_stock = daily_demand * 30
                rec_qty = max(0, target_stock - current_qty)
                
                if rec_qty > 0:
                    recommendations.append({
                        "name": item['name'],
                        "current_stock": current_qty,
                        "recommendation": int(np.ceil(rec_qty)),
                        "priority": priority,
                        "predicted_demand": int(forecast['30_day']),
                        "status": status,
                        "reason": reason,
                        "days_to_stockout": round(days_to_stockout, 1),
                        "lost_profit_risk": round(lost_profit, 2),
                        "category": category
                    })
        
        # Sort by urgency
        return sorted(recommendations, key=lambda x: (x['priority'] == 'High', x['priority'] == 'Medium'), reverse=True)

    def get_profitability_insights(self, inventory_items, transactions):
        """
        Identifies 'Profit Stars' - items with high margin and high sales volume.
        """
        if not transactions:
            return []

        # Ensure we have required keys in the dictionaries
        safe_txns = []
        for t in transactions:
            if t.get('type') == 'Sale':
                safe_txns.append({
                    'inventory_item_id': t.get('inventory_item_id'),
                    'profit': t.get('profit', 0) or 0,
                    'quantity': t.get('quantity', 0) or 0,
                    'amount': t.get('amount', 0) or 0
                })

        df = pd.DataFrame(safe_txns)
        if df.empty:
            return []

        # Aggregate profit by item
        item_stats = df.groupby('inventory_item_id').agg({
            'profit': 'sum',
            'quantity': 'sum',
            'amount': 'sum'
        }).reset_index()

        # Map names and calculate margin
        insights = []
        for _, row in item_stats.iterrows():
            item = next((i for i in inventory_items if i['id'] == row['inventory_item_id']), None)
            if item:
                margin = (row['profit'] / row['amount'] * 100) if row['amount'] > 0 else 0
                is_star = bool(margin > 20 and row['quantity'] >= item_stats['quantity'].quantile(0.7))
                insights.append({
                    "id": item['id'],
                    "name": item['name'],
                    "total_profit": float(row['profit']),
                    "volume": int(row['quantity']),
                    "margin": round(margin, 2),
                    "is_star": is_star
                })

        return sorted(insights, key=lambda x: x['total_profit'], reverse=True)

    def get_dashboard_stats(self, transactions, inventory_items, granularity='weekly'):
        """
        Aggregates all data for the high-fidelity dashboard.
        """
        if not transactions:
            return {
                "total_sales": 0, "total_cogs": 0, "gross_profit": 0, "total_expenses": 0, "net_profit": 0,
                "prediction": {"amount": 0, "confidence": "Low", "expense_forecast": 0},
                "reorder_recommendations": [], "alerts": [], "weekly_analysis": [], "expense_breakdown": [],
                "monthly_profit_trend": [], "monthly_summary": {}, "product_performance": {}
            }

        # 1. Basic Totals
        sales_txns = [t for t in transactions if t.get('type') == 'Sale']
        expense_txns = [t for t in transactions if t.get('type') == 'Expense']

        total_sales = sum(t.get('amount', 0) for t in sales_txns)
        total_expenses = sum(t.get('amount', 0) for t in expense_txns)
        
        # Calculate COGS (approximate if cost_price is missing)
        total_cogs = 0
        for t in sales_txns:
            item = next((i for i in inventory_items if i['id'] == t.get('inventory_item_id')), None)
            if item:
                cost = item.get('cost_price', 0)
                qty = t.get('quantity', 1)
                total_cogs += cost * qty
        
        gross_profit = total_sales - total_cogs
        net_profit = total_sales - total_expenses

        # 2. Predictions & Recommendations
        prediction = self.predict_profit(transactions)
        reorders = self.recommend_reorders(inventory_items, transactions)
        
        # 3. Time Series Analysis
        df = pd.DataFrame([{
            'date': datetime.fromisoformat(t['timestamp']).date(),
            'amount': t.get('amount', 0),
            'type': t.get('type'),
            'category': t.get('category', 'Others')
        } for t in transactions])

        # Weekly/Daily Analysis based on granularity
        # For simplicity, we'll return last 7 units of time (days or weeks)
        # But frontend expects "weekly_analysis" specifically for the chart
        # Let's give last 7 weeks
        df['date'] = pd.to_datetime(df['date'])
        df['week_start'] = df['date'].dt.to_period('W').apply(lambda r: r.start_time)
        
        weekly_stats = df.groupby(['week_start', 'type'])['amount'].sum().reset_index()
        weeks = sorted(weekly_stats['week_start'].unique())[-8:] # Last 8 weeks
        
        weekly_analysis = []
        for w in weeks:
            w_sales = weekly_stats[(weekly_stats['week_start'] == w) & (weekly_stats['type'] == 'Sale')]['amount'].sum()
            w_exp = weekly_stats[(weekly_stats['week_start'] == w) & (weekly_stats['type'] == 'Expense')]['amount'].sum()
            weekly_analysis.append({
                "label": w.strftime('%d %b'),
                "revenue": float(w_sales),
                "expenses": float(w_exp),
                "profit": float(w_sales - w_exp)
            })

        # 4. Expense Breakdown
        expense_breakdown = []
        if not df[df['type'] == 'Expense'].empty:
            exp_by_cat = df[df['type'] == 'Expense'].groupby('category')['amount'].sum().reset_index()
            expense_breakdown = [
                {"category": r['category'], "amount": float(r['amount'])} 
                for _, r in exp_by_cat.iterrows()
            ]

        # 5. Monthly Trend
        df['month'] = df['date'].dt.strftime('%b')
        df['year_month'] = df['date'].dt.to_period('M')
        monthly_stats = df.groupby(['year_month', 'type'])['amount'].sum().reset_index()
        months = sorted(monthly_stats['year_month'].unique())[-6:] # Last 6 months
        
        monthly_profit_trend = []
        for m in months:
            m_sales = monthly_stats[(monthly_stats['year_month'] == m) & (monthly_stats['type'] == 'Sale')]['amount'].sum()
            m_exp = monthly_stats[(monthly_stats['year_month'] == m) & (monthly_stats['type'] == 'Expense')]['amount'].sum()
            monthly_profit_trend.append({
                "month": m.strftime('%b'),
                "profit": float(m_sales - m_exp)
            })
            
        # 6. Monthly Summary (This vs Last Month)
        current_month = datetime.now().strftime('%Y-%m')
        last_month = (datetime.now().replace(day=1) - timedelta(days=1)).strftime('%Y-%m')
        
        def get_month_totals(ym_str):
            # df['year_month'] is period, convert string to period
            try:
                p = pd.Period(ym_str, freq='M')
                m_data = monthly_stats[monthly_stats['year_month'] == p]
                s = m_data[m_data['type'] == 'Sale']['amount'].sum()
                e = m_data[m_data['type'] == 'Expense']['amount'].sum()
                return {"sales": float(s), "expenses": float(e), "profit": float(s - e)}
            except:
                return {"sales": 0, "expenses": 0, "profit": 0}

        this_m = get_month_totals(current_month)
        last_m = get_month_totals(last_month)
        
        sales_growth = ((this_m['sales'] - last_m['sales']) / last_m['sales'] * 100) if last_m['sales'] > 0 else 0
        profit_growth = ((this_m['profit'] - last_m['profit']) / last_m['profit'] * 100) if last_m['profit'] > 0 else 0

        # 7. Alerts
        alerts = []
        # Cashflow Alert
        if net_profit < 0:
            alerts.append({
                "level": "Critical",
                "title": "Cash Flow Alert",
                "message": "Expenses exceed revenue. Immediate cost cutting required.",
                "action": "Audit Expenses",
                "impact": f"-₹{abs(int(net_profit))}"
            })
        elif (total_expenses / total_sales) > 0.8 if total_sales > 0 else False:
             alerts.append({
                "level": "Warning",
                "title": "High Burn Rate",
                "message": "Expenses are consumed 80%+ of revenue.",
                "action": "Review Efficiency",
                "impact": "Low Margin"
            })
            
        # Inventory Alerts
        crit_stock = [r for r in reorders if r['category'] == 'Critical']
        if crit_stock:
            alerts.append({
                "level": "Critical",
                "title": "Stockout Risk",
                "message": f"{len(crit_stock)} high-value items are about to run out.",
                "action": "Restock Now",
                "impact": "Lost Sales"
            })

        # Product Performance
        profit_insights = self.get_profitability_insights(inventory_items, transactions)
        
        return {
            "total_sales": round(total_sales, 2),
            "total_cogs": round(total_cogs, 2),
            "gross_profit": round(gross_profit, 2),
            "total_expenses": round(total_expenses, 2),
            "net_profit": round(net_profit, 2),
            "prediction": prediction,
            "reorder_recommendations": reorders[:5], # Top 5
            "alerts": alerts,
            "weekly_analysis": weekly_analysis,
            "expense_breakdown": sorted(expense_breakdown, key=lambda x: x['amount'], reverse=True),
            "monthly_profit_trend": monthly_profit_trend,
            "monthly_summary": {
                "this_month": this_m,
                "last_month": last_m,
                "growth": {"sales": round(sales_growth, 1), "profit": round(profit_growth, 1)}
            },
            "product_performance": {
                "top_profitable": profit_insights[:5],
                "low_stock": [i for i in inventory_items if i['stock_quantity'] < 10], # Simple threshold
                "low_margin": [p for p in profit_insights if p['margin'] < 15]
            }
        }



ai_service = BulkBinsAIService()
