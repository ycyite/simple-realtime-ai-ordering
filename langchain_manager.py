#!/usr/bin/env python3
"""
LangChain-powered conversation and memory manager for AI Restaurant Ordering
"""

import json
import os
from typing import Dict, List, Any, Optional
from pathlib import Path

from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder


class RestaurantOrderingAgent:
    """LangChain-powered restaurant ordering agent with memory and knowledge base"""

    def __init__(self, openai_api_key: str = None, menu_file: str = "menu.json"):
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            raise ValueError("OpenAI API key is required")

        self.menu_file = menu_file

        # Initialize LangChain components
        self.llm = ChatOpenAI(
            api_key=self.openai_api_key,
            model="gpt-3.5-turbo",
            temperature=0.7,
            streaming=False
        )

        self.embeddings = OpenAIEmbeddings(api_key=self.openai_api_key)

        # Memory for conversation history
        self.memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            output_key="answer",
            return_messages=True,
            k=10  # Keep last 10 exchanges
        )

        # Vector store for menu and FAQ knowledge
        self.vector_store = None
        self.qa_chain = None

        # Initialize knowledge base
        self._setup_knowledge_base()
        self._setup_qa_chain()

        print("🚀 LangChain Restaurant Ordering Agent initialized!")

    def _setup_knowledge_base(self):
        """Create and populate vector store with menu items and restaurant FAQ"""
        print("📚 Setting up knowledge base...")

        documents = []

        # Load menu items
        if os.path.exists(self.menu_file):
            with open(self.menu_file, 'r') as f:
                menu_data = json.load(f)

            # Create documents for each menu item
            for category in menu_data.get('categories', []):
                for item in category.get('items', []):
                    doc_text = f"""
                    Menu Item: {item['name']}
                    Category: {category['name']}
                    Price: ${item['price']}
                    Description: {item.get('description', 'Delicious item from our menu')}
                    ID: {item['id']}
                    """

                    documents.append(Document(
                        page_content=doc_text,
                        metadata={
                            'type': 'menu_item',
                            'item_id': item['id'],
                            'name': item['name'],
                            'category': category['name'],
                            'price': item['price']
                        }
                    ))

        # Add restaurant FAQ and policies
        faq_items = [
            {
                "question": "What are your hours?",
                "answer": "We're open daily from 11 AM to 10 PM"
            },
            {
                "question": "Do you have vegetarian options?",
                "answer": "Yes! We have several vegetarian options including salads, veggie burgers, and pasta dishes."
            },
            {
                "question": "How do I modify my order?",
                "answer": "You can add items by saying 'add [item]', remove items by saying 'remove [item]', or clear your entire order by saying 'clear order' or 'start over'."
            },
            {
                "question": "What payment methods do you accept?",
                "answer": "We accept cash, credit cards, and mobile payments."
            },
            {
                "question": "Can I customize items?",
                "answer": "Yes! You can customize most items. Just tell me what modifications you'd like."
            },
            {
                "question": "Do you deliver?",
                "answer": "Yes, we offer delivery within a 5-mile radius for orders over $20."
            }
        ]

        for faq in faq_items:
            documents.append(Document(
                page_content=f"Q: {faq['question']}\nA: {faq['answer']}",
                metadata={'type': 'faq'}
            ))

        # Create vector store
        if documents:
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50
            )

            split_docs = text_splitter.split_documents(documents)

            # Use Chroma as vector store
            persist_directory = "chroma_db"
            self.vector_store = Chroma.from_documents(
                documents=split_docs,
                embedding=self.embeddings,
                persist_directory=persist_directory
            )

            print(f"📊 Knowledge base created with {len(split_docs)} documents")
        else:
            print("⚠️  No documents found for knowledge base")

    def _setup_qa_chain(self):
        """Setup the conversational QA chain"""
        if not self.vector_store:
            print("⚠️  No vector store available for QA chain")
            return

        # Create custom prompt for restaurant ordering
        system_message = """You are an AI restaurant receptionist with advanced order management capabilities. You have access to our complete menu and restaurant information through the knowledge base.

CORE RESPONSIBILITIES:
1. Take food orders professionally and accurately
2. Answer questions about menu items, prices, and restaurant policies
3. Handle order modifications (add, remove, clear, update)
4. Provide helpful recommendations
5. Create structured order summaries at the end

ORDER MANAGEMENT RULES:
- ADD: When customers want new items, add them to the order
- REMOVE: When customers say "remove", "delete", "take off", remove specific items
- CLEAR: When customers say "clear order", "start over", "cancel everything", clear the entire order
- UPDATE: When customers change quantities or modifications

CONVERSATION STYLE:
- Be friendly, professional, and efficient
- Always confirm order details and prices
- Ask clarifying questions when needed
- Summarize the order periodically
- Use the knowledge base to answer menu questions accurately

When the conversation is complete and the customer is ready to finalize their order, provide a structured JSON summary in this format:
FINAL_ORDER: {
    "items": [
        {"id": "item_id", "name": "Item Name", "quantity": 1, "price": 12.99, "modifications": "any special requests"},
    ],
    "total": 25.98,
    "notes": "Any additional notes or special requests"
}

Use the retrieved context to provide accurate information about menu items, prices, and restaurant policies.
"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_message),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "Context from knowledge base: {context}\n\nCustomer message: {question}")
        ])

        # Create the conversational chain
        self.qa_chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vector_store.as_retriever(search_kwargs={"k": 5}),
            memory=self.memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": prompt}
        )

        print("🔗 Conversational QA chain setup complete")

    def process_customer_message(self, message: str) -> Dict[str, Any]:
        """Process customer message using LangChain with memory and knowledge retrieval"""
        if not self.qa_chain:
            return {
                "success": False,
                "error": "QA chain not initialized",
                "response": "I'm sorry, there seems to be a technical issue."
            }

        try:
            # Query the chain with the customer message
            result = self.qa_chain({"question": message})

            response_text = result["answer"]
            source_docs = result.get("source_documents", [])

            # Check if this contains a final order
            final_order = self._extract_final_order(response_text)

            return {
                "success": True,
                "response": response_text.replace("FINAL_ORDER:", "").strip(),
                "final_order": final_order,
                "source_documents": [doc.metadata for doc in source_docs],
                "memory_length": len(self.memory.chat_memory.messages)
            }

        except Exception as e:
            print(f"Error processing message: {e}")
            return {
                "success": False,
                "error": str(e),
                "response": "I'm sorry, I had trouble processing your request. Could you please try again?"
            }

    def _extract_final_order(self, response: str) -> Optional[Dict]:
        """Extract final order JSON from response"""
        if "FINAL_ORDER:" not in response:
            return None

        try:
            # Find JSON after FINAL_ORDER:
            start_idx = response.find("FINAL_ORDER:") + len("FINAL_ORDER:")
            json_part = response[start_idx:].strip()

            # Try to extract JSON
            if json_part.startswith("{"):
                # Find the end of JSON
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
                    return json.loads(json_str)

        except (json.JSONDecodeError, ValueError) as e:
            print(f"Failed to parse final order JSON: {e}")
            return None

        return None

    def get_conversation_history(self) -> List[Dict]:
        """Get formatted conversation history"""
        messages = self.memory.chat_memory.messages
        history = []

        for msg in messages:
            if isinstance(msg, HumanMessage):
                history.append({"role": "customer", "content": msg.content})
            elif isinstance(msg, AIMessage):
                history.append({"role": "ai", "content": msg.content})

        return history

    def clear_memory(self):
        """Clear conversation memory"""
        self.memory.clear()
        print("🗑️ Conversation memory cleared")

    def add_to_knowledge_base(self, documents: List[Document]):
        """Add new documents to the knowledge base"""
        if self.vector_store and documents:
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50
            )
            split_docs = text_splitter.split_documents(documents)
            self.vector_store.add_documents(split_docs)
            print(f"📚 Added {len(split_docs)} documents to knowledge base")

    def search_menu(self, query: str, k: int = 5) -> List[Dict]:
        """Search menu items using vector similarity"""
        if not self.vector_store:
            return []

        try:
            results = self.vector_store.similarity_search(
                query,
                k=k,
                filter={"type": "menu_item"}
            )

            return [doc.metadata for doc in results]

        except Exception as e:
            print(f"Error searching menu: {e}")
            return []


# Test function
if __name__ == "__main__":
    # Test the agent
    agent = RestaurantOrderingAgent()

    # Test conversation
    test_messages = [
        "Hi, I'd like to order something",
        "What burgers do you have?",
        "I'll take a cheeseburger and fries",
        "Actually, remove the fries and add a coke instead",
        "That's all for now"
    ]

    print("\n🧪 Testing conversation flow:")
    for msg in test_messages:
        print(f"\n👤 Customer: {msg}")
        result = agent.process_customer_message(msg)
        if result["success"]:
            print(f"🤖 AI: {result['response']}")
            if result["final_order"]:
                print(f"📋 Final Order: {result['final_order']}")
        else:
            print(f"❌ Error: {result['error']}")