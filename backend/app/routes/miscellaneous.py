from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from app.models.miscellaneous import MiscellaneousTransaction
from app.extensions import db

miscellaneous_bp = Blueprint('miscellaneous', __name__)

@miscellaneous_bp.route('', methods=['GET'], strict_slashes=False)
def get_miscellaneous_transactions():
    transactions = MiscellaneousTransaction.query.order_by(MiscellaneousTransaction.created_at.desc()).all()
    return jsonify([t.to_dict() for t in transactions]), 200

@miscellaneous_bp.route('', methods=['POST'], strict_slashes=False)
def add_miscellaneous_transaction():
    data = request.get_json()
    transaction_type = data.get('transaction_type')
    transaction_on = data.get('transaction_on')
    amount = data.get('amount')
    transaction_date_str = data.get('transaction_date')

    if not transaction_type or not transaction_on or amount is None or not transaction_date_str:
        return jsonify({"error": "Missing required fields"}), 400

    if len(transaction_on) > 15:
        return jsonify({"error": "Transaction Note cannot exceed 15 characters"}), 400

    if transaction_type not in ['income', 'expense']:
        return jsonify({"error": "Transaction type must be 'income' or 'expense'"}), 400

    try:
        amount = float(amount)
        # Parse YYYY-MM-DD
        transaction_date = datetime.strptime(transaction_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid amount or date format"}), 400

    transaction = MiscellaneousTransaction(
        transaction_type=transaction_type,
        transaction_on=transaction_on,
        amount=amount,
        transaction_date=transaction_date
    )
    
    db.session.add(transaction)
    db.session.commit()

    return jsonify({"message": "Transaction added successfully", "transaction": transaction.to_dict()}), 201
