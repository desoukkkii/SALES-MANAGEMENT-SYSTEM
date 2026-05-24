let products = [];
let sales = [];
let editingProductId = null;

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function loadSampleData() {
    const sampleProducts = [
        { id: generateId(), name: 'Wireless Headphones', price: 79.99, stock: 45 },
        { id: generateId(), name: 'Mechanical Keyboard', price: 129.99, stock: 32 },
        { id: generateId(), name: 'Gaming Mouse', price: 49.99, stock: 58 },
        { id: generateId(), name: 'USB-C Hub', price: 39.99, stock: 27 },
        { id: generateId(), name: 'Monitor 24"', price: 189.99, stock: 15 }
    ];
    
    const sampleSales = [
        { id: generateId(), customerName: 'Alice Johnson', productId: sampleProducts[0].id, productName: 'Wireless Headphones', quantity: 2, unitPrice: 79.99, discount: 0, total: 159.98, paymentMethod: 'Credit Card', date: new Date().toISOString(), status: 'completed' },
        { id: generateId(), customerName: 'Bob Williams', productId: sampleProducts[1].id, productName: 'Mechanical Keyboard', quantity: 1, unitPrice: 129.99, discount: 5, total: 123.49, paymentMethod: 'Cash', date: new Date(Date.now() - 86400000).toISOString(), status: 'completed' }
    ];
    
    products = sampleProducts;
    sales = sampleSales;
    updateProductStockFromSales();
}

function updateProductStockFromSales() {
    const salesMap = {};
    sales.forEach(sale => {
        if (!salesMap[sale.productId]) {
            salesMap[sale.productId] = 0;
        }
        salesMap[sale.productId] += sale.quantity;
    });
    
    products.forEach(product => {
        const originalStock = product.originalStock || product.stock + (salesMap[product.id] || 0);
        if (!product.originalStock) {
            product.originalStock = product.stock + (salesMap[product.id] || 0);
        }
        const soldQty = salesMap[product.id] || 0;
        product.stock = Math.max(0, product.originalStock - soldQty);
    });
}

function saveToLocalStorage() {
    const dataToSave = {
        products: products.map(p => ({ ...p, originalStock: p.originalStock })),
        sales: sales
    };
    localStorage.setItem('salesManagerData', JSON.stringify(dataToSave));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('salesManagerData');
    if (stored) {
        const data = JSON.parse(stored);
        products = data.products || [];
        sales = data.sales || [];
        if (products.length === 0) loadSampleData();
    } else {
        loadSampleData();
    }
    updateProductStockFromSales();
}

function updateStats() {
    const totalRevenueElem = document.getElementById('totalRevenue');
    const totalSalesElem = document.getElementById('totalSales');
    const totalCustomersElem = document.getElementById('totalCustomers');
    
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const uniqueCustomers = new Set(sales.map(s => s.customerName.toLowerCase())).size;
    
    if (totalRevenueElem) totalRevenueElem.textContent = `$${totalRevenue.toFixed(2)}`;
    if (totalSalesElem) totalSalesElem.textContent = sales.length;
    if (totalCustomersElem) totalCustomersElem.textContent = uniqueCustomers;
}

