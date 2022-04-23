function onLoad() {
    var date = new Date();
    var currentDate = date.toISOString().slice(0, 10);
    var aa = document.getElementById('date');
    aa.innerHTML = currentDate;

    getData();

    var addSearchTarget$ = $("#search-address-ipt");
    var resutsContainer$ = $("#results");
    document.getElementById("search-btn").addEventListener("click", function() {
        resutsContainer$.empty();
        var tgt = addSearchTarget$.val();
        tgt = tgt.replace("上海市", "");
        var results = addsPoints.filter(ap => ap.address.indexOf(tgt) > 0);
        results.sort((a, b) => { return b - a });
        var elements = "";
        results.forEach(r => {
            elements += "<li class='address-row'><b>" + r.day + "</b> : " + r.address + "</li>";
        })
        elements = "<ul>" + elements + "</ul>";
        resutsContainer$.append(elements);
    });
}

var worker = new Worker('js/worker.js');

var chartData = [];
var columnDataPoints = [];
var lineDataPoints = [];
var regionTrend = {
    type: "line",
    name: "",
    dataPoints: []
}
var amount = 0;
var overallAmount = {
    type: "column",
    name: "当日总数",
    dataPoints: columnDataPoints
}

function generateChartOption(name) {
    return {
        type: "line",
        visible: true,
        name: name,
        showInLegend: true,
        legendText: name,
        axisYType: "secondary",
        dataPoints: []
    }
}

function getData() {
    $.getJSON("./data?v=" + Math.random, handleJSONData, 1);
}

//save geo data in service
function saveGeoData(jsonData) {
    $.ajax({
        type: 'POST',
        url: './data',
        data: JSON.stringify(jsonData),
        dataType: 'json',
        contentType: "application/json",
        success: function(data, status, xhr) {
            console.log("Successfully send data to service.");
        },
        Error: function(xhr, error, exception) {
            console.error("Failed to send data. " + error);
        }
    });
}

function handleJSONData(data) {
    handleChartsData(data);

    var increaseChart = new RegionDailyIncreaseChart();
    increaseChart.createRegionColumnChart(data);

    var regionBarChart = new RegionLiveComparingChart();
    regionBarChart.createRegionBarChart(data);

    $("#total-amount").append("<div id=\"total-amount-num\">" + amount + "</div>");
    handleMapData(data);

    var hotHeatMap = new HotHeatMap(mapvgl);
    hotHeatMap.showLayer(data['details']);
}

function handleChartsData(data) {
    $.each(data.amounts, function(key, value) {
        columnDataPoints.push({ y: value.amount, label: value.day, indexLabel: value.amount.toString() });
        amount += value.amount;
    });
    chartData.push(overallAmount);

    var lineColor = '';
    var chart = new CanvasJS.Chart("chartContainer", {
        animationEnabled: true,
        theme: "light2", // "light1", "light2", "dark1", "dark2"
        title: {
            text: "COVID-19 Shanghai 2022"
        },
        axisY: {
            title: "",
            interlacedColor: "Azure",
            //interval: 100,
            tickColor: "navy",
            gridColor: "navy",
            tickLength: 10
        },
        data: chartData
    });
    chart.render();
}

CanvasJS.addColorSet("regionColors", [ //colorSet Array
    "#9966CC",
    "#FF033E",
    "#5D8AA8",
    "#3B7A57",
    "#FFBF00",
    "#FF7E00",
    "#A4C639",
    "#915C83",
    "#CD9575",
    "#89CFF0",
    "#E0218A",
    "#FE6F5E",
    "#0D98BA",
    "#CC5500",
    "#00BFFF",
    "#007BA7",
    "#EC3B83",
]);


function updateRag(index, $element, visible) {
    $element.checked = visible;
    chartData[index].visible = visible;
}


// ************************baidu map
//默认地理位置的GPS坐标
var x = 121.506377;
var y = 31.245105;
var map = new BMap.Map("container");
initBMap();

