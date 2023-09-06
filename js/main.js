// common
const color = d3.scaleOrdinal()
    .domain([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 101, 104, 105, 106, 107])
    .range(["#808080", "#2f4f4f", "#556b2f", "#6b8e23", "#a0522d", "#8b0000", "#483d8b", "#5f9ea0", "#008000", "#3cb371", "#cd853f", "#4682b4", "#9acd32", "#cd5c5c", "#4b0082", "#32cd32", "#daa520", "#8fbc8f", "#8b008b", "#b03060", "#48d1cc", "#9932cc", "#ff4500", "#ff8c00", "#ffd700", "#ffff00", "#0000cd", "#00ff00", "#00ff7f", "#e9967a", "#dc143c", "#00bfff", "#9370db", "#0000ff", "#a020f0", "#adff2f", "#da70d6", "#b0c4de", "#ff7f50", "#ff00ff"]);

let tooltip;
let selectedLocations = [];
const peopleMap = {};

// SymbolMap
let marginSymbolMap = {top: 0, right: 0, bottom: 0, left: 0},
    widthSymbolMap = 1200 - marginSymbolMap.left - marginSymbolMap.right,
    heightSymbolMap = 700 - marginSymbolMap.top - marginSymbolMap.bottom;
let svgSymbolMap;
let latLong = {left: 24.82415, right: 24.908760, top: 36.094024, bottom: 36.045027};
let xSymbolMap, ySymbolMap;
let ids = [];
for (let i = 1; i < 36; i++) {
    ids[i - 1] = i;
}
ids.push(101, 104, 105, 106, 107);

// RouteMap
let marginRouteMap = {top: 0, right: 0, bottom: 0, left: 0},
    widthRouteMap = 1200 - marginRouteMap.left - marginRouteMap.right,
    heightRouteMap = 700 - marginRouteMap.top - marginRouteMap.bottom;
let svgRouteMap;
let routeMapData;
let projection;

// Bubble Chart
let svgBubbleChart, marginBubbleChart, widthBubbleChart, heightBubbleChart, innerWidthMainBubbleChart,
    innerHeightMainBubbleChart, xScaleBubbleChart, yScaleBubbleChart, xAxisBubbleChart,
    yAxisBubbleChart, gBubbleChart;
let groupData = [];
let bubbleChartData;
let startDateBubbleChart_X = new Date('01/06/2014');
let endDateBubbleChart_X = new Date('01/19/2014');
let startDateBubbleChart = new Date('01/06/2014');
let endDateBubbleChart = new Date('01/19/2014');

// Stacked Bar Chart
let stackedData, mod_data, svgStacked, innerWidthStacked, innerHeightStacked, marginStacked;

// Nodes Chart
let svgNodes, nodesData, nodes, links, widthNodes=1400, heightNodes=1000, edgeLines, nodeLabels, nodeCircles;

// Heat Map
let svgHeatMap, heatMapData, widthHeatMap, heightHeatMap, yHeatMap, xHeatMap, yAxisHeatMap, xAxisHeatMap;

// Card Heat Map
let svgCardHeatMap, cardHeatMapData, widthCardHeatMap, heightCardHeatMap, yCardHeatMap, xCardHeatMap, yAxisCardHeatMap, xAxisCardHeatMap;

