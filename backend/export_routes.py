from flask import Blueprint, request, jsonify, send_file, current_app
from models import db, Transaction, Business, User, BusinessMember
from business import get_user_id, get_member_role
from sqlalchemy import func
from datetime import datetime, timedelta
import io
import csv
import pandas as pd
from fpdf import FPDF
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import os
import tempfile
from extensions import mail


export_bp = Blueprint("export", __name__)


def _get_auth(req):
    """Extract user_id from Authorization header."""
    auth = req.headers.get("Authorization")
    if not auth:
        return None, None
    token = auth.split(" ")[1]
    user_id = get_user_id(token)
    return user_id, token


def _parse_dates(req):
    """Parse start_date and end_date from query params or JSON body."""
    if req.method == 'GET':
        start_str = req.args.get('start_date')
        end_str = req.args.get('end_date')
    else:
        data = req.get_json(silent=True) or {}
        start_str = data.get('start_date') or req.args.get('start_date')
        end_str = data.get('end_date') or req.args.get('end_date')

    start_date = datetime.strptime(start_str, '%Y-%m-%d') if start_str else None
    end_date = datetime.strptime(end_str, '%Y-%m-%d').replace(hour=23, minute=59, second=59) if end_str else None
    return start_date, end_date


def _fetch_transactions(business_id, start_date=None, end_date=None):
    """Fetch transactions with optional date filtering."""
    query = Transaction.query.filter_by(business_id=business_id)
    if start_date:
        query = query.filter(Transaction.timestamp >= start_date)
    if end_date:
        query = query.filter(Transaction.timestamp <= end_date)
    return query.order_by(Transaction.timestamp.desc()).all()


