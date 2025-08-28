 
        // Global variables
        let charts = {};
        let filteredData = [];
        let originalData = [];
        let filtersChanged = false;

        // CSV Column mapping based on the provided format
        const CSV_COLUMNS = {
            VIN: 0,
            County: 1,
            City: 2,
            State: 3,
            PostalCode: 4,
            ModelYear: 5,
            Make: 6,
            Model: 7,
            ElectricVehicleType: 8,
            CAFVEligibility: 9,
            ElectricRange: 10,
            BaseMSRP: 11,
            LegislativeDistrict: 12,
            DOLVehicleID: 13,
            VehicleLocation: 14,
            ElectricUtility: 15,
            CensusTract: 16
        };

        // Load and parse CSV data
        async function loadCSVData() {
            try {
                const response = await fetch('Electric_Vehicle_Population_Data.csv');
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const csvText = await response.text();
                
                // Parse CSV with Papa Parse
                const parseResult = Papa.parse(csvText, {
                    header: false,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    delimitersToGuess: [',', '\t', '|', ';'],
                    transformHeader: function(header) {
                        return header.trim();
                    },
                    transform: function(value, field) {
                        if (typeof value === 'string') {
                            return value.trim();
                        }
                        return value;
                    }
                });

                if (parseResult.errors.length > 0) {
                    console.warn('CSV parsing warnings:', parseResult.errors);
                }

                // Transform parsed data to our expected format
                const transformedData = parseResult.data
                    .filter(row => row && row.length >= 10) // Filter out incomplete rows
                    .map(row => ({
                        "VIN": row[CSV_COLUMNS.VIN] || '',
                        "County": row[CSV_COLUMNS.County] || '',
                        "City": row[CSV_COLUMNS.City] || '',
                        "State": row[CSV_COLUMNS.State] || '',
                        "Postal Code": row[CSV_COLUMNS.PostalCode] || '',
                        "Model Year": parseInt(row[CSV_COLUMNS.ModelYear]) || 0,
                        "Make": row[CSV_COLUMNS.Make] || '',
                        "Model": row[CSV_COLUMNS.Model] || '',
                        "Electric Vehicle Type": row[CSV_COLUMNS.ElectricVehicleType] || '',
                        "CAFV Eligibility": row[CSV_COLUMNS.CAFVEligibility] || '',
                        "Electric Range": parseInt(row[CSV_COLUMNS.ElectricRange]) || 0,
                        "Base MSRP": parseInt(row[CSV_COLUMNS.BaseMSRP]) || 0,
                        "Legislative District": parseInt(row[CSV_COLUMNS.LegislativeDistrict]) || 0,
                        "DOL Vehicle ID": row[CSV_COLUMNS.DOLVehicleID] || '',
                        "Vehicle Location": row[CSV_COLUMNS.VehicleLocation] || '',
                        "Electric Utility": row[CSV_COLUMNS.ElectricUtility] || '',
                        "Census Tract": row[CSV_COLUMNS.CensusTract] || ''
                    }))
                    .filter(vehicle => 
                        vehicle.Make && 
                        vehicle.Model && 
                        vehicle["Model Year"] > 1990 && 
                        vehicle["Model Year"] <= new Date().getFullYear() + 2
                    );

                console.log(`Loaded ${transformedData.length} valid EV records from CSV`);
                return transformedData;
                
            } catch (error) {
                console.error('Error loading CSV data:', error);
                
                // Fallback to sample data if CSV loading fails
                showToast('Could not load Electric_Vehicle_Population_Data.csv, using sample data instead', 'warning');
                return getSampleData();
            }
        }

        // Fallback sample data (in case CSV fails to load)
        function getSampleData() {
            return [
                {
                    "VIN": "5YJYGAEE4M",
                    "County": "Clark",
                    "City": "Vancouver",
                    "State": "WA",
                    "Postal Code": "98665",
                    "Model Year": 2021,
                    "Make": "TESLA",
                    "Model": "MODEL Y",
                    "Electric Vehicle Type": "Battery Electric Vehicle (BEV)",
                    "CAFV Eligibility": "Eligibility unknown as battery range has not been researched",
                    "Electric Range": 326,
                    "Base MSRP": 0,
                    "Legislative District": 49,
                    "DOL Vehicle ID": "156850249",
                    "Vehicle Location": "POINT (-122.66592 45.678565)",
                    "Electric Utility": "BONNEVILLE POWER ADMINISTRATION||PUD NO 1 OF CLARK COUNTY - (WA)",
                    "Census Tract": "53011041010"
                },
                {
                    "VIN": "1N4AZ0CP0F",
                    "County": "King",
                    "City": "Seattle",
                    "State": "WA",
                    "Postal Code": "98122",
                    "Model Year": 2020,
                    "Make": "NISSAN",
                    "Model": "LEAF",
                    "Electric Vehicle Type": "Battery Electric Vehicle (BEV)",
                    "CAFV Eligibility": "Clean Alternative Fuel Vehicle Eligible",
                    "Electric Range": 149,
                    "Base MSRP": 0,
                    "Legislative District": 37,
                    "DOL Vehicle ID": "125701579",
                    "Vehicle Location": "POINT (-122.30839 47.610365)",
                    "Electric Utility": "CITY OF SEATTLE - (WA)",
                    "Census Tract": "53033007800"
                },
                {
                    "VIN": "1G1FW6S06H",
                    "County": "King",
                    "City": "Bellevue",
                    "State": "WA",
                    "Postal Code": "98004",
                    "Model Year": 2019,
                    "Make": "CHEVROLET",
                    "Model": "BOLT EV",
                    "Electric Vehicle Type": "Battery Electric Vehicle (BEV)",
                    "CAFV Eligibility": "Clean Alternative Fuel Vehicle Eligible",
                    "Electric Range": 259,
                    "Base MSRP": 0,
                    "Legislative District": 41,
                    "DOL Vehicle ID": "123456789",
                    "Vehicle Location": "POINT (-122.20068 47.610378)",
                    "Electric Utility": "PUGET SOUND ENERGY INC",
                    "Census Tract": "53033022604"
                }
            ];
        }

        // Initialize dashboard
        async function initializeDashboard() {
            try {
                // Update loading message
                updateLoadingMessage("Loading CSV data...");
                
                // Load data from CSV
                originalData = await loadCSVData();
                filteredData = [...originalData];
                
                updateLoadingMessage("Setting up filters...");
                setupFilters();
                
                updateLoadingMessage("Calculating metrics...");
                updateMetrics();
                
                updateLoadingMessage("Creating visualizations...");
                createCharts();
                
                updateLoadingMessage("Preparing data table...");
                updateTable();
                
                setupEventListeners();
                
                // Hide loading and show dashboard with animation
                setTimeout(() => {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('dashboard').style.display = 'block';
                    
                    // Initialize AOS animations
                    AOS.init({
                        duration: 800,
                        easing: 'ease-out-cubic',
                        once: true
                    });
                    
                    showToast(`Dashboard loaded with ${originalData.length} EV records!`, 'success');
                }, 1000);
                
            } catch (error) {
                console.error('Error initializing dashboard:', error);
                showToast('Error loading dashboard. Please check console for details.', 'error');
            }
        }

        // Update loading message
        function updateLoadingMessage(message) {
            const loadingText = document.querySelector('.loading-text p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }

        // Setup event listeners
        function setupEventListeners() {
            // Apply filters button
            document.getElementById('applyFilters').addEventListener('click', applyFilters);
            
            // Reset filters button
            document.getElementById('resetFilters').addEventListener('click', resetFilters);
            
            // Monitor filter changes
            ['makeFilter', 'typeFilter', 'yearFilter', 'countyFilter'].forEach(id => {
                document.getElementById(id).addEventListener('change', () => {
                    filtersChanged = true;
                    updateFilterIndicator();
                });
            });
        }

        // Setup filter dropdowns
        function setupFilters() {
            const makes = [...new Set(originalData.map(d => d.Make))].sort();
            const types = [...new Set(originalData.map(d => d['Electric Vehicle Type']))].sort();
            const years = [...new Set(originalData.map(d => d['Model Year']))].sort((a, b) => b - a);
            const counties = [...new Set(originalData.map(d => d.County))].sort();

            populateFilter('makeFilter', makes);
            populateFilter('typeFilter', types);
            populateFilter('yearFilter', years);
            populateFilter('countyFilter', counties);
        }

        function populateFilter(filterId, options) {
            const select = document.getElementById(filterId);
            // Clear existing options except the first one
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                select.appendChild(optionElement);
            });
        }

        // Update filter indicator
        function updateFilterIndicator() {
            const indicator = document.getElementById('filterIndicator');
            if (filtersChanged) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        }

        // Apply filters to data
        function applyFilters() {
            const makeFilter = document.getElementById('makeFilter').value;
            const typeFilter = document.getElementById('typeFilter').value;
            const yearFilter = document.getElementById('yearFilter').value;
            const countyFilter = document.getElementById('countyFilter').value;

            filteredData = originalData.filter(d => {
                return (!makeFilter || d.Make === makeFilter) &&
                       (!typeFilter || d['Electric Vehicle Type'] === typeFilter) &&
                       (!yearFilter || d['Model Year'] == yearFilter) &&
                       (!countyFilter || d.County === countyFilter);
            });

            filtersChanged = false;
            updateFilterIndicator();
            
            // Add loading animation to apply button
            const applyBtn = document.getElementById('applyFilters');
            applyBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Applying...';
            applyBtn.disabled = true;
            
            setTimeout(() => {
                updateMetrics();
                updateCharts();
                updateTable();
                
                // Reset button
                applyBtn.innerHTML = '<i class="bi bi-check-circle"></i> Applied!';
                setTimeout(() => {
                    applyBtn.innerHTML = '<i class="bi bi-check-circle"></i> Apply Filters';
                    applyBtn.disabled = false;
                }, 1000);
                
                // Show success toast
                showToast('Filters applied successfully!', 'success');
            }, 800);
        }

        // Reset all filters
        function resetFilters() {
            ['makeFilter', 'typeFilter', 'yearFilter', 'countyFilter'].forEach(id => {
                document.getElementById(id).value = '';
            });
            
            filteredData = [...originalData];
            filtersChanged = false;
            updateFilterIndicator();
            
            updateMetrics();
            updateCharts();
            updateTable();
            
            showToast('Filters reset successfully!', 'info');
        }

        // Show toast notification with different types
        function showToast(message, type = 'success') {
            const toastContainer = document.createElement('div');
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                pointer-events: none;
            `;
            
            const iconMap = {
                success: 'check-circle-fill',
                error: 'exclamation-triangle-fill',
                warning: 'exclamation-circle-fill',
                info: 'info-circle-fill'
            };
            
            const toast = document.createElement('div');
            toast.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
            toast.style.cssText = `
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: none;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                pointer-events: auto;
                animation: slideInRight 0.5s ease-out;
                min-width: 300px;
            `;
            
            toast.innerHTML = `
                <i class="bi bi-${iconMap[type] || iconMap.success} me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            toastContainer.appendChild(toast);
            document.body.appendChild(toastContainer);
            
            // Auto remove after 4 seconds
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toastContainer)) {
                        document.body.removeChild(toastContainer);
                    }
                }, 300);
            }, 4000);
        }

        // Update key metrics with animations
        function updateMetrics() {
            const totalVehicles = filteredData.length;
            const avgRange = Math.round(filteredData.reduce((sum, d) => sum + (d['Electric Range'] || 0), 0) / totalVehicles) || 0;
            
            const makeCount = {};
            filteredData.forEach(d => {
                makeCount[d.Make] = (makeCount[d.Make] || 0) + 1;
            });
            const topMake = Object.keys(makeCount).length > 0 ? 
                Object.keys(makeCount).reduce((a, b) => makeCount[a] > makeCount[b] ? a : b) : '-';
            
            const bevCount = filteredData.filter(d => d['Electric Vehicle Type'].includes('BEV')).length;
            const bevPercentage = totalVehicles > 0 ? Math.round((bevCount / totalVehicles) * 100) : 0;

            // Animate counter updates
            animateCounter('totalVehicles', totalVehicles);
            animateCounter('avgRange', avgRange);
            animateText('topMake', topMake);
            animateText('bevPercentage', bevPercentage + '%');
        }

        // Animate counter values
        function animateCounter(elementId, targetValue) {
            const element = document.getElementById(elementId);
            const startValue = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
            const increment = (targetValue - startValue) / 30;
            let current = startValue;
            
            const timer = setInterval(() => {
                current += increment;
                if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
                    current = targetValue;
                    clearInterval(timer);
                }
                element.textContent = Math.round(current).toLocaleString();
            }, 50);
        }

        // Animate text changes
        function animateText(elementId, newText) {
            const element = document.getElementById(elementId);
            element.style.transform = 'scale(0.8)';
            element.style.opacity = '0.5';
            
            setTimeout(() => {
                element.textContent = newText;
                element.style.transform = 'scale(1)';
                element.style.opacity = '1';
            }, 200);
        }

        // Create all charts
        function createCharts() {
            createYearChart();
            createMakeChart();
            createTypeChart();
            createRangeChart();
            createGeoChart();
            createCAFVChart();
        }

        // Update all charts with filtered data
        function updateCharts() {
            updateYearChart();
            updateMakeChart();
            updateTypeChart();
            updateRangeChart();
            updateGeoChart();
            updateCAFVChart();
        }

        // Year chart
        function createYearChart() {
            const ctx = document.getElementById('yearChart').getContext('2d');
            const yearData = {};
            
            filteredData.forEach(d => {
                yearData[d['Model Year']] = (yearData[d['Model Year']] || 0) + 1;
            });

            const sortedYears = Object.keys(yearData).sort();
            
            charts.yearChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedYears,
                    datasets: [{
                        label: 'EVs Registered',
                        data: sortedYears.map(year => yearData[year]),
                        borderColor: '#4facfe',
                        backgroundColor: 'rgba(79, 172, 254, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#4facfe',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
        }

        function updateYearChart() {
            const yearData = {};
            filteredData.forEach(d => {
                yearData[d['Model Year']] = (yearData[d['Model Year']] || 0) + 1;
            });

            const sortedYears = Object.keys(yearData).sort();
            charts.yearChart.data.labels = sortedYears;
            charts.yearChart.data.datasets[0].data = sortedYears.map(year => yearData[year]);
            charts.yearChart.update('active');
        }

        // Make chart
        function createMakeChart() {
            const ctx = document.getElementById('makeChart').getContext('2d');
            const makeData = {};
            
            filteredData.forEach(d => {
                makeData[d.Make] = (makeData[d.Make] || 0) + 1;
            });

            const sortedMakes = Object.entries(makeData)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8);

            charts.makeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedMakes.map(([make]) => make),
                    datasets: [{
                        label: 'Number of Vehicles',
                        data: sortedMakes.map(([,count]) => count),
                        backgroundColor: [
                            '#FF6B9D', '#4ECDC4', '#FFD93D', '#6BCF7F',
                            '#A8E6CF', '#FF8B94', '#B4A7D6', '#D4A574'
                        ],
                        borderWidth: 0,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutBounce'
                    }
                }
            });
        }

        function updateMakeChart() {
            const makeData = {};
            filteredData.forEach(d => {
                makeData[d.Make] = (makeData[d.Make] || 0) + 1;
            });

            const sortedMakes = Object.entries(makeData)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8);

            charts.makeChart.data.labels = sortedMakes.map(([make]) => make);
            charts.makeChart.data.datasets[0].data = sortedMakes.map(([,count]) => count);
            charts.makeChart.update('active');
        }

        // Type chart
        function createTypeChart() {
            const ctx = document.getElementById('typeChart').getContext('2d');
            const typeData = {};
            
            filteredData.forEach(d => {
                const type = d['Electric Vehicle Type'].includes('BEV') ? 'BEV' : 'PHEV';
                typeData[type] = (typeData[type] || 0) + 1;
            });

            charts.typeChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typeData),
                    datasets: [{
                        data: Object.values(typeData),
                        backgroundColor: ['#4facfe', '#f093fb'],
                        borderWidth: 0,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                color: 'rgba(255, 255, 255, 0.8)',
                                font: {
                                    size: 14
                                }
                            }
                        }
                    },
                    animation: {
                        animateRotate: true,
                        duration: 2000
                    }
                }
            });
        }

        function updateTypeChart() {
            const typeData = {};
            filteredData.forEach(d => {
                const type = d['Electric Vehicle Type'].includes('BEV') ? 'BEV' : 'PHEV';
                typeData[type] = (typeData[type] || 0) + 1;
            });

            charts.typeChart.data.labels = Object.keys(typeData);
            charts.typeChart.data.datasets[0].data = Object.values(typeData);
            charts.typeChart.update('active');
        }

        // Range chart
        function createRangeChart() {
            const ctx = document.getElementById('rangeChart').getContext('2d');
            const ranges = filteredData.map(d => d['Electric Range']).filter(r => r > 0);
            
            const buckets = {
                '0-50': 0,
                '51-100': 0,
                '101-150': 0,
                '151-200': 0,
                '201-250': 0,
                '250+': 0
            };

            ranges.forEach(range => {
                if (range <= 50) buckets['0-50']++;
                else if (range <= 100) buckets['51-100']++;
                else if (range <= 150) buckets['101-150']++;
                else if (range <= 200) buckets['151-200']++;
                else if (range <= 250) buckets['201-250']++;
                else buckets['250+']++;
            });

            charts.rangeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(buckets),
                    datasets: [{
                        label: 'Number of Vehicles',
                        data: Object.values(buckets),
                        backgroundColor: 'rgba(67, 233, 123, 0.8)',
                        borderColor: '#43e97b',
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
        }

        function updateRangeChart() {
            const ranges = filteredData.map(d => d['Electric Range']).filter(r => r > 0);
            
            const buckets = {
                '0-50': 0,
                '51-100': 0,
                '101-150': 0,
                '151-200': 0,
                '201-250': 0,
                '250+': 0
            };

            ranges.forEach(range => {
                if (range <= 50) buckets['0-50']++;
                else if (range <= 100) buckets['51-100']++;
                else if (range <= 150) buckets['101-150']++;
                else if (range <= 200) buckets['151-200']++;
                else if (range <= 250) buckets['201-250']++;
                else buckets['250+']++;
            });

            charts.rangeChart.data.datasets[0].data = Object.values(buckets);
            charts.rangeChart.update('active');
        }

        // Geographic chart
        function createGeoChart() {
            const ctx = document.getElementById('geoChart').getContext('2d');
            const geoData = {};
            
            filteredData.forEach(d => {
                geoData[d.County] = (geoData[d.County] || 0) + 1;
            });

            const sortedCounties = Object.entries(geoData)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6);

            charts.geoChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedCounties.map(([county]) => county),
                    datasets: [{
                        label: 'Number of Vehicles',
                        data: sortedCounties.map(([,count]) => count),
                        backgroundColor: 'rgba(240, 147, 251, 0.8)',
                        borderColor: '#f093fb',
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        },
                        x: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
        }

        function updateGeoChart() {
            const geoData = {};
            filteredData.forEach(d => {
                geoData[d.County] = (geoData[d.County] || 0) + 1;
            });

            const sortedCounties = Object.entries(geoData)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6);

            charts.geoChart.data.labels = sortedCounties.map(([county]) => county);
            charts.geoChart.data.datasets[0].data = sortedCounties.map(([,count]) => count);
            charts.geoChart.update('active');
        }

        // CAFV Eligibility chart
        function createCAFVChart() {
            const ctx = document.getElementById('cafvChart').getContext('2d');
            const cafvData = {};
            
            filteredData.forEach(d => {
                const status = d['CAFV Eligibility'].includes('Eligible') ? 'Eligible' : 'Not Eligible';
                cafvData[status] = (cafvData[status] || 0) + 1;
            });

            charts.cafvChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(cafvData),
                    datasets: [{
                        data: Object.values(cafvData),
                        backgroundColor: ['#4CAF50', '#FF5722'],
                        borderWidth: 0,
                        hoverOffset: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                color: 'rgba(255, 255, 255, 0.8)',
                                font: {
                                    size: 14
                                }
                            }
                        }
                    },
                    animation: {
                        animateRotate: true,
                        duration: 2000
                    }
                }
            });
        }

        function updateCAFVChart() {
            const cafvData = {};
            filteredData.forEach(d => {
                const status = d['CAFV Eligibility'].includes('Eligible') ? 'Eligible' : 'Not Eligible';
                cafvData[status] = (cafvData[status] || 0) + 1;
            });

            charts.cafvChart.data.labels = Object.keys(cafvData);
            charts.cafvChart.data.datasets[0].data = Object.values(cafvData);
            charts.cafvChart.update('active');
        }

        // Update data table
        function updateTable() {
            const tableBody = document.getElementById('tableBody');
            tableBody.innerHTML = '';

            const displayData = filteredData.slice(0, 15);

            displayData.forEach((vehicle, index) => {
                const row = document.createElement('tr');
                row.style.animationDelay = `${index * 0.1}s`;
                row.className = 'table-row-animate';
                
                row.innerHTML = `
                    <td><strong>${vehicle.Make}</strong></td>
                    <td>${vehicle.Model}</td>
                    <td><span class="badge bg-primary">${vehicle['Model Year']}</span></td>
                    <td><span class="badge ${vehicle['Electric Vehicle Type'].includes('BEV') ? 'bg-success' : 'bg-warning'}">${vehicle['Electric Vehicle Type'].includes('BEV') ? 'BEV' : 'PHEV'}</span></td>
                    <td><strong>${vehicle['Electric Range']}</strong> mi</td>
                    <td>${vehicle.County}</td>
                    <td>${vehicle.City}</td>
                `;
                tableBody.appendChild(row);
            });
        }

        // Add CSS animation for table rows
        const style = document.createElement('style');
        style.textContent = `
            .table-row-animate {
                opacity: 0;
                transform: translateX(-20px);
                animation: slideInLeft 0.6s ease-out forwards;
            }
            
            @keyframes slideInLeft {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        // Initialize dashboard when page loads
        document.addEventListener('DOMContentLoaded', function() {
            initializeDashboard();
        });
    