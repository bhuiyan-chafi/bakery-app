from flask import Blueprint, request, jsonify
from app.extensions import db
from app.utils.decorators import require_permission

recipe_bp = Blueprint('recipes', __name__)


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


@recipe_bp.route('/', methods=['GET'])
@require_permission('recipe:view', 'recipe:manage')
def list_recipes():
    from app.models.product import Recipe
    recipes = Recipe.query.order_by(Recipe.name).all()
    return jsonify([_recipe_to_dict(r) for r in recipes]), 200


@recipe_bp.route('/<recipe_uuid>', methods=['GET'])
@require_permission('recipe:view', 'recipe:manage')
def get_recipe(recipe_uuid):
    from app.models.product import Recipe
    recipe = Recipe.query.get_or_404(recipe_uuid)
    return jsonify(_recipe_to_dict(recipe)), 200


@recipe_bp.route('/', methods=['POST'])
@require_permission('recipe:manage')
def create_recipe():
    from app.models.product import Recipe, RecipeIngredient
    from app.models.inventory import Inventory

    data = request.get_json()
    recipe_name = data.get('name', '').strip()
    instructions = data.get('instructions', '')
    ingredients_data = data.get('ingredients', [])

    if not recipe_name:
        return jsonify({"error": "Recipe name is required"}), 400

    if Recipe.query.filter_by(name=recipe_name).first():
        return jsonify({"error": f"A recipe named '{recipe_name}' already exists"}), 409

    for ing in ingredients_data:
        if not ing.get('inventory_uuid'):
            return jsonify({"error": "Each ingredient must have an inventory_uuid"}), 400
        if not ing.get('quantity') or float(ing['quantity']) <= 0:
            return jsonify({"error": "Each ingredient must have a quantity greater than zero"}), 400
        if not Inventory.query.get(ing['inventory_uuid']):
            return jsonify({"error": f"Inventory item {ing['inventory_uuid']} not found"}), 404

    recipe = Recipe(name=recipe_name, instructions=instructions)
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


@recipe_bp.route('/<recipe_uuid>', methods=['PUT'])
@require_permission('recipe:manage')
def update_recipe(recipe_uuid):
    from app.models.product import Recipe, RecipeIngredient
    from app.models.inventory import Inventory

    recipe = Recipe.query.get_or_404(recipe_uuid)
    data = request.get_json()
    new_name = data.get('name', '').strip()
    instructions = data.get('instructions', '')
    ingredients_data = data.get('ingredients', [])

    if not new_name:
        return jsonify({"error": "Recipe name is required"}), 400

    if new_name != recipe.name:
        if Recipe.query.filter_by(name=new_name).first():
            return jsonify({"error": f"A recipe named '{new_name}' already exists"}), 409

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


@recipe_bp.route('/<recipe_uuid>', methods=['DELETE'])
@require_permission('recipe:manage')
def delete_recipe(recipe_uuid):
    from app.models.product import Recipe
    recipe = Recipe.query.get_or_404(recipe_uuid)
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({"message": "Recipe deleted successfully"}), 200
