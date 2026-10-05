from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return "Netflix DevOps Application"

@app.route("/health")
def health():
    return jsonify(status="healthy")

@app.route("/movies")
def movies():
    return jsonify([
        {"id": 1, "title": "Stranger Things", "genre": "Sci-Fi"},
        {"id": 2, "title": "The Crown", "genre": "Drama"},
        {"id": 3, "title": "Wednesday", "genre": "Comedy"}
    ])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)