function initBMap() {

    // 百度地图API功能
    var point = new BMap.Point(x, y);
    //地图初始化
    map.centerAndZoom(point, 17);
    map.enableScrollWheelZoom(true);
    map.addControl(new BMap.NavigationControl());

    map.addEventListener("dragend", function() {
        // var center =map.getCenter();
        // alert("地图中心点变更为："+ center.lng +", "+ center.lat);
        var bounds = map.getBounds();
        createMarkerInBound(addsPoints, bounds);
    });

    getCurrentPosition();
}

var myIcon = new BMap.Icon("./covid19.png", new BMap.Size(23, 25));
// 显示当前位置
var labels = ["当前位置"];


function getCurrentPosition() {
    var geoLoc = new BMap.Geolocation();
    geoLoc.getCurrentPosition(function(r) {
        if (this.getStatus() == BMAP_STATUS_SUCCESS) {
            var mk = new BMap.Marker(r.point);
            map.addOverlay(mk);
            map.panTo(r.point);
            map.centerAndZoom(r.point, 15);
        } else {
            console.warn('failed' + this.getStatus());
        }
    });
}

function common_getCurrentPos() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                x = position.coords.longitude;
                y = position.coords.latitude;
                var newPoint = new BMap.Point(x, y);
                map.panTo(newPoint);
                var convertor = new BMap.Convertor();
                convertor.translate([newPoint], 1, 5, translateNormalCallback);
                map.setCenter(newPoint);
            },
            function(e) {
                console.log("获取当前位置失败");
            }
        )
    }
}

function handleMapData(data) {
    var allRegionAddress = [];
    $.each(data.details, (key, value) => {
        allRegionAddress = allRegionAddress.concat(value.region);
        value.region.forEach(rgnAddr => {
            rgnAddr.addresses.every(a => a.day = value.day);
            bdGEO(rgnAddr.addresses, value.day);
        });
    })

    pendingRequest = promiseArr.length;
    console.log("Total request: " + pendingRequest);
    // save geo data
    Promise.allSettled(promiseArr).then((values) => {
        saveGeoData(newAddsGeo);
    })

    // web service to convert address to geo x/y
    worker.postMessage(allRegionAddress);
    worker.onmessage = function(d) {
        addsPoints = JSON.parse(d);

        var bounds = map.getBounds();
        var loopdog = 0;
        var interval = setInterval(() => {
            if (loopdog++ > 10000) clearInterval(interval);
            createMarkerInBound(addsPoints, bounds);
        }, 0)
    }
}



// 批量解析地址
var myGeo = new BMap.Geocoder();
var addsPoints = []; //[{address: xxx, day: xxx, geo: {lng:xxx, lat:xxx}}]
var promiseArr = [];
var newAddsGeo = [];
var index = 0;

function bdGEO(targetAdds, tday) {
    if (!targetAdds) return;
    for (let i = 0; i < targetAdds.length; i++) {
        index++;
        if (targetAdds[i].geo) {
            addsPoints.push(targetAdds[i]);
            continue;
        }
        promiseArr.push(geocodeSearch_sig(targetAdds[i].address, tday));
    }
    // 不能一次全部调用，否则页面会卡顿。 getPoint函数比较慢
}

var pendingRequest = 0;

function geocodeSearch_sig(add, tday) {
    return new Promise((resolve, reject) => {
        var timeout = setTimeout(() => {
            console.log("failed for: " + add);
            reject();
        }, 30000);
        myGeo.getPoint(add, function(point) {
            // console.log("Pending request " + pendingRequest--);
            clearTimeout(timeout);
            if (point) {
                point.Ye = add;
                addsPoints.push({ address: add, geo: { lng: point.lng, lat: point.lat }, day: tday });
                newAddsGeo.push({ address: add, geo: { lng: point.lng, lat: point.lat } });
                resolve();
            } else {
                reject();
            }
        }, "上海市");
    })

}

// 显示当前区域内的标注
function createMarkerInBound(points, bounds) {
    //points: [{address: xxx, geo: {lng:xxx, lat:xxx}}]
    points.forEach((aPoint, index) => {
        if (aPoint['marked']) return;
        var geo = aPoint.geo;
        if ((geo.lng < bounds.Ne && geo.lng > bounds.Te) && (geo.lat > bounds.ee && geo.lat < bounds.ce)) {
            var address = new BMap.Point(geo.lng, geo.lat);
            aPoint['marked'] = true;
            addMarker(address, aPoint.address);
        }
    })
}