document.addEventListener('DOMContentLoaded', async function () {

    $('#dates').daterangepicker({
        timePicker: true,
        startDate: '2014-01-06',
        endDate: '2014-01-09',
        timePicker24Hour: true,
        timePickerIncrement: 1,
        locale: {
            format: 'YYYY-MM-DD HH:mm:ss'
        }
    }, function (start, end, label) {
        clearSelected();
        createNodeChart(['Hallowed Grounds']);
        updateStackedChart();
        updateBubbleChart();
        updateSymbolMap();
        fetchRouteMapData();
        updateRouteMap([]);
        updateHeatMap([]);
        updateCardHeatMap([]);
    });

    Promise.all([d3.json("data/building_coordinates.json").then(function (buildingData) {
        let select = document.getElementById("location")
        building_coordinates = buildingData

        building_coordinates.forEach(y => {
            if (y['type'] != 'home') {
                let option = document.createElement("option")
                option.text = y['name']
                option.value = y['name']
                select.add(option)
            }
        })

        $('#location').multiselect({
            enableFiltering: true,
            filterPlaceholder: 'Search for location',
            enableClickableOptGroups: true,
            includeSelectAllOption: true,
            nonSelectedText: "Select location",
            onChange: () => {
                selectedLocations = [];
                let locations = $('#location option:selected');

                $(locations).each(function (index, location) {
                    selectedLocations.push(location.label)
                });

                updateSymbolMapLocations();
                updateHeatMap(selectedLocations);
                updateCardHeatMap(selectedLocations);
                createNodeChart(selectedLocations);
                createSymbolMapFreqTable();
            },
            onSelectAll: function () {
                selectedLocations = [];
                let locations = $('#location option:selected');

                $(locations).each(function (index, location) {
                    selectedLocations.push(location.label)
                });

                updateSymbolMapLocations();
                updateHeatMap(selectedLocations);
                updateCardHeatMap(selectedLocations);
                createNodeChart(selectedLocations);
                createSymbolMapFreqTable();
            },
            onDeselectAll: function () {
                selectedLocations = [];
                updateSymbolMapLocations();
                updateHeatMap(selectedLocations);
                updateCardHeatMap(selectedLocations);
                createNodeChart(selectedLocations);
                createSymbolMapFreqTable();
            },
            buttonText: function (options) {
                return options.length + " Selected"
            }
        });
    })]);

    Promise.all([d3.csv('data/car-assignments.csv')]).then(async function (values) {
        let people = values[0];

        let select = document.getElementById("people");
        people.forEach(person => {
            if (!(person.CarID == 102 || person.CarID == 103 || person.CarID == 108 || person.CarID == 109)) {
                let option = document.createElement("option")
                option.text = person.FirstName + " " + person.LastName;
                option.value = Number(person.CarID);
                select.add(option);
                peopleMap[person.CarID] = person.FirstName + " " + person.LastName;
            }
        })

        createSymbolMapFreqTable();
        createColorMetaData();

        $('#people').multiselect({
            enableFiltering: true,
            filterPlaceholder: 'Search for people',
            enableClickableOptGroups: true,
            includeSelectAllOption: true,
            onChange: () => {
                let selected = [];
                let selectedPeople = $('#people option:selected');

                $(selectedPeople).each(function (index, selectedPeople) {
                    selected.push(Number(selectedPeople.value))
                });

                updateRouteMap(selected);
            },
            onSelectAll: function () {
                let selectedPeople = $('#people option:selected');
                let selected = [];
                $(selectedPeople).each(function (index, selectedPeople) {
                    selected.push(Number(selectedPeople.value))
                });

                updateRouteMap(selected);
            },
            onDeselectAll: function () {
                let selected = []
                updateRouteMap(selected);
            },
            buttonText: function (options) {
                return options.length + " Selected"
            }
        });
    });

    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    svgNodes = d3.selectAll('#node_chart')
        .append('svg')
        .attr("width", widthNodes + 'px')
        .attr("height", heightNodes + 'px');

    createHeatMap();
    createCardHeatMap();
    createNodeChart(['Hallowed Grounds']);
    updateStackedChart();
    createBubbleChart();
    createSymbolMap();
    createRouteMap();
});

function createColorMetaData() {
    let metadata_div = document.getElementById('color_metadata');
    for (let person in peopleMap) {
        const personColor = color(person);
        const name = peopleMap[person];

        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.padding = "5px";

        const rect = document.createElement("div");
        rect.style.width = "20px";
        rect.style.height = "20px";
        rect.style.backgroundColor = personColor;
        div.appendChild(rect);

        const span = document.createElement("span");
        span.style.marginLeft = "10px";
        span.textContent = name;
        div.appendChild(span);

        metadata_div.appendChild(div);
    }
}

function createSymbolMapFreqTable() {

    let elem = document.getElementById("symbol_map_data_table")
    while(elem.firstChild){
        elem.removeChild(elem.firstChild)
    }

    let freqTable = document.createElement("tbody")
    freqTable.className = "freqTable"
    document.getElementById("symbol_map_data_table").appendChild(freqTable)

    let e1 = document.createElement("th")
    e1.innerHTML = "Employee"

    let e2 = document.createElement("th")
    e2.innerHTML = "Frequency"

    let tr = document.createElement("tr")
    tr.appendChild(e1)
    tr.appendChild(e2)

    freqTable.appendChild(tr)

    for (let i in ids) {
        let e1 = document.createElement("td")
        e1.className = "symbol_map_td"
        e1.id = "data_table_id_" + ids[i]
        e1.innerHTML = peopleMap[ids[i]];

        let e2 = document.createElement("td")
        e2.id = "data_table_freq_" + ids[i]
        e2.className = "data_table_freq"
        e2.innerHTML = 0

        let tr = document.createElement("tr")
        tr.appendChild(e1)
        tr.appendChild(e2)

        freqTable.appendChild(tr)
    }
}

async function createRouteMap() {
    svgRouteMap = d3.select("#route_map")
        .append("svg")
        .attr("width", widthRouteMap)
        .attr("height", heightRouteMap);

    d3.json("data/Abila.geojson").then((mapData) => {
        projection = d3.geoMercator()
            .fitSize([widthRouteMap, heightRouteMap], mapData);

        const path = d3.geoPath(projection);

        svgRouteMap.append("g")
            .selectAll("path")
            .data(mapData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "#ccc")
            .attr("stroke", "#333");

        svgRouteMap
            .attr("width", widthRouteMap)
            .attr("height", heightRouteMap)
            .style("background", "url('data/map.png') no-repeat")
            .style("background-size", "100% 100%")
    })
    await fetchRouteMapData();
}

