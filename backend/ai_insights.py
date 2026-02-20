from flask import Blueprint, request, jsonify, send_file, current_app
from models import db, Transaction, InventoryItem, Business 
from business import get_user_id, get_member_role, role_required
from sqlalchemy import func
from datetime import datetime, timedelta
import numpy as np
from sklearn.linear_model import LinearRegression
import os
import io
import pandas as pd
from fpdf import FPDF
from ai_forecaster import run_analysis

ai_bp = Blueprint("ai", __name__)

# Map User's 'Product' usage to InventoryItem
Product = InventoryItem

def predict_demand(series):
    """Predicts next 30 days demand using Linear Regression."""
    if len(series) < 2:
        return sum(series) * 1.05 # Fallback to flat growth
    
    X = np.array(range(len(series))).reshape(-1, 1)
    y = np.array(series)
    
    model = LinearRegression()
    model.fit(X, y)
    
    # Predict for the next period (same length as input)
    prediction = model.predict(np.array([[len(series)]]))
    return max(0, float(prediction[0]))

@ai_bp.route("/businesses/<int:business_id>/ai/dashboard", methods=["GET"])
def get_dashboard_stats(business_id):
    auth = request.headers.get("Authorization")
    if not auth:
        return jsonify({"error": "Unauthorized"}), 401

    token = auth.split(" ")[1]
    user_id = get_user_id(token)

    role = get_member_role(user_id, business_id)
    if not role:
        return jsonify({"error": "Forbidden"}), 403

    granularity = request.args.get("granularity", "monthly") # daily, weekly, monthly, quarterly, halfyearly, yearly, custom

    # Date Filtering
    end_date = datetime.utcnow()
    if granularity == 'daily':
        start_date = end_date - timedelta(days=1)
    elif granularity == 'weekly':
        start_date = end_date - timedelta(weeks=1)
    elif granularity == 'quarterly':
        start_date = end_date - timedelta(days=90)
    elif granularity == 'halfyearly':
        start_date = end_date - timedelta(days=182)
    elif granularity == 'yearly':
        start_date = end_date - timedelta(days=365)
    elif granularity == 'custom':
        custom_start = request.args.get('start_date')
        custom_end = request.args.get('end_date')
        if custom_start:
            start_date = datetime.strptime(custom_start, '%Y-%m-%d')
        else:
            start_date = end_date - timedelta(days=30)
        if custom_end:
            end_date = datetime.strptime(custom_end, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
    else: # monthly (default)
        start_date = end_date - timedelta(days=30)

    # 1. CORE STATS
    total_sales = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.business_id == business_id, 
        Transaction.type == "Sale",
        Transaction.timestamp >= start_date
    ).scalar() or 0

    # Total COGS
    total_cogs = db.session.query(func.sum(Transaction.cogs)).filter(
        Transaction.business_id == business_id, 
        Transaction.type == "Sale",
        Transaction.timestamp >= start_date
    ).scalar() or 0

    total_expenses = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.business_id == business_id, 
        Transaction.type == "Expense",
        Transaction.timestamp >= start_date
    ).scalar() or 0

    gross_profit = total_sales - total_cogs
    # Net Profit = Gross - Expenses
    net_profit = gross_profit - total_expenses
    
    # Recalculate if profit column is reliable?
    # db.session.query(func.sum(Transaction.profit))... should equal net_profit ideally.
    # We stick to calculated for consistency with user code style.

    # 2. RECENT PERFORMANCE
    today = datetime.now()
    first_of_this_month = today.replace(day=1)
    last_month_end = first_of_this_month - timedelta(days=1)
    first_of_last_month = last_month_end.replace(day=1)

    recent_sales = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Sale",
        Transaction.timestamp >= first_of_this_month
    ).scalar() or 0

    recent_expenses = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Expense",
        Transaction.timestamp >= first_of_this_month
    ).scalar() or 0

    last_month_sales = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Sale",
        Transaction.timestamp >= first_of_last_month,
        Transaction.timestamp <= last_month_end
    ).scalar() or 0

    last_month_expenses = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Expense",
        Transaction.timestamp >= first_of_last_month,
        Transaction.timestamp <= last_month_end
    ).scalar() or 0

    # 3. AI DEMAND FORECASTING (Linear Regression)
    # Get daily sales for the last 60 days to train the model
    sixty_days_ago = today - timedelta(days=60)
    daily_sales = db.session.query(
        func.date(Transaction.timestamp),
        func.sum(Transaction.amount)
    ).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Sale",
        Transaction.timestamp >= sixty_days_ago
    ).group_by(func.date(Transaction.timestamp)).order_by(func.date(Transaction.timestamp)).all()

    sales_series = [float(s[1]) for s in daily_sales]
    predicted_monthly_revenue = predict_demand(sales_series) * 30 if sales_series else 0

    # 4. REORDER RECOMMENDATIONS
    products = Product.query.filter_by(business_id=business_id).all()
    reorder_list = []
    
    for p in products:
        # Get weekly sales velocity for this product
        p_sales = db.session.query(func.sum(Transaction.quantity)).filter(
            Transaction.inventory_item_id == p.id,
            Transaction.type == "Sale",
            Transaction.timestamp >= (today - timedelta(days=28))
        ).scalar() or 0
        
        # Simple velocity: units per week
        vel = p_sales / 4
        predicted_demand_30d = vel * 4.3  # units needed for a month
        
        # Use stock_quantity instead of stock
        if p.stock_quantity < predicted_demand_30d or p.stock_quantity <= p.reorder_level:
            recommendation = int(max(0, predicted_demand_30d - p.stock_quantity) + (p.reorder_level * 1.5))
            if recommendation > 0:
                reorder_list.append({
                    "id": p.id,
                    "name": p.name,
                    "current_stock": p.stock_quantity,
                    "predicted_demand": round(predicted_demand_30d, 1),
                    "recommendation": recommendation,
                    "priority": "High" if p.stock_quantity <= p.reorder_level else "Medium"
                })

    # 5. AI SMART ALERTS (Level 2 & 3)
    alerts = []
    
    for p in products:
        # Get sales velocity (units/day)
        p_sales_28d = db.session.query(func.sum(Transaction.quantity)).filter(
            Transaction.inventory_item_id == p.id,
            Transaction.type == "Sale",
            Transaction.timestamp >= (today - timedelta(days=28))
        ).scalar() or 0
        
        velocity = p_sales_28d / 28
        # Using selling_price - cost_price (calculated profit margin)
        margin = (p.selling_price or 0) - (p.cost_price or 0)
        
        if velocity > 0:
            days_left = p.stock_quantity / velocity
            
            # CRITICAL: Stock out before lead time
            if days_left <= p.lead_time:
                lost_profit = velocity * margin * p.lead_time
                alerts.append({
                    "id": p.id,
                    "level": "Critical",
                    "title": f"Stock Out Risk: {p.name}",
                    "message": f"Expected stock out in {int(days_left)} days. Lead time is {p.lead_time} days.",
                    "impact": f"Est. Lost Profit: ₹{int(lost_profit)}",
                    "action": f"Reorder {int(velocity * 30)} units immediately.",
                    "color": "red"
                })
            
            # WARNING: Stock trending down fast
            elif days_left <= (p.lead_time * 2):
                alerts.append({
                    "id": p.id,
                    "level": "Warning",
                    "title": f"Low Stock Trend: {p.name}",
                    "message": f"Inventory dropping faster than average. ~{int(days_left)} days left.",
                    "action": "Plan reorder for next week.",
                    "color": "orange"
                })
        
        # INSIGHT: Low Margin items
        price = p.selling_price or 1
        if margin / price < 0.15 if price > 0 else False:
            alerts.append({
                "id": p.id,
                "level": "Insight",
                "title": "Margin Opportunity",
                "message": f"{p.name} has a low profit margin ({int(margin/price*100)}%).",
                "action": "Consider price adjustment or vendor negotiation.",
                "color": "blue"
            })

    # Global Profit Alert
    if net_profit < 0:
        alerts.append({
            "level": "Critical",
            "title": "Negative Net Profit",
            "message": "Monthly expenses are currently higher than revenue.",
            "color": "red"
        })

    # 6. PERIOD ANALYSIS (For Chart)
    period_analysis = []
    expense_series = [] # For expense forecasting

    if granularity == "daily":
        points = 7
        delta_unit = timedelta(days=1)
        label_fmt = "%a"
    elif granularity == "monthly":
        points = 6
        delta_unit = timedelta(days=30)
        label_fmt = "%b"
    elif granularity == "quarterly":
        points = 4
        delta_unit = timedelta(days=90)
        label_fmt = "Q"
    elif granularity == "halfyearly":
        points = 4
        delta_unit = timedelta(days=182)
        label_fmt = "H"
    elif granularity == "yearly":
        points = 3
        delta_unit = timedelta(days=365)
        label_fmt = "%Y"
    elif granularity == "custom":
        # For custom range, divide the range into ~6 equal segments
        custom_start = request.args.get('start_date')
        custom_end = request.args.get('end_date')
        c_start = datetime.strptime(custom_start, '%Y-%m-%d') if custom_start else today - timedelta(days=30)
        c_end = datetime.strptime(custom_end, '%Y-%m-%d') if custom_end else today
        total_days = max((c_end - c_start).days, 1)
        points = min(8, max(3, total_days // 7 + 1))
        delta_unit = timedelta(days=max(1, total_days // points))
        label_fmt = "%d %b"
    else: # weekly
        points = 4
        delta_unit = timedelta(weeks=1)
        label_fmt = "Week %w"

    for i in range(points):
        end_date = today - (delta_unit * (points - 1 - i))
        start_date = end_date - delta_unit
        
        p_sales = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.business_id == business_id, Transaction.type == "Sale",
            Transaction.timestamp > start_date, Transaction.timestamp <= end_date
        ).scalar() or 0
        
        p_expenses = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.business_id == business_id, Transaction.type == "Expense",
            Transaction.timestamp > start_date, Transaction.timestamp <= end_date
        ).scalar() or 0
        
        expense_series.append(float(p_expenses))

        label = end_date.strftime(label_fmt)
        if granularity == "weekly":
             label = f"Week {i+1}"
        elif granularity == "quarterly":
             label = f"Q{i+1}"
        elif granularity == "halfyearly":
             label = f"H{i+1}"
        
        period_analysis.append({
            "label": label,
            "revenue": float(p_sales),
            "expenses": float(p_expenses),
            "profit": float(p_sales - p_expenses)
        })

    # 7. EXPENSE BREAKDOWN (Category-wise)
    expense_breakdown = db.session.query(
        Transaction.category,
        func.sum(Transaction.amount)
    ).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Expense"
    ).group_by(Transaction.category).all()

    # 8. MONTHLY PROFIT TREND (Last 6 Months)
    monthly_profit_trend = []
    for i in range(5, -1, -1):
        m_start = (today.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        m_end = (m_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        m_sales = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.business_id == business_id, Transaction.type == "Sale",
            Transaction.timestamp >= m_start, Transaction.timestamp <= m_end
        ).scalar() or 0
        
        m_expenses = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.business_id == business_id, Transaction.type == "Expense",
            Transaction.timestamp >= m_start, Transaction.timestamp <= m_end
        ).scalar() or 0
        
        monthly_profit_trend.append({
            "month": m_start.strftime("%b"),
            "profit": float(m_sales - m_expenses)
        })

    # Expense forecast multiplier based on granularity
    if granularity == "daily":
        expense_multiplier = 30
    elif granularity == "weekly":
        expense_multiplier = 4.3
    elif granularity == "quarterly":
        expense_multiplier = 1 / 3
    elif granularity == "halfyearly":
        expense_multiplier = 1 / 6
    elif granularity == "yearly":
        expense_multiplier = 1 / 12
    else:  # monthly / custom
        expense_multiplier = 1

    predicted_monthly_expenses = predict_demand(expense_series) * expense_multiplier if expense_series else 0

    return jsonify({
        "total_sales": total_sales,
        "total_cogs": total_cogs,
        "gross_profit": gross_profit,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "prediction": {
            "amount": predicted_monthly_revenue,
            "expense_forecast": predicted_monthly_expenses,
            "confidence": "High (Linear Trend Analysis)" if len(sales_series) > 10 else "Low (Need more data)"
        },
        "reorder_recommendations": sorted(reorder_list, key=lambda x: x['priority'] == 'High', reverse=True)[:5],
        "alerts": alerts,
        "monthly_summary": {
            "this_month": {"sales": recent_sales, "expenses": recent_expenses, "profit": recent_sales - recent_expenses},
            "last_month": {"sales": last_month_sales, "expenses": last_month_expenses, "profit": last_month_sales - last_month_expenses},
            "growth": {
                "sales": ((recent_sales - last_month_sales) / last_month_sales * 100) if last_month_sales > 0 else 0,
                "profit": (((recent_sales-recent_expenses) - (last_month_sales-last_month_expenses)) / abs(last_month_sales-last_month_expenses) * 100) if abs(last_month_sales-last_month_expenses) > 0 else 0
            }
        },
        "weekly_analysis": period_analysis,
        "expense_breakdown": [{"category": c, "amount": float(a)} for c, a in expense_breakdown],
        "monthly_profit_trend": monthly_profit_trend,
        "product_performance": {
            "top_profitable": [
                {"name": n, "total_profit": float(tp)}
                for n, tp in db.session.query(
                    Product.name,
                    func.sum(Transaction.profit)
                ).join(Transaction, Transaction.inventory_item_id == Product.id).filter(
                    Product.business_id == business_id, Transaction.type == "Sale"
                ).group_by(Product.id).order_by(func.sum(Transaction.profit).desc()).limit(5).all()
            ],
            "low_stock": [
                {"name": n, "stock": s}
                for n, s in db.session.query(Product.name, Product.stock_quantity).filter(
                    Product.business_id == business_id, Product.stock_quantity <= Product.reorder_level
                ).all()
            ]
        }
    })

@ai_bp.route("/businesses/<int:business_id>/ai/csv-analysis", methods=["GET"])
def get_csv_analysis(business_id):
    auth = request.headers.get("Authorization")
    if not auth: return jsonify({"error": "Unauthorized"}), 401
    
    granularity = request.args.get("granularity", "weekly")
    start_date = request.args.get("startDate", None)
    end_date = request.args.get("endDate", None)
    
    # Check uploads in backend dir
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    backend_csv = os.path.join(backend_dir, f"sales_data_{business_id}.csv")
    
    file_path = backend_csv
    
    if not os.path.exists(file_path):
        return jsonify({"error": "No CSV file uploaded yet"}), 404
    
    result = run_analysis(file_path, granularity=granularity)
    
    # Read original filename from meta file
    meta_path = os.path.join(backend_dir, f"sales_data_{business_id}.meta")
    original_name = None
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as mf:
            original_name = mf.read().strip()
    result['filename'] = original_name or f"sales_data_{business_id}.csv"
    
    return jsonify(result)


@ai_bp.route("/businesses/<int:business_id>/ai/transaction-analysis", methods=["GET"])
def get_transaction_analysis(business_id):
    auth = request.headers.get("Authorization")
    if not auth: return jsonify({"error": "Unauthorized"}), 401

    granularity = request.args.get("granularity", "weekly")
    start_date = request.args.get("startDate", None)
    end_date = request.args.get("endDate", None)

    # Fetch all transactions from the database
    query = Transaction.query.filter_by(business_id=business_id)

    if start_date:
        try:
            query = query.filter(Transaction.timestamp >= datetime.strptime(start_date, '%Y-%m-%d'))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(Transaction.timestamp <= datetime.strptime(end_date, '%Y-%m-%d'))
        except ValueError:
            pass

    txns = query.order_by(Transaction.timestamp).all()

    if not txns:
        return jsonify({"error": "No transactions found"}), 404

    # Build a temporary CSV in memory from transactions
    import tempfile, csv
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='', encoding='utf-8')
    writer = csv.writer(tmp)
    writer.writerow(['Date', 'Type', 'Category', 'Amount'])
    for t in txns:
        writer.writerow([t.timestamp.strftime('%Y-%m-%d'), t.type, t.category or 'Others', t.amount])
    tmp.close()

    result = run_analysis(tmp.name, granularity=granularity)
    result['source'] = 'transactions'
    result['record_count'] = len(txns)

    # Clean up temp file
    try:
        os.unlink(tmp.name)
    except:
        pass

    return jsonify(result)