// 编写自定义函数,创建标注
function addMarker(point, label) {
    var marker = new BMap.Marker(point, { icon: myIcon });
    map.addOverlay(marker);
    var labelObj = new BMap.Label(label, { offset: new BMap.Size(10, -10) });
    labelObj.setStyle({ display: "none" });
    marker.setLabel(labelObj);
    marker.addEventListener('mouseover', (...args) => {
        labelObj.setStyle({ display: "block" });
    });
    marker.addEventListener('mouseout', (...args) => {
        labelObj.setStyle({ display: "none" });
    });
}

//坐标转换完之后的回调函数
function translateCallback(data) {
    if (data.status === 0) {
        for (var i = 0; i < data.points.length; i++) {
            addMarker(data.points[i], this.labels[i]);
        }
    } else {
        console.error("Convert failed.");
    }
}

function translateNormalCallback(data) {
    if (data.status === 0) {
        var marker = new BMap.Marker(data.points[0]);
        map.addOverlay(marker);
        var labelObj = new BMap.Label('', { offset: new BMap.Size(10, -10) });
        marker.setLabel(labelObj);
    }
}

function coordinateConvertor(points) {
    // var point = new BMap.Point(x, y);
    var convertor = new BMap.Convertor();
    convertor.translate(points, 1, 5, translateCallback);
}

//#region hotheat map
class HotHeatMap {
    _mapvgl;
    constructor(mapvgl) {
        this._mapvgl = mapvgl;
    }

    showLayer(rs) {
        // 1. 创建地图实例
        var bmapgl = new BMapGL.Map('map_container');
        var x = 121.506377;
        var y = 31.245105;
        var point = new BMapGL.Point(x, y);
        bmapgl.centerAndZoom(point, 13);

        // 2. 创建MapVGL图层管理器
        var view = new this._mapvgl.View({
            map: bmapgl
        });

        // 4. 准备好规范化坐标数据
        var data = [];
        for (var i = 0; i < rs.length; i++) {
            var dayData = rs[i];
            var dayRegion = dayData.region
            for (let j = 0; j < dayRegion.length; j++) {
                const region = dayRegion[j];
                var adds = region.addresses;
                for (let k = 0; k < adds.length; k++) {
                    const radd = adds[k];
                    if (!radd.geo) continue;
                    data.push({
                        geometry: {
                            type: 'Point',
                            coordinates: [radd.geo.lng, radd.geo.lat]
                        },
                        properties: {
                            count: 1
                        }
                    });
                }

            }
        }

        // 3. 创建可视化图层，并添加到图层管理器中
        var heatmap = new this._mapvgl.HeatmapLayer({
            size: 600, // 单个点绘制大小
            max: 40, // 最大阈值
            height: 0, // 最大高度，默认为0
            unit: 'm', // 单位，m:米，px: 像素
            gradient: { // 对应比例渐变色
                0.25: 'rgba(0, 0, 255, 1)',
                0.55: 'rgba(0, 255, 0, 1)',
                0.85: 'rgba(255, 255, 0, 1)',
                1: 'rgba(255, 0, 0, 1)'
            }
        });
        view.addLayer(heatmap);

        // 5. 关联图层与数据，享受震撼的可视化效果
        heatmap.setData(data);
    }
}
//#endregion

//#region 每日新增
class RegionDailyIncreaseChart {

    targetRegion = "浦东新区";
    regionIncreaseAmountData = []; //[{region: xxx, data: {label: xxx, y: xxx}}]
    FXRQIncreaseSummaryData;
    regionIncreaseChart;
    dataDetails;
    regionChartData;
    increaseLineChartData;
    fxPercentageLineChartData;

