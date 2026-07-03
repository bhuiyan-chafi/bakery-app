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

        resolved_parent = '0'
        if parent_val != '0':
            parent_category = ProductCategory.query.filter_by(name=parent_val).first()
            if not parent_category:
                parent_category = ProductCategory.query.get(parent_val)
            if parent_category:
                resolved_parent = parent_category.uuid
            else:
                return jsonify({"error": f"Parent category '{parent_val}' not found"}), 404

        category = ProductCategory(name=name, parent=resolved_parent, status=CategoryStatus(status_val))
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
    children = ProductCategory.query.filter_by(parent=uuid).first()
    if children:
        return jsonify({"error": "Cannot delete category with subcategories"}), 400
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted successfully"}), 200

@product_bp.route('/categories/search/<query>', methods=['GET'])
def search_categories(query):
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
    from app.models.product import Product, ProductTransaction, ProductTransactionType
    from sqlalchemy import func

    products = Product.query.order_by(Product.name).limit(50).all()
    result = []
    for p in products:
        category = ProductCategory.query.get(p.category_uuid)

        total_in = db.session.query(func.sum(ProductTransaction.quantity)).filter(
            ProductTransaction.product_uuid == p.uuid,
            ProductTransaction.transaction_type == "IN"
        ).scalar() or 0.0

        total_out = db.session.query(func.sum(ProductTransaction.quantity)).filter(
            ProductTransaction.product_uuid == p.uuid,
            ProductTransaction.transaction_type == "OUT"
        ).scalar() or 0.0

        current_stock = max(round(total_in - total_out, 4), 0.0)

        result.append({
            "uuid": p.uuid,
            "name": p.name,
            "category_uuid": p.category_uuid,
            "category_name": category.name if category else None,
            "price": p.price,
            "stock_threshold": p.stock_threshold,
            "current_stock": current_stock
        })
    return jsonify(result), 200

@product_bp.route('/', methods=['POST'])
def add_product():
    from app.models.product import Product
    data = request.get_json()
    name = data.get('name')
    category_uuid = data.get('category_uuid')
    price = data.get('price', 0.0)
    stock_threshold = data.get('stock_threshold', 0.0)

    if not name:
        return jsonify({"error": "Product name is required"}), 400
    if not category_uuid:
        return jsonify({"error": "Category is required"}), 400
    if not ProductCategory.query.get(category_uuid):
        return jsonify({"error": "Category not found"}), 404

    product = Product(name=name, category_uuid=category_uuid, price=float(price), stock_threshold=float(stock_threshold))
    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "Product added successfully", "uuid": product.uuid}), 201

@product_bp.route('/<uuid>', methods=['PUT'])
def update_product(uuid):
    from app.models.product import Product
    product = Product.query.get_or_404(uuid)
    data = request.get_json()

    if 'name' in data:
        product.name = data['name']
    if 'category_uuid' in data:
        if not ProductCategory.query.get(data['category_uuid']):
            return jsonify({"error": "Category not found"}), 404
        product.category_uuid = data['category_uuid']
    if 'price' in data:
        product.price = float(data['price'])
    if 'stock_threshold' in data:
        product.stock_threshold = float(data['stock_threshold'])

    db.session.commit()
    return jsonify({"message": "Product updated successfully"}), 200

@product_bp.route('/<uuid>', methods=['DELETE'])
def delete_product(uuid):
    from app.models.product import Product
    product = Product.query.get_or_404(uuid)
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 200


# --- Recipes ---

def _recipe_to_dict(recipe):
    from app.models.inventory import Inventory
    from app.models.settings import UnitMeasurement
    ingredients = []
    for ing in recipe.ingredients:
        inventory = Inventory.query.get(ing.inventory_uuid)
        unit = UnitMeasurement.query.get(inventory.unit_uuid) if inventory else None
        ingredients.append({
            "uuid": ing.uuid,
            "inventory_uuid": ing.inventory_uuid,
            "inventory_name": inventory.name if inventory else None,
            "unit_measurement": unit.measurement if unit else None,
            "quantity": ing.quantity
        })
    return {
        "uuid": recipe.uuid,
        "name": recipe.name,
        "instructions": recipe.instructions or "",
        "ingredients": ingredients
    }


@product_bp.route('/<product_uuid>/recipes', methods=['GET'])
def list_recipes(product_uuid):
    from app.models.product import Product, Recipe
    product = Product.query.get_or_404(product_uuid)
    recipes = Recipe.query.filter_by(product_uuid=product_uuid).order_by(Recipe.name).all()
    return jsonify({
        "product_uuid": product_uuid,
        "product_name": product.name,
        "recipes": [_recipe_to_dict(r) for r in recipes]
    }), 200