async function updateRouteMap(vehicleIds) {
    svgRouteMap.selectAll(".route").remove();
    svgRouteMap.selectAll(".stop").remove();

    vehicleIds.forEach(function (routeId, i) {
        const routeData = routeMapData.filter(function (d) {
            return d.id == routeId;
        });

        routeData.forEach(function (route) {
            const coordinates = route.data.map(function (d) {
                return [d.long, d.lat];
            });

            const path = d3.line()
                .x(function (d) {
                    return projection([d[0], d[1]])[0];
                })
                .y(function (d) {
                    return projection([d[0], d[1]])[1];
                })

            svgRouteMap.append("path")
                .datum(coordinates)
                .attr("class", "route")
                .attr("d", path)
                .attr("id", routeId)
                .attr("stroke", color(routeId))
                .attr("stroke-width", 2)
                .attr("fill", "none");

            svgRouteMap.selectAll(".route")
                .on("mouseover", function (event, d) {
                    d3.select(this)
                        .raise()
                        .attr("stroke-width", 5)
                        .style("cursor", "pointer")

                    tooltip
                        .style("opacity", 1)
                        .html("Route for Employee: " + peopleMap[event.target.id])
                        .style("left", (event.pageX) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this)
                        .attr("stroke-width", 2)

                    tooltip
                        .style("opacity", 0)
                });

            const stopsData = route.stopArr;
            const stopsGroup = svgRouteMap.append("g").attr("class", "stop");

            stopsGroup.selectAll("circle")
                .data(stopsData)
                .enter().append("circle")
                .attr("cx", function (d) {
                    return projection([d.long, d.lat])[0];
                })
                .attr("cy", function (d) {
                    return projection([d.long, d.lat])[1];
                })
                .attr("r", 5)
                .style("fill", color(routeId));
        })
    })
}

function createSymbolMap() {
    svgSymbolMap = d3.select("#symbol_map")
        .append("svg")
        .attr("width", widthSymbolMap + marginSymbolMap.left + marginSymbolMap.right)
        .attr("height", heightSymbolMap + marginSymbolMap.top + marginSymbolMap.bottom)
        .style("background", "url('data/map.png') no-repeat")
        .style("background-size", "100% 100%")
        .append("g")
        .attr("transform",
            "translate(" + marginSymbolMap.left + "," + marginSymbolMap.top + ")")


    xSymbolMap = d3.scaleLinear()
        .range([0, widthSymbolMap])
        .domain([latLong.left, latLong.right])

    svgSymbolMap.append("g")
        .attr("transform", "translate(0," + heightSymbolMap + ")")
        .call(d3.axisBottom(xSymbolMap))

    ySymbolMap = d3.scaleLinear()
        .range([heightSymbolMap, 0])
        .domain([latLong.bottom, latLong.top])

    svgSymbolMap.append("g")
        .call(d3.axisLeft(ySymbolMap))

    updateSymbolMap()
}