function renderProductSelect() {
    const select = document.getElementById('productSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select product</option>';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} - $${product.price.toFixed(2)} (Stock: ${product.stock})`;
        if (product.stock <= 0) option.disabled = true;
        select.appendChild(option);
    });
}

function renderProductList() {
    const container = document.getElementById('productList');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">No products added yet</div>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-item" data-id="${product.id}">
            <div class="product-info">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <div class="product-stock">Stock: ${product.stock}</div>
            </div>
            <div class="product-actions">
                <button class="edit-product" data-action="edit" data-id="${product.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-product" data-action="delete" data-id="${product.id}"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', () => openProductModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
}

function renderSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    
    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No sales recorded yet</td></tr>';
        return;
    }
    
    const sortedSales = [...sales].reverse().slice(0, 20);
    tbody.innerHTML = sortedSales.map(sale => `
        <tr>
            <td>${sale.id.slice(-6)}</td>
            <td>${escapeHtml(sale.customerName)}</td>
            <td>${escapeHtml(sale.productName)}</td>
            <td>${sale.quantity}</td>
            <td>$${sale.total.toFixed(2)}</td>
            <td>${new Date(sale.date).toLocaleDateString()}</td>
            <td><span class="status-badge">${sale.status}</span></td>
        </tr>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function calculateTotal() {
    const productId = document.getElementById('productSelect').value;
    const quantity = parseInt(document.getElementById('quantity').value) || 0;
    const discountPercent = parseFloat(document.getElementById('discount').value) || 0;
    
    if (!productId || quantity <= 0) {
        document.getElementById('totalAmount').value = '$0.00';
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (product) {
        document.getElementById('unitPrice').value = product.price.toFixed(2);
        let subtotal = product.price * quantity;
        const discountAmount = subtotal * (discountPercent / 100);
        const total = subtotal - discountAmount;
        document.getElementById('totalAmount').value = `$${total.toFixed(2)}`;
        return total;
    }
}

function addSale(event) {
    event.preventDefault();
    
    const customerName = document.getElementById('customerName').value.trim();
    const productId = document.getElementById('productSelect').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (!customerName) {
        alert('Please enter customer name');
        return;
    }
    if (!productId) {
        alert('Please select a product');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        alert('Product not found');
        return;
    }
    
    if (quantity > product.stock) {
        alert(`Insufficient stock! Only ${product.stock} units available.`);
        return;
    }
    
    const subtotal = product.price * quantity;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;
    
    const newSale = {
        id: generateId(),
        customerName: customerName,
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        unitPrice: product.price,
        discount: discount,
        total: total,
        paymentMethod: paymentMethod,
        date: new Date().toISOString(),
        status: 'completed'
    };
    
    sales.unshift(newSale);
    product.stock -= quantity;
    saveToLocalStorage();
    
    document.getElementById('saleForm').reset();
    document.getElementById('quantity').value = 1;
    document.getElementById('discount').value = 0;
    document.getElementById('totalAmount').value = '$0.00';
    document.getElementById('customerName').focus();
    
    renderProductSelect();
    renderProductList();
    renderSalesTable();
    updateStats();
    
    alert(`Sale recorded! Total: $${total.toFixed(2)}`);
}

function openProductModal(productId = null) {
    editingProductId = productId;
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const nameInput = document.getElementById('productName');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    
    if (productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
            title.textContent = 'Edit Product';
            nameInput.value = product.name;
            priceInput.value = product.price;
            stockInput.value = product.stock;
        }
    } else {
        title.textContent = 'Add Product';
        nameInput.value = '';
        priceInput.value = '';
        stockInput.value = 100;
    }
    modal.style.display = 'flex';
}

function saveProduct(event) {
    event.preventDefault();
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    
    if (!name || isNaN(price) || price <= 0) {
        alert('Please enter valid product name and price');
        return;
    }
    
    if (editingProductId) {
        const index = products.findIndex(p => p.id === editingProductId);
        if (index !== -1) {
            const oldProduct = products[index];
            const stockDiff = stock - oldProduct.stock;
            products[index] = { ...oldProduct, name, price, stock: Math.max(0, stock) };
            if (oldProduct.originalStock !== undefined) {
                products[index].originalStock = oldProduct.originalStock + stockDiff;
            } else {
                products[index].originalStock = stock;
            }
        }
    } else {
        const newProduct = {
            id: generateId(),
            name: name,
            price: price,
            stock: stock,
            originalStock: stock
        };
        products.push(newProduct);
    }
    
    saveToLocalStorage();
    closeProductModal();
    renderProductSelect();
    renderProductList();
}

function deleteProduct(productId) {
    if (confirm('Delete this product? It will also remove related sales records.')) {
        const hasSales = sales.some(sale => sale.productId === productId);
        if (hasSales && !confirm('This product has sales history. Deleting will also delete those sales. Continue?')) {
            return;
        }
        products = products.filter(p => p.id !== productId);
        sales = sales.filter(sale => sale.productId !== productId);
        saveToLocalStorage();
        renderProductSelect();
        renderProductList();
        renderSalesTable();
        updateStats();
        alert('Product and related sales removed');
    }
}

function resetAllData() {
    if (confirm('⚠️ WARNING: This will delete ALL products, sales, and reset the system. This action cannot be undone. Continue?')) {
        localStorage.removeItem('salesManagerData');
        loadSampleData();
        saveToLocalStorage();
        renderProductSelect();
        renderProductList();
        renderSalesTable();
        updateStats();
        document.getElementById('saleForm').reset();
        document.getElementById('quantity').value = 1;
        document.getElementById('discount').value = 0;
        document.getElementById('totalAmount').value = '$0.00';
        alert('System has been reset to default state');
    }
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    editingProductId = null;
    document.getElementById('productForm').reset();
}

document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    renderProductSelect();
    renderProductList();
    renderSalesTable();
    updateStats();
    
    document.getElementById('saleForm').addEventListener('submit', addSale);
    document.getElementById('productSelect').addEventListener('change', calculateTotal);
    document.getElementById('quantity').addEventListener('input', calculateTotal);
    document.getElementById('discount').addEventListener('input', calculateTotal);
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
    document.getElementById('resetSalesBtn').addEventListener('click', resetAllData);
    document.getElementById('productForm').addEventListener('submit', saveProduct);
    
    document.querySelectorAll('.close-modal, .cancel-modal-btn').forEach(btn => {
        btn.addEventListener('click', closeProductModal);
    });
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('productModal');
        if (e.target === modal) closeProductModal();
    });
});