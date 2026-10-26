import streamlit as st
import json
import os
from utils.auth import Auth
from utils.database import create_user, get_user_by_email, get_user_by_id

# Page configuration
st.set_page_config(
    page_title="ZenGen - Database Migration",
    page_icon="assets/zengen_logo.png",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Initialize Auth
auth = Auth()

# Check if user is authenticated
if not auth.is_authenticated():
    st.switch_page("pages/login.py")

# Get current user
current_user = auth.get_current_user()
if not current_user:
    st.error("User session error. Please log in again.")
    st.switch_page("pages/login.py")

# Check if the user is admin (for demo purposes, you can add your email here)
ADMIN_EMAILS = ["admin@example.com"]  # Replace with your admin email
if current_user["email"] not in ADMIN_EMAILS:
    st.error("You do not have permission to access this page.")
    st.stop()

# Sidebar
st.sidebar.title("ZenGen")
st.sidebar.image("assets/zengen_logo.png", width=200)

# Navigation
if st.sidebar.button("Back to Home"):
    st.switch_page("app.py")

# Main content
st.title("🔄 Database Migration Tool")
st.write("This page allows you to migrate users from the old JSON file to the new database system.")

# Check if users.json exists
if os.path.exists("users.json"):
    # Load users from the JSON file
    with open("users.json", "r") as f:
        try:
            users_data = json.load(f)
            st.success(f"Found {len(users_data)} users in the JSON file.")
            
            # Display users from JSON
            st.subheader("Users in JSON File")
            for email, user_info in users_data.items():
                st.write(f"- {email} ({user_info.get('name', 'No name')})")
            
            # Migration button
            if st.button("Migrate Users to Database"):
                success_count = 0
                error_count = 0
                error_messages = []
                
                for email, user_info in users_data.items():
                    # Check if user already exists in database
                    existing_user = get_user_by_email(email)
                    if existing_user:
                        st.info(f"User {email} already exists in the database, skipping.")
                        continue
                    
                    try:
                        # Create user in database
                        user_id = create_user(
                            email=email,
                            password_hash=user_info["password"],
                            name=user_info.get("name", "")
                        )
                        if user_id:
                            success_count += 1
                        else:
                            error_count += 1
                            error_messages.append(f"Failed to create user {email}")
                    except Exception as e:
                        error_count += 1
                        error_messages.append(f"Error creating user {email}: {str(e)}")
                
                # Display results
                if success_count > 0:
                    st.success(f"Successfully migrated {success_count} users to the database.")
                if error_count > 0:
                    st.error(f"Failed to migrate {error_count} users.")
                    for msg in error_messages:
                        st.write(f"- {msg}")
                
                # Verify users in database
                st.subheader("Verify Database Users")
                st.write("Checking users in the database...")
                
                try:
                    for email in users_data.keys():
                        db_user = get_user_by_email(email)
                        if db_user:
                            st.write(f"✅ {email} - Found in database (ID: {db_user['id']})")
                        else:
                            st.write(f"❌ {email} - Not found in database")
                except Exception as e:
                    st.error(f"Error verifying users: {str(e)}")
        
        except json.JSONDecodeError:
            st.error("The users.json file exists but is not valid JSON.")
else:
    st.info("No users.json file found. All users are already in the database system.")

# Database Information
st.markdown("---")
st.subheader("Database Information")

# Execute a SQL query to get all tables
st.markdown("### Database Tables")
from sqlalchemy import inspect
from utils.database import engine

inspector = inspect(engine)
for table_name in inspector.get_table_names():
    st.write(f"- {table_name}")
    columns = inspector.get_columns(table_name)
    col_info = ", ".join([f"{col['name']} ({col['type']})" for col in columns])
    st.code(f"Columns: {col_info}")
    
# OpenAI API Key Management
st.markdown("---")
st.subheader("OpenAI API Key Management")

from utils.openai_utils import check_api_key, is_valid_api_key

api_key = os.environ.get("OPENAI_API_KEY")
if api_key:
    # Check if the API key has valid format
    if is_valid_api_key(api_key):
        st.success("✅ OpenAI API key is present and has valid format")
        
        # Test API key by making a minimal request
        with st.spinner("Testing API key..."):
            key_works = check_api_key(api_key)
            
        if key_works:
            st.success("✅ OpenAI API key is valid and working!")
        else:
            st.error("❌ OpenAI API key has valid format but authentication failed. Please check the key in your environment variables.")
    else:
        st.error("❌ OpenAI API key has invalid format. API keys should start with 'sk-'.")
        st.info("Please update the API key in your environment variables.")
else:
    st.error("❌ OpenAI API key is not set")
    st.info("The ZenGen AI features (chatbot, personalized recommendations, and resource details) require an OpenAI API key.")

# Show instructions for setting API key
with st.expander("How to set the OpenAI API key"):
    st.markdown("""
    To set the OpenAI API key:
    
    1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
    2. Add the key to your environment variables using one of these methods:
       - Set it in your deployment environment
       - For development, add it to your .env file
    
    The key should be set as: `OPENAI_API_KEY=sk-...your-key-here...`
    
    Remember that this key is sensitive and should not be shared or committed to version control.
    """)

st.markdown("---")
st.info("This page is only accessible to administrators for database management.")