async function updateSymbolMap() {
    svgSymbolMap.selectAll(".symbol_map_g").remove()
    svgSymbolMap.selectAll(".pie_paths").remove()


    startDate = $('#dates').data('daterangepicker').startDate
    endDate = $('#dates').data('daterangepicker').endDate

    let resp;
    document.getElementById("symbol_loader").style.display = "block";
    disableScroll();
    await axios.post('http://127.0.0.1:5000/symbol_map', {
        start_date: startDate.format('YYYY-MM-DD HH:mm:ss'),
        end_date: endDate.format('YYYY-MM-DD HH:mm:ss')
    }).then((response) => {
        document.getElementById("symbol_loader").style.display = "none";
        enableScroll();
        resp = response.data
    })

    let groups = svgSymbolMap.selectAll(".symbol_map_g")
        .data(Object.entries(resp))
        .enter()
        .append("g")
        .attr("class", function (d) {
            return "symbol_map_g " + d[0].replace(/[\'.]/g, "").replace(/\s/g, '')
        })
        .attr("transform", function (d) {
            return "translate(" + xSymbolMap((d[1][0][0][0] + d[1][0][1][0]) / 2) + "," + ySymbolMap((d[1][0][0][1] + d[1][0][1][1]) / 2) + ")"
        })
        .on("mouseover", function (event, d) {
            let element = d3.select(this);
            let op = element.style("opacity");
            if (op == 1) {
                tooltip.style("opacity", 1)
                    .html(d[0])
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY) + "px");
                d3.select(this).raise();
            }
        })
        .on("mouseout", function (d) {
            tooltip.style("opacity", 0);
        });

    let pie = d3.pie()
        .value(function (d) {
            return d[1]
        })

    let arc = d3.arc()
        .innerRadius(0)
        .outerRadius(30)

    groups.selectAll(".pie_paths")
        .data(function (d) {
            return pie(Object.entries(d[1][1]))
        })
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", function (d) {
            return color(Number(d.data[0]))
        })
        .style("cursor", "pointer")
        .on("click", function (d, i, nodes) {
            let selectedVehicles = [];
            for (let i in ids) {
                let currentElement = document.getElementById("data_table_freq_" + ids[i])
                currentElement.innerHTML = 0
                currentElement.style = ""

                let currentCarElement = document.getElementById("data_table_id_" + ids[i])
                currentCarElement.style = ""
            }
            for (let j = 0; j < d.srcElement.parentElement.childNodes.length; j++) {
                id = "data_table_freq_" + d.srcElement.parentElement.childNodes[j].__data__.data[0];
                e = document.getElementById(id);
                e.innerHTML = d.srcElement.parentElement.childNodes[j].__data__.data[1];
                e.style.background = d.srcElement.parentElement.childNodes[j].attributes.fill.value;

                idCar = "data_table_id_" + d.srcElement.parentElement.childNodes[j].__data__.data[0];
                eCar = document.getElementById(idCar);
                eCar.style.background = d.srcElement.parentElement.childNodes[j].attributes.fill.value;

                let vehicleId = d.srcElement.parentElement.childNodes[j].__data__.data[0];
                selectedVehicles.push(Number(vehicleId));
            }
            updateRouteMap(selectedVehicles);
        });
}

async function fetchRouteMapData() {
    document.getElementById("route_loader").style.display = "block";
    disableScroll();
    startDate = $('#dates').data('daterangepicker').startDate
    endDate = $('#dates').data('daterangepicker').endDate

    await axios.post('http://127.0.0.1:5000/route_map', {
        start_date: startDate.format('YYYY-MM-DD HH:mm:ss'),
        end_date: endDate.format('YYYY-MM-DD HH:mm:ss')
    }).then((response) => {
        routeMapData = response.data;
        document.getElementById("route_loader").style.display = "none";
        enableScroll();
    })
}

async function fetchStackedData() {
    document.getElementById("stacked_loader").style.display = "block";
    disableScroll();
    startDate = $('#dates').data('daterangepicker').startDate
    endDate = $('#dates').data('daterangepicker').endDate

    await axios.post('http://127.0.0.1:5000/stacked_bar', {
        start_date: startDate.format('YYYY-MM-DD HH:mm:ss'),
        end_date: endDate.format('YYYY-MM-DD HH:mm:ss')
    }).then((response) => {
        document.getElementById("stacked_loader").style.display = "none";
        mod_data = response.data;
        enableScroll();
    })
}

async function fetchNodeData(locations) {
    document.getElementById("node_loader").style.display = "block";
    disableScroll();
    startDate = $('#dates').data('daterangepicker').startDate;
    endDate = $('#dates').data('daterangepicker').endDate;

    await axios.post('http://127.0.0.1:5000/link_node_graph', {
        start_date: startDate.format('YYYY-MM-DD HH:mm:ss'),
        end_date: endDate.format('YYYY-MM-DD HH:mm:ss'),
        location: locations
    }).then((response) => {
        document.getElementById("node_loader").style.display = "none";
        nodesData = response.data;
        enableScroll();
    })
}

function createBubbleChart() {
    svgBubbleChart = d3.selectAll('#bubble_chart').append('svg').attr("id", "svg_bubble_chart")
    marginBubbleChart = {top: 10, bottom: 50, right: 30, left: 100};
    widthBubbleChart = +svgBubbleChart.style('width').replace('px', '');
    heightBubbleChart = +svgBubbleChart.style('height').replace('px', '');
    innerWidthMainBubbleChart = widthBubbleChart - marginBubbleChart.left - marginBubbleChart.right;
    innerHeightMainBubbleChart = heightBubbleChart - marginBubbleChart.top - marginBubbleChart.bottom;

    Promise.all([d3.csv('data/bubbleChartData.csv')]).then(function (values) {
        bubbleChartData = values[0];
        updateBubbleChart();
    });

}

