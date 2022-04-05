
//LoadBaiduMapScript();

var adds = [];
var addsPoints = [];
var myGeo = null;

onmessge = function(dataStr){
    var data = JSON.parse(dataStr);

    data.forEach(rgnAddr => {
        adds = adds.concat(rgnAddr.addresses);
        bdGEO(rgnAddr.addresses);
    });

    postMessage(JSON.stringify(addsPoints));
}

function bdGEO(targetAdds) {
    if (!targetAdds) return;
    for (let i = 0; i < targetAdds.length; i++) {
        geocodeSearch_sig(targetAdds[i]);
    }
    // 不能一次全部调用，否则页面会卡顿。 getPoint函数比较慢
}

function geocodeSearch_sig(add) {
    if (!myGeo) myGeo = new BMap.Geocoder();
    myGeo.getPoint(add, function (point) {
        if (point) {
            point.Ye = add;
            addsPoints.push(point);
        }
    }, "上海市");
}

function LoadBaiduMapScript() {
    //console.log("初始化百度地图脚本...");
    const AK = 'GRd83ONGj9FEDdQnp49tocaDasu3pz1e';
    const BMap_URL = "https://api.map.baidu.com/getscript?v=3.0&ak="+ AK +"&s=1&callback=onBMapCallback";
    return new Promise((resolve, reject) => {
        // 如果已加载直接返回
        if(typeof BMap !== "undefined") {
            resolve(BMap);
            return true;
        }
        // 百度地图异步加载回调处理
        window.onBMapCallback = function () {
            console.log("百度地图脚本初始化成功...");
            resolve(BMap);
        };
        // 插入script脚本
        let scriptNode = document.createElement("script");
        scriptNode.setAttribute("type", "text/javascript");
        scriptNode.setAttribute("src", BMap_URL);
        document.body.appendChild(scriptNode);
    });
}