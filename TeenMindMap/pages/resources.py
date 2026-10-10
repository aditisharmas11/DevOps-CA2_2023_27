import streamlit as st
import os
from utils.openai_utils import get_resources_for_topic
from utils.auth import Auth, login_required

# Page configuration
st.set_page_config(
    page_title="ZenGen - Mental Health Resources",
    page_icon="assets/zengen_logo.png",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Initialize Auth
auth = Auth()

# Check if user is authenticated
if not auth.is_authenticated():
    st.switch_page("pages/login.py")

# Sidebar
st.sidebar.title("ZenGen")
st.sidebar.image("assets/zengen_logo.png", width=200)

# Navigation
if st.sidebar.button("Back to Home"):
    st.switch_page("app.py")

st.sidebar.markdown("---")
st.sidebar.info("""
    📚 **About the Resources**
    
    This section provides information on common mental health topics that affect teenagers.
    
    Select a topic to learn more about:
    - What it is
    - Common signs
    - Helpful strategies
    - When to seek help
""")

# Main content
st.title("📚 Mental Health Resources")
st.write("""
Learn about common mental health topics that affect teenagers. Select a topic below to get more information.
""")

# Initialize session state for selected topic and resources
if "selected_topic" not in st.session_state:
    st.session_state.selected_topic = None
if "topic_resources" not in st.session_state:
    st.session_state.topic_resources = None
    
# Check if we have a topic selected from the assessment page
if "selected_resource_topic" in st.session_state:
    # Transfer the topic from assessment recommendations
    recommended_topic = st.session_state.selected_resource_topic
    st.session_state.selected_topic = recommended_topic
    st.session_state.topic_resources = None  # Reset resources
    # Remove the temporary variable to avoid reselecting on page refresh
    del st.session_state.selected_resource_topic

# Topic selection
topics = [
    "Anxiety",
    "Depression",
    "Stress Management",
    "Self-Esteem",
    "Social Media and Mental Health",
    "Body Image",
    "Bullying",
    "Academic Pressure",
    "Family Relationships",
    "Peer Relationships",
    "Mindfulness",
    "Sleep and Mental Health"
]

# Create a grid of topic buttons
st.subheader("Select a Topic")

# Add a special note if coming from assessment
if st.session_state.selected_topic and "recommended_topics" not in st.session_state:
    st.info(f"Viewing information about {st.session_state.selected_topic} based on your assessment results.")

cols = st.columns(3)
for i, topic in enumerate(topics):
    with cols[i % 3]:
        # Highlight the button if it's the selected topic
        if st.session_state.selected_topic == topic:
            button_label = f"✓ {topic}"
        else:
            button_label = topic
            
        if st.button(button_label, key=f"topic_{i}", use_container_width=True):
            st.session_state.selected_topic = topic
            st.session_state.topic_resources = None  # Reset resources
            st.rerun()

# Display resources for selected topic
if st.session_state.selected_topic:
    st.markdown("---")
    st.subheader(f"Resources for: {st.session_state.selected_topic}")
    
    # Check if we need to fetch resources
    if st.session_state.topic_resources is None:
        from utils.openai_utils import check_api_key, is_valid_api_key
        
        api_key = os.environ.get("OPENAI_API_KEY")
        api_key_valid = False
        
        if api_key and is_valid_api_key(api_key):
            try:
                with st.spinner(f"Loading information about {st.session_state.selected_topic}..."):
                    # Fetch resources from OpenAI
                    st.session_state.topic_resources = get_resources_for_topic(st.session_state.selected_topic)
                    
                    # Check if there was an error
                    if "error" in st.session_state.topic_resources:
                        error_msg = st.session_state.topic_resources.get("error", "Unknown error")
                        if "authentication" in error_msg.lower() or "api key" in error_msg.lower():
                            st.error("❌ Invalid OpenAI API key. Please check your API key and try again.")
                        else:
                            st.warning(f"Error retrieving topic information: {error_msg}")
                    else:
                        api_key_valid = True
            except Exception as e:
                st.warning(f"Error retrieving topic information: {str(e)}")
        elif api_key and not is_valid_api_key(api_key):
            st.error("❌ Invalid OpenAI API key format. API keys should start with 'sk-'.")
        else:
            st.warning("OpenAI API key not available. Unable to provide detailed information.")
            
        # If we still don't have valid topic resources, use fallback content
        if not st.session_state.topic_resources or not api_key_valid:
            st.session_state.topic_resources = {
                "error": "API key not available or invalid",
                "explanation": f"Detailed information about {st.session_state.selected_topic} is not available without a valid API key.",
                "signs": ["Please check other resources for information on this topic."],
                "coping_strategies": ["Speak with a school counselor or trusted adult about this topic."],
                "when_to_seek_help": "If you're experiencing significant distress or challenges, consider speaking with a healthcare provider.",
                "supportive_message": "Remember that seeking support is a sign of strength, not weakness."
            }
    
    # Display the resources
    resources = st.session_state.topic_resources
    
    # Check for error
    if "error" in resources and resources["error"] and "API key not available" not in resources["error"]:
        st.error(f"Error: {resources['error']}")
    
    # Create tabs for different sections
    tab1, tab2, tab3, tab4 = st.tabs(["About", "Common Signs", "Coping Strategies", "When to Seek Help"])
    
    with tab1:
        st.markdown("### What is it?")
        if "explanation" in resources:
            st.write(resources["explanation"])
        else:
            st.write(f"Information about {st.session_state.selected_topic} is temporarily unavailable.")
    
    with tab2:
        st.markdown("### Common Signs")
        if "signs" in resources:
            for sign in resources["signs"]:
                st.markdown(f"- {sign}")
        else:
            st.write("Information about common signs is temporarily unavailable.")
    
    with tab3:
        st.markdown("### Helpful Strategies")
        if "coping_strategies" in resources:
            for i, strategy in enumerate(resources["coping_strategies"], 1):
                st.markdown(f"{i}. {strategy}")
        else:
            st.write("Information about coping strategies is temporarily unavailable.")
    
    with tab4:
        st.markdown("### When to Seek Help")
        if "when_to_seek_help" in resources:
            st.write(resources["when_to_seek_help"])
        else:
            st.write("Information about when to seek help is temporarily unavailable.")
    
    # Display supportive message
    if "supportive_message" in resources:
        st.info(resources["supportive_message"])

# Crisis resources section
st.markdown("---")
st.subheader("Crisis Resources")
st.write("""
If you're experiencing a mental health emergency or crisis, it's important to reach out for help immediately:

- **Talk to a trusted adult** - a parent, teacher, school counselor, or other trusted person
- **Text HOME to 741741** - Crisis Text Line (US)
- **Call 988** - Suicide & Crisis Lifeline (US)
- **Call 911** or go to your nearest emergency room if you're in immediate danger

Remember, seeking help is a sign of strength, not weakness.
""")

# Additional resources section
st.markdown("---")
st.subheader("Additional Resources")

col1, col2 = st.columns(2)

with col1:
    st.markdown("### Websites")
    st.markdown("""
    - [Teen Mental Health](https://teenmentalhealth.org/)
    - [NAMI - Teens & Young Adults](https://www.nami.org/Your-Journey/Teens-Young-Adults)
    - [Youth.gov](https://youth.gov/youth-topics/youth-mental-health)
    """)

with col2:
    st.markdown("### Apps")
    st.markdown("""
    - Calm - Meditation and sleep stories
    - Headspace - Guided meditation and mindfulness
    - Daylio - Mood tracking journal
    - Clear Fear - Tools to manage anxiety
    """)