function updateBubbleChart() {
    d3.selectAll('#bubble_chart_x').remove();
    d3.selectAll('.bubble_chart_circles').remove();
    startDateBubbleChart = new Date($('#dates').data('daterangepicker').startDate);
    endDateBubbleChart = new Date($('#dates').data('daterangepicker').endDate);

    startDateBubbleChart_X.setDate(startDateBubbleChart.getDate() - 1);
    endDateBubbleChart_X.setDate(endDateBubbleChart.getDate() + 1);

    let allCardNum = Array.from(new Set(bubbleChartData.map(d => d['last4ccnum_n_loyaltynum'])))
    allCardNum.unshift('');

    let allLocation = Array.from(new Set(bubbleChartData.map(d => d['location'])))

    gBubbleChart = svgBubbleChart.append('g').attr('transform', `translate(${marginBubbleChart.left}, 0)`);

    xScaleBubbleChart = d3.scaleTime().domain([new Date("2014-01-05"), new Date("2014-01-22")]).range([0, innerWidthMainBubbleChart - 100])
    xAxisBubbleChart = gBubbleChart.append('g').call(d3.axisBottom(xScaleBubbleChart).ticks(d3.timeDay.every(1), '%-d %b %Y')).attr('transform', `translate(70, ${innerHeightMainBubbleChart})`).attr("id", "bubble_chart_x");

    yScaleBubbleChart = d3.scaleOrdinal().domain(allLocation).range([10, 30, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230, 250, 270, 290,
        310, 330, 350, 370, 390, 410, 430, 450, 470, 490, 510, 530, 550, 570, 590,
        610, 630, 650, 670
    ])
    yAxisBubbleChart = gBubbleChart.append('g').call(d3.axisLeft(yScaleBubbleChart)).attr('transform', 'translate(70, -40)')

    gBubbleChart.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', '-80px')
        .attr('x', '-330px')
        .attr('text-anchor', 'middle')
        .attr("font-size", 16)
        .text('Location');

    gBubbleChart.append('text')
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', innerWidthMainBubbleChart / 2 - 20)
        .attr('y', innerHeightMainBubbleChart+40)
        .attr("font-size", 16)
        .text('Date')
}

function drawBubbleChartCircles(num) {
    d3.selectAll('.bubble_chart_circles').remove();
    groupData = []
    bubbleChartData.forEach(d => {
        for (var key in d) {
            if (key == 'timestamp') {
                d['time'] = new Date(d[key].split(" ")[0])
            }
        }
        if (d['last4ccnum_n_loyaltynum'] == num && d['time'] >= startDateBubbleChart && d['time'] <= endDateBubbleChart) {
            groupData.push(d)
        }
    });

    gBubbleChart.selectAll('circle')
        .data(groupData)
        .enter()
        .append("circle")
        .attr("class", "bubble_chart_circles")
        .attr("cx", function (d) {
            return xScaleBubbleChart(d['time'])
        })
        .attr("cy", function (d) {
            return yScaleBubbleChart(d['location'])
        })
        .attr("r", function (d) {
            return d['count'] * 8
        })
        .attr('opacity', 1)
        .style("fill", "#3590ae")
        .style("cursor", "pointer")
        .attr('transform', 'translate(90, -40)')
        .on("mouseover", function (event, d) {

            d3.select(this).transition()
                .duration(500)
                .attr("r", d['count'] * 10)
                .attr("stroke", "#bcdfeb")
                .attr("stroke-width", "4px")

            tooltip.style("opacity", 1)
                .html('Date: ' + d['timestamp'] + '<br>Location: ' + d['location'] + '<br>Number of times card used: ' + d['count'])
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY) + "px");
        })
        .on("mouseout", function (event, d) {
            tooltip.style("opacity", 0);
            d3.select(this).transition()
                .duration(500)
                .attr("r", d['count'] * 8)
                .attr("stroke", "#3590ae")
                .attr("stroke-width", "0px");
        })
        .on("click", function (event, d) {
            updateHeatMap([d.data.location])
            createNodeChart([d.data.location])
        });
}

async function createStackedChart() {
    await fetchStackedData();
    svgStacked = d3.selectAll('#stack_chart')
        .append('svg')
        .attr("width", "1200px")
        .attr("height", "700px");
    let widthStacked = 1200;
    let heightStacked = 700;
    marginStacked = {top: 50, bottom: 80, right: 50, left: 60};
    innerWidthStacked = widthStacked - marginStacked.left - marginStacked.right;
    innerHeightStacked = heightStacked - marginStacked.top - marginStacked.bottom;
}

