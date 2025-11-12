document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENT SELECTION --- //
    // Login
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // App
    const themeToggler = document.querySelector('.theme-toggler');
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const mainTitle = document.querySelector('main h1');

    // Dashboard elements
    const totalItemsEl = document.getElementById('total-items');
    const totalValueEl = document.getElementById('total-value');
    const lowStockItemsEl = document.getElementById('low-stock-items');
    const categoryPieChartCtx = document.getElementById('categoryPieChart').getContext('2d');
    const topItemsBarChartCtx = document.getElementById('topItemsBarChart').getContext('2d');

    // Inventory elements
    const addItemBtn = document.getElementById('addItemBtn');
    const inventoryTableBody = document.getElementById('inventoryTableBody');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    // Add/Edit Modal
    const itemModal = document.getElementById('itemModal');
    const closeItemModalBtn = itemModal.querySelector('.close-btn');
    const itemForm = document.getElementById('itemForm');
    const modalTitle = document.getElementById('modalTitle');
    const formSubmitBtn = document.getElementById('formSubmitBtn');

    // Details Modal
    const detailsModal = document.getElementById('detailsModal');
    const closeDetailsModalBtn = detailsModal.querySelector('.close-btn');
    const detailsModalTitle = document.getElementById('detailsModalTitle');
    const detailsModalBody = document.getElementById('detailsModalBody');
    const historyTableBody = document.getElementById('historyTableBody');

    // Reports elements
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const importCsvInput = document.getElementById('importCsvInput');

    // --- STATE MANAGEMENT --- //
    let inventory = [];
    let categoryPieChart;
    let topItemsBarChart;

    // --- SAMPLE DATA --- //
    function getSampleData() {
        return [
            { id: 1, name: 'Laptop', category: 'Electronics', quantity: 15, price: 80000, reorderLevel: 5, supplier: 'Dell Inc.', dateAdded: new Date('2025-01-10').toISOString(), history: [{ type: 'Initial Stock', quantityChange: 15, newQuantity: 15, date: new Date('2025-01-10').toISOString() }] },
            { id: 2, name: 'Office Chair', category: 'Furniture', quantity: 30, price: 5000, reorderLevel: 10, supplier: 'Steelcase', dateAdded: new Date('2025-02-05').toISOString(), history: [{ type: 'Initial Stock', quantityChange: 30, newQuantity: 30, date: new Date('2025-02-05').toISOString() }] },
            { id: 3, name: 'A4 Paper Ream', category: 'Office Supplies', quantity: 50, price: 450, reorderLevel: 20, supplier: 'Local Paper Co.', dateAdded: new Date('2025-03-15').toISOString(), history: [{ type: 'Initial Stock', quantityChange: 50, newQuantity: 50, date: new Date('2025-03-15').toISOString() }] },
            { id: 4, name: 'Microscope', category: 'Lab Equipment', quantity: 8, price: 25000, reorderLevel: 3, supplier: 'Olympus', dateAdded: new Date('2025-04-20').toISOString(), history: [{ type: 'Initial Stock', quantityChange: 8, newQuantity: 8, date: new Date('2025-04-20').toISOString() }] },
            { id: 5, name: 'Projector', category: 'Electronics', quantity: 10, price: 45000, reorderLevel: 4, supplier: 'Epson', dateAdded: new Date('2025-05-01').toISOString(), history: [{ type: 'Initial Stock', quantityChange: 10, newQuantity: 10, date: new Date('2025-05-01').toISOString() }] },
            { id: 6, name: 'Basketball', category: 'Sports', quantity: 2, price: 1500, reorderLevel: 5, supplier: 'Spalding', dateAdded: new Date('2025-06-12').toISOString(), history: [{ type: 'Initial Stock', quantityChange: 2, newQuantity: 2, date: new Date('2025-06-12').toISOString() }] },
        ];
    }
    
    // --- AUTHENTICATION --- //
    function checkAuth() {
        if (sessionStorage.getItem('loggedIn') === 'true') {
            loginPage.classList.add('hidden');
            appContainer.classList.remove('hidden');
            loadInventory();
        } else {
            loginPage.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (username === 'admin' && password === 'password') {
            sessionStorage.setItem('loggedIn', 'true');
            checkAuth();
        } else {
            loginError.textContent = 'Invalid username or password.';
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('loggedIn');
        checkAuth();
    });

    // --- DATA PERSISTENCE --- //
    function loadInventory() {
        const storedInventory = localStorage.getItem('pcteInventory');
        inventory = storedInventory ? JSON.parse(storedInventory) : getSampleData();
        renderAll();
    }

    function saveInventory() {
        localStorage.setItem('pcteInventory', JSON.stringify(inventory));
    }
    
    // --- RENDER FUNCTIONS --- //
    function renderAll() {
        renderDashboard();
        renderInventoryTable();
        populateCategoryFilter();
    }

    function renderDashboard() {
        // Update metric cards
        totalItemsEl.textContent = inventory.length;
        const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
        totalValueEl.textContent = `₹${totalValue.toLocaleString('en-IN')}`;

        const lowStockCount = inventory.filter(item => item.quantity <= item.reorderLevel).length;
        lowStockItemsEl.textContent = lowStockCount;
        renderCharts();
    }
    
    function renderInventoryTable() {
        inventoryTableBody.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;

        const filteredInventory = inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm);
            const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        if (filteredInventory.length === 0) {
            inventoryTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No items found.</td></tr>`;
            return;
        }

        filteredInventory.forEach(item => {
            const status = getItemStatus(item);
            const totalValue = (item.quantity || 0) * (item.price || 0);
            const row = `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>${item.quantity || 0}</td>
                    <td>₹${(item.price || 0).toLocaleString('en-IN')}</td>
                    <td>₹${totalValue.toLocaleString('en-IN')}</td>
                    <td><span class="status-${status.class}">${status.text}</span></td>
                    <td>
                        <button class="action-btn view" data-id="${item.id}" title="View Details"><span class="material-icons-sharp">visibility</span></button>
                        <button class="action-btn edit" data-id="${item.id}" title="Edit Item"><span class="material-icons-sharp">edit</span></button>
                        <button class="action-btn delete" data-id="${item.id}" title="Delete Item"><span class="material-icons-sharp">delete</span></button>
                    </td>
                </tr>
            `;
            inventoryTableBody.insertAdjacentHTML('beforeend', row);
        });
    }

    function renderCharts() {
        if (categoryPieChart) categoryPieChart.destroy();
        if (topItemsBarChart) topItemsBarChart.destroy();

        // Data for Category Pie Chart
        const categoryCounts = inventory.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {});

        categoryPieChart = new Chart(categoryPieChartCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    data: Object.values(categoryCounts),
                    backgroundColor: ['#7380ec', '#ff7782', '#41f1b6', '#ffbb55', '#363949', '#a3bdcc'],
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false // FIX: Allows chart to fill the CSS-defined container
            }
        });

        // Data for Top 5 Most Valuable Items Bar Chart
        const sortedItems = [...inventory]
            .sort((a, b) => ((b.quantity || 0) * (b.price || 0)) - ((a.quantity || 0) * (a.price || 0)))
            .slice(0, 5);
        
        topItemsBarChart = new Chart(topItemsBarChartCtx, {
            type: 'bar',
            data: {
                labels: sortedItems.map(item => item.name),
                datasets: [{
                    label: 'Total Value (₹)',
                    data: sortedItems.map(item => (item.quantity || 0) * (item.price || 0)),
                    backgroundColor: '#7380ec',
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, // FIX: Allows chart to fill the CSS-defined container
                indexAxis: 'y' 
            }
        });
    }

    function populateCategoryFilter() {
        const categories = ['all', ...new Set(inventory.map(item => item.category))];
        categoryFilter.innerHTML = categories.map(cat => `<option value="${cat}">${cat === 'all' ? 'All Categories' : cat}</option>`).join('');
    }

    // --- HELPER FUNCTIONS --- //
    function getItemStatus(item) {
        if (item.quantity === 0) return { text: 'Out of Stock', class: 'out-of-stock' };
        if (item.quantity <= item.reorderLevel) return { text: 'Low Stock', class: 'low-stock' };
        return { text: 'In Stock', class: 'in-stock' };
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // --- CRUD OPERATIONS & HISTORY --- //
    function addItem(itemData) {
        const newItem = {
            id: Date.now(),
            ...itemData,
            dateAdded: new Date().toISOString(),
            history: [{
                type: 'Initial Stock',
                quantityChange: itemData.quantity,
                newQuantity: itemData.quantity,
                date: new Date().toISOString()
            }]
        };
        inventory.push(newItem);
        saveAndRerender();
        showToast('Item added successfully!', 'success');
    }

    function updateItem(itemId, itemData) {
        const itemIndex = inventory.findIndex(item => item.id == itemId);
        if (itemIndex > -1) {
            const originalItem = inventory[itemIndex];
            const quantityChange = itemData.quantity - originalItem.quantity;
            
            if (quantityChange !== 0) {
                originalItem.history.push({
                    type: quantityChange > 0 ? 'Stock In' : 'Stock Out',
                    quantityChange: Math.abs(quantityChange),
                    newQuantity: itemData.quantity,
                    date: new Date().toISOString()
                });
            }

            inventory[itemIndex] = { ...originalItem, ...itemData };
            saveAndRerender();
            showToast('Item updated successfully!', 'success');
        }
    }

    function deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            inventory = inventory.filter(item => item.id != itemId);
            saveAndRerender();
            showToast('Item deleted.', 'error');
        }
    }

    function saveAndRerender() {
        saveInventory();
        renderAll();
    }

    // --- EVENT LISTENERS --- //
    
    // Theme Toggler
    themeToggler.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme-variables');
        themeToggler.querySelector('span:nth-child(1)').classList.toggle('active');
        themeToggler.querySelector('span:nth-child(2)').classList.toggle('active');
    });
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            if (!pageId) return;
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(`${pageId}-page`).classList.add('active');
            navLinks.forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');
            mainTitle.textContent = link.querySelector('h3').textContent;
        });
    });

    // Add/Edit Modal Handling
    addItemBtn.addEventListener('click', () => openItemModal('add'));
    closeItemModalBtn.addEventListener('click', closeItemModal);
    window.addEventListener('click', (e) => e.target === itemModal && closeItemModal());

    function openItemModal(mode, itemId = null) {
        itemForm.reset();
        if (mode === 'add') {
            modalTitle.textContent = 'Add New Item';
            formSubmitBtn.textContent = 'Add Item';
            itemForm.dataset.mode = 'add';
            itemForm.dataset.itemId = '';
        } else if (mode === 'edit' && itemId) {
            const item = inventory.find(i => i.id == itemId);
            if (item) {
                modalTitle.textContent = 'Edit Item';
                formSubmitBtn.textContent = 'Update Item';
                document.getElementById('itemName').value = item.name;
                document.getElementById('itemCategory').value = item.category;
                document.getElementById('itemQuantity').value = item.quantity;
                document.getElementById('itemPrice').value = item.price;
                document.getElementById('reorderLevel').value = item.reorderLevel;
                document.getElementById('itemSupplier').value = item.supplier || '';
                itemForm.dataset.mode = 'edit';
                itemForm.dataset.itemId = itemId;
            }
        }
        itemModal.style.display = 'block';
    }
    function closeItemModal() {
        itemModal.style.display = 'none';
    }
    
    // Details Modal Handling
    closeDetailsModalBtn.addEventListener('click', closeDetailsModal);
    window.addEventListener('click', (e) => e.target === detailsModal && closeDetailsModal());

    function openDetailsModal(itemId) {
        const item = inventory.find(i => i.id == itemId);
        if (!item) return;

        detailsModalTitle.textContent = `${item.name} - Details`;
        detailsModalBody.innerHTML = `
            <div class="detail-item"><h4>Category</h4><p>${item.category}</p></div>
            <div class="detail-item"><h4>Supplier</h4><p>${item.supplier || 'N/A'}</p></div>
            <div class="detail-item"><h4>Date Added</h4><p>${new Date(item.dateAdded).toLocaleDateString()}</p></div>
            <div class="detail-item"><h4>Reorder Level</h4><p>${item.reorderLevel}</p></div>
        `;

        historyTableBody.innerHTML = '';
        if (item.history && item.history.length > 0) {
            // sort history newest first
            [...item.history].reverse().forEach(log => {
                const row = `
                    <tr>
                        <td>${new Date(log.date).toLocaleString()}</td>
                        <td>${log.type}</td>
                        <td>${log.type === 'Stock In' ? '+' : (log.type === 'Stock Out' ? '-' : '')}${log.quantityChange}</td>
                        <td>${log.newQuantity}</td>
                    </tr>
                `;
                historyTableBody.insertAdjacentHTML('beforeend', row);
            });
        } else {
            historyTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No history found.</td></tr>`;
        }

        detailsModal.style.display = 'block';
    }
    function closeDetailsModal() {
        detailsModal.style.display = 'none';
    }
    
    // Form Submission
    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemData = {
            name: document.getElementById('itemName').value,
            category: document.getElementById('itemCategory').value,
            quantity: parseInt(document.getElementById('itemQuantity').value, 10),
            price: parseFloat(document.getElementById('itemPrice').value),
            reorderLevel: parseInt(document.getElementById('reorderLevel').value, 10),
            supplier: document.getElementById('itemSupplier').value,
        };
        
        if (itemForm.dataset.mode === 'add') {
            addItem(itemData);
        } else {
            updateItem(itemForm.dataset.itemId, itemData);
        }
        closeItemModal();
    });

    // Inventory Table Actions (View/Edit/Delete)
    inventoryTableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const itemId = target.dataset.id;
        if (target.classList.contains('view')) {
            openDetailsModal(itemId);
        } else if (target.classList.contains('edit')) {
            openItemModal('edit', itemId);
        } else if (target.classList.contains('delete')) {
            deleteItem(itemId);
        }
    });

    // Search and Filter
    searchInput.addEventListener('input', renderInventoryTable);
    categoryFilter.addEventListener('change', renderInventoryTable);
    
    // CSV Export
    exportCsvBtn.addEventListener('click', () => {
        const headers = ['id', 'name', 'category', 'quantity', 'price', 'reorderLevel', 'supplier', 'dateAdded'];
        const csvContent = [
            headers.join(','),
            ...inventory.map(item => headers.map(header => `"${item[header]}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', 'pcte_inventory.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Inventory exported successfully!', 'info');
    });

    // --- INITIAL LOAD --- //
    checkAuth();
});