def _build_csv(transactions):
    """Generate CSV bytes from transactions."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Type', 'Category', 'Description', 'Amount', 'Quantity', 'Profit', 'COGS'])
    for t in transactions:
        writer.writerow([
            t.timestamp.strftime('%Y-%m-%d') if t.timestamp else '',
            t.type, t.category, t.description or '',
            t.amount, t.quantity, t.profit or 0, t.cogs or 0
        ])
    return output.getvalue().encode('utf-8')


def _build_excel(transactions, business_name, start_date, end_date):
    """Generate Excel bytes with multiple sheets."""
    sales = [t for t in transactions if t.type == 'Sale']
    expenses = [t for t in transactions if t.type == 'Expense']

    sales_df = pd.DataFrame([{
        "Date": t.timestamp.strftime('%Y-%m-%d') if t.timestamp else '',
        "Description": t.description or '',
        "Category": t.category or '',
        "Amount": t.amount,
        "Qty": t.quantity,
        "Profit": t.profit or 0
    } for t in sales]) if sales else pd.DataFrame(columns=["Date", "Description", "Category", "Amount", "Qty", "Profit"])

    expense_df = pd.DataFrame([{
        "Date": t.timestamp.strftime('%Y-%m-%d') if t.timestamp else '',
        "Description": t.description or '',
        "Category": t.category or '',
        "Amount": t.amount
    } for t in expenses]) if expenses else pd.DataFrame(columns=["Date", "Description", "Category", "Amount"])

    total_sales = sales_df['Amount'].sum() if not sales_df.empty else 0
    total_expenses = expense_df['Amount'].sum() if not expense_df.empty else 0
    total_profit = sum(t.profit or 0 for t in sales)
    net = total_sales - total_expenses

    date_range = ""
    if start_date and end_date:
        date_range = f"{start_date.strftime('%d %b %Y')} — {end_date.strftime('%d %b %Y')}"
    elif start_date:
        date_range = f"From {start_date.strftime('%d %b %Y')}"
    else:
        date_range = "All Time"

    summary_df = pd.DataFrame({
        "Metric": ["Business Name", "Date Range", "Total Sales", "Total Expenses", "Total Profit (from Sales)", "Net Profit", "Profit Margin %"],
        "Value": [business_name, date_range, f"₹{total_sales:,.2f}", f"₹{total_expenses:,.2f}", f"₹{total_profit:,.2f}", f"₹{net:,.2f}",
                  f"{round(net / total_sales * 100, 2) if total_sales > 0 else 0}%"]
    })

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        summary_df.to_excel(writer, sheet_name='Summary', index=False)
        sales_df.to_excel(writer, sheet_name='Sales', index=False)
        expense_df.to_excel(writer, sheet_name='Expenses', index=False)

        workbook = writer.book
        money_fmt = workbook.add_format({'num_format': '₹#,##0.00'})
        header_fmt = workbook.add_format({'bold': True, 'bg_color': '#3e8c4e', 'font_color': '#ffffff', 'border': 1})

        for sheet_name in writer.sheets:
            ws = writer.sheets[sheet_name]
            ws.set_column('A:G', 18)

    output.seek(0)
    return output.getvalue()


def _generate_chart(chart_type, transactions, business_name):
    """Generate a chart image and return the temp file path."""
    sales = [t for t in transactions if t.type == 'Sale']
    expenses = [t for t in transactions if t.type == 'Expense']

    # Group by month
    monthly = {}
    for t in transactions:
        if t.timestamp:
            month_key = t.timestamp.strftime('%Y-%m')
            if month_key not in monthly:
                monthly[month_key] = {'sales': 0, 'expenses': 0, 'profit': 0}
            if t.type == 'Sale':
                monthly[month_key]['sales'] += t.amount
                monthly[month_key]['profit'] += (t.profit or 0)
            else:
                monthly[month_key]['expenses'] += t.amount

    if not monthly:
        return None

    months = sorted(monthly.keys())
    sales_vals = [monthly[m]['sales'] for m in months]
    expense_vals = [monthly[m]['expenses'] for m in months]
    profit_vals = [monthly[m]['profit'] for m in months]
    month_labels = [datetime.strptime(m, '%Y-%m').strftime('%b %Y') for m in months]

    fig, ax = plt.subplots(figsize=(8, 4), dpi=120)
    fig.patch.set_facecolor('#f8fafc')
    ax.set_facecolor('#f8fafc')

    if chart_type == 'profit_loss':
        x = np.arange(len(month_labels))
        width = 0.35
        bars1 = ax.bar(x - width/2, sales_vals, width, label='Income', color='#3e8c4e')
        bars2 = ax.bar(x + width/2, expense_vals, width, label='Expenses', color='#ef4444')
        ax.set_title('Income vs Expenses', fontsize=14, fontweight='bold', pad=15)
        ax.set_xticks(x)
        ax.set_xticklabels(month_labels, rotation=45, ha='right', fontsize=8)
        ax.legend(frameon=False)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'₹{x:,.0f}'))

    elif chart_type == 'profit_trend':
        net_vals = [sales_vals[i] - expense_vals[i] for i in range(len(months))]
        ax.fill_between(month_labels, net_vals, alpha=0.15, color='#3e8c4e')
        ax.plot(month_labels, net_vals, color='#3e8c4e', linewidth=2.5, marker='o', markersize=5)
        ax.set_title('Net Profit Trend', fontsize=14, fontweight='bold', pad=15)
        ax.tick_params(axis='x', rotation=45, labelsize=8)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'₹{x:,.0f}'))

    elif chart_type == 'expense_breakdown':
        cat_totals = {}
        for t in expenses:
            cat = t.category or 'Other'
            cat_totals[cat] = cat_totals.get(cat, 0) + t.amount
        if cat_totals:
            colors = ['#3e8c4e', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
            categories = list(cat_totals.keys())
            values = list(cat_totals.values())
            ax.pie(values, labels=categories, autopct='%1.1f%%', startangle=90,
                   colors=colors[:len(categories)], textprops={'fontsize': 9})
            ax.set_title('Expense Breakdown', fontsize=14, fontweight='bold', pad=15)

    plt.tight_layout()
    tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    fig.savefig(tmp.name, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    return tmp.name


def _clean_text(text):
    """Sanitize text for PDF generation (Latin-1 compatible)."""
    if not text:
        return ""
    replacements = {
        '—': '-', '–': '-', '₹': 'Rs. ', '…': '...',
        '“': '"', '”': '"', '‘': "'", '’': "'"
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text.encode('latin-1', 'replace').decode('latin-1')


def _build_pdf(transactions, business, user, start_date, end_date):
    """Generate a chart-rich PDF report."""
    sales = [t for t in transactions if t.type == 'Sale']
    expenses = [t for t in transactions if t.type == 'Expense']
    total_sales = sum(t.amount for t in sales)
    total_expenses = sum(t.amount for t in expenses)
    total_profit = sum(t.profit or 0 for t in sales)
    net = total_sales - total_expenses

    date_range = "All Time"
    if start_date and end_date:
        date_range = f"{start_date.strftime('%d %b %Y')} - {end_date.strftime('%d %b %Y')}"
    elif start_date:
        date_range = f"From {start_date.strftime('%d %b %Y')}"

    class PDF(FPDF):
        def header(self):
            # Header Background
            self.set_fill_color(240, 253, 244) # Very light green bg
            self.rect(0, 0, 210, 40, 'F')
            
            self.set_xy(10, 10)
            self.set_font('Helvetica', 'B', 24)
            self.set_text_color(22, 101, 52)  # Dark green
            self.cell(0, 10, 'FINANCIAL REPORT', 0, 1, 'L')
            
            self.set_font('Helvetica', '', 10)
            self.set_text_color(100)
            self.cell(0, 6, f'Generated on {datetime.now().strftime("%d %b %Y at %H:%M")}', 0, 1, 'L')
            
            # Right aligned Business Name in header
            self.set_xy(100, 10)
            self.set_font('Helvetica', 'B', 16)
            self.set_text_color(51, 65, 85) # Slate 700
            self.cell(100, 10, _clean_text(business.name), 0, 1, 'R')
            
            self.ln(20)

        def footer(self):
            self.set_y(-15)
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(160)
            self.cell(0, 10, f'Page {self.page_no()} | Confidential Financial Document', 0, 0, 'C')

    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Report Metadata
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(71, 85, 105) # Slate 600
    pdf.cell(40, 8, 'Report Period:', 0, 0)
    pdf.set_font('Helvetica', '', 12)
    pdf.cell(0, 8, date_range, 0, 1)
    
    if user:
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(40, 8, 'Exported By:', 0, 0)
        pdf.set_font('Helvetica', '', 12)
        pdf.cell(0, 8, f"{_clean_text(user.username)} ({user.email})", 0, 1)
    
    pdf.ln(10)

    # Executive Summary Box
    pdf.set_fill_color(248, 250, 252) # Slate 50
    pdf.rect(10, pdf.get_y(), 190, 50, 'F')
    pdf.set_draw_color(226, 232, 240)
    pdf.rect(10, pdf.get_y(), 190, 50, 'D')
    
    start_y = pdf.get_y() + 5
    pdf.set_xy(15, start_y)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 10, 'Executive Summary', 0, 1)
    
    # Metrics Grid
    metrics_y = pdf.get_y() + 2
    
    # Metric 1: Total Sales
    pdf.set_xy(15, metrics_y)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(100)
    pdf.cell(60, 6, 'Total Revenue', 0, 1)
    pdf.set_xy(15, metrics_y + 6)
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(22, 163, 74) # Green
    pdf.cell(60, 8, f'Rs. {total_sales:,.2f}', 0, 1)
    
    # Metric 2: Total Expenses
    pdf.set_xy(80, metrics_y)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(100)
    pdf.cell(60, 6, 'Total Expenses', 0, 1)
    pdf.set_xy(80, metrics_y + 6)
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(220, 38, 38) # Red
    pdf.cell(60, 8, f'Rs. {total_expenses:,.2f}', 0, 1)
    
    # Metric 3: Net Profit
    pdf.set_xy(145, metrics_y)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(100)
    pdf.cell(60, 6, 'Net Profit', 0, 1)
    pdf.set_xy(145, metrics_y + 6)
    pdf.set_font('Helvetica', 'B', 16)
    if net >= 0:
        pdf.set_text_color(22, 101, 52) # Dark Green
    else:
        pdf.set_text_color(185, 28, 28) # Dark Red
    pdf.cell(60, 8, f'Rs. {net:,.2f}', 0, 1)
    
    pdf.set_y(start_y + 45) # Move past summary box
    pdf.ln(5)

    # Charts Section
    chart_files = []
    
    # Income vs Expense Chart (Full Width)
    chart_path = _generate_chart('profit_loss', transactions, business.name)
    if chart_path:
        chart_files.append(chart_path)
        pdf.image(chart_path, x=10, w=190)
        pdf.ln(5)
    
    # Side by Side Charts
    trend_path = _generate_chart('profit_trend', transactions, business.name)
    breakdown_path = _generate_chart('expense_breakdown', transactions, business.name)
    
    if trend_path and breakdown_path:
        y_pos = pdf.get_y()
        # Check if enough space
        if y_pos > 200:
            pdf.add_page()
            y_pos = pdf.get_y()
            
        chart_files.extend([trend_path, breakdown_path])
        pdf.image(trend_path, x=10, y=y_pos, w=90)
        pdf.image(breakdown_path, x=105, y=y_pos, w=90)
        pdf.ln(70) # Height of charts
    elif trend_path:
         chart_files.append(trend_path)
         pdf.image(trend_path, x=10, w=190)
         pdf.ln(5)

    pdf.add_page()
    
    # Transaction Details Table
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 10, 'Transaction Details', 0, 1, 'L')
    pdf.ln(2)

    # Header
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_fill_color(22, 101, 52) 
    pdf.set_text_color(255)
    # Widths: Date, Type, Category, Desc, Amt, Qty, Profit
    col_widths = [25, 18, 30, 55, 25, 15, 22]
    headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Qty', 'Profit']
    
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 8, h, 0, 0, 'C', True)
    pdf.ln()

    # Rows
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(51, 65, 85)
    
    base_fill_color = (255, 255, 255)
    alt_fill_color = (248, 250, 252)

    for idx, t in enumerate(transactions[:300]): # Limit rows
        if pdf.get_y() > 270:
            pdf.add_page()
            # Re-print header
            pdf.set_font('Helvetica', 'B', 8)
            pdf.set_fill_color(22, 101, 52)
            pdf.set_text_color(255)
            for i, h in enumerate(headers):
                pdf.cell(col_widths[i], 8, h, 0, 0, 'C', True)
            pdf.ln()
            pdf.set_font('Helvetica', '', 8)
            pdf.set_text_color(51, 65, 85)

        # Row color
        fill = idx % 2 == 1
        if fill:
            pdf.set_fill_color(*alt_fill_color)
        else:
            pdf.set_fill_color(*base_fill_color)

        date_str = t.timestamp.strftime('%Y-%m-%d') if t.timestamp else ''
        desc = _clean_text(t.description or '')[:35]
        cat = _clean_text(t.category or '')[:18]
        
        pdf.cell(col_widths[0], 7, date_str, 0, 0, 'C', fill)
        pdf.cell(col_widths[1], 7, t.type or '', 0, 0, 'C', fill)
        pdf.cell(col_widths[2], 7, cat, 0, 0, 'L', fill)
        pdf.cell(col_widths[3], 7, desc, 0, 0, 'L', fill)
        pdf.cell(col_widths[4], 7, f'{t.amount:,.0f}', 0, 0, 'R', fill)
        pdf.cell(col_widths[5], 7, str(t.quantity or 1), 0, 0, 'C', fill)
        
        # Profit Color
        profit_val = t.profit or 0
        if profit_val < 0:
            pdf.set_text_color(220, 38, 38)
        else:
            pdf.set_text_color(51, 65, 85)
            
        pdf.cell(col_widths[6], 7, f'{profit_val:,.0f}', 0, 0, 'R', fill)
        
        # Reset text color
        pdf.set_text_color(51, 65, 85)
        pdf.ln()

    # Footer Notes
    pdf.ln(10)
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(100)
    pdf.multi_cell(0, 5, 'Note: "Rs." denotes Indian Rupees. This report is auto-generated. Please verify with physical receipts for tax purposes.')

    # Cleanup chart temp files
    for f in chart_files:
        try:
            os.unlink(f)
        except:
            pass

    return pdf.output()


# ──────────────────────────────────────────────────────
# DOWNLOAD ENDPOINT
# ──────────────────────────────────────────────────────
@export_bp.route("/businesses/<int:business_id>/export/transactions", methods=["GET"])
def export_transactions(business_id):
    user_id, _ = _get_auth(request)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    role = get_member_role(user_id, business_id)
    if not role:
        return jsonify({"error": "Forbidden"}), 403

    fmt = request.args.get('format', 'csv').lower()
    start_date, end_date = _parse_dates(request)
    transactions = _fetch_transactions(business_id, start_date, end_date)
    business = Business.query.get(business_id)
    user = User.query.get(user_id)

    if fmt == 'csv':
        data = _build_csv(transactions)
        return send_file(
            io.BytesIO(data),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'{business.name}_transactions_{datetime.now().strftime("%Y%m%d")}.csv'
        )
    elif fmt == 'excel':
        data = _build_excel(transactions, business.name, start_date, end_date)
        return send_file(
            io.BytesIO(data),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'{business.name}_report_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )
    elif fmt == 'pdf':
        data = _build_pdf(transactions, business, user, start_date, end_date)
        return send_file(
            io.BytesIO(data),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{business.name}_report_{datetime.now().strftime("%Y%m%d")}.pdf'
        )
    else:
        return jsonify({"error": "Invalid format. Use csv, excel, or pdf"}), 400


# ──────────────────────────────────────────────────────
# EMAIL ENDPOINT
# ──────────────────────────────────────────────────────
@export_bp.route("/businesses/<int:business_id>/export/email", methods=["POST"])
def email_report(business_id):
    try:
        from flask_mail import Message as MailMessage
        
        if not mail:
            return jsonify({"error": "Email service not configured"}), 500

        user_id, _ = _get_auth(request)
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        role = get_member_role(user_id, business_id)
        if not role:
            return jsonify({"error": "Forbidden"}), 403

        data = request.get_json()
        formats = data.get('formats', ['pdf'])
        if isinstance(formats, str):
            formats = [formats]
            
        start_date, end_date = _parse_dates(request)

        transactions = _fetch_transactions(business_id, start_date, end_date)
        business = Business.query.get(business_id)
        user = User.query.get(user_id)

        # Use the logged-in user's email
        recipient = user.email

        date_range = "All Time"
        if start_date and end_date:
            date_range = f"{start_date.strftime('%d %b %Y')} - {end_date.strftime('%d %b %Y')}"

        total_sales = sum(t.amount for t in transactions if t.type == 'Sale')
        total_expenses = sum(t.amount for t in transactions if t.type == 'Expense')
        net = total_sales - total_expenses

        # Build email
        fmt_str = ", ".join([f.upper() for f in formats])
        subject = f"[{business.name}] Financial Report ({fmt_str}) - {date_range}"
        body = f"""Hi {user.username},