async function updateStackedChart() {

    d3.select("#stack_chart").select("svg").remove();
    await createStackedChart();
    let stack = d3.stack().keys(["n_cc_transactions", "n_loyaltyc_transactions"]);
    stackedData = stack(mod_data)

    let groupsStacked = d3.map(mod_data, function (d) {
        return (d.location)
    });

    const xScaleStacked = d3.scaleBand()
        .domain(groupsStacked)
        .range([0, innerWidthStacked])
        .padding([0.2]);

    const yScaleStacked = d3.scaleLinear()
        .domain([0, d3.max(mod_data, function (d) {
            return d.n_cc_transactions
        }) + d3.max(mod_data, function (d) {
            return d.n_loyaltyc_transactions
        })])
        .range([innerHeightStacked, 0]);

    svgStacked.select('g').remove();
    const g = svgStacked.append('g')
        .attr('transform', 'translate(' + marginStacked.left + ', ' + marginStacked.top + ')');

    var colorStack = d3.scaleOrdinal()
        .domain(["n_cc_transactions", "n_loyaltyc_transactions"])
        .range(["#21205E", "#5FBD5A"])


    let groupsBar = g.selectAll("g.bars")
        .data(stackedData)
        .join('g')
        .style("cursor", "pointer")
        .style('fill', function (d) {
            return colorStack(d.key);
        });

    groupsBar.selectAll("rect")
        .data(function (d) {
            return d;
        })
        .join("rect")
        .attr("x", function (d) {
            return xScaleStacked(d.data.location);
        })
        .attr("y", function (d) {
            return yScaleStacked(d[1]);
        })
        .attr("height", function (d) {
            return yScaleStacked(d[0]) - yScaleStacked(d[1]);
        })
        .attr("width", xScaleStacked.bandwidth())
        .on('mouseover', function (event, d) {
            tooltip
                .style("opacity", 1);

            let target = mod_data.filter(obj => {
                return obj.location === d.data.location
            })

            let innerText = "Location: " + target[0]["location"].toString() + "<br># of Credit Card transactions: " + target[0]["n_cc_transactions"].toString() + "<br> # of Loyalty Card transactions: " + target[0]["n_loyaltyc_transactions"].toString();

            tooltip.html(innerText)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 50) + "px");
        })
        .on('mouseout', function (d) {
            tooltip
                .style('opacity', 0);
        })
        .on("click", function(event, d){
            updateHeatMap([d.data.location])
            createNodeChart([d.data.location])
            updateCardHeatMap(([d.data.location]))
        });

    // adding the x and y axis
    g.append('g')
        .call(d3.axisLeft(yScaleStacked));

    g.append('g')
        .call(d3.axisBottom(xScaleStacked))
        .attr('transform', "translate(0," + innerHeightStacked + ")")
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-1px")
        .attr("dy", "5px")
        .attr("font-size", 10)
        .attr("transform", "rotate(-19)");


    // adding the axis labels
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', '-40px')
        .attr('x', -innerHeightStacked / 2)
        .attr('text-anchor', 'middle')
        .attr("font-size", 16)
        .text('Number of transactions');

    g.append('text')
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', innerWidthStacked / 2 - 20)
        .attr('y', innerHeightStacked + 75)
        .attr("font-size", 16)
        .text('Location')


    //add the legend
    g.append('rect')
        .attr('x', 700)
        .attr('y', -40)
        .attr('width', 20)
        .attr('height', 20)
        .style('fill', '#21205E')

    g.append('text')
        .attr('x', 725)
        .attr('y', -25)
        .text('Credit Card transactions');

    g.append('rect')
        .attr('x', 700)
        .attr('y', -15)
        .attr('width', 20)
        .attr('height', 20)
        .style('fill', '#5FBD5A')

    g.append('text')
        .attr('x', 725)
        .attr('y', 0)
        .text('Loyalty Card transactions');
}

async function createNodeChart(locations) {
    let elem = d3.select('#node_chart').select('svg')
    while(elem.firstChild){
        elem.removeChild(elem.firstChild)
    }

    await fetchNodeData(locations);

    nodes = nodesData.nodes.map(function (d) {
        return {
            name: d.name,
            id: +d.id,
        };
    });

    links = nodesData.edges.map(function (d) {
        return {
            source: d.name,
            target: d.name2,
            weight: +d.weights,
        };
    });
    updateNodeChart();
}

function updateNodeChart() {
    let lForce = d3.forceLink(links)
        .id(d => d.name)
        .distance(50)
        .strength(.33)

    d3.forceSimulation()
        .nodes(nodes)
        .force('links', lForce)
        .force('collide', d3.forceCollide()
            .radius(50))
        .force('change', d3.forceManyBody()
            .strength(20))
        .force('center', d3.forceCenter(widthNodes / 2, heightNodes / 2))
        .on('tick', tick);

    nodeCircles = svgNodes.selectAll('circle')
        .data(nodes)
        .join('circle')
        .classed('node', true)
        .style('fill', d => color(d.id))
        .attr('r', 20)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
            updateRouteMap([d.id])
        });

    nodeLabels = svgNodes.selectAll('text')
        .data(nodes)
        .join('text')
        .classed('node-label', true)
        .text(d => d.name)
        .on("click", function (event, d) {
            updateRouteMap([d.id])
        });

    let sizeScale = d3.scaleLinear()
        .domain(d3.extent(links, d => d.weight))
        .range([1, 10]);

    edgeLines = svgNodes.selectAll('line')
        .data(links)
        .join('line')
        .classed('link', true)
        .attr('stroke-width', d => sizeScale(d.weight))
        .on('mouseover', function (event, d) {
            tooltip
                .style("opacity", 1);

            let innerText = "Person 1: " + d.source.name + "<br> Person 2: " + d.target.name + "<br> Number of meetings: " + d.weight.toString();

            tooltip.html(innerText)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 50) + "px");
        })
        .on('mouseout', function (d) {
            tooltip
                .style('opacity', 0);
        });

    svgNodes.selectAll('circle').raise();
    svgNodes.selectAll('text').raise();
}

