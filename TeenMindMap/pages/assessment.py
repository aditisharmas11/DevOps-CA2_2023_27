import streamlit as st
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from utils.prediction import score_responses, generate_visualizations, interpret_scores
from assets.questions import get_questions
from utils.openai_utils import analyze_mental_health, get_personalized_resource_recommendations, get_resources_for_topic
from utils.auth import Auth, login_required
from utils.database import save_assessment, get_user_assessments, get_assessment_by_id
import os
import json
from datetime import datetime

# Page configuration
st.set_page_config(
    page_title="ZenGen - Mental Health Assessment",
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
    📝 **About the Assessment**
    
    This questionnaire helps you reflect on your current mental well-being.
    
    - Takes about 5 minutes
    - All responses are private
    - Get instant feedback
    
    Remember, this is not a medical diagnosis.
""")

# Sidebar - Previous Assessments
st.sidebar.markdown("---")
st.sidebar.subheader("Your Assessment History")

# Try to get user's previous assessments
try:
    previous_assessments = get_user_assessments(current_user["id"])
    if previous_assessments:
        for assessment in previous_assessments[:5]:  # Show only the most recent 5
            completed_date = datetime.fromisoformat(assessment["completed_at"]).strftime("%b %d, %Y")
            scores = assessment.get("scores", {})
            if scores:
                overall_score = json.loads(scores).get("overall", 0)
                if st.sidebar.button(f"{completed_date} - Score: {int(overall_score)}/100", key=f"history_{assessment['id']}"):
                    st.session_state.view_assessment_id = assessment["id"]
                    st.rerun()
    else:
        st.sidebar.write("No previous assessments found.")
except Exception as e:
    st.sidebar.error(f"Could not load assessment history: {str(e)}")

# Main content
if "view_assessment_id" in st.session_state:
    # View a previous assessment
    try:
        assessment = get_assessment_by_id(st.session_state.view_assessment_id)
        if assessment:
            st.title("📝 Previous Assessment Results")
            st.write(f"Completed on: {datetime.fromisoformat(assessment['completed_at']).strftime('%B %d, %Y at %I:%M %p')}")
            
            # Get scores and responses
            scores = json.loads(assessment["scores"]) if isinstance(assessment["scores"], str) else assessment["scores"]
            responses = json.loads(assessment["responses"]) if isinstance(assessment["responses"], str) else assessment["responses"]
            analysis = json.loads(assessment["analysis"]) if assessment.get("analysis") and isinstance(assessment["analysis"], str) else assessment.get("analysis", {})
            
            # Display results similar to the completion page
            col1, col2 = st.columns([2, 3])
            
            with col1:
                st.subheader("Your Wellness Profile")
                
                # Generate and display visualization
                fig = generate_visualizations(scores)
                st.pyplot(fig)
                
                # Overall score
                overall_score = int(scores.get("overall", 50))
                st.metric("Overall Wellness Score", f"{overall_score}/100")
                
                # Back to new assessment button
                if st.button("Take New Assessment"):
                    del st.session_state.view_assessment_id
                    st.rerun()
            
            with col2:
                # If AI analysis is available, show it
                if analysis and "error" not in analysis:
                    results = analysis
                    
                    st.subheader("Your Personalized Insights")
                    
                    # Display category scores from AI analysis
                    if "category_scores" in results:
                        scores_df = pd.DataFrame({
                            "Category": list(results["category_scores"].keys()),
                            "Score": list(results["category_scores"].values())
                        })
                        
                        # Create bar chart
                        fig, ax = plt.subplots(figsize=(8, 4))
                        bars = ax.barh(scores_df["Category"], scores_df["Score"], color="#FF4B8B")
                        ax.set_xlim(0, 100)
                        ax.set_xlabel("Score")
                        ax.set_title("Category Scores")
                        ax.set_facecolor("#F0E6F6")
                        fig.patch.set_facecolor("#F0E6F6")
                        
                        # Add value labels
                        for bar in bars:
                            width = bar.get_width()
                            ax.text(width + 1, bar.get_y() + bar.get_height()/2, f"{int(width)}", 
                                    ha='left', va='center')
                        
                        st.pyplot(fig)
                    
                    # Display insights
                    if "insights" in results:
                        st.markdown("### Insights")
                        st.write(results["insights"])
                    
                    # Display recommendations
                    if "recommendations" in results:
                        st.markdown("### Recommendations")
                        for i, rec in enumerate(results["recommendations"], 1):
                            st.write(f"{i}. {rec}")
                    
                    # Display closing message
                    if "closing_message" in results:
                        st.info(results["closing_message"])
                else:
                    # Show basic interpretations if AI analysis is not available
                    interpretations = interpret_scores(scores)
                    
                    st.subheader("What Your Scores Mean")
                    
                    for category, interpretation in interpretations.items():
                        if category != "overall":
                            with st.expander(f"{category.replace('_', ' ').title()} ({interpretation['level'].title()})"):
                                st.write(interpretation["description"])
                                st.write(f"**Recommendation:** {interpretation['recommendation']}")
            
            # Add personalized resource recommendations for previous assessments too
            st.markdown("---")
            st.subheader("📚 Your Personalized Resource Recommendations")
            
            # Check if we have API access for personalized recommendations
            from utils.openai_utils import check_api_key, is_valid_api_key
            
            api_key = os.environ.get("OPENAI_API_KEY")
            api_key_valid = False
            
            if api_key:
                if is_valid_api_key(api_key):
                    # Format responses for viewing previous assessment
                    formatted_responses = {}
                    for q_id, response_idx in responses.items():
                        q = next((q for q in get_questions() if q["id"] == q_id), None)
                        if q:
                            try:
                                formatted_responses[q["text"]] = q["options"][int(response_idx)]
                            except (ValueError, IndexError):
                                # Handle potential formatting issues with old data
                                pass
                                
                    # Generate combined data for recommendations
                    assessment_data = {
                        "scores": scores,
                        "responses": formatted_responses,
                        "analysis": analysis
                    }
                    
                    # If we haven't generated recommendations yet, do it now
                    view_rec_key = f"personalized_recommendations_{st.session_state.view_assessment_id}"
                    
                    try:
                        if view_rec_key not in st.session_state:
                            with st.spinner("Generating personalized resource recommendations..."):
                                st.session_state[view_rec_key] = get_personalized_resource_recommendations(assessment_data)
                        
                        # Display personalized recommendations
                        recommendations = st.session_state[view_rec_key]
                        if "error" not in recommendations:
                            # Display recommended topics
                            if "recommended_topics" in recommendations:
                                st.markdown("### Recommended Topics to Explore")
                                col1, col2 = st.columns(2)
                                
                                with col1:
                                    for i, topic in enumerate(recommendations["recommended_topics"]):
                                        if st.button(topic, key=f"hist_topic_{i}", use_container_width=True):
                                            # Store the selected topic in session and redirect to resources page
                                            st.session_state.selected_resource_topic = topic
                                            st.switch_page("pages/resources.py")
                                
                                with col2:
                                    st.markdown("""
                                    These topics are recommended based on your assessment responses. 
                                    Click on any topic to learn more about it, including signs, coping strategies, 
                                    and when to seek help.
                                    """)
                            
                            # Display personalized coping strategies
                            if "coping_strategies" in recommendations:
                                st.markdown("### Personalized Coping Strategies")
                                for i, strategy in enumerate(recommendations["coping_strategies"], 1):
                                    st.markdown(f"**{i}.** {strategy}")
                            
                            # Display recommended resources
                            if "resources" in recommendations:
                                st.markdown("### Recommended Resources")
                                for resource in recommendations["resources"]:
                                    st.markdown(f"**{resource['name']}**: {resource['description']}")
                            
                            # Display personalized message
                            if "personalized_message" in recommendations:
                                st.info(recommendations["personalized_message"])
                            
                            api_key_valid = True
                        else:
                            api_key_valid = False
                            error_msg = recommendations.get("error", "Unknown error")
                            if "authentication" in error_msg.lower() or "api key" in error_msg.lower():
                                st.error("❌ Invalid OpenAI API key. Please check your API key and try again.")
                            else:
                                st.warning(f"We couldn't generate personalized recommendations: {error_msg}")
                    except Exception as e:
                        st.warning(f"Error generating recommendations: {str(e)}")
                        api_key_valid = False
                else:
                    st.error("❌ Invalid OpenAI API key format. API keys should start with 'sk-'.")
                    api_key_valid = False
            else:
                st.warning("OpenAI API key not configured. Personalized recommendations are not available.")
                api_key_valid = False
            
            # If the API key is not valid, show standard recommendations
            if not api_key_valid:
                st.markdown("### General Mental Health Topics")
                topics = ["Anxiety", "Depression", "Stress Management", "Self-Esteem", "Mindfulness", "Sleep Hygiene"]
                
                # Create a grid of buttons for topics
                cols = st.columns(3)
                for i, topic in enumerate(topics):
                    with cols[i % 3]:
                        if st.button(topic, key=f"gen_topic_{i}", use_container_width=True):
                            st.session_state.selected_resource_topic = topic
                            st.switch_page("pages/resources.py")
                
                st.markdown("### General Wellness Strategies")
                st.markdown("""
                1. **Practice deep breathing** - Try breathing in for 4 counts, holding for 4, and exhaling for 6
                2. **Stay physically active** - Even a short daily walk can boost your mood
                3. **Connect with others** - Reach out to friends or family members you trust
                4. **Establish a routine** - Regular sleep, meals, and activities can provide stability
                5. **Limit social media** - Take breaks from screens, especially before bedtime
                """)
                
                st.info("For personalized recommendations based on your assessment, please ask an administrator to configure the OpenAI API key.")

        else:
            st.error("Assessment not found. Please try again.")
            del st.session_state.view_assessment_id
    except Exception as e:
        st.error(f"Error loading assessment: {str(e)}")
        del st.session_state.view_assessment_id
else:
    # New assessment
    st.title("📝 Mental Health Assessment")
    st.write("""
    This brief questionnaire will help you understand different aspects of your mental well-being. 
    Answer honestly - your responses are securely stored in your account and used only to provide you with insights.
    """)
    
    # Initialize session state variables
    if "current_question" not in st.session_state:
        st.session_state.current_question = 0
    if "responses" not in st.session_state:
        st.session_state.responses = {}
    if "assessment_complete" not in st.session_state:
        st.session_state.assessment_complete = False
    if "analysis_results" not in st.session_state:
        st.session_state.analysis_results = None
    if "assessment_saved" not in st.session_state:
        st.session_state.assessment_saved = False
    
    # Get questions
    questions = get_questions()
    total_questions = len(questions)
    
    # Function to handle next question
    def next_question():
        st.session_state.current_question += 1
        if st.session_state.current_question >= total_questions:
            st.session_state.assessment_complete = True
    
    # Function to handle previous question
    def prev_question():
        st.session_state.current_question = max(0, st.session_state.current_question - 1)
    
    # Function to restart assessment
    def restart_assessment():
        st.session_state.current_question = 0
        st.session_state.responses = {}
        st.session_state.assessment_complete = False
        st.session_state.analysis_results = None
        st.session_state.assessment_saved = False
    
    # Display progress bar
    if not st.session_state.assessment_complete:
        progress = st.session_state.current_question / total_questions
        st.progress(progress)
        st.write(f"Question {st.session_state.current_question + 1} of {total_questions}")
    
    # If assessment is not complete, show questions
    if not st.session_state.assessment_complete:
        current_q = questions[st.session_state.current_question]
        
        st.subheader(current_q["text"])
        
        # Create a response form
        response = st.radio(
            "Select your answer:",
            options=current_q["options"],
            key=f"q_{current_q['id']}",
            index=None,
        )
        
        # Navigation buttons
        cols = st.columns([1, 1, 1])
        
        with cols[0]:
            if st.session_state.current_question > 0:
                st.button("Previous", on_click=prev_question)
        
        with cols[2]:
            # Only allow next if a response is provided
            if response is not None:
                # Save the response (as a string of the index)
                response_index = current_q["options"].index(response)
                st.session_state.responses[current_q["id"]] = str(response_index)
                
                if st.session_state.current_question < total_questions - 1:
                    st.button("Next", on_click=next_question)
                else:
                    st.button("Complete Assessment", on_click=next_question)
    
    # If assessment is complete, show results
    else:
        st.success("Assessment completed! Here's your mental health profile:")
        
        # Calculate scores
        scores = score_responses(st.session_state.responses, questions)
        
        # Get AI analysis if API key is available
        from utils.openai_utils import check_api_key, is_valid_api_key
        
        api_key = os.environ.get("OPENAI_API_KEY")
        api_key_valid = False
        
        if api_key and is_valid_api_key(api_key) and not st.session_state.analysis_results:
            try:
                with st.spinner("Analyzing your responses..."):
                    # Format responses for analysis
                    formatted_responses = {}
                    for q_id, response_idx in st.session_state.responses.items():
                        q = next((q for q in questions if q["id"] == q_id), None)
                        if q:
                            formatted_responses[q["text"]] = q["options"][int(response_idx)]
                    
                    # Get AI analysis
                    st.session_state.analysis_results = analyze_mental_health(formatted_responses)
                    
                    if "error" in st.session_state.analysis_results:
                        error_msg = st.session_state.analysis_results.get("error", "Unknown error")
                        if "authentication" in error_msg.lower() or "api key" in error_msg.lower():
                            st.error("❌ Invalid OpenAI API key. Please check your API key and try again.")
                        else:
                            st.warning(f"AI analysis error: {error_msg}")
                    else:
                        api_key_valid = True
            except Exception as e:
                st.warning(f"Error analyzing responses: {str(e)}")
        elif api_key and not is_valid_api_key(api_key):
            st.error("❌ Invalid OpenAI API key format. API keys should start with 'sk-'.")
        
        # Save assessment to database if not already saved
        if not st.session_state.assessment_saved:
            try:
                user_id = current_user["id"]
                assessment_id = save_assessment(
                    user_id=user_id,
                    responses_dict=st.session_state.responses,
                    scores_dict=scores,
                    analysis_dict=st.session_state.analysis_results
                )
                if assessment_id:
                    st.session_state.assessment_saved = True
            except Exception as e:
                st.error(f"Failed to save assessment: {str(e)}")
        
        # Display results
        col1, col2 = st.columns([2, 3])
        
        with col1:
            st.subheader("Your Wellness Profile")
            
            # Generate and display visualization
            fig = generate_visualizations(scores)
            st.pyplot(fig)
            
            # Overall score
            overall_score = int(scores.get("overall", 50))
            st.metric("Overall Wellness Score", f"{overall_score}/100")
            
            # Restart button
            st.button("Retake Assessment", on_click=restart_assessment)
        
        with col2:
            # If AI analysis is available, show it
            if st.session_state.analysis_results and "error" not in st.session_state.analysis_results:
                results = st.session_state.analysis_results
                
                st.subheader("Your Personalized Insights")
                
                # Display category scores from AI analysis
                if "category_scores" in results:
                    scores_df = pd.DataFrame({
                        "Category": list(results["category_scores"].keys()),
                        "Score": list(results["category_scores"].values())
                    })
                    
                    # Create bar chart
                    fig, ax = plt.subplots(figsize=(8, 4))
                    bars = ax.barh(scores_df["Category"], scores_df["Score"], color="#FF4B8B")
                    ax.set_xlim(0, 100)
                    ax.set_xlabel("Score")
                    ax.set_title("Category Scores")
                    ax.set_facecolor("#F0E6F6")
                    fig.patch.set_facecolor("#F0E6F6")
                    
                    # Add value labels
                    for bar in bars:
                        width = bar.get_width()
                        ax.text(width + 1, bar.get_y() + bar.get_height()/2, f"{int(width)}", 
                                ha='left', va='center')
                    
                    st.pyplot(fig)
                
                # Display insights
                if "insights" in results:
                    st.markdown("### Insights")
                    st.write(results["insights"])
                
                # Display recommendations
                if "recommendations" in results:
                    st.markdown("### Recommendations")
                    for i, rec in enumerate(results["recommendations"], 1):
                        st.write(f"{i}. {rec}")
                
                # Display closing message
                if "closing_message" in results:
                    st.info(results["closing_message"])
            else:
                # Show basic interpretations if AI analysis is not available
                interpretations = interpret_scores(scores)
                
                st.subheader("What Your Scores Mean")
                
                for category, interpretation in interpretations.items():
                    if category != "overall":
                        with st.expander(f"{category.replace('_', ' ').title()} ({interpretation['level'].title()})"):
                            st.write(interpretation["description"])
                            st.write(f"**Recommendation:** {interpretation['recommendation']}")
        
        # Personalized Resource Recommendations
        st.markdown("---")
        st.subheader("📚 Your Personalized Resource Recommendations")
        
        # Check if we have API access for personalized recommendations
        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key:
            # Format responses for recommendations if needed
            formatted_responses = {}
            if st.session_state.responses:
                for q_id, response_idx in st.session_state.responses.items():
                    q = next((q for q in questions if q["id"] == q_id), None)
                    if q:
                        formatted_responses[q["text"]] = q["options"][int(response_idx)]
                        
            # Generate combined data for recommendations
            assessment_data = {
                "scores": scores,
                "responses": formatted_responses,
                "analysis": st.session_state.analysis_results if st.session_state.analysis_results else {}
            }
            
            # If we haven't generated recommendations yet, do it now
            if "personalized_recommendations" not in st.session_state:
                with st.spinner("Generating personalized resource recommendations..."):
                    st.session_state.personalized_recommendations = get_personalized_resource_recommendations(assessment_data)
            
            # Display personalized recommendations
            recommendations = st.session_state.personalized_recommendations
            if "error" not in recommendations:
                # Display recommended topics
                if "recommended_topics" in recommendations:
                    st.markdown("### Recommended Topics to Explore")
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        for i, topic in enumerate(recommendations["recommended_topics"]):
                            if st.button(topic, key=f"rec_topic_{i}", use_container_width=True):
                                # Store the selected topic in session and redirect to resources page
                                st.session_state.selected_resource_topic = topic
                                st.switch_page("pages/resources.py")
                    
                    with col2:
                        st.markdown("""
                        These topics are recommended based on your assessment responses. 
                        Click on any topic to learn more about it, including signs, coping strategies, 
                        and when to seek help.
                        """)
                
                # Display personalized coping strategies
                if "coping_strategies" in recommendations:
                    st.markdown("### Personalized Coping Strategies")
                    for i, strategy in enumerate(recommendations["coping_strategies"], 1):
                        st.markdown(f"**{i}.** {strategy}")
                
                # Display recommended resources
                if "resources" in recommendations:
                    st.markdown("### Recommended Resources")
                    for resource in recommendations["resources"]:
                        st.markdown(f"**{resource['name']}**: {resource['description']}")
                
                # Display personalized message
                if "personalized_message" in recommendations:
                    st.info(recommendations["personalized_message"])
            else:
                st.warning("We couldn't generate personalized recommendations at this time. Please try again later.")
                if "error" in recommendations:
                    st.error(f"Error: {recommendations['error']}")
        else:
            st.warning("Personalized recommendations require the OpenAI API key to be configured.")
        
        # Additional resources and disclaimer
        st.markdown("---")
        st.subheader("Important Notes")
        st.write("""
        - This assessment is not a clinical tool or medical diagnosis.
        - The results are meant to help you reflect on your mental well-being.
        - If you're concerned about your mental health, please talk to a trusted adult, school counselor, or healthcare provider.
        """)
        
        # Suggestions for next steps
        st.subheader("What's Next?")
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("Chat with AI Support"):
                st.switch_page("pages/chatbot.py")
        
        with col2:
            if st.button("Explore All Mental Health Resources"):
                st.switch_page("pages/resources.py")
