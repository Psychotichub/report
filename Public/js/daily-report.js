document.addEventListener('DOMContentLoaded', initDailyReport);

function initDailyReport() {
    // Check if user is authenticated
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        console.log('Not authenticated, redirecting to login page');
        window.location.href = '/login';
        return;
    }

    const dateInput = document.getElementById('date');
    const materialNameInput = document.getElementById('material-name');
    const quantityInput = document.getElementById('quantity');
    const locationInput = document.getElementById('location');
    const notesInput = document.getElementById('notes');
    const saveButton = document.querySelector('.save-reoprt');
    const dataTable = document.querySelector('#data-table tbody');
    const savedDataContainer = document.getElementById('saved-data-container');
    const savedDateContainer = document.getElementById('saved-date');
    const materialList = document.getElementById('material-list');
    const filterButton = document.getElementById('filter-btn');
    const materialsTable = document.getElementById('materials-table');
    const filterDateInput = document.getElementById('filter-date');
    const printButton = document.querySelector('.print');
    const exportButton = document.querySelector('.export');
    const sendDataButton = document.querySelector('.send-data');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    const clearInputs = () => {
        materialNameInput.value = '';
        quantityInput.value = '';
        locationInput.value = '';
        notesInput.value = '';
    };

    

    const showElement = (element) => element.classList.remove('hidden');
    const hideElement = (element) => element.classList.add('hidden');


