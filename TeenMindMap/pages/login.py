import streamlit as st
from utils.auth import Auth

# Page configuration
st.set_page_config(
    page_title="ZenGen - Login",
    page_icon="assets/zengen_logo.png",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Initialize Auth
auth = Auth()

# Sidebar
st.sidebar.title("ZenGen")
st.sidebar.image("assets/zengen_logo.png", width=200)
st.sidebar.write("A mental health companion for teenagers")

# If user is already authenticated, redirect to home
if auth.is_authenticated():
    st.switch_page("app.py")

# Main content
st.title("Welcome to ZenGen")
st.write("Please login or register to continue.")

# Create tabs for login and register
tab1, tab2 = st.tabs(["Login", "Register"])

with tab1:
    st.subheader("Login")
    
    # Login form
    with st.form("login_form"):
        email = st.text_input("Email", key="login_email")
        password = st.text_input("Password", type="password", key="login_password")
        submit_login = st.form_submit_button("Login")
        
        if submit_login:
            if email and password:
                success, message = auth.login_user(email, password)
                if success:
                    st.success(message)
                    st.rerun()  # Refresh to redirect to home
                else:
                    st.error(message)
            else:
                st.error("Please enter both email and password.")

with tab2:
    st.subheader("Register")
    
    # Registration form
    with st.form("register_form"):
        name = st.text_input("Name (Optional)", key="register_name")
        email = st.text_input("Email", key="register_email")
        password = st.text_input("Password", type="password", key="register_password")
        confirm_password = st.text_input("Confirm Password", type="password", key="register_confirm_password")
        
        submit_register = st.form_submit_button("Register")
        
        if submit_register:
            if email and password:
                if password != confirm_password:
                    st.error("Passwords do not match.")
                else:
                    success, message = auth.register_user(email, password, name)
                    if success:
                        st.success(message)
                        # Automatically login after successful registration
                        auth.login_user(email, password)
                        st.rerun()  # Refresh to redirect to home
                    else:
                        st.error(message)
            else:
                st.error("Please enter both email and password.")

# Footer
st.markdown("---")
st.write("💙 Taking care of your mental health is just as important as physical health.")