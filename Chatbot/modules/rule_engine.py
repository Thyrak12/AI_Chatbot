# modules/rule_engine.py
def get_rule_based_response(user_input: str):
    rules = {
        "hello": "Hi there! How can I help you today?",
        "menu": "Our restaurant offers a variety of dishes — would you like to see the full menu?",
        "hours": "We’re open from 9 AM to 10 PM daily!",
        "location": "We are located at Street 123, Phnom Penh.",
        "contact": "You can reach us at +855 12 345 678."
    }

    # Lowercase input for simple matching
    for keyword, response in rules.items():
        if keyword in user_input.lower():
            return response

    return None  # No rule matched → fallback to AI