function tick() {
    edgeLines.attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
    nodeCircles.attr('cx', d => d.x)
        .attr('cy', d => d.y);
    nodeLabels.attr('x', d => d.x)
        .attr('y', d => d.y);
}

async function fetchHeatMapData(locations) {
    document.getElementById("heat_loader").style.display = "block";
    disableScroll();
    startDate = $('#dates').data('daterangepicker').startDate
    endDate = $('#dates').data('daterangepicker').endDate

    await axios.post('http://127.0.0.1:5000/heat_map', {
        start_date: startDate.format('YYYY-MM-DD HH:mm:ss'),
        end_date: endDate.format('YYYY-MM-DD HH:mm:ss'),
        location: locations
    }).then((response) => {
        heatMapData = response.data;
        document.getElementById("heat_loader").style.display = "none";
        enableScroll();
    })
}

function createHeatMap() {
    let margin = {top: 30, right: 30, bottom: 90, left: 80};
    widthHeatMap = 700 - margin.left - margin.right;
    heightHeatMap = 700 - margin.top - margin.bottom;

    svgHeatMap = d3.select("#heat_map")
        .append("svg")
        .attr("width", widthHeatMap + margin.left + margin.right)
        .attr("height", heightHeatMap + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    yHeatMap = d3.scaleBand()
        .range([heightHeatMap, 0])
        .padding(0.01);

    xHeatMap = d3.scaleBand()
        .range([0, widthHeatMap])
        .padding(0.01);

    xAxisHeatMap = svgHeatMap.append("g")
        .attr("transform", "translate(0," + heightHeatMap + ")");

    yAxisHeatMap = svgHeatMap.append("g")

    svgHeatMap.append("text")
        .attr('class', 'axis-label')
        .attr("text-anchor", "middle")
        .attr("x", widthHeatMap/2)
        .attr("y", heightHeatMap +80)
        .attr("font-size", 16)
        .text("Employee");

    svgHeatMap.append("text")
        .attr('class', 'axis-label')
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -heightHeatMap/2)
        .attr("font-size", 16)
        .text("Card Number");


    updateHeatMap(selectedLocations);
}

async function updateHeatMap(locations) {

    await fetchHeatMapData(locations);

    d3.selectAll(".heat_rect").remove();

    xHeatMap.domain(heatMapData.people)

    xAxisHeatMap
        .transition()
        .duration(500)
        .call(d3.axisBottom(xHeatMap))

    yHeatMap.domain(heatMapData.cards)

    yAxisHeatMap
        .transition()
        .duration(500)
        .call(d3.axisLeft(yHeatMap));

    yAxisHeatMap.selectAll("text")
        .attr("font-size", 14);

    xAxisHeatMap
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svgHeatMap.selectAll(".tick text")
        .style("cursor", "pointer")
        .on("click", function (event, d) {
            if (heatMapData.cards.includes(d)) {
                drawBubbleChartCircles(d);
            }
        });

    let heatColor = d3.scaleLinear()
        .range(["#daf5ef", "#69b3a2"])
        .domain(d3.extent(heatMapData.data.map(function (d) {
            return d.count
        })))

    svgHeatMap.selectAll()
        .data(heatMapData.data, function (d) {
            return d.name + ':' + d.last4ccnum;
        })
        .enter()
        .append("rect")
        .attr("class", "heat_rect")
        .attr("x", function (d) {
            return xHeatMap(d.name)
        })
        .attr("y", function (d) {
            return yHeatMap(d.last4ccnum)
        })
        .attr("width", xHeatMap.bandwidth())
        .attr("height", yHeatMap.bandwidth())
        .style("fill", function (d) {
            return heatColor(d.count)
        })
        .on('mouseover', function (event, d) {
            tooltip
                .style("opacity", 1);

            let innerText = "Person: " + d.name + "<br> Card: " + d.last4ccnum + "<br> Count: " + d.count;

            tooltip.html(innerText)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 50) + "px");
        })
        .on('mouseout', function (d) {
            tooltip
                .style('opacity', 0);
        });
}

