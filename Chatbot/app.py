# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from modules.rule_engine import handle_rules
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message", "")

    bot_reply = handle_rules(user_message)

    return jsonify({"response": bot_reply})


if __name__ == "__main__":
    app.run(debug=True)
