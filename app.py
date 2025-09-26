#!/usr/bin/env python3
"""
Flask Web App for AI Audio Ordering System - Development Version
"""

from flask import Flask, render_template, jsonify, request
from menu_manager import MenuManager

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Initialize menu manager
menu_manager = MenuManager()

# Main routes
@app.route('/')
def realtime():
    """Realtime AI Restaurant - Voice Ordering Interface"""
    return render_template('realtime_ordering.html')

@app.route('/menu')
def menu_management():
    """Menu Management Interface"""
    return render_template('menu_management.html')

# Menu API endpoints
@app.route('/api/menu/full', methods=['GET'])
def get_full_menu():
    """Get complete menu with categories and items"""
    try:
        categories = menu_manager.get_all_categories()
        items = menu_manager.get_all_items()

        return jsonify({
            'success': True,
            'menu': {
                'categories': categories,
                'items': items
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/menu/category', methods=['POST'])
def add_category():
    """Add a new category"""
    try:
        data = request.get_json()
        if not data or not all(key in data for key in ['id', 'name']):
            return jsonify({
                'success': False,
                'error': 'ID and name are required'
            }), 400

        success = menu_manager.add_category(
            data['id'],
            data['name'],
            data.get('description', '')
        )

        if success:
            return jsonify({'success': True})
        else:
            return jsonify({
                'success': False,
                'error': 'Category already exists or failed to save'
            }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/menu/category/<category_id>', methods=['DELETE'])
def delete_category(category_id):
    """Delete a category and all its items"""
    try:
        # Delete all items in this category first
        items_to_delete = [item['id'] for item in menu_manager.get_all_items()
                          if item.get('category') == category_id]

        for item_id in items_to_delete:
            menu_manager.delete_item(item_id)

        # Remove category from the categories list
        categories = menu_manager.get_all_categories()
        updated_categories = [cat for cat in categories if cat.get('id') != category_id]

        menu_manager.menu_data['categories'] = updated_categories
        success = menu_manager.save_menu()

        if success:
            return jsonify({'success': True})
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to delete category'
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/menu/item', methods=['POST'])
def add_item():
    """Add a new menu item"""
    try:
        data = request.get_json()
        if not data or not all(key in data for key in ['id', 'name', 'category', 'price']):
            return jsonify({
                'success': False,
                'error': 'ID, name, category, and price are required'
            }), 400

        success = menu_manager.add_item(data)

        if success:
            return jsonify({'success': True})
        else:
            return jsonify({
                'success': False,
                'error': 'Item already exists or failed to save'
            }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/menu/item/<item_id>', methods=['PUT'])
def update_item(item_id):
    """Update an existing menu item"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Item data is required'
            }), 400

        success = menu_manager.update_item(item_id, data)

        if success:
            return jsonify({'success': True})
        else:
            return jsonify({
                'success': False,
                'error': 'Item not found or failed to update'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/menu/item/<item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete a menu item"""
    try:
        success = menu_manager.delete_item(item_id)

        if success:
            return jsonify({'success': True})
        else:
            return jsonify({
                'success': False,
                'error': 'Item not found or failed to delete'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/menu/refresh-embeddings', methods=['POST'])
def refresh_embeddings():
    """Refresh AI embeddings for menu items"""
    try:
        # Try to refresh embeddings if RAG system is available
        try:
            from menu_rag import MenuRAG
            rag = MenuRAG()
            rag.refresh_embeddings()
            return jsonify({
                'success': True,
                'message': 'AI embeddings refreshed successfully'
            })
        except ImportError:
            return jsonify({
                'success': False,
                'error': 'RAG system not available'
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting AI Audio Ordering System - Development Version...")
    print("📱 Interfaces available:")
    print("   🎙️ Realtime Ordering: http://localhost:5000")
    print("   🍽️ Menu Management: http://localhost:5000/menu")
    app.run(debug=True, host='0.0.0.0', port=5000)