@ai_bp.route("/businesses/<int:business_id>/ai/export-data", methods=["GET"])
def export_ai_data(business_id):
    auth = request.headers.get("Authorization")
    if not auth: return jsonify({"error": "Unauthorized"}), 401

    results = db.session.query(
        Transaction.timestamp, Transaction.category, Product.name,
        Transaction.quantity, Transaction.amount, Transaction.cogs
    ).join(Product, Transaction.inventory_item_id == Product.id).filter(
        Transaction.business_id == business_id, Transaction.type == "Sale"
    ).order_by(Transaction.timestamp.asc()).all()

    data = [{
        "date": r[0].strftime("%Y-%m-%d"), 
        "category": r[1], 
        "product": r[2],
        "quantity": r[3], 
        "total_revenue": r[4], 
        "total_cogs": r[5],
        "unit_cogs": r[5]/r[3] if r[3] > 0 else 0,
        "total_profit": float(r[4] - r[5])
    } for r in results]

    return jsonify(data)

@ai_bp.route("/businesses/<int:business_id>/ai/export-report-excel", methods=["GET"])
def export_report_excel(business_id):
    auth = request.headers.get("Authorization")
    if not auth: return jsonify({"error": "Unauthorized"}), 401

    token = auth.split(" ")[1]
    user_id = get_user_id(token)
    role = get_member_role(user_id, business_id)
    if not role: return jsonify({"error": "Forbidden"}), 403

    # Fetch Data
    sales_tx = Transaction.query.filter_by(business_id=business_id, type='Sale').all()
    expense_tx = Transaction.query.filter_by(business_id=business_id, type='Expense').all()

    # Create DataFrames
    sales_df = pd.DataFrame([{
        "Date": t.timestamp,
        "Description": t.description,
        "Category": t.category,
        "Amount": t.amount,
        "Qty": t.quantity
    } for t in sales_tx])

    expense_df = pd.DataFrame([{
        "Date": t.timestamp,
        "Description": t.description,
        "Category": t.category,
        "Amount": t.amount
    } for t in expense_tx])

    # Summary Stats
    total_sales = sales_df['Amount'].sum() if not sales_df.empty else 0
    total_expenses = expense_df['Amount'].sum() if not expense_df.empty else 0
    summary_df = pd.DataFrame({
        "Metric": ["Total Sales", "Total Expenses", "Net Profit", "Profit Margin %"],
        "Value": [
            total_sales, 
            total_expenses, 
            total_sales - total_expenses,
            round((total_sales - total_expenses) / total_sales * 100, 2) if total_sales > 0 else 0
        ]
    })

    # Generate Excel in Memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        summary_df.to_excel(writer, sheet_name='Executive Summary', index=False)
        sales_df.to_excel(writer, sheet_name='Sales Records', index=False)
        expense_df.to_excel(writer, sheet_name='Expense Breakdown', index=False)

        # Formatting
        workbook = writer.book
        money_fmt = workbook.add_format({'num_format': '₹#,##0.00'})
        
        for sheet_name in writer.sheets:
            worksheet = writer.sheets[sheet_name]
            worksheet.set_column('A:E', 18)
            if sheet_name == 'Executive Summary':
                worksheet.set_column('B:B', 20, money_fmt)
            else:
                worksheet.set_column('D:D', 20, money_fmt)

    output.seek(0)
    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f"Financial_Report_{datetime.now().strftime('%Y%m%d')}.xlsx"
    )