Here are your financial reports for {business.name}.

📊 Report Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Period: {date_range}
Formats: {fmt_str}
Total Sales: Rs. {total_sales:,.2f}
Total Expenses: Rs. {total_expenses:,.2f}
Net Profit: Rs. {net:,.2f}
Transactions: {len(transactions)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Exported by: {user.username} ({user.email})

The detailed reports are attached to this email.

— BulkBins"""

        msg = MailMessage(
            subject=subject,
            recipients=[recipient],
            body=body
        )
        mail.send(msg)

        
        # Generate and attach files
        for fmt in formats:
            fmt = fmt.lower()
            if fmt == 'csv':
                file_data = _build_csv(transactions)
                filename = f'{business.name}_transactions.csv'
                mimetype = 'text/csv'
            elif fmt == 'excel':
                file_data = _build_excel(transactions, business.name, start_date, end_date)
                filename = f'{business.name}_report.xlsx'
                mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            else: # pdf or others
                file_data = _build_pdf(transactions, business, user, start_date, end_date)
                filename = f'{business.name}_report.pdf'
                mimetype = 'application/pdf'

            msg.attach(filename, mimetype, file_data)

        mail.send(msg)

        return jsonify({
            "message": f"Report sent successfully to {recipient}",
            "email": recipient
        }), 200

    except ImportError:
        return jsonify({"error": "Flask-Mail not installed"}), 500
    except Exception as e:
        print(f"❌ EMAIL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
