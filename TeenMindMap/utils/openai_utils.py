import os
import json
import logging
from openai import OpenAI
from openai.types.chat import ChatCompletion
from openai import AuthenticationError, RateLimitError, APIError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def is_valid_api_key(api_key):
    """Check if API key has valid format."""
    if not api_key:
        return False
    
    # OpenAI keys typically start with "sk-" and have a certain length
    if not api_key.startswith("sk-") or len(api_key) < 30:
        return False
    
    return True

def check_api_key(api_key=None):
    """Verify that the OpenAI API key is valid by making a minimal request."""
    if not api_key:
        api_key = os.environ.get("OPENAI_API_KEY")
    
    if not is_valid_api_key(api_key):
        logger.warning("Invalid API key format")
        return False
    
    try:
        client = OpenAI(api_key=api_key)
        # Make a minimal request to check if the API key works
        response = client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5
        )
        logger.info("API key validated successfully")
        return True
    except AuthenticationError as e:
        logger.error(f"Authentication error with OpenAI API: {str(e)}")
        return False
    except (RateLimitError, APIError) as e:
        # These errors mean the key is valid but there are other issues
        logger.warning(f"API error (key may be valid): {str(e)}")
        return True
    except Exception as e:
        logger.error(f"Unexpected error validating API key: {str(e)}")
        return False

def get_openai_client():
    """Get an OpenAI client using the API key from environment variables."""
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        logger.error("OpenAI API key not found in environment variables")
        raise ValueError("OpenAI API key not found in environment variables")
    
    if not is_valid_api_key(api_key):
        logger.error("Invalid OpenAI API key format")
        raise ValueError("Invalid OpenAI API key format")
    
    return OpenAI(api_key=api_key)

def chat_with_gpt(messages, system_message=None):
    """
    Chat with OpenAI's GPT model.
    
    Args:
        messages (list): List of message dictionaries with role and content
        system_message (str, optional): System message to set the context
        
    Returns:
        str: The model's response
    """
    try:
        client = get_openai_client()
        
        # Add system message if provided
        if system_message and not any(msg.get("role") == "system" for msg in messages):
            messages.insert(0, {"role": "system", "content": system_message})
        
        # Make the API call to OpenAI
        response = client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages=messages
        )
        
        return response.choices[0].message.content
    except Exception as e:
        return f"Error communicating with AI assistant: {str(e)}"

def analyze_mental_health(responses):
    """
    Analyze mental health responses using OpenAI.
    
    Args:
        responses (dict): Dictionary of question/answer pairs from the assessment
        
    Returns:
        dict: Analysis results including category scores and recommendations
    """
    try:
        client = get_openai_client()
        
        # Prepare the prompt for analysis
        prompt = f"""
        Analyze the following mental health assessment responses from a teenager:
        
        {json.dumps(responses, indent=2)}
        
        Based on these responses, provide:
        1. An overall wellness score (0-100)
        2. Category scores for: Anxiety, Depression, Stress, and Self-esteem (each 0-100)
        3. Brief, supportive insights specific to a teenage audience
        4. 2-3 gentle, actionable recommendations
        5. A supportive closing message
        
        The analysis should be compassionate, non-judgmental, and appropriate for teenagers.
        Important: This is NOT a clinical diagnosis. Format the response as a JSON object.
        """
        
        # Make the API call to OpenAI
        response = client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        # Parse the JSON response
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        return {
            "error": f"Error analyzing responses: {str(e)}",
            "overall_score": 50,
            "category_scores": {
                "Anxiety": 50,
                "Depression": 50,
                "Stress": 50,
                "Self-esteem": 50
            },
            "insights": "We couldn't analyze your responses. Please try again later.",
            "recommendations": ["Consider speaking with a trusted adult or counselor about your feelings."],
            "closing_message": "Remember that your mental health matters, and seeking support is a sign of strength."
        }

def get_resources_for_topic(topic):
    """
    Get mental health resources for a specific topic using OpenAI.
    
    Args:
        topic (str): The mental health topic to get resources for
        
    Returns:
        dict: Information and resources about the topic
    """
    try:
        client = get_openai_client()
        
        # Prepare the prompt for getting resources
        prompt = f"""
        Provide helpful information about {topic} specifically tailored for teenagers.
        
        Include:
        1. A brief, friendly explanation of what {topic} is
        2. Common signs or symptoms teenagers might experience
        3. 3-4 practical coping strategies suitable for teens
        4. When to consider seeking professional help
        5. A supportive, non-stigmatizing message
        
        The information should be accurate, age-appropriate, compassionate, and presented in a 
        conversational tone that resonates with teenagers. Format the response as a JSON object
        with keys: "explanation", "signs", "coping_strategies", "when_to_seek_help", and "supportive_message".
        """
        
        # Make the API call to OpenAI
        response = client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.5
        )
        
        # Parse the JSON response
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        return {
            "error": f"Error fetching resources: {str(e)}",
            "explanation": f"Information about {topic} is temporarily unavailable.",
            "signs": ["Please try again later or select a different topic."],
            "coping_strategies": ["Speaking with a trusted adult or mental health professional"],
            "when_to_seek_help": "If you're concerned about your mental health, it's always appropriate to speak with a healthcare provider.",
            "supportive_message": "Remember that your feelings are valid and seeking support is a sign of strength."
        }

def get_personalized_resource_recommendations(assessment_results):
    """
    Generate personalized resource recommendations based on assessment results.
    
    Args:
        assessment_results (dict): The results from a mental health assessment including
                                  scores, responses, and any AI analysis
        
    Returns:
        dict: Personalized resource recommendations including topics, coping strategies,
              and recommended reads
    """
    try:
        client = get_openai_client()
        
        # Prepare the prompt for generating personalized recommendations
        prompt = f"""
        Based on the following mental health assessment results from a teenager, provide personalized resource recommendations:
        
        {json.dumps(assessment_results, indent=2)}
        
        Please provide:
        1. 3-4 most relevant mental health topics for this teen to explore further based on their assessment results
        2. 3-5 personalized coping strategies tailored to their specific needs
        3. 3 recommended resources (apps, websites, or books) that would be most helpful
        4. A brief, encouraging message that acknowledges their strengths and the areas they might want to focus on
        
        Format the response as a JSON object with these keys:
        - "recommended_topics": [array of topic names]
        - "coping_strategies": [array of personalized strategies]
        - "resources": [array of recommended resources with name and brief description]
        - "personalized_message": string with an encouraging message
        
        The recommendations should be supportive, age-appropriate, and directly related to the assessment results. 
        Don't include any disclaimers in the JSON object.
        """
        
        # Make the API call to OpenAI
        response = client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        # Parse the JSON response
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        return {
            "error": f"Error generating recommendations: {str(e)}",
            "recommended_topics": ["Stress Management", "Self-Care", "Emotional Wellbeing"],
            "coping_strategies": [
                "Practice deep breathing exercises when feeling overwhelmed",
                "Connect with friends or trusted adults when you need support",
                "Set aside time each day for activities you enjoy"
            ],
            "resources": [
                {"name": "Headspace", "description": "Meditation and mindfulness app for teens"},
                {"name": "TeenMentalHealth.org", "description": "Website with reliable mental health information"},
                {"name": "School Counseling Office", "description": "Your school's counselor can provide personalized support"}
            ],
            "personalized_message": "Remember that every step toward better mental health is important. You're not alone, and resources are available to support you."
        }
