import streamlit as st
import pandas as pd
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables (from backend folder)
backend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend")
load_dotenv(os.path.join(backend_dir, ".env.production"))
load_dotenv(os.path.join(backend_dir, ".env"), override=True)
# Also load from root just in case
load_dotenv(".env")

# Page config
st.set_page_config(
    page_title="Banquito Analytics",
    page_icon="💸",
    layout="wide"
)

st.title("💸 Banquito - Análisis de Gastos")

# Get database URL and format for psycopg2
db_url = os.getenv("DATABASE_URL", "")

if not db_url:
    st.error("❌ No DATABASE_URL found in environment variables. Por favor, asegúrate de que el archivo .env exista.")
    st.stop()
    
# Ensure it uses postgresql:// instead of postgresql+asyncpg://
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)

@st.cache_data(ttl=300)
def load_data():
    """Fetch all transactions from the database."""
    engine = create_engine(db_url)
    
    query = """
    SELECT 
        t.date, 
        t.amount, 
        t.description, 
        t.transaction_type, 
        t.installment_number,
        t.installment_total,
        c.name as category
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.date DESC
    """
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query))
            rows = result.fetchall()
            df = pd.DataFrame(rows, columns=result.keys())
            
        if not df.empty:
            df['date'] = pd.to_datetime(df['date']).dt.tz_localize(None)
        return df
    except Exception as e:
        st.error(f"Error connecting to database: {e}")
        return pd.DataFrame()

# Load data with a spinner
with st.spinner("Cargando datos desde Neon DB..."):
    df = load_data()

if df.empty:
    st.info("No hay transacciones todavía. Usa el bot de Telegram para agregar algunas.")
else:
    # --- Sidebar Filters ---
    st.sidebar.header("Filtros")
    
    # Date range
    min_date = df['date'].min().date()
    max_date = df['date'].max().date()
    
    date_range = st.sidebar.date_input(
        "Rango de Fechas",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date
    )
    
    if len(date_range) == 2:
        start_date, end_date = date_range
        mask = (df['date'].dt.date >= start_date) & (df['date'].dt.date <= end_date)
        df_filtered = df.loc[mask]
    else:
        df_filtered = df.copy()
        
    # Transaction type
    types = df_filtered['transaction_type'].unique()
    selected_types = st.sidebar.multiselect("Tipo", types, default=types)
    df_filtered = df_filtered[df_filtered['transaction_type'].isin(selected_types)]
    
    # --- Main Content ---
    
    # Key Metrics
    col1, col2, col3 = st.columns(3)
    
    incomes = df_filtered[df_filtered['transaction_type'] == 'INCOME']['amount'].sum()
    expenses = df_filtered[df_filtered['transaction_type'] == 'EXPENSE']['amount'].sum()
    balance = incomes - expenses
    
    col1.metric("Ingresos", f"${incomes:,.2f}")
    col2.metric("Gastos", f"${expenses:,.2f}", delta=f"-${expenses:,.2f}", delta_color="inverse")
    col3.metric("Balance", f"${balance:,.2f}")
    
    st.divider()
    
    # Charts
    chart_col1, chart_col2 = st.columns(2)
    
    with chart_col1:
        st.subheader("Gastos por Categoría")
        expenses_df = df_filtered[df_filtered['transaction_type'] == 'EXPENSE']
        if not expenses_df.empty:
            cat_expenses = expenses_df.groupby('category')['amount'].sum().reset_index()
            # Sort for better visualization
            cat_expenses = cat_expenses.sort_values('amount', ascending=True)
            st.bar_chart(cat_expenses.set_index('category'))
        else:
            st.write("No hay gastos en este período.")
            
    with chart_col2:
        st.subheader("Evolución en el Tiempo (Gastos)")
        if not expenses_df.empty:
            daily_expenses = expenses_df.groupby(expenses_df['date'].dt.date)['amount'].sum()
            st.line_chart(daily_expenses)
        else:
            st.write("No hay gastos en este período.")

    st.subheader("Últimas Transacciones")
    st.dataframe(
        df_filtered[['date', 'description', 'category', 'amount', 'transaction_type']].head(50),
        use_container_width=True,
        hide_index=True
    )
