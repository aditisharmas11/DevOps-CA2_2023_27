import streamlit as st
import os
from utils.openai_utils import check_api_key
from utils.auth import Auth, login_required

# Page configuration
st.set_page_config(
    page_title="ZenGen",
    page_icon="assets/zengen_logo.png",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Initialize Auth
auth = Auth()

# Check if user is authenticated
if not auth.is_authenticated():
    st.switch_page("pages/login.py")

# Check for OpenAI API key
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    st.warning("⚠️ OpenAI API key not found. Some features may not work properly.")
else:
    # Verify API key is valid
    if not check_api_key(api_key):
        st.error("❌ Invalid OpenAI API key. Please check your API key and try again.")

# Sidebar navigation
st.sidebar.title("ZenGen")
st.sidebar.image("assets/zengen_logo.png", width=200)
st.sidebar.write("A mental health companion for teenagers")

# Get current user info and display welcome message
current_user = auth.get_current_user()
if current_user:
    st.sidebar.write(f"Welcome, {current_user.get('name') or current_user.get('email')}")
    
    # Add logout button
    if st.sidebar.button("Logout"):
        auth.logout_user()
        st.rerun()

# App main content
st.title("Welcome to ZenGen")
st.write("""
## Your Mental Health Companion

ZenGen is designed to help you understand, monitor, and improve your mental well-being.

### How to use this app:

1. **Mental Health Assessment**: Take a short questionnaire to get insights about your current mental health state.

2. **AI Chat Support**: Talk with our AI assistant if you're feeling down, stressed, or just need someone to listen.

3. **Resources**: Access helpful information about common mental health challenges that teenagers face.

**Important Note**: This app is not a substitute for professional mental health care. If you're experiencing serious mental health issues, please talk to a trusted adult, school counselor, or mental health professional.
""")

# Features section
st.header("Features")

col1, col2, col3 = st.columns(3)

with col1:
    st.subheader("📝 Assessment")
    st.write("Take a quick assessment to understand your mental well-being.")
    if st.button("Start Assessment", key="home_assessment"):
        st.switch_page("pages/assessment.py")

with col2:
    st.subheader("💬 AI Chat Support")
    st.write("Chat with our supportive AI assistant about your concerns.")
    if st.button("Open Chat", key="home_chat"):
        st.switch_page("pages/chatbot.py")

with col3:
    st.subheader("📚 Resources")
    st.write("Learn about mental health topics relevant to teenagers.")
    if st.button("View Resources", key="home_resources"):
        st.switch_page("pages/resources.py")

# Footer
st.markdown("---")
st.write("💙 Remember, taking care of your mental health is just as important as physical health.")
st.write("Your data is kept private and not stored between sessions.")