@product_bp.route('/<product_uuid>/recipes', methods=['POST'])
def create_recipe(product_uuid):
    """Always creates a new recipe — never upserts."""
    from app.models.product import Product, Recipe, RecipeIngredient
    from app.models.inventory import Inventory

    Product.query.get_or_404(product_uuid)
    data = request.get_json()
    recipe_name = data.get('name', '').strip()
    instructions = data.get('instructions', '')
    ingredients_data = data.get('ingredients', [])

    if not recipe_name:
        return jsonify({"error": "Recipe name is required"}), 400

    if Recipe.query.filter_by(product_uuid=product_uuid, name=recipe_name).first():
        return jsonify({"error": f"A recipe named '{recipe_name}' already exists for this product"}), 409

    for ing in ingredients_data:
        if not ing.get('inventory_uuid'):
            return jsonify({"error": "Each ingredient must have an inventory_uuid"}), 400
        if not ing.get('quantity') or float(ing['quantity']) <= 0:
            return jsonify({"error": "Each ingredient must have a quantity greater than zero"}), 400
        if not Inventory.query.get(ing['inventory_uuid']):
            return jsonify({"error": f"Inventory item {ing['inventory_uuid']} not found"}), 404

    recipe = Recipe(product_uuid=product_uuid, name=recipe_name, instructions=instructions)
    db.session.add(recipe)
    db.session.flush()

    for ing in ingredients_data:
        db.session.add(RecipeIngredient(
            recipe_uuid=recipe.uuid,
            inventory_uuid=ing['inventory_uuid'],
            quantity=float(ing['quantity'])
        ))

    db.session.commit()
    return jsonify({"message": "Recipe created successfully", "uuid": recipe.uuid}), 201


@product_bp.route('/<product_uuid>/recipes/<recipe_uuid>', methods=['PUT'])
def update_recipe(product_uuid, recipe_uuid):
    from app.models.product import Recipe, RecipeIngredient
    from app.models.inventory import Inventory

    recipe = Recipe.query.filter_by(uuid=recipe_uuid, product_uuid=product_uuid).first_or_404()
    data = request.get_json()
    new_name = data.get('name', '').strip()
    instructions = data.get('instructions', '')
    ingredients_data = data.get('ingredients', [])

    if not new_name:
        return jsonify({"error": "Recipe name is required"}), 400

    if new_name != recipe.name:
        if Recipe.query.filter_by(product_uuid=product_uuid, name=new_name).first():
            return jsonify({"error": f"A recipe named '{new_name}' already exists for this product"}), 409

    for ing in ingredients_data:
        if not ing.get('inventory_uuid'):
            return jsonify({"error": "Each ingredient must have an inventory_uuid"}), 400
        if not ing.get('quantity') or float(ing['quantity']) <= 0:
            return jsonify({"error": "Each ingredient must have a quantity greater than zero"}), 400
        if not Inventory.query.get(ing['inventory_uuid']):
            return jsonify({"error": f"Inventory item {ing['inventory_uuid']} not found"}), 404

    recipe.name = new_name
    recipe.instructions = instructions
    for ing in recipe.ingredients:
        db.session.delete(ing)
    db.session.flush()

    for ing in ingredients_data:
        db.session.add(RecipeIngredient(
            recipe_uuid=recipe.uuid,
            inventory_uuid=ing['inventory_uuid'],
            quantity=float(ing['quantity'])
        ))

    db.session.commit()
    return jsonify({"message": "Recipe updated successfully"}), 200


@product_bp.route('/<product_uuid>/recipes/<recipe_uuid>', methods=['DELETE'])
def delete_recipe(product_uuid, recipe_uuid):
    from app.models.product import Recipe
    recipe = Recipe.query.filter_by(uuid=recipe_uuid, product_uuid=product_uuid).first_or_404()
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({"message": "Recipe deleted successfully"}), 200


# --- Productions ---

@product_bp.route('/<product_uuid>/production', methods=['GET'])
def get_productions(product_uuid):
    from app.models.product import Product, Recipe, Production
    Product.query.get_or_404(product_uuid)
    productions = Production.query.filter_by(product_uuid=product_uuid).order_by(
        Production.produced_at.desc().nullslast()
    ).limit(50).all()

    result = []
    for p in productions:
        recipe = Recipe.query.get(p.recipe_uuid)
        result.append({
            "uuid": p.uuid,
            "recipe_uuid": p.recipe_uuid,
            "recipe_name": recipe.name if recipe else None,
            "batch_quantity": p.batch_quantity,
            "damaged_quantity": p.damaged_quantity,
            "status": p.status.value,
            "produced_at": p.produced_at.isoformat() if p.produced_at else None,
            "notes": p.notes
        })
    return jsonify(result), 200


