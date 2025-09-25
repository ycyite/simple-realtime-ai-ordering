#!/usr/bin/env python3
"""
Menu Management System for AI Audio Ordering System
"""

import json
import os
from typing import List, Dict, Optional
from pathlib import Path

class MenuManager:
    """Handles menu items, categories, and pricing"""

    def __init__(self, menu_file: str = "menu.json"):
        self.menu_file = menu_file
        self.menu_data = self.load_menu()

    def load_menu(self) -> Dict:
        """Load menu from JSON file or create default menu"""
        if os.path.exists(self.menu_file):
            try:
                with open(self.menu_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading menu: {e}")
                return self.create_default_menu()
        else:
            return self.create_default_menu()

    def save_menu(self) -> bool:
        """Save menu to JSON file"""
        try:
            with open(self.menu_file, 'w', encoding='utf-8') as f:
                json.dump(self.menu_data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving menu: {e}")
            return False

    def create_default_menu(self) -> Dict:
        """Create a default menu with sample items"""
        default_menu = {
            "categories": [
                {
                    "id": "pizzas",
                    "name": "Pizzas",
                    "description": "Freshly baked pizzas"
                },
                {
                    "id": "burgers",
                    "name": "Burgers",
                    "description": "Juicy burgers and sandwiches"
                },
                {
                    "id": "beverages",
                    "name": "Beverages",
                    "description": "Cold drinks and hot beverages"
                },
                {
                    "id": "sides",
                    "name": "Sides",
                    "description": "Appetizers and side dishes"
                },
                {
                    "id": "desserts",
                    "name": "Desserts",
                    "description": "Sweet treats"
                }
            ],
            "items": [
                # Pizzas
                {
                    "id": "pizza_margherita_small",
                    "name": "Margherita Pizza",
                    "category": "pizzas",
                    "price": 12.99,
                    "size": "Small",
                    "description": "Classic tomato, mozzarella, and basil",
                    "keywords": ["margherita", "pizza", "small", "cheese"]
                },
                {
                    "id": "pizza_margherita_large",
                    "name": "Margherita Pizza",
                    "category": "pizzas",
                    "price": 18.99,
                    "size": "Large",
                    "description": "Classic tomato, mozzarella, and basil",
                    "keywords": ["margherita", "pizza", "large", "cheese"]
                },
                {
                    "id": "pizza_pepperoni_small",
                    "name": "Pepperoni Pizza",
                    "category": "pizzas",
                    "price": 14.99,
                    "size": "Small",
                    "description": "Pepperoni and mozzarella cheese",
                    "keywords": ["pepperoni", "pizza", "small", "meat"]
                },
                {
                    "id": "pizza_pepperoni_large",
                    "name": "Pepperoni Pizza",
                    "category": "pizzas",
                    "price": 21.99,
                    "size": "Large",
                    "description": "Pepperoni and mozzarella cheese",
                    "keywords": ["pepperoni", "pizza", "large", "meat"]
                },

                # Burgers
                {
                    "id": "cheeseburger",
                    "name": "Cheeseburger",
                    "category": "burgers",
                    "price": 9.99,
                    "description": "Beef patty with cheese, lettuce, tomato",
                    "keywords": ["cheeseburger", "burger", "cheese", "beef"]
                },
                {
                    "id": "chicken_burger",
                    "name": "Chicken Burger",
                    "category": "burgers",
                    "price": 10.99,
                    "description": "Grilled chicken breast with mayo and lettuce",
                    "keywords": ["chicken", "burger", "grilled"]
                },

                # Beverages
                {
                    "id": "coke",
                    "name": "Coca-Cola",
                    "category": "beverages",
                    "price": 2.99,
                    "description": "Classic Coca-Cola",
                    "keywords": ["coke", "cola", "drink", "soda", "coca"]
                },
                {
                    "id": "water",
                    "name": "Bottled Water",
                    "category": "beverages",
                    "price": 1.99,
                    "description": "500ml bottled water",
                    "keywords": ["water", "bottle", "drink"]
                },
                {
                    "id": "lemonade",
                    "name": "Fresh Lemonade",
                    "category": "beverages",
                    "price": 3.99,
                    "description": "Freshly squeezed lemonade",
                    "keywords": ["lemonade", "lemon", "drink", "fresh"]
                },

                # Sides
                {
                    "id": "fries",
                    "name": "French Fries",
                    "category": "sides",
                    "price": 4.99,
                    "description": "Crispy golden french fries",
                    "keywords": ["fries", "french", "potato", "side"]
                },
                {
                    "id": "onion_rings",
                    "name": "Onion Rings",
                    "category": "sides",
                    "price": 5.99,
                    "description": "Crispy battered onion rings",
                    "keywords": ["onion", "rings", "side", "fried"]
                },

                # Desserts
                {
                    "id": "ice_cream",
                    "name": "Vanilla Ice Cream",
                    "category": "desserts",
                    "price": 4.99,
                    "description": "Creamy vanilla ice cream",
                    "keywords": ["ice", "cream", "vanilla", "dessert"]
                }
            ]
        }

        # Save the default menu
        self.menu_data = default_menu
        self.save_menu()
        return default_menu

    def get_all_categories(self) -> List[Dict]:
        """Get all categories"""
        return self.menu_data.get("categories", [])

    def get_all_items(self) -> List[Dict]:
        """Get all menu items"""
        return self.menu_data.get("items", [])

    def get_items_by_category(self, category_id: str) -> List[Dict]:
        """Get items by category"""
        return [item for item in self.menu_data.get("items", [])
                if item.get("category") == category_id]

    def add_category(self, category_id: str, name: str, description: str = "") -> bool:
        """Add a new category"""
        # Check if category already exists
        for cat in self.menu_data.get("categories", []):
            if cat.get("id") == category_id:
                return False

        new_category = {
            "id": category_id,
            "name": name,
            "description": description
        }

        if "categories" not in self.menu_data:
            self.menu_data["categories"] = []

        self.menu_data["categories"].append(new_category)
        return self.save_menu()

    def add_item(self, item_data: Dict) -> bool:
        """Add a new menu item"""
        required_fields = ["id", "name", "category", "price"]

        # Validate required fields
        for field in required_fields:
            if field not in item_data:
                return False

        # Check if item already exists
        for item in self.menu_data.get("items", []):
            if item.get("id") == item_data["id"]:
                return False

        # Add keywords if not provided
        if "keywords" not in item_data:
            item_data["keywords"] = [
                item_data["name"].lower(),
                item_data["category"].lower()
            ]

        if "items" not in self.menu_data:
            self.menu_data["items"] = []

        self.menu_data["items"].append(item_data)
        return self.save_menu()

    def update_item(self, item_id: str, item_data: Dict) -> bool:
        """Update an existing menu item"""
        for i, item in enumerate(self.menu_data.get("items", [])):
            if item.get("id") == item_id:
                # Preserve the ID
                item_data["id"] = item_id
                self.menu_data["items"][i] = item_data
                return self.save_menu()
        return False

    def delete_item(self, item_id: str) -> bool:
        """Delete a menu item"""
        original_count = len(self.menu_data.get("items", []))
        self.menu_data["items"] = [
            item for item in self.menu_data.get("items", [])
            if item.get("id") != item_id
        ]

        if len(self.menu_data["items"]) < original_count:
            return self.save_menu()
        return False

    def search_items(self, query: str) -> List[Dict]:
        """Search for menu items by name or keywords"""
        query = query.lower().strip()
        if not query:
            return []

        matching_items = []
        for item in self.menu_data.get("items", []):
            # Search in name
            if query in item.get("name", "").lower():
                matching_items.append(item)
                continue

            # Search in keywords
            keywords = item.get("keywords", [])
            if any(query in keyword.lower() for keyword in keywords):
                matching_items.append(item)
                continue

            # Search in description
            if query in item.get("description", "").lower():
                matching_items.append(item)

        return matching_items

    def parse_order_from_text(self, text: str) -> Dict:
        """Parse an order from transcribed text"""
        text_lower = text.lower()
        detected_items = []
        total_price = 0.0

        # Look for quantity indicators
        quantity_map = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "a": 1, "an": 1
        }

        # Split text into words for analysis
        words = text_lower.split()

        for item in self.menu_data.get("items", []):
            item_found = False
            quantity = 1

            # Check if any keywords match
            for keyword in item.get("keywords", []):
                if keyword.lower() in text_lower:
                    item_found = True
                    break

            if item_found:
                # Try to find quantity before the item mention
                for keyword in item.get("keywords", []):
                    if keyword.lower() in text_lower:
                        # Find the position of the keyword
                        keyword_pos = -1
                        for i, word in enumerate(words):
                            if keyword.lower() in word:
                                keyword_pos = i
                                break

                        # Look for quantity words before the item
                        if keyword_pos > 0:
                            prev_word = words[keyword_pos - 1]
                            if prev_word in quantity_map:
                                quantity = quantity_map[prev_word]
                            elif prev_word.isdigit():
                                quantity = int(prev_word)

                        # Look for size indicators
                        size_preference = ""
                        if "large" in text_lower and "large" in item.get("keywords", []):
                            size_preference = "large"
                        elif "small" in text_lower and "small" in item.get("keywords", []):
                            size_preference = "small"

                        # If size matters, prefer the matching size
                        if size_preference and item.get("size", "").lower() == size_preference:
                            break
                        elif not size_preference:
                            break

                detected_items.append({
                    "item": item,
                    "quantity": quantity,
                    "subtotal": item["price"] * quantity
                })

                total_price += item["price"] * quantity
                break  # Don't add the same item multiple times

        return {
            "original_text": text,
            "detected_items": detected_items,
            "total_price": round(total_price, 2),
            "item_count": len(detected_items)
        }