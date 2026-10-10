import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import matplotlib.pyplot as plt
import streamlit as st

def score_responses(responses, questions_data):
    """
    Calculate scores from questionnaire responses.
    
    Args:
        responses (dict): Dictionary with question IDs as keys and responses as values
        questions_data (list): List of question dictionaries with scoring information
        
    Returns:
        dict: Dictionary with category scores
    """
    # Initialize category scores
    categories = ["anxiety", "depression", "stress", "self_esteem"]
    category_scores = {category: {"score": 0, "count": 0} for category in categories}
    
    # Process each response
    for q_id, response in responses.items():
        # Find the question data
        question = next((q for q in questions_data if q["id"] == q_id), None)
        if not question:
            continue
            
        # Get the numerical value from the response
        value = int(response) if response.isdigit() else 0
        
        # Reverse score if needed
        if question.get("reverse_score", False):
            value = 5 - value  # Assuming 5-point scale
            
        # Add to the category score
        for category in question["categories"]:
            if category in category_scores:
                category_scores[category]["score"] += value
                category_scores[category]["count"] += 1
    
    # Calculate average scores for each category
    result = {}
    for category, data in category_scores.items():
        if data["count"] > 0:
            # Normalize to 0-100 scale
            avg_score = (data["score"] / data["count"]) / 4 * 100
            result[category] = avg_score
        else:
            result[category] = 50  # Default if no questions answered
    
    # Calculate overall score as average of category scores
    result["overall"] = sum(result.values()) / len(result)
    
    return result

def generate_visualizations(scores):
    """
    Generate visualizations based on mental health assessment scores.
    
    Args:
        scores (dict): Dictionary with category scores
        
    Returns:
        fig: Matplotlib figure with visualizations
    """
    # Create a figure for the radar chart
    categories = ['Anxiety', 'Depression', 'Stress', 'Self-esteem']
    
    # Convert scores to a list, ensuring all categories are represented
    values = [
        100 - scores.get('anxiety', 50),  # Invert anxiety (higher score = better)
        100 - scores.get('depression', 50),  # Invert depression (higher score = better)
        100 - scores.get('stress', 50),  # Invert stress (higher score = better)
        scores.get('self_esteem', 50)  # Keep self-esteem as is (higher score = better)
    ]
    
    # Create radar chart
    fig, ax = plt.subplots(figsize=(8, 6), subplot_kw=dict(polar=True))
    
    # Number of variables
    N = len(categories)
    
    # Angle of each axis (divide the plot into equal parts)
    angles = [n / float(N) * 2 * np.pi for n in range(N)]
    angles += angles[:1]  # Close the loop
    
    # Values for each category
    values += values[:1]  # Close the loop
    
    # Draw the chart
    ax.plot(angles, values, linewidth=2, linestyle='solid', color='#FF4B8B')
    ax.fill(angles, values, alpha=0.35, color='#FF4B8B')
    
    # Set chart background
    ax.set_facecolor('#F0E6F6')
    fig.patch.set_facecolor('#F0E6F6')
    
    # Set category labels
    plt.xticks(angles[:-1], categories, color='#2D1A45', fontweight='bold')
    
    # Set y-ticks
    ax.set_rlabel_position(0)
    plt.yticks([25, 50, 75, 100], ["25", "50", "75", "100"], color="#2D1A45", size=8)
    plt.ylim(0, 100)
    
    # Add title
    plt.title('Mental Wellness Profile', size=14, color='#2D1A45', y=1.1, fontweight='bold')
    
    return fig

def interpret_scores(scores):
    """
    Provide basic interpretation of scores.
    
    Args:
        scores (dict): Dictionary with category scores
        
    Returns:
        dict: Dictionary with interpretations and recommendations
    """
    interpretations = {}
    
    # Define thresholds for interpretation
    thresholds = {
        "low": 40,
        "moderate": 70,
        "high": 100
    }
    
    # Interpret anxiety score
    anxiety_score = scores.get("anxiety", 50)
    if anxiety_score < thresholds["low"]:
        interpretations["anxiety"] = {
            "level": "low",
            "description": "Your responses suggest low levels of anxiety. This is positive!",
            "recommendation": "Continue practicing your current coping strategies."
        }
    elif anxiety_score < thresholds["moderate"]:
        interpretations["anxiety"] = {
            "level": "moderate",
            "description": "Your responses indicate moderate levels of anxiety.",
            "recommendation": "Consider learning relaxation techniques like deep breathing."
        }
    else:
        interpretations["anxiety"] = {
            "level": "high",
            "description": "Your responses suggest higher levels of anxiety.",
            "recommendation": "Talk to a trusted adult or counselor about your feelings."
        }
    
    # Interpret depression score
    depression_score = scores.get("depression", 50)
    if depression_score < thresholds["low"]:
        interpretations["depression"] = {
            "level": "low",
            "description": "Your responses suggest low levels of depression symptoms. This is positive!",
            "recommendation": "Keep maintaining social connections and activities you enjoy."
        }
    elif depression_score < thresholds["moderate"]:
        interpretations["depression"] = {
            "level": "moderate",
            "description": "Your responses indicate some symptoms that might relate to low mood.",
            "recommendation": "Try to engage in activities you enjoy and connect with supportive friends."
        }
    else:
        interpretations["depression"] = {
            "level": "high",
            "description": "Your responses suggest more significant mood-related challenges.",
            "recommendation": "Consider speaking with a mental health professional about your feelings."
        }
    
    # Interpret stress score
    stress_score = scores.get("stress", 50)
    if stress_score < thresholds["low"]:
        interpretations["stress"] = {
            "level": "low",
            "description": "Your responses suggest you're managing stress well. This is positive!",
            "recommendation": "Continue your healthy stress management practices."
        }
    elif stress_score < thresholds["moderate"]:
        interpretations["stress"] = {
            "level": "moderate",
            "description": "Your responses indicate moderate levels of stress.",
            "recommendation": "Try incorporating mindfulness or regular exercise into your routine."
        }
    else:
        interpretations["stress"] = {
            "level": "high",
            "description": "Your responses suggest higher levels of stress.",
            "recommendation": "Consider learning additional stress management techniques and talking with a trusted adult."
        }
    
    # Interpret self-esteem score
    self_esteem_score = scores.get("self_esteem", 50)
    if self_esteem_score < thresholds["low"]:
        interpretations["self_esteem"] = {
            "level": "low",
            "description": "Your responses suggest you might benefit from building self-esteem.",
            "recommendation": "Try making a list of your strengths and accomplishments, however small they seem."
        }
    elif self_esteem_score < thresholds["moderate"]:
        interpretations["self_esteem"] = {
            "level": "moderate",
            "description": "Your responses indicate moderate self-esteem.",
            "recommendation": "Practice positive self-talk and challenge negative thoughts about yourself."
        }
    else:
        interpretations["self_esteem"] = {
            "level": "high",
            "description": "Your responses suggest healthy self-esteem. This is positive!",
            "recommendation": "Continue nurturing your sense of self-worth and supporting others."
        }
    
    return interpretations
