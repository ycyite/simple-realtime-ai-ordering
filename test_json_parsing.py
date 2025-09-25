#!/usr/bin/env python3
"""
Test script to reproduce the JSON parsing issue with LLM orders
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from menu_rag import MenuRAG
import json

def test_parse_llm_order():
    """Test the parse_llm_order function with various inputs"""

    menu_rag = MenuRAG()

    # Test case 1: Valid ORDER_JSON
    test_response_1 = """Great! I'd be happy to help you with that burger. Based on your request, I'll add a delicious Cheeseburger to your order.

Perfect! I've added 1 Cheeseburger ($9.99) to your order. Your current total is $9.99.

Is there anything else you'd like to add to your order today?

ORDER_JSON: {"action": "add", "items": [{"id": "cheeseburger", "name": "Cheeseburger", "quantity": 1, "price": 9.99}], "total": 9.99, "notes": ""}"""

    print("=== Test 1: Valid ORDER_JSON ===")
    result_1 = menu_rag.parse_llm_order(test_response_1)
    print("Result:", json.dumps(result_1, indent=2))
    print()

    # Test case 2: ORDER_JSON with nested quotes
    test_response_2 = """Thank you! I'll add that to your order.

ORDER_JSON: {"action": "add", "items": [{"id": "cheeseburger", "name": "Deluxe \"Special\" Burger", "quantity": 1, "price": 12.99}], "total": 12.99, "notes": "Extra special"}"""

    print("=== Test 2: ORDER_JSON with nested quotes ===")
    result_2 = menu_rag.parse_llm_order(test_response_2)
    print("Result:", json.dumps(result_2, indent=2))
    print()

    # Test case 3: Malformed JSON
    test_response_3 = """Here's your order!

ORDER_JSON: {"action": "add", "items": [{"id": "cheeseburger", "name": "Cheeseburger", "quantity": 1, "price": 9.99,}], "total": 9.99, "notes": ""}"""

    print("=== Test 3: Malformed JSON (trailing comma) ===")
    result_3 = menu_rag.parse_llm_order(test_response_3)
    print("Result:", json.dumps(result_3, indent=2))
    print()

    # Test case 4: No ORDER_JSON
    test_response_4 = """I'd be happy to help you with your order, but I need more information first. What would you like to order?"""

    print("=== Test 4: No ORDER_JSON ===")
    result_4 = menu_rag.parse_llm_order(test_response_4)
    print("Result:", json.dumps(result_4, indent=2))
    print()

    # Test case 5: Complex nested JSON
    test_response_5 = """Perfect! Your order is ready.

ORDER_JSON: {"action": "add", "items": [{"id": "combo_meal", "name": "Burger Combo", "quantity": 1, "price": 15.99, "extras": {"drink": "Coke", "sides": "Fries"}}], "total": 15.99, "notes": "With extra pickles"}"""

    print("=== Test 5: Complex nested JSON ===")
    result_5 = menu_rag.parse_llm_order(test_response_5)
    print("Result:", json.dumps(result_5, indent=2))
    print()

if __name__ == "__main__":
    test_parse_llm_order()