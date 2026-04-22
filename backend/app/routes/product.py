from flask import Blueprint, request, jsonify
from app.models.product import ProductCategory, CategoryStatus
from app.extensions import db

product_bp = Blueprint('products', __name__)

# --- Product Categories ---

@product_bp.route('/categories', methods=['GET', 'POST'])
def handle_categories():
    if request.method == 'GET':
        categories = ProductCategory.query.limit(20).all()
        return jsonify([{
            "uuid": cat.uuid,
            "name": cat.name,
            "parent": cat.parent,
            "status": cat.status.value
        } for cat in categories]), 200

    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        parent_val = data.get('parent', '0')
        status_val = data.get('status', 'active')

        if not name:
            return jsonify({"error": "Category name is required"}), 400

        # Resolve parent UUID if a name is provided instead of '0'
        resolved_parent = '0'
        if parent_val != '0':
            parent_category = ProductCategory.query.filter_by(name=parent_val).first()
            if not parent_category:
                # If name search fails, check if it's already a valid UUID (optional safety)
                parent_category = ProductCategory.query.get(parent_val)
            
            if parent_category:
                resolved_parent = parent_category.uuid
            else:
                return jsonify({"error": f"Parent category '{parent_val}' not found"}), 404

        category = ProductCategory(
            name=name,
            parent=resolved_parent,
            status=CategoryStatus(status_val)
        )
        
        db.session.add(category)
        db.session.commit()

        return jsonify({"message": "Category added successfully", "uuid": category.uuid}), 201

@product_bp.route('/categories/<uuid>', methods=['PUT'])
def update_category(uuid):
    data = request.get_json()
    category = ProductCategory.query.get_or_404(uuid)

    if 'name' in data:
        category.name = data['name']
    
    if 'parent' in data:
        parent_val = data['parent']
        if parent_val == '0':
            category.parent = '0'
        elif parent_val == category.uuid or parent_val == category.name:
            return jsonify({"error": "A category cannot be its own parent"}), 400
        else:
            # Resolve parent by name or UUID
            parent_category = ProductCategory.query.filter_by(name=parent_val).first()
            if not parent_category:
                parent_category = ProductCategory.query.get(parent_val)
            
            if parent_category:
                if parent_category.uuid == category.uuid:
                     return jsonify({"error": "A category cannot be its own parent"}), 400
                category.parent = parent_category.uuid
            else:
                return jsonify({"error": f"Parent category '{parent_val}' not found"}), 404

    if 'status' in data:
        category.status = CategoryStatus(data['status'])

    db.session.commit()
    return jsonify({"message": "Category updated successfully"}), 200

@product_bp.route('/categories/<uuid>', methods=['DELETE'])
def delete_category(uuid):
    category = ProductCategory.query.get_or_404(uuid)
    
    # Check if it has children
    children = ProductCategory.query.filter_by(parent=uuid).first()
    if children:
        return jsonify({"error": "Cannot delete category with subcategories"}), 400

    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted successfully"}), 200

@product_bp.route('/categories/search/<query>', methods=['GET'])
def search_categories(query):
    # Perform a case-insensitive LIKE query
    categories = ProductCategory.query.filter(ProductCategory.name.ilike(f"%{query}%")).limit(50).all()
    return jsonify([{
        "uuid": cat.uuid,
        "name": cat.name,
        "parent": cat.parent,
        "status": cat.status.value
    } for cat in categories]), 200

# --- Products ---

@product_bp.route('/', methods=['GET'])
def get_products():
    return jsonify({"products": []}), 200

@product_bp.route('/', methods=['POST'])
def add_product():
    return jsonify({"message": "Product added"}), 201