//  console.log('Current date:', new Date().toLocaleDateString('en-CA') + ' ' + new Date().toLocaleTimeString());

    const currentDate = new Date().toLocaleDateString('en-CA').split('T')[0];
    dateInput.value = currentDate;
    filterDateInput.value = currentDate;

    let selectedUnit = '';

    const populateMaterialList = async () => {
        try {
            // Use authenticatedFetch if available, fall back to fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            const response = await fetchFunc('/api/user/materials', {
                headers: typeof authHeader === 'function' ? authHeader() : {}
            });
            
            if (!response.ok) throw new Error('Failed to fetch material names');
            const materials = await response.json();
            materialList.innerHTML = '';
            materials.forEach(material => {
                const option = document.createElement('option');
                option.value = material.materialName;
                option.dataset.unit = material.unit;
                materialList.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching material names:', error);
            alert('Failed to load material names. Please check the console.');
        }
    };
    populateMaterialList();

    materialNameInput.addEventListener('input', () => {
        const selectedOption = materialList.querySelector(`option[value="${materialNameInput.value}"]`);
        selectedUnit = selectedOption ? selectedOption.dataset.unit : '';

        const query = materialNameInput.value.toLowerCase();
        const filteredOptions = Array.from(materialList.options).filter(option =>
            option.value.toLowerCase().includes(query)
        );

        const dropdown = document.getElementById('material-dropdown');
        dropdown.innerHTML = '';

        if (filteredOptions.length > 0) {
            filteredOptions.forEach(option => {
                const dropdownItem = document.createElement('div');
                dropdownItem.className = 'dropdown-item';
                dropdownItem.textContent = option.value;
                // carry unit to the dropdown item for keyboard selection path
                dropdownItem.dataset.unit = option.dataset.unit || '';
                dropdownItem.addEventListener('click', () => {
                    materialNameInput.value = option.value;
                    selectedUnit = option.dataset.unit || '';
                    dropdown.classList.add('hidden');
                });
                dropdown.appendChild(dropdownItem);
            });
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    });

    // Add keyboard navigation for material dropdown
    let selectedDropdownIndex = -1;
    const dropdown = document.getElementById('material-dropdown');

    materialNameInput.addEventListener('keydown', (e) => {
        const dropdownItems = dropdown.querySelectorAll('.dropdown-item');
        
        if (!dropdownItems.length || dropdown.classList.contains('hidden')) {
            selectedDropdownIndex = -1;
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedDropdownIndex = Math.min(selectedDropdownIndex + 1, dropdownItems.length - 1);
                updateDropdownSelection(dropdownItems);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedDropdownIndex = Math.max(selectedDropdownIndex - 1, -1);
                updateDropdownSelection(dropdownItems);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedDropdownIndex >= 0 && selectedDropdownIndex < dropdownItems.length) {
                    const selectedItem = dropdownItems[selectedDropdownIndex];
                    const name = selectedItem.textContent;
                    materialNameInput.value = name;
                    // prefer unit from the dropdown item, otherwise resolve from datalist options
                    selectedUnit = selectedItem.dataset.unit || (Array.from(materialList.options).find(opt => opt.value === name)?.dataset.unit || '');
                    dropdown.classList.add('hidden');
                    selectedDropdownIndex = -1;
                }
                break;
            case 'Escape':
                dropdown.classList.add('hidden');
                selectedDropdownIndex = -1;
                break;
        }
    });

    function updateDropdownSelection(dropdownItems) {
        dropdownItems.forEach((item, index) => {
            if (index === selectedDropdownIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // Reset selection when input changes
    materialNameInput.addEventListener('input', () => {
        selectedDropdownIndex = -1;
    });

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('material-dropdown');
        if (!materialNameInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    materialNameInput.addEventListener('blur', () => {
        const isValid = Array.from(materialList.options).some(option =>
            option.value === materialNameInput.value.trim()
        );
        if (!isValid) {
            materialNameInput.value = '';
            selectedUnit = '';
        }
    });

    saveButton.addEventListener('click', async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        const materialName = materialNameInput.value.trim();
        const quantity = quantityInput.value.trim();
        const location = locationInput.value.trim();
        const notes = notesInput.value.trim();
        const date = dateInput.value;

        if (!materialName || !quantity || !date || !selectedUnit || !location) {
            alert('Please fill in all required fields, including selecting a material, unit, and location.');
            return;
        }

        const selectedOption = Array.from(materialList.options).find(option => option.value === materialName);
        const unit = selectedOption ? selectedOption.dataset.unit : selectedUnit;

        const data = {
            materialName,
            quantity: Number(quantity),
            unit,
            location,
            notes,
            date: new Date(date).toLocaleDateString('en-CA').split('T')[0]
        };

        try {
            // Use authenticatedFetch if available, fall back to fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            let response;
            if (saveButton.dataset.id) {
                const id = saveButton.dataset.id;
                response = await fetchFunc(`/api/user/daily-reports/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(typeof authHeader === 'function' ? authHeader() : {})
                    },
                    body: JSON.stringify(data)
                });
                saveButton.textContent = 'Save';
                delete saveButton.dataset.id;
            } else {
                response = await fetchFunc('/api/user/daily-reports', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(typeof authHeader === 'function' ? authHeader() : {})
                    },
                    body: JSON.stringify({ materials: [data] })
                });
            }
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert('Data saved successfully!');
            dataTable.innerHTML = '';
            hideElement(savedDataContainer);
            hideElement(sendDataButton);
            savedDateContainer.textContent = '';
            fetchDailyReportsByDate(filterDateInput.value);
        } catch (error) {
            console.error('Error saving data:', error);
            alert('Failed to save data. ' + error.message);
        }
        clearInputs();
    });

    sendDataButton.addEventListener('click', async () => {
        const rows = document.querySelectorAll('#data-table tbody tr');
        const dataToSend = Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            const quantityWithUnit = cells[1].textContent.trim();
            const [quantity, unit] = quantityWithUnit.split(' ');

            return {
                materialName: cells[0].textContent.trim(),
                quantity: Number(quantity),
                unit: unit.trim(),
                location: cells[2].textContent.trim(),
                notes: cells[3].textContent.trim(),
                date: dateInput.value
            };
        });

        if (!dataToSend.length) {
            alert('No data to send.');
            return;
        }

        try {
            // Use authenticatedFetch if available, fall back to fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            const response = await fetchFunc('/api/user/daily-reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(typeof authHeader === 'function' ? authHeader() : {})
                },
                body: JSON.stringify({ materials: dataToSend })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert('Data sent successfully!');
            dataTable.innerHTML = '';
            hideElement(savedDataContainer);
            hideElement(sendDataButton);
            savedDateContainer.textContent = '';
        } catch (error) {
            console.error('Error sending data:', error);
            alert('Failed to send data to server.');
        }
    });

    const fetchDailyReportsByDate = async (date) => {
        try {
            // Use authenticatedFetch if available, fall back to fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            
            const response = await fetchFunc(`/api/user/daily-reports/date/${date}`, {
                headers: typeof authHeader === 'function' ? authHeader() : {}
            });
            
            if (!response.ok) throw new Error('Failed to fetch daily reports');
            
            const dailyReports = await response.json();
            const tableBody = materialsTable.querySelector('tbody');
            tableBody.innerHTML = '';
            
            dailyReports.forEach(report => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${report.materialName}</td>
                    <td>${report.quantity} ${report.unit}</td>
                    <td>${report.location}</td>
                    <td>${report.notes || ''}</td>
                    <td>
                        <button class="edit-btn" data-id="${report._id}" data-date="${report.date}">Edit</button>
                        <button class="delete-btn" data-id="${report._id}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            if (dailyReports.length > 0) {
                showElement(materialsTable);
                showElement(printButton);
                showElement(exportButton);
            } else {
                hideElement(materialsTable);
                hideElement(printButton);
                hideElement(exportButton);
            }
            
            return dailyReports;
        } catch (error) {
            console.error('Error fetching daily reports:', error);
            return [];
        }
    };

    fetchDailyReportsByDate(currentDate);
    
    filterButton.addEventListener('click', async () => {
        const selectedDate = filterDateInput.value;
        if (!selectedDate) {
            alert('Please select a date!');
            return;
        }

        fetchDailyReportsByDate(selectedDate);
    });

    prevButton.addEventListener('click', () => {
        const selectedDate = filterDateInput.value;
        const previousDate = new Date(selectedDate);
        previousDate.setDate(previousDate.getDate() - 1);
        filterDateInput.value = previousDate.toLocaleDateString('en-CA');
        fetchDailyReportsByDate(previousDate.toLocaleDateString('en-CA'));
    });

    nextButton.addEventListener('click', () => {
        const selectedDate = filterDateInput.value;
        const nextDate = new Date(selectedDate);
        nextDate.setDate(nextDate.getDate() + 1);
        filterDateInput.value = nextDate.toLocaleDateString('en-CA');
        fetchDailyReportsByDate(nextDate.toLocaleDateString('en-CA'));
    });

    materialsTable.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-btn')) {
            const id = event.target.dataset.id;
            const recordDateRaw = event.target.dataset.date;
            const row = event.target.closest('tr');
            const materialName = row.children[0].textContent.trim();
            const quantity = row.children[1].textContent.split(' ')[0].trim();
            const location = row.children[2].textContent.trim();
            const unit = row.children[1].textContent.split(' ')[1].trim();
            const notes = row.children[3].textContent.trim();

            materialNameInput.value = materialName;
            quantityInput.value = quantity;
            locationInput.value = location;
            
            // Select the correct option in the location dropdown
            const locationOptions = locationInput.options;
            for (let i = 0; i < locationOptions.length; i++) {
                if (locationOptions[i].value === location) {
                    locationOptions[i].selected = true;
                    break;
                }
            }
            
            notesInput.value = notes;
            selectedUnit = unit;
            // Set value on the input element instead of reassigning the constant reference
            locationInput.value = location;

            saveButton.textContent = 'Update';
            saveButton.dataset.id = id;

            // Ensure date input matches the record's date (not current date)
            if (recordDateRaw) {
                const parsedDate = new Date(recordDateRaw);
                const ymd = isNaN(parsedDate) ? String(recordDateRaw) : parsedDate.toLocaleDateString('en-CA');
                if (dateInput) {
                    dateInput.value = ymd;
                }
            }
        }
    });

    materialsTable.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const id = event.target.dataset.id;
            try {
                // Use authenticatedFetch if available, fall back to fetch with auth headers
                const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
                
                const response = await fetchFunc(`/api/user/daily-reports/${id}`, {
                    method: 'DELETE',
                    headers: typeof authHeader === 'function' ? authHeader() : {}
                });
                if (confirm('Are you sure you want to delete?')) {
                    if (!response.ok) throw new Error('Failed to delete report');
                    alert('Deleted successfully');
                    fetchDailyReportsByDate(filterDateInput.value);
                }
            } catch (error) {
                console.error('Error deleting:', error);
                alert('Failed to delete.');
            }
        }
    });

     // Functionality to export data to Excel using xlsx library

    exportButton.addEventListener('click', () => {
        const table = document.getElementById('materials-table');
        const tableClone = table.cloneNode(true);
        tableClone.querySelectorAll('th:last-child, td:last-child').forEach(cell => cell.remove());

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.table_to_sheet(tableClone);

        //styles
        const headerStyle = {
            font: { bold: true, color: { rgb: '000000' }, sz: 12 },
            fill: { fgColor: { rgb: 'CCCCCC' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            }
        };

        const cellStyle = {
            font: { color: { rgb: '000000' }, sz: 11 },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            }
        };

        // Get worksheet range
        const range = XLSX.utils.decode_range(ws['!ref']);

        // Apply styles to cells
        for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                if (!ws[cellAddress]) continue;

                ws[cellAddress].s = row === 0 ? headerStyle : cellStyle;
            }
        }

        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, // Material Name
            { wch: 15 }, // Quantity
            { wch: 30 }, // Location
            { wch: 30 }  // Notes
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Daily Report');
        XLSX.writeFile(wb, `Daily_Report_${filterDateInput.value}.xlsx`);
    });

    printButton.addEventListener('click', () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (!printWindow) {
            alert('Unable to open print window. Please check your browser settings.');
            return;
        }
            printWindow.document.write('<html><head><title>Print</title>');
            printWindow.document.write('<style>table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid black; padding: 8px; }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(`<h1>Daily Report: ${filterDateInput.value}</h1>`);

            const tableClone = materialsTable.cloneNode(true);
            tableClone.querySelectorAll('th:last-child, td:last-child').forEach(cell => cell.remove());
            printWindow.document.write(tableClone.outerHTML);

            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
    });
}
