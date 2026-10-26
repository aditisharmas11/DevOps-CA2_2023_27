import streamlit as st
import os
from utils.openai_utils import chat_with_gpt
from utils.auth import Auth, login_required
from utils.database import create_chat_session, add_chat_message, get_chat_session, get_chat_sessions

# Page configuration
st.set_page_config(
    page_title="ZenGen - AI Chat Support",
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

# Sidebar
st.sidebar.title("ZenGen")
st.sidebar.image("assets/zengen_logo.png", width=200)

# Navigation
if st.sidebar.button("Back to Home"):
    st.switch_page("app.py")

st.sidebar.markdown("---")
st.sidebar.info("""
    💬 **How to use the chat**
    
    This AI chat assistant is here to listen and provide support. You can talk about:
    
    - Feelings and emotions
    - School or social stress
    - Self-image concerns
    - General mental wellness questions
    
    Remember, this is not a replacement for professional help.
""")

# Chat session management
if "chat_session_id" not in st.session_state:
    # Try to create a new session
    try:
        session_id = create_chat_session(current_user["id"])
        st.session_state.chat_session_id = session_id
    except Exception as e:
        st.error(f"Failed to create chat session: {str(e)}")
        st.session_state.chat_session_id = None

# Initialize chat history if it doesn't exist
if "chat_history" not in st.session_state:
    # Initial greeting message
    initial_message = "Hi there! I'm here to listen and chat about whatever's on your mind. How are you feeling today?"
    st.session_state.chat_history = [{"role": "assistant", "content": initial_message}]
    
    # Store initial message in database if we have a valid session
    if st.session_state.chat_session_id:
        try:
            add_chat_message(st.session_state.chat_session_id, "assistant", initial_message)
        except Exception as e:
            st.error(f"Failed to store initial message: {str(e)}")

# Add system message to provide context and guardrails
SYSTEM_MESSAGE = """
You are a supportive and compassionate AI assistant designed to provide mental health support specifically for teenagers.

Key guidelines:
1. Be warm, empathetic, and use age-appropriate language for teens.
2. Focus on active listening, validation, and positive support.
3. NEVER offer medical advice, diagnosis, or treatment recommendations.
4. Emphasize healthy coping strategies, self-care, and seeking appropriate support.
5. If any concerning content about self-harm, suicide, or harm to others comes up, gently encourage speaking with a trusted adult, school counselor, or calling a crisis line.
6. Maintain a hopeful, encouraging tone while being realistic and authentic.
7. Respect privacy and promote safety.
8. Keep responses concise and easily readable for teenagers (2-4 short paragraphs maximum).

Your goal is to provide emotional support while always encouraging connection with appropriate human support when needed.
"""

# Main content
st.title("💬 Chat Support")
st.write("Talk with our AI assistant about how you're feeling or any questions you might have about mental health.")

# Display chat history
chat_container = st.container()
with chat_container:
    for message in st.session_state.chat_history:
        if message["role"] == "user":
            st.markdown(f"<div style='background-color:#F0E6F6; padding:10px; border-radius:15px; margin-bottom:10px; border-left:4px solid #FF4B8B;'><strong>You:</strong> {message['content']}</div>", unsafe_allow_html=True)
        else:
            st.markdown(f"<div style='background-color:#E8D8F0; padding:10px; border-radius:15px; margin-bottom:10px; border-left:4px solid #2D1A45;'><strong>Assistant:</strong> {message['content']}</div>", unsafe_allow_html=True)

# User input
user_message = st.text_area("Type your message here:", key="user_input", height=100)
col1, col2 = st.columns([1, 5])

with col1:
    send_button = st.button("Send", use_container_width=True)

# Initialize a key to track if we need to process a message
if "process_message" not in st.session_state:
    st.session_state.process_message = False

# Process user message when send button is clicked
if send_button and user_message.strip():
    # Save the message to a temporary variable
    st.session_state.temp_message = user_message
    st.session_state.process_message = True
    st.rerun()
    
# Check if we need to process a message
if st.session_state.process_message and hasattr(st.session_state, "temp_message"):
    # Get the message from the temporary variable
    user_message = st.session_state.temp_message
    
    # Add user message to chat history
    st.session_state.chat_history.append({"role": "user", "content": user_message})
    
    # Store user message in database
    if st.session_state.chat_session_id:
        try:
            add_chat_message(st.session_state.chat_session_id, "user", user_message)
        except Exception as e:
            st.error(f"Failed to store user message: {str(e)}")
    
    # Check for API key
    from utils.openai_utils import check_api_key, is_valid_api_key
    
    api_key = os.environ.get("OPENAI_API_KEY")
    api_key_valid = False
    
    if not api_key:
        # If no API key, provide a canned response
        assistant_response = "I'm sorry, but I'm unable to process your message right now because the OpenAI API key is not configured. Please ask an administrator to set up the API key."
    elif not is_valid_api_key(api_key):
        # If invalid API key format
        assistant_response = "I'm sorry, but the OpenAI API key appears to be in an invalid format. Please ask an administrator to check the API key configuration."
    else:
        try:
            # Prepare messages for API call (excluding system message)
            messages = [{"role": msg["role"], "content": msg["content"]} for msg in st.session_state.chat_history]
            
            # Call OpenAI API
            assistant_response = chat_with_gpt(messages, SYSTEM_MESSAGE)
            
            # Check if the response indicates an API key issue
            if "Error communicating with AI assistant" in assistant_response and ("authentication" in assistant_response.lower() or "api key" in assistant_response.lower()):
                assistant_response = "I'm sorry, but there's an issue with the OpenAI API key authentication. Please ask an administrator to verify the API key."
        except Exception as e:
            assistant_response = f"I'm sorry, but I encountered an error while processing your message: {str(e)}"
    
    # Add assistant response to chat history
    st.session_state.chat_history.append({"role": "assistant", "content": assistant_response})
    
    # Store assistant response in database
    if st.session_state.chat_session_id:
        try:
            add_chat_message(st.session_state.chat_session_id, "assistant", assistant_response)
        except Exception as e:
            st.error(f"Failed to store assistant message: {str(e)}")
    
    # Reset the processing flag
    st.session_state.process_message = False
    # Clean up the temporary message
    if hasattr(st.session_state, "temp_message"):
        delattr(st.session_state, "temp_message")

# Footer with important reminders
st.markdown("---")
st.markdown("""
    **Important Reminders**:
    - This AI assistant is not a replacement for professional mental health support.
    - If you're experiencing a mental health emergency, please talk to a trusted adult or contact a crisis helpline.
    - Your chat history is securely stored in your account to provide continuity in your conversations.
""")
