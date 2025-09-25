#!/usr/bin/env python3
"""
Enhanced conversation manager with persistent memory and better context management
This is a bridge solution before full LangChain integration
"""

import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
import pickle


class ConversationMemory:
    """Simple conversation memory management"""

    def __init__(self, max_history: int = 20):
        self.messages: List[Dict[str, Any]] = []
        self.max_history = max_history
        self.session_id = None
        self.memory_file = "conversation_memory.pkl"

    def add_message(self, role: str, content: str, metadata: Dict = None):
        """Add a message to conversation history"""
        message = {
            "role": role,  # 'customer', 'ai', 'system'
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }

        self.messages.append(message)

        # Keep only recent messages
        if len(self.messages) > self.max_history:
            self.messages = self.messages[-self.max_history:]

    def get_recent_context(self, num_messages: int = 6) -> str:
        """Get recent conversation context as formatted string"""
        recent = self.messages[-num_messages:] if num_messages else self.messages

        context_lines = []
        for msg in recent:
            role_label = {
                'customer': 'Customer',
                'ai': 'AI Receptionist',
                'system': 'System'
            }.get(msg['role'], msg['role'])

            context_lines.append(f"{role_label}: {msg['content']}")

        return "\n".join(context_lines)

    def get_order_history(self) -> List[Dict]:
        """Extract order-related messages"""
        order_messages = []
        for msg in self.messages:
            if msg.get('metadata', {}).get('contains_order'):
                order_messages.append(msg)
        return order_messages

    def save_to_disk(self):
        """Save memory to disk"""
        try:
            with open(self.memory_file, 'wb') as f:
                pickle.dump(self.messages, f)
        except Exception as e:
            print(f"Failed to save memory: {e}")

    def load_from_disk(self):
        """Load memory from disk"""
        try:
            if os.path.exists(self.memory_file):
                with open(self.memory_file, 'rb') as f:
                    self.messages = pickle.load(f)
                print(f"Loaded {len(self.messages)} messages from memory")
        except Exception as e:
            print(f"Failed to load memory: {e}")

    def clear(self):
        """Clear all conversation history"""
        self.messages = []
        if os.path.exists(self.memory_file):
            os.remove(self.memory_file)