    constructor() {
        this.regionIncreaseChart = this.initRegionColumnChart();
        var allCheckbox = $(".reg-chxbox");
        allCheckbox.each((index, $element) => {
            $($element).on("click", (e) => {
                var currentVal = $($element).prop('checked');
                allCheckbox.each((index, elem) => $(elem).prop('checked', false));
                console.log($element.name);
                if (!currentVal || $element.name == "all") {
                    $(allCheckbox[0]).prop('checked', true);
                    this.updateWithAllData();
                } else {
                    $($element).prop('checked', true);
                    this.targetRegion = $element.name;
                    this.updateRegionColumnChart();

                }
            });
        });
    }
    createRegionColumnChart(data) {
        // handle data
        this.dataDetails = data.details;
        $.each(this.dataDetails, (key, value) => {
            value.region.forEach(rgnAddr => {
                var rd = this.regionIncreaseAmountData.find(r => r.region === rgnAddr.name);
                if (!rd) {
                    rd = { region: rgnAddr.name, data: [] };
                    this.regionIncreaseAmountData.push(rd);
                }
                rd.data.push({ x: key, label: value.day, y: rgnAddr.amount });
            });

        });

        this.FXRQIncreaseSummaryData = data.increases;

        this.updateRegionColumnChart();
    }

    initRegionColumnChart() {
        // 单日新增
        this.regionChartData = {
            type: "column",
            name: "单日新增",
            dataPoints: []
        };

        // 单日风险人群
        this.increaseLineChartData = {
            type: "line",
            axisYType: "secondary",
            showInLegend: true,
            name: "风险人群中发现",
            color: "orange",
            dataPoints: []
        };

        // 单日风险人群比率
        this.fxPercentageLineChartData = {
            type: "line",
            axisYType: "secondary",
            showInLegend: true,
            axisYIndex: 1,
            name: "风险人群中发现占比",
            color: "#C24642",
            dataPoints: []
        };

        // chart option
        var chart = new CanvasJS.Chart("chartContainer-region", {
            // animationEnabled: true,
            // theme: "light2", // "light1", "light2", "dark1", "dark2"
            title: {
                text: ""
            },
            axisX: {
                viewportMinimum: 22,
            },
            axisY: {
                title: "",
                interlacedColor: "Azure",
                //interval: 100,
                tickColor: "navy",
                gridColor: "navy",
                tickLength: 10
            },
            axisY2: [{
                    title: "",
                    lineColor: "#C0504E",
                },
                {
                    title: "",
                    lineColor: "#C24642",
                    minimum: 0,
                    maximum: 100,
                },
            ],
            toolTip: {
                shared: true,
            },
            data: [this.regionChartData, this.increaseLineChartData, this.fxPercentageLineChartData]
        });
        return chart;
    }

    calcPercent(num, sum) {
        const result = (num / sum) * 100;
        return parseFloat(result.toFixed(2));
    }

    updateRegionColumnChart() {
        // 单日新增 - 数据
        var targetRegionData = this.regionIncreaseAmountData.find(r => r.region === this.targetRegion).data;
        this.regionChartData.dataPoints = targetRegionData;

        // 单日风险人群 - 数据
        var increaseInFXRQData = [];
        this.FXRQIncreaseSummaryData.forEach((value, key) => {
            increaseInFXRQData.push({ x: this.dataDetails.findIndex(d => d.day == value.day), label: value.day, y: value[this.targetRegion] });
        });

        // 单日风险人群比率 - 数据
        var FXPercData = [];
        increaseInFXRQData.forEach((v, i) => {
            var sum = targetRegionData.find(r => r.label === v.label);
            if (sum) FXPercData.push({ x: v.x, label: v.label, y: this.calcPercent(v.y, sum.y) });
        });
        this.increaseLineChartData.dataPoints = increaseInFXRQData;
        this.fxPercentageLineChartData.dataPoints = FXPercData;

        this.regionIncreaseChart.options.title.text = this.targetRegion + " - 单日新增";
        this.regionIncreaseChart.render();
    }

