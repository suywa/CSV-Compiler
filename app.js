(function () {
    var DELIMITER = ',';
    var NEWLINE = '\n';
    var qRegex = /^"|"$/g;
    var i = document.getElementById('file');
    var table = document.getElementById('table');
    var chartCanvas = document.getElementById('chart');
    var xField = document.getElementById('x-field');
    var yField = document.getElementById('y-field');
    var errorMessage = document.getElementById('error-message');
    var chart;
    var productSalesDiv = document.getElementById('product-sales');
    var customerPurchasesDiv = document.getElementById('customer-purchases');

    if (!i) {
        return;
    }

    i.addEventListener('change', function () {
        if (!!i.files && i.files.length > 0) {
            var file = i.files[0];
            if (file.type !== 'text/csv') {
                displayError('Please select a CSV file.');
                return;
            }
            parseCSV(file);
        }
    });

    function displayError(message) {
        errorMessage.textContent = message;
    }

    function clearError() {
        errorMessage.textContent = '';
    }

    function parseCSV(file) {
        if (!file || !FileReader) {
            return;
        }

        var reader = new FileReader();

        reader.onload = function (e) {
            clearError();
            toTable(e.target.result);
            populateDropdowns(e.target.result);
            calculateMetrics(e.target.result);
        };

        reader.readAsText(file);
    }

    function toTable(text) {
        if (!text || !table) {
            return;
        }

        // clear table
        while (!!table.lastElementChild) {
            table.removeChild(table.lastElementChild);
        }

        var rows = text.split(NEWLINE);
        var headers = rows.shift().trim().split(DELIMITER);
        var htr = document.createElement('tr');

        headers.forEach(function (h, index) {
            var th = document.createElement('th');
            var ht = h.trim();

            if (!ht) {
                return;
            }

            th.textContent = ht.replace(qRegex, '');

            // Add a dropdown for sorting
            var select = document.createElement('select');
            select.innerHTML = `
                <option value="">Sort by</option>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
                <option value="alph">Alphabetical</option>
                <option value="revAlph">Reverse Alphabetical</option>
            `;
            select.addEventListener('change', function () {
                sortTable(index, select.value);
                updateChartFromTable();
            });

            th.appendChild(select);
            htr.appendChild(th);
        });

        table.appendChild(htr);

        rows.forEach(function (r) {
            r = r.trim();

            if (!r) {
                return;
            }

            var cols = r.split(DELIMITER);

            if (cols.length === 0) {
                return;
            }

            var rtr = document.createElement('tr');

            cols.forEach(function (c) {
                var td = document.createElement('td');
                var tc = c.trim();

                td.textContent = tc.replace(qRegex, '');
                rtr.appendChild(td);
            });

            table.appendChild(rtr);
        });
    }

    function sortTable(columnIndex, order) {
        var rows = Array.from(table.rows).slice(1);
        rows.sort(function (rowA, rowB) {
            var cellA = rowA.cells[columnIndex].textContent;
            var cellB = rowB.cells[columnIndex].textContent;

            if (order === 'asc') {
                return cellA - cellB;
            } else if (order === 'desc') {
                return cellB - cellA;
            } else if (order === 'alph') {
                return cellA.localeCompare(cellB);
            } else if (order === 'revAlph') {
                return cellB.localeCompare(cellA);
            }
            return 0;
        });

        // Re-append sorted rows to table
        rows.forEach(function (row) {
            table.appendChild(row);
        });
    }

    function populateDropdowns(data) {
        var headers = data.split(NEWLINE)[0].trim().split(DELIMITER);
        headers.forEach(function (header, index) {
            var optionX = document.createElement('option');
            var optionY = document.createElement('option');
            optionX.value = index;
            optionY.value = index;
            optionX.textContent = header.trim();
            optionY.textContent = header.trim();
            xField.appendChild(optionX);
            yField.appendChild(optionY);
        });

        xField.addEventListener('change', updateChartFromTable);
        yField.addEventListener('change', updateChartFromTable);
    }

    function updateChartFromTable() {
        var xIndex = xField.value;
        var yIndex = yField.value;

        if (!xIndex || !yIndex) {
            displayError('Please select valid fields for the chart.');
            return;
        }

        var labels = [];
        var values = [];

        Array.from(table.rows).slice(1).forEach(function (row) {
            labels.push(row.cells[xIndex].textContent);
            values.push(parseFloat(row.cells[yIndex].textContent));
        });

        if (values.some(isNaN)) {
            displayError('Selected Y-Axis field contains non-numeric values.');
            return;
        }

        clearError();

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: table.rows[0].cells[yIndex].textContent,
                    data: values,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function calculateMetrics(data) {
        var rows = data.split(NEWLINE).slice(1);
        var headers = data.split(NEWLINE)[0].trim().split(DELIMITER);
        var productIndex = headers.indexOf('Product'); // Adjust if needed
        var salesIndex = headers.indexOf('Total Sales (£)'); // Adjust if needed
        var customerIndex = headers.indexOf('Customer ID'); // Adjust if needed

        if (productIndex === -1 || salesIndex === -1 || customerIndex === -1) {
            displayError('Could not identify necessary columns for products, sales, or customers.');
            return;
        }

        var productSales = {};
        var customerPurchases = {};

        rows.forEach(function (row) {
            var cols = row.split(DELIMITER);
            var product = cols[productIndex].trim();
            var sales = parseFloat(cols[salesIndex].trim());
            var customer = cols[customerIndex].trim();

            if (!isNaN(sales)) {
                if (!productSales[product]) {
                    productSales[product] = 0;
                }
                productSales[product] += sales;
            }

            if (!customerPurchases[customer]) {
                customerPurchases[customer] = 0;
            }
            customerPurchases[customer]++;
        });

        var maxProduct = Object.keys(productSales).reduce((a, b) => productSales[a] > productSales[b] ? a : b);
        var maxCustomer = Object.keys(customerPurchases).reduce((a, b) => customerPurchases[a] > customerPurchases[b] ? a : b);

        productSalesDiv.textContent = `Product with highest sales: ${maxProduct} (${productSales[maxProduct]})`;
        customerPurchasesDiv.textContent = `Customer with highest purchases: ${maxCustomer} (${customerPurchases[maxCustomer]})`;
    }
})();