class EnhancedMenuRAG:
    """Enhanced menu RAG with better conversation management and memory"""

    def __init__(self):
        # Import existing components
        try:
            from menu_rag import MenuRAG
            self.base_rag = MenuRAG()
            print("Base RAG system loaded")
        except Exception as e:
            print(f"Failed to load base RAG: {e}")
            self.base_rag = None

        # Initialize conversation memory
        self.memory = ConversationMemory()
        self.memory.load_from_disk()

        # Enhanced system context
        self.system_context = self._build_enhanced_system_prompt()

        print("Enhanced Menu RAG with Memory initialized!")

    def _build_enhanced_system_prompt(self) -> str:
        """Build comprehensive system prompt with restaurant knowledge"""
        return """You are an AI restaurant receptionist with advanced conversational abilities and memory.

RESTAURANT INFORMATION:
- Name: AI Restaurant
- Hours: 11 AM - 10 PM daily
- Delivery: Available within 5 miles for orders over $20
- Payment: Cash, credit cards, mobile payments accepted
- Specialties: Fresh ingredients, customizable orders

CONVERSATION CAPABILITIES:
1. MEMORY: You remember the entire conversation and can reference previous interactions
2. ORDER MANAGEMENT: Handle add, remove, clear, and update operations seamlessly
3. RECOMMENDATIONS: Suggest items based on preferences and conversation history
4. CLARIFICATION: Ask specific questions when orders are unclear
5. CONTEXT AWARENESS: Understand references to "that", "the same", "like before"

ORDER MANAGEMENT RULES:
- ADD: "I want...", "Add...", "Also get me..." → Add items to current order
- REMOVE: "Remove...", "Delete...", "Take off..." → Remove specific items
- CLEAR: "Clear order", "Start over", "Cancel everything" → Empty entire order
- UPDATE: "Change quantity", "Make that 2", "Instead of..." → Modify existing items
- REFERENCE: "Same as before", "Like last time" → Use conversation history

CONVERSATION STYLE:
- Warm and professional, like talking to a regular customer
- Remember customer preferences and previous mentions
- Provide specific recommendations based on conversation context
- Confirm orders clearly with prices
- Handle complex requests intelligently

RESPONSE FORMAT:
Always end with ORDER_JSON containing the complete current order state:
ORDER_JSON: {
    "action": "add|remove|clear|update|none",
    "items": [{"id": "item_id", "name": "Item Name", "quantity": 1, "price": 12.99, "modifications": ""}],
    "total": 25.98,
    "notes": "Special requests or conversation context"
}

Use conversation history to provide personalized, context-aware responses."""

    def process_customer_message(self, customer_message: str, current_order: Dict = None) -> Dict[str, Any]:
        """Process customer message with enhanced memory and context"""

        # Add customer message to memory
        self.memory.add_message("customer", customer_message)

        if not self.base_rag:
            return {
                "success": False,
                "error": "Base RAG system not available"
            }

        try:
            # Build enhanced context with memory
            context = self._build_enhanced_context(customer_message, current_order)

            # Get response from base RAG with enhanced context
            result = self.base_rag.get_chatgpt_response(
                {"text": context},
                os.getenv('OPENAI_API_KEY')
            )

            if result.get('success') and result.get('chatgpt_response'):
                ai_response = result['chatgpt_response']

                # Add AI response to memory
                self.memory.add_message("ai", ai_response, {
                    "contains_order": "ORDER_JSON:" in ai_response
                })

                # Parse the response for order information
                llm_order = self._parse_enhanced_order_response(ai_response)

                # Save memory
                self.memory.save_to_disk()

                return {
                    "success": True,
                    "chatgpt_response": ai_response,
                    "llm_order": llm_order,
                    "conversation_length": len(self.memory.messages)
                }
            else:
                return result

        except Exception as e:
            print(f"Error in enhanced processing: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _build_enhanced_context(self, new_message: str, current_order: Dict = None) -> str:
        """Build rich context including memory and current state"""

        context_parts = []

        # Add system context
        context_parts.append(self.system_context)

        # Add current order state
        if current_order and current_order.get('items'):
            order_summary = []
            total = 0
            for item in current_order['items']:
                item_total = item['quantity'] * item['item']['price']
                total += item_total
                order_summary.append(f"{item['quantity']}x {item['item']['name']} (${item['item']['price']:.2f} each)")

            context_parts.append(f"""
CURRENT ORDER STATE:
Items: {', '.join(order_summary)}
Current Total: ${total:.2f}
""")
        else:
            context_parts.append("CURRENT ORDER STATE: Empty (no items yet)")

        # Add conversation history
        recent_context = self.memory.get_recent_context(6)
        if recent_context:
            context_parts.append(f"""
RECENT CONVERSATION:
{recent_context}
""")

        # Add current customer message
        context_parts.append(f"""
CUSTOMER'S CURRENT MESSAGE: "{new_message}"

Please respond as the AI restaurant receptionist, taking into account the full conversation context and current order state. Provide a natural, helpful response and include the ORDER_JSON with the appropriate action.""")

        return "\n".join(context_parts)

    def _parse_enhanced_order_response(self, response: str) -> Dict:
        """Parse ORDER_JSON from AI response with enhanced error handling"""
        if not response or "ORDER_JSON:" not in response:
            return {"has_order": False}

        try:
            # Use the base RAG parser but with enhancements
            if hasattr(self.base_rag, 'parse_llm_order'):
                parsed = self.base_rag.parse_llm_order(response)
                if parsed and parsed.get('has_order'):
                    return parsed

            # Fallback parsing
            json_start = response.find("ORDER_JSON:") + len("ORDER_JSON:")
            json_part = response[json_start:].strip()

            # Find JSON bounds
            if json_part.startswith("{"):
                bracket_count = 0
                end_idx = 0
                for i, char in enumerate(json_part):
                    if char == "{":
                        bracket_count += 1
                    elif char == "}":
                        bracket_count -= 1
                        if bracket_count == 0:
                            end_idx = i + 1
                            break

                if end_idx > 0:
                    json_str = json_part[:end_idx]
                    order_data = json.loads(json_str)
                    return {
                        "has_order": True,
                        "action": order_data.get("action", "add"),
                        "items": order_data.get("items", []),
                        "total": order_data.get("total", 0),
                        "notes": order_data.get("notes", ""),
                        "clean_response": response.replace(f"ORDER_JSON:{json_str}", "").strip()
                    }

        except Exception as e:
            print(f"Enhanced order parsing error: {e}")

        return {"has_order": False}

    def get_conversation_summary(self) -> Dict:
        """Get conversation statistics and summary"""
        return {
            "total_messages": len(self.memory.messages),
            "recent_context": self.memory.get_recent_context(4),
            "order_history": len(self.memory.get_order_history()),
            "last_interaction": self.memory.messages[-1]["timestamp"] if self.memory.messages else None
        }

    def clear_conversation(self):
        """Clear conversation memory"""
        self.memory.clear()
        print("Conversation memory cleared")

    def get_customer_preferences(self) -> List[str]:
        """Extract customer preferences from conversation history"""
        preferences = []

        for msg in self.memory.messages:
            if msg["role"] == "customer":
                content = msg["content"].lower()
                # Simple preference extraction
                if "like" in content or "love" in content or "favorite" in content:
                    preferences.append(msg["content"])
                if "don't like" in content or "hate" in content or "allergic" in content:
                    preferences.append(f"AVOID: {msg['content']}")

        return preferences[-5:]  # Return recent preferences


# Test function
if __name__ == "__main__":
    print("Testing Enhanced Menu RAG with Memory...")

    enhanced_rag = EnhancedMenuRAG()

    # Test conversation flow
    test_messages = [
        "Hi, I'm looking for something to eat",
        "What burgers do you have?",
        "I'll take a cheeseburger",
        "Actually, can you add fries to that?",
        "What was my total again?"
    ]

    current_order = {"items": [], "totalPrice": 0}

    for i, msg in enumerate(test_messages):
        print(f"\n--- Turn {i+1} ---")
        print(f"Customer: {msg}")

        result = enhanced_rag.process_customer_message(msg, current_order)

        if result["success"]:
            print(f"AI: {result['chatgpt_response']}")
            if result.get('llm_order') and result['llm_order'].get('has_order'):
                print(f"Order Action: {result['llm_order']}")
        else:
            print(f"Error: {result.get('error')}")

    # Show conversation summary
    print("\nConversation Summary:")
    summary = enhanced_rag.get_conversation_summary()
    for key, value in summary.items():
        print(f"  {key}: {value}")