
function onLoad() {
    var date = new Date();
    var currentDate = date.toISOString().slice(0, 10);
    var aa = document.getElementById('date');
    aa.innerHTML = currentDate;

    getData();

    var allCheckbox = $(".reg-chxbox");
    allCheckbox.each(function (index, $element) {
        $(this).on("click", function (e) {
            var name = $element.name;
            console.log(name);
            if (index === 0) {
                udpateAll();
            } else {
                if (allCheckbox[0].checked) {
                    allCheckbox[0].checked = false;
                    chartData.forEach((cd, j) => j > 0 && (cd.visible = false));
                }
                updateRag(index, $element, $element.checked);
            }
            function udpateAll() {
                allCheckbox.each(function (aindex, $all) {
                    if (aindex === 0) return;
                    updateRag(aindex, $all, allCheckbox[0].checked);
                    $all.checked = false;
                });
            };
            chart.render();
        });
    });
}

if(window.Worker){
    console.log("Support worker");
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
function saveGeoData(jsonData){
    $.ajax({
        type: 'POST',
        url: './data',
        data: JSON.stringify(jsonData),
        dataType: 'json',
        contentType: "application/json",
        success: function(data, status, xhr){
            console.log("Successfully send data to service.");
        },
        Error: function(xhr, error,exception){
            console.error("Failed to send data. " + error);
        }
    });
}    

function handleJSONData(data) {
    handleChartsData(data);
    regionIncreaseChart(data);
    $("#total-amount").append("<div id=\"total-amount-num\">" + amount + "</div>");
    handleMapData(data);
}

function handleChartsData(data) {
    $.each(data.amounts, function (key, value) {
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
        // axisY2: {
        //     title: "",
        //     tickLength: 10
        // },
        // toolTip: {
        //     shared: true,
        //     contentFormatter: function (e) {
        //         var content = " ";
        //         for (var i = 0; i < e.entries.length; i++) {
        //             content += e.entries[i].dataSeries.name + " " + "<strong>" + e.entries[i].dataPoint.y + "</strong>";
        //             content += "<br/>";
        //         }
        //         return content;
        //     }
        // },
        // legend: {
        //     cursor: "pointer",
        //     itemmouseover: function (e) {
        //         e.dataSeries.lineThickness = 15;
        //         lineColor = e.dataSeries.lineColor;
        //         e.dataSeries.lineColor = "white";
        //         chart.render();
        //     },
        //     itemmouseout: function (e) {
        //         e.dataSeries.lineThickness = 2;
        //         e.dataSeries.lineColor = lineColor;
        //         chart.render();
        //     }
        // },
        data: chartData
    });
    chart.render();
}

CanvasJS.addColorSet("regionColors",
    [//colorSet Array
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

var regionColors = ["#9966CC","#FF033E","#5D8AA8","#3B7A57","#FFBF00","#FF7E00","#A4C639","#915C83","#CD9575","#89CFF0","#E0218A","#FE6F5E","#0D98BA","#CC5500","#00BFFF","#007BA7","#EC3B83"];
var regionNames = ["徐汇区", "闵行区", "浦东新区", "黄浦区", "静安区", "长宁区", "虹口区", "杨浦区", "普陀区", "宝山区", "嘉定区", "金山区", "松江区", "青浦区", "奉贤区", "崇明区" ];

var regionData = [];
function regionIncreaseChart(data){
    $.each(data.details, (key, value) => {
        var address = value.region;
        var regionAmount = [];
        value.region.forEach(rgnAddr => {
            regionAmount.push({
                label: rgnAddr.name,
                color: regionColors[regionNames.indexOf(rgnAddr.name)],
                y: rgnAddr.amount,
                //x: regionNames.indexOf(rgnAddr.name)
            })
        });
        regionAmount.sort((a,b) => a.y - b.y);
        regionData.push(regionAmount);
    })
    var datapoints = regionData[regionData.length-1];
    var barchart = new CanvasJS.Chart("regionChartsContainer",
    {
      //colorSet: "regionColors",
      title:{
        text: "Region Increase"
      },
      axisX:{
        //title: "region",
        interval: 1,
        gridThickness: 0,
        tickLength: 0,
        lineThickness: 0,
        labelFormatter: function(){
        return " ";
        }
     },
     axisY: {
        gridThickness: 0,
        maximum: 3000,
        minimum: 0
      },
      animationEnabled: true,
      data: [
        {
            type: "bar",
            indexLabel: "{label} : {y}",
            indexLabelPlacement: "outside",  
            indexLabelOrientation: "horizontal", // "horizontal", "vertical"
            indexLabelTextAlign: "right", //"left", "right"
            indexLabelFontColor: "black",
            dataPoints: datapoints
        }
      ]
    });

    barchart.render();
   
    function updateChart(){
        barchart.options.data[0].dataPoints = regionData[index++];
        barchart.render();		
    }

    displayChart();

    function displayChart(){
        var index = 0;
        var displayInterval = setInterval(function(){
            if (index >= regionData.length) clearInterval(displayInterval);
            updateChart()
        }, 1000);
    }

    $('#replay-btn').on('click', (event) => {
        displayChart();
    })

    function startDynamicChart(){

    }

    function pauseChart(){

    }

    function stopChart(){

    }
}

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

    map.addEventListener("dragend", function () {
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
    geoLoc.getCurrentPosition(function(r){
        if(this.getStatus() == BMAP_STATUS_SUCCESS){
            var mk = new BMap.Marker(r.point);
            map.addOverlay(mk);
            map.panTo(r.point);
            map.centerAndZoom(r.point, 15);
        }
        else {
            console.warn('failed' + this.getStatus());
        }
    });
}

function common_getCurrentPos(){
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
            function (e) {
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
            bdGEO(rgnAddr.addresses);
        });
    })

    pendingRequest = promiseArr.length;
    console.log("Total request: " +  pendingRequest);
    // save geo data
    Promise.allSettled(promiseArr).then((values) => {
        saveGeoData(newAddsGeo);
    })

    // web service to convert address to geo x/y
    worker.postMessage(allRegionAddress);
    worker.onmessage = function(d){
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
var addsPoints = []; //[{address: xxx, geo: {lng:xxx, lat:xxx}}]
var promiseArr = [];
var newAddsGeo = [];
var index = 0;
function bdGEO(targetAdds) {
    if (!targetAdds) return;
    for (let i = 0; i < targetAdds.length; i++) {
        index++;
        if (targetAdds[i].geo) {
            addsPoints.push(targetAdds[i]);
            continue;
        }
        promiseArr.push(geocodeSearch_sig(targetAdds[i].address));
    }
    // 不能一次全部调用，否则页面会卡顿。 getPoint函数比较慢
}

var pendingRequest = 0;
function geocodeSearch_sig(add) {
    return new Promise((resolve, reject) => {
        var timeout = setTimeout(() => {
            console.log("failed for: " + add);
            reject();
        }, 30000);
        myGeo.getPoint(add, function (point) {
            console.log("Pending request " + pendingRequest--);
            clearTimeout(timeout);
            if (point) {
                point.Ye = add;
                addsPoints.push({address: add, geo: {lng:point.lng, lat:point.lat}});
                newAddsGeo.push({address: add, geo: {lng:point.lng, lat:point.lat}});
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
    }
    else {
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