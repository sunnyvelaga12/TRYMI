import streamlit as st
from utils.status_check import get_ai_status

st.set_page_config(page_title="TRYMI - AI Outfit Predictor")

# --- UI HEADER ---
st.title("👗 TRYMI: Virtual Try-On")

# Fetch status
status_label, status_msg, is_active = get_ai_status()

# Display Status Badge
col1, col2 = st.columns([1, 4])
with col1:
    st.metric("AI Status", status_label)
with col2:
    st.info(status_msg)

if not is_active:
    st.error("🚨 AI is currently sleeping. Please come back later!")
    st.stop() # Stops the app from running further until it's green