import streamlit as st
import pandas as pd
import sqlite3
import os
import plotly.express as px

# Setup
st.set_page_config(page_title="BulkBins Analytics", layout="wide")
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, "bulkbins.db")

def load_data():
    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query("SELECT * FROM \"transaction\"", conn)
    conn.close()
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    return df

st.title("📊 BulkBins Business Intelligence")
st.markdown("---")

try:
    if not os.path.exists(db_path):
        st.error(f"Database not found at {db_path}")
    else:
        df = load_data()
        
        # Sidebar Filters
        st.sidebar.header("🔍 Filters")
        businesses = df['business_id'].unique()
        selected_biz = st.sidebar.selectbox("Select Business ID", businesses)
        
        mask = df['business_id'] == selected_biz
        biz_df = df[mask]
        
        # Dashboard Grid
        col1, col2, col3 = st.columns(3)
        
        sales = biz_df[biz_df['type'] == 'Sale']['amount'].sum()
        expenses = biz_df[biz_df['type'] == 'Expense']['amount'].sum()
        profit = sales - expenses
        
        col1.metric("Total Revenue", f"₹{sales:,.2f}")
        col2.metric("Total Expenses", f"₹{expenses:,.2f}", delta_color="inverse")
        col3.metric("Net Profit", f"₹{profit:,.2f}")
        
        st.markdown("### 📈 Performance Trends")
        
        # Trend Analysis
        daily_trends = biz_df.copy()
        daily_trends['date'] = daily_trends['timestamp'].dt.date
        trend_df = daily_trends.groupby(['date', 'type'])['amount'].sum().reset_index()
        
        fig = px.line(trend_df, x="date", y="amount", color="type", 
                     title="Daily Sales vs Expenses",
                     color_discrete_map={"Sale": "#22d3ee", "Expense": "#f87171"})
        fig.update_layout(template="plotly_dark", plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)')
        st.plotly_chart(fig, use_container_width=True)
        
        # Category Breakdown
        st.markdown("### 🏷️ Category Analysis")
        col_left, col_right = st.columns(2)
        
        cat_df = biz_df.groupby(['category', 'type'])['amount'].sum().reset_index()
        
        fig_sales = px.pie(cat_df[cat_df['type'] == 'Sale'], values="amount", names="category", title="Sales by Category")
        fig_sales.update_layout(template="plotly_dark")
        col_left.plotly_chart(fig_sales, use_container_width=True)
        
        fig_exp = px.pie(cat_df[cat_df['type'] == 'Expense'], values="amount", names="category", title="Expenses by Category")
        fig_exp.update_layout(template="plotly_dark")
        col_right.plotly_chart(fig_exp, use_container_width=True)

except Exception as e:
    st.error(f"Error loading dashboard: {e}")
    st.info("Ensure the backend server is running and transactions exist.")
