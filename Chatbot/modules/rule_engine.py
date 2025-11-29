# modules/rule_engine.py
from modules.ai_module import ask_ai
from database.mysql_config import get_db

def get_menu_from_db():
    """
    Pull menu list from MySQL
    """
    db = get_db()
    cursor = db.cursor()

    cursor.execute("SELECT name, price FROM menu;")
    rows = cursor.fetchall()

    menu_text = "📌 Menu List:\n"
    for item, price in rows:
        menu_text += f"- {item}: ${price}\n"

    cursor.close()
    db.close()

    return menu_text


def handle_rules(user_message):
    """
    Checks rules first. If no rules match → AI answers.
    """

    msg = user_message.lower()

    # Rule 1: User asks for menu
    if "menu" in msg:
        return get_menu_from_db()

    # Rule 2: User asks for opening hours
    if "open" in msg or "time" in msg:
        return "We are open from 8AM to 10PM every day!"

    # Rule 3: User asks location
    if "location" in msg or "where" in msg:
        return "We are located at Phnom Penh, Cambodia."

    # ❌ If none matched → Gemini AI handles the answer
    return ask_ai(user_message)
