from flask import Flask, request, jsonify
from modules.rule_engine import get_rule_based_response
from modules.ai_module import get_ai_response

app = Flask(__name__)

@app.route("/api/chat", methods=["POST"])
def chat():
    user_input = request.json.get("message", "")

    # 1. Check rule engine
    rule_response = get_rule_based_response(user_input)
    if rule_response:
        response = rule_response
    else:
        # 2. Fallback to AI
        response = get_ai_response(user_input)

    # 3. Return response
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(debug=True)
