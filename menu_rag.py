#!/usr/bin/env python3
"""
RAG-Enhanced Menu System for AI Audio Ordering
"""

import json
import numpy as np
from typing import List, Dict, Tuple
import os
from datetime import datetime
import requests

# Try to import required libraries, install if missing
try:
    from sentence_transformers import SentenceTransformer
    import faiss
except ImportError:
    print("Installing required RAG libraries...")
    import subprocess
    import sys

    subprocess.check_call([sys.executable, "-m", "pip", "install", "sentence-transformers", "faiss-cpu"])

    from sentence_transformers import SentenceTransformer
    import faiss

class MenuRAG:
    """RAG system for intelligent menu search and recommendations"""

    def __init__(self, menu_file: str = "menu.json", embeddings_file: str = "menu_embeddings.npy"):
        self.menu_file = menu_file
        self.embeddings_file = embeddings_file
        self.index_file = "menu_index.faiss"

        # Initialize sentence transformer for embeddings
        print("Loading sentence transformer model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')  # Fast, good quality model

        # Load menu data
        self.menu_data = self.load_menu()
        self.menu_items = self.menu_data.get('items', [])

        # Load or create embeddings
        self.embeddings = None
        self.index = None
        self.load_or_create_embeddings()

    def load_menu(self) -> Dict:
        """Load menu from JSON file"""
        if os.path.exists(self.menu_file):
            with open(self.menu_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"items": [], "categories": []}

    def create_item_description_for_embedding(self, item: Dict) -> str:
        """Create a rich description for embedding"""
        parts = []

        # Basic info
        parts.append(f"Name: {item['name']}")

        # Category
        category_name = self.get_category_name(item.get('category', ''))
        if category_name:
            parts.append(f"Category: {category_name}")

        # Size if available
        if item.get('size'):
            parts.append(f"Size: {item['size']}")

        # Description
        if item.get('description'):
            parts.append(f"Description: {item['description']}")

        # Keywords for semantic richness
        if item.get('keywords'):
            parts.append(f"Keywords: {', '.join(item['keywords'])}")

        # Price context
        price = item.get('price', 0)
        if price < 5:
            parts.append("Price range: Budget-friendly, inexpensive, cheap")
        elif price < 15:
            parts.append("Price range: Moderate, reasonably priced")
        else:
            parts.append("Price range: Premium, higher-end")

        return " | ".join(parts)

    def get_category_name(self, category_id: str) -> str:
        """Get category name from ID"""
        for cat in self.menu_data.get('categories', []):
            if cat.get('id') == category_id:
                return cat.get('name', category_id)
        return category_id

    def create_embeddings(self):
        """Create embeddings for all menu items"""
        print(f"Creating embeddings for {len(self.menu_items)} menu items...")

        # Create rich descriptions for embedding
        descriptions = []
        for item in self.menu_items:
            desc = self.create_item_description_for_embedding(item)
            descriptions.append(desc)

        # Create embeddings
        embeddings = self.model.encode(descriptions)

        # Save embeddings
        np.save(self.embeddings_file, embeddings)

        # Create FAISS index for fast similarity search
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity

        # Normalize embeddings for cosine similarity
        embeddings_normalized = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        index.add(embeddings_normalized.astype(np.float32))

        # Save index
        faiss.write_index(index, self.index_file)

        self.embeddings = embeddings_normalized
        self.index = index

        print(f"Created {len(embeddings)} embeddings with {dimension} dimensions")

    def load_or_create_embeddings(self):
        """Load existing embeddings or create new ones"""
        if (os.path.exists(self.embeddings_file) and
            os.path.exists(self.index_file) and
            os.path.getmtime(self.embeddings_file) > os.path.getmtime(self.menu_file)):

            print("Loading existing embeddings...")
            self.embeddings = np.load(self.embeddings_file)
            self.index = faiss.read_index(self.index_file)
            print(f"Loaded {len(self.embeddings)} embeddings")
        else:
            print("Creating new embeddings...")
            self.create_embeddings()

    def search_menu(self, query: str, top_k: int = 5, threshold: float = 0.3) -> List[Dict]:
        """Search menu using semantic similarity"""
        if not self.index or len(self.menu_items) == 0:
            return []

        # Create embedding for query
        query_embedding = self.model.encode([query])
        query_embedding = query_embedding / np.linalg.norm(query_embedding, axis=1, keepdims=True)

        # Search similar items
        scores, indices = self.index.search(query_embedding.astype(np.float32), top_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if score >= threshold:  # Only return items above similarity threshold
                item = self.menu_items[idx].copy()
                item['similarity_score'] = float(score)
                item['relevance'] = self.get_relevance_label(score)
                results.append(item)

        return results

    def get_relevance_label(self, score: float) -> str:
        """Convert similarity score to human-readable relevance"""
        if score >= 0.8:
            return "Highly Relevant"
        elif score >= 0.6:
            return "Relevant"
        elif score >= 0.4:
            return "Somewhat Relevant"
        else:
            return "Possibly Relevant"

    def get_recommendations(self, query: str, customer_context: str = None) -> Dict:
        """Get intelligent menu recommendations with context"""
        # Search for relevant items
        similar_items = self.search_menu(query, top_k=10, threshold=0.3)

        if not similar_items:
            return {
                "found_items": [],
                "recommendations": "I couldn't find menu items matching your request. Could you be more specific?",
                "suggested_categories": self.get_popular_categories(),
                "query": query
            }

        # Group by relevance
        highly_relevant = [item for item in similar_items if item['similarity_score'] >= 0.6]
        somewhat_relevant = [item for item in similar_items if 0.4 <= item['similarity_score'] < 0.6]

        return {
            "found_items": similar_items[:5],  # Top 5 matches
            "highly_relevant": highly_relevant,
            "somewhat_relevant": somewhat_relevant,
            "recommendations": self.generate_recommendation_text(similar_items, query),
            "total_matches": len(similar_items),
            "query": query,
            "timestamp": datetime.now().isoformat()
        }

    def generate_recommendation_text(self, items: List[Dict], query: str) -> str:
        """Generate natural language recommendations"""
        if not items:
            return "I couldn't find anything matching your request."

        if len(items) == 1:
            item = items[0]
            return f"I found {item['name']} which seems perfect for you! It's {item.get('description', 'a great choice')} and costs ${item['price']:.2f}."

        top_item = items[0]
        alternatives = items[1:3]  # Next 2 items

        text = f"Based on your request, I'd recommend {top_item['name']} (${top_item['price']:.2f})"

        if top_item.get('description'):
            text += f" - {top_item['description']}"

        if alternatives:
            alt_names = [item['name'] for item in alternatives]
            text += f". You might also like {', '.join(alt_names)}."

        return text

    def get_popular_categories(self) -> List[str]:
        """Get list of available categories"""
        return [cat['name'] for cat in self.menu_data.get('categories', [])]

    def smart_order_parsing(self, customer_text: str) -> Dict:
        """Parse customer order using RAG with quantity and preference detection"""
        # First, find relevant items
        recommendations = self.get_recommendations(customer_text)

        # Try to extract quantities and preferences
        parsed_order = self.extract_order_details(customer_text, recommendations['found_items'])

        return {
            "original_text": customer_text,
            "recommendations": recommendations,
            "parsed_order": parsed_order,
            "confidence": self.calculate_order_confidence(parsed_order),
            "timestamp": datetime.now().isoformat()
        }

    def extract_order_details(self, text: str, relevant_items: List[Dict]) -> Dict:
        """Extract order quantities and preferences from text"""
        import re

        text_lower = text.lower()

        # Extract quantities
        quantity_patterns = {
            r'\b(one|a|an)\b': 1,
            r'\btwo\b': 2,
            r'\bthree\b': 3,
            r'\bfour\b': 4,
            r'\bfive\b': 5,
            r'\b(\d+)\b': lambda m: int(m.group(1))
        }

        detected_quantities = []
        for pattern, qty in quantity_patterns.items():
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                if callable(qty):
                    detected_quantities.append(qty(match))
                else:
                    detected_quantities.append(qty)

        # Match items with quantities
        order_items = []
        for i, item in enumerate(relevant_items[:len(detected_quantities) or 1]):
            quantity = detected_quantities[i] if i < len(detected_quantities) else 1

            # Check for size preferences
            size_preference = None
            if 'large' in text_lower and item.get('size', '').lower() == 'large':
                size_preference = 'large'
            elif 'small' in text_lower and item.get('size', '').lower() == 'small':
                size_preference = 'small'

            order_items.append({
                'item': item,
                'quantity': quantity,
                'size_preference': size_preference,
                'subtotal': item['price'] * quantity,
                'confidence': item.get('similarity_score', 0)
            })

        total = sum(order_item['subtotal'] for order_item in order_items)

        return {
            "items": order_items,
            "total_price": round(total, 2),
            "item_count": len(order_items),
            "detected_quantities": detected_quantities
        }

    def calculate_order_confidence(self, parsed_order: Dict) -> float:
        """Calculate confidence score for the parsed order"""
        if not parsed_order.get('items'):
            return 0.0

        # Average similarity scores
        similarities = [item['confidence'] for item in parsed_order['items']]
        avg_similarity = sum(similarities) / len(similarities)

        # Boost confidence if quantities were detected
        quantity_boost = 0.1 if parsed_order.get('detected_quantities') else 0

        return min(avg_similarity + quantity_boost, 1.0)

    def parse_llm_order(self, chatgpt_response: str) -> Dict:
        """Parse LLM-generated order from response"""
        import re
        import json

        try:
            # Look for ORDER_JSON: {...} pattern - find the start and then balance braces
            start_match = re.search(r'ORDER_JSON:\s*\{', chatgpt_response)

            if start_match:
                start_pos = start_match.start()
                json_start = chatgpt_response.find('{', start_pos)

                # Balance braces to find the complete JSON object
                brace_count = 0
                json_end = json_start
                in_string = False
                escape_next = False

                for i in range(json_start, len(chatgpt_response)):
                    char = chatgpt_response[i]

                    if escape_next:
                        escape_next = False
                        continue

                    if char == '\\' and in_string:
                        escape_next = True
                        continue

                    if char == '"':
                        in_string = not in_string
                        continue

                    if not in_string:
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_end = i + 1
                                break

                if brace_count == 0:  # Found complete JSON
                    order_json_str = chatgpt_response[json_start:json_end]

                    # Clean up common JSON issues
                    order_json_str = order_json_str.replace('\n', ' ').replace('\r', ' ')
                    # Remove trailing commas before } or ]
                    order_json_str = re.sub(r',(\s*[}\]])', r'\1', order_json_str)

                    print(f"DEBUG: Attempting to parse JSON: {order_json_str}")

                    try:
                        order_data = json.loads(order_json_str)
                    except json.JSONDecodeError as json_error:
                        # Try to fix common issues and parse again
                        print(f"DEBUG: JSON error: {json_error}, attempting to fix...")

                        # Fix unescaped quotes in strings
                        fixed_json = order_json_str

                        # Attempt to fix unescaped quotes in string values
                        if 'Expecting \',\' delimiter' in str(json_error) or 'Invalid \\escape' in str(json_error):
                            # More sophisticated quote fixing
                            fixed_json = self._fix_json_quotes(order_json_str)

                        try:
                            order_data = json.loads(fixed_json)
                            print(f"DEBUG: Fixed JSON successfully")
                        except:
                            # If still can't parse, return error
                            raise json_error

                    # Clean the response text (remove the JSON part)
                    clean_response = chatgpt_response[:start_pos].strip()

                    return {
                        "has_order": True,
                        "order_data": order_data,
                        "clean_response": clean_response,
                        "action": order_data.get("action", "add"),
                        "items": order_data.get("items", []),
                        "total": order_data.get("total", 0),
                        "notes": order_data.get("notes", "")
                    }

            # No ORDER_JSON found
            return {
                "has_order": False,
                "clean_response": chatgpt_response,
                "order_data": None
            }

        except Exception as e:
            print(f"DEBUG: Parse error: {e}")
            return {
                "has_order": False,
                "clean_response": chatgpt_response,
                "error": str(e)
            }

    def _fix_json_quotes(self, json_str: str) -> str:
        """Fix unescaped quotes in JSON string values"""
        import re
        result = []
        i = 0
        in_string = False
        current_quote_start = -1

        while i < len(json_str):
            char = json_str[i]

            if char == '"':
                if not in_string:
                    # Starting a string
                    in_string = True
                    current_quote_start = i
                    result.append(char)
                else:
                    # Check if this quote is the end of the string or an internal quote
                    # Look ahead to see if this is followed by a key separator or value separator
                    next_chars = json_str[i+1:i+10].strip()

                    # If followed by : or , or } or ] or end of string, it's likely the end
                    if (next_chars.startswith(':') or
                        next_chars.startswith(',') or
                        next_chars.startswith('}') or
                        next_chars.startswith(']') or
                        i == len(json_str) - 1):
                        # End of string
                        in_string = False
                        result.append(char)
                    else:
                        # Internal quote - escape it
                        result.append('\\"')

            elif char == '\\' and in_string and i + 1 < len(json_str):
                # Handle already escaped characters
                result.append(char)
                i += 1
                if i < len(json_str):
                    result.append(json_str[i])
            else:
                result.append(char)

            i += 1

        return ''.join(result)

    def get_chatgpt_response(self, rag_analysis: Dict, openai_api_key: str = None) -> Dict:
        """Send RAG analysis to ChatGPT for enhanced response generation"""
        if not openai_api_key:
            return {
                "success": False,
                "error": "OpenAI API key not provided"
            }

        # Prepare context for ChatGPT
        context = self.prepare_chatgpt_context(rag_analysis)

        try:
            headers = {
                "Authorization": f"Bearer {openai_api_key}",
                "Content-Type": "application/json"
            }

            data = {
                "model": "gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a professional restaurant receptionist with advanced order management capabilities. Handle ALL order operations: ADD, REMOVE, CLEAR, and RESTART orders. Based on the customer's request and RAG analysis, respond professionally and manage the order automatically.\n\nORDER MANAGEMENT RULES:\n1. ADD ITEMS: When customer wants to add items, use action: 'add'\n2. REMOVE ITEMS: When customer says 'remove', 'delete', 'take off', 'cancel', use action: 'remove' with the item IDs to remove\n3. CLEAR ORDER: When customer says 'clear order', 'start over', 'cancel everything', 'reset', use action: 'clear' with empty items array\n4. UPDATE QUANTITIES: When customer changes quantities, use action: 'update' with new quantities\n\nYour response should include: 1) Professional acknowledgment of their request, 2) Automatic order management based on their intent, 3) Clear confirmation of what was added/removed/cleared, 4) Current order status with CORRECTLY CALCULATED total, 5) Ask what else they need.\n\nIMPORTANT: Calculate totals by multiplying each item's price by quantity, then sum all items. If customer indicates they're done (says 'that's all', 'nothing else', 'finish order'), acknowledge completion.\n\nALWAYS end your response with ORDER_JSON in this EXACT format:\nORDER_JSON: {\"action\": \"add|remove|clear|update\", \"items\": [{\"id\": \"item_id\", \"name\": \"Item Name\", \"quantity\": 1, \"price\": 14.99}], \"total\": 14.99, \"notes\": \"Customer request details\"}\n\nFor REMOVE action, include only items being removed. For CLEAR action, use empty items array. Use only item IDs from the available menu."
                    },
                    {
                        "role": "user",
                        "content": context
                    }
                ],
                "max_tokens": 300,
                "temperature": 0.7
            }

            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                chatgpt_response = result['choices'][0]['message']['content']

                # Parse LLM-generated order
                order_info = self.parse_llm_order(chatgpt_response)

                return {
                    "success": True,
                    "chatgpt_response": order_info.get("clean_response", chatgpt_response),
                    "raw_response": chatgpt_response,
                    "llm_order": order_info,
                    "usage": result.get('usage', {}),
                    "original_rag": rag_analysis
                }
            else:
                return {
                    "success": False,
                    "error": f"OpenAI API error: {response.status_code} - {response.text}"
                }

        except Exception as e:
            return {
                "success": False,
                "error": f"ChatGPT request failed: {str(e)}"
            }

    def prepare_chatgpt_context(self, rag_analysis: Dict) -> str:
        """Prepare context string for ChatGPT based on RAG analysis"""
        original_text = rag_analysis.get('original_text', '')
        recommendations = rag_analysis.get('recommendations', {})
        parsed_order = rag_analysis.get('parsed_order', {})
        confidence = rag_analysis.get('confidence', 0)

        context = f"Customer said: '{original_text}'\n\n"

        # Add found items
        found_items = recommendations.get('found_items', [])
        if found_items:
            context += "RAG system found these relevant menu items:\n"
            for item in found_items[:3]:  # Top 3 items
                context += f"- {item['name']} (${item['price']:.2f}) - {item.get('description', '')} - Relevance: {item.get('relevance', 'Unknown')}\n"

        # Add parsed order details
        if parsed_order.get('items'):
            context += f"\nParsed Order (Confidence: {confidence:.2f}):\n"
            total_price = 0
            for order_item in parsed_order['items']:
                item = order_item['item']
                quantity = order_item['quantity']
                subtotal = order_item['subtotal']
                context += f"- {quantity}x {item['name']} = ${subtotal:.2f}\n"
                total_price += subtotal
            context += f"Total: ${total_price:.2f}\n"

        context += f"\nRAG System Analysis: {recommendations.get('recommendations', '')}\n"
        context += "\nAvailable menu items for ordering:\n"

        # Add available menu items with IDs for LLM to reference
        if recommendations.get('found_items'):
            for item in recommendations['found_items'][:5]:  # Top 5 matches
                context += f"- ID: {item['id']}, Name: {item['name']}, Price: ${item['price']:.2f}\n"

        context += "\nAs a professional restaurant receptionist with order management:\n"
        context += "1. Acknowledge what the customer wants\n"
        context += "2. CREATE the order automatically using available menu items\n"
        context += "3. Confirm the order with exact items and total price\n"
        context += "4. Ask what else they need\n"
        context += "5. ALWAYS end with ORDER_JSON containing the created order\n"
        context += "6. Use exact item IDs from the available menu items above"

        return context

    def refresh_embeddings(self):
        """Refresh embeddings when menu is updated"""
        print("Refreshing embeddings...")
        self.menu_data = self.load_menu()
        self.menu_items = self.menu_data.get('items', [])
        self.create_embeddings()
        print("Embeddings refreshed!")

# Example usage and testing
if __name__ == "__main__":
    print("Initializing Menu RAG System...")

    # Initialize RAG system
    rag = MenuRAG()

    # Test queries
    test_queries = [
        "I want something spicy and filling",
        "Do you have anything with chicken?",
        "I'm looking for a healthy option",
        "What's good for sharing?",
        "I want two large pepperoni pizzas",
        "Something vegetarian and cheesy",
        "Quick snack under 5 dollars",
        "Comfort food for dinner"
    ]

    print("\n" + "="*50)
    print("TESTING RAG MENU SEARCH")
    print("="*50)

    for query in test_queries:
        print(f"\nQuery: '{query}'")
        print("-" * 30)

        # Get recommendations
        recommendations = rag.get_recommendations(query)
        print(f"Found {len(recommendations['found_items'])} relevant items")

        # Show top 3 results
        for item in recommendations['found_items'][:3]:
            print(f"  • {item['name']} (${item['price']:.2f}) - {item['relevance']}")

        print(f"Recommendation: {recommendations['recommendations']}")

    print(f"\n🎉 RAG Menu System is ready!")
    print("The system can now understand natural language queries!")