from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import cast, Date
from app.models.inventory import InventoryTransaction, TransactionType, TransactionStatus, Inventory
from app.models.miscellaneous import MiscellaneousTransaction
from app.models.order import Order, OrderStatus
from sqlalchemy import func
import uuid
from app.extensions import db

accounts_bp = Blueprint('accounts', __name__)

@accounts_bp.route('/transactions', methods=['GET'], strict_slashes=False)
def get_account_transactions():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    transaction_type = request.args.get('type') # 'income', 'expense', 'profit'

    if not start_date_str or not end_date_str or not transaction_type:
        return jsonify({"error": "Missing required query parameters: start_date, end_date, type"}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format, use YYYY-MM-DD"}), 400

    results = []

    if transaction_type in ['expense', 'profit']:
        # 1. Inventory Transactions (IN, APPROVED)
        inventory_txs = db.session.query(InventoryTransaction, Inventory).join(
            Inventory, InventoryTransaction.inventory_uuid == Inventory.uuid
        ).filter(
            InventoryTransaction.transaction_type == TransactionType.IN,
            InventoryTransaction.status == TransactionStatus.APPROVED,
            cast(InventoryTransaction.datetime, Date) >= start_date,
            cast(InventoryTransaction.datetime, Date) <= end_date
        ).all()

        for tx, inv in inventory_txs:
            results.append({
                "uuid": tx.uuid,
                "date": tx.datetime.date().isoformat(),
                "source": "Inventory",
                "note": f"Purchase: {inv.name}",
                "amount": float(tx.cost),
                "type": "expense"
            })

        # 2. Miscellaneous Expenses
        misc_expenses = MiscellaneousTransaction.query.filter(
            MiscellaneousTransaction.transaction_type == 'expense',
            MiscellaneousTransaction.transaction_date >= start_date,
            MiscellaneousTransaction.transaction_date <= end_date
        ).all()

        for tx in misc_expenses:
            results.append({
                "uuid": tx.uuid,
                "date": tx.transaction_date.isoformat(),
                "source": "Miscellaneous",
                "note": tx.transaction_on,
                "amount": float(tx.amount),
                "type": "expense"
            })

    if transaction_type in ['income', 'profit']:
        # 1. Orders Income (Individual completed orders)
        completed_orders = Order.query.filter(
            Order.status == OrderStatus.COMPLETE,
            cast(Order.created_at, Date) >= start_date,
            cast(Order.created_at, Date) <= end_date
        ).all()

        for order in completed_orders:
            results.append({
                "uuid": order.uuid,
                "date": order.created_at.date().isoformat(),
                "source": "Orders",
                "note": f"Order #{order.order_number}",
                "amount": float(order.total),
                "type": "income"
            })
        
        # 1. Miscellaneous Income
        misc_income = MiscellaneousTransaction.query.filter(
            MiscellaneousTransaction.transaction_type == 'income',
            MiscellaneousTransaction.transaction_date >= start_date,
            MiscellaneousTransaction.transaction_date <= end_date
        ).all()

        for tx in misc_income:
            results.append({
                "uuid": tx.uuid,
                "date": tx.transaction_date.isoformat(),
                "source": "Miscellaneous",
                "note": tx.transaction_on,
                "amount": float(tx.amount),
                "type": "income"
            })

    # Sort results by date descending
    results.sort(key=lambda x: x['date'], reverse=True)

    return jsonify(results), 200