async function fetchCardHeatMapData(locations) {
    document.getElementById("card_heat_loader").style.display = "block";
    disableScroll();
    let startDate = $('#dates').data('daterangepicker').startDate
    let endDate = $('#dates').data('daterangepicker').endDate

    await axios.post('http://127.0.0.1:5000/heat_map_2', {
        start_date: startDate.format('YYYY-MM-DD HH:mm:ss'),
        end_date: endDate.format('YYYY-MM-DD HH:mm:ss'),
        location: locations
    }).then((response) => {
        cardHeatMapData = response.data;
        document.getElementById("card_heat_loader").style.display = "none";
        enableScroll();
    })
}

function createCardHeatMap() {
    let margin = {top: 30, right: 30, bottom: 90, left: 80};
    widthCardHeatMap = 700 - margin.left - margin.right;
    heightCardHeatMap = 700 - margin.top - margin.bottom;

    svgCardHeatMap = d3.select("#card_heat_map")
        .append("svg")
        .attr("width", widthCardHeatMap + margin.left + margin.right)
        .attr("height", heightCardHeatMap + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    yCardHeatMap = d3.scaleBand()
        .range([heightCardHeatMap, 0])
        .padding(0.01);

    xCardHeatMap = d3.scaleBand()
        .range([0, widthCardHeatMap])
        .padding(0.01);

    xAxisCardHeatMap = svgCardHeatMap.append("g")
        .attr("transform", "translate(0," + heightCardHeatMap + ")");

    yAxisCardHeatMap = svgCardHeatMap.append("g")

    svgCardHeatMap.append("text")
        .attr('class', 'axis-label')
        .attr("text-anchor", "middle")
        .attr("x", widthCardHeatMap/2)
        .attr("y", heightCardHeatMap + 55)
        .attr("font-size", 16)
        .text("Loyalty Card");

    svgCardHeatMap.append("text")
        .attr('class', 'axis-label')
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -heightCardHeatMap/2)
        .attr("font-size", 16)
        .text("Credit Card");


    updateCardHeatMap(selectedLocations);
}

async function updateCardHeatMap(locations) {

    await fetchCardHeatMapData(locations);

    d3.selectAll(".card_heat_rect").remove();

    xCardHeatMap.domain(cardHeatMapData.cc)

    xAxisCardHeatMap
        .transition()
        .duration(500)
        .call(d3.axisBottom(xCardHeatMap))

    yCardHeatMap.domain(cardHeatMapData.loyalty)

    yAxisCardHeatMap
        .transition()
        .duration(500)
        .call(d3.axisLeft(yCardHeatMap));

    xAxisCardHeatMap
        .selectAll("text")
        .attr("transform", "rotate(-60)")
        .style("text-anchor", "end")
        .attr("font-size", 10);

    yAxisCardHeatMap.selectAll("text")
        .attr("font-size", 10);

    let cardHeatColor = d3.scaleLinear()
        .range(["#daf5ef", "#69b3a2"])
        .domain(d3.extent(cardHeatMapData.data.map(function (d) {
            return d.count
        })))

    svgCardHeatMap.selectAll()
        .data(cardHeatMapData.data, function (d) {
            return d.last4ccnum + ':' + d.loyaltynum;
        })
        .enter()
        .append("rect")
        .attr("class", "card_heat_rect")
        .attr("x", function (d) {
            return xCardHeatMap(d.last4ccnum)
        })
        .attr("y", function (d) {
            return yCardHeatMap(d.loyaltynum)
        })
        .attr("width", xCardHeatMap.bandwidth())
        .attr("height", yCardHeatMap.bandwidth())
        .style("fill", function (d) {
            return cardHeatColor(d.count)
        })
        .on('mouseover', function (event, d) {
            tooltip
                .style("opacity", 1);

            let innerText = "Credit card: " + d.last4ccnum + "<br> Loyalty card: " + d.loyaltynum + "<br> Count: " + d.count;

            tooltip.html(innerText)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 50) + "px");
        })
        .on('mouseout', function (d) {
            tooltip
                .style('opacity', 0);
        });
}

function updateSymbolMapLocations() {
    let locations_symbol_map = $("#location").val()
    d3.selectAll(".symbol_map_g")
        .style("opacity", 0)
    for (let i in locations_symbol_map) {
        d3.selectAll("." + locations_symbol_map[i].replace(/[\'.]/g, "").replace(/\s/g, ''))
            .style("opacity", 1)
    }
}

function clearSelected() {
    selectedLocations = [];
    $("#location").multiselect("deselectAll", false);
    $("#location").multiselect("updateButtonText");

    $("#people").multiselect("deselectAll", false);
    $("#people").multiselect("updateButtonText");
}

function disableScroll() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    let scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    window.onscroll = function () {
        window.scrollTo(scrollLeft, scrollTop);
    };
}

function enableScroll() {
    window.onscroll = function () {
    };
}