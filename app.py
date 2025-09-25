#!/usr/bin/env python3
"""
Flask Web App for Simple Realtime AI Ordering
"""

from flask import Flask, render_template, jsonify
from menu_manager import MenuManager

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Initialize menu manager
menu_manager = MenuManager()

@app.route('/')
def realtime():
    """Simple Realtime AI Restaurant - ChatGPT-style Voice Interface"""
    return render_template('realtime_ordering.html')

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

if __name__ == '__main__':
    print("Starting Simple Realtime AI Ordering Interface...")
    print("Access the interface at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)