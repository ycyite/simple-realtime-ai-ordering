'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useRef, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MenuItem } from '@/types';

export default function MenuPage() {
  return (
    <ProtectedRoute>
      <MenuContent />
    </ProtectedRoute>
  );
}

function MenuContent() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantName, setRestaurantName] = useState('');

  // Check if user has selected a restaurant, if not redirect to restaurants page
  useEffect(() => {
    const restaurantId = localStorage.getItem('activeRestaurantId');
    if (!restaurantId) {
      window.location.href = '/restaurants';
      return;
    }
  }, []);

  // Load menu data from API on mount
  useEffect(() => {
    apiFetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        setRestaurantName(data.restaurant?.name || '');
        // Flatten categories into menu items
        const items: MenuItem[] = [];
        data.categories?.forEach((category: any) => {
          category.items?.forEach((item: any) => {
            items.push({
              id: item.id,
              name: item.name,
              description: item.description || '',
              price: item.price,
              category: category.name,
              available: item.available !== false,
            });
          });
        });
        setMenuItems(items);
      })
      .catch(err => console.error('Failed to load menu:', err));
  }, []);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    available: true,
  });

  const categories = Array.from(new Set(menuItems.map((item) => item.category)));
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    setIsMobileSidebarOpen(false); // Close mobile sidebar after selection
    categoryRefs.current[category]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  };

  // Fuzzy search function
  const fuzzySearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = menuItems.filter(item => {
      const itemName = item.name.toLowerCase();
      const itemDescription = item.description.toLowerCase();

      // Simple fuzzy matching: check if characters appear in order
      let queryIndex = 0;
      for (let i = 0; i < itemName.length && queryIndex < lowerQuery.length; i++) {
        if (itemName[i] === lowerQuery[queryIndex]) {
          queryIndex++;
        }
      }

      // Also check if query is substring of name or description
      const isSubstring = itemName.includes(lowerQuery) || itemDescription.includes(lowerQuery);
      const isFuzzyMatch = queryIndex === lowerQuery.length;

      return isSubstring || isFuzzyMatch;
    });

    setSearchResults(results);
    setShowSearchDropdown(results.length > 0);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    fuzzySearch(query);
  };

  const selectSearchResult = (item: MenuItem) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    setSearchResults([]);
    setActiveCategory(item.category);
    setTimeout(() => {
      categoryRefs.current[item.category]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  // Save menu changes to backend
  const saveMenuToBackend = (items: MenuItem[]) => {
    // Rebuild menu structure with categories
    const categories = Array.from(new Set(items.map(item => item.category)));
    const menuData = {
      restaurant: {
        name: restaurantName,
        phone: '',
        location: ''
      },
      categories: categories.map(catName => ({
        id: catName.toLowerCase().replace(/\s+/g, '_'),
        name: catName,
        items: items.filter(item => item.category === catName).map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          available: item.available
        }))
      }))
    };

    apiFetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menuData),
    }).catch(err => console.error('Failed to save menu:', err));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let updatedItems: MenuItem[];
    if (editingItem) {
      // Update existing item
      updatedItems = menuItems.map((item) =>
        item.id === editingItem.id ? { ...item, ...formData } : item
      );
      setSuccessMessage(`"${formData.name}" has been updated successfully!`);
      setEditingItem(null);
    } else {
      // Add new item
      const newItem: MenuItem = {
        id: Date.now().toString(),
        name: formData.name!,
        description: formData.description || '',
        price: formData.price!,
        category: formData.category!,
        available: formData.available!,
      };
      updatedItems = [...menuItems, newItem];
      setSuccessMessage(`"${formData.name}" has been added successfully!`);
    }

    setMenuItems(updatedItems);
    saveMenuToBackend(updatedItems);

    // Show success message
    setShowSuccessMessage(true);
    setIsAddingItem(false);

    // Reset form
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      available: true,
    });

    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsAddingItem(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const updatedItems = menuItems.filter((item) => item.id !== id);
      setMenuItems(updatedItems);
      saveMenuToBackend(updatedItems);
    }
  };

  const toggleAvailability = (id: string) => {
    const updatedItems = menuItems.map((item) =>
      item.id === id ? { ...item, available: !item.available } : item
    );
    setMenuItems(updatedItems);
    saveMenuToBackend(updatedItems);
  };

  const cancelForm = () => {
    setIsAddingItem(false);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      available: true,
    });
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="cursor-pointer md:hidden fixed bottom-6 right-6 z-30 p-4 rounded-full shadow-2xl transition-all duration-200"
          style={{ backgroundColor: '#174D5A', color: '#F2E4D6' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0f3640'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#174D5A'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="cursor-pointer md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar - Category Navigation */}
        <div className={`
          w-64 glass-white border-r flex flex-col
          md:relative fixed inset-y-0 left-0 z-30
          transform transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `} style={{ borderColor: 'rgba(23, 77, 90, 0.2)' }}>
          <div className="p-6 border-b" style={{ borderColor: '#174D5A' }}>
            <h2 className="text-xl font-bold" style={{ color: '#174D5A' }}>Categories</h2>
          </div>
          <nav className="p-4 flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    onClick={() => scrollToCategory(category)}
                    className="cursor-pointer w-full text-left px-4 py-3 rounded-lg transition-all duration-200 shadow-md"
                    style={activeCategory === category
                      ? { backgroundColor: '#FFB975', color: '#174D5A' }
                      : { color: '#174D5A' }
                    }
                    onMouseEnter={(e) => {
                      if (activeCategory !== category) {
                        e.currentTarget.style.backgroundColor = '#F2E4D6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeCategory !== category) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{category}</span>
                      <span className="text-sm font-medium" style={{ color: activeCategory === category ? '#174D5A' : '#4C7A62' }}>
                        {menuItems.filter(item => item.category === category).length}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {!isAddingItem && (
            <div className="p-4 border-t" style={{ borderColor: '#174D5A' }}>
              <button
                onClick={() => setIsAddingItem(true)}
                className="cursor-pointer w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                style={{ backgroundColor: '#FFB975', color: '#174D5A' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffa952'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFB975'}
              >
                <img src="/icons/add_item.png" alt="" className="w-6 h-6" />
                Add Item
              </button>
            </div>
          )}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">

            {/* Search Bar */}
            <div className="mb-6 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for dishes..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true);
                  }}
                  className="w-full px-4 py-3 pl-12 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{
                    borderColor: '#F2E4D6',
                    backgroundColor: 'rgba(242, 228, 214, 0.2)',
                    color: '#F2E4D6'
                  }}
                  onFocusCapture={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#F2E4D6';
                    setTimeout(() => setShowSearchDropdown(false), 200);
                  }}
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: '#F2E4D6' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Search Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border-2 max-h-96 overflow-y-auto z-50" style={{ borderColor: '#174D5A' }}>
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectSearchResult(item)}
                      className="cursor-pointer w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600 truncate">{item.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Category: {item.category}</p>
                        </div>
                        <p className="font-bold ml-4" style={{ color: '#FFB975' }}>${item.price.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

        {/* Success Notification */}
        {showSuccessMessage && (
          <div className="fixed top-20 left-4 right-4 md:left-auto md:right-6 z-50 animate-slide-in">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 md:px-6 py-3 md:py-4 rounded-xl shadow-2xl flex items-center space-x-3">
              <svg className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold text-sm md:text-base">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Modal Overlay for Add/Edit Form */}
        {isAddingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 px-8 py-6 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #174D5A 0%, #4C7A62 100%)', color: '#F2E4D6' }}>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <img src="/icons/add_item.png" alt="" className="w-8 h-8" />
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h2>
                <p className="text-sm mt-1" style={{ color: '#F2E4D6', opacity: 0.9 }}>
                  {editingItem ? 'Update the details below' : 'Fill in the details to create a new item'}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#174D5A' }}>
                      Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Classic Burger"
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-800"
                      style={{ borderColor: '#174D5A' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#174D5A'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#174D5A' }}>
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: parseFloat(e.target.value) })
                      }
                      placeholder="0.00"
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-800"
                      style={{ borderColor: '#174D5A' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#174D5A'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#174D5A' }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    placeholder="Describe this delicious item... (optional)"
                    className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 resize-none text-gray-800"
                    style={{ borderColor: '#174D5A' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#174D5A'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#174D5A' }}>
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    list="categories"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="e.g., Burgers, Drinks, Desserts"
                    className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-800"
                    style={{ borderColor: '#174D5A' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#FFB975'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#174D5A'}
                  />
                  <datalist id="categories">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div className="flex items-center p-4 rounded-lg border-2" style={{ backgroundColor: 'rgba(242, 228, 214, 0.3)', borderColor: '#174D5A' }}>
                  <input
                    type="checkbox"
                    id="available"
                    checked={formData.available}
                    onChange={(e) =>
                      setFormData({ ...formData, available: e.target.checked })
                    }
                    className="w-5 h-5 rounded focus:ring-2 cursor-pointer"
                    style={{ accentColor: '#4C7A62' }}
                  />
                  <label htmlFor="available" className="ml-3 text-sm font-medium cursor-pointer" style={{ color: '#174D5A' }}>
                    Available for ordering
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t" style={{ borderColor: '#174D5A' }}>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="cursor-pointer px-6 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 font-semibold"
                    style={{ backgroundColor: '#F2E4D6', color: '#174D5A' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8d8c7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F2E4D6'}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer px-6 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 active:scale-95 font-bold shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: '#FFB975', color: '#174D5A' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffa952'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFB975'}
                  >
                    <img src="/icons/check-mark.png" alt="" className="w-6 h-6 inline mr-1" />
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

            {/* Menu Items by Category */}
            <div className="space-y-8">
              {categories.map((category) => (
                <div
                  key={category}
                  ref={(el) => { categoryRefs.current[category] = el; }}
                  className="scroll-mt-4"
                >
                  <h2 className="text-2xl font-bold mb-4 pb-3 border-b-2 border-opacity-30 sticky top-0 z-10" style={{background: 'linear-gradient(135deg, #174D5A 0%, #4C7A62 100%)', color: '#F2E4D6', borderColor: '#F2E4D6'}}>
                    {category}
                  </h2>
                  <div className="space-y-4">
                    {menuItems
                      .filter((item) => item.category === category)
                      .map((item) => (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border-2 transition-all duration-200 gap-4 ${
                        item.available ? 'glass-white hover:shadow-xl' : 'glass-white opacity-70'
                      }`}
                    >
                      <div className="flex-1 w-full sm:w-auto">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          {!item.available && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                              Unavailable
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        <p className="text-xl font-bold" style={{ color: '#FFB975' }}>
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => toggleAvailability(item.id)}
                          className={`cursor-pointer px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                            item.available
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500'
                              : 'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500'
                          }`}
                        >
                          {item.available ? 'Mark Unavailable' : 'Mark Available'}
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="cursor-pointer px-3 py-1 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200 text-sm font-medium"
                          style={{ backgroundColor: 'rgba(76, 122, 98, 0.2)', color: '#174D5A' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(76, 122, 98, 0.3)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(76, 122, 98, 0.2)'}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="cursor-pointer px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