@product_bp.route('/<product_uuid>/production', methods=['POST'])
def add_production(product_uuid):
    from app.models.product import Product, Recipe, Production, ProductionStatus
    from app.models.inventory import Inventory, InventoryTransaction, TransactionType, TransactionStatus
    from app.models.settings import UnitMeasurement
    from sqlalchemy import func

    Product.query.get_or_404(product_uuid)
    data = request.get_json()

    recipe_uuid = data.get('recipe_uuid')
    batch_quantity = data.get('batch_quantity', 1.0)
    notes = data.get('notes', None)

    if not recipe_uuid:
        return jsonify({"error": "recipe_uuid is required"}), 400
    
    if not batch_quantity or float(batch_quantity) <= 0:
        return jsonify({"error": "batch_quantity must be > 0"}), 400

    recipe = Recipe.query.get(recipe_uuid)
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404

    # Multiplier is exactly the batch_quantity
    multiplier = float(batch_quantity)

    # ── Stock check for every ingredient ──────────────────────────
    shortfalls = []
    deductions = []

    for ing in recipe.ingredients:
        required = round(ing.quantity * multiplier, 6)

        total_in = db.session.query(func.sum(InventoryTransaction.quantity)).filter(
            InventoryTransaction.inventory_uuid == ing.inventory_uuid,
            InventoryTransaction.transaction_type == TransactionType.IN,
            InventoryTransaction.status == TransactionStatus.APPROVED
        ).scalar() or 0.0

        total_out = db.session.query(func.sum(InventoryTransaction.quantity)).filter(
            InventoryTransaction.inventory_uuid == ing.inventory_uuid,
            InventoryTransaction.transaction_type == TransactionType.OUT,
            InventoryTransaction.status == TransactionStatus.APPROVED
        ).scalar() or 0.0

        current_stock = round(total_in - total_out, 6)

        inventory_item = Inventory.query.get(ing.inventory_uuid)
        unit = UnitMeasurement.query.get(inventory_item.unit_uuid) if inventory_item else None
        item_name = inventory_item.name if inventory_item else ing.inventory_uuid
        unit_label = unit.measurement if unit else "units"

        if current_stock < required:
            shortfalls.append({
                "inventory_name": item_name,
                "unit": unit_label,
                "required": required,
                "available": max(current_stock, 0.0),
                "shortfall": round(required - max(current_stock, 0.0), 6)
            })
        else:
            deductions.append({"inventory_uuid": ing.inventory_uuid, "quantity": required})

    if shortfalls:
        return jsonify({
            "error": "Insufficient stock to start production",
            "shortfalls": shortfalls
        }), 422

    # ── All checks passed: atomically create Production + OUT transactions ──
    production = Production(
        product_uuid=product_uuid,
        recipe_uuid=recipe_uuid,
        batch_quantity=float(batch_quantity),
        status=ProductionStatus.PENDING,
        produced_at=None,
        notes=notes
    )
    db.session.add(production)

    for d in deductions:
        db.session.add(InventoryTransaction(
            inventory_uuid=d["inventory_uuid"],
            quantity=d["quantity"],
            transaction_type=TransactionType.OUT,
            cost=0.0,
            status=TransactionStatus.APPROVED,
            supplier=None
        ))

    db.session.commit()
    return jsonify({"message": "Production started successfully", "uuid": production.uuid}), 201


@product_bp.route('/<product_uuid>/production/<prod_uuid>', methods=['PUT'])
def update_production_status(product_uuid, prod_uuid):
    from app.models.product import Production, ProductionStatus, ProductTransaction, ProductTransactionType
    from datetime import datetime as dt

    production = Production.query.filter_by(uuid=prod_uuid, product_uuid=product_uuid).first_or_404()
    data = request.get_json()
    new_status_val = data.get('status')

    if not new_status_val:
        return jsonify({"error": "status is required"}), 400

    try:
        new_status = ProductionStatus(new_status_val)
    except ValueError:
        return jsonify({"error": f"Invalid status. Must be one of: {[e.value for e in ProductionStatus]}"}), 400

    production.status = new_status

    if new_status == ProductionStatus.COMPLETED:
        damaged_qty_val = data.get('damaged_quantity', 0.0)
        try:
            damaged_qty = float(damaged_qty_val)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid damaged_quantity. Must be a number."}), 400

        if damaged_qty < 0:
            return jsonify({"error": "damaged_quantity cannot be negative."}), 400
        if damaged_qty > production.batch_quantity:
            return jsonify({"error": f"damaged_quantity ({damaged_qty}) cannot exceed batch_quantity ({production.batch_quantity})."}), 400

        production.damaged_quantity = damaged_qty
        production.produced_at = dt.utcnow()

        effective_qty = production.batch_quantity - production.damaged_quantity

        product_tx = ProductTransaction(
            product_uuid=production.product_uuid,
            production_uuid=production.uuid,
            transaction_type=ProductTransactionType.IN,
            quantity=effective_qty,
            notes=f"Auto-created on production completion"
        )
        db.session.add(product_tx)

    db.session.commit()
    return jsonify({"message": f"Status updated to '{new_status_val}'"}), 200


@product_bp.route('/<product_uuid>/production/<prod_uuid>', methods=['DELETE'])
def delete_production(product_uuid, prod_uuid):
    from app.models.product import Production
    production = Production.query.get_or_404(prod_uuid)
    db.session.delete(production)
    db.session.commit()
    return jsonify({"message": "Production deleted"}), 200


@product_bp.route('/production/active', methods=['GET'])
def get_active_productions_count():
    from app.models.product import Production, ProductionStatus
    count = Production.query.filter_by(status=ProductionStatus.RUNNING).count()
    return jsonify({"count": count}), 200