    updateWithAllData() {
        // 单日新增 - 数据
        var allRegionData = [];
        var keys = this.regionIncreaseAmountData[0].data.length;
        for (let i = 0; i < keys; i++) {
            let sum = this.regionIncreaseAmountData.reduce((pv, cv, ) => pv + cv.data[i].y, 0);
            allRegionData.push({ x: i, label: this.regionIncreaseAmountData[0].data[i].label, y: sum });
        }
        this.regionChartData.dataPoints = allRegionData;

        // 单日风险人群 - 数据
        var increaseInFXRQData = [];
        this.FXRQIncreaseSummaryData.forEach((value, key) => {
            increaseInFXRQData.push({ x: this.dataDetails.findIndex(d => d.day == value.day), label: value.day, y: value.sum });
        });

        // 单日风险人群比率 - 数据
        var FXPercData = [];
        increaseInFXRQData.forEach((v, i) => {
            var sum = allRegionData.find(r => r.label === v.label);
            FXPercData.push({ x: v.x, label: v.label, y: this.calcPercent(v.y, sum.y) });
        });
        this.increaseLineChartData.dataPoints = increaseInFXRQData;
        this.fxPercentageLineChartData.dataPoints = FXPercData;

        this.regionIncreaseChart.options.title.text = "上海市 - 单日新增";
        this.regionIncreaseChart.render();
    }
}
//#endregion

//#region 各区每日新增比较
class RegionLiveComparingChart {
    static regionColors = ["#9966CC", "#FF033E", "#5D8AA8", "#3B7A57", "#FFBF00", "#FF7E00", "#A4C639", "#915C83", "#CD9575", "#89CFF0", "#E0218A", "#FE6F5E", "#0D98BA", "#CC5500", "#00BFFF", "#007BA7", "#EC3B83"];
    static regionNames = ["徐汇区", "闵行区", "浦东新区", "黄浦区", "静安区", "长宁区", "虹口区", "杨浦区", "普陀区", "宝山区", "嘉定区", "金山区", "松江区", "青浦区", "奉贤区", "崇明区"];

    barchart;
    displayInterval;
    regionData = [];
    dateElement;
    index = 0;

    constructor() {
        this.barchart = this.initBarChart();
        document.getElementById("replay-btn").addEventListener("click", function() {
            console.log("continue replay data");
            this.displayChart();
        });
        document.getElementById("stop-btn").addEventListener("click", function() {
            console.log("stop replay data");
            clearInterval(this.displayInterval);
            this.displayInterval = null;
        });
        this.dateElement = document.getElementById("region-chart-date");
    }

    createRegionBarChart(data) {
        data.details.forEach((value, key) => {
            var regionAmount = [];
            value.region.forEach(rgnAddr => {
                regionAmount.push({
                    label: rgnAddr.name,
                    color: RegionLiveComparingChart.regionColors[RegionLiveComparingChart.regionNames.indexOf(rgnAddr.name)],
                    y: rgnAddr.amount,
                    //x: regionNames.indexOf(rgnAddr.name),
                    d: value.day
                })
            });
            regionAmount.sort((a, b) => a.y - b.y);
            this.regionData.push(regionAmount);
        })

        this.displayChart();
    }

    displayChart() {
        if (!this.displayInterval) {
            this.displayInterval = setInterval(() => {
                if (this.index >= this.regionData.length) this.index = 0;
                this.updateChart(this.index++)
            }, 800);
        }
    }

    updateChart(index) {
        this.dateElement.innerHTML = this.regionData[index][0].d;
        this.barchart.options.data[0].dataPoints = this.regionData[index];
        this.barchart.render();
    }

    initBarChart() {
        return new CanvasJS.Chart("regionChartsContainer", {
            //colorSet: "regionColors",
            title: {
                text: "Region Increase"
            },
            axisX: {
                //title: "region",
                interval: 1,
                gridThickness: 0,
                tickLength: 0,
                lineThickness: 0,
                labelFormatter: function() {
                    return " ";
                }
            },
            axisY: {
                gridThickness: 0,
                maximum: 3000,
                minimum: 0
            },
            animationEnabled: true,
            data: [{
                type: "bar",
                indexLabel: "{label} : {y}",
                indexLabelPlacement: "outside",
                indexLabelOrientation: "horizontal", // "horizontal", "vertical"
                indexLabelTextAlign: "right", //"left", "right"
                indexLabelFontColor: "black",
                dataPoints: []
            }]
        });
    }
}
//#endregion