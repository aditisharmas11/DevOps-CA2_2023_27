import os
import json
import base64
import hashlib
import logging
import traceback
import streamlit as st
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
import secrets
from utils.database import get_user_by_email, create_user, get_user_by_id
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Auth:
    def __init__(self):
        """Initialize the Auth class."""
        # Generate a key for session encryption if it doesn't exist
        if 'auth_key' not in st.session_state:
            st.session_state.auth_key = secrets.token_hex(16)
    
    def _hash_password(self, password):
        """Hash the password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def register_user(self, email, password, name=''):
        """Register a new user."""
        try:
            # Check if email is valid
            if not self._validate_email(email):
                return False, "Invalid email format"
            
            # Check if email already exists
            try:
                existing_user = get_user_by_email(email)
                if existing_user:
                    return False, "Email already registered"
            except SQLAlchemyError as e:
                logger.error(f"Database error checking existing user: {str(e)}")
                return False, "Database connection error. Please try again later."
            except Exception as e:
                logger.error(f"Unexpected error checking existing user: {str(e)}")
                logger.error(traceback.format_exc())
                return False, "An unexpected error occurred. Please try again."
            
            # Hash the password
            hashed_password = self._hash_password(password)
            
            # Create the user in the database
            try:
                user_id = create_user(email, hashed_password, name)
                if user_id:
                    return True, "Registration successful"
                else:
                    return False, "Failed to create user"
            except SQLAlchemyError as e:
                logger.error(f"Database error creating user: {str(e)}")
                return False, "Database connection error. Please try again later."
            except Exception as e:
                logger.error(f"Unexpected error creating user: {str(e)}")
                logger.error(traceback.format_exc())
                return False, "Registration error. Please try again."
        except Exception as e:
            logger.error(f"Unhandled exception in registration: {str(e)}")
            logger.error(traceback.format_exc())
            return False, "An unexpected error occurred. Please try again."
    
    def login_user(self, email, password):
        """Login a user."""
        try:
            # Check if email exists and get user data
            try:
                user = get_user_by_email(email)
                if not user:
                    return False, "Email not registered"
            except SQLAlchemyError as e:
                logger.error(f"Database error during login: {str(e)}")
                return False, "Database connection error. Please try again later."
            except Exception as e:
                logger.error(f"Unexpected error during login: {str(e)}")
                logger.error(traceback.format_exc())
                return False, "Login failed. Please try again."
            
            # Check if password is correct
            try:
                hashed_password = self._hash_password(password)
                if user["password_hash"] != hashed_password:
                    return False, "Incorrect password"
            except KeyError as e:
                logger.error(f"Missing key in user data: {str(e)}")
                return False, "Account data error. Please contact support."
            except Exception as e:
                logger.error(f"Password verification error: {str(e)}")
                return False, "Authentication error. Please try again."
            
            # Set user in session
            try:
                self._set_user_session(user)
            except Exception as e:
                logger.error(f"Session creation error: {str(e)}")
                logger.error(traceback.format_exc())
                return False, "Error creating session. Please try again."
            
            return True, "Login successful"
        except Exception as e:
            logger.error(f"Unhandled exception in login: {str(e)}")
            logger.error(traceback.format_exc())
            return False, "An unexpected error occurred. Please try again."
    
    def _set_user_session(self, user):
        """Set user session."""
        user_data = {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'] or ''
        }
        
        # Use encryption key from session state to encrypt user data
        key = st.session_state.auth_key.encode()
        cipher = AES.new(key, AES.MODE_CBC)
        ct_bytes = cipher.encrypt(pad(json.dumps(user_data).encode(), AES.block_size))
        iv = base64.b64encode(cipher.iv).decode('utf-8')
        ct = base64.b64encode(ct_bytes).decode('utf-8')
        
        # Store encrypted data in session state
        st.session_state.user = f"{iv}:{ct}"
        st.session_state.is_authenticated = True
    
    def get_current_user(self):
        """Get current user from session."""
        if not self.is_authenticated():
            return None
        
        try:
            # Get encrypted data from session state
            iv, ct = st.session_state.user.split(':')
            iv = base64.b64decode(iv)
            ct = base64.b64decode(ct)
            
            # Decrypt using key from session state
            key = st.session_state.auth_key.encode()
            cipher = AES.new(key, AES.MODE_CBC, iv)
            pt = unpad(cipher.decrypt(ct), AES.block_size)
            
            return json.loads(pt.decode('utf-8'))
        except Exception:
            # If any error occurs during decryption, clear session and return None
            self.logout_user()
            return None
    
    def is_authenticated(self):
        """Check if user is authenticated."""
        return st.session_state.get('is_authenticated', False) and 'user' in st.session_state
    
    def logout_user(self):
        """Logout user by clearing session."""
        if 'user' in st.session_state:
            del st.session_state.user
        st.session_state.is_authenticated = False
    
    def _validate_email(self, email):
        """Validate email format."""
        # Simple validation: check for @ and .
        return '@' in email and '.' in email.split('@')[1]


# Create a login_required decorator function
def login_required(func):
    """Decorator to require login."""
    def wrapper(*args, **kwargs):
        auth = Auth()
        if not auth.is_authenticated():
            st.warning("Please login to access this page.")
            st.stop()
        return func(*args, **kwargs)
    return wrapper