@ai_bp.route("/businesses/<int:business_id>/ai/export-report-pdf", methods=["GET"])
def export_report_pdf(business_id):
    try:
        auth = request.headers.get("Authorization")
        if not auth: return jsonify({"error": "Unauthorized"}), 401

        token = auth.split(" ")[1]
        user_id = get_user_id(token)
        role = get_member_role(user_id, business_id)
        if not role: return jsonify({"error": "Forbidden"}), 403

        business = Business.query.get(business_id)
        if not business: return jsonify({"error": "Business not found"}), 404
        
        # Financial Stats
        total_sales = db.session.query(func.sum(Transaction.amount)).filter_by(business_id=business_id, type='Sale').scalar() or 0
        total_expenses = db.session.query(func.sum(Transaction.amount)).filter_by(business_id=business_id, type='Expense').scalar() or 0
        net_profit = total_sales - total_expenses
        
        # Category breakdown for PDF
        expenses = db.session.query(Transaction.category, func.sum(Transaction.amount)).filter_by(business_id=business_id, type='Expense').group_by(Transaction.category).all()

        class PDF(FPDF):
            def header(self):
                self.set_font('Helvetica', 'B', 20)
                self.set_text_color(79, 70, 229) # Indigo
                self.cell(0, 10, 'CraftLedger Business Report', 0, 1, 'C')
                self.set_font('Helvetica', '', 10)
                self.set_text_color(100)
                self.cell(0, 5, f'Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M")}', 0, 1, 'C')
                self.ln(10)

            def footer(self):
                self.set_y(-15)
                self.set_font('Helvetica', 'I', 8)
                self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

        pdf = PDF()
        pdf.add_page()
        
        # Business Summary
        pdf.set_font('Helvetica', 'B', 16)
        pdf.set_text_color(0)
        safe_name = business.name.encode('latin-1', 'replace').decode('latin-1')
        pdf.cell(0, 10, f'Business: {safe_name}', 0, 1, 'L')
        pdf.ln(5)

        # Key Performance Indicators
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 10, 'Executive Financial Summary', 0, 1, 'L')
        
        pdf.set_font('Helvetica', '', 11)
        pdf.cell(90, 8, 'Total Sales Revenue:', 1)
        pdf.cell(0, 8, f'INR {total_sales:,.2f}', 1, 1)
        
        pdf.cell(90, 8, 'Total Operating Expenses:', 1)
        pdf.cell(0, 8, f'INR {total_expenses:,.2f}', 1, 1)
        
        pdf.set_font('Helvetica', 'B', 11)
        pdf.cell(90, 8, 'Net Profit:', 1)
        pdf.cell(0, 8, f'INR {net_profit:,.2f}', 1, 1)
        pdf.ln(10)

        # Expense Breakdown Table
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(0, 10, 'Expense breakdown by Category', 0, 1, 'L')
        
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(90, 8, 'Category', 1, 0, 'C', True)
        pdf.cell(0, 8, 'Amount', 1, 1, 'C', True)
        
        pdf.set_font('Helvetica', '', 11)
        for cat, amt in expenses:
            safe_cat = cat.encode('latin-1', 'replace').decode('latin-1') if cat else "N/A"
            pdf.cell(90, 8, safe_cat, 1)
            pdf.cell(0, 8, f'INR {amt:,.2f}', 1, 1)

        pdf.ln(10)
        
        pdf.set_font('Helvetica', 'I', 10)
        pdf.set_text_color(79, 70, 229)
        pdf.multi_cell(0, 5, "Confidential AI-Generated Report. This analysis factors in historical performance and current market trends to provide an accurate business health assessment.")

        pdf_bytes = pdf.output()
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"Business_Performance_{datetime.now().strftime('%Y%m%d')}.pdf"
        )
    except Exception as e:
        print(f"❌ PDF EXPORT ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@ai_bp.route("/businesses/<int:business_id>/ai/advanced-analytics", methods=["GET"])
@role_required(['Owner', 'Accountant', 'Analyst'])
def get_advanced_analytics(business_id):
    # Fetch Daily Trends (Last 30 Days)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    daily_txns = db.session.query(
        func.date(Transaction.timestamp).label('date'),
        Transaction.type,
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.business_id == business_id,
        Transaction.timestamp >= start_date,
        Transaction.timestamp <= end_date
    ).group_by(
        func.date(Transaction.timestamp), 
        Transaction.type
    ).all()
    
    daily_data = {}
    for date_str, txn_type, amount in daily_txns:
        if date_str not in daily_data:
            daily_data[date_str] = {"date": date_str, "sales": 0, "expenses": 0}
        
        if txn_type == 'Sale':
            daily_data[date_str]["sales"] = float(amount)
        else:
            daily_data[date_str]["expenses"] = float(amount)
            
    sorted_daily = sorted(daily_data.values(), key=lambda x: x['date'])
    
    # Category Breakdown
    cat_txns = db.session.query(
        Transaction.category,
        Transaction.type,
        func.sum(Transaction.amount)
    ).filter(
        Transaction.business_id == business_id
    ).group_by(
        Transaction.category,
        Transaction.type
    ).all()
    
    sales_by_cat = []
    expenses_by_cat = []
    
    for cat, txn_type, amount in cat_txns:
        entry = {"name": cat, "value": float(amount)}
        if txn_type == 'Sale':
            sales_by_cat.append(entry)
        else:
            expenses_by_cat.append(entry)
            
    return jsonify({
        "daily_trends": sorted_daily,
        "sales_by_category": sorted(sales_by_cat, key=lambda x: x['value'], reverse=True),
        "expenses_by_category": sorted(expenses_by_cat, key=lambda x: x['value'], reverse=True)
    }), 200
